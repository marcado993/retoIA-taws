import { useState } from 'react'
import Chip from '../atoms/Chip.jsx'
import Input from '../atoms/Input.jsx'
import FieldLabel from '../atoms/FieldLabel.jsx'
import Button from '../atoms/Button.jsx'
import QuestionOption from '../molecules/QuestionOption.jsx'
import AgentBubble from '../molecules/AgentBubble.jsx'
import ProgressBar from '../molecules/ProgressBar.jsx'
import InfoTooltip from '../molecules/InfoTooltip.jsx'
import FieldGuideArrow from '../molecules/FieldGuideArrow.jsx'

// Nombre: letras (con acentos/ñ), espacios, guiones y apóstrofes — mínimo 2 caracteres.
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:\s[A-Za-zÀ-ÖØ-öø-ÿ'’-]+)*$/
const isValidName = (v) => v.trim().length >= 2 && NAME_REGEX.test(v.trim())

// Orden de llenado guiado: la flecha salta al primer campo vacío/incompleto.
const FIELD_GUIDE = [
  { key: 'nombre', text: 'Escribe tu nombre para empezar' },
  { key: 'meta', text: '¿Cuánto quieres acumular? (opcional, USD)' },
  { key: 'plazo', text: '¿En cuántos años? (opcional)' },
  { key: 'aporte', text: '¿Cuánto puedes aportar al mes? (opcional, USD)' },
]

// Microcopia educativa (spec §1): descripción corta por opción para traducir el
// término financiero. Se indexa por `value` (únicos en las reglas v1) y es opcional:
// si una opción no está aquí, simplemente no muestra hint.
const OPTION_HINTS = {
  // objetivo
  preservar: 'Menos rendimiento, pero tu capital se mueve poco.',
  ingresos: 'Flujo periódico (ej. dividendos), con crecimiento limitado.',
  balanceado: 'Mezcla de crecimiento y estabilidad; sube y baja moderadamente.',
  crecimiento: 'Mayor potencial a cambio de más altibajos en el camino.',
  // horizonte
  corto: 'Necesitarás liquidez pronto: conviene evitar la volatilidad.',
  medio_corto: 'Hay poco margen para recuperarse de una caída.',
  medio: 'Tiempo suficiente para absorber ciclos de mercado.',
  largo: 'El plazo largo permite tolerar más volatilidad.',
  // reaccion
  vender_todo: 'Vender en la caída convierte una pérdida temporal en real.',
  vender_parte: 'Reduces riesgo, pero materializas parte de la pérdida.',
  mantener: 'Aguantar el ciclo suele recuperar el valor con el tiempo.',
  comprar: 'Comprar barato exige nervios de acero y liquidez disponible.',
  // experiencia
  ninguna: 'Empezaremos con instrumentos simples y explicados.',
  basica: 'Conoces productos de bajo riesgo como depósitos a plazo.',
  intermedia: 'Ya has usado fondos o bonos: entiendes el riesgo básico.',
  avanzada: 'Manejas acciones o ETFs y su volatilidad.',
  // ingresos
  inestables: 'Ingresos impredecibles piden más colchón de seguridad.',
  algo_estables: 'Variabilidad moderada: riesgo medio es razonable.',
  estables: 'Ingresos fijos permiten planificar aportes constantes.',
  muy_estables: 'Estabilidad alta habilita asumir más riesgo de mercado.',
  // emergencia
  no: 'Sin colchón, una caída podría forzar ventas en mal momento.',
  parcial: 'Cubre poco: conviene reforzar la liquidez antes de arriesgar.',
  tres_meses: 'Colchón razonable para afrontar imprevistos.',
  seis_meses: 'Liquidez sólida: puedes dejar invertir sin presión.',
}

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
  const nameValid = isValidName(clientName)
  const complete = answered === questions.length && nameValid

  // Guía dinámica: el primer campo de la lista que aún no está lleno/válido.
  const fieldFilled = {
    nombre: nameValid,
    meta: targetAmount.trim() !== '',
    plazo: targetYears.trim() !== '',
    aporte: monthlyContrib.trim() !== '',
  }
  const activeField = FIELD_GUIDE.find(f => !fieldFilled[f.key])?.key ?? null

  const answerLabel = (qq) =>
    qq.options.find(o => o.value === answers[qq.id])

  // La meta financiera viaja como objeto propio (no mezclada en `answers`, que es
  // solo para las 6 preguntas de riesgo): el backend la usa para calcular goal_fit
  // de forma estructurada y auditable, sin parsear texto.
  const handleCalculate = () => {
    const goal = {
      target_amount: Number(targetAmount.trim() || '1000000'),
      target_years: Number(targetYears.trim() || '5'),
      monthly_contrib: Number(monthlyContrib.trim() || '2000'),
    }
    onSubmit(clientName.trim(), answers, goal)
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
            className={loading ? '' : 'btn-pulse'}
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
          <FieldGuideArrow active={activeField === 'nombre'} text={FIELD_GUIDE[0].text} />
          <Input data-testid="client-name" value={clientName} placeholder="Ej. Alex Rivera"
            className={activeField === 'nombre' ? 'field-active' : clientName && !nameValid ? 'field-invalid' : ''}
            onChange={e => setClientName(e.target.value)} />
          {clientName && !nameValid && (
            <span className="field-error" data-testid="name-error">Escribe al menos 2 letras (sin números ni símbolos).</span>
          )}
        </div>
        <div>
          <FieldLabel>Meta Objetivo (USD)</FieldLabel>
          <FieldGuideArrow active={activeField === 'meta'} text={FIELD_GUIDE[1].text} />
          <Input type="number" value={targetAmount} placeholder="Ej. 1000000"
            className={activeField === 'meta' ? 'field-active' : ''}
            onChange={e => setTargetAmount(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Plazo Meta (Años)</FieldLabel>
          <FieldGuideArrow active={activeField === 'plazo'} text={FIELD_GUIDE[2].text} />
          <Input type="number" value={targetYears} placeholder="Ej. 5"
            className={activeField === 'plazo' ? 'field-active' : ''}
            onChange={e => setTargetYears(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Aporte Mensual (USD)</FieldLabel>
          <FieldGuideArrow active={activeField === 'aporte'} text={FIELD_GUIDE[3].text} />
          <Input type="number" value={monthlyContrib} placeholder="Ej. 2000"
            className={activeField === 'aporte' ? 'field-active' : ''}
            onChange={e => setMonthlyContrib(e.target.value)} />
        </div>
      </div>

      {/* Indicador de progreso siempre visible (spec §1): barra pegajosa arriba
          del bloque de preguntas para que el usuario sepa cuánto falta. */}
      <div className="q-progress-sticky">
        <ProgressBar current={answered} total={questions.length}
          label={`Pregunta ${Math.min(step + 1, questions.length)} de ${questions.length} · ${answered} respondida(s)`} />
      </div>

      <div className="q-progress">
        {questions.map((qq, i) => (
          <button key={qq.id}
            className={`q-dot ${i === step ? 'active' : ''} ${answers[qq.id] ? 'done' : ''}`}
            title={qq.text}
            onClick={() => setStep(i)}>{i + 1}</button>
        ))}
      </div>

      {/* Transparencia accesible (spec §1): el "por qué" vive en un tooltip discreto
          junto a la pregunta, no en un bloque de texto que compita con las opciones. */}
      <div className="q-text-row">
        <p className="q-text">{q.text}</p>
        <InfoTooltip>
          {q.help} Esta pregunta pesa <strong>{q.weight}%</strong> de tu puntaje final,
          con la fórmula pública de las reglas v{questionnaire.rules_version}.
        </InfoTooltip>
      </div>

      <div className="q-options">
        {q.options.map(o => (
          <QuestionOption key={o.value} label={o.label} points={o.points}
            hint={OPTION_HINTS[o.value]}
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
          : !nameValid && answered === questions.length ? 'Escribe tu nombre para continuar'
          : `Responde ${questions.length - answered} pregunta(s) más`}
      </Button>
    </div>
  )
}
