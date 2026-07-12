"""Agente Inversiones IA.

Genera una propuesta de portafolio EXPLICABLE a partir del perfil calculado.
Arquitectura "deterministic core + narrative layer":
  - Los números (asignación, riesgo, retorno esperado) salen SIEMPRE del
    catálogo aprobado y de los portafolios modelo — nunca del LLM.
  - La capa narrativa redacta la explicación legible con **Google Gemini**
    (variable de entorno `GEMINI_API_KEY`). Si no hay key o la API falla, se usa
    una plantilla determinística para que la demo funcione de extremo a extremo.
El agente NO ejecuta órdenes ni promete rentabilidad.
"""

import json
import logging
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "catalog.json"

# Logger dedicado a la mitigación de alucinaciones: cada rechazo del verificador
# queda como evidencia tangible en los logs del servidor (además de en auditoría).
logger = logging.getLogger("invertia.antialucinacion")


def _guardrail_event(agent: str, reason: str, text: str) -> dict:
    """Registro estructurado de un rechazo del verificador anti-alucinación."""
    return {
        "agent": agent,
        "reason": reason,
        "snippet": (text or "").strip()[:200],
        "at": datetime.now(timezone.utc).isoformat(),
    }


def _log_guardrail(ev: dict) -> None:
    logger.warning(
        "[ANTI-HALLUCINATION] %s rechazó salida del LLM: %s | fragmento=%r",
        ev["agent"], ev["reason"], ev["snippet"],
    )

DISCLAIMER = (
    "Esta es una propuesta para revisión de un asesor autorizado. No constituye "
    "una recomendación definitiva, no ejecuta órdenes y los retornos esperados "
    "son estimaciones simuladas, no promesas de rentabilidad."
)


def load_catalog() -> dict:
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


# Clases defensivas que sí pueden concentrarse (>50%) en un perfil Conservador.
DEFENSIVE_CLASSES = {"Efectivo y equivalentes", "Renta fija (bonos)"}


def validate_diversification(allocation: list, profile_id: str) -> tuple[bool, str]:
    """Hace cumplir la regla de negocio de REGLAS.md §3.4 al aprobar/editar:
      - al menos 3 clases de activo distintas, y
      - ningún instrumento supera el 50% (excepto liquidez / renta fija en perfil
        Conservador, donde sí se admite concentración defensiva).
    Devuelve (True, "") si cumple, (False, motivo) si no. Es determinística y
    auditable: el backend re-valida lo que el asesor edita (defensa en profundidad)."""
    active = [a for a in allocation if a.get("weight", 0) > 0]
    classes = {a["asset_class"] for a in active}
    if len(classes) < 3:
        return False, (
            f"La propuesta debe diversificar en al menos 3 clases de activo "
            f"(tiene {len(classes)})."
        )
    for a in active:
        if a["weight"] > 50:
            exempt = profile_id == "conservador" and a["asset_class"] in DEFENSIVE_CLASSES
            if not exempt:
                return False, (
                    f"Ningún instrumento puede superar el 50%: {a['ticker']} "
                    f"tiene {a['weight']}%."
                )
    return True, ""


