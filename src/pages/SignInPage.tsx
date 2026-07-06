import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { BrandMark } from '../components/ui/BrandMark'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { Fineprint } from '../components/ui/Fineprint'

// Placeholder invite context; comes from the invitation link/token once the
// backend invitation flow exists.
const WORKSPACE_NAME = 'Fernhollow Co.'
const INVITER_NAME = 'Priya Shah'

/**
 * Invited-user sign-in. An invitee lands here from their email link and signs in
 * with the Google account tied to the invite. Standalone screen, outside the
 * app shell.
 */
export default function SignInPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const initials = INVITER_NAME.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  useEffect(() => {
    const authError = searchParams.get('authError')
    if (!authError) return

    setErrorMessage(authError)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const showInviteMismatch =
    errorMessage !== null &&
    (errorMessage.toLowerCase().includes('invite') ||
      errorMessage.toLowerCase().includes('access denied'))

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream text-navy">
      <BrandMark className="absolute top-9 left-14 z-[3] h-[52px] w-[52px]" />
      <span aria-hidden="true" className="absolute -top-[160px] -right-[120px] h-[360px] w-[360px] rounded-full bg-purple-tint" />
      <span aria-hidden="true" className="absolute bottom-[100px] left-[90px] h-[120px] w-[120px] rounded-[32px] bg-yellow opacity-85" />
      <span aria-hidden="true" className="absolute bottom-[200px] left-[240px] h-[76px] w-[76px] rounded-full bg-orange opacity-90" />

      <div className="relative z-[2] flex w-[460px] max-w-full flex-col items-center rounded-[24px] border border-navy/[0.08] bg-white px-14 py-[52px] text-center shadow-[0_30px_70px_rgba(31,43,77,0.14)]">
        <div className="mb-[22px] flex h-14 w-14 items-center justify-center rounded-[16px] bg-purple text-cream">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[26px] w-[26px]">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        <h1 className="mb-3 font-display text-[28px] leading-[1.25] font-bold">Sign in to ReeTrack</h1>
        <p className="mb-7 text-[15px] leading-[1.6] text-navy/70">
          {WORKSPACE_NAME} invited you to track time together. Sign in with the Google account tied to
          your invite to get started.
        </p>

        <div className="mb-7 flex w-full items-center gap-2.5 rounded-[14px] bg-cream-card px-4 py-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple font-display text-[13px] font-bold text-cream">
            {initials}
          </span>
          <span className="text-left text-[13.5px] leading-[1.45]">
            Invited by <b className="font-bold">{INVITER_NAME}</b> to join{' '}
            <b className="font-bold">{WORKSPACE_NAME}</b>
          </span>
        </div>

        <GoogleSignInButton
          returnUrl="/signin"
          className="flex w-full cursor-pointer items-center justify-center rounded-full border-2 border-navy bg-white px-6 py-[15px] font-display text-[15.5px] font-semibold text-navy hover:bg-cream-card"
        >
          <GoogleIcon className="h-5 w-5 flex-shrink-0" />
          <span>Continue with Google</span>
        </GoogleSignInButton>

        {errorMessage && (
          <div className="mt-5 flex w-full items-start gap-2.5 rounded-[14px] bg-red-tint px-4 py-3.5 text-left text-[13.5px] leading-[1.5] text-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-px h-[18px] w-[18px] flex-shrink-0">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              {showInviteMismatch ? (
                <>
                  That Google account doesn't match your invite. Ask {INVITER_NAME} to resend it, or sign in
                  with the invited email.
                </>
              ) : (
                errorMessage
              )}
            </span>
          </div>
        )}

        <Fineprint />
      </div>
    </div>
  )
}
