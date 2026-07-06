import type { ReactNode } from 'react'
import { googleLoginUrl } from '../../api/auth'

interface GoogleSignInButtonProps {
  children: ReactNode
  className?: string
  returnUrl: string
}

export function GoogleSignInButton({ children, className, returnUrl }: GoogleSignInButtonProps) {
  return (
    <a href={googleLoginUrl(returnUrl)} className={className}>
      {children}
    </a>
  )
}
