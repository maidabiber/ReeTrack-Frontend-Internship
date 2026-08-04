import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession } from '../types/auth'
import type { Permission } from '../lib/permissions'
import { hasAnyPermission, hasPermission } from '../lib/permissions'
import { clearSession, saveSession } from '../lib/authSession'
import { getCurrentUser, signOut as apiSignOut } from '../api/auth'
import { AuthContext } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession['user'] | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false

    getCurrentUser()
      .then((session) => {
        if (cancelled) return
        saveSession(session)
        setUser(session.user)
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback((session: AuthSession) => {
    saveSession(session)
    setUser(session.user)
  }, [])

  const signOut = useCallback(() => {
    apiSignOut().catch(() => {
      // Best-effort: clear the cookie server-side. If it fails, the local
      // session is still cleared and the expired cookie will be rejected.
    })
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(() => {
    const permissions = user?.permissions ?? []

    return {
      user,
      role: user?.role ?? null,
      permissions,
      isAuthenticated: user !== null,
      isInitializing,
      hasPermission: (permission: Permission) => hasPermission(permissions, permission),
      hasAnyPermission: (required: readonly Permission[]) =>
        hasAnyPermission(permissions, required),
      signIn,
      signOut,
    }
  }, [user, isInitializing, signIn, signOut])

  return <AuthContext value={value}>{children}</AuthContext>
}
