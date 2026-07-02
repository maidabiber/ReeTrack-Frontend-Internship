import { createContext } from 'react'
import type { Role, User } from '../types/user'

export interface AuthContextValue {
  /** The signed-in user, or null when not authenticated. */
  user: User | null
  /** Convenience accessor for the current user's role. */
  role: Role | null
  isAuthenticated: boolean
  /**
   * Dev-only: switch the mock user's role so the role-based navigation can be
   * exercised without backend auth. Removed once real auth lands.
   */
  setRole: (role: Role) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
