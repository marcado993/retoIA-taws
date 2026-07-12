import InstrumentLogo from './InstrumentLogo.jsx'
import MiniTrendLine from './MiniTrendLine.jsx'

// Fila de instrumento real (logo, nombre, mini-gráfico de tendencia real, precio,
// variación) — patrón de lista tipo "Popular" de apps de mercado.
export default function TickerListRow({ instrument, quote }) {
  const up = (quote?.change_pct ?? 0) >= 0
  return (
    <div className="ticker-list-row">
      <InstrumentLogo domain={instrument.logo_domain} ticker={instrument.ticker} />
      <span className="ticker-list-name">
        <strong>{instrument.ticker}</strong><em>{instrument.name}</em>
      </span>
      <MiniTrendLine history={quote?.history} up={up} />
      <span className="ticker-list-price">
        {quote?.price != null ? `$${quote.price}` : '—'}
      </span>
      <span className={`ticker-list-change ${up ? 'price-up' : 'price-down'}`}>
        {quote?.change_pct != null ? `${up ? '+' : ''}${quote.change_pct}%` : '···'}
      </span>
    </div>
  )
}
