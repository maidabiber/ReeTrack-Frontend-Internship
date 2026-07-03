import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NAV_SECTIONS } from '../../config/navigation'
import { Icon } from '../ui/Icon'
import { NavItem } from './NavItem'
import { DevRoleToggle } from './DevRoleToggle'

// Single-tenant workspace; there is only ever one. Hard-coded for now, will
// come from the backend once workspace data is available.
const WORKSPACE = { name: 'Fernhollow Co.', initials: 'FH' }

export function Sidebar() {
  const { role, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'Admin'

  const sections = NAV_SECTIONS.filter((section) => !section.adminOnly || isAdmin)

  const handleSignOut = () => {
    signOut()
    navigate('/signin')
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[200px] flex-shrink-0 flex-col overflow-y-auto bg-navy-deep px-3.5 py-5">
      <button
        type="button"
        className="mb-[18px] flex cursor-pointer items-center gap-[9px] rounded-[10px] px-2 py-[7px] text-left hover:bg-white/[0.08]"
      >
        <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-purple-soft to-purple font-display text-[11px] font-bold text-cream">
          {WORKSPACE.initials}
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold text-cream">
          {WORKSPACE.name}
        </span>
        <Icon name="chevron-down" className="h-[13px] w-[13px] flex-shrink-0 text-cream opacity-50" />
      </button>

      {sections.map((section, index) => (
        <div key={section.title}>
          <p
            className={`px-2.5 pb-[7px] font-display text-[10.5px] font-bold tracking-[0.08em] text-white/30 uppercase ${
              index === 0 ? 'pt-0' : 'mt-0 border-t border-white/[0.08] pt-3.5'
            }`}
          >
            {section.title}
          </p>
          <nav className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>
        </div>
      ))}

      <DevRoleToggle />

      <button
        type="button"
        onClick={handleSignOut}
        className="flex flex-shrink-0 items-center gap-[9px] rounded-[9px] px-2.5 py-2 font-display text-[13px] font-semibold text-white/50 hover:bg-white/[0.08] hover:text-cream"
      >
        <Icon name="sign-out" className="h-4 w-4 flex-shrink-0" />
        Sign out
      </button>
    </aside>
  )
}
