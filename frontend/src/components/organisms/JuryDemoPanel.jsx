import { useState } from 'react'

export default function JuryDemoPanel({ setTab, onSubmitProfile, proposals, decideProposal, record, onReset }) {
  const [activeStep, setActiveStep] = useState(null)

  const runHU1 = () => {
    setActiveStep('hu1')
    setTab('dashboard')
    onReset() // Reset current diagnosis
    
    // Simulate completing the form
    setTimeout(() => {
      const mockAnswers = {
        reaccion: "comprar",
        objetivo: "crecimiento",
        horizonte: "largo",
        emergencia: "seis_meses",
        experiencia: "avanzada",
        ingresos: "muy_estables",
      }
      onSubmitProfile('Carlos Jury Demo', mockAnswers)
    }, 500)
  }

  const runHU2 = () => {
    setActiveStep('hu2')
    setTab('dashboard')
    // If there is no record, generate one first
    if (!record) {
      onSubmitProfile('Carlos Jury Demo', {
        reaccion: "comprar",
        objetivo: "crecimiento",
        horizonte: "largo",
        emergencia: "seis_meses",
        experiencia: "avanzada",
        ingresos: "muy_estables",
      })
    }
  }

  const runHU3 = async () => {
    setActiveStep('hu3')
    setTab('asesor')

    // Find the latest pending proposal to highlight
    const pending = proposals?.find(p => p.status === 'pendiente')
    if (pending) {
      // Keep it selected on the screen
    }
  }

  return (
    <div className="bg-brand-navy text-white border-b border-brand-navy-light p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center font-bold text-brand-navy text-sm animate-pulse-slow">
          評
        </div>
        <div>
          <h4 className="text-sm font-bold tracking-wider text-brand-green uppercase">Panel de Evaluación de Jurados</h4>
          <p className="text-xs text-brand-muted">Navegación rápida de Historias de Usuario con un solo click.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={runHU1}
          className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
            activeStep === 'hu1' 
              ? 'bg-brand-green text-brand-navy border-brand-green shadow-glow' 
              : 'bg-transparent text-white border-brand-navy-light hover:border-brand-green'
          }`}
        >
          {activeStep === 'hu1' && '⭐ '} HU1: Perfil Transparente
        </button>

        <button
          onClick={runHU2}
          className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
            activeStep === 'hu2' 
              ? 'bg-brand-green text-brand-navy border-brand-green shadow-glow' 
              : 'bg-transparent text-white border-brand-navy-light hover:border-brand-green'
          }`}
        >
          {activeStep === 'hu2' && '⭐ '} HU2: Propuesta Explicable
        </button>

        <button
          onClick={runHU3}
          className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
            activeStep === 'hu3' 
              ? 'bg-brand-green text-brand-navy border-brand-green shadow-glow' 
              : 'bg-transparent text-white border-brand-navy-light hover:border-brand-green'
          }`}
        >
          {activeStep === 'hu3' && '⭐ '} HU3: Aprobación / Auditoría
        </button>
      </div>
    </div>
  )
}
