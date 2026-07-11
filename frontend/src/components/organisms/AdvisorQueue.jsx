import Chip from '../atoms/Chip.jsx'
import EmptyText from '../atoms/EmptyText.jsx'
import QueueRow from '../molecules/QueueRow.jsx'

export default function AdvisorQueue({ proposals, selectedId, onSelect }) {
  return (
    <div className="card">
      <div className="card-head"><h3>Cola de revisión</h3>
        <Chip tone="lime">{proposals.filter(p => p.status === 'pendiente').length} pendientes</Chip>
      </div>
      {proposals.length === 0 && <EmptyText>Aún no hay propuestas generadas.</EmptyText>}
      {proposals.map(p => (
        <QueueRow key={p.id} proposal={p} active={p.id === selectedId}
          onClick={() => onSelect(p.id)} />
      ))}
    </div>
  )
}
