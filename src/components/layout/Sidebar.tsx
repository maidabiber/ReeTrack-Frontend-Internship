import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { NAV_SECTIONS } from '../../config/navigation'
import { Icon } from '../ui/Icon'
import { LogoMark } from '../ui/LogoMark'
import { UserAvatar } from '../ui/UserAvatar'
import { NavItem } from './NavItem'
import { SIDEBAR_ROW_ACTIVE, SIDEBAR_ROW_BASE, SIDEBAR_ROW_INACTIVE } from './sidebarRow'

export function Sidebar() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'Admin'

  const sections = NAV_SECTIONS.filter((section) => !section.adminOnly || isAdmin)

  const handleSignOut = () => {
    signOut()
    navigate('/signin')
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[216px] flex-col overflow-y-auto bg-ink px-4 py-6">
      <div className="mb-5 px-2 text-white">
        <LogoMark className="h-7" />
      </div>

      {sections.map((section, index) => (
        <div key={section.title} className={index === 0 ? '' : 'mt-6'}>
          <p className="px-2 pb-2 font-mono text-eyebrow font-medium tracking-[0.16em] text-white/40 uppercase">
            {section.title}
          </p>
          <nav className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </nav>
        </div>
      ))}

      <div className="mt-auto flex flex-shrink-0 flex-col gap-0.5">
        {/* Profile is a sidebar row like any other; the avatar sits in the icon
            slot and the whole row shares the nav inflate-on-hover. */}
        {user && (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${SIDEBAR_ROW_BASE} ${isActive ? SIDEBAR_ROW_ACTIVE : SIDEBAR_ROW_INACTIVE}`
            }
          >
            <UserAvatar
              name={user.displayName ?? user.email}
              size={20}
              className="flex-shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">Profile</span>
          </NavLink>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className={`${SIDEBAR_ROW_BASE} ${SIDEBAR_ROW_INACTIVE}`}
        >
          <Icon name="sign-out" className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
