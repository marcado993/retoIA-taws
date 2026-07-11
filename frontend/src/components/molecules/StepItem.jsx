export default function StepItem({ day, text, done }) {
  return (
    <div className={`step ${done ? 'done' : ''}`}>
      <span className="step-check">{done ? '✓' : '○'}</span>
      <div><em>{day}</em><p>{text}</p></div>
    </div>
  )
}
