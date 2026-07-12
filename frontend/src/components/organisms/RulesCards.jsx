import { useState } from 'react'
import Chip from '../atoms/Chip.jsx'
import InfluenceRow from '../molecules/InfluenceRow.jsx'

const ICONS = {
  objetivo:     '🎯',
  horizonte:    '⏳',
  reaccion:     '🧠',
  experiencia:  '📊',
  ingresos:     '💰',
  emergencia:   '🛡️',
}

const PROFILE_ICONS = {
  conservador:       '🏦',
  moderado_conservador: '📈',
  moderado:          '⚖️',
  moderado_agresivo: '🔥',
  agresivo:          '🚀',
}

function Accordion({ title, icon, badge, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className={`rules-accordion ${open ? 'open' : ''}`}>
      <button type="button" className="rules-accordion-trigger"
        aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="rules-accordion-left">
          {icon && <span className="rules-accordion-icon">{icon}</span>}
          <span className="rules-accordion-title">{title}</span>
        </span>
        <span className="rules-accordion-right">
          {badge}
          <span className="rules-accordion-hint">{open ? 'Ocultar' : 'Ver detalle'}</span>
          <span className={`rules-accordion-arrow ${open ? 'open' : ''}`} aria-hidden="true">&#9662;</span>
        </span>
      </button>
      {open && <div className="rules-accordion-body">{children}</div>}
    </div>
  )
}

export default function RulesCards({ questionnaire }) {
  return (
    <div className="rules-redesign">
      {/* Header */}
      <div className="rules-header">
        <div className="rules-header-text">
          <h2 className="rules-main-title">Reglas del Motor de Perfilamiento</h2>
          <p className="rules-main-sub">
            Cada pregunta, peso y tope de protección es público, versionado y auditable.
            Nada se oculta: puedes verificar exactamente cómo se calcula tu perfil.
          </p>
        </div>
        <Chip tone="lime" data-testid="rules-version">v{questionnaire.rules_version}</Chip>
      </div>

      {/* Methodology note */}
      {questionnaire.methodology_note && (
        <div className="rules-methodology" data-testid="methodology-note">
          <span className="rules-methodology-icon">📋</span>
          <p>{questionnaire.methodology_note}</p>
        </div>
      )}

      {/* Layout de 2 columnas en pantallas grandes: columna principal (fórmula +
          preguntas) junto a la columna lateral (perfiles + knockouts), para no
          forzar un scroll largo de una sola columna en desktop. */}
      <div className="rules-layout">
        <div className="rules-main-col">
          {/* Scoring formula */}
          <div className="rules-formula-card">
            <div className="rules-formula-head">
              <span className="rules-formula-icon">⚙️</span>
              <strong>Fórmula de cálculo</strong>
            </div>
            <code className="formula" data-testid="rules-formula">{questionnaire.scoring_formula}</code>
          </div>

          {/* Questions as accordions */}
          <div className="rules-section">
            <h3 className="rules-section-title">
              <span className="rules-section-icon">📝</span>
              Preguntas y pesos ({questionnaire.questions.length} factores)
            </h3>
            <div className="rules-accordion-list">
              {questionnaire.questions.map((q, i) => (
                <Accordion key={q.id}
                  title={q.text}
                  icon={ICONS[q.id] || '❓'}
                  defaultOpen={i === 0}
                  badge={<Chip tone="lime">{q.weight}%</Chip>}>
                  <div className="rules-question-detail">
                    {q.help && <p className="rules-question-help">{q.help}</p>}
                    {q.source && <p className="rules-question-source">{q.source}</p>}
                    <InfluenceRow label={q.text} sublabel={`Peso: ${q.weight}%`}
                      fillPct={q.weight * 4} value={`${q.weight}%`} testId="rules-question-row" />
                    <div className="rules-options-grid">
                      {q.options.map(o => (
                        <div key={o.value} className="rules-option-card">
                          <div className="rules-option-head">
                            <span className="rules-option-label">{o.label}</span>
                            <Chip tone="neutral">{o.points} pts</Chip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Accordion>
              ))}
            </div>
          </div>
        </div>

        <div className="rules-side-col">
          {/* Profiles */}
          <div className="rules-section">
            <h3 className="rules-section-title">
              <span className="rules-section-icon">👤</span>
              Perfiles de inversión
            </h3>
            <div className="rules-profiles-grid">
              {questionnaire.profiles.map(p => (
                <div key={p.id} className="rules-profile-card">
                  <div className="rules-profile-icon">{PROFILE_ICONS[p.id] || '📊'}</div>
                  <div className="rules-profile-body">
                    <div className="rules-profile-head">
                      <strong>{p.label}</strong>
                      <Chip tone="neutral">{p.min_score}–{p.max_score}</Chip>
                    </div>
                    <p className="rules-profile-desc">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Knockouts */}
          <div className="rules-section">
            <h3 className="rules-section-title">
              <span className="rules-section-icon">🛑</span>
              Reglas de protección (Knockouts)
            </h3>
            <p className="rules-section-desc">
              Estas reglas limitan automáticamente el perfil máximo del cliente para protegerlo
              de riesgos que el puntaje numérico no captura por completo.
            </p>
            <div className="rules-knockouts-list">
              {questionnaire.knockouts.map(k => (
                <div key={k.id} className="rules-knockout-card" data-testid="knockout-note">
                  <div className="rules-knockout-icon">⚠️</div>
                  <div className="rules-knockout-body">
                    <strong>{k.condition}</strong>
                    <span className="rules-knockout-cap">
                      Perfil máximo: <em>{k.cap_profile}</em>
                    </span>
                    <p>{k.reason}</p>
                    {k.source && <span className="rules-knockout-source">{k.source}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* References */}
      {questionnaire.references?.length > 0 && (
        <div className="rules-section" data-testid="rules-references">
          <h3 className="rules-section-title">
            <span className="rules-section-icon">📚</span>
            Referencias bibliográficas
          </h3>
          <p className="rules-section-desc">
            Cada pregunta y regla cita la fuente académica o regulatoria de la que se adapta.
          </p>
          <ol className="rules-ref-list">
            {questionnaire.references.map(r => (
              <li key={r.id} className="rules-ref-item">
                <a href={r.url} target="_blank" rel="noopener noreferrer">{r.citation}</a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
