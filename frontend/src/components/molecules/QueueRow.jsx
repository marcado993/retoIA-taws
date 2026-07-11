import StatusChip from './StatusChip.jsx'

export default function QueueRow({ proposal, active, onClick }) {
  return (
    <button data-testid="queue-row"
      className={`queue-row ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="queue-name">{proposal.client_name}
        <em>{proposal.profile_result.profile.label} · score {proposal.profile_result.score} · v{proposal.version}</em>
      </span>
      <StatusChip status={proposal.status} />
    </button>
  )
}
