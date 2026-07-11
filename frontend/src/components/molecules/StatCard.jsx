import Chip from '../atoms/Chip.jsx'

export default function StatCard({ title, value, chip, note }) {
  return (
    <div className="stat-card">
      <div className="stat-head"><span>{title}</span><Chip tone="lime">{chip}</Chip></div>
      <strong className="stat-value">{value}</strong>
      <p className="stat-note">{note}</p>
    </div>
  )
}
