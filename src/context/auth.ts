import { createContext } from 'react'
import type { AuthSession } from '../types/auth'
import type { Role, User } from '../types/user'

export interface AuthContextValue {
  /** The signed-in user, or null when not authenticated. */
  user: User | null
  /** Convenience accessor for the current user's role. */
  role: Role | null
  isAuthenticated: boolean
  /** True while the cookie-backed session is being validated on boot. */
  isInitializing: boolean
  signIn: (session: AuthSession) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
