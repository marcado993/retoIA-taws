import Chip from '../atoms/Chip.jsx'
import StatusChip from '../molecules/StatusChip.jsx'
import MetricTile from '../molecules/MetricTile.jsx'
import DecisionNote from '../molecules/DecisionNote.jsx'
import AgentBubble from '../molecules/AgentBubble.jsx'
import InstrumentLogo from '../molecules/InstrumentLogo.jsx'
import Treemap from './Treemap.jsx'

// HU2: propuesta explicable — catálogo aprobado, % de asignación, riesgo esperado,
// explicación legible y límites claros (no ejecuta órdenes, no promete rentabilidad).
export default function ProposalCard({ record, market }) {
  const { proposal, status } = record
  const quotes = market?.quotes || {}

  return (
    <div className="card">
      <div className="card-head">
        <h3>Propuesta de portafolio</h3>
        <StatusChip status={status} />
      </div>

      {/* Límites del sistema, visibles de entrada (HU2 criterio 3 · Nielsen H1) */}
      <div className="compliance" data-testid="compliance">
        <div className="compliance-item">🗂️ <strong>Catálogo aprobado</strong> v{proposal.catalog_version} — solo ETFs listados</div>
        <div className="compliance-item">🚫 <strong>No ejecuta órdenes</strong> — requiere asesor humano</div>
        <div className="compliance-item">📉 <strong>No promete rentabilidad</strong> — retornos simulados</div>
      </div>

      <Treemap allocation={proposal.allocation} />

      <div className="holdings">
        <div className="holdings-head">
          <span>Instrumento</span>
          <span className="holding-right">Peso · Precio de mercado</span>
        </div>
        {proposal.allocation.map(a => {
          const quote = quotes[a.ticker]
          return (
            <div key={a.ticker} className="holding-row" data-testid="holding-row">
              <InstrumentLogo domain={a.logo_domain} ticker={a.ticker} />
              <span className="holding-name">
                <strong>{a.ticker}</strong> · {a.name}
                <em>{a.issuer} · {a.asset_class} · riesgo {a.risk_level}/5</em>
              </span>
              <span className="holding-weight">{a.weight}%</span>
              <span className="holding-price">
                {quote?.price != null ? `$${quote.price}` : '—'}
                {quote?.change_pct != null && (
                  <em className={quote.change_pct >= 0 ? 'price-up' : 'price-down'}>
                    {quote.change_pct >= 0 ? '▲' : '▼'} {Math.abs(quote.change_pct)}%
                  </em>
                )}
              </span>
            </div>
          )
        })}
        {market && (
          <p className="market-source">
            Datos de mercado: {market.provider}{market.live ? ' · en vivo' : ''} ·{' '}
            {new Date(market.asof).toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="metric-row">
        <MetricTile label="Retorno esperado*" value={`${proposal.metrics.expected_return}%`} />
        <MetricTile label="Volatilidad" value={`${proposal.metrics.volatility}%`} />
        <MetricTile label="Riesgo" value={`${proposal.metrics.risk_level}/5`} />
        <MetricTile label="Clases de activo" value={proposal.metrics.diversification} />
      </div>

      <AgentBubble agent="Inversiones IA" icon="📊">
        {proposal.explanation}
      </AgentBubble>

      <p className="disclaimer" data-testid="disclaimer">⚠️ {proposal.disclaimer}</p>
      <DecisionNote decision={record.decision} />
    </div>
  )
}
