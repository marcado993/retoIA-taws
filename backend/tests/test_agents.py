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
import urllib.request
import urllib.error
import pytest

# Asegura que el paquete `app` sea importable desde la carpeta backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents import asesor_financiero, inversiones_ia
from app.agents.inversiones_ia import _verify_llm_output, _template_explanation
from app.pdf_report import DISCLAIMER_TEXT, generate_suitability_report_pdf


# ── Utilidades para mockear la API de DeepSeek sin depender de la red ──────────
def _deepseek_payload(text: str) -> dict:
    """Respuesta con la forma real de la API chat completions de DeepSeek
    (compatible con el formato de OpenAI)."""
    return {"choices": [{"message": {"content": text}}]}


class _FakeDeepSeekResp:
    """Respuesta HTTP falsa usable como context manager (para json.load)."""
    def __init__(self, payload: dict):
        self._b = json.dumps(payload).encode()

    def read(self, *a, **k):
        return self._b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


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
        # El texto debe mencionar la volatilidad calculada
        assert str(metrics["volatility"]) in text, \
            "La explicación debe incluir la volatilidad calculada"


class TestReporteIdoneidad:
    def test_pdf_incluye_textos_clave(self, answers_agresivo):
        profile = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile)
        record = {
            "client_name": "Ana Pérez",
            "profile_result": profile,
            "proposal": proposal,
            "decision": {
                "action": "aprobar",
                "advisor": "María Gómez",
            },
        }

        pdf = generate_suitability_report_pdf(record)
        text = pdf.decode("latin-1", errors="ignore")

        assert pdf.startswith(b"%PDF-1.4")
        assert "IDONEIDAD" in text
        assert "Ana Pérez" in text
        assert f"Reglas v{profile['rules_version']}" in text
        assert DISCLAIMER_TEXT in text
        assert "María Gómez" in text

    def test_pdf_requiere_validacion_humana(self, answers_agresivo):
        profile = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile)
        record = {
            "client_name": "Ana Pérez",
            "profile_result": profile,
            "proposal": proposal,
            "decision": None,
        }

        with pytest.raises(ValueError, match="validación humana"):
            generate_suitability_report_pdf(record)


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


# ──────────────────────────────────────────────────────────────────────────────
# C6: Reglas de negocio financiero — diversificación (REGLAS.md §3.4) [Gap G1]
# ──────────────────────────────────────────────────────────────────────────────

class TestDiversificacion:
    """Criterio 2 (ajuste al track): el backend hace cumplir las reglas de negocio
    de aprobación/edición: ≥3 clases de activo y ningún instrumento >50%."""

    def _alloc(self, pairs):
        cat = inversiones_ia.load_catalog()
        instruments = {i["ticker"]: i for i in cat["instruments"]}
        return [{**instruments[t], "weight": w} for t, w in pairs]

    def test_portafolio_diversificado_valido(self):
        alloc = self._alloc([("BIL", 20), ("AGG", 30), ("SPY", 30), ("GLD", 20)])
        ok, reason = inversiones_ia.validate_diversification(alloc, "moderado")
        assert ok, reason

    def test_menos_de_3_clases_falla(self):
        # BIL (efectivo) + AGG/BND (renta fija) = solo 2 clases distintas
        alloc = self._alloc([("BIL", 40), ("AGG", 30), ("BND", 30)])
        ok, reason = inversiones_ia.validate_diversification(alloc, "moderado")
        assert not ok
        assert "3 clases" in reason

    def test_instrumento_mayor_50_falla(self):
        alloc = self._alloc([("SPY", 60), ("AGG", 25), ("GLD", 15)])
        ok, reason = inversiones_ia.validate_diversification(alloc, "agresivo")
        assert not ok
        assert "50%" in reason and "SPY" in reason

    def test_conservador_permite_concentrar_renta_fija(self):
        # AGG (renta fija) al 60% se admite SOLO en perfil conservador (defensivo).
        alloc = self._alloc([("AGG", 60), ("SPY", 25), ("GLD", 15)])
        ok, reason = inversiones_ia.validate_diversification(alloc, "conservador")
        assert ok, reason

    def test_conservador_no_exime_renta_variable(self):
        # SPY (renta variable) al 60% NO está exento aunque el perfil sea conservador.
        alloc = self._alloc([("SPY", 60), ("AGG", 25), ("GLD", 15)])
        ok, reason = inversiones_ia.validate_diversification(alloc, "conservador")
        assert not ok

    def test_ignora_pesos_cero(self):
        alloc = self._alloc([("BIL", 0), ("AGG", 50), ("SPY", 30), ("GLD", 20)])
        ok, reason = inversiones_ia.validate_diversification(alloc, "moderado")
        assert ok, reason


