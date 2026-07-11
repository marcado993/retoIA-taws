import Hero from '../organisms/Hero.jsx'
import ValuePillars from '../organisms/ValuePillars.jsx'
import GoalUseCases from '../organisms/GoalUseCases.jsx'
import TrustBar from '../organisms/TrustBar.jsx'

// Landing previa al cuestionario (HU1), estructurada como la de Betterment:
// hero → pilares de valor → casos de uso por objetivo → barra de confianza.
export default function LandingTemplate({ rulesVersion, catalogSize, onStart, onSelectGoal }) {
  return (
    <div className="landing">
      <Hero onStart={onStart} />
      <ValuePillars />
      <GoalUseCases onSelectGoal={onSelectGoal} />
      <TrustBar rulesVersion={rulesVersion} catalogSize={catalogSize} />
    </div>
  )
}
