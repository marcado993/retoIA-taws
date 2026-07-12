# Mejoras de UX — Robo-Advisor (InvertIA)

> Rama: `feature/ux-improvements` · Cambios **locales, sin commits** (a la espera de revisión).
> Cada cambio responde a un punto de la guía de UX entregada y respeta las reglas
> arquitectónicas del proyecto (núcleo determinístico + HITL) y **todos** los tests e2e
> existentes (7/7 en verde).

Este documento explica **qué** se cambió, **por qué** y **en qué archivos**.

---

## Resumen de verificación

- ✅ `npx playwright test` → **7/7 tests en verde** (ningún flujo probado se rompió).
- ✅ Verificación visual en navegador (preview) de las 4 áreas.
- ✅ Se respetaron todos los `data-testid` y el contrato del backend (no se tocó el backend).

---

## §1 · Flujo de Perfilamiento (Onboarding)

### 1.1 Microcopia educativa por opción
- **Qué:** cada opción del cuestionario muestra ahora una descripción corta bajo la
  etiqueta (ej. *"Menos rendimiento, pero tu capital se mueve poco."*).
- **Por qué:** los términos financieros asustan; una microcopia traduce el término sin
  obligar al usuario a salir del flujo ni abrir ayuda externa. Reduce fricción cognitiva.
- **Archivos:**
  - `src/components/molecules/QuestionOption.jsx` — nueva prop `hint`.
  - `src/components/organisms/QuestionnaireCard.jsx` — diccionario `OPTION_HINTS`
    (indexado por `value`, opcional: si no hay hint, no se muestra nada).
  - `src/styles.css` — `.q-option-text`, `.q-option-label`, `.q-option-hint`.

### 1.2 Transparencia accesible con tooltip "¿Por qué preguntamos esto?"
- **Qué:** un ícono discreto **"i"** junto a cada pregunta abre un popover explicando el
  propósito de la pregunta y **cuánto pesa** en el puntaje, en vez de un bloque de texto
  legal que compita con las opciones.
- **Por qué:** cumple el criterio de *hacer visibles las reglas del perfilamiento* sin
  llenar la pantalla. Patrón discreto (tooltip), no modal intrusivo.
- **Accesibilidad:** `<button>` con `aria-expanded`, popover `role="tooltip"`, se cierra
  con `Escape` o clic fuera (WCAG 1.4.13 — contenido descartable).
- **Archivos:**
  - `src/components/molecules/InfoTooltip.jsx` — **nuevo** componente reutilizable.
  - `src/components/organisms/QuestionnaireCard.jsx` — reemplaza el `<p class="q-help">`
    por `.q-text-row` + `<InfoTooltip>`.
  - `src/styles.css` — `.info-tooltip*`, `.q-text-row`.

### 1.3 Indicador de progreso siempre visible
- **Qué:** la barra de progreso ("Pregunta X de 6") ahora es **sticky** en la parte
  superior del bloque de preguntas.
- **Por qué:** el usuario necesita saber cuánto falta en todo momento; hacerla pegajosa
  mantiene esa referencia aunque haga scroll.
- **Archivos:** `QuestionnaireCard.jsx` (envoltura `.q-progress-sticky`), `styles.css`.

> **Nota honesta sobre "one-thing-per-page":** el patrón ya se cumple en gran medida (una
> pregunta por pantalla con tarjetas grandes). No se separó el campo *Nombre* + metas
> financieras a su propia pantalla porque el flujo actual y los tests e2e esperan el
> nombre y las opciones en la misma vista. Es una mejora futura de bajo riesgo si se
> ajustan los helpers de test.

---

## §2 · Propuesta de Portafolio (Visualización)

### 2.1 Jerarquía de datos — "Big Numbers"
- **Qué:** arriba de la propuesta, tres bloques con tipografía grande destacan lo vital:
  **Nivel de riesgo** (ej. *Moderado*), **Rendimiento esperado** (resaltado en verde) y
  **Volatilidad**.
- **Por qué:** el ojo busca certezas primero; los Big Numbers dan el titular antes que el
  detalle en bruto.
- **Archivos:**
  - `src/components/molecules/BigNumber.jsx` — **nuevo**.
  - `src/components/organisms/ProposalCard.jsx` — bloque `.big-numbers` al inicio.
  - `src/styles.css` — `.big-numbers`, `.big-number*`.

### 2.2 Gráficos interactivos (hover revela el % exacto)
- **Qué:**
  - **Donut** (usado en la comparación de portafolios): al pasar el ratón/enfocar un
    segmento, se resalta y el centro revela el ticker y su **% exacto**; los demás se
    atenúan.
  - **Treemap** (usado en la propuesta): cada tile revela *ticker · nombre · % · clase*
    al hacer hover, incluidos los tiles pequeños sin etiqueta visible.
