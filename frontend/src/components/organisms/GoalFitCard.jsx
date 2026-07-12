import Chip from '../atoms/Chip.jsx'
import MetricTile from '../molecules/MetricTile.jsx'

const fmtUSD = (n) => `$${Number(n).toLocaleString('es', { maximumFractionDigits: 0 })}`

// Compara la meta del cliente (monto, plazo, aporte mensual) contra el retorno
// esperado de la propuesta. Todos los números vienen ya calculados del backend
// (goal_fit): este componente solo los presenta, no calcula ni redacta consejos
// — evita repetir el error de mezclar cifras auditables con afirmaciones inventadas.
export default function GoalFitCard({ goalFit }) {
  if (!goalFit) return null
  const { target_amount, target_years, monthly_contrib, total_invested,
    needed_return_pct, portfolio_return_pct, gap_pct, on_track } = goalFit

  return (
    <div className="goal-fit-card" data-testid="goal-fit-card">
      <div className="goal-fit-head">
        <strong>Meta financiera del cliente</strong>
        <Chip tone={on_track ? 'green' : 'yellow'} data-testid="goal-fit-status">
          {on_track ? '✓ En camino con este portafolio' : '⚠ Requiere ajustar aporte, plazo o expectativa'}
        </Chip>
      </div>
      <p className="goal-fit-desc">
        Acumular <strong>{fmtUSD(target_amount)}</strong> en <strong>{target_years} años</strong>{' '}
        aportando <strong>{fmtUSD(monthly_contrib)}/mes</strong> ({fmtUSD(total_invested)} aportados en total).
      </p>
      <div className="metric-row">
        <MetricTile label="Retorno anual necesario" value={`${needed_return_pct}%`} />
        <MetricTile label="Retorno de esta propuesta" value={`${portfolio_return_pct}%`} />
        <MetricTile label="Brecha" value={`${gap_pct > 0 ? '+' : ''}${gap_pct} pp`} />
      </div>
      <p className="goal-fit-fine">
        Comparación informativa entre lo que la meta requeriría y el retorno simulado del
        portafolio propuesto — no es una proyección garantizada ni una promesa de rentabilidad.
      </p>
    </div>
  )
}
