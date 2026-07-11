// Cifras de confianza: solo hechos verificables del propio sistema (sin métricas de negocio inventadas).
export default function TrustStat({ value, label }) {
  return (
    <div className="trust-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
