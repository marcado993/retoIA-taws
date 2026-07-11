import Button from '../atoms/Button.jsx'
import Gauge from '../molecules/Gauge.jsx'

// Sección hero estilo Betterment: headline aspiracional + CTA que revela el cuestionario (HU1).
export default function Hero({ onStart }) {
  return (
    <div className="hero">
      <div className="hero-copy">
        <h1>Construye tu estrategia con reglas que puedes auditar</h1>
        <p className="hero-lede">
          Un diagnóstico transparente, una propuesta de portafolio explicable y un
          asesor humano autorizado que aprueba cada recomendación antes de dártela.
        </p>
        <Button data-testid="hero-cta" onClick={onStart}>Comenzar diagnóstico</Button>
        <p className="hero-fine">2 minutos · sin compromiso · nada se ejecuta automáticamente</p>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <Gauge score={72} label="ejemplo de perfil calculado" />
      </div>
    </div>
  )
}