- **Por qué:** revela los porcentajes exactos on-demand sin saturar el gráfico con
  etiquetas superpuestas.
- **Accesibilidad:** `<title>` nativo (leído por lectores de pantalla) + `tabIndex`/`role`.
- **Archivos:**
  - `src/components/molecules/Donut.jsx` — estado `hover`, resaltado y centro dinámico.
  - `src/components/organisms/Treemap.jsx` — `<title>` + `role`/`aria-label` por tile.
  - `src/styles.css` — `.donut-seg`, `.tm-tile`.

> **Nota:** la propuesta usa Treemap (no Donut) porque los tests lo exigen y comunica
> mejor el *tamaño relativo*. Se le añadió interactividad en lugar de sustituirlo. El
> Donut interactivo aplica a la pestaña **Portafolios**.

### 2.3 Traducción de la "caja negra" a viñetas
- **Qué:** una tarjeta **"¿Por qué esta diversificación?"** con 4 viñetas cortas,
  derivadas de los datos reales de la propuesta (nº de clases de activo, clase dominante,
  posición más grande, volatilidad/riesgo), antes del párrafo largo de la IA.
- **Por qué:** responde directamente y de forma escaneable a la pregunta del cliente, en
  vez de obligarlo a leer un párrafo denso. Sigue siendo explicación, **no** promesa.
- **Archivos:** `ProposalCard.jsx` (`buildReasons()` + `.diversification-why`),
  `styles.css`.

---

## §3 · Entorno del Asesor (Human-in-the-loop)

### 3.1 Escaneabilidad en la cola (data grid)
- **Qué:** cada fila de la cola muestra columnas esenciales — **Nombre**, **Perfil/score**
  y **Fecha** — junto al chip de estado con color semántico (amarillo=pendiente,
  verde=aprobada, rojo=rechazada).
- **Por qué:** permite auditar la cola de un vistazo sin abrir cada caso.
- **Archivos:** `src/components/molecules/QueueRow.jsx` (fecha `created_at`),
  `styles.css` (`.queue-meta`, `.queue-date`).

### 3.2 Split-view con contexto fijo
- **Qué:** la **cola de revisión** queda fija (sticky) a la izquierda mientras se audita
  un caso en el panel derecho.
- **Por qué:** el asesor no pierde la lista ni el contexto al hacer scroll en el detalle,
  evitando saltos entre vistas.
- **Archivos:** `src/components/organisms/AdvisorQueue.jsx` (`.queue-sticky`), `styles.css`.

### 3.3 Fricción intencional para acciones críticas (slide-over)
- **Qué:** al **Rechazar**, ya no se ejecuta de inmediato: se abre un **slide-over**
  lateral que muestra a quién afecta, exige la **justificación** (obligatoria) y solo
  habilita **"Confirmar rechazo"** cuando hay motivo escrito.
- **Por qué:** el rechazo es una acción crítica e irreversible que queda en la bitácora;
  añadir una confirmación deliberada previene errores y refuerza la trazabilidad.
- **Accesibilidad:** `role="dialog"` + `aria-modal`, cierre con `Escape`, foco al abrir.
  Se renderiza con **React Portal a `document.body`** para no verse afectado por el
  `transform` de la animación GSAP de las pestañas (que rompía `position: fixed`).
- **Archivos:**
  - `src/components/organisms/SlideOver.jsx` — **nuevo** (portal + accesible).
  - `src/components/organisms/AdvisorDetail.jsx` — el botón *Rechazar* abre el slide-over.
  - `src/styles.css` — `.slideover*`.

> **Nota:** la fricción se aplicó al **rechazo** (acción destructiva). La edición de pesos
> ya tiene su propia fricción inherente (validar que sumen 100% + responsable obligatorio)
> y se mantuvo inline para no romper el flujo probado por los tests.

---

## §4 · Manejo de Estados y Carga

### 4.1 Carga esquelética (skeleton) en vez de spinner
- **Qué:** al enviar el cuestionario, mientras el Agente de Inversiones IA genera la
  propuesta, se muestra un **esqueleto animado** que imita la estructura final
  (Big Numbers + gráfico + métricas + explicación).
- **Por qué:** un esqueleto que "se parece al resultado" transmite que el sistema está
  construyendo activamente la respuesta y reduce la ansiedad por la latencia del modelo,
  a diferencia de un spinner genérico.
- **Accesibilidad:** `role="status"` + `aria-live`. Respeta `prefers-reduced-motion`.
- **Archivos:**
  - `src/components/molecules/ProposalSkeleton.jsx` — **nuevo**.
  - `src/components/pages/DashboardPage.jsx` — muestra el skeleton cuando `loading && !record`.
  - `src/styles.css` — `.sk*`, `@keyframes sk-shimmer`.

