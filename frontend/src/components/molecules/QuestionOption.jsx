// Microcopia educativa (spec §1): además del label, una descripción corta opcional
// bajo la opción para desmitificar el término financiero sin abrumar.
export default function QuestionOption({ label, points, hint, selected, onSelect }) {
  return (
    <button data-testid="question-option"
      className={`q-option ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className="q-option-text">
        <span className="q-option-label">{label}</span>
        {hint && <span className="q-option-hint">{hint}</span>}
      </span>
      <span className="q-points">{points} pt</span>
    </button>
  )
}
