import Button from '../atoms/Button.jsx'
import Hero from '../organisms/Hero.jsx'
import ValuePillars from '../organisms/ValuePillars.jsx'
import GoalUseCases from '../organisms/GoalUseCases.jsx'
import TrustBar from '../organisms/TrustBar.jsx'

// Landing previa al cuestionario (HU1), estructurada como la de Betterment:
// hero → pilares de valor → casos de uso por objetivo → barra de confianza.
// `onBackToPlan` solo se pasa cuando ya existe un plan activo (el cliente
// volvió al inicio desde el dashboard) — sin ella no hay callejón sin salida.
export default function LandingTemplate({ rulesVersion, catalogSize, market, catalog, onStart, onSelectGoal, onBackToPlan }) {
  return (
    <div className="landing">
      {onBackToPlan && (
        <div className="landing-back-row">
          <Button variant="ghost" data-testid="back-to-plan-btn" onClick={onBackToPlan}>
            ← Volver a mi plan financiero
          </Button>
        </div>
      )}
      <Hero onStart={onStart} market={market} catalog={catalog} />
      <ValuePillars />
      <GoalUseCases onSelectGoal={onSelectGoal} />
      <TrustBar rulesVersion={rulesVersion} catalogSize={catalogSize} />
    </div>
  )
}