def build_proposal(
    profile_result: dict,
    goal: dict | None = None,
    market: dict | None = None,
    news: list | None = None,
) -> dict:
    """Construye la asignación desde el portafolio modelo del catálogo
    y calcula métricas agregadas de forma determinística.

    Si se reciben datos de mercado (`market`) y/o noticias (`news`), se agrega un
    `market_context` que ALINEA la propuesta con las condiciones actuales: qué
    instrumentos del portafolio están creciendo hoy y qué temas dominan los
    titulares. Es solo contexto narrativo — NO cambia pesos ni ejecuta nada
    (los ajustes los decide el asesor humano)."""
    catalog = load_catalog()
    profile_id = profile_result["profile"]["id"]
    model = catalog["model_portfolios"][profile_id]
    instruments = {i["ticker"]: i for i in catalog["instruments"]}

    allocation = []
    exp_return = 0.0
    volatility = 0.0
    risk = 0.0
    for line in model:
        inst = instruments[line["ticker"]]
        w = line["weight"] / 100
        exp_return += w * inst["expected_return"]
        volatility += w * inst["volatility"]
        risk += w * inst["risk_level"]
        allocation.append({**inst, "weight": line["weight"]})

    metrics = {
        "expected_return": round(exp_return, 1),
        "volatility": round(volatility, 1),
        "risk_level": round(risk, 1),
        "diversification": len(allocation),
    }
    goal_fit = _compute_goal_fit(goal, metrics)
    explanation, explanation_source, exp_events = _explain(profile_result, allocation, metrics)
    market_context, mc_events = _build_market_context(
        profile_result, allocation, metrics, market, news)

    return {
        "catalog_version": catalog["version"],
        "profile_id": profile_id,
        "allocation": allocation,
        "metrics": metrics,
        "goal_fit": goal_fit,
        "explanation": explanation,
        "explanation_source": explanation_source,
        "market_context": market_context,
        # Evidencia de mitigación de alucinaciones: rechazos del verificador (si los hubo).
        "guardrail_events": exp_events + mc_events,
        "disclaimer": DISCLAIMER,
    }


def _compute_goal_fit(goal: dict | None, metrics: dict) -> dict | None:
    """Compara la meta del cliente (monto, plazo, aporte mensual) contra el
    retorno esperado del portafolio propuesto. Es un cálculo determinístico y
    auditable, SIN afirmaciones ni estadísticas de asesoría: solo la brecha
    entre lo que el cliente necesita y lo que la propuesta ofrece, para que el
    asesor humano decida qué recomendar (HU3)."""
    if not goal:
        return None

    amount = float(goal["target_amount"])
    years = float(goal["target_years"])
    monthly = float(goal["monthly_contrib"])
    total_invested = monthly * 12 * years

    if total_invested <= 0:
        return None

    if total_invested >= amount:
        needed_return_pct = 0.0
    else:
        needed_return_pct = round(((amount - total_invested) / total_invested) / years * 100, 1)

    portfolio_return_pct = metrics["expected_return"]
    gap_pct = round(needed_return_pct - portfolio_return_pct, 1)

    return {
        "target_amount": amount,
        "target_years": years,
        "monthly_contrib": monthly,
        "total_invested": round(total_invested, 2),
        "needed_return_pct": needed_return_pct,
        "portfolio_return_pct": portfolio_return_pct,
        "gap_pct": gap_pct,
        "on_track": gap_pct <= 0,
    }


def _explain(profile_result: dict, allocation: list, metrics: dict) -> tuple[str, str, list]:
    """Devuelve (texto, fuente, eventos) — la fuente se muestra al usuario para que
    sepa exactamente qué generó la explicación, y `eventos` lista los rechazos del
    verificador anti-alucinación (evidencia de mitigación de riesgos)."""
    events: list = []
    llm_text = _try_llm_explanation(profile_result, allocation, metrics)
    if llm_text:
        # CA-3g: Capa de verificación anti-alucinación
        is_valid, reason = _verify_llm_output(llm_text, metrics)
        if is_valid:
            return llm_text, _gemini_model(), events
        # LLM alucinado → registra evidencia + fallback determinístico
        ev = _guardrail_event("inversiones-ia:explicacion", reason, llm_text)
        _log_guardrail(ev)
        events.append(ev)
    return _template_explanation(profile_result, allocation, metrics), "plantilla-determinista", events


