import Logo from '../atoms/Logo.jsx'
import Avatar from '../atoms/Avatar.jsx'
import NavPills from '../molecules/NavPills.jsx'

export default function TopBar({ tabs, active, onChange }) {
  return (
    <header className="topbar">
      <Logo />
      <NavPills tabs={tabs} active={active} onChange={onChange} />
      <Avatar />
    </header>
  )
}
