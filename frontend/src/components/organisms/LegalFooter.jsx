import { useState } from 'react'

// Disclosure multinivel al estilo Betterment: línea corta siempre visible +
// detalle expandible con los límites del sistema (ver REGLAS.md §7).
export default function LegalFooter() {
  const [open, setOpen] = useState(false)
  return (
    <footer className="legal-footer" data-testid="legal-footer">
      <p className="legal-line">
        InvertIA es una demostración con fines educativos, no asesoría financiera
        personalizada. Un asesor humano autorizado es responsable final de cada
        propuesta antes de recomendarla. Nada se ejecuta automáticamente.{' '}
        <button className="link-btn" data-testid="legal-toggle" onClick={() => setOpen(!open)}>
          {open ? 'Ocultar detalles' : 'Ver detalles'}
        </button>
      </p>
      {open && (
        <div className="legal-details" data-testid="legal-details">
          <ul>
            <li>El LLM solo redacta explicaciones; nunca calcula puntajes, asignaciones ni métricas.</li>
            <li>No se ejecutan órdenes de compra/venta: toda acción regulada queda pendiente de aprobación humana.</li>
            <li>Los retornos mostrados son simulaciones etiquetadas como tales, nunca promesas de rentabilidad.</li>
            <li>Solo se proponen instrumentos del catálogo aprobado; cualquier edición del asesor queda validada contra ese catálogo.</li>
            <li>Cada decisión (aprobar, editar, rechazar) se registra con fecha, responsable y versión de reglas — ver la pestaña Auditoría.</li>
          </ul>
        </div>
      )}
    </footer>
  )
}
