import { createBrowserRouter } from 'react-router-dom'
import { AuthGate } from './components/auth/AuthGate'
import { PublicAuthPage } from './components/auth/PublicAuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { ALL_NAV_ITEMS } from './config/navigation'
import TimerPage from './pages/TimerPage'
import {
  ApprovalsPage,
  BillableRatesPage,
  ClientsPage,
  MembersPage,
  OnboardingPage,
  PlaceholderPage,
  ProfilePage,
  ProjectDetailPage,
  ProjectsPage,
  ReportsPage,
  SignInPage,
  TagsPage,
  TimesheetReviewPage,
} from './pages/lazyPages'

// Screens that have a real implementation; everything else falls back to a
// PlaceholderPage until its own screen is built.
const PAGES: Record<string, React.ReactElement> = {
  '/members': <MembersPage />,
  '/billable-rates': <BillableRatesPage />,
  '/clients': <ClientsPage />,
  '/projects': <ProjectsPage />,
  '/tags': <TagsPage />,
  '/approvals': <ApprovalsPage />,
  '/reports': <ReportsPage />,
  '/timesheet-review': <TimesheetReviewPage />,
}

// The Timer landing screen (RT-270) is the index route; every other nav
// destination gets its page (or a placeholder) keyed by path.
const navRoutes = ALL_NAV_ITEMS.filter((item) => item.path !== '/').map((item) => ({
  path: item.path.slice(1),
  element: PAGES[item.path] ?? <PlaceholderPage title={item.label} />,
}))

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: (
      <PublicAuthPage>
        <OnboardingPage />
      </PublicAuthPage>
    ),
  },
  {
    path: '/signin',
    element: (
      <PublicAuthPage>
        <SignInPage />
      </PublicAuthPage>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGate>
        <AppLayout />
      </AuthGate>
    ),
    children: [
      { index: true, element: <TimerPage /> },
      ...navRoutes,
      // Project detail isn't a nav item, so it's registered manually.
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      // Timesheet deep link (decision emails): Timer page with the timesheet view open.
      { path: 'timesheet', element: <TimerPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])
