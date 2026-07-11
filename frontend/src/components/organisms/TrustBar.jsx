import TrustStat from '../molecules/TrustStat.jsx'

// Prueba de confianza sin inventar métricas de negocio: solo hechos verificables del sistema.
export default function TrustBar({ rulesVersion, catalogSize }) {
  return (
    <div className="trust-bar" data-testid="trust-bar">
      <TrustStat value={`v${rulesVersion}`} label="Reglas de perfilamiento versionadas" />
      <TrustStat value={`${catalogSize} ETFs`} label="Catálogo real monitoreado en vivo" />
      <TrustStat value="100%" label="Propuestas revisadas por un asesor humano" />
      <TrustStat value="0" label="Órdenes ejecutadas automáticamente" />
    </div>
  )
}
