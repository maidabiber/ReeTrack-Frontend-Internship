/**
 * Single source of truth for the app's primary navigation.
 *
 * Both the router (route registration) and the Sidebar consume this so every
 * nav destination is guaranteed to have a matching route. The "Admin" section
 * is role-gated and only rendered for Admin users.
 */

export interface NavItem {
  label: string
  /** Absolute route path. The Timer landing screen is the index route ("/"). */
  path: string
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
      { label: 'Overview', path: '/overview' },
      { label: 'Timer', path: '/' },
      { label: 'Insights', path: '/insights' },
      { label: 'Reports', path: '/reports' },
      { label: 'Approvals', path: '/approvals' },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { label: 'Projects', path: '/projects' },
      { label: 'Clients', path: '/clients' },
      { label: 'Members', path: '/members' },
      { label: 'Billable rates', path: '/billable-rates' },
      { label: 'Invoices', path: '/invoices' },
      { label: 'Tags', path: '/tags' },
      { label: 'Goals', path: '/goals' },
      { label: 'Integrations', path: '/integrations' },
    ],
  },
]

/** Flattened list of every navigable item, handy for route generation. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)
