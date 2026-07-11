import Chip from '../atoms/Chip.jsx'
import EmptyText from '../atoms/EmptyText.jsx'
import QueueRow from '../molecules/QueueRow.jsx'

// Filtros por estado: el asesor ve de inmediato cuántas hay en cada estado y puede
// aislar pendientes / aprobadas / rechazadas.
const FILTERS = [
  { key: 'todas', label: 'Todas', match: () => true },
  { key: 'pendiente', label: 'Pendientes', match: p => p.status === 'pendiente' },
  { key: 'aprobada', label: 'Aprobadas', match: p => p.status === 'aprobada' || p.status === 'aprobada_con_cambios' },
  { key: 'rechazada', label: 'Rechazadas', match: p => p.status === 'rechazada' },
]

export default function AdvisorQueue({ proposals, selectedId, onSelect, filter = 'todas', onFilter }) {
  const active = FILTERS.find(f => f.key === filter) || FILTERS[0]
  const visible = proposals.filter(active.match)

  return (
    // Split-view (spec §3): la cola queda fija a la izquierda (sticky) para no perder
    // el contexto de la lista mientras se audita un caso en el panel de la derecha.
    <div className="card queue-sticky">
      <div className="card-head"><h3>Cola de revisión</h3>
        <Chip tone="lime">{proposals.filter(p => p.status === 'pendiente').length} pendientes</Chip>
      </div>

      <div className="queue-filter" role="tablist" aria-label="Filtrar por estado">
        {FILTERS.map(f => (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key}
            data-testid={`queue-filter-${f.key}`}
            className={`queue-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => onFilter?.(f.key)}>
            {f.label}
            <span className="queue-filter-count">{proposals.filter(f.match).length}</span>
          </button>
        ))}
      </div>

      {proposals.length === 0 && <EmptyText>Aún no hay propuestas generadas.</EmptyText>}
      {proposals.length > 0 && visible.length === 0 && (
        <EmptyText>No hay propuestas {active.label.toLowerCase()}.</EmptyText>
      )}
      {visible.map(p => (
        <QueueRow key={p.id} proposal={p} active={p.id === selectedId}
          onClick={() => onSelect(p.id)} />
      ))}
    </div>
  )
}
