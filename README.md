# InvertIA — Robo-Advisor con IA (Track 3)

Robo-advisory con dos agentes IA y **asesor humano como responsable final** (human-in-the-loop).
Analizador IA de noticias financieras + mercado en tiempo real para alertas contextuales.
Accesibilidad **WCAG 2.1 AA** completa.

- 📐 [ARCHITECTURE.md](ARCHITECTURE.md) — arquitectura multi-agente con núcleo determinístico.
- 📋 [REGLAS.md](REGLAS.md) — reglas versionadas para aprobar / editar / rechazar propuestas.
- 🎯 [HEURISTICAS.md](HEURISTICAS.md) — capa de heurísticas de Nielsen aplicada al sistema.
- 📄 [DOCUMENTO_EXPLICATIVO.md](DOCUMENTO_EXPLICATIVO.md) — arquitectura, track, negocio e integración empresarial.

Datos de mercado: cotizaciones en vivo de **Yahoo Finance** (sin API key) con caché de
5 minutos y fallback a snapshot diferido para demo sin conexión (`backend/app/market_data.py`).
Noticias: RSS Reuters + Yahoo Finance con análisis de sentimiento (`backend/app/news_scraper.py`).
Logos reales por ticker vía Parqet, con fallback a favicon del emisor.

La landing y la pestaña Portafolios están inspiradas en un reverse-engineering de
[betterment.com/investing](https://www.betterment.com/investing) (hero + 4 pilares de valor
+ casos de uso por objetivo + barra de confianza + comparación de portafolios + disclosures
multinivel), adaptado a hechos verificables del sistema en vez de métricas de negocio inventadas.

## Estructura

```
backend/   FastAPI · agentes (Asesor Financiero IA, Inversiones IA) · reglas versionadas · auditoría
           news_scraper.py · verificador anti-alucinación · tests/
frontend/  Next.js 16 · dashboard estilo fintech · Atomic Design · e2e Playwright · WCAG 2.1 AA
```

### Frontend — Atomic Design (5 niveles)

```
src/components/
  atoms/       Button · Chip · Input · FieldLabel · Logo · Avatar · ErrorText · EmptyText · IconTile
  molecules/   Gauge · Donut(sm/md) · StatCard · NavPills · StepItem · QuestionOption · InfluenceRow
               AllocationRow · MetricTile · QueueRow · StatusChip · KnockoutNote · DecisionNote
               AgentBubble · ProgressBar · InstrumentLogo · PillarCard · TrustStat · GoalCard
  organisms/   TopBar · StepsRow · QuestionnaireCard · BreakdownCard · ProposalCard · HeroPanel
               StatGrid · AdvisorQueue · AdvisorDetail · AuditTable · RulesCards · Treemap
               Hero · ValuePillars · TrustBar · GoalUseCases · PortfolioComparison · LegalFooter
  templates/   DashboardTemplate · SinglePanelTemplate · LandingTemplate
  pages/       DashboardPage · AdvisorPage · AuditPage · RulesPage · PortfoliosPage
src/App.jsx    estado global + fetch + routing de pestañas hacia pages
```

## Cómo correr

### Backend (puerto 8000)

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

Opcional: `set ANTHROPIC_API_KEY=...` para que Claude redacte las explicaciones
(sin key, usa la plantilla determinística con verificación anti-alucinación — la demo funciona igual).

### Frontend (puerto 3000)

```powershell
cd frontend
npm install
npm run dev
```

Abrir http://localhost:3000 (el proxy de Next.js envía `/api` al backend en el puerto 8000).

### Pruebas de backend (pytest)

```powershell
cd backend
pip install pytest
python -m pytest tests/test_agents.py -v
```

21 tests que cubren: scoring determinístico, knockouts de protección, propuesta de portafolio,
verificador anti-alucinación del LLM, y gate HITL de estado "pendiente".

### Pruebas e2e (Playwright)

```powershell
cd frontend
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

Playwright levanta solo ambos servidores (backend con BD temporal vía `ROBO_DB_PATH`,
así los tests no ensucian los datos de la demo). Los puertos 8000/3000 deben estar libres.
7 specs en `frontend/e2e/`: perfil transparente, knockout de protección, aprobación
auditada, validaciones de rechazo/edición, y reglas visibles.

## Flujo de demo (extremo a extremo)

1. **Dashboard** → completar las 6 preguntas → se calcula el perfil (score 0–100,
   reglas v1.0.0 visibles, knockouts de protección) y se genera la propuesta explicable.
2. Revisar el **desglose por pregunta** (cuánto influyó cada respuesta) y la asignación
   con retorno esperado, volatilidad y disclaimer.
3. **Panel Asesor** → seleccionar la propuesta → aprobar / editar (debe sumar 100%) /
   rechazar (motivo obligatorio).
4. **Auditoría** → cada decisión registrada con fecha, responsable, versión de reglas
   y versión de propuesta.
5. **Reglas** → fórmula, pesos, rangos de perfil y knockouts, todo visible.

## Historias de usuario cubiertas

| HU | Criterio | Dónde |
|---|---|---|
| 1 | Cuestionario de perfilamiento | Dashboard (agente Asesor Financiero IA) |
| 1 | Reglas visibles y versionadas | Pestaña Reglas + `profile_rules_v1.json` |
| 1 | Entender cómo influye cada respuesta | Tarjeta "Cómo influyó cada respuesta" |
| 2 | Catálogo aprobado | `catalog.json` v2 (8 ETFs reales: SPY, QQQ, AGG, BND, BIL, EFA, VNQ, GLD) |
| 2 | % asignación, riesgo y explicación | Treemap + tabla con logos y precios + explicación del agente |
| 2 | No ejecuta órdenes ni promete rentabilidad | Estado `pendiente` + disclaimer |
| 3 | Resumen de perfil + propuesta + justificación | Panel Asesor |
| 3 | Aprobar / editar / rechazar | Panel Asesor (validaciones duras) |
| 3 | Registro con fecha, versión de reglas y responsable | Pestaña Auditoría |
