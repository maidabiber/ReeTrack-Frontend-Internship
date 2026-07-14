import { Link, Outlet } from 'react-router-dom'
import { UserAvatar } from '../ui/UserAvatar'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'

/**
 * Persistent application shell: the sidebar stays mounted while the routed page
 * renders in the main region via <Outlet />.
 */
export function AppLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white text-navy">
      <Sidebar />
      <main className="ml-[248px] flex min-h-screen min-w-0 flex-col">
        {user && (
          <div className="flex justify-end px-10 pt-6 pb-2">
            <Link
              to="/profile"
              aria-label="Open profile"
              className="rounded-full transition-shadow hover:ring-2 hover:ring-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <UserAvatar
                name={user.displayName ?? user.email}
                size={36}
                aria-hidden="true"
              />
            </Link>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
