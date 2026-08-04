import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { BREAKPOINT, useMediaQuery } from '../../hooks/useMediaQuery'
import { isNavItemVisible, NAV_SECTIONS } from '../../config/navigation'
import { cn } from '../../lib/utils'
import { Icon } from '../ui/Icon'
import { LogoMark } from '../ui/LogoMark'
import { UserAvatar } from '../ui/UserAvatar'
import { NavItem } from './NavItem'
import { SIDEBAR_ROW_ACTIVE, SIDEBAR_ROW_BASE, SIDEBAR_ROW_INACTIVE } from './sidebarRow'

export function Sidebar({
  open = false,
  onClose,
}: {
  /** Mobile drawer open state. Ignored at `lg+` where the sidebar is always fixed. */
  open?: boolean
  onClose?: () => void
}) {
  const { user, hasAnyPermission, signOut } = useAuth()
  const navigate = useNavigate()
  const isLg = useMediaQuery(BREAKPOINT.lg)
  const drawerActive = !isLg && open

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isNavItemVisible(item, hasAnyPermission)),
  })).filter((section) => section.items.length > 0)

  const handleSignOut = () => {
    onClose?.()
    signOut()
    navigate('/signin')
  }

  const handleNavigate = () => {
    onClose?.()
  }

  return (
    <>
      {/* Backdrop — mobile drawer only */}
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={drawerActive ? 0 : -1}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-ink/40 transition-opacity lg:hidden',
          drawerActive ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        id="app-sidebar"
        inert={!isLg && !open ? true : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[216px] flex-col overflow-y-auto bg-ink px-4 py-6 transition-transform duration-200 ease-out',
          open || isLg ? 'translate-x-0' : '-translate-x-full',
          'lg:z-20 lg:translate-x-0',
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-2 px-2 text-white">
          <LogoMark className="h-7" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {sections.map((section, index) => (
          <div key={section.title} className={index === 0 ? '' : 'mt-6'}>
            <p className="px-2 pb-2 font-mono text-eyebrow font-medium tracking-[0.16em] text-white/40 uppercase">
              {section.title}
            </p>
            <nav className="flex flex-col gap-0.5" onClick={handleNavigate}>
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
              onClick={handleNavigate}
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
    </>
  )
}
