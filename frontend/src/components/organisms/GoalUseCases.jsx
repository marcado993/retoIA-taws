import GoalCard from '../molecules/GoalCard.jsx'

const ShieldIcon = () => (
  <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ScaleIcon = () => (
  <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const GOALS = [
  { value: 'preservar', icon: <ShieldIcon />, title: 'Proteger tu capital', text: 'Evitar pérdidas y mantener el valor de tus ahorros.' },
  { value: 'ingresos', icon: <DollarIcon />, title: 'Generar ingresos', text: 'Un flujo de dividendos estable a partir de tus inversiones.' },
  { value: 'balanceado', icon: <ScaleIcon />, title: 'Crecer con equilibrio', text: 'Balance entre riesgo moderado y crecimiento.' },
  { value: 'crecimiento', icon: <TrendingUpIcon />, title: 'Construir patrimonio', text: 'Maximizar el crecimiento a largo plazo.' },
]

export default function GoalUseCases({ onSelectGoal }) {
  return (
    <div>
      <h3 className="section-title">¿Qué quieres lograr con tu dinero?</h3>
      <div className="goals-grid">
        {GOALS.map(g => (
          <GoalCard
            key={g.value}
            icon={g.icon}
            title={g.title}
            text={g.text}
            onClick={() => onSelectGoal(g.value)}
          />
        ))}
      </div>
    </div>
  )
}
