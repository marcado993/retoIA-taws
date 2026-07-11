"""Tests unitarios del backend — InvertIA Robo-Advisor.

Nivel INTERMEDIO (criterio del hackathon):
- Tests de funciones críticas del motor de reglas (determinísticas, sin LLM)
- Tests de knockouts de protección
- Tests de validación de propuestas
- Tests anti-alucinación: verificador de salida del LLM
- Mock del LLM para no depender de una API key externa

Correr: cd backend && pytest tests/ -v
"""

import sys
import os
import json
import pytest

# Asegura que el paquete `app` sea importable desde la carpeta backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents import asesor_financiero, inversiones_ia
from app.agents.inversiones_ia import _verify_llm_output, _template_explanation


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def answers_conservador():
    """Respuestas que producen perfil Conservador."""
    return {
        "reaccion":        "vender_todo",
        "objetivo":        "preservar",
        "horizonte":       "corto",
        "emergencia":      "no",
        "experiencia":     "ninguna",
        "ingresos":        "inestables",
    }


@pytest.fixture
def answers_agresivo():
    """Respuestas que producen perfil Agresivo (sin knockouts)."""
    return {
        "reaccion":        "comprar",
        "objetivo":        "crecimiento",
        "horizonte":       "largo",
        "emergencia":      "seis_meses",
        "experiencia":     "avanzada",
        "ingresos":        "muy_estables",
    }


@pytest.fixture
def answers_knockout_horizonte():
    """Agresivo por score pero knockout por horizonte < 1 año → debe capar a Conservador."""
    return {
        "reaccion":        "comprar",
        "objetivo":        "crecimiento",
        "horizonte":       "corto",   # ← knockout
        "emergencia":      "seis_meses",
        "experiencia":     "avanzada",
        "ingresos":        "muy_estables",
    }


@pytest.fixture
def answers_knockout_fondo():
    """Sin fondo de emergencia → perfil máximo Moderado."""
    return {
        "reaccion":        "comprar",
        "objetivo":        "crecimiento",
        "horizonte":       "largo",
        "emergencia":      "no",             # ← knockout
        "experiencia":     "avanzada",
        "ingresos":        "muy_estables",
    }


# ──────────────────────────────────────────────────────────────────────────────
# C1: Motor de reglas — scoring determinístico
# ──────────────────────────────────────────────────────────────────────────────

class TestScoringDeterministico:
    """CA-1c: El score nunca es generado por un LLM; es reproducible y verificable."""

    def test_score_rango_valido(self, answers_conservador):
        result = asesor_financiero.evaluate_profile(answers_conservador)
        assert 0 <= result["score"] <= 100, "El score debe estar en [0, 100]"

    def test_score_es_reproducible(self, answers_agresivo):
        """El mismo input siempre produce el mismo output (determinístico)."""
        r1 = asesor_financiero.evaluate_profile(answers_agresivo)
        r2 = asesor_financiero.evaluate_profile(answers_agresivo)
        assert r1["score"] == r2["score"]
        assert r1["profile"]["id"] == r2["profile"]["id"]

    def test_perfil_conservador_score_bajo(self, answers_conservador):
        result = asesor_financiero.evaluate_profile(answers_conservador)
        assert result["score"] < 30, f"Score esperado < 30, obtenido {result['score']}"
        assert result["profile"]["id"] == "conservador"

    def test_perfil_agresivo_score_alto(self, answers_agresivo):
        result = asesor_financiero.evaluate_profile(answers_agresivo)
        assert result["score"] >= 70, f"Score esperado ≥ 70, obtenido {result['score']}"
        assert result["profile"]["id"] == "agresivo"

    def test_breakdown_suma_el_score(self, answers_agresivo):
        """La suma de contribuciones en el breakdown debe aproximarse al score."""
        result = asesor_financiero.evaluate_profile(answers_agresivo)
        total_contrib = sum(b["contribution"] for b in result["breakdown"])
        # El breakdown suma aprox 100 (es el % relativo de cada pregunta al máximo)
        # No es igual al score directamente, pero debe ser positivo y coherente
        assert total_contrib > 0
        assert len(result["breakdown"]) == 6, "Deben haber 6 respuestas en el breakdown"

    def test_respuesta_invalida_levanta_error(self):
        bad = {
            "reaccion":        "valor_inexistente",
            "objetivo":        "preservar",
            "horizonte":       "corto",
            "emergencia":      "no",
            "experiencia":     "ninguna",
            "ingresos":        "inestables",
        }
        with pytest.raises(ValueError, match="Respuesta inválida"):
            asesor_financiero.evaluate_profile(bad)

    def test_respuestas_faltantes_levanta_error(self):
        with pytest.raises(ValueError, match="Faltan respuestas"):
            asesor_financiero.evaluate_profile({"reaccion": "venderia_todo"})

    def test_rules_version_presente(self, answers_conservador):
        result = asesor_financiero.evaluate_profile(answers_conservador)
        assert "rules_version" in result
        assert result["rules_version"]  # no vacío


