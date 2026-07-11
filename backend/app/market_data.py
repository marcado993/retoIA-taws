"""Servicio de datos de mercado.

Intenta cotizaciones EN VIVO desde la API de gráficos de Yahoo Finance
(sin API key) con caché de 5 minutos. Si no hay red o la API falla,
cae a un snapshot diferido incluido en el código, de modo que la demo
funciona de extremo a extremo sin conexión (condición del hackathon).
"""

import json
import time
import urllib.request
from datetime import datetime, timezone

TTL_SECONDS = 300

# Snapshot diferido (fallback sin red). Precios aproximados, etiquetados como tal.
SNAPSHOT = {
    "BIL": {"price": 91.85, "change_pct": 0.01},
    "AGG": {"price": 99.40, "change_pct": 0.12},
    "BND": {"price": 73.95, "change_pct": 0.10},
    "SPY": {"price": 625.30, "change_pct": 0.45},
    "QQQ": {"price": 565.80, "change_pct": 0.62},
    "EFA": {"price": 93.10, "change_pct": -0.18},
    "VNQ": {"price": 96.70, "change_pct": 0.25},
    "GLD": {"price": 312.40, "change_pct": -0.30},
}

_cache: dict = {"ts": 0.0, "payload": None}


def _fetch_yahoo(ticker: str) -> dict:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.load(resp)
    meta = data["chart"]["result"][0]["meta"]
    price = meta["regularMarketPrice"]
    prev = meta.get("chartPreviousClose") or meta.get("previousClose") or price
    return {
        "price": round(price, 2),
        "change_pct": round((price - prev) / prev * 100, 2) if prev else 0.0,
        "currency": meta.get("currency", "USD"),
        "source": "yahoo",
    }


def get_quotes_payload(tickers: list[str]) -> dict:
    now = time.time()
    if _cache["payload"] and now - _cache["ts"] < TTL_SECONDS:
        return _cache["payload"]

    quotes = {}
    live = 0
    for t in tickers:
        try:
            quotes[t] = _fetch_yahoo(t)
            live += 1
        except Exception:
            snap = SNAPSHOT.get(t, {"price": None, "change_pct": None})
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
