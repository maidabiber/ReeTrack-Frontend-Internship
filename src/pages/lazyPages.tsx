import { lazy } from 'react'

// Route-level lazy pages. Kept in this file so router.tsx can export the
// router object without tripping react-refresh/only-export-components.
export const PlaceholderPage = lazy(() => import('./PlaceholderPage'))
export const MembersPage = lazy(() => import('./MembersPage'))
export const BillableRatesPage = lazy(() => import('./BillableRatesPage'))
export const GoalsPage = lazy(() => import('./GoalsPage'))
export const ClientsPage = lazy(() => import('./ClientsPage'))
export const ProjectsPage = lazy(() => import('./ProjectsPage'))
export const ProjectDetailPage = lazy(() => import('./ProjectDetailPage'))
export const TagsPage = lazy(() => import('./TagsPage'))
export const ApprovalsPage = lazy(() => import('./ApprovalsPage'))
export const ReportsPage = lazy(() => import('./ReportsPage'))
export const InvoicesPage = lazy(() => import('./InvoicesPage'))
export const CustomReportViewerPage = lazy(() => import('./CustomReportViewerPage'))
export const TimesheetReviewPage = lazy(() => import('./TimesheetReviewPage'))
export const OnboardingPage = lazy(() => import('./OnboardingPage'))
export const SignInPage = lazy(() => import('./SignInPage'))
export const ProfilePage = lazy(() => import('./ProfilePage'))
export const NotificationsPage = lazy(() => import('./NotificationsPage'))
export const AssistantPage = lazy(() => import('./AssistantPage'))
