import StatCard from '../molecules/StatCard.jsx'
import { STATUS } from '../molecules/StatusChip.jsx'

export default function StatGrid({ record }) {
  const m = record.proposal.metrics
  return (
    <div className="stat-grid">
      <StatCard title="Retorno esperado" value={`${m.expected_return}%`}
        chip="Simulado" note="Estimación anual del portafolio propuesto." />
      <StatCard title="Volatilidad" value={`${m.volatility}%`}
        chip="Riesgo" note="Oscilación esperada en un año típico." />
      <StatCard title="Diversificación" value={m.diversification}
        chip="Clases" note="Clases de activos en la propuesta." />
      <StatCard title="Estado"
        value={record.status === 'pendiente' ? 'En revisión' : (STATUS[record.status] || STATUS.pendiente).label}
        chip="HITL" note="Un asesor humano decide antes de recomendar." />
    </div>
  )
}
