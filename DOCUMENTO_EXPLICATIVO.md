# InvertIA — Documento Explicativo Técnico

## Hackathon Agentic Scale · Ecuador Tech Week 2026 · Club TAWS · ESPOL

**Track asignado:** Track 3 — Robo-Advisory y Automatización  
**Equipo:** Club TAWS  
**Reto del patrocinador:** Best Use of DeepSeek

---

## 1. Diagrama de Arquitectura

### 1.1 Arquitectura general del sistema

```mermaid
flowchart TB
    subgraph CANALES["Canales de entrada"]
        WEB["🌐 Web App<br/>Next.js + React 18"]
        FUTURE_MOBILE["📱 App Móvil<br/>(futuro)"]
        FUTURE_WA["💬 WhatsApp<br/>(futuro)"]
    end

    subgraph API["FastAPI REST API"]
        direction TB
        EP_Q["/api/questionnaire"]
        EP_P["/api/proposals"]
        EP_D["/api/proposals/:id/decision"]
        EP_M["/api/market"]
        EP_N["/api/news"]
        EP_AI["/api/ai-insight"]
        EP_A["/api/audit"]
    end

    subgraph AGENTES["Agentes IA"]
        direction TB
        AG1["🤖 Asesor Financiero IA<br/>Motor de reglas versionado<br/>(profile_rules_v1.json)"]
        AG2["🤖 Inversiones IA<br/>Catálogo aprobado + métricas<br/>determinísticas + capa narrativa"]
    end

    subgraph LLM["Capa Narrativa"]
        GEMINI["☁️ DeepSeek API<br/>deepseek-v4-flash"]
        FALLBACK["📄 Plantilla<br/>Determinística"]
    end

    subgraph DATOS["Fuentes de Datos Externas"]
        YAHOO["📈 Yahoo Finance<br/>Cotizaciones en vivo"]
        RSS["📰 RSS Feeds<br/>Reuters · Yahoo · MarketWatch"]
    end

    subgraph VERIFICACION["Sistema Anti-Alucinación"]
        V1["Verificador de salida<br/>números % · promesas · tickers"]
        V2["Fallback automático"]
    end

    subgraph HITL["Human-in-the-Loop"]
        ASESOR["👨‍💼 Asesor Humano<br/>Aprueba · Edita · Rechaza"]
        AUDIT["📋 Registro de Auditoría<br/>Inmutable con trazabilidad"]
    end

    WEB --> API
    FUTURE_MOBILE -.-> API
    FUTURE_WA -.-> API

    EP_Q --> AG1
    EP_P --> AG1
    AG1 --> AG2
    EP_D --> HITL

    AG2 --> GEMINI
    GEMINI --> V1
    V1 -->|válido| AG2
    V1 -->|rechazado| V2
    V2 --> FALLBACK
    FALLBACK --> AG2

    EP_M --> YAHOO
    EP_N --> RSS
    EP_AI --> AG2

    ASESOR --> AUDIT
    AG2 --> AUDIT
```

### 1.2 Flujo de datos completo (secuencial)

```mermaid
sequenceDiagram
    participant C as 👤 Cliente
    participant F as 🌐 Frontend
    participant B as ⚙️ Backend (FastAPI)
    participant A1 as 🤖 Asesor Financiero IA
    participant A2 as 🤖 Inversiones IA
    participant G as ☁️ DeepSeek
    participant H as 👨‍💼 Asesor Humano

    C->>F: Completa 6 preguntas + meta financiera
    F->>B: POST /api/proposals
    B->>A1: evaluate_profile(answers)
    A1-->>B: score 0-100 + perfil + knockouts

    B->>A2: build_proposal(profile, goal, market, news)
    A2->>A2: Asignación ETFs (catálogo aprobado)
    A2->>A2: Métricas determinísticas
    A2->>G: Prompt con métricas pre-calculadas
    G-->>A2: Texto narrativo
    A2->>A2: Verificador anti-alucinación
    alt Texto válido
        A2-->>B: Propuesta con narrativa DeepSeek
    else Texto rechazado
        A2-->>B: Propuesta con plantilla determinística
    end

    B-->>F: Propuesta estado="pendiente"
    F-->>C: Visualización de propuesta explicable

    H->>F: Revisa propuesta
    F->>B: POST /api/proposals/:id/decision
    B->>B: Validación de diversificación §3.4
    B->>B: Registro de auditoría inmutable
    B-->>F: Propuesta actualizada
```

