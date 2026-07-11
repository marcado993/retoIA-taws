# Arquitectura IA — Robo-Advisor (Track 3)

## Patrón elegido: **Orquestador multi-agente con núcleo determinístico y humano-en-el-bucle (HITL)**

Es el patrón recomendado por la investigación reciente en agentes financieros
(Anthropic *Building Effective Agents*, 2024; encuestas de robo-advisory de FINRA/ESMA;
arquitecturas "compliance-first" de Betterment/Wealthfront): **el LLM razona y explica,
pero nunca decide solo**. Los cálculos regulados viven en motores de reglas versionados
y auditables, y toda acción sensible pasa por un gate de aprobación humana.

```
┌────────────────────────── FRONTEND (React + Vite) ──────────────────────────┐
│  Cliente: cuestionario → perfil transparente → propuesta explicable         │
│  Asesor: cola de revisión → aprobar / editar / rechazar → auditoría          │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │ REST (JSON)
┌──────────────────────────────────▼───────────────────────────────────────────┐
│                        BACKEND (FastAPI) — Orquestador                        │
│                                                                               │
│  ① AGENTE ASESOR FINANCIERO IA            ② AGENTE INVERSIONES IA             │
│  ┌─────────────────────────────┐          ┌─────────────────────────────────┐ │
│  │ Cuestionario dinámico       │          │ Constructor de portafolio       │ │
│  │ Motor de reglas VERSIONADO  │──perfil─▶│ (portafolios modelo + catálogo  │ │
│  │ (profile_rules_v1.json)     │          │  ficticio aprobado)             │ │
│  │ Scoring + knockouts         │          │ Capa narrativa: LLM opcional    │ │
│  │ Desglose por pregunta       │          │ con fallback determinístico     │ │
│  └─────────────────────────────┘          └───────────────┬─────────────────┘ │
│                                                           │ propuesta         │
│                                    ③ GATE HUMANO-EN-EL-BUCLE                  │
│                                    ┌──────────────────────▼────────────────┐  │
│                                    │ Estado: pendiente → aprobada /        │  │
│                                    │ aprobada_con_cambios / rechazada      │  │
│                                    │ Validaciones duras (suma 100%,        │  │
│                                    │ catálogo, motivo de rechazo)          │  │
│                                    └──────────────────────┬────────────────┘  │
│                                    ④ AUDITORÍA INMUTABLE  ▼                   │
│                                    fecha · responsable · versión de reglas   │
│                                    · versión de propuesta · notas            │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Decisiones de diseño y su justificación

| Decisión | Por qué (hallazgo de investigación) |
|---|---|
| **Reglas como datos versionados** (JSON con `version`) | Regulación (MiFID II / Reg BI) exige poder reconstruir *por qué* se asignó un perfil. Un LLM puro no es reproducible; un JSON versionado sí. |
| **LLM solo en la capa narrativa** | El patrón "deterministic core, generative shell" elimina alucinaciones numéricas: el modelo recibe las cifras ya calculadas y solo redacta. Con fallback a plantilla, la demo nunca depende de una API externa. |
| **Knockouts (reglas de tope)** | La literatura de suitability muestra que el puntaje promedio oculta riesgos: horizonte corto o falta de fondo de emergencia deben **capar** el perfil sin importar el score. |
| **HITL como gate, no como adorno** | El asesor humano es el responsable regulatorio final (Historia 3). El backend impide ejecutar nada: solo transiciones de estado con decisión firmada. |
| **Auditoría append-only** | Cada evento guarda versión de reglas + versión de propuesta + responsable + timestamp UTC: trazabilidad de extremo a extremo. |
| **Catálogo ficticio cerrado** | El agente no puede proponer instrumentos fuera del catálogo aprobado (validación en API), cumpliendo la condición de demo del hackathon. |
| **Backend/Frontend desacoplados** | REST simple permite cambiar el canal (web, WhatsApp, kiosco) sin tocar los agentes. |

## Flujo de extremo a extremo (demo)

1. **Cliente** completa el cuestionario (6 preguntas ponderadas).
2. **Asesor Financiero IA** calcula score 0–100, aplica knockouts y devuelve el
   **desglose por pregunta** (cuánto aportó cada respuesta) → transparencia total (HU1).
3. **Inversiones IA** toma el perfil, arma la asignación desde el portafolio modelo,
   calcula retorno esperado/volatilidad ponderados y redacta la explicación (HU2).
4. La propuesta queda **pendiente**. El **asesor humano** ve resumen de perfil +
   propuesta + justificación, y decide: aprobar / editar (nueva versión) / rechazar
   con motivo obligatorio (HU3).
5. Todo queda en el **log de auditoría** consultable desde la UI.

## Stack

- **Backend**: Python 3.13 + FastAPI. Sin base de datos externa (JSON persistente) para
  levantar en segundos; intercambiable por Postgres en producción.
- **IA**: Claude (Haiku) opcional vía `ANTHROPIC_API_KEY` para la explicación narrativa;
  fallback determinístico incluido.
- **Frontend**: React + Vite, diseño tipo dashboard fintech (referencia DisputeFox).
