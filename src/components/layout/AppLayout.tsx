import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'
import { FloatingPomodoroWidget } from '../time/FloatingPomodoroWidget'
import { TimerOverlapHost } from '../time/TimerOverlapHost'
import { NotificationBell } from '../notifications/NotificationBell'
import { PAGE_PAD } from './pageChrome'

/**
 * Persistent application shell: the sidebar stays mounted while the routed page
 * renders in the main region via <Outlet />. Below `lg` the sidebar becomes an
 * off-canvas drawer opened from the mobile top bar; at `lg+` it stays fixed.
 */
export function AppLayout() {
  const location = useLocation()
  // Tie open state to the path that opened the drawer so a route change
  // closes it without an effect-driven setState.
  const [drawer, setDrawer] = useState<{ path: string; open: boolean }>({
    path: '',
    open: false,
  })
  const drawerOpen = drawer.open && drawer.path === location.pathname

  useEffect(() => {
    if (!drawerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer({ path: location.pathname, open: false })
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen, location.pathname])

  return (
    <div className="min-h-screen bg-canvas text-navy">
      <Sidebar
        open={drawerOpen}
        onClose={() => setDrawer({ path: location.pathname, open: false })}
      />
      <main className="relative flex min-h-screen min-w-0 flex-col lg:ml-[216px]">
        <MobileTopBar
          menuExpanded={drawerOpen}
          onOpenMenu={() => setDrawer({ path: location.pathname, open: true })}
        />
        {/* Desktop notification bell — mobile hosts it in MobileTopBar */}
        <div className="pointer-events-none absolute top-0 right-0 z-30 hidden p-4 sm:p-5 lg:block">
          <div className="pointer-events-auto">
            <NotificationBell />
          </div>
        </div>
        <Suspense
          fallback={
            <div
              className={`flex flex-1 items-center justify-center ${PAGE_PAD} text-body text-navy/50`}
            >
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <FloatingPomodoroWidget />
      <TimerOverlapHost />
    </div>
  )
}
