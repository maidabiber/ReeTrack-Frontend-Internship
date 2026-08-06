import type { User } from './user'

/** Mirrors backend AuthenticatedUser. */
export interface AuthenticatedUserResponse {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  roles: string[]
  hasCompletedOnboarding: boolean
  permissions: string[]
}

/** Mirrors backend SetupStatusResponse. */
export interface SetupStatusResponse {
  isFirstRun: boolean
  requiresAdminLogin: boolean
}

/** Cached user profile stored in localStorage (JWT lives in HttpOnly cookie). */
export interface AuthSession {
  user: User
}
