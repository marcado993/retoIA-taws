import Logo from '../atoms/Logo.jsx'
import Avatar from '../atoms/Avatar.jsx'
import NavPills from '../molecules/NavPills.jsx'
import RoleSwitch from '../molecules/RoleSwitch.jsx'

export default function TopBar({ tabs, active, onChange, role, onRoleChange }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Logo />
        <RoleSwitch role={role} onChange={onRoleChange} />
      </div>
      <NavPills tabs={tabs} active={active} onChange={onChange} />
      <Avatar />
    </header>
  )
}
