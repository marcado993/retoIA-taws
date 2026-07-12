"""API del Robo-Advisor — Track 3 Hackathon Agentes Financieros IA.

Orquesta los dos agentes (Asesor Financiero IA e Inversiones IA) y expone
el flujo humano-en-el-bucle: perfil -> propuesta -> revisión del asesor.
"""

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Carga backend/.env (DEEPSEEK_API_KEY, etc.) hacia os.environ. `override=False`
# respeta variables ya definidas por el entorno (p. ej. los e2e las fijan vacías
# para no llamar a la API real). Opcional: si no está python-dotenv, se ignora.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)
except Exception:
    pass

from app import market_data, news_scraper, store
from app.agents import asesor_financiero, inversiones_ia

app = FastAPI(title="Robo-Advisor IA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store.load()


class GoalRequest(BaseModel):
    target_amount: float = Field(gt=0)
    target_years: float = Field(gt=0)
    monthly_contrib: float = Field(ge=0)


class ProfileRequest(BaseModel):
    client_name: str = Field(min_length=1)
    answers: dict[str, str]
    goal: GoalRequest | None = None


class AllocationLine(BaseModel):
    ticker: str
    weight: float = Field(ge=0, le=100)


class DecisionRequest(BaseModel):
    action: str = Field(pattern="^(aprobar|rechazar|editar)$")
    advisor: str = Field(min_length=1)
    notes: str = ""
    edited_allocation: list[AllocationLine] | None = None


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/questionnaire")
def questionnaire():
    """HU1: cuestionario y reglas visibles/versionadas."""
    return asesor_financiero.get_questionnaire()


@app.get("/api/catalog")
def catalog():
    """HU2: catálogo aprobado de instrumentos (ETFs reales)."""
    return inversiones_ia.load_catalog()


@app.get("/api/market")
def market():
    """Cotizaciones del catálogo: Yahoo Finance en vivo con fallback diferido.
    Nunca falla: ante cualquier error usa lo cacheado o un payload vacío."""
    try:
        cat = inversiones_ia.load_catalog()
        return market_data.get_quotes_payload([i["ticker"] for i in cat["instruments"]])
    except Exception:
        logging.getLogger("invertia").exception("Fallo en /api/market")
        return market_data.get_cached_payload() or {"provider": "n/d", "live": False, "quotes": {}}


@app.post("/api/proposals")
def create_proposal(req: ProfileRequest):
    """HU1 + HU2: evalúa el perfil con reglas versionadas y genera la
    propuesta explicable. Queda 'pendiente' hasta la revisión del asesor."""
    try:
        profile_result = asesor_financiero.evaluate_profile(req.answers)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    goal = req.goal.model_dump() if req.goal else None
    # Contexto de mercado + noticias para alinear la propuesta. Se usa SOLO lo que ya
    # está en caché (no bloquea con red externa): los endpoints /api/market y /api/news
    # —que el frontend consulta al cargar— mantienen la caché caliente. Si está fría,
    # market/news son None y el market_context degrada con gracia (queda None).
    market = market_data.get_cached_payload()
    news = news_scraper.get_cached_news()
    # Memoria del agente: si este cliente ya se diagnosticó antes, el agente
    # lo recuerda — no repite el flujo desde cero (continuidad de la conversación).
    client_history = store.get_client_history(req.client_name)
    proposal = inversiones_ia.build_proposal(
        profile_result, goal=goal, market=market, news=news, client_history=client_history)
    return store.create_proposal(req.client_name, profile_result, proposal)


@app.get("/api/proposals")
def list_proposals():
    """HU3: cola de revisión del asesor."""
    return store.list_proposals()


@app.get("/api/proposals/{pid}")
def get_proposal(pid: str):
    record = store.get_proposal(pid)
    if record is None:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    return record


@app.post("/api/proposals/{pid}/decision")
def decide(pid: str, req: DecisionRequest):
    """HU3: el asesor aprueba, edita o rechaza. Toda decisión queda auditada
    con fecha, versión de reglas y responsable."""
    edited = None
    if req.action == "editar":
        if not req.edited_allocation:
            raise HTTPException(status_code=422, detail="La edición requiere una asignación")
        total = sum(l.weight for l in req.edited_allocation)
        if abs(total - 100) > 0.01:
            raise HTTPException(status_code=422, detail=f"La asignación debe sumar 100% (suma {total}%)")
        catalog = inversiones_ia.load_catalog()
        instruments = {i["ticker"]: i for i in catalog["instruments"]}
        unknown = [l.ticker for l in req.edited_allocation if l.ticker not in instruments]
        if unknown:
            raise HTTPException(status_code=422, detail=f"Instrumentos fuera del catálogo aprobado: {unknown}")
        edited = [{**instruments[l.ticker], "weight": l.weight} for l in req.edited_allocation if l.weight > 0]
        # REGLAS.md §3.4: diversificación mínima (≥3 clases y ningún instrumento >50%).
        record = store.get_proposal(pid)
        if record is None:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        profile_id = record["profile_result"]["profile"]["id"]
        ok, reason = inversiones_ia.validate_diversification(edited, profile_id)
        if not ok:
            raise HTTPException(status_code=422, detail=reason)
    if req.action == "rechazar" and not req.notes.strip():
        raise HTTPException(status_code=422, detail="El rechazo requiere un motivo en las notas")
    try:
        return store.decide(pid, req.action, req.advisor, req.notes, edited)
    except KeyError:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get("/api/audit")
def audit():
    """HU3: registro de auditoría completo."""
    return store.audit_log()


@app.get("/api/news")
def news():
    """Scrapper de noticias financieras (RSS en vivo + mock offline).
    Devuelve hasta 10 titulares con sentimiento (positivo/negativo/neutro)."""
    try:
        return {"items": news_scraper.get_news()}
    except Exception:
        logging.getLogger("invertia").exception("Fallo en /api/news")
        return {"items": news_scraper.get_cached_news() or []}


@app.get("/api/ai-insight")
def ai_insight(profile: str | None = None):
    """Análisis IA combinado: noticias + cotizaciones + perfil del cliente.
    Genera alertas contextuales y sugerencias de ajuste de portafolio.

    Resiliente: nunca responde 500. Si el scraping o el mercado fallan, usa lo
    cacheado (o mock/snapshot) para que la pestaña Análisis IA siempre cargue."""
    try:
        noticias = news_scraper.get_news()
    except Exception:
        noticias = news_scraper.get_cached_news() or []
    try:
        cat = inversiones_ia.load_catalog()
        market = market_data.get_quotes_payload([i["ticker"] for i in cat["instruments"]])
        quotes = market.get("quotes", {})
    except Exception:
        cached = market_data.get_cached_payload()
        quotes = cached.get("quotes", {}) if cached else {}
    try:
        result = news_scraper.build_ai_insight(profile, noticias, quotes)
    except Exception:
        logging.getLogger("invertia").exception("Fallo construyendo el insight de IA")
        # Último recurso: insight mínimo válido (sin alertas) para no romper la UI.
        result = news_scraper.build_ai_insight(profile, [], {})
    # G6 (mitigación de alucinaciones): si DeepSeek narró el resumen y el
    # verificador lo rechazó, deja evidencia en el mismo log de auditoría que
    # usan las propuestas — sin proposal_id porque este análisis no pertenece
    # a una propuesta concreta.
    for ev in result.get("guardrail_events", []):
        store.add_audit(
            "antialucinacion_rechazo",
            f"verificador:{ev.get('agent', 'anti-alucinacion')}",
            "analisis-mercado",
            "n/d",
            f"Salida del LLM descartada — {ev.get('reason', '')}. Fragmento: «{ev.get('snippet', '')}»",
        )
    return result