### 1.3 Pipeline de análisis de mercado

```mermaid
flowchart LR
    subgraph INPUT["Fuentes"]
        Y["Yahoo Finance<br/>8 ETFs en paralelo"]
        R["RSS Feeds<br/>Reuters · Yahoo · MW"]
    end

    subgraph PROCESS["Procesamiento"]
        QP["Cotizaciones<br/>(ThreadPoolExecutor<br/>budget 5s)"]
        NLP["Clasificador<br/>de temas"]
        SENT["Análisis de<br/>sentimiento"]
    end

    subgraph OUTPUT["Salida"]
        ALERT["Alertas<br/>contextuales"]
        ADJ["Sugerencias<br/>de ajuste"]
        TIPS["Principios de<br/>inversión"]
        MOOD["Estado del<br/>mercado"]
    end

    Y --> QP
    R --> NLP
    R --> SENT
    QP --> ALERT
    NLP --> ALERT
    SENT --> MOOD
    ALERT --> ADJ
    NLP --> TIPS
```

---

## 2. Track Asignado

**Track 3 — Robo-Advisory financiero con IA**

InvertIA es un sistema de asesoramiento de inversiones con **dos agentes IA especializados**
y **supervisión humana obligatoria** (Human-in-the-Loop), diseñado para cumplir con los
principios de reguladores financieros internacionales:

| Principio regulatorio | Norma de referencia | Implementación en InvertIA |
|---|---|---|
| Suitability assessment documentado | FINRA Rule 2111, MiFID II Art. 25 | 6 preguntas con pesos, score 0-100, knockouts |
| Transparencia del cálculo | SEPS Ecuador, Reg BI | Fórmula pública, reglas versionadas, breakdown visible |
| Responsabilidad humana | MiFID II, normativa SEPS/SBS | Asesor humano aprueba/rechaza antes de entregar |
| Auditoría completa | FINRA, SOX, MiFID II | Registro inmutable: fecha + responsable + reglas |
| No ejecución automática | Principio prudencial | El sistema NO ejecuta órdenes ni promete rentabilidad |

---

## 3. Tipo de Negocio al que Aplica

### Aplicación primaria: Cooperativas de Ahorro y Crédito (COAC) — Ecuador

Ecuador tiene más de **500 cooperativas** reguladas por la SEPS. La mayoría carecen de:

- Herramientas digitales de perfilamiento de riesgo
- Procesos estructurados de suitability assessment
- Propuestas de inversión explicables para sus socios

**InvertIA resuelve exactamente este problema**: permite a una COAC ofrecer un proceso
de asesoramiento de inversión profesional sin necesitar un equipo de analistas dedicado,
manteniendo el asesor humano como responsable final (cumplimiento regulatorio SEPS/SBS).

### Aplicaciones secundarias

| Sector | Caso de uso |
|---|---|
| **Bancos privados** | Departamentos de banca privada para clientes de segmento medio |
| **Casas de valores** | Automatización del proceso de suitability antes de recomendar ETFs/fondos |
| **Fintech de ahorro** | Apps como Kushki, Pichincha Digital, Produbanco Digital |
| **Aseguradoras** | Perfilamiento de riesgo para productos de inversión vinculados a seguros |

---

## 4. Explicación Técnica y Workflow

### 4.1 Arquitectura "Deterministic Core + Narrative Layer"

El diseño se basa en una premisa fundamental: **el LLM solo redacta, nunca calcula**.

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DETERMINÍSTICA                       │
│  Score = 100 × Σ(peso × (puntos - 1) / 3) / Σ(pesos)      │
│  Asignación = portafolio_modelo[perfil_id]                  │
│  Métricas = Σ(peso_i × retorno_i), Σ(peso_i × vol_i)       │
│  Goal Fit = (meta - invertido) / invertido / años × 100     │
│  Diversificación = ≥3 clases, ningún instrumento >50%       │
├─────────────────────────────────────────────────────────────┤
│                    CAPA NARRATIVA (DeepSeek)                   │
│  Input: métricas PRE-CALCULADAS inyectadas en el prompt     │
│  Output: texto narrativo en español claro                   │
│  Verificación: anti-alucinación → fallback si falla         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Flujo de datos completo: del perfilamiento a la revisión del asesor

