// Barra de influencia genérica: desglose por pregunta (BreakdownCard)
// y pesos de las reglas (RulesCards).
export default function InfluenceRow({ label, sublabel, fillPct, value, testId }) {
  return (
    <div className="influence-row" data-testid={testId}>
      <div className="influence-text">
        <span className="influence-q">{label}</span>
        {sublabel && <span className="influence-a">{sublabel}</span>}
      </div>
      <div className="influence-bar">
        <div className="influence-fill" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="influence-val">{value}</span>
    </div>
  )
}