### 4.2 Prevención de doble envío
- **Qué:** los botones **Aprobar / Aprobar con cambios / Confirmar rechazo** se
  deshabilitan y cambian su texto a **"Procesando…"** tras el primer clic.
- **Por qué:** evita entradas duplicadas en la bitácora de auditoría por doble clic.
- **Archivos:** `src/components/organisms/AdvisorDetail.jsx` (estado `busyAction`
  por acción + helper `label()`).

---

## Corrección adicional (fuera de las 4 áreas)

- **Bug visible corregido:** en `app/page.jsx` había un comentario `/* ... */` en posición
  de texto JSX que se **renderizaba como texto literal** en cada pestaña. Se convirtió en
  un comentario JSX válido `{/* ... */}`.
- **Config de arranque:** `.claude/launch.json` tenía el puerto del frontend en `5173`
  (obsoleto de Vite); el script `dev` de Next usa `3000`. Se corrigió a `3000` para poder
  levantar el preview.

---

---

## §5 · Componentes de visualización nuevos (independientes)

> Estos dos componentes se crearon a pedido y quedan **listos para integrar**; aún no
> están montados en ninguna página. Verificados visualmente en un banco de pruebas
> temporal (`/uxlab`, ya eliminado): render, tooltip y posicionamiento correctos.

### 5.1 `FanChart.jsx` — Cono de incertidumbre (proyección)
- **Qué:** proyección de inversión en el tiempo con Recharts. `<Area>` pinta la franja
  pesimista→optimista (gradiente verde muy tenue vía `<defs>`, sin bordes) y `<Line>`
  marca el escenario **esperado** (verde oscuro, más grueso). Tooltip con los 3
  escenarios formateados como **USD**. Minimalista, sin leyenda.
- **Detalle técnico:** Recharts pinta la banda pasando al `<Area>` un `dataKey` cuyo valor
  es el par `[pesimista, optimista]`; se calcula `band: [pessimistic, optimistic]` a partir
  de las props. Contenedor `w-full h-64` responsivo con `ResponsiveContainer`.
- **Dependencia nueva:** `recharts@^2.15` (agregada a `package.json`).
- **Archivo:** `src/components/molecules/FanChart.jsx` (`'use client'`).

### 5.2 `RiskBulletChart.jsx` — Termómetro de riesgo
- **Qué:** barra lineal segmentada por perfiles (solo HTML + Tailwind, sin librerías).
  Segmentos con ancho en % por `range.max`, marcador (círculo oscuro con anillo blanco)
  posicionado dinámicamente en `left: ${score}%`, globo **"Tu Perfil: [label]"** que se
  mueve con el marcador y etiquetas de zona con `justify-between`.
- **Detalle técnico:** `score` se clampa a `[0,100]`; el ancho de cada segmento es
  `range.max - topeAnterior`. Sombras suaves (`shadow-sm`), tipografía gris (`text-gray-600`).
- **Archivo:** `src/components/molecules/RiskBulletChart.jsx`.

---

---

## §6 · Tipografía, hovers y panel del asesor (iteración 2)

### 6.1 Tipografía temática de inversión
- **Qué:** nuevo pairing tipográfico — **Space Grotesk** para display/cifras y
  **Plus Jakarta Sans** para el cuerpo. Se añadieron **números tabulares** (`tabular-nums`)
  a montos, porcentajes y puntajes, y ajustes finos de `letter-spacing`.
- **Por qué:** Space Grotesk aporta un carácter geométrico "financiero-tech" y alinea las
  cifras; Plus Jakarta Sans (intención original del diseño) da un cuerpo premium legible.
- **Archivos:** `src/styles.css` (`@import`, `--font-sans`, `--font-display`, reglas de
  cifras), `tailwind.config.js` (`fontFamily`).

### 6.2 Hover informativo en todos los gráficos
- **Qué:** el **Gauge** de riesgo ahora revela su detalle al pasar el ratón (tooltip nativo
  "Puntaje X/100 · Perfil …" + el marcador crece). Junto con Donut, Treemap, FanChart y el
  nuevo gráfico del asesor, **todos** los gráficos responden al hover mostrando su info.
- **Archivos:** `src/components/molecules/Gauge.jsx` (`<title>` + `.gauge-hit` + `.gauge-dot`),
  `src/components/organisms/HeroPanel.jsx` (prop `tooltip`), `styles.css`.

