/**
 * Single source of truth for the app's primary navigation.
 *
 * Both the router and the Sidebar consume this. Items may declare permissions;
 * when omitted, every signed-in user sees the link.
 */
import type { IconName } from '../components/ui/Icon'
import type { Permission } from '../lib/permissions'
import { Permissions } from '../lib/permissions'

export interface NavItem {
  label: string
  path: string
  icon: IconName
  anyPermission?: readonly Permission[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Time',
    items: [
      {
        label: 'Overview',
        path: '/overview',
        icon: 'overview',
        anyPermission: [Permissions.ReportsView],
      },
      { label: 'Timer', path: '/', icon: 'timer' },
      { label: 'Approvals', path: '/approvals', icon: 'approvals' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { label: 'Projects', path: '/projects', icon: 'projects' },
      { label: 'Clients', path: '/clients', icon: 'clients' },
      { label: 'Tags', path: '/tags', icon: 'tags' },
      { label: 'Assistant', path: '/assistant', icon: 'sparkle' },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        label: 'Reports',
        path: '/reports',
        icon: 'reports',
        anyPermission: [Permissions.ReportsView],
      },
      {
        label: 'Custom reports',
        path: '/reports/custom',
        icon: 'reports',
        anyPermission: [Permissions.ReportsView],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Members',
        path: '/members',
        icon: 'members',
        anyPermission: [Permissions.MembersView, Permissions.MembersManage, Permissions.BillableRatesManage],
      },
      {
        label: 'Timesheets',
        path: '/timesheet-review',
        icon: 'timesheet',
        anyPermission: [Permissions.TimesheetReview],
      },
      {
        label: 'Billable rates',
        path: '/billable-rates',
        icon: 'billable',
        anyPermission: [Permissions.RateMultipliersManage, Permissions.HolidaysManage],
      },
      {
        label: 'Invoices',
        path: '/invoices',
        icon: 'invoices',
        anyPermission: [Permissions.InvoicesManage],
      },
      {
        label: 'Goals',
        path: '/goals',
        icon: 'goals',
        anyPermission: [Permissions.MembersManage],
      },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

export function isNavItemVisible(
  item: NavItem,
  hasAnyPermission: (permissions: readonly Permission[]) => boolean,
): boolean {
  if (!item.anyPermission?.length) return true
  return hasAnyPermission(item.anyPermission)
}

/**
 * Set of nav item paths that have nested items beneath them.
 * Used by NavItem to apply `end` prop so parent and child paths don't both highlight.
 */
export const EXACT_MATCH_PATHS = new Set(
  ALL_NAV_ITEMS
    .filter((item) => ALL_NAV_ITEMS.some((other) => other.path.startsWith(`${item.path}/`)))
    .map((item) => item.path),
)
