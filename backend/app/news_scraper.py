"""Scrapper de noticias financieras.

Intenta RSS de fuentes públicas (Reuters, Investing, Yahoo Finance RSS).
Si falla la red, cae a noticias mock realistas para demo sin conexión.
Cada noticia lleva sentimiento (positivo / negativo / neutro) y categoría.
"""

import json
import os
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


def get_cached_news() -> list[dict] | None:
    """Devuelve las últimas noticias cacheadas SIN disparar red — para rutas que no
    deben bloquearse (p. ej. crear la propuesta). None si aún no hay caché."""
    return _cache.get("news")


def get_news() -> list[dict]:
    now = time.time()
    if _cache["news"] and now - _cache["ts"] < TTL_SECONDS:
        return _cache["news"]

    # Modo offline (e2e / demo sin conexión): noticias mock sin tocar la red.
    if os.environ.get("ROBO_OFFLINE"):
        _cache["ts"] = now
        _cache["news"] = _mock_news()[:10]
        return _cache["news"]

    news: list[dict] = []
    for source, url in RSS_FEEDS:
        if len(news) >= 10:
            break
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3) as r:
                data = r.read()
            news.extend(_parse_rss(data, source))
        except Exception:
            # Feed caído o sin red: dejamos de intentar (evita encadenar timeouts).
            # Conservamos lo ya obtenido; si no hay nada, caemos a mock más abajo.
            break

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

    # 2. Principios de inversión de largo plazo, seleccionados según los temas
    # REALES detectados en las noticias de hoy (no por el perfil del cliente):
    # así la sección responde a la pregunta "qué diría un inversor experimentado
    # sobre ESTOS titulares", en vez de un texto fijo desconectado del scraper.
    # Pool de 5 inversores reales (no solo Buffett) — cada uno con condición propia.
    candidate_tips = [
        (themes["recession"] or neg_pct >= 0.5, {
            "investor": "Warren Buffett", "strategy": "Preservación de capital",
            "principle": "La regla número 1 es nunca perder dinero. La regla número 2 es nunca olvidar la regla número 1.",
            "context": "Aplica hoy porque las noticias muestran señales de recesión o pesimismo generalizado.",
        }),
        (themes["geopolitical"] or themes["commodity"], {
            "investor": "Ray Dalio", "strategy": "All Weather Portfolio",
            "principle": "Si no estás diversificado, estás expuesto a caídas del 50% al 70%.",
            "context": "Aplica hoy porque hay tensión geopolítica o movimientos en materias primas en los titulares.",
        }),
        (neg_pct >= 0.4 and not themes["recession"], {
            "investor": "Benjamin Graham", "strategy": "Inversión de valor",
            "principle": "El inversor inteligente es un realista que vende a los optimistas y compra a los pesimistas.",
            "context": "Aplica hoy porque el pesimismo en titulares puede abrir oportunidades de valor, sin ser una crisis confirmada.",
        }),
        (themes["tech_rally"], {
            "investor": "Peter Lynch", "strategy": "Conoce lo que posees",
            "principle": "Conoce lo que posees y por qué lo posees.",
            "context": "Aplica hoy porque hay titulares de rally tecnológico: antes de sumar exposición, entiende qué hay detrás del ETF.",
        }),
        (pos_pct >= neg_pct and not themes["tech_rally"] and not themes["recession"], {
            "investor": "John Bogle", "strategy": "Indexación de bajo costo",
            "principle": "No busques la aguja en el pajar. Compra el pajar completo.",
            "context": "Aplica hoy porque no hay señales agudas de riesgo ni euforia: mantener el índice sigue siendo razonable.",
        }),
    ]
    investor_tips = [tip for active_flag, tip in candidate_tips if active_flag][:3]
    if not investor_tips:
        investor_tips = [candidate_tips[-1][1]]

    # 2b. Noticias que respaldan el análisis: los titulares REALES que dispararon
    # cada tema detectado, no una lista arbitraria — así "Generar análisis" puede
    # mostrar la evidencia exacta detrás de cada alerta.
    theme_keywords = {
        "geopolitical": _GEOPOLITICAL, "recession": _RECESSION,
        "inflation": _INFLATION, "tech_rally": _TECH_RALLY, "commodity": _COMMODITY,
    }
    supporting_news = []
    seen_titles = set()
    for theme_key, active_flag in themes.items():
        if not active_flag:
            continue
        for n in news:
            title_l = n["title"].lower()
            if any(w in title_l for w in theme_keywords[theme_key]) and n["title"] not in seen_titles:
                supporting_news.append({**n, "matched_theme": theme_key})
                seen_titles.add(n["title"])

    # Estado de ánimo del mercado: se calcula SOLO a partir del sentimiento real
    # de las noticias obtenidas (RSS o snapshot diferido) — nada de "tendencias
    # de Twitter" inventadas sin una fuente verificable detrás.
    active_themes_es = {
        "geopolitical": "tensión geopolítica", "recession": "riesgo de recesión",
        "inflation": "inflación y tasas", "tech_rally": "tecnología",
        "commodity": "materias primas",
    }
    active = [label for key, label in active_themes_es.items() if themes.get(key)]
    market_mood = {
        "mood": "Optimista" if pos_pct > neg_pct else ("Cauteloso" if neg_pct > pos_pct else "Neutral"),
        "pos_pct": round(pos_pct * 100),
        "neg_pct": round(neg_pct * 100),
        "topics": active or ["sin temas dominantes en este ciclo de noticias"],
    }

    # 3. Memoria del Sistema: Historial de decisiones pasadas (HITL Loop)
    past_memories = []
    try:
        proposals_list = store.list_proposals()
        rejections = [p for p in proposals_list if p.get("status") == "rechazada"]
        edits = [p for p in proposals_list if p.get("status") == "aprobada_con_cambios"]

        if rejections:
            latest_rej = rejections[0]
            dec_rej = latest_rej.get("decision") or {}
            past_memories.append({
                "type": "error_evitado",
                "client": latest_rej.get("client_name"),
                "reason": dec_rej.get("notes", "No especificado"),
                "message": f"Evitar repetir error: Propuesta de {latest_rej.get('client_name')} rechazada debido a: '{dec_rej.get('notes')}'."
            })
        if edits:
            latest_edit = edits[0]
            dec_edit = latest_edit.get("decision") or {}
            past_memories.append({
                "type": "ajuste_frecuente",
                "client": latest_edit.get("client_name"),
                "message": f"Preferencia de Asesor: Ajuste manual realizado en la propuesta de {latest_edit.get('client_name')} ({dec_edit.get('notes')})."
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
        "supporting_news":   supporting_news[:6],
        "market_mood":       market_mood,
        "past_memories":     past_memories,
        "asof":              datetime.now(timezone.utc).isoformat(),
    }
