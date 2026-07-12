import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Modal centrado (a diferencia de SlideOver, que es un panel lateral): pensado
// para flujos guiados tipo wizard donde el usuario debe mantener el "momentum"
// sin perder la página de fondo ni el scroll general. Cerrar (X, backdrop o
// Escape) siempre te devuelve a donde estabas — nunca deja al usuario atrapado.
export default function Modal({ open, title, onClose, children }) {
  const panelRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="modal-root" data-testid="modal">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}
        tabIndex={-1} ref={panelRef}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
