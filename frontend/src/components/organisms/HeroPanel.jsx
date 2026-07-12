import Chip from '../atoms/Chip.jsx'
import Button from '../atoms/Button.jsx'
import Gauge from '../molecules/Gauge.jsx'

// Panel degradado estilo referencia: saludo + gauge de puntaje de riesgo.
export default function HeroPanel({ clientName, profileResult, onSeeRules }) {
  return (
    <div className="hero-panel">
      <h2>Hola{clientName ? `, ${clientName}` : ''}</h2>
      <p className="hero-sub">Este es tu perfil de riesgo 🙂</p>
      {profileResult ? (
        <>
          <Chip tone="lime" className="hero-chip" data-testid="hero-profile-chip">
            ▲ Perfil {profileResult.profile.label}
          </Chip>
          <Gauge score={profileResult.score}
            label={`de 100 · reglas v${profileResult.rules_version}`}
            tooltip={`Puntaje ${profileResult.score}/100 · Perfil ${profileResult.profile.label}`} />
          <Button className="hero-btn" onClick={onSeeRules}>Ver cómo se calculó</Button>
        </>
      ) : (
        <>
          <Gauge score={0} label="completa el diagnóstico" />
          <p className="hero-hint">Tu puntaje aparecerá aquí con reglas 100% visibles.</p>
        </>
      )}
    </div>
  )
}
