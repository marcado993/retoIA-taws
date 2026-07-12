import Button from '../atoms/Button.jsx'
import TickerListRow from '../molecules/TickerListRow.jsx'
import CtaNudge from '../molecules/CtaNudge.jsx'

// Sección hero estilo Betterment: headline aspiracional + CTA que revela el cuestionario (HU1).
// El panel visual es un carrusel vertical (estilo ticker de cripto) con TODO el
// catálogo real aprobado — precio y variación en vivo, en movimiento continuo.
export default function Hero({ onStart, market, catalog }) {
  const instruments = catalog?.instruments || []
  const quotes = market?.quotes || {}

  return (
    <div className="hero">
      <div className="hero-copy">
        <span className="hero-eyebrow">Track 3 · Robo-Advisory</span>
        <h1>Construye tu estrategia con reglas que puedes auditar</h1>
        <p className="hero-lede">
          Un diagnóstico transparente, una propuesta de portafolio explicable y un
          asesor humano autorizado que aprueba cada recomendación antes de dártela.
        </p>
        <div className="hero-cta-group">
          <CtaNudge>
            <Button data-testid="hero-cta" className="btn-pulse btn-shine" onClick={onStart}>
              Comenzar diagnóstico
            </Button>
          </CtaNudge>
          <span className="hero-fine">2 min · sin compromiso · nada se ejecuta automáticamente</span>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="terminal-card">
          <div className="terminal-head">
            <span className="terminal-label">Catálogo aprobado · {instruments.length} ETFs</span>
            <span className="terminal-live-dot" />
          </div>
          {instruments.length > 0 ? (
            <div className="ticker-marquee" data-testid="ticker-marquee">
              <div className="ticker-marquee-track">
                {[...instruments, ...instruments].map((inst, i) => (
                  <TickerListRow key={`${inst.ticker}-${i}`} instrument={inst} quote={quotes[inst.ticker]} />
                ))}
              </div>
            </div>
          ) : (
            <div className="ticker-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ticker-list-row ticker-list-row-skeleton" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
