/**
 * Domain types mirroring the backend (ReeTrack.Domain).
 *
 * `erasableSyntaxOnly` is enabled in tsconfig, so we model backend enums as
 * string-literal unions plus `as const` value maps rather than TS `enum`s.
 */

export type Role = 'Admin' | 'Member' | 'ProjectManager'

export const ROLE_IDS = {
  Admin: 1,
  Member: 2,
  ProjectManager: 3,
} as const satisfies Record<Role, number>


export const ROLE_LABEL: Record<Role, string> = {
  Admin: 'Admin',
  Member: 'Member',
  ProjectManager: 'Project Manager',
}

export const WORKSPACE_ROLES: Role[] = ['Admin', 'ProjectManager', 'Member']

export function parseRole(role: string): Role {
  if (role === 'Admin' || role === 'ProjectManager' || role === 'Member') return role
  return 'Member'
}

/** User account status (Domain/Enums/UserStatus.cs). */
export type UserStatus = 'Active' | 'Invited' | 'Disabled'

/** Invitation lifecycle (Domain/Enums/InvitationStatus.cs). */
export type InvitationStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired'

export interface User {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: Role
  permissions: string[]
  status: UserStatus
  /** Current hourly rate amount; null when not loaded or missing. */
  rate: number | null
  rateCurrencyCode: string | null
  /** Per-user hour target override; null means app default. */
  hourTargetMode: 'Daily' | 'Weekly' | null
  hourTargetHours: number | null
  emailVerified: boolean
  lastLoginAtUtc: string | null
  /** True once the user has finished the first-track guided tour. */
  hasCompletedOnboarding: boolean
}

export interface Invitation {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  expiresAtUtc: string
  invitedByUserId: string
}
