import { useState } from 'react'
import { BrandMark } from '../components/ui/BrandMark'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { Fineprint } from '../components/ui/Fineprint'
import { startGoogleSignIn } from '../api/auth'

type Status = 'idle' | 'loading' | 'error'

// Placeholder invite context; comes from the invitation link/token once the
// backend invitation flow exists.
const WORKSPACE_NAME = 'Fernhollow Co.'
const INVITER_NAME = 'Priya Shah'

/**
 * Invited-user sign-in. An invitee lands here from their email link and signs in
 * with the Google account tied to the invite. Standalone screen, outside the
 * app shell. Google SSO is stubbed until the backend is ready.
 */
export default function SignInPage() {
  const [status, setStatus] = useState<Status>('idle')

  const initials = INVITER_NAME.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  const handleGoogle = () => {
    if (status === 'loading') return
    setStatus('loading')
    // Real Google SSO returns here; on success we'd redirect into the app, and
    // on an invite mismatch set 'error'. For now just return to idle.
    void startGoogleSignIn().then(() => setStatus('idle'))
  }

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

        <button
          type="button"
          onClick={handleGoogle}
          disabled={status === 'loading'}
          className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-navy bg-white px-6 py-[15px] font-display text-[15.5px] font-semibold text-navy hover:bg-cream-card disabled:cursor-default disabled:opacity-60"
        >
          {status === 'loading' ? (
            <>
              <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-navy/20 border-t-navy" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <GoogleIcon className="h-5 w-5 flex-shrink-0" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {status === 'error' && (
          <div className="mt-5 flex w-full items-start gap-2.5 rounded-[14px] bg-red-tint px-4 py-3.5 text-left text-[13.5px] leading-[1.5] text-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-px h-[18px] w-[18px] flex-shrink-0">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              That Google account doesn't match your invite. Ask {INVITER_NAME} to resend it, or sign in
              with the invited email.
            </span>
          </div>
        )}

        <Fineprint />
      </div>
    </div>
  )
}
