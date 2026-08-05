import type { Role } from '../types/user'

/**
 * Who may configure project cost/time threshold alerts.
 * Today: Admin only. Include Project Manager here when that role exists.
 */
export function canManageProjectThresholds(role: Role | null | undefined): boolean {
  return role === 'Admin'
}