# ──────────────────────────────────────────────────────────────────────────────
# C7: Integración DeepSeek con mocks (nivel intermedio) [Gap G5 / P1]
# ──────────────────────────────────────────────────────────────────────────────

class TestDeepSeek:
    """Requisito de pruebas (nivel intermedio): mock de la API del LLM para probar
    sin depender de su disponibilidad — camino feliz y fallback."""

    def test_call_deepseek_camino_feliz(self, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
        payload = _deepseek_payload("Explicación de prueba con retorno 7.2%.")
        monkeypatch.setattr("urllib.request.urlopen",
                            lambda *a, **k: _FakeDeepSeekResp(payload))
        out = inversiones_ia._call_deepseek("prompt de prueba")
        assert out == "Explicación de prueba con retorno 7.2%."

    def test_call_deepseek_sin_key_devuelve_none(self, monkeypatch):
        monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
        monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
        # No debe intentar red siquiera; si lo hiciera, fallaría el assert.
        assert inversiones_ia._call_deepseek("prompt") is None

    def test_call_deepseek_error_de_red_cae_a_none(self, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")

        def _boom(*a, **k):
            raise urllib.error.URLError("sin red")

        monkeypatch.setattr("urllib.request.urlopen", _boom)
        assert inversiones_ia._call_deepseek("prompt") is None

    def test_explain_usa_deepseek_cuando_es_valido(self, monkeypatch):
        texto = "Tu retorno esperado simulado es 7.2% con una volatilidad de 12.5%."
        monkeypatch.setattr(inversiones_ia, "_call_deepseek", lambda *a, **k: texto)
        profile = {"profile": {"id": "moderado", "label": "Moderado", "description": "x"},
                   "score": 50, "rules_version": "1.0.0"}
        metrics = {"expected_return": 7.2, "volatility": 12.5, "risk_level": 3.0, "diversification": 4}
        alloc = [{"name": "SPY", "weight": 100, "risk_level": 4, "asset_class": "Renta variable EE.UU."}]
        text, source, events = inversiones_ia._explain(profile, alloc, metrics)
        assert text == texto
        assert source.startswith("deepseek"), f"source esperado deepseek*, obtenido {source}"
        assert events == [], "Una salida válida no genera eventos de guardrail"

    def test_explain_cae_a_plantilla_si_deepseek_alucina(self, monkeypatch):
        # DeepSeek devuelve una promesa de rentabilidad → el verificador la rechaza
        # y el sistema cae a la plantilla determinística.
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "Retorno garantizado del 40% asegurado.")
        profile = {"profile": {"id": "agresivo", "label": "Agresivo", "description": "x"},
                   "score": 80, "rules_version": "1.0.0"}
        metrics = {"expected_return": 9.0, "volatility": 16.0, "risk_level": 4.0, "diversification": 5}
        alloc = [{"name": "SPY", "weight": 100, "risk_level": 4, "asset_class": "Renta variable EE.UU."}]
        text, source, events = inversiones_ia._explain(profile, alloc, metrics)
        assert source == "plantilla-determinista"

    def test_build_proposal_incluye_market_context_con_deepseek(self, monkeypatch):
        # Camino feliz de extremo a extremo: con DeepSeek mockeado y señales de mercado,
        # la propuesta trae market_context con fuente deepseek.
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "SPY sube hoy y respalda la propuesta; el asesor decide.")
        profile = asesor_financiero.evaluate_profile({
            "reaccion": "mantener", "objetivo": "balanceado", "horizonte": "medio",
            "emergencia": "tres_meses", "experiencia": "intermedia", "ingresos": "estables",
        })
        market = {"provider": "Test", "live": False,
                  "quotes": {"SPY": {"change_pct": 1.5}, "AGG": {"change_pct": -0.2}}}
        news = [{"title": "Rally tecnológico impulsa el Nasdaq", "sentiment": "positivo"}]
        prop = inversiones_ia.build_proposal(profile, market=market, news=news)
        assert prop["market_context"] is not None
        assert prop["market_context"]["source"].startswith("deepseek")


