"""Agente Asesor Financiero IA.

Realiza el cuestionario de perfilamiento y calcula el perfil preliminar
mediante reglas VISIBLES y VERSIONADAS (profile_rules_v1.json).
El agente nunca inventa el puntaje: todo sale del motor de reglas,
por lo que el resultado es auditable y reproducible.
"""

import json
from pathlib import Path

RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "profile_rules_v1.json"


def load_rules() -> dict:
    with open(RULES_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_questionnaire() -> dict:
    rules = load_rules()
    return {
        "rules_version": rules["version"],
        "questions": rules["questions"],
        "profiles": rules["profiles"],
        "knockouts": rules["knockouts"],
        "scoring_formula": rules["scoring_formula"],
    }


def _profile_rank(rules: dict, profile_id: str) -> int:
    order = [p["id"] for p in rules["profiles"]]
    return order.index(profile_id)


def evaluate_profile(answers: dict) -> dict:
    """Calcula score 0-100, perfil, knockouts aplicados y el desglose
    por pregunta (cómo influyó cada respuesta en el resultado)."""
    rules = load_rules()

    missing = [q["id"] for q in rules["questions"] if q["id"] not in answers]
    if missing:
        raise ValueError(f"Faltan respuestas: {', '.join(missing)}")

    total_weight = sum(q["weight"] for q in rules["questions"])
    raw = 0.0
    breakdown = []
    for q in rules["questions"]:
        option = next((o for o in q["options"] if o["value"] == answers[q["id"]]), None)
        if option is None:
            raise ValueError(f"Respuesta inválida para '{q['id']}': {answers[q['id']]}")
        contribution = q["weight"] * (option["points"] - 1) / 3
        raw += contribution
        breakdown.append({
            "question_id": q["id"],
            "question": q["text"],
            "answer": option["label"],
            "points": option["points"],
            "weight": q["weight"],
            "contribution": round(100 * contribution / total_weight, 1),
            "max_contribution": round(100 * q["weight"] / total_weight, 1),
        })

    score = round(100 * raw / total_weight)

    profile = next(
        p for p in rules["profiles"]
        if p["min_score"] <= score <= p["max_score"]
    )

    # Reglas de tope (knockout): protegen al usuario aunque el puntaje sea alto
    applied_knockouts = []
    final_profile = profile
    for ko in rules["knockouts"]:
        q_id, _, expected = ko["condition"].partition(" == ")
        expected = expected.strip("'")
        if answers.get(q_id.strip()) == expected:
            cap = next(p for p in rules["profiles"] if p["id"] == ko["cap_profile"])
            if _profile_rank(rules, final_profile["id"]) > _profile_rank(rules, cap["id"]):
                final_profile = cap
            applied_knockouts.append(ko)

    return {
        "rules_version": rules["version"],
        "score": score,
        "raw_profile": profile,
        "profile": final_profile,
        "capped": final_profile["id"] != profile["id"],
        "knockouts_applied": applied_knockouts,
        "breakdown": breakdown,
        "answers": answers,
    }
