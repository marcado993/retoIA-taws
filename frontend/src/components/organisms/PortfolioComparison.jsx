import Chip from '../atoms/Chip.jsx'
import Donut from '../molecules/Donut.jsx'
import MetricTile from '../molecules/MetricTile.jsx'

// Métricas ponderadas por portafolio modelo — mismo cálculo que build_proposal() en el
// backend (inversiones_ia.py), reproducido aquí porque solo se necesita para comparar,
// sin crear una propuesta real ni tocar el flujo de aprobación.
function computeMetrics(model, instruments) {
  let expectedReturn = 0, volatility = 0, risk = 0
  const allocation = model.map(line => {
    const inst = instruments[line.ticker]
    const w = line.weight / 100
    expectedReturn += w * inst.expected_return
    volatility += w * inst.volatility
    risk += w * inst.risk_level
    return { ...inst, weight: line.weight }
  })
  return {
    allocation,
    expectedReturn: Math.round(expectedReturn * 10) / 10,
    volatility: Math.round(volatility * 10) / 10,
    risk: Math.round(risk * 10) / 10,
  }
}

// Equivalente a "Explore portfolio options" de Betterment: comparación lado a lado
// de los 3 portafolios modelo, sin generar propuesta ni requerir el cuestionario (HU2).
export default function PortfolioComparison({ catalog, profiles }) {
  const instruments = Object.fromEntries(catalog.instruments.map(i => [i.ticker, i]))

  return (
    <>
    <div className="portfolio-compare">
      {profiles.map(profile => {
        const model = catalog.model_portfolios[profile.id]
        const m = computeMetrics(model, instruments)
        return (
          <div key={profile.id} className="card portfolio-card" data-testid="portfolio-card">
            <div className="card-head">
              <h3>{profile.label}</h3>
              <Chip tone="neutral">score {profile.min_score}–{profile.max_score}</Chip>
            </div>
            <p className="portfolio-desc">{profile.description}</p>
            <Donut size="sm" allocation={m.allocation}
              centerTop={`${m.expectedReturn}%`} centerBottom="ret. esperado" />
            <div className="metric-row">
              <MetricTile label="Retorno esperado*" value={`${m.expectedReturn}%`} />
              <MetricTile label="Volatilidad" value={`${m.volatility}%`} />
              <MetricTile label="Riesgo" value={`${m.risk}/5`} />
            </div>
            <ul className="portfolio-holdings">
              {m.allocation.sort((a, b) => b.weight - a.weight).map(a => (
                <li key={a.ticker}><strong>{a.ticker}</strong> {a.weight}% <span>{a.name}</span></li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
    <p className="disclaimer" data-testid="portfolio-disclaimer">⚠️ {catalog.disclaimer}</p>
    </>
  )
}
