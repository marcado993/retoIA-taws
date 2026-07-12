import Chip from '../atoms/Chip.jsx'

// Único mapa estado→presentación (antes duplicado en ProposalView y AdvisorPanel).
export const STATUS = {
  borrador: { tone: 'neutral', label: 'Vista previa (sin enviar)' },
  pendiente: { tone: 'yellow', label: 'Pendiente de asesor' },
  aprobada: { tone: 'green', label: 'Aprobada' },
  aprobada_con_cambios: { tone: 'green', label: 'Aprobada con cambios' },
  rechazada: { tone: 'red', label: 'Rechazada' },
}

export default function StatusChip({ status }) {
  const { tone, label } = STATUS[status] || STATUS.pendiente
  // `chip-status` añade un punto de color (CSS) antes del texto para reforzar
  // el estado visualmente. El texto sigue siendo solo `label` (los tests lo exigen).
  return <Chip tone={tone} className="chip-status" data-testid="status-chip">{label}</Chip>
}
