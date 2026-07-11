import IconTile from '../atoms/IconTile.jsx'

export default function GoalCard({ icon, title, text, onClick }) {
  return (
    <button className="goal-card" data-testid="goal-card" onClick={onClick}>
      <IconTile icon={icon} />
      <strong>{title}</strong>
      <p>{text}</p>
    </button>
  )
}
