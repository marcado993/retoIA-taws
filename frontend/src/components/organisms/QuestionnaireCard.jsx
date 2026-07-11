import { useState } from 'react'
import Chip from '../atoms/Chip.jsx'
import Input from '../atoms/Input.jsx'
import FieldLabel from '../atoms/FieldLabel.jsx'
import Button from '../atoms/Button.jsx'
import QuestionOption from '../molecules/QuestionOption.jsx'
import AgentBubble from '../molecules/AgentBubble.jsx'
import ProgressBar from '../molecules/ProgressBar.jsx'

// HU1: el Asesor Financiero IA realiza el cuestionario de perfilamiento.
// Nielsen: H1 progreso visible · H3 volver y cambiar respuestas · H5 no se puede
// enviar incompleto · H6 revisión de respuestas antes de calcular · H10 ayuda por pregunta.
export default function QuestionnaireCard({ questionnaire, onSubmit, loading, onSeeRules, initialAnswers = {} }) {
  const [clientName, setClientName] = useState('')
  const [answers, setAnswers] = useState(initialAnswers)
  const [step, setStep] = useState(Object.keys(initialAnswers).length)
  const [phase, setPhase] = useState('form') // 'form' | 'review'
  
  const [targetAmount, setTargetAmount] = useState('')
  const [targetYears, setTargetYears] = useState('')
  const [monthlyContrib, setMonthlyContrib] = useState('')

  const questions = questionnaire.questions
  const q = questions[step]
  const answered = Object.keys(answers).length
  const complete = answered === questions.length && clientName.trim()


  const answerLabel = (qq) =>
    qq.options.find(o => o.value === answers[qq.id])

  const handleCalculate = () => {
    // Append the personalized target variables to answers payload with defaults
    const enhancedAnswers = {
      ...answers,
      target_amount: targetAmount.trim() || '1000000',
      target_years: targetYears.trim() || '5',
      monthly_contrib: monthlyContrib.trim() || '2000'
    }
    onSubmit(clientName.trim(), enhancedAnswers)
  }

  if (phase === 'review') {
    return (
      <div className="card">
        <div className="card-head">
          <h3>Revisa tus respuestas</h3>
          <Chip tone="neutral">Reglas v{questionnaire.rules_version}</Chip>
        </div>
        <AgentBubble>
          Antes de calcular tu perfil, confirma tus respuestas, <strong>{clientName}</strong>.
          Cada una aporta <em>puntos × peso</em> al puntaje final (0–100), con reglas
          visibles y versionadas — puedes cambiarlas todas las veces que quieras.
        </AgentBubble>
        
        {/* Meta Personalizada del Inversor */}
        <div className="bg-brand-blue-soft border border-brand-border rounded p-3 mb-4">
          <span className="text-xs font-bold text-brand-blue block mb-1">META PERSONALIZADA DE INVERSIÓN</span>
          <p className="text-sm text-brand-ink">
            Acumular <strong>${Number(targetAmount || '1000000').toLocaleString()} USD</strong> en <strong>{targetYears || '5'} años</strong> aportando <strong>${Number(monthlyContrib || '2000').toLocaleString()} USD al mes</strong>.
          </p>
        </div>

        {questions.map((qq, i) => {
          const opt = answerLabel(qq)
          return (
            <div key={qq.id} className="review-row" data-testid="review-row">
              <div className="review-text">
                <span className="review-q">{qq.text}</span>
                <span className="review-a">{opt.label}</span>
              </div>
              <Chip tone="lime">{opt.points} pt × {qq.weight}%</Chip>
              <Button variant="ghost" className="btn-small" data-testid={`edit-answer-${i}`}
                onClick={() => { setStep(i); setPhase('form') }}>Cambiar</Button>
            </div>
          )
        })}
        <p className="rules-hint">
          El puntaje se calcula con la fórmula pública de las reglas v{questionnaire.rules_version}.{' '}
          <button className="link-btn" onClick={onSeeRules}>Ver reglas completas</button>
        </p>
        <div className="btn-row">
          <Button data-testid="submit-profile" disabled={loading}
            onClick={handleCalculate}>
            {loading ? 'Calculando perfil…' : 'Calcular mi perfil y generar propuesta'}
          </Button>
          <Button variant="ghost" onClick={() => setPhase('form')}>← Volver</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Diagnóstico de perfil</h3>
        <Chip tone="neutral">Reglas v{questionnaire.rules_version}</Chip>
      </div>

      <AgentBubble>
        Hola, soy tu <strong>Asesor Financiero IA</strong>. Con {questions.length} preguntas
        cortas calcularé tu perfil de inversionista usando reglas 100% visibles
        (<button className="link-btn" onClick={onSeeRules}>puedes verlas aquí</button>).
        Nada se ejecuta: al final un asesor humano revisa todo.
      </AgentBubble>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <FieldLabel>Tu nombre</FieldLabel>
          <Input data-testid="client-name" value={clientName} placeholder="Ej. Alex Rivera"
            onChange={e => setClientName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Meta Objetivo (USD)</FieldLabel>
          <Input type="number" value={targetAmount} placeholder="Ej. 1000000"
            onChange={e => setTargetAmount(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Plazo Meta (Años)</FieldLabel>
          <Input type="number" value={targetYears} placeholder="Ej. 5"
            onChange={e => setTargetYears(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Aporte Mensual (USD)</FieldLabel>
          <Input type="number" value={monthlyContrib} placeholder="Ej. 2000"
            onChange={e => setMonthlyContrib(e.target.value)} />
        </div>
      </div>

      <ProgressBar current={answered} total={questions.length}
        label={`Pregunta ${Math.min(step + 1, questions.length)} de ${questions.length} · ${answered} respondida(s)`} />


      <div className="q-progress">
        {questions.map((qq, i) => (
          <button key={qq.id}
            className={`q-dot ${i === step ? 'active' : ''} ${answers[qq.id] ? 'done' : ''}`}
            title={qq.text}
            onClick={() => setStep(i)}>{i + 1}</button>
        ))}
      </div>

      <p className="q-text">{q.text}</p>
      <p className="q-help">
        <svg className="w-4 h-4 text-brand-green inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'text-bottom' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {q.help} · Esta pregunta pesa {q.weight}% de tu puntaje.
      </p>

      <div className="q-options">
        {q.options.map(o => (
          <QuestionOption key={o.value} label={o.label} points={o.points}
            selected={answers[q.id] === o.value}
            onSelect={() => {
              setAnswers({ ...answers, [q.id]: o.value })
              if (step < questions.length - 1) setStep(step + 1)
            }} />
        ))}
      </div>

      <Button data-testid="goto-review" disabled={!complete}
        onClick={() => setPhase('review')}>
        {complete ? 'Revisar mis respuestas →'
          : !clientName.trim() && answered === questions.length ? 'Escribe tu nombre para continuar'
          : `Responde ${questions.length - answered} pregunta(s) más`}
      </Button>
    </div>
  )
}
