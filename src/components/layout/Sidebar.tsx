import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NAV_SECTIONS } from '../../config/navigation'
import { Icon } from '../ui/Icon'
import { LogoMark } from '../ui/LogoMark'
import { NavItem } from './NavItem'

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
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[248px] flex-col overflow-y-auto bg-ink px-4 py-6">
      {/* Logo with the ReeTrack trademark: a thin brand-gradient underline. */}
      <div className="mb-7 px-2 text-white">
        <LogoMark className="h-6" />
        <span aria-hidden="true" className="mt-2.5 block h-px w-full bg-brand-gradient" />
      </div>

      {sections.map((section, index) => (
        <div key={section.title} className={index === 0 ? '' : 'mt-6'}>
          <p className="px-2 pb-2 font-display text-xs font-semibold tracking-[0.1em] text-white/45 uppercase">
            {section.title}
          </p>
          <nav className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>
        </div>
      ))}

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-auto flex flex-shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 font-display text-md font-medium text-white/65 hover:bg-white/[0.06] hover:text-white"
      >
        <Icon name="sign-out" className="h-4 w-4 flex-shrink-0" />
        Sign out
      </button>
    </aside>
  )
}
