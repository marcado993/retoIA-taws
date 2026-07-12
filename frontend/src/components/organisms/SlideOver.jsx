import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Slide-over lateral para acciones críticas (spec §3): introduce fricción intencional
// antes de confirmar una decisión irreversible (rechazo), obligando a revisar la
// justificación que quedará en la bitácora.
// Accesible: role=dialog + aria-modal, cierra con Escape, foco inicial al abrir,
// backdrop que no confirma nada al hacer clic (solo cierra).
export default function SlideOver({ open, title, onClose, children }) {
  const panelRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  // Solo montamos en cliente: createPortal necesita document (SSR-safe).
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Foco al panel al abrir para navegación por teclado.
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  // Portal a <body>: evita que un ancestro con `transform` (la animación GSAP de las
  // pestañas) convierta `position: fixed` en relativo y descoloque el panel.
  return createPortal(
    <div className="slideover-root" data-testid="slideover">
      <div className="slideover-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="slideover-panel" role="dialog" aria-modal="true"
        aria-label={title} tabIndex={-1} ref={panelRef}>
        <div className="slideover-head">
          <h3 className="slideover-title">{title}</h3>
          <button type="button" className="slideover-close" aria-label="Cerrar"
            onClick={onClose}>✕</button>
        </div>
        <div className="slideover-body">{children}</div>
      </aside>
    </div>,
    document.body
  )
}
