import { createBrowserRouter } from 'react-router-dom'
import { AuthGate } from './components/auth/AuthGate'
import { RequirePermission } from './components/auth/RequirePermission'
import { PublicAuthPage } from './components/auth/PublicAuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { ALL_NAV_ITEMS } from './config/navigation'
import { Permissions } from './lib/permissions'
import TimerPage from './pages/TimerPage'
import { NotFoundPage } from './pages/NotFoundPage'
import {
  ApprovalsPage,
  AssistantPage,
  BillableRatesPage,
  ClientsPage,
  InvoicesPage,
  GoalsPage,
  MembersPage,
  NotificationsPage,
  OnboardingPage,
  OverviewPage,
  PlaceholderPage,
  ProfilePage,
  ProjectDetailPage,
  ProjectsPage,
  ReportsPage,
  CustomReportsPage,
  CustomReportBuilderPage,
  SharedReportPage,
  SignInPage,
  TagsPage,
  TimesheetReviewPage,
} from './pages/lazyPages'

// Screens that have a real implementation; everything else falls back to a
// PlaceholderPage until its own screen is built.
const PAGES: Record<string, React.ReactElement> = {
  '/members': <MembersPage />,
  '/billable-rates': <BillableRatesPage />,
  '/goals': <GoalsPage />,
  '/clients': <ClientsPage />,
  '/projects': <ProjectsPage />,
  '/tags': <TagsPage />,
  '/approvals': <ApprovalsPage />,
  '/overview': <OverviewPage />,
  '/reports': <ReportsPage />,
  '/invoices': <InvoicesPage />,
  '/reports/custom': <CustomReportsPage />,
  '/timesheet-review': <TimesheetReviewPage />,
  '/assistant': <AssistantPage />,
}

// The Timer landing screen (RT-270) is the index route; every other nav
// destination gets its page (or a placeholder) keyed by path.
const navRoutes = ALL_NAV_ITEMS.filter((item) => item.path !== '/').map((item) => {
  const element = PAGES[item.path] ?? <PlaceholderPage title={item.label} />
  return {
    path: item.path.slice(1),
    element: item.anyPermission?.length
      ? <RequirePermission anyPermission={item.anyPermission}>{element}</RequirePermission>
      : element,
  }
})

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
    path: '/shared/:token',
    element: <SharedReportPage />,
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
      // `reports/custom` comes from navRoutes. Only the child routes need registering.
      {
        path: 'reports/custom/new',
        element: (
          <RequirePermission anyPermission={[Permissions.ReportsView]}>
            <CustomReportBuilderPage />
          </RequirePermission>
        ),
      },
      {
        path: 'reports/custom/:id',
        element: (
          <RequirePermission anyPermission={[Permissions.ReportsView]}>
            <CustomReportBuilderPage />
          </RequirePermission>
        ),
      },
      // Timesheet deep link (decision emails): Timer page with the timesheet view open.
      { path: 'timesheet', element: <TimerPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
