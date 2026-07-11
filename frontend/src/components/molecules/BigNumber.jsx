// Jerarquía de datos / Big Numbers (spec §2): el dato vital se muestra con
// tipografía de gran tamaño arriba de la propuesta, para que el ojo encuentre
// la certeza (nivel de riesgo, rendimiento esperado) sin leer datos en bruto.
export default function BigNumber({ label, value, sub, tone = 'ink' }) {
  return (
    <div className={`big-number big-number-${tone}`} data-testid="big-number">
      <span className="big-number-label">{label}</span>
      <strong className="big-number-value">{value}</strong>
      {sub && <span className="big-number-sub">{sub}</span>}
    </div>
  )
}