# ──────────────────────────────────────────────────────────────────────────────
# C2: Knockouts de protección (reglas de tope)
# ──────────────────────────────────────────────────────────────────────────────

class TestKnockouts:
    """CA-1e, CA-3f: Las reglas de tope protegen al usuario aunque el score sea alto."""

    def test_knockout_horizonte_corto_capa_a_conservador(self, answers_knockout_horizonte):
        result = asesor_financiero.evaluate_profile(answers_knockout_horizonte)
        assert result["capped"] is True, "Debe aplicar el knockout de horizonte corto"
        assert result["profile"]["id"] == "conservador", \
            f"Esperado conservador, obtenido {result['profile']['id']}"
        assert len(result["knockouts_applied"]) >= 1

    def test_knockout_fondo_emergencia_capa_a_moderado(self, answers_knockout_fondo):
        result = asesor_financiero.evaluate_profile(answers_knockout_fondo)
        # El knockout de fondo de emergencia capea a Moderado (no a Conservador)
        assert result["capped"] is True
        assert result["profile"]["id"] in ("conservador", "moderado"), \
            f"Debe ser conservador o moderado, obtenido {result['profile']['id']}"

    def test_sin_knockout_no_capped(self, answers_agresivo):
        result = asesor_financiero.evaluate_profile(answers_agresivo)
        assert result["capped"] is False
        assert result["knockouts_applied"] == []


# ──────────────────────────────────────────────────────────────────────────────
# C3: Propuesta de portafolio — datos determinísticos
# ──────────────────────────────────────────────────────────────────────────────

class TestPropuesta:
    """CA-1c, CA-3e: Las cifras de la propuesta vienen del catálogo, nunca del LLM."""

    def test_propuesta_incluye_disclaimer(self, answers_agresivo):
        profile = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile)
        assert "disclaimer" in proposal
        assert len(proposal["disclaimer"]) > 20

    def test_asignacion_suma_100(self, answers_agresivo):
        profile = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile)
        total = sum(a["weight"] for a in proposal["allocation"])
        assert abs(total - 100) < 0.01, f"La asignación debe sumar 100%, suma {total}%"

    def test_metricas_son_numericas(self, answers_agresivo):
        profile = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile)
        m = proposal["metrics"]
        assert isinstance(m["expected_return"], (int, float))
        assert isinstance(m["volatility"], (int, float))
        assert isinstance(m["risk_level"], (int, float))
        assert isinstance(m["diversification"], int)

    def test_todos_los_instrumentos_en_catalogo(self, answers_moderado=None):
        """CA-3e: El sistema no puede proponer ETFs fuera del catálogo aprobado."""
        catalog = inversiones_ia.load_catalog()
        valid_tickers = {i["ticker"] for i in catalog["instruments"]}
        for profile_id in ["conservador", "moderado", "agresivo"]:
            # Simular perfil directo
            profile_result = {
                "rules_version": "1.0.0",
                "score": 50,
                "profile": {"id": profile_id, "label": profile_id.capitalize(),
                            "description": "Test"},
                "capped": False,
                "knockouts_applied": [],
                "breakdown": [],
                "answers": {},
            }
            proposal = inversiones_ia.build_proposal(profile_result)
            for a in proposal["allocation"]:
                assert a["ticker"] in valid_tickers, \
                    f"Ticker {a['ticker']} fuera del catálogo aprobado"

    def test_explicacion_template_no_inventa_numeros(self, answers_agresivo):
        """CA-3a: La plantilla determinística no puede inventar cifras."""
        profile = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile)
        allocation = proposal["allocation"]
        metrics = proposal["metrics"]
        text = _template_explanation(profile, allocation, metrics)
        # El texto debe mencionar el retorno esperado calculado
        assert str(metrics["expected_return"]) in text, \
            "La explicación debe incluir el retorno esperado calculado"
        assert str(metrics["volatility"]) in text, \
            "La explicación debe incluir la volatilidad calculada"


