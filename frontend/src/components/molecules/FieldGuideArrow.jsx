// Guía dinámica de llenado: una flechita + texto que "salta" al siguiente
// campo vacío, para que el usuario nunca se pregunte qué llenar después.
export default function FieldGuideArrow({ active, text }) {
  if (!active) return null
  return (
    <div className="field-guide" data-testid="field-guide" aria-live="polite">
      <svg className="field-guide-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2 L10 15 M5 10 L10 15 L15 10" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{text}</span>
    </div>
  )
}
