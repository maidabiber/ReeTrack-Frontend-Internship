import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSetupStatus } from '../../api/setup'
import { useAuth } from '../../hooks/useAuth'

interface AuthGateProps {
  children: ReactNode
}

/**
 * Protects app routes. Redirects unauthenticated users to onboarding (first run)
 * or sign-in based on backend setup status.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()
  const [setupResolved, setSetupResolved] = useState<boolean | null>(null)
  const [isFirstRun, setIsFirstRun] = useState(false)

  useEffect(() => {
    if (isInitializing || isAuthenticated) return

    let cancelled = false

    getSetupStatus()
      .then((status) => {
        if (cancelled) return
        setIsFirstRun(status.isFirstRun)
        setSetupResolved(true)
      })
      .catch(() => {
        if (cancelled) return
        setIsFirstRun(false)
        setSetupResolved(true)
      })

    return () => {
      cancelled = true
    }
  }, [isInitializing, isAuthenticated])

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-navy">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
      </div>
    )
  }

  if (isAuthenticated) {
    return children
  }

  if (setupResolved === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-navy">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
      </div>
    )
  }

  if (isFirstRun) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />
  }

  return <Navigate to="/signin" replace state={{ from: location }} />
}
