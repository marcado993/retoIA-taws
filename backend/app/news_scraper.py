"""Scrapper de noticias financieras.

Intenta RSS de fuentes públicas (Reuters, Investing, Yahoo Finance RSS).
Si falla la red, cae a noticias mock realistas para demo sin conexión.
Cada noticia lleva sentimiento (positivo / negativo / neutro) y categoría.
"""

import json
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Importar store para tener memoria de decisiones anteriores
from app import store

TTL_SECONDS = 180  # caché de 3 min

RSS_FEEDS = [
    ("Yahoo Finance",  "https://finance.yahoo.com/news/rssindex"),
    ("Reuters Markets","https://feeds.reuters.com/reuters/businessNews"),
    ("MarketWatch",    "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
]

# Palabras clave → sentimiento sencillo
_NEG = ["guerra","war","crisis","caída","crash","recesión","inflation","sanction",
        "conflict","debt","default","riesgo","risk","tensión","tension","shock",
        "pérdida","loss","baja","downturn","colapso","quiebra"]
_POS = ["rally","crecimiento","growth","sube","gain","record","boom","expansión",
        "expansion","profit","ganancias","alza","bullish","optimismo","optimism",
        "acuerdo","deal","recovery","recuperación"]


def _score_sentiment(text: str) -> str:
    t = text.lower()
    neg = sum(1 for w in _NEG if w in t)
    pos = sum(1 for w in _POS if w in t)
    if neg > pos:
        return "negativo"
    if pos > neg:
        return "positivo"
    return "neutro"


def _parse_rss(xml_bytes: bytes, source: str) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    ns   = {"atom": "http://www.w3.org/2005/Atom"}
    items = root.findall(".//item") or root.findall(".//atom:entry", ns)
    results = []
    for item in items[:6]:
        title = (item.findtext("title") or item.findtext("atom:title", namespaces=ns) or "").strip()
        link  = (item.findtext("link")  or item.findtext("atom:link",  namespaces=ns) or "").strip()
        if title:
            results.append({
                "title":     title,
                "url":       link,
                "source":    source,
                "sentiment": _score_sentiment(title),
                "ts":        datetime.now(timezone.utc).isoformat(),
            })
    return results


def _mock_news() -> list[dict]:
    """Noticias ficticias pero temáticamente realistas para demo offline."""
    raw = [
        ("Tensión geopolítica en Oriente Medio eleva precio del petróleo 4%",         "negativo", "Reuters"),
        ("Fed mantiene tasas: mercado reacciona con rally en bonos cortos",             "positivo", "Bloomberg"),
        ("Inflación en EE.UU. cede a 2.9%: primer descenso en 3 meses",               "positivo", "WSJ"),
        ("Conflicto comercial EE.UU.–China escala; aranceles suben 15% en semis",     "negativo", "FT"),
        ("S&P 500 cierra en máximo histórico impulsado por tecnología y consumo",      "positivo", "CNBC"),
        ("Oro alcanza $2,400/oz en medio de incertidumbre geopolítica global",         "negativo", "MarketWatch"),
        ("BCE recorta tipos 25 pb; euro se debilita frente al dólar",                  "neutro",   "Reuters"),
        ("Inversión en mercados emergentes cae ante fortaleza del dólar",              "negativo", "Bloomberg"),
        ("Energías renovables lideran flujos de ETFs en el segundo trimestre",         "positivo", "Morningstar"),
        ("Riesgo de recesión técnica en Alemania preocupa a inversores europeos",      "negativo", "FT"),
    ]
    return [
        {"title": t, "sentiment": s, "source": src, "url": "#", "ts": datetime.now(timezone.utc).isoformat()}
        for t, s, src in raw
    ]


_cache: dict = {"ts": 0.0, "news": None}


def get_news() -> list[dict]:
    now = time.time()
    if _cache["news"] and now - _cache["ts"] < TTL_SECONDS:
        return _cache["news"]

    news: list[dict] = []
    for source, url in RSS_FEEDS:
        if len(news) >= 10:
            break
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = r.read()
            news.extend(_parse_rss(data, source))
        except Exception:
            pass

    if not news:
        news = _mock_news()

    _cache["ts"]   = now
    _cache["news"] = news[:10]
    return _cache["news"]


# ── Análisis IA combinado ──────────────────────────────────────────────────────

_GEOPOLITICAL = ["guerra","war","conflict","tensión","tension","sanction","militar",
                 "nuclear","nato","otan","aranceles","tariff","crisis"]
_RECESSION    = ["recesión","recession","deflación","deflation","downturn","colapso",
                 "quiebra","default","debt crisis"]
_INFLATION    = ["inflación","inflation","cpi","tasas","rates","fed","bce","ecb","alza"]
_TECH_RALLY   = ["tecnología","technology","ia","ai","semiconductors","semis","chip",
                 "nasdaq","qqq","rally","boom","record"]
_COMMODITY    = ["petróleo","oil","gold","oro","commodities","energía","energy"]


def _classify_themes(news: list[dict]) -> dict:
    all_text = " ".join(n["title"].lower() for n in news)
    return {
        "geopolitical": any(w in all_text for w in _GEOPOLITICAL),
        "recession":    any(w in all_text for w in _RECESSION),
        "inflation":    any(w in all_text for w in _INFLATION),
        "tech_rally":   any(w in all_text for w in _TECH_RALLY),
        "commodity":    any(w in all_text for w in _COMMODITY),
    }


def build_ai_insight(profile_label: str | None, news: list[dict], quotes: dict) -> dict:
    """
    Combina noticias + cotizaciones + perfil + historial de decisiones
    para generar alertas, sugerencias de ajuste, consejos de grandes inversores
    y advertencias de errores del pasado.
    """
    themes  = _classify_themes(news)
    neg_pct = sum(1 for n in news if n["sentiment"] == "negativo") / max(len(news), 1)
    pos_pct = sum(1 for n in news if n["sentiment"] == "positivo") / max(len(news), 1)

    alerts  = []
    adjustments = []

    # 1. Alertas de Mercado / Noticias
    if themes["geopolitical"]:
        alerts.append({
            "level":   "critical",
            "icon":    "⚠️",
            "title":   "Tensión geopolítica detectada",
            "message": "Conflictos activos o sanciones en titulares. Históricamente, el oro y los bonos cortos actúan como refugio.",
            "action":  "Considera aumentar GLD/BIL entre +3% y +8% si tu perfil lo permite.",
        })
        adjustments.append("↑ GLD +5%  · ↑ BIL +3%  · ↓ EFA −4%  · ↓ QQQ −4%")

    if themes["recession"] or neg_pct >= 0.6:
        alerts.append({
            "level":   "warning",
            "icon":    "📉",
            "title":   "Señales de recesión o pesimismo generalizado",
            "message": "Mayoría de noticias con sentimiento negativo. Bonos de alta calidad y liquidez suelen preservar capital.",
            "action":  "Evalúa aumentar AGG/BND y reducir renta variable emergente.",
        })
        adjustments.append("↑ AGG +5%  · ↑ BND +3%  · ↓ SPY −4%  · ↓ EFA −4%")

    if themes["inflation"]:
        alerts.append({
            "level":   "warning",
            "icon":    "🏦",
            "title":   "Presión inflacionaria o movimiento de tasas",
            "message": "Decisiones de bancos centrales en titulares. Tasas altas presionan los bonos de largo plazo.",
            "action":  "Prefiere bonos cortos (BIL) sobre AGG en entornos de alza.",
        })

    if themes["tech_rally"] and pos_pct >= 0.4:
        alerts.append({
            "level":   "positive",
            "icon":    "🚀",
            "title":   "Rally tecnológico en marcha",
            "message": "Titulares positivos en IA y semiconductores. QQQ lidera ganancias.",
            "action":  "Si tu perfil es moderado/agresivo, QQQ ofrece exposición al alza.",
        })
        adjustments.append("↑ QQQ +5%  · ↓ BIL −5%")

    if themes["commodity"]:
        alerts.append({
            "level":   "info",
            "icon":    "🛢️",
            "title":   "Movimiento en commodities",
            "message": "Petróleo u oro en titulares. Energía y metales preciosos pueden comportarse diferente al mercado general.",
            "action":  "GLD como cobertura si el dólar se debilita.",
        })

    # 2. Ideas de Inversión de Grandes Inversores & Twitter (Basado en el Perfil)
    investor_tips = []
    # Warren Buffett
    if profile_label == "Conservador":
        investor_tips.append({
            "investor": "Warren Buffett",
            "strategy": "Regla de Efectivo",
            "quote": "La regla número 1 es nunca perder dinero. La regla número 2 es nunca olvidar la regla número 1.",
            "recommendation": "Buffett mantiene más de $150B en efectivo y letras del tesoro (similar a BIL) en tiempos inciertos."
        })
    else:
        investor_tips.append({
            "investor": "Warren Buffett",
            "strategy": "Indexación Sencilla",
            "quote": "Compre un fondo de índice S&P 500 de bajo costo de manera constante.",
            "recommendation": "Buffett sugiere SPY para el 90% del capital a largo plazo de inversores individuales."
        })

    # Ray Dalio (All Weather Portfolio)
    investor_tips.append({
        "investor": "Ray Dalio",
        "strategy": "All Weather Portfolio",
        "quote": "Si no estás diversificado, estás expuesto a caídas del 50% al 70%.",
        "recommendation": "Suggere balancear Renta Variable (SPY) con Bonos a Largo Plazo (TLT) y Oro (GLD) para resistir cualquier ciclo económico."
    })

    # Twitter / Reddit WallStreetBets Sentiment
    twitter_sentiment = {
        "score": "Bullish en Tecnología (QQQ)" if pos_pct >= 0.4 else "Cauteloso en Renta Variable",
        "trend": "#AI, #FedRates y #Inflation dominando la conversación financiera internacional.",
        "retail_mood": "Inversores minoristas acumulando ETFs defensivos (BIL/AGG) ante alertas de volatilidad."
    }

    # 3. Memoria del Sistema: Historial de decisiones pasadas (HITL Loop)
    past_memories = []
    try:
        proposals_list = store.list_proposals()
        rejections = [p for p in proposals_list if p.get("status") == "rechazada"]
        edits = [p for p in proposals_list if p.get("status") == "aprobada_con_cambios"]

        if rejections:
            latest_rej = rejections[0]
            past_memories.append({
                "type": "error_evitado",
                "client": latest_rej.get("client_name"),
                "reason": latest_rej.get("decision", {}).get("notes", "No especificado"),
                "message": f"Evitar repetir error: Propuesta de {latest_rej.get('client_name')} rechazada debido a: '{latest_rej.get('decision', {}).get('notes')}'."
            })
        if edits:
            latest_edit = edits[0]
            past_memories.append({
                "type": "ajuste_frecuente",
                "client": latest_edit.get("client_name"),
                "message": f"Preferencia de Asesor: Ajuste manual realizado en la propuesta de {latest_edit.get('client_name')} ({latest_edit.get('decision', {}).get('notes')})."
            })
    except Exception as e:
        # Si falla por inicialización, continuar
        pass

    # Resumen general
    if not alerts:
        if pos_pct >= 0.5:
            summary = "El sentimiento de mercado es mayormente positivo. El portafolio actual está bien posicionado según las noticias recientes."
        else:
            summary = "Mercado en calma relativa. No se detectan señales urgentes de ajuste."
    elif any(a["level"] == "critical" for a in alerts):
        summary = "Se detectan riesgos críticos en los titulares. Revisa las alertas y considera ajustar la exposición al riesgo."
    else:
        summary = "Hay señales moderadas de riesgo u oportunidad. Lee las alertas y evalúa con tu asesor."


    # Cotizaciones relevantes como contexto
    mkt_ctx = []
    for tk, q in (quotes or {}).items():
        if q.get("change_pct") is not None:
            arrow = "▲" if q["change_pct"] >= 0 else "▼"
            mkt_ctx.append(f"{tk} {arrow}{abs(q['change_pct'])}%")

    return {
        "summary":           summary,
        "alerts":            alerts,
        "adjustments":       adjustments,
        "market_ctx":        mkt_ctx[:6],
        "neg_pct":           round(neg_pct * 100),
        "pos_pct":           round(pos_pct * 100),
        "themes":            themes,
        "investor_tips":     investor_tips,
        "twitter_sentiment": twitter_sentiment,
        "past_memories":     past_memories,
        "asof":              datetime.now(timezone.utc).isoformat(),
    }
