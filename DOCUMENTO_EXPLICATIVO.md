# InvertIA — Documento Explicativo Técnico
## Hackathon Agentic Scale · Ecuador Tech Week 2026 · Club TAWS · ESPOL

---

## 1. Diagrama de Arquitectura

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║               InvertIA — Arquitectura Multi-Agente con HITL                     ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  CANALES EXTERNOS                    INTEGRACIONES                  AGENTES IA
  ─────────────────                  ──────────────                  ──────────
  🌐 Web (Next.js)  ─────────────▶  FastAPI REST API  ──────────▶  🤖 Asesor Financiero IA
  📱 [futuro] App móvil              /api/questionnaire              (motor de reglas versionado
  💬 [futuro] WhatsApp               /api/proposals                   profile_rules_v1.json)
  🏢 [futuro] Core bancario          /api/ai-insight                      │
                                     /api/news                            ▼
  DATOS EXTERNOS                          │                         🤖 Inversiones IA
  ─────────────────                       │                          (catálogo aprobado
  📈 Yahoo Finance API (cotizaciones)     │                           + métricas determinísticas
  📰 RSS Reuters / Yahoo Finance          │                           + capa narrativa LLM)
  🤖 Claude/Gemini API (opcional)         │                                │
                                          ▼                               ▼
                                   ════════════════             ③ GATE HUMANO-EN-EL-BUCLE
                                   Anti-Alucinación:            (asesor revisa y firma)
                                   • Núcleo determinístico              │
                                   • LLM solo redacta                   ▼
                                   • Verificador de output       ④ AUDITORÍA INMUTABLE
                                   • Fallback a plantilla         (fecha + responsable +
                                   ════════════════                versión de reglas)
```

### Flujo de datos completo

```
Cliente                 Frontend (Next.js)          Backend (FastAPI)
  │                           │                            │
  ├─ Completa 6 preguntas ──▶ POST /api/proposals ────────▶│
  │                           │                     ① Asesor IA evalúa
  │                           │                        score 0-100
  │                           │                        knockouts
  │                           │                     ② Inversiones IA
  │                           │                        asignación ETFs
  │                           │                        métricas
  │                           │                        ③ LLM redacta
  │                           │                           (verificado)
  │                           │◀── propuesta "pendiente" ─│
  │                           │
  │  (asesor humano)          │
  ├─ Revisa propuesta ──────▶ │
  ├─ Decide: aprobar/rechazar POST /api/proposals/{id}/decision
  │                           │────────────────────────────▶│
  │                           │                        ④ Auditoría
  │                           │◀── propuesta actualizada ──│
```

---

## 2. Track Asignado

**Track 3 — Robo-Advisory financiero con IA**

InvertIA es un sistema de asesoramiento de inversiones con dos agentes IA especializados
y supervisión humana obligatoria, diseñado para cumplir con los principios de los
reguladores financieros (MiFID II / Reg BI / normativa SEPS Ecuador) que exigen:

- **Suitability assessment** documentado y reproducible
- **Transparencia** en cómo se calcula el perfil del cliente
- **Responsabilidad humana** en la recomendación final
- **Auditoría** de cada decisión con trazabilidad completa

---

## 3. Tipo de Negocio

### Aplicación primaria: Cooperativas de Ahorro y Crédito (COAC) — Ecuador

Ecuador tiene más de **500 cooperativas** reguladas por la SEPS. La mayoría carecen de:
- Herramientas digitales de perfilamiento de riesgo
- Procesos estructurados de suitability assessment
- Propuestas de inversión explicables para sus socios

**InvertIA resuelve exactamente este problema**: permite a una COAC ofrecer un proceso
de asesoramiento de inversión profesional sin necesitar un equipo de analistas dedicado,
manteniendo el asesor humano como responsable final (cumplimiento regulatorio SEPS/SBS).

### Aplicaciones secundarias
- **Bancos privados**: departamentos de banca privada para clientes de segmento medio
- **Casas de valores**: automatización del proceso de suitability antes de recomendar ETFs/fondos
- **Fintech de ahorro**: apps como Kushki, Pichincha Digital, Produbanco Digital

---

## 4. Cómo se integraría a un sistema empresarial existente

### Fase 1 — Integración como microservicio (0-3 meses)
```
Core bancario (Fiserv / Temenos / T24)
        │
        ▼ REST API
InvertIA Backend ──── autenticación OAuth2/JWT
        │                    │
        ▼                    ▼