**Paso 1 — Perfilamiento del cliente**
1. El cliente responde 6 preguntas calibradas (objetivo, horizonte, reacción ante caídas, experiencia, estabilidad de ingresos, fondo de emergencia).
2. Cada pregunta tiene un peso (%) y puntos (1-4) públicos y versionados.
3. El **Agente Asesor Financiero IA** calcula el score (0-100) con la fórmula determinística.
4. Knockouts: reglas de protección que limitan el perfil máximo (ej. horizonte corto → máximo conservador).
5. El cliente puede definir una meta financiera personalizada (monto, plazo, aporte mensual).

**Paso 2 — Generación de la propuesta explicable**
1. El **Agente Inversiones IA** selecciona el portafolio modelo del catálogo aprobado (8 ETFs reales).
2. Calcula métricas agregadas: retorno esperado, volatilidad, nivel de riesgo, diversificación.
3. Calcula el goal_fit: brecha entre la meta del cliente y el rendimiento del portafolio.
4. Solicita a **DeepSeek** una explicación narrativa con las métricas pre-calculadas.
5. El verificador anti-alucinación valida la salida (números %, promesas, tickers fuera del catálogo).
6. Si el LLM falla o alucina → fallback a plantilla determinística (la demo nunca se rompe).

**Paso 3 — Alineación con el mercado**
1. Cotizaciones en vivo de Yahoo Finance (8 ETFs en paralelo, presupuesto de 5s).
2. Noticias financieras de RSS (Reuters, Yahoo, MarketWatch) con análisis de sentimiento.
3. El Análisis IA combina: alertas contextuales, sugerencias de ajuste, principios de inversión de grandes inversores (Buffett, Dalio, Graham, Lynch, Bogle).
4. Todo es informativo: ningún ajuste se ejecuta automáticamente.

**Paso 4 — Revisión del asesor humano (Human-in-the-Loop)**
1. La propuesta queda en estado "pendiente" hasta que un asesor la revise.
2. El asesor puede: **aprobar**, **editar** (con validación de diversificación §3.4), o **rechazar** (con motivo obligatorio).
3. Cada decisión se registra en el log de auditoría inmutable con: fecha, responsable, versión de reglas, detalle.

### 4.3 Integración con sistemas empresariales existentes

```mermaid
flowchart TB
    subgraph FASE1["Fase 1 — Microservicio (0-3 meses)"]
        CORE1["Core Bancario<br/>(Fiserv / Temenos / T24)"]
        INV1["InvertIA Backend<br/>REST API + OAuth2/JWT"]
        CRM["Webhook → CRM<br/>(Salesforce / HubSpot)"]
        CORE1 -->|"REST API"| INV1
        INV1 -->|"Notificación"| CRM
    end

    subgraph FASE2["Fase 2 — Integración profunda (3-6 meses)"]
        SSO["Single Sign-On<br/>credenciales bancarias"]
        PREFILL["Datos pre-llenados<br/>del perfil bancario"]
        INVEST["Módulo de inversiones<br/>instrucción automática"]
        XBRL["Reporting regulatorio<br/>XBRL / SRI → SEPS/SBS"]
    end

    subgraph FASE3["Fase 3 — Escala multicanal (6-12 meses)"]
        WA["WhatsApp Business<br/>chatbot de perfilamiento"]
        MOVIL["App móvil nativa<br/>push notifications"]
        BVQ["BVQ / BVC<br/>precios locales en vivo"]
    end
```

**Cambios mínimos al sistema existente (Fase 1):**
- Endpoint en el core para validar datos del cliente
- Webhook para notificar al asesor asignado cuando llega una propuesta
- Generación de PDF firmado con DocuSign/Adobe Sign

---

## 5. Arquitectura Anti-Alucinación

Este es el diferenciador técnico más importante del proyecto. El sistema implementa **6 capas de protección**:

| # | Capa | Mecanismo | Qué previene |
|---|---|---|---|
| 1 | **Núcleo determinístico** | Score calculado con fórmula matemática en JSON | LLM calculando scores incorrectos |
| 2 | **RAG contextual** | Métricas pre-calculadas inyectadas en el prompt | LLM inventando porcentajes |
| 3 | **Verificador de salida** | Regex detecta números % fuera de métricas | LLM alucinando cifras en la narrativa |
| 4 | **Validador de tickers** | Solo acepta tickers del catálogo aprobado | LLM inventando instrumentos |
| 5 | **Fallback automático** | Plantilla determinística si LLM falla | Demo nunca se rompe |
| 6 | **HITL gate** | Asesor humano revisa y firma | Propuesta incorrecta llegando al cliente |

