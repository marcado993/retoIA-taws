import StatusChip from './StatusChip.jsx'

// Escaneabilidad (spec §3): fila de cola con columnas esenciales — Nombre, Perfil,
// Fecha — más el chip de estado con color semántico, para auditar de un vistazo.
function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

export default function QueueRow({ proposal, active, onClick }) {
  return (
    <button data-testid="queue-row"
      className={`queue-row ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="queue-name">{proposal.client_name}
        <em>{proposal.profile_result.profile.label} · score {proposal.profile_result.score} · v{proposal.version}</em>
      </span>
      <span className="queue-meta">
        <span className="queue-date">{fmtDate(proposal.created_at)}</span>
        <StatusChip status={proposal.status} />
      </span>
    </button>
  )
}
