"""Agente Inversiones IA.

Genera una propuesta de portafolio EXPLICABLE a partir del perfil calculado.
Arquitectura "deterministic core + narrative layer":
  - Los números (asignación, riesgo, retorno esperado) salen SIEMPRE del
    catálogo aprobado y de los portafolios modelo — nunca del LLM.
  - La capa narrativa redacta la explicación legible con **DeepSeek**
    (variable de entorno `DEEPSEEK_API_KEY`). Si no hay key o la API falla, se usa
    una plantilla determinística para que la demo funcione de extremo a extremo.
El agente NO ejecuta órdenes ni promete rentabilidad.
"""

import json
import logging
import os
import re
import urllib.error
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
    client_history: list | None = None,
) -> dict:
    """Construye la asignación desde el portafolio modelo del catálogo
    y calcula métricas agregadas de forma determinística.

    Si se reciben datos de mercado (`market`) y/o noticias (`news`), se agrega un
    `market_context` que ALINEA la propuesta con las condiciones actuales: qué
    instrumentos del portafolio están creciendo hoy y qué temas dominan los
    titulares. Es solo contexto narrativo — NO cambia pesos ni ejecuta nada
    (los ajustes los decide el asesor humano).

    Si `client_history` trae diagnósticos previos del MISMO cliente, se agrega
    `client_memory`: el agente recuerda su puntaje/perfil/decisión anteriores
    (continuidad de la conversación), 100% determinístico — no depende del LLM."""
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
    client_memory = _compute_client_memory(client_history, profile_result)
    explanation, explanation_source, exp_events = _explain(
        profile_result, allocation, metrics, client_memory)
    market_context, mc_events = _build_market_context(
        profile_result, allocation, metrics, market, news)

    return {
        "catalog_version": catalog["version"],
        "profile_id": profile_id,
        "allocation": allocation,
        "metrics": metrics,
        "goal_fit": goal_fit,
        "client_memory": client_memory,
        "explanation": explanation,
        "explanation_source": explanation_source,
        "market_context": market_context,
        # Evidencia de mitigación de alucinaciones: rechazos del verificador (si los hubo).
        "guardrail_events": exp_events + mc_events,
        "disclaimer": DISCLAIMER,
    }