Adicionalmente:
- **Auditoría de eventos anti-alucinación**: cada rechazo del verificador se persiste como evento estructurado (`guardrail_events`) con timestamp, agente, razón y fragmento del texto rechazado.
- **Logs del servidor**: el logger `invertia.antialucinacion` registra cada rechazo para trazabilidad operativa.

---

## 6. Uso de DeepSeek (Reto del Patrocinador)

InvertIA utiliza **DeepSeek** (`deepseek-v4-flash`, el modelo más económico de la API,
configurable con `DEEPSEEK_MODEL`) como su único motor de lenguaje natural:

| Punto de integración | Descripción |
|---|---|
| `_call_deepseek()` | Gateway único al API REST de DeepSeek (chat completions) |
| Explicación de propuesta | DeepSeek redacta la explicación del portafolio en español claro, basada solo en las cifras ya calculadas |
| Contexto de mercado | DeepSeek narra cómo las noticias y tendencias de HOY se alinean con la propuesta — el prompt exige mencionar explícitamente un ticker o tema real de los datos provistos, prohíbe opinión genérica y prohíbe usar conocimiento de mercado externo a los datos entregados |
| Resiliencia | Timeout de 10s, hasta 2 reintentos ante errores transitorios (429, 5xx) |
| Fallback | Si DeepSeek falla → plantilla determinística sin degradar la experiencia |
| Trazabilidad | `explanation_source` indica si el texto fue generado por DeepSeek o por la plantilla |
| Costo | `max_tokens` recortado por prompt (220–280) y modelo flash — pensado para operar con presupuesto de API mínimo |

**Principio clave:** DeepSeek solo narra sobre datos y señales de mercado/noticias ya
computados determinísticamente. Nunca calcula, nunca cambia pesos, nunca inventa
tickers, y nunca ve la memoria del cliente (§11) — esa sigue siendo 100% determinística.

---

## 7. Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js 15 + React 18 | SSR, routing, WCAG 2.1 AA |
| Backend | FastAPI + Python 3.13+ | Async, tipado, OpenAPI auto-generado |
| Agente narrativo | DeepSeek (`deepseek-v4-flash`) | Reto del patrocinador + costo mínimo + fallback determinístico |
| Datos de mercado | Yahoo Finance (sin API key) | Demo sin costo, paralelo con ThreadPoolExecutor |
| Noticias | RSS Reuters + Yahoo + MarketWatch | Sin API key, mock offline para e2e |
| Tests backend | Pytest (52 tests) | Scoring, knockouts, anti-alucinación, DeepSeek mock, memoria |
| Tests e2e | Playwright (14 specs) | Flujos completos de usuario |
| Accesibilidad | WCAG 2.1 AA | Skip-link, aria-live, focus-visible, contraste ≥ 4.5:1 |
| Almacenamiento | JSON + threading.Lock | Cero setup; intercambiable por Postgres |
| CSS | Tailwind CSS + CSS custom | Diseño responsive mobile-first |

---

## 8. Evidencia de Pruebas

### Tests automatizados — Nivel Intermedio (unitarios + nodos + mocks del LLM)

**Backend (pytest):** `backend/tests/test_agents.py` — 52 tests en 10 clases:

| Clase | Tests | Qué valida |
|---|---|---|
| `TestScoringDeterministico` | 8 | Motor de reglas: rango, reproducibilidad, errores, versión |
| `TestKnockouts` | 3 | Reglas de tope: horizonte, emergencia, sin knockout |
| `TestPropuesta` | 5 | Disclaimer, suma 100%, métricas, catálogo, no inventa números |
| `TestAntiAlucinacion` | 5 | Verificador: números inventados, promesas, texto vacío |
| `TestHITLGate` | 1 | Estado "pendiente" al crear propuesta |
| `TestDiversificacion` | 6 | §3.4: ≥3 clases, <50%, exemption conservador |
| `TestDeepSeek` | 6 | Llamada feliz, sin key, error de red, alucinación, market context |
| `TestDeepSeekCasosBorde` | 4 | Sin candidates, bloqueado, JSON inválido, texto vacío |
| `TestAuditoriaAntialucinacion` | 3 | Eventos de rechazo, tickers inventados, persistencia |
| `TestMemoriaCliente` | 6 | Historial por cliente (case/espacio-insensitive), delta de score determinístico, `client_memory` nunca llega al prompt del LLM |

