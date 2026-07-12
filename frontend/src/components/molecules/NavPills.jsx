// WCAG 1.3.1, 2.4.3: nav semántico con aria-current en la pestaña activa.
// `className` permite reusar el mismo componente para la barra horizontal de
// escritorio y para la lista vertical dentro del menú hamburguesa móvil.
export default function NavPills({ tabs, active, onChange, className = '' }) {
  return (
    <nav className={`nav-pills ${className}`.trim()} aria-label="Navegación principal">
      {tabs.map(([id, label]) => (
        <button key={id} data-testid={`nav-${id}`}
          className={`nav-pill ${active === id ? 'active' : ''}`}
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onChange(id)}>{label}</button>
      ))}
    </nav>
  )
}
