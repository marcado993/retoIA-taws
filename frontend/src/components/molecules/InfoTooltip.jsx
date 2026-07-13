import { useState, useRef, useEffect } from 'react'

// Transparencia accesible (spec §1): un ícono "i" discreto que abre un popover
// explicando qué se pregunta o qué se espera en un campo, sin llenar la
// pantalla de texto legal. Se abre con click (accesible por teclado/touch) O
// con hover (conveniencia para mouse) — ambos caminos llevan al mismo popover.
// Accesible: <button> con aria-expanded, popover con role="tooltip",
// se cierra con Escape, al hacer clic fuera, o al quitar el mouse (WCAG 1.4.13).
export default function InfoTooltip({ label = '¿Por qué preguntamos esto?', children }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const closeTimer = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openOnHover = () => { clearTimeout(closeTimer.current); setOpen(true) }
  const closeOnLeave = () => { closeTimer.current = setTimeout(() => setOpen(false), 120) }

  return (
    <span className="info-tooltip" ref={wrapRef}
      onMouseEnter={openOnHover} onMouseLeave={closeOnLeave}>
      <button type="button" className="info-tooltip-btn" data-testid="info-tooltip-btn"
        aria-expanded={open} aria-label={label}
        onFocus={openOnHover} onBlur={closeOnLeave}
        onClick={() => setOpen(o => !o)}>
        i
      </button>
      {open && (
        <span className="info-tooltip-pop" role="tooltip" data-testid="info-tooltip-pop">
          <strong className="info-tooltip-title">{label}</strong>
          {children}
        </span>
      )}
    </span>
  )
}
