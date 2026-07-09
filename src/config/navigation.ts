/**
 * Single source of truth for the app's primary navigation.
 *
 * Both the router (route registration) and the Sidebar consume this so every
 * nav destination is guaranteed to have a matching route. The section grouping
 * mirrors the mockups: "Time" and "Manage" are visible to everyone (ReeTrack is
 * trust-based — the whole team collaborates on projects, clients and tags),
 * while "Insights" and "Admin" are role-gated and only rendered for Admins.
 */
import type { IconName } from '../components/ui/Icon'

export interface NavItem {
  label: string
  /** Absolute route path. The Timer landing screen is the index route ("/"). */
  path: string
  icon: IconName
}

export interface NavSection {
  title: string
  adminOnly: boolean
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Time',
    adminOnly: false,
    items: [
      { label: 'Overview', path: '/overview', icon: 'overview' },
      { label: 'Timer', path: '/', icon: 'timer' },
      { label: 'Approvals', path: '/approvals', icon: 'approvals' },
    ],
  },
  {
    title: 'Manage',
    adminOnly: false,
    items: [
      { label: 'Projects', path: '/projects', icon: 'projects' },
      { label: 'Clients', path: '/clients', icon: 'clients' },
      { label: 'Tags', path: '/tags', icon: 'tags' },
    ],
  },
  {
    title: 'Insights',
    adminOnly: true,
    items: [
      { label: 'Reports', path: '/reports', icon: 'reports' },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { label: 'Members', path: '/members', icon: 'members' },
      { label: 'Billable rates', path: '/billable-rates', icon: 'billable' },
      { label: 'Invoices', path: '/invoices', icon: 'invoices' },
      { label: 'Goals', path: '/goals', icon: 'goals' },
    ],
  },
]

/** Flattened list of every navigable item, handy for route generation. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)
