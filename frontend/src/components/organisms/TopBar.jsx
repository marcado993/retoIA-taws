import { useEffect, useRef, useState } from 'react'
import Logo from '../atoms/Logo.jsx'
import Avatar from '../atoms/Avatar.jsx'
import NavPills from '../molecules/NavPills.jsx'
import RoleSwitch from '../molecules/RoleSwitch.jsx'

// En móvil la barra de navegación horizontal no cabe sin volverse diminuta:
// se reemplaza por un menú hamburguesa. Logo + RoleSwitch quedan siempre
// visibles (el rol activo debe notarse sin abrir nada).
export default function TopBar({ tabs, active, onChange, role, onRoleChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const handleChange = (id) => {
    onChange(id)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [menuOpen])

  return (
    <header className="topbar" ref={menuRef}>
      <div className="topbar-left">
        <Logo />
        <RoleSwitch role={role} onChange={onRoleChange} />
      </div>

      <NavPills tabs={tabs} active={active} onChange={onChange} className="nav-pills-desktop" />

      <button type="button" className="topbar-menu-btn" data-testid="topbar-menu-btn"
        aria-label={menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={menuOpen} aria-controls="topbar-mobile-menu"
        onClick={() => setMenuOpen(o => !o)}>
        <span className={`hamburger ${menuOpen ? 'open' : ''}`} aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>

      <Avatar />

      {menuOpen && (
        <div className="topbar-mobile-menu" id="topbar-mobile-menu">
          <NavPills tabs={tabs} active={active} onChange={handleChange} className="nav-pills-mobile" />
        </div>
      )}
    </header>
  )
}