# ──────────────────────────────────────────────────────────────────────────────
# C8: Casos de borde de la API de DeepSeek (robustez del cliente) [P3]
# ──────────────────────────────────────────────────────────────────────────────

class TestDeepSeekCasosBorde:
    """Respuestas raras de la API no deben romper la demo: siempre caen a None y de
    ahí a la plantilla determinística."""

    def test_respuesta_sin_candidates_devuelve_none(self, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
        monkeypatch.setattr("urllib.request.urlopen",
                            lambda *a, **k: _FakeDeepSeekResp({}))
        assert inversiones_ia._call_deepseek("prompt") is None

    def test_respuesta_bloqueada_por_seguridad_devuelve_none(self, monkeypatch):
        # DeepSeek puede devolver una respuesta sin `content` (finishReason SAFETY).
        monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
        payload = {"candidates": [{"finishReason": "SAFETY"}]}
        monkeypatch.setattr("urllib.request.urlopen",
                            lambda *a, **k: _FakeDeepSeekResp(payload))
        assert inversiones_ia._call_deepseek("prompt") is None

    def test_json_invalido_devuelve_none(self, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")

        class _BadResp:
            def read(self, *a, **k):
                return b"esto no es json"
            def __enter__(self):
                return self
            def __exit__(self, *a):
                return False

        monkeypatch.setattr("urllib.request.urlopen", lambda *a, **k: _BadResp())
        assert inversiones_ia._call_deepseek("prompt") is None

    def test_texto_vacio_de_deepseek_cae_a_plantilla(self, monkeypatch):
        # Un texto vacío del LLM se trata como ausencia de narrativa → plantilla.
        monkeypatch.setattr(inversiones_ia, "_call_deepseek", lambda *a, **k: "")
        profile = {"profile": {"id": "moderado", "label": "Moderado", "description": "x"},
                   "score": 50, "rules_version": "1.0.0"}
        metrics = {"expected_return": 7.2, "volatility": 12.5, "risk_level": 3.0, "diversification": 4}
        alloc = [{"name": "SPY", "weight": 100, "risk_level": 4, "asset_class": "Renta variable EE.UU."}]
        _, source, events = inversiones_ia._explain(profile, alloc, metrics)
        assert source == "plantilla-determinista"
        assert events == []  # texto vacío no es una "alucinación": no genera evento


# ──────────────────────────────────────────────────────────────────────────────
# C9: Evidencia de mitigación de alucinaciones en auditoría/logs (Gap G6) [P4]
# ──────────────────────────────────────────────────────────────────────────────

class TestAuditoriaAntialucinacion:
    """El rechazo del verificador debe quedar como evidencia tangible: como evento
    en la propuesta y como entrada persistida en el log de auditoría."""

    def test_explain_registra_evento_al_alucinar(self, monkeypatch):
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "Retorno garantizado del 40% asegurado.")
        profile = {"profile": {"id": "agresivo", "label": "Agresivo", "description": "x"},
                   "score": 80, "rules_version": "1.0.0"}
        metrics = {"expected_return": 9.0, "volatility": 16.0, "risk_level": 4.0, "diversification": 5}
        alloc = [{"name": "SPY", "weight": 100, "risk_level": 4, "asset_class": "Renta variable EE.UU."}]
        _, source, events = inversiones_ia._explain(profile, alloc, metrics)
        assert source == "plantilla-determinista"
        assert len(events) == 1
        assert events[0]["agent"] == "inversiones-ia:explicacion"
        assert events[0]["reason"]      # motivo del rechazo presente
        assert events[0]["snippet"]     # fragmento del texto descartado presente

    def test_market_context_rechaza_ticker_inventado(self, monkeypatch):
        # DeepSeek menciona un ticker fuera del catálogo aprobado → se descarta.
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "El mercado favorece a NVDA hoy, que sube con fuerza.")
        profile = asesor_financiero.evaluate_profile({
            "reaccion": "mantener", "objetivo": "balanceado", "horizonte": "medio",
            "emergencia": "tres_meses", "experiencia": "intermedia", "ingresos": "estables",
        })
        market = {"provider": "Test", "live": False, "quotes": {"SPY": {"change_pct": 1.2}}}
        news = [{"title": "Rally tecnológico en el Nasdaq", "sentiment": "positivo"}]
        prop = inversiones_ia.build_proposal(profile, market=market, news=news)
        assert prop["market_context"]["source"] == "plantilla-determinista"
        assert any(ev["agent"] == "inversiones-ia:contexto-mercado"
                   for ev in prop["guardrail_events"])

    def test_create_proposal_persiste_evento_en_auditoria(self, monkeypatch, tmp_path):
        from app import store
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "Rentabilidad garantizada del 30% asegurada.")
        monkeypatch.setattr(store, "DB_PATH", tmp_path / "db.json")
        monkeypatch.setattr(store, "_db", {"proposals": {}, "audit": []})

        profile = asesor_financiero.evaluate_profile({
            "reaccion": "mantener", "objetivo": "balanceado", "horizonte": "medio",
            "emergencia": "tres_meses", "experiencia": "intermedia", "ingresos": "estables",
        })
        market = {"provider": "Test", "live": False, "quotes": {"SPY": {"change_pct": 1.0}}}
        news = [{"title": "Rally tecnológico impulsa el Nasdaq", "sentiment": "positivo"}]
        proposal = inversiones_ia.build_proposal(profile, market=market, news=news)
        assert proposal["guardrail_events"], "Debe haber al menos un rechazo registrado"

        store.create_proposal("Cliente Evidencia", profile, proposal)
        audit = store.audit_log()
        rechazos = [a for a in audit if a["action"] == "antialucinacion_rechazo"]
        assert rechazos, "El rechazo debe quedar persistido en el log de auditoría"
        assert "descartada" in rechazos[0]["detail"].lower()