### 6.3 Panel del asesor — estados intuitivos
- **Qué:**
  - Se agregaron los **colores de chip** que faltaban en el CSS activo (`.chip-*`), de modo
    que los estados se distinguen por color (amarillo=pendiente, verde=aprobada,
    rojo=rechazada) + un **punto de estado** antes del texto (`chip-status`).
  - **Filtro segmentado** en la cola (Todas / Pendientes / Aprobadas / Rechazadas) con
    contadores.
  - **Borde izquierdo semántico** en cada fila según su estado.
- **Por qué:** el asesor identifica de un vistazo qué está pendiente, aprobado o rechazado,
  y puede aislar cada grupo.
- **Archivos:** `src/components/molecules/StatusChip.jsx`, `src/components/molecules/QueueRow.jsx`,
  `src/components/organisms/AdvisorQueue.jsx` (filtro), `styles.css`.

### 6.4 Panel del asesor — gráfico de estadísticas
- **Qué:** tarjeta **"Panorama de tus asesorados"** con contadores por estado (colores
  semánticos) y un **gráfico de barras (Recharts)** de asesorados por perfil de riesgo,
  con tooltip al hover.
- **Por qué:** da al asesor una vista rápida y útil de su cartera.
- **Archivos:** `src/components/organisms/AdvisorStats.jsx` (**nuevo**),
  `src/components/pages/AdvisorPage.jsx`, `styles.css`.

### 6.5 Panel del asesor — skeleton del detalle sin selección
- **Qué:** cuando el asesor aún no eligió ninguna revisión, el panel derecho muestra un
  **skeleton** que imita el resumen e invita a seleccionar un caso, en vez de un vacío.
- **Archivos:** `src/components/molecules/AdvisorDetailSkeleton.jsx` (**nuevo**),
  `src/components/pages/AdvisorPage.jsx`, `styles.css`.

> Verificado: 7/7 e2e en verde y comprobación visual en navegador (tipografía, hover del
> gauge y del gráfico de barras, filtros, chips de estado y skeleton del detalle).

---

---

## §7 · Alineación IA de la propuesta con noticias + mercado

- **Qué:** al generar la propuesta, un agente IA (**DeepSeek**, con fallback
  determinístico) produce un **Contexto de mercado** que alinea la propuesta con las
  condiciones de hoy: qué instrumentos del portafolio están subiendo (datos reales de
  Yahoo Finance) y qué temas dominan los titulares. Se muestra en la propuesta del cliente
  y en el panel del asesor.
- **Guardrails respetados:** el LLM **solo narra**; no cambia pesos, no inventa tickers
  (verificador extendido para rechazar tickers fuera de catálogo) ni promete rentabilidad.
  Cualquier ajuste sigue pasando por el asesor humano (HITL).
- **Activación:** define `DEEPSEEK_API_KEY` (y opcional `DEEPSEEK_MODEL`, por defecto
  `deepseek-chat`) en el backend; sin key usa la narrativa determinística basada en las
  mismas señales verificables. Migrado de Anthropic Claude a DeepSeek para el reto del
  patrocinador 'Best Use of DeepSeek'.
- **Backend:** `backend/app/agents/inversiones_ia.py` (`_build_market_context`,
  `_market_narrative`, `_try_llm_market_context`, verificador extendido) y
  `backend/app/main.py` (inyecta market + news en `build_proposal`).
- **Frontend:** `src/components/molecules/MarketContextCard.jsx`, integrado en
  `ProposalCard.jsx` y `AdvisorDetail.jsx`.
- Verificado: 22/22 pytest backend y 9/9 e2e en verde.

## Archivos nuevos
```
src/components/molecules/InfoTooltip.jsx
src/components/molecules/BigNumber.jsx
src/components/molecules/ProposalSkeleton.jsx
src/components/molecules/FanChart.jsx             (§5 · requiere recharts)
src/components/molecules/RiskBulletChart.jsx      (§5)
src/components/molecules/AdvisorDetailSkeleton.jsx (§6)
src/components/organisms/SlideOver.jsx
src/components/organisms/AdvisorStats.jsx          (§6 · requiere recharts)
frontend/CAMBIOS_UX.md   (este documento)
```
Dependencia añadida: `recharts` (en `package.json` / `package-lock.json`).

## Archivos modificados
```
app/page.jsx
.claude/launch.json
src/components/molecules/QuestionOption.jsx
src/components/molecules/Donut.jsx
src/components/molecules/QueueRow.jsx
src/components/organisms/QuestionnaireCard.jsx
src/components/organisms/Treemap.jsx
src/components/organisms/ProposalCard.jsx
src/components/organisms/AdvisorQueue.jsx
src/components/organisms/AdvisorDetail.jsx
src/components/pages/DashboardPage.jsx
src/styles.css
```