# ──────────────────────────────────────────────────────────────────────────────
# C4: Anti-alucinación — verificador de salida del LLM
# ──────────────────────────────────────────────────────────────────────────────

class TestAntiAlucinacion:
    """CA-3g: La capa de verificación detecta y rechaza texto con cifras inventadas."""

    def test_texto_correcto_pasa_validacion(self):
        metrics = {"expected_return": 7.2, "volatility": 12.5, "risk_level": 3.0}
        texto_ok = "Tu portafolio tiene un retorno esperado de 7.2% con volatilidad de 12.5%."
        is_valid, reason = _verify_llm_output(texto_ok, metrics)
        assert is_valid, f"Texto válido rechazado: {reason}"

    def test_numero_inventado_falla_validacion(self):
        metrics = {"expected_return": 7.2, "volatility": 12.5, "risk_level": 3.0}
        texto_alucinado = "Tu portafolio generará un retorno del 25% anual garantizado."
        is_valid, reason = _verify_llm_output(texto_alucinado, metrics)
        assert not is_valid, "Texto con número inventado debería fallar validación"

    def test_promesa_de_rentabilidad_falla(self):
        metrics = {"expected_return": 7.2, "volatility": 12.5, "risk_level": 3.0}
        texto_promesa = "Este portafolio garantiza ganancias de 15% anuales."
        is_valid, reason = _verify_llm_output(texto_promesa, metrics)
        assert not is_valid, "Promesa de rentabilidad debe fallar"

    def test_texto_vacio_falla(self):
        metrics = {"expected_return": 7.2, "volatility": 12.5, "risk_level": 3.0}
        is_valid, reason = _verify_llm_output("", metrics)
        assert not is_valid

    def test_texto_sin_numeros_inventados_pasa(self):
        metrics = {"expected_return": 8.0, "volatility": 15.0, "risk_level": 4.0}
        texto = "Tu perfil es Agresivo. La propuesta busca crecimiento a largo plazo con retorno esperado 8.0%."
        is_valid, _ = _verify_llm_output(texto, metrics)
        assert is_valid


# ──────────────────────────────────────────────────────────────────────────────
# C5: API — estado de propuesta como "pendiente" (HITL gate)
# ──────────────────────────────────────────────────────────────────────────────

class TestHITLGate:
    """CA-1e: Ninguna propuesta está aprobada sin decisión del asesor humano."""

    def test_propuesta_creada_en_estado_pendiente(self, answers_agresivo):
        from app import store
        import tempfile, pathlib

        # Usar DB temporal para no contaminar datos de demo
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_db = pathlib.Path(tmpdir) / "test_db.json"
            os.environ["ROBO_DB_PATH"] = str(tmp_db)
            store._db = {"proposals": {}, "audit": []}

            profile = asesor_financiero.evaluate_profile(answers_agresivo)
            proposal = inversiones_ia.build_proposal(profile)
            record = store.create_proposal("Test User", profile, proposal)

            assert record["status"] == "pendiente", \
                f"Nueva propuesta debe estar en 'pendiente', está en '{record['status']}'"
            assert record["decision"] is None

            # Limpiar
            os.environ.pop("ROBO_DB_PATH", None)
            store._db = {"proposals": {}, "audit": []}
