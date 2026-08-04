import { createContext } from 'react'
import type { AuthSession } from '../types/auth'
import type { Role, User } from '../types/user'
import type { Permission } from '../lib/permissions'

export interface AuthContextValue {
  /** The signed-in user, or null when not authenticated. */
  user: User | null
  /** Convenience accessor for the current user's role. */
  role: Role | null
  /** Workspace permissions resolved from the user's roles. */
  permissions: string[]
  isAuthenticated: boolean
  /** True while the cookie-backed session is being validated on boot. */
  isInitializing: boolean
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: readonly Permission[]) => boolean
  signIn: (session: AuthSession) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
