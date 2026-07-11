import { useState, useRef, useEffect } from 'react'

// Transparencia accesible (spec §1): un ícono "i" discreto que abre un popover
// "¿Por qué preguntamos esto?" sin llenar la pantalla de texto legal.
// Accesible: <button> con aria-expanded, popover con role="tooltip",
// se cierra con Escape o al hacer clic fuera (WCAG 1.4.13 · contenido descartable).
export default function InfoTooltip({ label = '¿Por qué preguntamos esto?', children }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

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

  return (
    <span className="info-tooltip" ref={wrapRef}>
      <button type="button" className="info-tooltip-btn" data-testid="info-tooltip-btn"
        aria-expanded={open} aria-label={label}
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