```bash
cd backend && python -m pytest tests/test_agents.py -v
```

**Frontend E2E (Playwright):** `frontend/e2e/` — 14 specs:

| Spec | Qué valida |
|---|---|
| `landing.spec.js` | Landing precede al cuestionario; un caso de uso pre-rellena la primera respuesta |
| `field-guide.spec.js` | Flecha de guía por campo; validación de nombre con regex |
| `perfil.spec.js` | Cuestionario completo y cálculo de perfil |
| `knockout.spec.js` | Regla de tope por horizonte corto |
| `meta-financiera.spec.js` | Meta financiera como comparación estructurada, sin afirmaciones inventadas |
| `memoria.spec.js` | Memoria del cliente: 2º diagnóstico del mismo cliente muestra su historial |
| `asesor-aprueba.spec.js` | Aprobación auditada |
| `asesor-valida.spec.js` | Validaciones de rechazo/edición |
| `diversificacion.spec.js` | Backend rechaza edición que concentra >50% en un instrumento (§3.4) |
| `portafolios.spec.js` | Comparación de portafolios |
| `reglas.spec.js` | Reglas visibles y versionadas |
| `analisis-ia.spec.js` | Panel de análisis IA |
| `role-switch.spec.js` | Cada rol oculta por completo las pestañas del otro |
| `role-switch-visibility.spec.js` | Cambio de rol navega a la vista correcta ("Cambiando rol…") |

```bash
cd frontend && npx playwright install chromium && npm run test:e2e
```

### Mocks de la API del LLM

`TestDeepSeek` y `TestDeepSeekCasosBorde` parchean `inversiones_ia._call_deepseek` (vía
`monkeypatch`) para simular respuesta feliz, ausencia de key, error de red, salida
alucinada y payload malformado — los 52 tests corren **sin red y sin depender de la
disponibilidad de DeepSeek**, cumpliendo el nivel "mocks de la API del LLM" del criterio
de evaluación.

---

## 9. Historias de Usuario del Track

| HU | Criterio | Estado |
|---|---|---|
| HU1 | Cuestionario con reglas visibles y versionadas | ✅ Completo |
| HU1 | Transparencia de cómo influye cada respuesta (breakdown) | ✅ Completo |
| HU2 | Propuesta explicable: catálogo + % asignación + riesgo | ✅ Completo |
| HU2 | No ejecuta órdenes + disclaimer anti-promesa | ✅ Completo |
| HU2 | Goal fit: meta del cliente vs. rendimiento del portafolio | ✅ Completo |
| HU3 | Panel asesor: aprobar / editar / rechazar | ✅ Completo |
| HU3 | Validación de diversificación §3.4 en ediciones | ✅ Completo |
| HU3 | Auditoría con fecha, responsable, versión de reglas | ✅ Completo |
| Extra | Memoria del cliente entre diagnósticos (continuidad, sin depender del LLM) | ✅ Completo |
| Extra | Análisis IA: noticias + mercado + alertas contextuales | ✅ Completo |
| Extra | Anti-alucinación: verificador + auditoría de rechazos | ✅ Completo |
| Extra | DeepSeek con retry, timeout y fallback | ✅ Completo |
| Extra | WCAG 2.1 AA — accesibilidad | ✅ Completo |
| Extra | Responsividad mobile/tablet | ✅ Completo |

---

## 10. Accesibilidad (WCAG 2.1 AA)

| Criterio WCAG | Implementación |
|---|---|
| 2.4.1 Skip link | `<a class="skip-link" href="#main-content">` |
| 4.1.3 Status messages | `aria-live="polite"` en skeletons y estados |
| 2.4.7 Focus visible | `:focus-visible` con anillo verde en todos los interactivos |
| 1.4.3 Contraste mínimo | Todos los textos ≥ 4.5:1 contra su fondo |
| 1.3.1 Info and relationships | Roles semánticos: `tablist`, `tab`, `region`, `navigation` |
| 2.1.1 Keyboard accessible | Todos los controles operables con teclado |
| 2.4.6 Headings and labels | Jerarquía h1→h4 semántica en todas las vistas |
| 2.3.1 Three flashes | `prefers-reduced-motion: reduce` desactiva animaciones |

---

## 11. Mapeo Explícito a Criterios de Evaluación del Hackathon