def _verify_llm_output(text: str, metrics: dict, extra_allowed: list | None = None) -> tuple[bool, str]:
    """É verificador anti-alucinación de salida del LLM.

    Reglas:
    1. El texto no puede estar vacío.
    2. No puede contener promesas de rentabilidad (palabras clave).
    3. Cualquier número porcentual en el texto debe ser uno de los calculados
       determinísticamente (expected_return, volatility, risk_level), uno de los
       `extra_allowed` (p. ej. variaciones % reales del mercado) o menor a 1.

    Devuelve (True, "") si es válido, (False, motivo) si no lo es.
    """
    if not text or not text.strip():
        return False, "Texto vacío"

    # Regla 2: palabras que denotan promesa de rentabilidad
    FORBID = ["garantiza", "garantizado", "asegura", "seguro de ganar",
              "promete", "sin riesgo", "riesgo cero", "100% seguro"]
    text_lower = text.lower()
    for word in FORBID:
        if word in text_lower:
            return False, f"Contiene lenguaje de promesa: '{word}'"

    # Regla 3: detectar números en % que no estén en las métricas calculadas
    allowed_numbers = set()
    for v in list(metrics.values()) + list(extra_allowed or []):
        if isinstance(v, (int, float)):
            # Permitir el valor y variaciones de redondeo (±0.5)
            allowed_numbers.add(round(float(v), 1))
            allowed_numbers.add(round(float(v), 0))

    # Encontrar todos los números seguidos de % en el texto
    found_pcts = re.findall(r'(\d+(?:\.\d+)?)\s*%', text)
    for num_str in found_pcts:
        num = float(num_str)
        if num < 1:  # decimales menores a 1% son inofensivos
            continue
        # Verificar si está cerca de alguno de los valores permitidos
        close_enough = any(abs(num - a) <= 0.5 for a in allowed_numbers)
        if not close_enough:
            return False, f"Número inventado detectado: {num}% no está en las métricas calculadas"

    return True, ""


# ── Alineación de la propuesta con el mercado / noticias (nueva capa IA) ────────

# Etiquetas legibles de los temas detectados en las noticias.
_THEME_LABELS = {
    "geopolitical": "tensión geopolítica",
    "recession":    "riesgo de recesión",
    "inflation":    "inflación y tasas",
    "tech_rally":   "rally tecnológico",
    "commodity":    "materias primas",
}


def _compute_market_signals(allocation: list, market: dict | None, news: list | None) -> dict:
    """Señales 100% determinísticas: qué instrumentos suben hoy (change_pct > 0),
    cuáles de ellos están en el portafolio propuesto, y qué temas dominan los
    titulares. Es la evidencia verificable que alimenta la narrativa de la IA."""
    quotes = (market or {}).get("quotes", {})
    in_port = {a["ticker"] for a in allocation}

    growing = []
    for tk, q in quotes.items():
        cp = q.get("change_pct")
        if cp is not None and cp > 0:
            growing.append({"ticker": tk, "change_pct": round(float(cp), 2),
                            "in_portfolio": tk in in_port})
    growing.sort(key=lambda g: g["change_pct"], reverse=True)

    themes = {}
    if news:
        try:
            from app import news_scraper  # import perezoso: evita ciclos de import
            themes = news_scraper._classify_themes(news)
        except Exception:
            themes = {}
    active_themes = [k for k, v in themes.items() if v]

    return {
        "growing": growing[:5],
        "growing_in_portfolio": [g for g in growing if g["in_portfolio"]][:5],
        "active_themes": active_themes,
        "news_count": len(news or []),
        "provider": (market or {}).get("provider"),
        "live": (market or {}).get("live", False),
    }


def _build_market_context(profile_result: dict, allocation: list, metrics: dict,
                          market: dict | None, news: list | None) -> tuple[dict | None, list]:
    """Construye el contexto de mercado de la propuesta. Devuelve (contexto, eventos).
    El contexto es None si no hay ninguna señal (sin mercado ni noticias)."""
    signals = _compute_market_signals(allocation, market, news)
    if not signals["growing"] and not signals["active_themes"]:
        return None, []

    narrative, source, events = _market_narrative(profile_result, allocation, metrics, signals)
    return {"signals": signals, "narrative": narrative, "source": source}, events


