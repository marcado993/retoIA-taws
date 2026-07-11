// Nielsen H1: visibilidad del estado del sistema — dónde estás y cuánto falta.
export default function ProgressBar({ current, total, label }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="progress-wrap" data-testid="progress-bar">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-text">{label || `${current} de ${total} · ${pct}%`}</span>
    </div>
  )
}
