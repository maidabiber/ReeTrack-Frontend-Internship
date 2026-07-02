import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, User } from '../types/user'
import { AuthContext } from './auth'

/**
 * Placeholder signed-in user. Backend Google auth is owned by another task, so
 * until it ships the app runs as this mock Admin. Replace `MOCK_USER` and the
 * `setRole` toggle with the real session once auth is wired up.
 */
const MOCK_USER: User = {
  id: 'mock-admin',
  email: 'reese.sharma@fernhollow.co',
  displayName: 'Reese Sharma',
  avatarUrl: null,
  role: 'Admin',
  status: 'Active',
  rate: 65,
  emailVerified: true,
  lastLoginAtUtc: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER)

  const setRole = useCallback((role: Role) => {
    setUser((current) => (current ? { ...current, role } : current))
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: user !== null,
      setRole,
      signOut,
    }),
    [user, setRole, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
