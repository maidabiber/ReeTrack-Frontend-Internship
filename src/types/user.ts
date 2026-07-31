/**
 * Domain types mirroring the backend (ReeTrack.Domain).
 *
 * `erasableSyntaxOnly` is enabled in tsconfig, so we model backend enums as
 * string-literal unions plus `as const` value maps rather than TS `enum`s.
 */

/** Roles seeded by the backend (RoleConfiguration.cs): Admin (id 1), Member (id 2). */
export type Role = 'Admin' | 'Member'

export const ROLE_IDS = {
  Admin: 1,
  Member: 2,
} as const satisfies Record<Role, number>

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
  status: UserStatus
  /** Current hourly rate amount; null when not loaded or missing. */
  rate: number | null
  rateCurrencyCode: string | null
  /** Per-user hour target override; null means app default. */
  hourTargetMode: 'Daily' | 'Weekly' | null
  hourTargetHours: number | null
  emailVerified: boolean
  lastLoginAtUtc: string | null
}

export interface Invitation {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  expiresAtUtc: string
  invitedByUserId: string
}
