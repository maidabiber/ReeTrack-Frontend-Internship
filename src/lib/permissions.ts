/** Mirrors backend ReeTrack.Application.Common.Constants.Permissions. */
export const Permissions = {
  ReportsView: 'insights.reports.view',
  TimesheetReview: 'admin.timesheets.review',
  MembersManage: 'admin.members.manage',
  InvitationsManage: 'admin.invitations.manage',
  AuditLogsView: 'admin.audit_logs.view',
  BillableRatesManage: 'admin.billable_rates.manage',
  RateMultipliersManage: 'admin.rate_multipliers.manage',
  HolidaysManage: 'admin.holidays.manage',
  ProjectsManage: 'manage.projects.manage',
  InvoicesManage: 'manage.invoices.manage',
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
