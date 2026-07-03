import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

/**
 * Persistent application shell: the sidebar stays mounted while the routed page
 * renders in the main region via <Outlet />.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-cream text-navy">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
