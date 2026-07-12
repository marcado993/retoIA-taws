import Chip from '../atoms/Chip.jsx'
import PillarCard from '../molecules/PillarCard.jsx'

const ShieldCheckIcon = () => (
  <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const ChartBarIcon = () => (
  <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const BankBuildingIcon = () => (
  <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const UserGroupIcon = () => (
  <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

// `hu` liga cada pilar a su historia de usuario del reto — visible para que un
// evaluador ubique de un vistazo las 3 historias mínimas cubiertas.
const PILLARS = [
  { icon: <ShieldCheckIcon />, hu: 'HU1', title: 'Diagnóstico transparente', text: 'Reglas de perfilamiento visibles y versionadas: ves exactamente cómo se calcula tu puntaje.' },
  { icon: <ChartBarIcon />, hu: 'HU2', title: 'Propuesta explicable', text: 'Asignación, riesgo esperado y una explicación en lenguaje claro, sin cajas negras.' },
  { icon: <BankBuildingIcon />, hu: 'HU2', title: 'Catálogo de ETFs reales', text: 'Instrumentos listados en bolsa con cotización en vivo, no simulaciones inventadas.' },
  { icon: <UserGroupIcon />, hu: 'HU3', title: 'Revisión humana obligatoria', text: 'Un asesor autorizado aprueba, edita o rechaza cada propuesta antes de recomendarla.' },
]

export default function ValuePillars() {
  return (
    <div className="pillars-grid">
      {PILLARS.map(p => (
        <div key={p.title} className="pillar-card">
          <div className="pillar-card-head">
            <div className="pillar-icon">{p.icon}</div>
            <Chip tone="neutral" className="pillar-hu-badge" data-testid="pillar-hu-badge">{p.hu}</Chip>
          </div>
          <h4 className="pillar-title">{p.title}</h4>
          <p className="pillar-text">{p.text}</p>
        </div>
      ))}
    </div>
  )
}