def _market_narrative(profile_result: dict, allocation: list, metrics: dict,
                      signals: dict) -> tuple[str, str, list]:
    """Narrativa IA (Gemini) con verificación anti-alucinación y fallback
    determinístico. El LLM solo narra la alineación; nunca cambia pesos, inventa
    tickers fuera del catálogo ni promete rentabilidad. Devuelve (texto, fuente, eventos)."""
    events: list = []
    llm_text = _try_llm_market_context(profile_result, allocation, metrics, signals)
    if llm_text:
        extra = [g["change_pct"] for g in signals["growing"]]
        ok, reason = _verify_llm_output(llm_text, metrics, extra_allowed=extra)
        if ok and _tickers_within_catalog(llm_text):
            return llm_text, _gemini_model(), events
        final_reason = reason or "ticker fuera del catálogo aprobado"
        ev = _guardrail_event("inversiones-ia:contexto-mercado", final_reason, llm_text)
        _log_guardrail(ev)
        events.append(ev)
    return _template_market_context(profile_result, allocation, signals), "plantilla-determinista", events


def _tickers_within_catalog(text: str) -> bool:
    """Rechaza el texto si menciona un ticker (2-4 mayúsculas) que no esté en el
    catálogo aprobado — evita que el LLM invente instrumentos."""
    catalog = load_catalog()
    valid = {i["ticker"] for i in catalog["instruments"]}
    for token in re.findall(r'\b[A-Z]{2,4}\b', text):
        if token in ("IA", "EE", "UU", "ETF", "ETFS", "USD", "PIB", "FED", "BCE"):
            continue  # siglas comunes, no tickers
        if token not in valid and token.isupper():
            # Solo rechazamos si parece un ticker inventado (no una sigla conocida).
            if len(token) in (3, 4):
                return False
    return True


def _template_market_context(profile_result: dict, allocation: list, signals: dict) -> str:
    """Narrativa determinística de respaldo, construida solo con las señales."""
    label = profile_result["profile"]["label"]
    n_classes = len({a["asset_class"] for a in allocation})
    parts = []

    gip = signals["growing_in_portfolio"]
    if gip:
        names = ", ".join(f"{g['ticker']} (+{g['change_pct']}%)" for g in gip[:3])
        parts.append(
            f"Hoy {len(gip)} instrumento(s) de tu portafolio avanzan en el mercado: {names}. "
            f"Esto refuerza que la propuesta está alineada con las condiciones actuales, "
            f"manteniendo los pesos definidos por tu perfil {label}."
        )
    elif signals["growing"]:
        top = signals["growing"][0]
        parts.append(
            f"El mercado muestra impulso en {top['ticker']} (+{top['change_pct']}%). "
            f"Tu portafolio se mantiene dentro del catálogo aprobado y acorde a tu perfil {label}."
        )

    if signals["active_themes"]:
        labels = ", ".join(_THEME_LABELS.get(t, t) for t in signals["active_themes"])
        parts.append(
            f"Los titulares de hoy destacan: {labels}. La propuesta ya diversifica entre "
            f"{n_classes} clases de activo para amortiguar estos escenarios."
        )

    parts.append("Ningún ajuste se ejecuta automáticamente: cualquier cambio lo decide tu asesor humano.")
    return " ".join(parts)


def _try_llm_market_context(profile_result: dict, allocation: list, metrics: dict,
                            signals: dict) -> str | None:
    """Capa narrativa opcional con Gemini para el contexto de mercado."""
    growing = [{"ticker": g["ticker"], "cambio_pct": g["change_pct"],
                "en_portafolio": g["in_portfolio"]} for g in signals["growing"]]
    themes = [_THEME_LABELS.get(t, t) for t in signals["active_themes"]]
    prompt = (
        "Eres el agente Inversiones IA. En 2-3 frases y en español claro, explica "
        "cómo las condiciones de mercado y noticias de HOY se relacionan con ESTA "
        "propuesta de portafolio, para mostrar que está alineada. Reglas estrictas: "
        "(1) usa SOLO los tickers listados, no inventes instrumentos; "
        "(2) NO cambies ni sugieras pesos nuevos; "
        "(3) NO prometas rentabilidad ni uses la palabra 'garantiza'; "
        "(4) usa solo las cifras % provistas. Aclara que cualquier ajuste lo decide "
        "el asesor humano.\n"
        f"Perfil del cliente: {profile_result['profile']['label']}\n"
        f"Instrumentos del portafolio: {json.dumps([a['ticker'] for a in allocation])}\n"
        f"Instrumentos que suben hoy: {json.dumps(growing, ensure_ascii=False)}\n"
        f"Temas en las noticias: {json.dumps(themes, ensure_ascii=False)}"
    )
    return _call_gemini(prompt, max_tokens=320)


