/** Mirrors backend ReeTrack.Application.Common.Constants.Permissions. */
export const Permissions = {
  ReportsView: 'reports.view',
  TimesheetReview: 'timesheets.review',
  MembersView: 'members.view',
  MembersManage: 'members.manage',
  InvitationsManage: 'invitations.manage',
  AuditLogsView: 'audit_logs.view',
  BillableRatesManage: 'billable_rates.manage',
  RateMultipliersManage: 'rate_multipliers.manage',
  HolidaysManage: 'holidays.manage',
  ProjectsManage: 'projects.manage',
  InvoicesManage: 'invoices.manage',
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

export function hasPermission(
  granted: readonly string[] | undefined,
  permission: Permission,
): boolean {
  return granted?.includes(permission) ?? false
}

export function hasAnyPermission(
  granted: readonly string[] | undefined,
  permissions: readonly Permission[],
): boolean {
  if (!granted?.length) return false
  return permissions.some((permission) => granted.includes(permission))
}
