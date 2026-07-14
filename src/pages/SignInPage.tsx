import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { Fineprint } from '../components/ui/Fineprint'
import { previewInvitation, type InvitationPreview } from '../api/members'
import { LogoMark } from '../components/ui/LogoMark'

type PreviewState = 'none' | 'loading' | 'loaded' | 'invalid'

/**
 * Invited-user sign-in. An invitee lands here from their email link
 * (/signin?token=...) and signs in with the Google account tied to the invite.
 * The token resolves to invite context via GET /api/invitations/preview.
 * Standalone screen, outside the app shell.
 */
export default function SignInPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // The backend redirects here with ?authError=... on a failed sign-in;
  // capture it once on mount, then strip it from the URL below.
  const [errorMessage] = useState<string | null>(() => searchParams.get('authError'))
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>(() =>
    searchParams.get('token') ? 'loading' : 'none',
  )

  const token = searchParams.get('token')

  useEffect(() => {
    if (!searchParams.get('authError')) return

    // Clear only authError; the invite token must survive so the invite
    // context stays visible after a failed sign-in attempt.
    const next = new URLSearchParams(searchParams)
    next.delete('authError')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    previewInvitation(token)
      .then((loaded) => {
        if (cancelled) return
        setPreview(loaded)
        setPreviewState('loaded')
      })
      .catch(() => {
        if (cancelled) return
        setPreview(null)
        setPreviewState('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const inviterName = preview?.inviterName ?? null
  const appName = preview?.appName ?? 'ReeTrack'

  const initials = (inviterName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  const showInviteMismatch =
    errorMessage !== null &&
    (errorMessage.toLowerCase().includes('invite') ||
      errorMessage.toLowerCase().includes('access denied'))

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white text-navy">
      <span aria-hidden="true" className="absolute -top-[160px] -right-[120px] h-[360px] w-[360px] rounded-full bg-brand-veil" />
      <span aria-hidden="true" className="absolute top-[120px] -left-[90px] h-[220px] w-[220px] rounded-full bg-brand-tint" />
      <span aria-hidden="true" className="absolute bottom-[100px] left-[90px] h-[120px] w-[120px] rotate-6 rounded-[32px] bg-brand opacity-85" />
      <span aria-hidden="true" className="absolute bottom-[200px] left-[240px] h-[76px] w-[76px] rounded-full bg-brand-hi opacity-90" />
      <span aria-hidden="true" className="absolute top-[64px] left-[220px] h-9 w-9 rounded-full bg-brand-hi opacity-60" />
      <span aria-hidden="true" className="absolute top-[280px] right-[90px] h-[54px] w-[54px] rounded-full bg-brand opacity-70" />
      <span aria-hidden="true" className="absolute bottom-[130px] right-[170px] h-[92px] w-[92px] rotate-12 rounded-[26px] bg-brand-veil" />
      <span aria-hidden="true" className="absolute right-[280px] bottom-[280px] h-[30px] w-[30px] -rotate-6 rounded-sm bg-brand-tint" />
      <span aria-hidden="true" className="absolute top-[420px] left-[130px] h-[44px] w-[44px] -rotate-12 rounded-[13px] bg-brand-tint opacity-90" />
      <span aria-hidden="true" className="absolute top-[560px] right-[260px] h-[64px] w-[64px] rounded-full bg-brand-veil" />
      <span aria-hidden="true" className="absolute right-[60px] bottom-[60px] h-[110px] w-[110px] rotate-[8deg] rounded-[30px] bg-brand-tint opacity-80" />
      <span aria-hidden="true" className="absolute top-[180px] left-[360px] h-5 w-5 rounded-full bg-brand opacity-50" />
      <span aria-hidden="true" className="absolute right-[420px] bottom-[40px] h-6 w-6 -rotate-12 rounded-[7px] bg-brand-hi opacity-70" />

      <div className="relative z-[2] w-auth max-w-full rounded-4xl bg-brand-gradient p-px shadow-auth">
        <div className="flex flex-col items-center rounded-4xl bg-white px-14 py-[52px] text-center">
          <LogoMark className="mb-5 h-9" label={appName} />
          <h1 className="mb-3 font-display text-2xl leading-[1.25] font-bold">Sign in</h1>
          <p className="mb-7 text-body-lg leading-[1.6] text-navy/70">
            {previewState === 'loaded' ? (
              <>
                You've been invited to track time together. Sign in with the Google account tied to
                your invite to get started.
              </>
            ) : (
              <>Sign in with the Google account your workspace admin invited.</>
            )}
          </p>

          {previewState === 'loading' && (
            <div className="mb-7 flex w-full items-center justify-center rounded-xl bg-surface-muted px-4 py-3">
              <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
            </div>
          )}

          {previewState === 'loaded' && preview && (
            <div className="mb-7 flex w-full items-center gap-2.5 rounded-xl bg-surface-muted px-4 py-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand font-mono text-md font-semibold text-white">
                {initials}
              </span>
              <span className="text-left text-notice leading-[1.45]">
                <b className="font-bold">{preview.inviterName}</b> invited{' '}
                <b className="font-bold">{preview.invitedEmail}</b> to join as a{' '}
                <b className="font-bold">{preview.role}</b>
              </span>
            </div>
          )}

          {previewState === 'invalid' && (
            <div className="mb-7 w-full rounded-xl bg-surface-muted px-4 py-3 text-left text-notice leading-[1.5] text-navy/75">
              This invite link is invalid or has expired. Ask your workspace admin to send a new
              one — or, if you've already been invited, just sign in below.
            </div>
          )}

          <GoogleSignInButton
            returnUrl="/signin"
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border-2 border-navy bg-white px-6 py-[15px] font-display text-lg font-semibold text-navy hover:bg-surface-muted"
          >
            <GoogleIcon className="h-5 w-5 flex-shrink-0" />
            <span>Continue with Google</span>
          </GoogleSignInButton>

          {errorMessage && (
            <div className="mt-5 flex w-full items-start gap-2.5 rounded-xl bg-red-tint px-4 py-3.5 text-left text-notice leading-[1.5] text-red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-px size-icon-md flex-shrink-0">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                {showInviteMismatch ? (
                  <>
                    That Google account doesn't match your invite. Sign in with the invited email
                    {inviterName ? (
                      <>
                        , or ask <b className="font-bold">{inviterName}</b> to resend it.
                      </>
                    ) : (
                      <>, or ask your workspace admin to resend it.</>
                    )}
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
    </div>
  )
}
