import Chip from '../atoms/Chip.jsx'
import InfluenceRow from '../molecules/InfluenceRow.jsx'
import KnockoutNote from '../molecules/KnockoutNote.jsx'

// HU1: transparencia — cuánto influyó cada respuesta en el perfil.
export default function BreakdownCard({ profileResult }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>Cómo influyó cada respuesta</h3>
        <Chip tone="neutral">Reglas v{profileResult.rules_version}</Chip>
      </div>
      {profileResult.breakdown.map(b => (
        <InfluenceRow key={b.question_id} testId="influence-row"
          label={b.question} sublabel={b.answer}
          fillPct={(b.contribution / b.max_contribution) * 100}
          value={`+${b.contribution}`} />
      ))}
      {profileResult.capped && profileResult.knockouts_applied.map(k => (
        <KnockoutNote key={k.id}>
          <strong>Regla de protección aplicada:</strong> {k.reason}
        </KnockoutNote>
      ))}
    </div>
  )
}