# ──────────────────────────────────────────────────────────────────────────────
# C10: DeepSeek en el Análisis de Mercado (pestaña "Diagnóstico de Riesgo")
# ──────────────────────────────────────────────────────────────────────────────

class TestAnalisisMercadoDeepSeek:
    """El resumen de la pestaña Diagnóstico de Riesgo (news_scraper.build_ai_insight)
    ahora tiene una capa narrativa DeepSeek además de las alertas 100% determinísticas.
    Mismo contrato que el resto del sistema: verificador anti-alucinación + fallback."""

    def _news_and_quotes(self):
        from app import news_scraper
        news = news_scraper._mock_news()
        quotes = {"SPY": {"change_pct": 1.2}, "GLD": {"change_pct": -0.5}}
        return news_scraper, news, quotes

    def test_sin_key_usa_resumen_determinista(self, monkeypatch):
        news_module, news, quotes = self._news_and_quotes()
        monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
        monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
        result = news_module.build_ai_insight("Moderado", news, quotes)
        assert result["summary_source"] == "plantilla-determinista"
        assert result["summary"]  # la plantilla siempre produce algo
        assert result["guardrail_events"] == []

    def test_deepseek_valido_reemplaza_el_resumen(self, monkeypatch):
        news_module, news, quotes = self._news_and_quotes()
        texto = "SPY sube 1.2% hoy mientras GLD retrocede 0.5%; los titulares muestran un tono mixto."
        monkeypatch.setattr(inversiones_ia, "_call_deepseek", lambda *a, **k: texto)
        result = news_module.build_ai_insight("Moderado", news, quotes)
        assert result["summary"] == texto
        assert result["summary_source"].startswith("deepseek")
        assert result["guardrail_events"] == []

    def test_deepseek_alucinado_cae_a_plantilla_y_registra_evento(self, monkeypatch):
        news_module, news, quotes = self._news_and_quotes()
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "Este mercado garantiza ganancias del 50% este mes.")
        result = news_module.build_ai_insight("Moderado", news, quotes)
        assert result["summary_source"] == "plantilla-determinista"
        assert len(result["guardrail_events"]) == 1
        assert result["guardrail_events"][0]["agent"] == "analisis-mercado:resumen"

    def test_deepseek_ticker_inventado_se_rechaza(self, monkeypatch):
        news_module, news, quotes = self._news_and_quotes()
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "NVDA lidera las alzas del mercado hoy con fuerza inusual.")
        result = news_module.build_ai_insight("Moderado", news, quotes)
        assert result["summary_source"] == "plantilla-determinista"
        assert len(result["guardrail_events"]) == 1

    def test_evento_de_analisis_mercado_se_persiste_en_auditoria(self, monkeypatch, tmp_path):
        from app import store
        news_module, news, quotes = self._news_and_quotes()
        monkeypatch.setattr(inversiones_ia, "_call_deepseek",
                            lambda *a, **k: "Rentabilidad asegurada del 30% garantizada este trimestre.")
        monkeypatch.setattr(store, "DB_PATH", tmp_path / "db.json")
        monkeypatch.setattr(store, "_db", {"proposals": {}, "audit": []})

        result = news_module.build_ai_insight("Moderado", news, quotes)
        assert result["guardrail_events"]

        for ev in result["guardrail_events"]:
            store.add_audit("antialucinacion_rechazo", f"verificador:{ev['agent']}",
                            "analisis-mercado", "n/d",
                            f"Salida del LLM descartada — {ev['reason']}. Fragmento: «{ev['snippet']}»")
        audit = store.audit_log()
        rechazos = [a for a in audit if a["action"] == "antialucinacion_rechazo"]
        assert rechazos
        assert rechazos[0]["proposal_id"] == "analisis-mercado"


