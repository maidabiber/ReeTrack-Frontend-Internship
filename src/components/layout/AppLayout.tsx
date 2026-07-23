import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FloatingPomodoroWidget } from '../time/FloatingPomodoroWidget'

/**
 * Persistent application shell: the sidebar stays mounted while the routed page
 * renders in the main region via <Outlet />. The profile entry lives in the
 * sidebar footer, so pages own the full height of the main region.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas text-navy">
      <Sidebar />
      <main className="ml-[216px] flex min-h-screen min-w-0 flex-col">
        <Outlet />
      </main>
      <FloatingPomodoroWidget />
    </div>
  )
}