### 1 · Viabilidad Técnica / Arquitectura Agéntica

- **Lógica separada de la interfaz**: núcleo determinístico en `backend/` (FastAPI, sin
  UI) consumido por `frontend/` (Next.js) vía REST — cero lógica de negocio en
  componentes React. Ver diagrama §1 y flujo §4.
- **Continuidad de la conversación**: memoria del cliente entre diagnósticos
  (`store.get_client_history` → `inversiones_ia._compute_client_memory`), mostrada en
  `ClientMemoryCard` tanto al cliente como al asesor. El agente no repite el flujo desde
  cero si ya conoce al cliente. Cubierto por `TestMemoriaCliente` (6 tests) y
  `e2e/memoria.spec.js`.
- **Confiabilidad verificable**: todo cálculo financiero (score, asignación, métricas,
  delta de memoria) es 100% determinístico y reproducible — el LLM solo redacta texto,
  nunca decide números (§5). 52 tests de backend + 14 specs e2e, ver §8.

### 2 · Impacto / Ajuste al Track

- Resuelve el problema real de Track 3 (robo-advisory): perfilamiento → propuesta
  explicable → revisión humana obligatoria antes de cualquier recomendación, sin
  ejecutar órdenes. Ver §2 (Track Asignado) y §3 (Tipo de Negocio — contexto financiero
  y regulatorio local, ej. COAC/cooperativas en Ecuador).
- Viabilidad comercial: catálogo de ETFs reales, cotizaciones en vivo sin costo (Yahoo
  Finance), cero dependencia de infraestructura de pago para operar la demo.

### 3 · Mitigación de Riesgos / Antialucinación

- El LLM (DeepSeek) nunca genera cifras: redacta narrativa sobre datos ya calculados y
  pasa por `_verify_llm_output`, que rechaza texto vacío, lenguaje de promesa
  ("garantiza", "asegura"...) y cualquier porcentaje que no esté en la lista blanca de
  métricas ya computadas (§5).
- Cada rechazo del verificador queda auditado (`antialucinacion_rechazo` en
  `/api/audit`) — trazabilidad completa de cuándo el sistema descartó una salida del
  LLM, en vez de dejarla pasar silenciosamente.
- La memoria del cliente (nueva) refuerza esto por diseño: `client_memory` se calcula
  100% desde el store y **nunca se pasa al prompt del LLM** — no puede inventarse ni
  distorsionarse (`_explain`/`_template_explanation` en `inversiones_ia.py`).
- Precisión de dominio: catálogo cerrado de instrumentos reales (v2, 8 ETFs), reglas de
  diversificación §3.4 re-validadas server-side incluso si el cliente HTTP las evade.

### 4 · Demo y Experiencia de Usuario

- Flujo de demo lineal y documentado en el README (`## Flujo de demo`): landing →
  cuestionario → propuesta → panel asesor → auditoría → reglas.
- Separación total de navegación por rol (cliente vs. asesor) para que la demo no mezcle
  vistas que no corresponden a cada actor (`e2e/role-switch.spec.js`,
  `role-switch-visibility.spec.js`).
- Cada pantalla refleja capacidad real del sistema, no solo apariencia: los números que
  se muestran (score, retorno esperado, volatilidad, memoria del cliente) son los mismos
  que verifican los tests — no hay datos de attrezzo en la UI de demo.

### Evidencia de Pruebas Automatizadas — Nivel alcanzado

Este proyecto cumple el nivel más alto de los descritos en el criterio:

- ✅ **MÍNIMO**: este README documenta cómo correr y qué cubre cada suite (§ "Pruebas de
  backend" / "Pruebas e2e" en README.md).
- ✅ **NIVEL BÁSICO**: `backend/tests/` con `test_agents.py` corrible por `pytest`,
  incluye pruebas que confirman que el agente responde de forma coherente
  (`TestPropuesta`, `TestAntiAlucinacion`).
- ✅ **Nivel avanzado**: tests unitarios de funciones críticas (scoring, diversificación,
  memoria), tests de nodos individuales del flujo de agentes (perfilamiento →
  propuesta → decisión → auditoría), y **mocks de la API del LLM**
  (`TestDeepSeek`, `TestDeepSeekCasosBorde`) que permiten correr los 52 tests sin
  depender de la disponibilidad de DeepSeek. Ver §8 para el detalle completo por clase
  y por spec.
