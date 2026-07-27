import { Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getSetupStatus } from '../../api/setup'
import { useAuth } from '../../hooks/useAuth'

interface PublicAuthPageProps {
  children: ReactNode
  /** When true, redirect authenticated users into the app. */
  redirectIfAuthenticated?: boolean
}

/**
 * Wrapper for /onboarding and /signin. Optionally sends signed-in users to the app.
 * On /onboarding, redirects to /signin when the workspace is no longer in first-run.
 */
export function PublicAuthPage({
  children,
  redirectIfAuthenticated = true,
}: PublicAuthPageProps) {
  const { isAuthenticated, isInitializing } = useAuth()
  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    if (isInitializing || isAuthenticated) return

    const path = window.location.pathname
    if (path !== '/onboarding') return

    let cancelled = false

    getSetupStatus()
      .then((status) => {
        if (cancelled || status.isFirstRun) return
        setRedirectTo('/signin')
      })
      .catch(() => {
        // Keep onboarding visible if setup status cannot be loaded.
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

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  if (redirectIfAuthenticated && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-navy">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
