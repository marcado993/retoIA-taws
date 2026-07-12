// Flecha animada + etiqueta "¡Pulsa aquí!" — reutilizable sobre cualquier botón
// que necesite guiar la atención del usuario hacia la siguiente acción.
export default function CtaNudge({ label = '¡Pulsa aquí!', children }) {
  return (
    <div className="cta-nudge-wrap">
      {children}
      <span className="cta-nudge" aria-hidden="true">
        <svg className="cta-nudge-arrow" viewBox="0 0 44 40" fill="none">
          <path d="M3 3 Q 3 30 34 30" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" fill="none" />
          <path d="M27 24 L35 31 L28 37" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span className="cta-nudge-label">{label}</span>
      </span>
    </div>
  )
}
