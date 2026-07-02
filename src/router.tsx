import { createBrowserRouter } from 'react-router-dom'
import { ALL_NAV_ITEMS } from './config/navigation'
import PlaceholderPage from './pages/PlaceholderPage'

const navRoutes = ALL_NAV_ITEMS.map((item) =>
  item.path === '/'
    ? { index: true as const, element: <PlaceholderPage title={item.label} /> }
    : { path: item.path.slice(1), element: <PlaceholderPage title={item.label} /> },
)

// The parent route has no `element`, so react-router renders a default <Outlet />.
// RT-270 replaces it with the persistent AppLayout shell (sidebar + outlet).
export const router = createBrowserRouter([
  {
    path: '/',
    children: navRoutes,
  },
])