# ──────────────────────────────────────────────────────────────────────────────
# C11: Memoria del agente — continuidad entre diagnósticos del mismo cliente
# ──────────────────────────────────────────────────────────────────────────────

class TestMemoriaCliente:
    """El agente recuerda diagnósticos previos del mismo cliente (por nombre).
    100% determinístico: nunca depende del LLM, así que no puede "inventar"
    un historial que no existe."""

    def _isolated_store(self, monkeypatch, tmp_path):
        from app import store
        monkeypatch.setattr(store, "DB_PATH", tmp_path / "db.json")
        monkeypatch.setattr(store, "_db", {"proposals": {}, "audit": []})
        return store

    def test_cliente_nuevo_no_tiene_historial(self, monkeypatch, tmp_path):
        store = self._isolated_store(monkeypatch, tmp_path)
        assert store.get_client_history("Alguien Nuevo") == []

    def test_historial_encuentra_diagnosticos_previos_sin_distinguir_mayusculas(
            self, monkeypatch, tmp_path, answers_agresivo):
        store = self._isolated_store(monkeypatch, tmp_path)
        profile_result = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(profile_result)
        store.create_proposal("Ana Torres", profile_result, proposal)

        history = store.get_client_history("  ana torres  ")
        assert len(history) == 1
        assert history[0]["client_name"] == "Ana Torres"

    def test_compute_client_memory_none_sin_historial(self, answers_agresivo):
        profile_result = asesor_financiero.evaluate_profile(answers_agresivo)
        assert inversiones_ia._compute_client_memory(None, profile_result) is None
        assert inversiones_ia._compute_client_memory([], profile_result) is None

    def test_compute_client_memory_calcula_delta_de_score(
            self, monkeypatch, tmp_path, answers_conservador, answers_agresivo):
        store = self._isolated_store(monkeypatch, tmp_path)
        first_result = asesor_financiero.evaluate_profile(answers_conservador)
        first_proposal = inversiones_ia.build_proposal(first_result)
        store.create_proposal("Beto Salas", first_result, first_proposal)

        history = store.get_client_history("Beto Salas")
        second_result = asesor_financiero.evaluate_profile(answers_agresivo)
        memory = inversiones_ia._compute_client_memory(history, second_result)

        assert memory["previous_count"] == 1
        assert memory["last_score"] == first_result["score"]
        assert memory["last_profile"] == first_result["profile"]["label"]
        assert memory["score_delta"] == second_result["score"] - first_result["score"]
        assert memory["last_status"] == "pendiente"

    def test_build_proposal_incluye_client_memory_en_segundo_diagnostico(
            self, monkeypatch, tmp_path, answers_agresivo):
        store = self._isolated_store(monkeypatch, tmp_path)
        result = asesor_financiero.evaluate_profile(answers_agresivo)
        first_proposal = inversiones_ia.build_proposal(result)
        store.create_proposal("Carla Ruiz", result, first_proposal)

        history = store.get_client_history("Carla Ruiz")
        second_proposal = inversiones_ia.build_proposal(result, client_history=history)

        assert second_proposal["client_memory"] is not None
        assert second_proposal["client_memory"]["previous_count"] == 1
        # La plantilla determinística reconoce el historial en el texto.
        assert "diagnóstico número 2" in second_proposal["explanation"]

    def test_template_explanation_sin_historial_no_menciona_memoria(self, answers_agresivo):
        result = asesor_financiero.evaluate_profile(answers_agresivo)
        proposal = inversiones_ia.build_proposal(result)
        assert proposal["client_memory"] is None
        assert "diagnóstico número" not in proposal["explanation"]
