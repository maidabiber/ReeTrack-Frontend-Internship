import { Icon } from '../ui/Icon'
import { LogoMark } from '../ui/LogoMark'
import { NotificationBell } from '../notifications/NotificationBell'

/**
 * Slim chrome shown below `lg` when the ink sidebar is off-canvas.
 * Owns the hamburger that opens the drawer and hosts the notification bell
 * so it no longer overlays page titles.
 */
export function MobileTopBar({
  onOpenMenu,
  menuExpanded,
}: {
  onOpenMenu: () => void
  menuExpanded: boolean
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-navy/[0.06] bg-canvas/95 px-4 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        aria-expanded={menuExpanded}
        aria-controls="app-sidebar"
        className="flex size-9 items-center justify-center rounded-full text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>
      <LogoMark className="h-6 text-navy" />
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  )
}
