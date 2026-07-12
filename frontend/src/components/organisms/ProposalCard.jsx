import { useState } from 'react'
import StatusChip from '../molecules/StatusChip.jsx'
import BigNumber from '../molecules/BigNumber.jsx'
import DecisionNote from '../molecules/DecisionNote.jsx'
import AgentBubble from '../molecules/AgentBubble.jsx'
import InstrumentLogo from '../molecules/InstrumentLogo.jsx'
import MarketContextCard from '../molecules/MarketContextCard.jsx'
import ClientMemoryCard from '../molecules/ClientMemoryCard.jsx'
import Button from '../atoms/Button.jsx'
import Treemap from './Treemap.jsx'
import GoalFitCard from './GoalFitCard.jsx'
import SlideOver from './SlideOver.jsx'
import { api } from '../../api.js'

// Traducción de la "caja negra" (spec §2): en vez de un párrafo denso, se responde
// "¿Por qué esta diversificación?" con viñetas cortas derivadas de los propios datos
// de la propuesta (clases de activo, dominante, riesgo). Es explicación, no promesa.
function buildReasons(proposal, profileLabel) {
  const alloc = proposal.allocation
  const classes = [...new Set(alloc.map(a => a.asset_class))]
  const top = [...alloc].sort((a, b) => b.weight - a.weight)[0]
  const byClass = {}
  alloc.forEach(a => { byClass[a.asset_class] = (byClass[a.asset_class] || 0) + a.weight })
  const domClass = Object.entries(byClass).sort((a, b) => b[1] - a[1])[0]

  return [
    `Se reparte en ${classes.length} clases de activo distintas para no depender de un solo mercado.`,
    `Coherente con tu perfil ${profileLabel}: ${domClass[0].toLowerCase()} concentra el ${domClass[1]}% de la cartera.`,
    `La posición individual más grande (${top.ticker}, ${top.weight}%) se mantiene acotada para diluir el riesgo.`,
    `Volatilidad estimada del ${proposal.metrics.volatility}% y riesgo ${proposal.metrics.risk_level}/5: el nivel que tu perfil declaró tolerar.`,
  ]
}

// HU2: propuesta explicable — catálogo aprobado, % de asignación, riesgo esperado,
// explicación legible y límites claros (no ejecuta órdenes, no promete rentabilidad).
// El detalle denso (tabla de instrumentos, límites del sistema, razonamiento) vive en
// un modal bajo demanda: la vista principal muestra solo lo esencial, sin scroll largo.
export default function ProposalCard({ record, market }) {
  const { proposal, status } = record
  const quotes = market?.quotes || {}
  const profileLabel = record.profile_result?.profile?.label || '—'
  const reasons = buildReasons(proposal, profileLabel)
  const [detailOpen, setDetailOpen] = useState(false)
  const canDownloadReport = status !== 'pendiente'

  const downloadReport = () => {
    const link = document.createElement('a')
    link.href = api.suitabilityReportUrl(record.id)
    link.download = `reporte-idoneidad-${record.id}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Propuesta de portafolio</h3>
        <StatusChip status={status} />
      </div>

      {/* Memoria del agente: si ya conocíamos a este cliente, se dice primero. */}
      <ClientMemoryCard clientMemory={proposal.client_memory} />

      {/* Big Numbers (spec §2): el ojo busca certezas — riesgo y rendimiento primero. */}
      <div className="big-numbers" data-testid="big-numbers">
        <BigNumber label="Nivel de riesgo" value={profileLabel} tone="ink"
          sub={`Riesgo ${proposal.metrics.risk_level}/5`} />
        <BigNumber label="Rendimiento esperado*" value={`${proposal.metrics.expected_return}%`} tone="green"
          sub="Anual, simulado" />
        <BigNumber label="Volatilidad" value={`${proposal.metrics.volatility}%`} tone="ink"
          sub="Variación esperada" />
      </div>

      {/* Meta personalizada del cliente (HU2, enfoque de agente personalizado):
          comparación estructurada, no una frase perdida dentro del párrafo. */}
      <GoalFitCard goalFit={proposal.goal_fit} />

      <Treemap allocation={proposal.allocation} />

      <div className="proposal-detail-trigger">
        <span className="proposal-detail-hint">
          {proposal.metrics.diversification} instrumentos · catálogo aprobado v{proposal.catalog_version}
        </span>
        <div className="proposal-detail-actions">
          <Button variant="ghost" data-testid="open-proposal-detail"
            onClick={() => setDetailOpen(true)}>
            Ver instrumentos, precios y límites
          </Button>
          {canDownloadReport && (
            <Button variant="ghost" data-testid="download-suitability-report"
              onClick={downloadReport}>
              Descargar PDF
            </Button>
          )}
        </div>
      </div>

      <AgentBubble agent="Inversiones IA">
        {proposal.explanation}
      </AgentBubble>

      {/* Alineación IA con noticias + mercado (news → propuesta). */}
      <MarketContextCard marketContext={proposal.market_context} />

      <p className="disclaimer" data-testid="disclaimer">{proposal.disclaimer}</p>
      <DecisionNote decision={record.decision} />

      <SlideOver open={detailOpen} title="Instrumentos, precios y límites de esta propuesta"
        onClose={() => setDetailOpen(false)}>
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
                      {quote.change_pct >= 0 ? '+' : '−'}{Math.abs(quote.change_pct)}%
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

        <div className="diversification-why" data-testid="diversification-why">
          <h4 className="diversification-why-title">¿Por qué esta diversificación?</h4>
          <ul className="diversification-why-list">
            {reasons.map((r, i) => (
              <li key={i} className="diversification-why-item">{r}</li>
            ))}
          </ul>
        </div>

        {/* Límites del sistema (HU2 criterio 3 · Nielsen H1) */}
        <div className="compliance" data-testid="compliance">
          <div className="compliance-item"><strong>Catálogo aprobado</strong> v{proposal.catalog_version} — solo ETFs listados</div>
          <div className="compliance-item"><strong>No ejecuta órdenes</strong> — requiere asesor humano</div>
          <div className="compliance-item"><strong>No promete rentabilidad</strong> — retornos simulados</div>
        </div>
      </SlideOver>
    </div>
  )
}
