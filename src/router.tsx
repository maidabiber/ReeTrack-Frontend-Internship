import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ALL_NAV_ITEMS } from './config/navigation'
import PlaceholderPage from './pages/PlaceholderPage'
import TimerPage from './pages/TimerPage'

// The Timer landing screen (RT-270) is the index route; every other nav
// destination gets a PlaceholderPage until its own screen is built.
const navRoutes = ALL_NAV_ITEMS.filter((item) => item.path !== '/').map((item) => ({
  path: item.path.slice(1),
  element: <PlaceholderPage title={item.label} />,
}))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [{ index: true, element: <TimerPage /> }, ...navRoutes],
  },
])
