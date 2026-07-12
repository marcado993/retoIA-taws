"""Servicio de datos de mercado.

Intenta cotizaciones EN VIVO desde la API de gráficos de Yahoo Finance
(sin API key) con caché de 5 minutos. Si no hay red o la API falla,
cae a un snapshot diferido incluido en el código, de modo que la demo
funciona de extremo a extremo sin conexión (condición del hackathon).
"""

import json
import os
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime, timezone

TTL_SECONDS = 300
# Presupuesto TOTAL para traer todas las cotizaciones. Como Yahoo puede ser lento,
# se consultan en paralelo y lo que no llegue a tiempo se resuelve por snapshot,
# de modo que el endpoint nunca cuelga (era la causa del 500 en Análisis IA).
FETCH_BUDGET_SECONDS = 5.0

# Snapshot diferido (fallback sin red). Precios aproximados, etiquetados como tal.
# `history` es una serie ilustrativa (no real) SOLO para este fallback offline;
# en modo en vivo `history` viene siempre de cierres reales de Yahoo Finance.
SNAPSHOT = {
    "BIL": {"price": 91.85, "change_pct": 0.01, "history": [91.7, 91.7, 91.8, 91.8, 91.85]},
    "AGG": {"price": 99.40, "change_pct": 0.12, "history": [98.9, 99.0, 99.1, 99.3, 99.40]},
    "BND": {"price": 73.95, "change_pct": 0.10, "history": [73.6, 73.7, 73.8, 73.9, 73.95]},
    "SPY": {"price": 625.30, "change_pct": 0.45, "history": [615, 618, 620, 622, 625.30]},
    "QQQ": {"price": 565.80, "change_pct": 0.62, "history": [552, 556, 559, 562, 565.80]},
    "EFA": {"price": 93.10, "change_pct": -0.18, "history": [94.5, 94.1, 93.8, 93.4, 93.10]},
    "VNQ": {"price": 96.70, "change_pct": 0.25, "history": [95.2, 95.6, 96.0, 96.4, 96.70]},
    "GLD": {"price": 312.40, "change_pct": -0.30, "history": [316, 315, 314, 313, 312.40]},
}

_cache: dict = {"ts": 0.0, "payload": None}
_executor = ThreadPoolExecutor(max_workers=16)


def get_cached_payload() -> dict | None:
    """Devuelve el último payload cacheado SIN disparar red. Pensado para rutas que
    no deben bloquearse esperando a Yahoo (p. ej. crear la propuesta): si aún no hay
    caché, retorna None y quien llama degrada con gracia."""
    return _cache.get("payload")


def _fetch_yahoo(ticker: str) -> dict:
    # range=1mo trae cierres diarios reales del último mes — sirve para el precio
    # actual Y para graficar la tendencia real de cada instrumento (sin fabricar datos).
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1mo&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=3) as resp:
        data = json.load(resp)
    result = data["chart"]["result"][0]
    meta = result["meta"]
    price = meta["regularMarketPrice"]
    prev = meta.get("chartPreviousClose") or meta.get("previousClose") or price

    closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
    history = [round(c, 2) for c in closes if c is not None][-20:]
    if not history or history[-1] != price:
        history.append(round(price, 2))

    return {
        "price": round(price, 2),
        "change_pct": round((price - prev) / prev * 100, 2) if prev else 0.0,
        "currency": meta.get("currency", "USD"),
        "source": "yahoo",
        "history": history,
    }


def get_quotes_payload(tickers: list[str]) -> dict:
    now = time.time()
    if _cache["payload"] and now - _cache["ts"] < TTL_SECONDS:
        return _cache["payload"]

    # Modo offline (p. ej. e2e o demo sin conexión): usar el snapshot sin tocar la red,
    # evitando esperas largas cuando Yahoo no es alcanzable.
    offline = bool(os.environ.get("ROBO_OFFLINE"))

    quotes = {}
    live = 0
    network_down = offline

    futures = {}
    done = set()
    if not network_down:
        for t in tickers:
            futures[t] = _executor.submit(_fetch_yahoo, t)
        done, _ = wait(futures.values(), timeout=FETCH_BUDGET_SECONDS)

    for t in tickers:
        snap = SNAPSHOT.get(t, {"price": None, "change_pct": None})
        if network_down or t not in futures:
            quotes[t] = {**snap, "currency": "USD", "source": "snapshot"}
            continue

        fut = futures[t]
        if fut in done and not fut.cancelled():
            try:
                quotes[t] = fut.result()
                live += 1
            except Exception:
                quotes[t] = {**snap, "currency": "USD", "source": "snapshot"}
        else:
            quotes[t] = {**snap, "currency": "USD", "source": "snapshot"}

    payload = {
        "asof": datetime.now(timezone.utc).isoformat(),
        "live": live == len(tickers) and live > 0,
        "provider": "Yahoo Finance" if live else "Snapshot diferido (sin conexión)",
        "quotes": quotes,
    }
    _cache["ts"] = now
    _cache["payload"] = payload
    return payload
