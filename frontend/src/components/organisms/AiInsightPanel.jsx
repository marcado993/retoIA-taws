import { useState, useCallback } from 'react'

// ── SVG Icon Library (Professional replacement for emojis) ───────────────────

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
  <svg className={`${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const NewsIcon = () => (
  <svg className="w-4 h-4 text-brand-ink mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-4 h-4 text-brand-blue mr-2" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
)

const BankIcon = () => (
  <svg className="w-4 h-4 text-brand-blue mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const BrainIcon = () => (
  <svg className="w-4 h-4 text-brand-green mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const CheckIcon = ({ className = "w-5 h-5 text-brand-green" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const InfoIcon = () => (
  <svg className="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// ── AiInsightPanel ─────────────────────────────────────────────────────────────
export default function AiInsightPanel({ insight, news, onRefresh, loading }) {
  const [expanded, setExpanded] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState('mercado')
  const [newsExpanded, setNewsExpanded] = useState(false)

  const handleRefresh = useCallback(() => {
    if (!loading) onRefresh()
  }, [loading, onRefresh])

  if (!insight && !loading) return null

  const posNews = news?.filter(n => n.sentiment === 'positivo') ?? []
  const negNews = news?.filter(n => n.sentiment === 'negativo') ?? []
  const neuNews = news?.filter(n => n.sentiment === 'neutro')   ?? []

  return (
    <section
      className="ai-insight-panel animated-border-glow"
      aria-labelledby="ai-insight-heading"
      aria-live="polite"
      aria-busy={loading}
    >
      {/* Header */}
      <div className="ai-insight-header">
        <div className="ai-insight-title-row">
          <RobotIcon />
          <h2 id="ai-insight-heading" className="ai-insight-heading ml-2">
            Analizador de Inteligencia Artificial
          </h2>
          {/* Sentimiento global */}
          {insight && (
            <div className="ai-sentiment-bar" role="meter"
              aria-label={`Sentimiento: ${insight.pos_pct}% positivo, ${insight.neg_pct}% negativo`}>
              <span className="ai-sent-pos" style={{ width: `${insight.pos_pct}%` }}
                aria-hidden="true" />
              <span className="ai-sent-neg" style={{ width: `${insight.neg_pct}%` }}
                aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="ai-insight-controls">
          <button
            className="ai-refresh-btn interactive-glow"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Actualizar análisis de IA"
            aria-busy={loading}
          >
            {loading ? '⟳ Analizando…' : '⟳ Actualizar'}
          </button>
          <button
            className="ai-toggle-btn"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-controls="ai-insight-body"
            aria-label={expanded ? 'Colapsar panel IA' : 'Expandir panel IA'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Body colapsable */}
      {expanded && (
        <div id="ai-insight-body" className="ai-panel-body">
          
          {/* Tabs Internas del Panel de IA */}
          <div className="ai-tabs-nav" role="tablist" aria-label="Secciones del analizador de IA">
            <button 
              className={`ai-tab-btn ${activeSubTab === 'mercado' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeSubTab === 'mercado'}
              onClick={() => setActiveSubTab('mercado')}
            >
              Señales de Mercado
            </button>
            <button 
              className={`ai-tab-btn ${activeSubTab === 'inversores' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeSubTab === 'inversores'}
              onClick={() => setActiveSubTab('inversores')}
            >
              Ideas de Twitter & Grandes Inversores
            </button>
            <button 
              className={`ai-tab-btn ${activeSubTab === 'memoria' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeSubTab === 'memoria'}
              onClick={() => setActiveSubTab('memoria')}
            >
              Memoria del Sistema {insight?.past_memories?.length > 0 && <span className="badge-alert-dot" />}
            </button>
          </div>

          {loading && (
            <div className="ai-loading" role="status" aria-label="Cargando análisis de IA">
              <div className="ai-loading-dots" aria-hidden="true">
                <span /><span /><span />
              </div>
              <span className="ai-loading-text">Analizando noticias, tweets y decisiones anteriores…</span>
            </div>
          )}

          {insight && !loading && (
            <div className="ai-tab-content">
              {/* Resumen principal general */}
              <p className="ai-summary" role="status">
                {insight.summary}
              </p>

              {/* TAB 1: SEÑALES DE MERCADO */}
              {activeSubTab === 'mercado' && (
                <>
                  {/* Contexto de cotizaciones */}
                  {insight.market_ctx?.length > 0 && (
                    <div className="ai-market-ctx" aria-label="Cotizaciones recientes">
                      {insight.market_ctx.map((mkt, i) => {
                        const isUp = mkt.includes('▲')
                        return (
                          <span
                            key={i}
                            className={`ai-mkt-chip ${isUp ? 'ai-mkt-up' : 'ai-mkt-down'}`}
                            aria-label={mkt.replace('▲', 'subió').replace('▼', 'bajó')}
                          >
                            {mkt}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Alertas */}
                  {insight.alerts?.length > 0 && (
                    <div className="ai-alerts" role="list" aria-label="Alertas del analizador IA">
                      {insight.alerts.map((alert, i) => (
                        <AlertCard key={i} alert={alert} />
                      ))}
                    </div>
                  )}

                  {/* Ajuste sugerido */}
                  {insight.adjustments?.length > 0 && (
                    <div className="ai-adjustments" aria-label="Ajustes sugeridos de portafolio">
                      <h3 className="ai-sub-heading">Ajustes sugeridos por la IA</h3>
                      <ul className="ai-adj-list">
                        {insight.adjustments.map((adj, i) => (
                          <li key={i} className="ai-adj-item">
                            <DocIcon /> {adj}
                          </li>
                        ))}
                      </ul>
                      <p className="ai-disclaimer">
                        Sugerencias orientativas basadas en RAG financiero. No constituyen órdenes directas.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: TWITTER & GRANDES INVERSORES */}
              {activeSubTab === 'inversores' && (
                <div className="investors-tab-content">
                  {/* Twitter Retail Mood */}
                  {insight.twitter_sentiment && (
                    <div className="twitter-sentiment-card">
                      <div className="flex items-center mb-3">
                        <TwitterIcon />
                        <h4 className="card-sub-title mb-0">Twitter & Reddit Retail Sentiment</h4>
                      </div>
                      <p className="sentiment-stat">
                        Estado Minorista: <strong className="glow-green-text">{insight.twitter_sentiment.score}</strong>
                      </p>
                      <p className="sentiment-trend">
                        <strong>Tendencia Global:</strong> {insight.twitter_sentiment.trend}
                      </p>
                      <p className="sentiment-retail">
                        <strong>Comportamiento Minorista:</strong> {insight.twitter_sentiment.retail_mood}
                      </p>
                    </div>
                  )}

                  {/* Ideas de Grandes Inversores */}
                  {insight.investor_tips?.length > 0 && (
                    <div className="investor-tips-list">
                      <div className="flex items-center mb-3">
                        <BankIcon />
                        <h4 className="card-sub-title mb-0">Estrategia de Grandes Inversionistas</h4>
                      </div>
                      {insight.investor_tips.map((tip, i) => (
                        <div key={i} className="investor-tip-card">
                          <div className="investor-header">
                            <span className="investor-name">{tip.investor}</span>
                            <span className="investor-strategy-tag">{tip.strategy}</span>
                          </div>
                          <blockquote className="investor-quote">
                            "{tip.quote}"
                          </blockquote>
                          <p className="investor-rec">
                            <strong>Aplicación:</strong> {tip.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MEMORIA DE ERRORES & HITL */}
              {activeSubTab === 'memoria' && (
                <div className="memories-tab-content">
                  <div className="flex items-center mb-3">
                    <BrainIcon />
                    <h4 className="card-sub-title mb-0">Memoria del Asesor — Evitar Errores Recurrentes</h4>
                  </div>
                  <p className="memories-intro-text">
                    La IA analiza las decisiones pasadas registradas en el libro de auditoría para evitar repetir propuestas de riesgo inconsistentes.
                  </p>
                  
                  {insight.past_memories && insight.past_memories.length > 0 ? (
                    <div className="memories-list">
                      {insight.past_memories.map((mem, i) => (
                        <div key={i} className={`memory-item-card ${mem.type}`}>
                          <div className="memory-badge">
                            {mem.type === 'error_evitado' ? '🛑 ALERTA DE EVITACIÓN' : '📝 CONFIGURACIÓN PREFERIDA'}
                          </div>
                          <p className="memory-msg">{mem.message}</p>
                          {mem.reason && (
                            <p className="memory-reason">
                              <strong>Motivo del rechazo original:</strong> {mem.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-memories-card">
                      <CheckIcon className="w-8 h-8 text-brand-green mb-2" />
                      <p>No se registran rechazos ni modificaciones recientes en la auditoría. Los perfiles actuales cumplen las directrices estándar.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Panel de noticias */}
          {news?.length > 0 && (
            <div className="ai-news-section">
              <button
                className="ai-news-toggle"
                onClick={() => setNewsExpanded(n => !n)}
                aria-expanded={newsExpanded}
                aria-controls="ai-news-list"
                aria-label={newsExpanded ? 'Ocultar noticias' : 'Mostrar noticias financieras'}
              >
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
                  {news.map((item, i) => (
                    <NewsItem key={i} item={item} />
                  ))}
                </ul>
              )}
            </div>
          )}

          {insight && (
            <p className="ai-asof">
              Actualizado: {new Date(insight.asof).toLocaleTimeString('es-MX', {
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

// ── AlertCard ──────────────────────────────────────────────────────────────────
function AlertCard({ alert }) {
  const levelClass = {
    critical: 'alert-critical',
    warning:  'alert-warning',
    positive: 'alert-positive',
    info:     'alert-info',
  }[alert.level] || 'alert-info'

  const levelLabel = {
    critical: 'Alerta crítica',
    warning:  'Advertencia',
    positive: 'Señal positiva',
    info:     'Información',
  }[alert.level] || 'Información'

  return (
    <article
      className={`ai-alert ${levelClass}`}
      role="listitem"
      aria-label={`${levelLabel}: ${alert.title}`}
    >
      <div className="ai-alert-header">
        {alert.level === 'critical' ? <WarningIcon className="w-5 h-5 text-brand-red mr-2" /> : <InfoIcon />}
        <div>
          <span className="ai-alert-badge" aria-label={levelLabel}>{levelLabel}</span>
          <h4 className="ai-alert-title">{alert.title}</h4>
        </div>
      </div>
      <p className="ai-alert-msg">{alert.message}</p>
      <p className="ai-alert-action">
        <CheckIcon className="w-4 h-4 mr-1 text-brand-blue inline-block" /> {alert.action}
      </p>
    </article>
  )
}

// ── NewsItem ──────────────────────────────────────────────────────────────────
function NewsItem({ item }) {
  const sentClass = {
    positivo: 'news-pos',
    negativo: 'news-neg',
    neutro:   'news-neu',
  }[item.sentiment] || 'news-neu'

  const sentLabel = {
    positivo: 'Sentimiento positivo',
    negativo: 'Sentimiento negativo',
    neutro:   'Sentimiento neutro',
  }[item.sentiment] || 'neutro'

  return (
    <li
      role="listitem"
      className={`ai-news-item ${sentClass}`}
      aria-label={`${sentLabel} — ${item.title}`}
    >
      <div className="ai-news-content">
        {item.url && item.url !== '#'
          ? <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="ai-news-title">{item.title}</a>
          : <span className="ai-news-title">{item.title}</span>
        }
        <span className="ai-news-source">{item.source}</span>
      </div>
    </li>
  )
}
