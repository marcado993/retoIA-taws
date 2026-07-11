// Presencia visible del agente IA (HU1/HU2): quién habla y qué dice.
// Nielsen H1 (visibilidad del estado) y H2 (lenguaje del mundo real).
export default function AgentBubble({ agent = 'Asesor Financiero IA', children }) {
  return (
    <div className="agent-msg">
      <div className="agent-avatar">
        <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      </div>
      <div className="agent-body">
        <span className="agent-name">{agent}</span>
        {children}
      </div>
    </div>
  )
}

