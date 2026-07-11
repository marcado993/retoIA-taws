import Chip from '../atoms/Chip.jsx'
import InfluenceRow from '../molecules/InfluenceRow.jsx'
import KnockoutNote from '../molecules/KnockoutNote.jsx'

// HU1: reglas visibles y versionadas — el usuario entiende cómo se calcula su perfil.
export default function RulesCards({ questionnaire }) {
  return (
    <div className="rules-grid">
      <div className="card">
        <div className="card-head"><h3>Fórmula y pesos</h3>
          <Chip tone="lime" data-testid="rules-version">v{questionnaire.rules_version}</Chip>
        </div>
        <code className="formula" data-testid="rules-formula">{questionnaire.scoring_formula}</code>
        {questionnaire.questions.map(q => (
          <InfluenceRow key={q.id} label={q.text}
            fillPct={q.weight * 4} value={`${q.weight}%`} />
        ))}
      </div>
      <div className="card">
        <div className="card-head"><h3>Perfiles y reglas de protección</h3></div>
        {questionnaire.profiles.map(p => (
          <div key={p.id} className="profile-range">
            <Chip tone="neutral">{p.min_score}–{p.max_score}</Chip>
            <div><strong>{p.label}</strong><p>{p.description}</p></div>
          </div>
        ))}
        <h4 className="subhead">Knockouts (topes de protección)</h4>
        {questionnaire.knockouts.map(k => (
          <KnockoutNote key={k.id}>
            <strong>{k.condition}</strong> → perfil máximo <em>{k.cap_profile}</em>. {k.reason}
          </KnockoutNote>
        ))}
      </div>
    </div>
  )
}
