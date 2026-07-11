# Capa de Heurísticas de Nielsen — InvertIA

Mapa de las 10 heurísticas de usabilidad (Nielsen, 1994) aplicadas al sistema,
con prioridad en la **HU1 (perfil transparente)**, que es la puerta de entrada del usuario.

| # | Heurística | Dónde se aplica |
|---|---|---|
| **H1** | **Visibilidad del estado del sistema** | Barra de progreso "Pregunta X de 6 · N respondidas" y puntos de avance en el cuestionario (`ProgressBar`, `q-dots`). Chips de estado de la propuesta (Pendiente/Aprobada/Rechazada). Fila de 3 pasos del flujo siempre visible. Fuente de datos de mercado con hora ("Yahoo Finance · en vivo" o "diferido"). Barra de confianza (`TrustBar`) con hechos verificables del sistema, no cifras de negocio inventadas. |
| **H2** | **Coincidencia con el mundo real** | Los agentes IA hablan en burbujas de chat con lenguaje llano (`AgentBubble`), sin jerga: "en un año malo podría caer ~X%". ETFs reales con logos de emisores reales (SPDR, iShares, Vanguard, Invesco) y precios de bolsa. Ayuda contextual por pregunta ("💡 El horizonte determina…"). Casos de uso por objetivo (`GoalUseCases`) con lenguaje de metas de vida ("Proteger tu capital", "Construir patrimonio") en vez de jerga financiera. |
| **H3** | **Control y libertad del usuario** | Pantalla de **revisión de respuestas** antes de calcular, con botón "Cambiar" por pregunta y "← Volver". Navegación libre entre preguntas con los puntos numerados. "← Nuevo diagnóstico" para empezar de cero. El asesor puede "Cancelar edición". |
| **H4** | **Consistencia y estándares** | Design system Atomic: un solo `Button`, `Chip`, `Input`, `StatusChip` en todo el sistema. Verde = positivo/aprobado, amarillo = pendiente, rojo = rechazo, en chips, precios y gauge. |
| **H5** | **Prevención de errores** | No se puede enviar el cuestionario incompleto ni sin nombre (botón deshabilitado con texto que dice qué falta). "Rechazar" deshabilitado hasta escribir el motivo. "Aprobar con cambios" deshabilitado si los pesos no suman 100% (con total en vivo). El backend re-valida todo (defensa en profundidad). |
| **H6** | **Reconocimiento antes que recuerdo** | La revisión muestra todas las respuestas elegidas con sus puntos y pesos — el usuario no debe recordarlas. El desglose "Cómo influyó cada respuesta" repite pregunta + respuesta + aporte. El asesor recibe el resumen completo (perfil, justificación, asignación) en una sola tarjeta numerada. |
| **H7** | **Flexibilidad y eficiencia** | Avance automático a la siguiente pregunta al responder. Salto directo a cualquier pregunta desde los puntos o desde "Cambiar" en la revisión. |
| **H8** | **Diseño estético y minimalista** | Lienzo claro sin marcos grises (referencia DisputeFox): tarjetas blancas, un solo acento lima, treemap y gauge como jerarquía visual, sin texto redundante. |
| **H9** | **Ayudar a reconocer y recuperarse de errores** | Errores del backend en lenguaje claro junto al formulario ("La asignación debe sumar 100% (suma 95%)"), nunca códigos. El total de la edición se pinta rojo/verde con la instrucción exacta. |
| **H10** | **Ayuda y documentación** | Ayuda contextual bajo cada pregunta con su peso. Enlaces "Ver reglas completas" hacia la pestaña Reglas (fórmula, rangos, knockouts). Banner de cumplimiento explica los límites del sistema. Notas de auditoría explican qué queda registrado. Footer legal (`LegalFooter`) con disclosure corto siempre visible y detalle expandible ("Ver detalles"), inspirado en la estructura multinivel de Betterment. Pestaña Portafolios permite explorar los 3 perfiles antes de decidir completar el diagnóstico. |

## Landing inspirada en Betterment (reverse-engineering)

Se analizó `betterment.com/investing` y se adaptó su arquitectura de landing
(hero → 4 pilares de valor → casos de uso por objetivo → barra de confianza →
comparación de portafolios → disclosures multinivel) sin copiar sus afirmaciones de
negocio: donde Betterment muestra "1M+ customers" o "$70B AUM", InvertIA muestra
únicamente **hechos verificables del propio sistema** (versión de reglas, tamaño del
catálogo real, % de propuestas revisadas por humano). La landing (`LandingTemplate`)
precede al cuestionario y cada tarjeta de "¿Qué quieres lograr con tu dinero?"
(`GoalUseCases`) pre-rellena la primera respuesta del diagnóstico, replicando el
patrón de conversión de Betterment sin sacrificar la transparencia exigida por HU1.

## Por qué HU1 concentra más heurísticas

Es el primer contacto del usuario y donde se decide la confianza en el sistema:
el cuestionario aplica H1 (progreso), H2 (agente que conversa), H3 (cambiar respuestas),
H5 (no enviar incompleto), H6 (revisión previa), H7 (avance automático) y H10 (ayuda + reglas
visibles) **antes** de calcular nada. El criterio "entender cómo influyen las respuestas"
se cumple dos veces: en la revisión (puntos × peso por respuesta) y en el desglose
posterior con barras de contribución.
