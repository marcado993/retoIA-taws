// Resumen de la decisión del asesor: responsable, fecha y versiones (HU3).
export default function DecisionNote({ decision, showRulesVersion = false }) {
  if (!decision) return null
  return (
    <div className="decision-note" data-testid="decision-note">
      Decisión de <strong>{decision.advisor}</strong> ·{' '}
      {new Date(decision.timestamp).toLocaleString()} · propuesta v{decision.proposal_version}
      {showRulesVersion && <> · reglas v{decision.rules_version}</>}
      {decision.notes && <> · «{decision.notes}»</>}
    </div>
  )
}
