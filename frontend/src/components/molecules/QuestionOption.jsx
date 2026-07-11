export default function QuestionOption({ label, points, selected, onSelect }) {
  return (
    <button data-testid="question-option"
      className={`q-option ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span>{label}</span>
      <span className="q-points">{points} pt</span>
    </button>
  )
}
