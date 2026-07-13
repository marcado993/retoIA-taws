# InvertIA — Robo-Advisor con IA (Track 3)

Robo-advisory con dos agentes IA y **asesor humano como responsable final** (human-in-the-loop).
Analizador IA de noticias financieras + mercado en tiempo real para alertas contextuales.
**Memoria del cliente**: si vuelve a diagnosticarse, el agente recuerda su historial
(cifras leídas del store, nunca generadas por el LLM — continuidad sin alucinación).
**Borrador y confirmación**: la propuesta nace como vista previa del cliente — puede
regenerarla con los mismos datos las veces que quiera y solo al confirmar "esta es la
que quiero" se envía a la cola del asesor. Opera bajo el **marco legal ecuatoriano**
(Ley de Mercado de Valores / COMYF, LOEPS — ver `REGLAS.md` §0), indicado de forma
explícita en cada prompt al LLM para reducir el sesgo hacia normativa extranjera.
Accesibilidad **WCAG 2.1 AA** completa.

- 📐 [ARCHITECTURE.md](ARCHITECTURE.md) — arquitectura multi-agente con núcleo determinístico.
- 📋 [REGLAS.md](REGLAS.md) — reglas versionadas para aprobar / editar / rechazar propuestas.
- 🎯 [HEURISTICAS.md](HEURISTICAS.md) — capa de heurísticas de Nielsen aplicada al sistema.
- 📄 [DOCUMENTO_EXPLICATIVO.md](DOCUMENTO_EXPLICATIVO.md) — arquitectura, track, negocio e integración empresarial.
  Incluye §11 con el **mapeo explícito a los criterios de evaluación del hackathon**
  (viabilidad técnica, impacto/track, antialucinación, demo, evidencia de pruebas).

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

Opcional: `set DEEPSEEK_API_KEY=...` para que **DeepSeek** redacte las explicaciones
y el contexto de mercado (modelo configurable con `DEEPSEEK_MODEL`, por defecto
`deepseek-v4-flash` — el más económico de la API, pensado para operar con presupuesto mínimo).
Sin key, usa la plantilla determinística con verificación anti-alucinación — la demo funciona igual.

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

**66 tests** en `backend/tests/test_agents.py`, agrupados por clase:

| Clase | Tests | Qué prueba |
|---|---|---|
| `TestScoringDeterministico` | 8 | El score nunca lo genera un LLM: rango 0-100, reproducibilidad, perfiles por rango, errores en respuestas inválidas/faltantes, versión de reglas presente |
| `TestKnockouts` | 3 | Las reglas de tope protegen al usuario aunque el score sea alto (horizonte corto, sin fondo de emergencia, sin knockout) |
| `TestPropuesta` | 5 | Las cifras de la propuesta vienen del catálogo, nunca del LLM: disclaimer presente, asignación suma 100%, métricas numéricas, instrumentos dentro del catálogo, la plantilla no inventa números |
| `TestReporteIdoneidad` | 2 | El PDF de idoneidad incluye los textos clave (cliente, reglas, disclaimer, asesor) y **exige que la propuesta ya tenga decisión humana** antes de generarse |
| `TestAntiAlucinacion` | 5 | El verificador de salida detecta y rechaza texto con cifras inventadas o lenguaje de promesa |
| `TestHITLGate` | 1 | Ninguna propuesta llega aprobada sin decisión explícita del asesor humano |
| `TestDiversificacion` | 6 | El backend hace cumplir §3.4 de REGLAS.md: ≥3 clases de activo, ningún instrumento >50% (con excepción para Conservador) |
| `TestDeepSeek` | 6 | Mock de la API de DeepSeek (camino feliz, sin key, error de red) — la demo no depende de su disponibilidad |
| `TestDeepSeekCasosBorde` | 4 | Respuestas raras de la API (sin candidates, JSON inválido, texto vacío) siempre caen a `None` y de ahí a la plantilla determinística |
| `TestAuditoriaAntialucinacion` | 3 | Cada rechazo del verificador queda como evidencia tangible: evento en la propuesta y entrada persistida en el log de auditoría |
| `TestAnalisisMercadoDeepSeek` | 5 | El resumen de la pestaña Diagnóstico de Riesgo tiene el mismo contrato anti-alucinación que el resto del sistema (verificador + fallback) |
| `TestMemoriaCliente` | 6 | El agente recuerda diagnósticos previos del mismo cliente por nombre — 100% determinístico, nunca pasa por el LLM |
| `TestBorradorConfirmarDescartar` | 6 | Flujo "Generar otra propuesta"/"Esta es la que quiero": un borrador no entra a la cola del asesor ni cuenta como memoria hasta confirmarse; descartar borra sin dejar rastro |
| `TestTendenciaHistoricaAntiAlucinacion` | 6 | La tendencia real del historial de cierres de Yahoo Finance (no solo el cambio de hoy) se calcula determinísticamente y se deja pasar por el verificador como cifra permitida |

### Pruebas e2e (Playwright)

```powershell
cd frontend
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

Playwright levanta solo ambos servidores (backend con BD temporal vía `ROBO_DB_PATH`,
así los tests no ensucian los datos de la demo). Los puertos 8000/3000 deben estar libres.

**16 specs** en `frontend/e2e/`:

| Spec | Qué prueba |
|---|---|
| `landing.spec.js` | La landing precede al cuestionario; un caso de uso pre-rellena la primera respuesta |
| `field-guide.spec.js` | La flecha de guía salta de campo en campo y valida el nombre con regex |
| `perfil.spec.js` | Perfil moderado con desglose por pregunta y propuesta que queda pendiente |
| `knockout.spec.js` | Perfil agresivo sin fondo de emergencia queda capado a Moderado |
| `meta-financiera.spec.js` | La meta financiera aparece como comparación estructurada, sin afirmaciones inventadas |
| `memoria.spec.js` | El agente recuerda a un cliente que ya se diagnosticó antes |
| `regenerar-propuesta.spec.js` | El cliente puede regenerar la propuesta (borrador) y solo la confirmada llega al asesor |
| `volver-al-inicio.spec.js` | El cliente vuelve a la landing sin perder su plan activo, y puede regresar a él |
| `asesor-aprueba.spec.js` | El asesor aprueba una propuesta y queda registrada en auditoría |
| `asesor-valida.spec.js` | El rechazo sin motivo se bloquea y la edición valida que la suma dé 100% |
| `diversificacion.spec.js` | El backend rechaza una edición que concentra más del 50% en un solo instrumento |
| `analisis-ia.spec.js` | La pestaña Análisis IA genera un reporte con propuesta, evidencia y modelo de IA |
| `portafolios.spec.js` | La pestaña Portafolios compara los 3 perfiles con datos reales del catálogo |
| `reglas.spec.js` | La pestaña Reglas muestra versión, fórmula y knockouts |
| `role-switch.spec.js` | Cada rol (cliente/asesor) oculta por completo las pestañas del otro |
| `role-switch-visibility.spec.js` | Cambiar de rol navega a la vista correcta y muestra "Cambiando rol…" |

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
