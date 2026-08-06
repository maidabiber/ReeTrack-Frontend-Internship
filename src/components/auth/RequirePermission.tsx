import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { Permission } from '../../lib/permissions'
import { NotFoundPage } from '../../pages/NotFoundPage'

export function RequirePermission({
  anyPermission,
  children,
}: {
  anyPermission: readonly Permission[]
  children: ReactNode
}) {
  const { hasAnyPermission } = useAuth()

  if (!hasAnyPermission(anyPermission)) {
    return <NotFoundPage />
  }

  return <>{children}</>
}
