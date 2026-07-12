// Contexto de mercado con IA (alineación de la propuesta con noticias + mercado).
// Muestra la narrativa generada por el agente y la evidencia determinística:
// qué instrumentos del portafolio suben hoy y qué temas dominan los titulares.
// No cambia pesos: es contexto para el cliente y el asesor (HITL).
const THEME_LABELS = {
  geopolitical: 'Tensión geopolítica',
  recession: 'Riesgo de recesión',
  inflation: 'Inflación y tasas',
  tech_rally: 'Rally tecnológico',
  commodity: 'Materias primas',
}

export default function MarketContextCard({ marketContext }) {
  if (!marketContext) return null
  const { signals = {}, narrative, source } = marketContext
  const growingInPort = signals.growing_in_portfolio || []
  const themes = signals.active_themes || []
  const bySource = source && source.startsWith('gemini')
    ? { label: 'IA · Gemini', tone: 'chip-green' }
    : { label: 'IA · alineación', tone: 'chip-neutral' }

  return (
    <div className="market-context" data-testid="market-context">
      <div className="market-context-head">
        <h4 className="market-context-title">📡 Contexto de mercado · alineación</h4>
        <span className={`chip ${bySource.tone}`}>{bySource.label}</span>
      </div>

      <p className="market-context-narrative">{narrative}</p>

      {growingInPort.length > 0 && (
        <div className="market-context-block">
          <span className="market-context-label">En tu portafolio, hoy suben</span>
          <div className="market-context-chips">
            {growingInPort.map(g => (
              <span key={g.ticker} className="mkt-up-chip" data-testid="mkt-up-chip">
                {g.ticker} ▲ {g.change_pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {themes.length > 0 && (
        <div className="market-context-block">
          <span className="market-context-label">Temas en los titulares</span>
          <div className="market-context-chips">
            {themes.map(t => (
              <span key={t} className="mkt-theme-chip">{THEME_LABELS[t] || t}</span>
            ))}
          </div>
        </div>
      )}

      <p className="market-context-foot">
        Contexto informativo — no modifica los pesos ni ejecuta órdenes. Cualquier ajuste lo decide el asesor.
      </p>
    </div>
  )
}
