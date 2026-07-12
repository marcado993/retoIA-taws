import Chip from '../atoms/Chip.jsx'
import StatusChip from '../molecules/StatusChip.jsx'
import EmptyText from '../atoms/EmptyText.jsx'

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Historial de casos ya decididos (aprobados, aprobados con cambios o
// rechazados) — el "dashboard de casos" del asesor no es solo la cola
// pendiente, también necesita ver qué se resolvió y quién lo firmó.
export default function ApprovalHistory({ proposals }) {
  const decided = proposals
    .filter(p => p.status !== 'pendiente' && p.decision)
    .sort((a, b) => new Date(b.decision.timestamp) - new Date(a.decision.timestamp))

  return (
    <div className="card" data-testid="approval-history">
      <div className="card-head">
        <h3>Historial de aprobados</h3>
        <Chip tone="neutral">{decided.length} caso(s) resuelto(s)</Chip>
      </div>
      {decided.length === 0 ? (
        <EmptyText>Aún no hay decisiones registradas.</EmptyText>
      ) : (
        <div className="history-list">
          {decided.map(p => (
            <div key={p.id} className="history-row" data-testid="history-row">
              <span className="history-name">{p.client_name}
                <em>{p.profile_result.profile.label} · score {p.profile_result.score}</em>
              </span>
              <span className="history-decision">
                <StatusChip status={p.status} />
                <em>{p.decision.advisor} · {fmtDateTime(p.decision.timestamp)}</em>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