def _compute_client_memory(client_history: list | None, profile_result: dict) -> dict | None:
    """Memoria determinística: qué recuerda el agente de este cliente. Ningún
    número aquí sale de un LLM — se lee directo del historial guardado, así
    que es imposible que la IA "invente" un diagnóstico anterior."""
    if not client_history:
        return None

    last = client_history[0]
    last_score = last["profile_result"]["score"]
    last_profile = last["profile_result"]["profile"]["label"]
    current_score = profile_result["score"]
    decision = last.get("decision")

    return {
        "previous_count": len(client_history),
        "last_score": last_score,
        "last_profile": last_profile,
        "last_created_at": last["created_at"],
        "score_delta": current_score - last_score,
        "last_status": last["status"],
        "last_decision_advisor": decision.get("advisor") if decision else None,
        "last_decision_notes": decision.get("notes") if decision else None,
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


def _explain(profile_result: dict, allocation: list, metrics: dict,
             client_memory: dict | None = None) -> tuple[str, str, list]:
    """Devuelve (texto, fuente, eventos) — la fuente se muestra al usuario para que
    sepa exactamente qué generó la explicación, y `eventos` lista los rechazos del
    verificador anti-alucinación (evidencia de mitigación de riesgos).

    `client_memory` NO se le pasa al LLM (se mantiene 100% determinístico para
    que sea imposible que la IA invente un diagnóstico anterior) — solo se usa
    en la plantilla de respaldo y se expone aparte para el frontend."""
    events: list = []
    llm_text = _try_llm_explanation(profile_result, allocation, metrics)
    if llm_text:
        # CA-3g: Capa de verificación anti-alucinación
        is_valid, reason = _verify_llm_output(llm_text, metrics)
        if is_valid:
            return llm_text, _deepseek_model(), events
        # LLM alucinado → registra evidencia + fallback determinístico
        ev = _guardrail_event("inversiones-ia:explicacion", reason, llm_text)
        _log_guardrail(ev)
        events.append(ev)
    return _template_explanation(profile_result, allocation, metrics, client_memory), "plantilla-determinista", events


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


def _compute_trend_pct(history: list | None) -> float | None:
    """% de variación entre el primer y el último cierre de la serie histórica
    (hasta ~1 mes de cierres reales de Yahoo Finance, ver market_data.py).
    Es una señal DISTINTA de `change_pct` (que es solo el cambio de HOY):
    esta mide la tendencia real del período, para que la narrativa pueda
    hablar de tendencia sin inventar un número que no viene de ningún lado."""
    if not history or len(history) < 2:
        return None
    start, end = history[0], history[-1]
    if not start:
        return None
    return round((end - start) / start * 100, 2)


def _compute_market_signals(allocation: list, market: dict | None, news: list | None) -> dict:
    """Señales 100% determinísticas: qué instrumentos suben hoy (change_pct > 0),
    la tendencia real del último período (trend_pct, desde el historial de cierres),
    cuáles de ellos están en el portafolio propuesto, y qué temas dominan los
    titulares. Es la evidencia verificable que alimenta la narrativa de la IA."""
    quotes = (market or {}).get("quotes", {})
    in_port = {a["ticker"] for a in allocation}

    growing = []
    trending = []
    for tk, q in quotes.items():
        cp = q.get("change_pct")
        if cp is not None and cp > 0:
            growing.append({"ticker": tk, "change_pct": round(float(cp), 2),
                            "in_portfolio": tk in in_port})
        trend_pct = _compute_trend_pct(q.get("history"))
        if trend_pct is not None:
            trending.append({"ticker": tk, "trend_pct": trend_pct, "in_portfolio": tk in in_port})
    growing.sort(key=lambda g: g["change_pct"], reverse=True)
    trending.sort(key=lambda t: abs(t["trend_pct"]), reverse=True)

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
        "trending_in_portfolio": [t for t in trending if t["in_portfolio"]][:5],
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
    if not signals["growing"] and not signals["active_themes"] and not signals.get("trending_in_portfolio"):
        return None, []

    narrative, source, events = _market_narrative(profile_result, allocation, metrics, signals)
    return {"signals": signals, "narrative": narrative, "source": source}, events


def _market_narrative(profile_result: dict, allocation: list, metrics: dict,
                      signals: dict) -> tuple[str, str, list]:
    """Narrativa IA (DeepSeek) con verificación anti-alucinación y fallback
    determinístico. El LLM solo narra la alineación; nunca cambia pesos, inventa
    tickers fuera del catálogo ni promete rentabilidad. Devuelve (texto, fuente, eventos)."""
    events: list = []
    llm_text = _try_llm_market_context(profile_result, allocation, metrics, signals)
    if llm_text:
        # Los % permitidos incluyen el cambio de HOY (change_pct) y la tendencia
        # real del último período (trend_pct, desde el historial de Yahoo Finance)
        # — así el LLM puede hablar de tendencia sin que el verificador la
        # confunda con un número inventado.
        extra = [g["change_pct"] for g in signals["growing"]]
        extra += [t["trend_pct"] for t in signals.get("trending_in_portfolio", [])]
        ok, reason = _verify_llm_output(llm_text, metrics, extra_allowed=extra)
        if ok and _tickers_within_catalog(llm_text):
            return llm_text, _deepseek_model(), events
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

    trend = signals.get("trending_in_portfolio") or []
    if trend:
        top_trend = trend[0]
        direction = "sube" if top_trend["trend_pct"] > 0 else "baja"
        parts.append(
            f"En el último período, {top_trend['ticker']} {direction} {abs(top_trend['trend_pct'])}% "
            f"según su historial real de cierres — no es solo el movimiento de hoy."
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
    """Capa narrativa opcional con DeepSeek para el contexto de mercado."""
    growing = [{"ticker": g["ticker"], "cambio_pct": g["change_pct"],
                "en_portafolio": g["in_portfolio"]} for g in signals["growing"]]
    trending = [{"ticker": t["ticker"], "tendencia_pct": t["trend_pct"]}
                for t in signals.get("trending_in_portfolio", [])]
    themes = [_THEME_LABELS.get(t, t) for t in signals["active_themes"]]
    prompt = (
        _JURISDICTION_CONTEXT +
        "Eres el agente Inversiones IA. En 2-3 frases y en español claro, explica "
        "cómo las condiciones de mercado y noticias de HOY —y la tendencia real del "
        "último período, no solo el movimiento de hoy— se relacionan con ESTA "
        "propuesta de portafolio, para mostrar que está alineada. Reglas estrictas: "
        "(1) básate ÚNICAMENTE en los movimientos, tendencias y temas de noticias "
        "listados abajo — no opines sobre mercados o instrumentos que no aparezcan ahí "
        "ni sobre periodos de tiempo no provistos; "
        "(2) menciona explícitamente al menos un ticker o tema de los provistos, "
        "no des una explicación genérica que ignore los datos de hoy; "
        "(3) usa SOLO los tickers listados, no inventes instrumentos; "
        "(4) NO cambies ni sugieras pesos nuevos; "
        "(5) NO prometas rentabilidad ni uses la palabra 'garantiza'; "
        "(6) usa solo las cifras % provistas (tanto el cambio de hoy como la "
        "tendencia del período son datos reales de Yahoo Finance, no los redondees "
        "ni inventes otros). Aclara que cualquier ajuste lo decide "
        "el asesor humano. Si no hay movimientos ni temas relevantes, dilo "
        "explícitamente en vez de improvisar.\n"
        f"Perfil del cliente: {profile_result['profile']['label']}\n"
        f"Instrumentos del portafolio: {json.dumps([a['ticker'] for a in allocation])}\n"
        f"Instrumentos que suben hoy: {json.dumps(growing, ensure_ascii=False)}\n"
        f"Tendencia real del último período (histórico de cierres): {json.dumps(trending, ensure_ascii=False)}\n"
        f"Temas en las noticias: {json.dumps(themes, ensure_ascii=False)}"
    )
    return _call_deepseek(prompt, max_tokens=260)


def _template_explanation(profile_result: dict, allocation: list, metrics: dict,
                          client_memory: dict | None = None) -> str:
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

    # Memoria del agente: reconoce diagnósticos previos del mismo cliente, con
    # cifras leídas directo del historial (no inventadas) — continuidad de la
    # conversación entre sesiones, no solo dentro de una misma sesión.
    if client_memory:
        delta = client_memory["score_delta"]
        trend = "subió" if delta > 0 else ("bajó" if delta < 0 else "se mantuvo")
        parts.append(
            f"Te recuerdo: este es tu diagnóstico número {client_memory['previous_count'] + 1}. "
            f"La última vez tu puntaje fue {client_memory['last_score']}/100 "
            f"(perfil {client_memory['last_profile']}); ahora {trend} "
            f"{'en ' + str(abs(delta)) + ' puntos' if delta != 0 else ''} a {profile_result['score']}/100."
        )

    if profile_result.get("capped"):
        reasons = "; ".join(k["reason"] for k in profile_result["knockouts_applied"])
        parts.append(f"Importante: tu perfil fue limitado por una regla de protección. {reasons}")
    return " ".join(parts)



# ── Capa narrativa: DeepSeek (con fallback determinístico) ─────────────────────
# API compatible con el formato de OpenAI (chat completions) — a diferencia de
# Gemini original, la respuesta viene en `choices[0].message.content`, no en `candidates`.

_DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash"  # el modelo más económico — presupuesto ajustado
_DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

# Contexto de jurisdicción, anteponible a TODO prompt que le llega a DeepSeek.
# Sin esto, un LLM entrenado mayormente con datos de EE.UU./global tiende a
# asumir por defecto marcos como FINRA/SEC, productos como 401(k)/IRA, o
# lenguaje de "asesor financiero certificado" que no aplica en Ecuador. Fijar
# la jurisdicción explícitamente reduce ese sesgo por defecto — el LLM sigue
# sin decidir cifras (eso ya lo hace el núcleo determinístico), pero al menos
# narra dentro del marco correcto en vez del que más pesa en su entrenamiento.
_JURISDICTION_CONTEXT = (
    "Contexto regulatorio: operas en Ecuador, bajo la Ley de Mercado de Valores "
    "(Código Orgánico Monetario y Financiero, Libro II) y — cuando el cliente es "
    "socio de una cooperativa — la Ley Orgánica de Economía Popular y Solidaria "
    "(LOEPS), supervisadas por la Superintendencia de Compañías, Valores y "
    "Seguros (SCVS) y la Superintendencia de Economía Popular y Solidaria "
    "(SEPS) respectivamente. NO asumas normativa de otro país (FINRA, SEC, "
    "MiFID) ni productos que no existen en este mercado (401k, IRA, etc.). "
)


def _deepseek_model() -> str:
    """Modelo DeepSeek a usar. Configurable por entorno; se usa además como
    etiqueta de `explanation_source` para trazabilidad (qué generó cada texto)."""
    return os.environ.get("DEEPSEEK_MODEL", _DEEPSEEK_DEFAULT_MODEL)


_DEEPSEEK_TIMEOUT = 10
_DEEPSEEK_RETRIES = 2


def _call_deepseek(prompt: str, max_tokens: int = 400) -> str | None:
    """Llama a la API de DeepSeek (chat completions, compatible con OpenAI).
    Devuelve el texto generado o None si no hay `DEEPSEEK_API_KEY` o la
    petición falla — así la demo nunca se rompe y cae a la plantilla
    determinística.

    Resiliencia: timeout explícito de 10 s y hasta 2 reintentos ante errores
    transitorios (timeout, 429, 5xx). Si todos fallan, retorna None y el sistema
    cae al fallback determinístico sin que el frontend colapse."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None

    body = json.dumps({
        "model": _deepseek_model(),
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "stream": False,
    }).encode()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_err: Exception | None = None
    for attempt in range(_DEEPSEEK_RETRIES):
        try:
            req = urllib.request.Request(_DEEPSEEK_URL, data=body, headers=headers)
            with urllib.request.urlopen(req, timeout=_DEEPSEEK_TIMEOUT) as resp:
                data = json.load(resp)
            return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (429, 500, 502, 503):
                import time
                time.sleep(min(1.0 * (attempt + 1), 3.0))
                continue
            break
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = e
            import time
            time.sleep(min(1.0 * (attempt + 1), 3.0))
            continue
        except Exception:
            break

    if last_err:
        logger.info("[DEEPSEEK] API falló tras %d intento(s): %s", _DEEPSEEK_RETRIES, last_err)
    return None


def _try_llm_explanation(profile_result: dict, allocation: list, metrics: dict) -> str | None:
    """Capa narrativa opcional con DeepSeek. Solo redacta: recibe los números ya
    calculados y tiene prohibido inventar cifras o prometer rentabilidad."""
    prompt = (
        _JURISDICTION_CONTEXT +
        "Eres el agente Inversiones IA. Redacta en español, en un párrafo "
        "breve y claro para una persona sin conocimientos financieros, la "
        "explicación de esta propuesta de portafolio. Reglas estrictas: "
        "(1) básate ÚNICAMENTE en los datos provistos abajo (perfil, puntaje, "
        "asignación, métricas) — no uses conocimiento general de mercados ni "
        "cifras externas; (2) usa EXACTAMENTE las cifras dadas, nunca "
        "inventes números; (3) no prometas rentabilidad ni uses palabras como "
        "'garantiza'; (4) sé conciso (máximo 4 frases).\n"
        f"Perfil: {json.dumps(profile_result['profile'], ensure_ascii=False)}\n"
        f"Puntaje: {profile_result['score']}/100, reglas v{profile_result['rules_version']}\n"
        f"Asignación: {json.dumps([{ 'nombre': a['name'], 'peso': a['weight'] } for a in allocation], ensure_ascii=False)}\n"
        f"Métricas: {json.dumps(metrics, ensure_ascii=False)}"
    )
    return _call_deepseek(prompt, max_tokens=280)


# ── Narrativa IA para el Análisis de Mercado (pestaña "Diagnóstico de Riesgo") ──
# Distinta de `_market_narrative`: esa alinea una PROPUESTA concreta con el
# mercado; esta resume el estado GENERAL del mercado/noticias del día, sin
# depender de que el cliente ya tenga una propuesta. Las alertas, ajustes
# sugeridos y principios de inversión de esa pestaña siguen siendo 100%
# determinísticos (news_scraper._classify_themes) — DeepSeek solo redacta el
# resumen en prosa, con el mismo verificador anti-alucinación de siempre.

def build_market_insight_narrative(profile_label: str | None, quotes: dict,
                                    market_mood: dict, themes: dict) -> tuple[str | None, str, list]:
    """Devuelve (texto o None, fuente, eventos). Texto None = "usa el resumen
    determinístico existente" (fallback sin key, sin red, o verificador rechaza)."""
    events: list = []
    llm_text = _try_llm_insight_narrative(profile_label, quotes, market_mood, themes)
    if llm_text:
        extra = [q.get("change_pct") for q in (quotes or {}).values() if q.get("change_pct") is not None]
        extra += [market_mood.get("pos_pct"), market_mood.get("neg_pct")]
        ok, reason = _verify_llm_output(llm_text, {}, extra_allowed=extra)
        if ok and _tickers_within_catalog(llm_text):
            return llm_text, _deepseek_model(), events
        ev = _guardrail_event("analisis-mercado:resumen", reason or "ticker fuera del catálogo aprobado", llm_text)
        _log_guardrail(ev)
        events.append(ev)
    return None, "plantilla-determinista", events


def _try_llm_insight_narrative(profile_label: str | None, quotes: dict,
                                market_mood: dict, themes: dict) -> str | None:
    theme_labels = [_THEME_LABELS.get(k, k) for k, active in (themes or {}).items() if active]
    movers = [{"ticker": tk, "cambio_pct": q.get("change_pct")}
              for tk, q in (quotes or {}).items() if q.get("change_pct") is not None]
    prompt = (
        _JURISDICTION_CONTEXT +
        "Eres el analista de mercado de InvertIA. En 2-3 frases y en español claro, "
        "resume el estado del mercado y las tendencias de las noticias de HOY para "
        "un inversionista"
        + (f" con perfil {profile_label}" if profile_label else "") + ". Reglas estrictas: "
        "(1) básate ÚNICAMENTE en el estado de ánimo, temas y cotizaciones "
        "provistos abajo — no agregues opinión de mercado que no venga de esos "
        "datos ni uses conocimiento externo/desactualizado; "
        "(2) menciona explícitamente el tema o ticker más relevante de los "
        "datos de hoy, no un resumen genérico; "
        "(3) usa SOLO los tickers listados abajo, no inventes instrumentos; "
        "(4) usa SOLO las cifras % provistas, no inventes números; "
        "(5) NO prometas rentabilidad ni uses palabras como 'garantiza'; "
        "(6) NO sugieras montos ni pesos de portafolio — eso ya lo calcula el "
        "sistema por separado; (7) sé descriptivo del panorama, no prescriptivo.\n"
        f"Estado de ánimo del mercado: {market_mood.get('mood', 'Neutral')} "
        f"({market_mood.get('pos_pct', 0)}% de noticias positivas, "
        f"{market_mood.get('neg_pct', 0)}% negativas)\n"
        f"Temas activos en los titulares: {json.dumps(theme_labels, ensure_ascii=False)}\n"
        f"Cotizaciones de hoy: {json.dumps(movers, ensure_ascii=False)}"
    )
    return _call_deepseek(prompt, max_tokens=220)
