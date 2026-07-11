// WCAG 1.3.1, 2.4.3: nav semántico con aria-current en la pestaña activa
export default function NavPills({ tabs, active, onChange }) {
  return (
    <nav className="nav-pills" aria-label="Navegación principal">
      {tabs.map(([id, label]) => (
        <button key={id} data-testid={`nav-${id}`}
          className={`nav-pill ${active === id ? 'active' : ''}`}
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onChange(id)}>{label}</button>
      ))}
    </nav>
  )
}
