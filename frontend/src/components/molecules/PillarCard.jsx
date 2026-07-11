export default function PillarCard({ icon, title, text }) {
  return (
    <div className="pillar-card">
      <span className="pillar-icon">{icon}</span>
      <strong className="pillar-title">{title}</strong>
      <p className="pillar-text">{text}</p>
    </div>
  )
}