def _template_explanation(profile_result: dict, allocation: list, metrics: dict) -> str:
    profile = profile_result["profile"]
    fixed = sum(a["weight"] for a in allocation if a["risk_level"] <= 2)
    equity = sum(a["weight"] for a in allocation if a["risk_level"] >= 3)
    top = max(allocation, key=lambda a: a["weight"])

    parts = [
        f"Tu perfil es {profile['label']} (puntaje {profile_result['score']}/100 "
        f"con reglas v{profile_result['rules_version']}). {profile['description']}",
        f"Por eso la propuesta destina {fixed}% a instrumentos defensivos "
        f"(liquidez y renta fija) y {equity}% a activos de crecimiento "
        f"(renta variable y alternativos), con mayor peso en {top['name']} ({top['weight']}%).",
        f"El retorno esperado simulado es {metrics['expected_return']}% anual con una "
        f"volatilidad aproximada de {metrics['volatility']}%: en un año malo el portafolio "
        f"podría caer en torno a ese porcentaje, y la diversificación entre "
        f"{metrics['diversification']} clases de activos busca amortiguar esas caídas.",
    ]

    if profile_result.get("capped"):
        reasons = "; ".join(k["reason"] for k in profile_result["knockouts_applied"])
        parts.append(f"Importante: tu perfil fue limitado por una regla de protección. {reasons}")
    return " ".join(parts)



# ── Capa narrativa: Google Gemini (con fallback determinístico) ────────────────

_GEMINI_DEFAULT_MODEL = "gemini-2.0-flash"


def _gemini_model() -> str:
    """Modelo Gemini a usar. Configurable por entorno; se usa además como etiqueta
    de `explanation_source` para trazabilidad (qué generó cada texto)."""
    return os.environ.get("GEMINI_MODEL", _GEMINI_DEFAULT_MODEL)


def _call_gemini(prompt: str, max_tokens: int = 400) -> str | None:
    """Llama a la API REST de Google Gemini (generateContent). Devuelve el texto
    generado o None si no hay `GEMINI_API_KEY` o la petición falla — así la demo
    nunca se rompe y cae a la plantilla determinística.

    Reto del patrocinador 'Best Use of Google Gemini': esta es la única puerta de
    entrada al LLM; todo el sistema narra a través de Gemini."""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.4},
        }).encode()
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{_gemini_model()}:generateContent"
        )
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "x-goog-api-key": api_key,
                "content-type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None  # la demo nunca se rompe: cae a la plantilla determinística


def _try_llm_explanation(profile_result: dict, allocation: list, metrics: dict) -> str | None:
    """Capa narrativa opcional con Gemini. Solo redacta: recibe los números ya
    calculados y tiene prohibido inventar cifras o prometer rentabilidad."""
    prompt = (
        "Eres el agente Inversiones IA. Redacta en español, en un párrafo "
        "claro para una persona sin conocimientos financieros, la explicación "
        "de esta propuesta de portafolio. Usa EXACTAMENTE estas cifras, no "
        "inventes números y no prometas rentabilidad.\n"
        f"Perfil: {json.dumps(profile_result['profile'], ensure_ascii=False)}\n"
        f"Puntaje: {profile_result['score']}/100, reglas v{profile_result['rules_version']}\n"
        f"Asignación: {json.dumps([{ 'nombre': a['name'], 'peso': a['weight'] } for a in allocation], ensure_ascii=False)}\n"
        f"Métricas: {json.dumps(metrics, ensure_ascii=False)}"
    )
    return _call_gemini(prompt, max_tokens=500)
