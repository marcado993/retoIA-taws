import { useState, useCallback } from 'react'
import Treemap from './Treemap.jsx'
import SlideOver from './SlideOver.jsx'
import Button from '../atoms/Button.jsx'
import MetricTile from '../molecules/MetricTile.jsx'
import CtaNudge from '../molecules/CtaNudge.jsx'
import AiInsightSkeleton from '../molecules/AiInsightSkeleton.jsx'

// ── SVG Icon Library ──────────────────────────────────────────────────────
const RobotIcon = () => (
  <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
)
const DocIcon = () => (
  <svg className="w-4 h-4 text-brand-green mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const WarningIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)
const NewsIcon = () => (
  <svg className="w-4 h-4 text-brand-ink mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
  </svg>
)
const InfoIcon = () => (
  <svg className="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// ── AiInsightPanel ─────────────────────────────────────────────────────────
// Nielsen H2 (lenguaje del mundo real) + H6 (reconocer, no recordar): en vez de
// pestañas anidadas que esconden contenido, todo vive en una sola columna con
// secciones claras. H1: el propósito del panel se explica en una línea, arriba
// de todo. La propuesta del cliente (HU2, treemap) es el primer bloque visual,
// no texto — resuelve la queja de que HU2 "no se ve" en ningún lado.
export default function AiInsightPanel({ insight, news, onRefresh, loading, record, market, onGoDashboard }) {
  const [expanded, setExpanded] = useState(true)
  // Abiertos por defecto: la columna lateral (contexto + noticias) se veía
  // vacía/angosta junto a las alertas mientras estuvieran colapsados detrás de
  // un toggle — al abrirlos de entrada se aprovecha el espacio disponible.
  const [newsExpanded, setNewsExpanded] = useState(true)
  const [contextExpanded, setContextExpanded] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    if (!loading) onRefresh()
  }, [loading, onRefresh])

  if (!insight && !loading) return null

  const posNews = news?.filter(n => n.sentiment === 'positivo') ?? []
  const negNews = news?.filter(n => n.sentiment === 'negativo') ?? []
  const neuNews = news?.filter(n => n.sentiment === 'neutro') ?? []

  return (
    <section className="ai-insight-panel animated-border-glow" aria-labelledby="ai-insight-heading"
      aria-live="polite" aria-busy={loading}>
      <div className="ai-insight-header">
        <div className="ai-insight-title-row">
          <RobotIcon />
          <div className="ai-insight-title-col">
            <h2 id="ai-insight-heading" className="ai-insight-heading">Análisis de mercado</h2>
            <p className="ai-insight-subtitle">Cómo las noticias de hoy conectan con tu propuesta de portafolio</p>
          </div>
          {insight && (
            <div className="ai-sentiment-bar" role="meter"
              aria-label={`Sentimiento: ${insight.pos_pct}% positivo, ${insight.neg_pct}% negativo`}>
              <span className="ai-sent-pos" style={{ width: `${insight.pos_pct}%` }} aria-hidden="true" />
              <span className="ai-sent-neg" style={{ width: `${insight.neg_pct}%` }} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="ai-insight-controls">
          <button className="ai-refresh-btn interactive-glow" onClick={handleRefresh}
            disabled={loading} aria-label="Actualizar análisis de IA" aria-busy={loading}>
            {loading ? 'Analizando…' : 'Actualizar'}
          </button>
          <button className="ai-toggle-btn" onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded} aria-controls="ai-insight-body"
            aria-label={expanded ? 'Colapsar panel' : 'Expandir panel'}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div id="ai-insight-body" className="ai-panel-body">
          {loading && <AiInsightSkeleton />}

          {insight && !loading && (
            <>
              <p className="ai-summary" role="status">{insight.summary}</p>

              {/* HU2 + trazabilidad: un botón explícito "Generar" abre el reporte completo
                  (propuesta, noticias que lo respaldan y qué modelo lo redactó) en vez de
                  cargarlo todo en silencio — se siente como una acción real de IA, no magia. */}
              <GenerateReportTrigger record={record} onGoDashboard={onGoDashboard}
                onOpen={() => setReportOpen(true)} />

              {insight.market_ctx?.length > 0 && (
                <div className="ai-market-ctx" aria-label="Cotizaciones recientes">
                  {insight.market_ctx.map((mkt, i) => (
                    <span key={i} className={`ai-mkt-chip ${mkt.includes('▲') ? 'ai-mkt-up' : 'ai-mkt-down'}`}>
                      {mkt}
                    </span>
                  ))}
                </div>
              )}

              {/* Grid de 2 columnas en pantallas anchas (tablet horizontal / split-screen
                  en adelante): lo accionable (alertas, ajustes) a la izquierda y el
                  contexto de apoyo (estado del mercado, principios, noticias) a la
                  derecha — en vez de apilar todo en una columna larga que obligaba a
                  un scroll considerable para llegar a las noticias. */}
              <div className="ai-panel-grid">
                <div className="ai-panel-main">
                  {insight.alerts?.length > 0 && (
                    <div className="ai-alerts" role="list" aria-label="Alertas del analizador IA">
                      {insight.alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
                    </div>
                  )}

                  {insight.adjustments?.length > 0 && (
                    <div className="ai-adjustments" aria-label="Ajustes sugeridos de portafolio">
                      <h3 className="ai-sub-heading">Ajustes sugeridos por la IA</h3>
                      <ul className="ai-adj-list">
                        {insight.adjustments.map((adj, i) => (
                          <li key={i} className="ai-adj-item"><DocIcon /> {adj}</li>
                        ))}
                      </ul>
                      <p className="ai-disclaimer">
                        Sugerencias orientativas basadas en las noticias analizadas. No constituyen órdenes directas.
                      </p>
                    </div>
                  )}

                  {!(insight.alerts?.length > 0) && !(insight.adjustments?.length > 0) && (
                    <p className="ai-panel-empty-hint">
                      Sin alertas ni ajustes sugeridos en este ciclo de noticias — mercado en calma relativa.
                    </p>
                  )}
                </div>

                <div className="ai-panel-side">
                  {/* Contexto (colapsado por defecto): por qué la IA piensa esto —
                      <details> nativo, sin JS de pestañas, accesible por teclado de fábrica. */}
                  <details className="ai-context" open={contextExpanded}
                    onToggle={e => setContextExpanded(e.target.open)}>
                    <summary className="ai-context-summary">
                      Contexto: estado de ánimo del mercado y principios de inversión
                    </summary>
                    <div className="ai-context-body">
                      {insight.market_mood && (
                        <div className="mood-card">
                          <span className={`mood-badge mood-${insight.market_mood.mood.toLowerCase()}`}>
                            {insight.market_mood.mood}
                          </span>
                          <span className="mood-detail">
                            {insight.market_mood.pos_pct}% de las noticias positivas ·{' '}
                            {insight.market_mood.neg_pct}% negativas · temas: {insight.market_mood.topics.join(', ')}
                          </span>
                        </div>
                      )}

                      {insight.investor_tips?.length > 0 && (
                        <div className="investor-tips-list">
                          {insight.investor_tips.map((tip, i) => (
                            <div key={i} className="investor-tip-card">
                              <div className="investor-header">
                                <span className="investor-name">{tip.investor}</span>
                                <span className="investor-strategy-tag">{tip.strategy}</span>
                              </div>
                              <p className="investor-quote">{tip.principle}</p>
                              <p className="investor-rec">{tip.context}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {insight.past_memories?.length > 0 && (
                        <div className="memories-list">
                          {insight.past_memories.map((mem, i) => (
                            <div key={i} className={`memory-item-card ${mem.type}`}>
                              <div className="memory-badge">
                                {mem.type === 'error_evitado' ? 'ALERTA DE EVITACIÓN' : 'CONFIGURACIÓN PREFERIDA'}
                              </div>
                              <p className="memory-msg">{mem.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>

                  {news?.length > 0 && (
                    <div className="ai-news-section">
                      <button className="ai-news-toggle" onClick={() => setNewsExpanded(n => !n)}
                        aria-expanded={newsExpanded} aria-controls="ai-news-list"
                        aria-label={newsExpanded ? 'Ocultar noticias' : 'Mostrar noticias financieras'}>
                        <NewsIcon />
                        <span className="ml-1">Noticias financieras ({news.length})</span>
                        <span className="ai-news-counts" aria-hidden="true">
                          {posNews.length > 0 && <span className="nc-pos">+{posNews.length}</span>}
                          {negNews.length > 0 && <span className="nc-neg">−{negNews.length}</span>}
                          {neuNews.length > 0 && <span className="nc-neu">○{neuNews.length}</span>}
                        </span>
                        <span className="ai-news-arrow">{newsExpanded ? '▲' : '▼'}</span>
                      </button>
                      {newsExpanded && (
                        <ul id="ai-news-list" className="ai-news-list" role="list">
                          {news.map((item, i) => <NewsItem key={i} item={item} />)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="ai-asof">
                Actualizado: {new Date(insight.asof).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          )}
        </div>
      )}

      <SlideOver open={reportOpen} title="Reporte de análisis — tu propuesta"
        onClose={() => setReportOpen(false)}>
        <AnalysisReport record={record} insight={insight} market={market} />
      </SlideOver>
    </section>
  )
}

// ── Disparador del reporte: botón "Generar" (o estado vacío si no hay propuesta) ──
function GenerateReportTrigger({ record, onGoDashboard, onOpen }) {
  if (!record) {
    return (
      <div className="ai-my-proposal ai-my-proposal-empty">
        <p>Aún no tienes una propuesta. Completa el diagnóstico para generar el análisis aquí.</p>
        {onGoDashboard && (
          <CtaNudge label="¡Empieza aquí!">
            <Button variant="ghost" className="btn-pulse" onClick={onGoDashboard}>Ir al diagnóstico</Button>
          </CtaNudge>
        )}
      </div>
    )
  }
  return (
    <div className="ai-generate-trigger">
      <div>
        <strong>Reporte de análisis disponible</strong>
        <p>Propuesta, noticias que la respaldan y qué modelo redactó cada parte.</p>
      </div>
      <CtaNudge>
        <Button data-testid="generate-report-btn" className="btn-pulse btn-shine" onClick={onOpen}>
          Generar análisis
        </Button>
      </CtaNudge>
    </div>
  )
}

// ── Reporte completo (dentro del modal): propuesta → evidencia → modelo ──────
function AnalysisReport({ record, insight, market }) {
  if (!record) return null
  const { proposal, profile_result } = record

  return (
    <div className="analysis-report" data-testid="analysis-report">
      <section className="analysis-report-section">
        <h4 className="ai-sub-heading">1 · Propuesta (HU2)</h4>
        <p className="analysis-report-hint">
          Catálogo aprobado v{proposal.catalog_version} · perfil {profile_result?.profile?.label} ·
          {' '}{market?.live ? 'cotizaciones en vivo' : 'cotizaciones diferidas'}
        </p>
        <Treemap allocation={proposal.allocation} />
        <div className="metric-row">
          <MetricTile label="Retorno esperado*" value={`${proposal.metrics.expected_return}%`} />
          <MetricTile label="Volatilidad" value={`${proposal.metrics.volatility}%`} />
          <MetricTile label="Riesgo" value={`${proposal.metrics.risk_level}/5`} />
        </div>
        <p className="analysis-report-explanation">{proposal.explanation}</p>
        <p className="ai-disclaimer">{proposal.disclaimer}</p>
      </section>

      <section className="analysis-report-section">
        <h4 className="ai-sub-heading">2 · Noticias que respaldan este análisis</h4>
        {insight?.supporting_news?.length > 0 ? (
          <ul className="ai-news-list" role="list">
            {insight.supporting_news.map((item, i) => <NewsItem key={i} item={item} />)}
          </ul>
        ) : (
          <p className="analysis-report-hint">
            Ninguna noticia del ciclo actual disparó un tema específico — el análisis se basa
            en el sentimiento general (ver resumen arriba).
          </p>
        )}
      </section>

      <section className="analysis-report-section">
        <h4 className="ai-sub-heading">3 · Modelo de IA</h4>
        <ul className="ai-model-list">
          <li><strong>Asesor Financiero IA</strong> — calcula el perfil con reglas versionadas
            (v{profile_result?.rules_version}), sin modelo generativo: puntaje 100% reproducible.</li>
          <li><strong>Inversiones IA</strong> — construye la asignación desde el catálogo aprobado
            (determinístico) y redacta la explicación con{' '}
            <span className="ai-model-badge">
              {proposal.explanation_source && proposal.explanation_source.startsWith('gemini')
                ? `Google Gemini (${proposal.explanation_source})`
                : 'plantilla determinística (sin LLM)'}
            </span>.</li>
          <li><strong>Análisis de mercado</strong> — noticias de RSS financiero real (con
            snapshot diferido si no hay red) y cotizaciones de Yahoo Finance; el estado de
            ánimo y las alertas se calculan del sentimiento real, no se inventan.</li>
        </ul>
      </section>
    </div>
  )
}

// ── AlertCard ────────────────────────────────────────────────────────────
function AlertCard({ alert }) {
  const levelClass = { critical: 'alert-critical', warning: 'alert-warning', positive: 'alert-positive', info: 'alert-info' }[alert.level] || 'alert-info'
  const levelLabel = { critical: 'Alerta crítica', warning: 'Advertencia', positive: 'Señal positiva', info: 'Información' }[alert.level] || 'Información'
  return (
    <article className={`ai-alert ${levelClass}`} role="listitem" aria-label={`${levelLabel}: ${alert.title}`}>
      <div className="ai-alert-header">
        {alert.level === 'critical' ? <WarningIcon className="w-5 h-5 text-brand-red mr-2" /> : <InfoIcon />}
        <div>
          <span className="ai-alert-badge">{levelLabel}</span>
          <h4 className="ai-alert-title">{alert.title}</h4>
        </div>
      </div>
      <p className="ai-alert-msg">{alert.message}</p>
      <p className="ai-alert-action">{alert.action}</p>
    </article>
  )
}

// ── NewsItem ─────────────────────────────────────────────────────────────
// Hace cuánto se publicó, en formato corto ("5m", "2h", "3d") — mismo lenguaje
// visual que un feed de noticias real en vez de una marca de tiempo completa.
function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const SENTIMENT = {
  positivo: { cls: 'news-pos', label: 'Positivo', icon: '📈' },
  negativo: { cls: 'news-neg', label: 'Negativo', icon: '📉' },
  neutro:   { cls: 'news-neu', label: 'Neutro',   icon: '📰' },
}

// Tarjeta de noticia (no una fila de texto plano): ícono de sentimiento a la
// izquierda, etiqueta de tono, titular en negrita y fuente + antigüedad abajo
// — mismo lenguaje visual que un feed editorial (imagen + tags + titular).
function NewsItem({ item }) {
  const { cls, label, icon } = SENTIMENT[item.sentiment] || SENTIMENT.neutro
  const hasLink = item.url && item.url !== '#'
  const Wrapper = hasLink ? 'a' : 'div'
  const wrapperProps = hasLink
    ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
    : {}
  return (
    <li role="listitem" className={`news-card ${cls}`} aria-label={`Sentimiento ${label} — ${item.title}`}>
      <Wrapper className="news-card-link" {...wrapperProps}>
        <span className="news-card-icon" aria-hidden="true">{icon}</span>
        <div className="news-card-body">
          <span className="news-card-tag">{label}</span>
          <h4 className="news-card-title">{item.title}</h4>
          <span className="news-card-meta">{item.source} · {timeAgo(item.ts)}</span>
        </div>
      </Wrapper>
    </li>
  )
}
