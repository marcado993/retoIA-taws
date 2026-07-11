import Chip from '../atoms/Chip.jsx'

// Único mapa estado→presentación (antes duplicado en ProposalView y AdvisorPanel).
export const STATUS = {
  pendiente: { tone: 'yellow', label: 'Pendiente de asesor' },
  aprobada: { tone: 'green', label: 'Aprobada' },
  aprobada_con_cambios: { tone: 'green', label: 'Aprobada con cambios' },
  rechazada: { tone: 'red', label: 'Rechazada' },
}

export default function StatusChip({ status }) {
  const { tone, label } = STATUS[status] || STATUS.pendiente
  return <Chip tone={tone} data-testid="status-chip">{label}</Chip>
}
