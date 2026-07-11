import { useState } from 'react'
import Chip from '../atoms/Chip.jsx'
import Input from '../atoms/Input.jsx'
import FieldLabel from '../atoms/FieldLabel.jsx'
import Button from '../atoms/Button.jsx'
import ErrorText from '../atoms/ErrorText.jsx'
import AllocationRow from '../molecules/AllocationRow.jsx'
import DecisionNote from '../molecules/DecisionNote.jsx'

// HU3: el asesor autorizado aprueba, edita o rechaza la propuesta.
export default function AdvisorDetail({ proposal: selected, onDecide, error }) {
  const [advisor, setAdvisor] = useState('')
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState(false)
  const [weights, setWeights] = useState({})
  const [busy, setBusy] = useState(false)

  const startEdit = () => {
    const w = {}
    selected.proposal.allocation.forEach(a => { w[a.ticker] = a.weight })
    setWeights(w)
    setEditing(true)
  }

  const total = Object.values(weights).reduce((s, v) => s + Number(v || 0), 0)

  const decide = async (action) => {
    setBusy(true)
    const payload = { action, advisor: advisor.trim(), notes }
    if (action === 'editar') {
      payload.edited_allocation = Object.entries(weights)
        .map(([ticker, weight]) => ({ ticker, weight: Number(weight) }))
    }
    const ok = await onDecide(selected.id, payload)
    setBusy(false)
    if (ok) { setEditing(false); setNotes('') }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Resumen para el asesor</h3>
        <Chip tone="neutral">Reglas v{selected.profile_result.rules_version}</Chip>
      </div>
      <h4 className="subhead">1 · Perfil del cliente</h4>
      <p className="summary-line"><strong>{selected.client_name}</strong> — perfil{' '}
        <strong>{selected.profile_result.profile.label}</strong> (score {selected.profile_result.score}/100
        {selected.profile_result.capped && ', limitado por regla de protección'}).</p>
      <h4 className="subhead">2 · Justificación de la IA</h4>
      <p className="explanation">{selected.proposal.explanation}</p>
      <h4 className="subhead">3 · Asignación propuesta (catálogo v{selected.proposal.catalog_version})</h4>

      {editing ? (
        <div className="edit-box">
          {selected.proposal.allocation.map(a => (
            <div key={a.ticker} className="edit-row">
              <span>{a.name}</span>
              <Input small type="number" min="0" max="100"
                data-testid={`edit-weight-${a.ticker}`}
                value={weights[a.ticker]}
                onChange={e => setWeights({ ...weights, [a.ticker]: e.target.value })} />
            </div>
          ))}
          <p className={`edit-total ${Math.abs(total - 100) > 0.01 ? 'bad' : 'good'}`}>
            Total: {total}% {Math.abs(total - 100) > 0.01 ? '(debe sumar 100%)' : '✓'}
          </p>
        </div>
      ) : (
        <div className="alloc-list">
          {selected.proposal.allocation.map(a => (
            <AllocationRow key={a.ticker} name={a.name} weight={a.weight} />
          ))}
        </div>
      )}

      {selected.status === 'pendiente' ? (
        <>
          <FieldLabel>Asesor responsable</FieldLabel>
          <Input data-testid="advisor-name" value={advisor} placeholder="Ej. María Gómez, CFA"
            onChange={e => setAdvisor(e.target.value)} />
          <FieldLabel>Notas (obligatorias al rechazar)</FieldLabel>
          <Input as="textarea" rows="2" data-testid="advisor-notes" value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Justificación de la decisión…" />
          <p className="rules-hint">Toda decisión queda en auditoría con fecha, responsable y
            versión de reglas. El rechazo exige motivo escrito.</p>
          <ErrorText>{error}</ErrorText>
          <div className="btn-row">
            {editing ? (
              <>
                <Button data-testid="btn-aprobar-cambios"
                  disabled={busy || !advisor.trim() || Math.abs(total - 100) > 0.01}
                  onClick={() => decide('editar')}>Aprobar con cambios</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar edición</Button>
              </>
            ) : (
              <>
                <Button data-testid="btn-aprobar" disabled={busy || !advisor.trim()}
                  onClick={() => decide('aprobar')}>Aprobar</Button>
                <Button variant="ghost" data-testid="btn-editar" disabled={busy || !advisor.trim()}
                  onClick={startEdit}>Editar</Button>
                <Button variant="danger" data-testid="btn-rechazar"
                  disabled={busy || !advisor.trim() || !notes.trim()}
                  title={!notes.trim() ? 'El rechazo requiere motivo escrito en las notas' : ''}
                  onClick={() => decide('rechazar')}>Rechazar</Button>
              </>
            )}
          </div>
        </>
      ) : (
        <DecisionNote decision={selected.decision} showRulesVersion />
      )}
    </div>
  )
}