Base datos propia    Webhook → CRM (Salesforce/HubSpot)
(Postgres)           notifica al asesor asignado
```

**Cambios mínimos al sistema existente:**
- Agregar un endpoint en el core que InvertIA consulte para validar datos del cliente
- Configurar un webhook para notificar al asesor cuando llega una propuesta pendiente
- Generar el PDF de la propuesta firmada con la firma del asesor (DocuSign/Adobe Sign)

### Fase 2 — Integración profunda (3-6 meses)
- **Single Sign-On (SSO)**: el cliente se autentica con las credenciales bancarias
- **Datos pre-llenados**: el cuestionario se pre-rellena con datos del perfil bancario existente
- **Core de inversiones**: la propuesta aprobada genera automáticamente una instrucción
  de inversión en el módulo de inversiones del core (requiere aprobación final del asesor
  en el sistema bancario, no solo en InvertIA)
- **Reporting regulatorio**: los datos de auditoría se exportan en formato XBRL/SRI para
  reportes a la SEPS/SBS

### Fase 3 — Escala multicanal (6-12 meses)
- **WhatsApp Business**: el cuestionario de perfilamiento vía chatbot
- **App móvil**: experiencia nativa con notificaciones push para el asesor
- **Integración con mercado de valores BVQ/BVC**: precio en tiempo real de valores locales

---

## 5. Arquitectura Anti-Alucinación (por qué el sistema no inventa datos)

Este es el diferenciador técnico más importante del proyecto:

| Capa | Mecanismo | Qué previene |
|---|---|---|
| **1. Núcleo determinístico** | Score calculado con fórmula matemática en JSON | LLM calculando scores incorrectos |
| **2. RAG contextual** | Métricas pre-calculadas inyectadas en el prompt | LLM inventando porcentajes |
| **3. Verificador de salida** | Regex detecta números % fuera de métricas | LLM alucinando en la narrativa |
| **4. Fallback automático** | Plantilla determinística si LLM falla | Demo nunca se rompe |
| **5. HITL gate** | Asesor humano revisa y firma | Propuesta incorrecta llegando al cliente |
| **6. Auditoría** | Log inmutable de decisiones | Disputas, responsabilidades |

**El LLM solo redacta texto narrativo.** Jamás calcula ni propone cifras por su cuenta.

---

## 6. Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js 16 + React 18 | App Router, SSR, WCAG 2.1 AA |
| Backend | FastAPI + Python 3.13 | Async, tipado, OpenAPI auto-generado |
| Agente narrativo | Claude Haiku (Anthropic) / Gemini | Con fallback sin API key |
| Datos de mercado | Yahoo Finance RSS (sin key) | Demo sin costo |
| Noticias | RSS Reuters + Yahoo Finance | Sin API key, mock offline |
| Tests | Pytest (backend) + Playwright (e2e) | Nivel intermedio |
| Accesibilidad | WCAG 2.1 AA | 13 criterios: skip-link, aria-live, focus, contraste |
| Almacenamiento | JSON + threading.Lock | Cero setup; intercambiable por Postgres |

---

## 7. Evidencia de Pruebas

### Tests automatizados — Nivel Intermedio

**Backend (pytest):** `backend/tests/test_agents.py`
- `TestScoringDeterministico` — 7 tests del motor de reglas (score, reproducibilidad, errores)
- `TestKnockouts` — 3 tests de reglas de tope (horizonte, fondo de emergencia)
- `TestPropuesta` — 4 tests de propuesta (disclaimer, suma 100%, métricas, catálogo)
- `TestAntiAlucinacion` — 5 tests del verificador LLM (números inventados, promesas)
- `TestHITLGate` — 1 test de estado "pendiente" al crear propuesta

```bash
cd backend
pip install pytest
python -m pytest tests/test_agents.py -v
```

**Frontend E2E (Playwright):** `frontend/e2e/` — 7 specs
- `perfil.spec.js` — cuestionario completo y cálculo de perfil
- `knockout.spec.js` — regla de tope por horizonte corto
- `asesor-aprueba.spec.js` — aprobación auditada
- `asesor-valida.spec.js` — validaciones de rechazo/edición
- `landing.spec.js` — landing page y navegación
- `portafolios.spec.js` — comparación de portafolios
- `reglas.spec.js` — reglas visibles

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

---

## 8. Historias de Usuario del Track

| HU | Criterio | Estado |
|---|---|---|
| HU1 | Cuestionario con reglas visibles y versionadas | ✅ Completo |
| HU1 | Transparencia de cómo influye cada respuesta (breakdown) | ✅ Completo |
| HU2 | Propuesta explicable: catálogo + % asignación + riesgo | ✅ Completo |
| HU2 | No ejecuta órdenes + disclaimer anti-promesa | ✅ Completo |
| HU3 | Panel asesor: aprobar / editar / rechazar | ✅ Completo |
| HU3 | Auditoría con fecha, responsable, versión de reglas | ✅ Completo |
| Extra | Panel IA: noticias + mercado + alertas contextuales | ✅ Completo |
| Extra | WCAG 2.1 AA — accesibilidad completa | ✅ Completo |
