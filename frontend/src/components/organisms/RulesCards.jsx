import Chip from '../atoms/Chip.jsx'
import InfluenceRow from '../molecules/InfluenceRow.jsx'
import KnockoutNote from '../molecules/KnockoutNote.jsx'

// HU1: reglas visibles y versionadas — y ahora trazables a fuentes bibliográficas
// reales (regulación de idoneidad + literatura de tolerancia al riesgo), no un
// cuestionario propietario sin respaldo.
export default function RulesCards({ questionnaire }) {
  return (
    <div className="rules-grid">
      <div className="card">
        <div className="card-head"><h3>Fórmula y pesos</h3>
          <Chip tone="lime" data-testid="rules-version">v{questionnaire.rules_version}</Chip>
        </div>
        {questionnaire.methodology_note && (
          <p className="methodology-note" data-testid="methodology-note">{questionnaire.methodology_note}</p>
        )}
        <code className="formula" data-testid="rules-formula">{questionnaire.scoring_formula}</code>
        {questionnaire.questions.map(q => (
          <InfluenceRow key={q.id} label={q.text} sublabel={q.source}
            fillPct={q.weight * 4} value={`${q.weight}%`} testId="rules-question-row" />
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
            {k.source && <span className="knockout-source"> — {k.source}</span>}
          </KnockoutNote>
        ))}
      </div>
      {questionnaire.references?.length > 0 && (
        <div className="card rules-references" data-testid="rules-references">
          <div className="card-head"><h3>Referencias bibliográficas</h3></div>
          <p className="methodology-note">
            Cada pregunta y regla de protección cita la fuente académica o regulatoria de la
            que se adapta — así el cuestionario es auditable más allá de este sistema.
          </p>
          <ol className="reference-list">
            {questionnaire.references.map(r => (
              <li key={r.id} className="reference-item">
                <a href={r.url} target="_blank" rel="noopener noreferrer">{r.citation}</a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
