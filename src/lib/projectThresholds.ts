import type { Role } from '../types/user'

/**
 * Who may configure project cost/time threshold alerts and see related
 * notification preferences: Admins (any project) and Project Managers
 * (projects they created).
 */
export function canManageProjectThresholds(role: Role | null | undefined): boolean {
  return role === 'Admin' || role === 'ProjectManager'
}
