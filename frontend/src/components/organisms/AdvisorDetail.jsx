import { useState } from 'react'
import Chip from '../atoms/Chip.jsx'
import Input from '../atoms/Input.jsx'
import FieldLabel from '../atoms/FieldLabel.jsx'
import Button from '../atoms/Button.jsx'
import ErrorText from '../atoms/ErrorText.jsx'
import AllocationRow from '../molecules/AllocationRow.jsx'
import DecisionNote from '../molecules/DecisionNote.jsx'
import MarketContextCard from '../molecules/MarketContextCard.jsx'
import SlideOver from './SlideOver.jsx'
import GoalFitCard from './GoalFitCard.jsx'

// HU3: el asesor autorizado aprueba, edita o rechaza la propuesta.
// Este componente solo se monta en la vista "Asistente Financiero" (rol
// asesor) — la separación de rol vive a nivel de ruta en app/page.jsx, no
// aquí, así que no hay que repetir ninguna comprobación de permisos.
export default function AdvisorDetail({ proposal: selected, onDecide, error }) {
  const [advisor, setAdvisor] = useState('')
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState(false)
  const [weights, setWeights] = useState({})
  const [busyAction, setBusyAction] = useState(null) // qué acción se está procesando
  const [rejectOpen, setRejectOpen] = useState(false) // slide-over de fricción para rechazo
  const busy = busyAction !== null

  const startEdit = () => {
    const w = {}
    selected.proposal.allocation.forEach(a => { w[a.ticker] = a.weight })
    setWeights(w)
    setEditing(true)
  }

  const total = Object.values(weights).reduce((s, v) => s + Number(v || 0), 0)

  const decide = async (action) => {
    setBusyAction(action)
    const payload = { action, advisor: advisor.trim(), notes }
    if (action === 'editar') {
      payload.edited_allocation = Object.entries(weights)
        .map(([ticker, weight]) => ({ ticker, weight: Number(weight) }))
    }
    const ok = await onDecide(selected.id, payload)
    setBusyAction(null)
    if (ok) { setEditing(false); setNotes(''); setRejectOpen(false) }
  }

  // Etiqueta de botón con estado "Procesando…" (spec §4: prevención de doble envío).
  const label = (action, text) => (busyAction === action ? 'Procesando…' : text)

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
      {/* Alineación con noticias + mercado: contexto para la decisión del asesor. */}
      <MarketContextCard marketContext={selected.proposal.market_context} />
      {selected.proposal.goal_fit && (
        <>
          <h4 className="subhead">3 · Meta financiera del cliente</h4>
          <GoalFitCard goalFit={selected.proposal.goal_fit} />
        </>
      )}
      <h4 className="subhead">{selected.proposal.goal_fit ? '4' : '3'} · Asignación propuesta (catálogo v{selected.proposal.catalog_version})</h4>

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
            versión de reglas. El rechazo exige motivo escrito y confirmación.</p>
          <ErrorText>{error}</ErrorText>
          <div className="btn-row">
            {editing ? (
              <>
                <Button data-testid="btn-aprobar-cambios"
                  disabled={busy || !advisor.trim() || Math.abs(total - 100) > 0.01}
                  onClick={() => decide('editar')}>{label('editar', 'Aprobar con cambios')}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancelar edición</Button>
              </>
            ) : (
              <>
                <Button data-testid="btn-aprobar" disabled={busy || !advisor.trim()}
                  className={!busy && advisor.trim() ? 'btn-pulse' : ''}
                  onClick={() => decide('aprobar')}>{label('aprobar', 'Aprobar')}</Button>
                <Button variant="ghost" data-testid="btn-editar" disabled={busy || !advisor.trim()}
                  onClick={startEdit}>Editar</Button>
                {/* Fricción intencional: abre el slide-over de confirmación en vez de
                    ejecutar el rechazo de inmediato (spec §3). Sigue deshabilitado hasta
                    que haya responsable y motivo escrito. */}
                <Button variant="danger" data-testid="btn-rechazar"
                  disabled={busy || !advisor.trim() || !notes.trim()}
                  title={!notes.trim() ? 'El rechazo requiere motivo escrito en las notas' : ''}
                  onClick={() => setRejectOpen(true)}>Rechazar</Button>
              </>
            )}
          </div>

          <SlideOver open={rejectOpen} title="Confirmar rechazo de la propuesta"
            onClose={() => !busy && setRejectOpen(false)}>
            <p className="slideover-warn">
              Vas a <strong>rechazar</strong> la propuesta de <strong>{selected.client_name}</strong>.
              Esta decisión queda registrada en la bitácora de auditoría a nombre de{' '}
              <strong>{advisor.trim() || '—'}</strong> y no puede deshacerse.
            </p>
            <FieldLabel>Justificación del rechazo (obligatoria)</FieldLabel>
            <Input as="textarea" rows="4" data-testid="reject-justification" value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Explica por qué se rechaza la propuesta…" />
            <div className="btn-row">
              <Button variant="danger" data-testid="btn-confirmar-rechazo"
                disabled={busy || !notes.trim()}
                onClick={() => decide('rechazar')}>
                {label('rechazar', 'Confirmar rechazo')}
              </Button>
              <Button variant="ghost" disabled={busy}
                onClick={() => setRejectOpen(false)}>Cancelar</Button>
            </div>
          </SlideOver>
        </>
      ) : (
        <DecisionNote decision={selected.decision} showRulesVersion />
      )}
    </div>
  )
}
