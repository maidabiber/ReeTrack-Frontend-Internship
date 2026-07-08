import type { ReactNode } from 'react'
import { googleCalendarConnectUrl } from '../../api/integrations'

interface GoogleCalendarConnectButtonProps {
  children: ReactNode
  className?: string
  returnUrl?: string
}

export function GoogleCalendarConnectButton({
  children,
  className,
  returnUrl = '/profile',
}: GoogleCalendarConnectButtonProps) {
  return (
    <a href={googleCalendarConnectUrl(returnUrl)} className={className}>
      {children}
    </a>
  )
}
