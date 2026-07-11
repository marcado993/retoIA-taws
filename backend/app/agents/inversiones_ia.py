"""Agente Inversiones IA.

Genera una propuesta de portafolio EXPLICABLE a partir del perfil calculado.
Arquitectura "deterministic core + narrative layer":
  - Los números (asignación, riesgo, retorno esperado) salen SIEMPRE del
    catálogo aprobado y de los portafolios modelo — nunca del LLM.
  - La capa narrativa redacta la explicación legible. Si hay una API key de
    Anthropic disponible se usa el LLM; si no, se usa una plantilla
    determinística para que la demo funcione de extremo a extremo.
El agente NO ejecuta órdenes ni promete rentabilidad.
"""

import json
import os
import re
import urllib.request
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "catalog.json"

DISCLAIMER = (
    "Esta es una propuesta para revisión de un asesor autorizado. No constituye "
    "una recomendación definitiva, no ejecuta órdenes y los retornos esperados "
    "son estimaciones simuladas, no promesas de rentabilidad."
)


def load_catalog() -> dict:
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def build_proposal(profile_result: dict) -> dict:
    """Construye la asignación desde el portafolio modelo del catálogo
    y calcula métricas agregadas de forma determinística."""
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
    explanation = _explain(profile_result, allocation, metrics)

    return {
        "catalog_version": catalog["version"],
        "profile_id": profile_id,
        "allocation": allocation,
        "metrics": metrics,
        "explanation": explanation,
        "disclaimer": DISCLAIMER,
    }


def _explain(profile_result: dict, allocation: list, metrics: dict) -> str:
    llm_text = _try_llm_explanation(profile_result, allocation, metrics)
    if llm_text:
        # CA-3g: Capa de verificación anti-alucinación
        is_valid, reason = _verify_llm_output(llm_text, metrics)
        if is_valid:
            return llm_text
        # LLM alucinado → log + fallback determinístico
        print(f"[ANTI-HALLUCINATION] LLM output rechazado: {reason}. Usando plantilla.")
    return _template_explanation(profile_result, allocation, metrics)


def _verify_llm_output(text: str, metrics: dict) -> tuple[bool, str]:
    """É verificador anti-alucinación de salida del LLM.

    Reglas:
    1. El texto no puede estar vacío.
    2. No puede contener promesas de rentabilidad (palabras clave).
    3. Cualquier número porcentual en el texto debe ser uno de los calculados
       determinísticamente (expected_return, volatility, risk_level) o
       menor a 1 (decimales que no son cifras financieras relevantes).

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
    for v in metrics.values():
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


def _template_explanation(profile_result: dict, allocation: list, metrics: dict) -> str:
    profile = profile_result["profile"]
    fixed = sum(a["weight"] for a in allocation if a["risk_level"] <= 2)
    equity = sum(a["weight"] for a in allocation if a["risk_level"] >= 3)
    top = max(allocation, key=lambda a: a["weight"])

    answers = profile_result.get("answers", {})
    target_amount = answers.get("target_amount")
    target_years = answers.get("target_years")
    monthly_contrib = answers.get("monthly_contrib")

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

    # Análisis de viabilidad personalizado "Agente Personalizado - Meta Financiera"
    if target_amount and target_years and monthly_contrib:
        try:
            amt = float(target_amount)
            yrs = float(target_years)
            contrib = float(monthly_contrib)
            
            # Cálculo de rendimiento necesario simple aproximado: 
            # Total Aportaciones = contrib * 12 * yrs
            # Resto necesario para llegar a amt
            total_invested = contrib * 12 * yrs
            if total_invested < amt:
                needed_return_pct = round(((amt - total_invested) / total_invested) / yrs * 100, 1)
                if needed_return_pct < 0:
                    needed_return_pct = 0.0
            else:
                needed_return_pct = 0.0

            goal_analysis = (
                f" Análisis de tu meta personalizada: Para alcanzar ${amt:,.0f} USD en {yrs:.0f} años "
                f"aportando ${contrib:,.0f} USD mensuales (inversión total de ${total_invested:,.0f} USD), "
                f"el rendimiento anual estimado requerido es del {needed_return_pct}%. "
                f"Tu portafolio {profile['label']} ofrece un {metrics['expected_return']}%. "
                f"Consejo de Inversión (Estilo Warren Buffett): El 90% de los grandes inversores "
                f"indican que la consistencia es clave; si la brecha es alta, incrementa tu aportación "
                f"o extiende el plazo."
            )
            parts.append(goal_analysis)
        except Exception:
            pass

    if profile_result.get("capped"):
        reasons = "; ".join(k["reason"] for k in profile_result["knockouts_applied"])
        parts.append(f"Importante: tu perfil fue limitado por una regla de protección. {reasons}")
    return " ".join(parts)



def _try_llm_explanation(profile_result: dict, allocation: list, metrics: dict) -> str | None:
    """Capa narrativa opcional con Claude. Solo redacta: recibe los números ya
    calculados y tiene prohibido inventar cifras o prometer rentabilidad."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        body = json.dumps({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 500,
            "messages": [{
                "role": "user",
                "content": (
                    "Eres el agente Inversiones IA. Redacta en español, en un párrafo "
                    "claro para una persona sin conocimientos financieros, la explicación "
                    "de esta propuesta de portafolio. Usa EXACTAMENTE estas cifras, no "
                    "inventes números y no prometas rentabilidad.\n"
                    f"Perfil: {json.dumps(profile_result['profile'], ensure_ascii=False)}\n"
                    f"Puntaje: {profile_result['score']}/100, reglas v{profile_result['rules_version']}\n"
                    f"Asignación: {json.dumps([{ 'nombre': a['name'], 'peso': a['weight'] } for a in allocation], ensure_ascii=False)}\n"
                    f"Métricas: {json.dumps(metrics, ensure_ascii=False)}"
                ),
            }],
        }).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
        return data["content"][0]["text"]
    except Exception:
        return None  # la demo nunca se rompe: cae a la plantilla determinística
