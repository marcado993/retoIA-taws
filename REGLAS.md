# Reglas de Aprobación y Rechazo de Propuestas — v1.0.0

> Documento normativo del Track 3 (Robo-Advisory). Estas reglas son **visibles y versionadas**:
> cada decisión del asesor queda registrada en el log de auditoría con la versión vigente de este
> documento y de las reglas de perfilamiento (`backend/app/rules/profile_rules_v1.json`).

## 1. Principio rector

La IA **propone, el humano dispone**. Ningún portafolio llega al cliente sin la decisión
explícita de un asesor autorizado. El sistema nunca ejecuta órdenes ni promete rentabilidad.

## 2. Reglas de perfilamiento (calculadas por el agente Asesor Financiero IA)

El puntaje se calcula con la fórmula visible:

```
score = 100 × Σ( peso_pregunta × (puntos_respuesta − 1) / 3 ) / Σ(pesos)
```

| Pregunta | Peso |
|---|---|
| Reacción ante una caída de 20% | 25 |
| Objetivo de inversión | 20 |
| Horizonte de inversión | 20 |
| Fondo de emergencia | 15 |
| Experiencia previa | 10 |
| Estabilidad de ingresos | 10 |

**Rangos de perfil:** Conservador 0–29 · Moderado 30–69 · Agresivo 70–100.

**Reglas de tope (knockout)** — protegen al usuario aunque su puntaje sea alto:

| Regla | Condición | Efecto |
|---|---|---|
| Horizonte corto | Necesita el dinero en < 1 año | Perfil máximo: **Conservador** |
| Sin fondo de emergencia | No tiene colchón de liquidez | Perfil máximo: **Moderado** |
| Pánico ante caídas | Vendería todo ante −20% | Perfil máximo: **Conservador** |

## 3. Reglas para APROBAR una propuesta

El asesor puede aprobar solo si se cumplen **todas**:

1. **Coherencia perfil–portafolio**: la asignación corresponde al portafolio modelo del perfil
   calculado, o a una edición que no aumenta el riesgo por encima del rango del perfil.
2. **Catálogo aprobado**: todos los instrumentos pertenecen al catálogo ficticio/aprobado
   (`catalog.json`). El sistema bloquea instrumentos fuera de catálogo.
3. **Suma 100%**: la asignación suma exactamente 100% (validado por el backend).
4. **Diversificación mínima**: al menos 3 clases de activo y ningún instrumento > 50%
   (salvo liquidez/renta fija soberana en perfil Conservador).
5. **Knockouts respetados**: si se aplicó una regla de tope, el portafolio no puede exceder
   el perfil limitado.
6. **Explicación presente**: la propuesta incluye justificación legible y el disclaimer de
   "no promesa de rentabilidad".

## 4. Reglas para APROBAR CON CAMBIOS (editar)

1. El asesor puede modificar pesos únicamente dentro del catálogo aprobado.
2. La edición genera una **nueva versión** de la propuesta (v2, v3, …) y conserva la
   asignación original para trazabilidad.
3. Debe registrar en notas el motivo del ajuste.
4. Aplican las mismas validaciones de la sección 3 (suma 100%, catálogo, diversificación).

## 5. Reglas para RECHAZAR una propuesta

El asesor **debe rechazar** cuando ocurra al menos una:

1. **Inconsistencia declarada**: las respuestas del cliente son contradictorias
   (p. ej. objetivo "maximizar crecimiento" con horizonte < 1 año y sin fondo de emergencia)
   y requieren una nueva entrevista.
2. **Perfil desactualizado o dudoso**: hay indicios de que el cliente no entendió el
   cuestionario o respondió por terceros.
3. **Situación fuera de alcance**: el cliente necesita producto no cubierto por el catálogo
   (p. ej. liquidez inmediata total) o asesoría fiscal/sucesoral.
4. **Riesgo reputacional o regulatorio**: cliente en lista restringida, menor de edad,
   o cualquier bandera de cumplimiento.
5. El rechazo **exige motivo escrito** en las notas (validado por el backend) y dispara
   la recomendación de repetir el perfilamiento con acompañamiento humano.

## 6. Auditoría (obligatoria para toda decisión)

Cada aprobación, edición o rechazo registra de forma inmutable:

- Fecha y hora (UTC)
- Responsable (asesor identificado)
- Acción tomada y notas
- **Versión de las reglas de perfilamiento** vigentes al calcular el perfil
- **Versión de la propuesta** decidida (v1 original, v2+ si hubo edición)

## 7. Límites del sistema (guardrails)

- El LLM solo **redacta explicaciones**; nunca calcula puntajes, asignaciones ni métricas
  (esas provienen del motor de reglas y del catálogo).
- No se ejecutan órdenes de compra/venta: toda acción regulada queda como propuesta
  pendiente de aprobación.
- Los retornos mostrados son simulaciones etiquetadas como tales, nunca promesas.

---
*Cambios a este documento incrementan la versión y quedan referenciados en el log de auditoría.*
