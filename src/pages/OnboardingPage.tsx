import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { Fineprint } from '../components/ui/Fineprint'
import { LogoMark } from '../components/ui/LogoMark'

/**
 * First-run onboarding shown when the workspace has no users yet: step 1
 * welcomes, step 2 creates the first administrator account via Google.
 * Standalone screen, rendered outside the app shell.
 */
export default function OnboardingPage() {
  const [step, setStep] = useState<0 | 1>(0)

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white text-navy">
      {step === 0 ? <WelcomeStep onContinue={() => setStep(1)} /> : <AdminStep />}
      <StepDots step={step} />
    </div>
  )
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <StepBadge label="Step 1 of 2" />
      <Blob className="h-[360px] w-[360px] -top-[160px] -right-[120px] rounded-full bg-brand-veil" />
      <Blob className="h-[220px] w-[220px] top-[120px] -left-[90px] rounded-full bg-brand-tint" />
      <Blob className="h-[130px] w-[130px] bottom-[120px] left-[100px] rotate-6 rounded-[32px] bg-brand opacity-85" />
      <Blob className="h-[80px] w-[80px] bottom-[220px] left-[260px] rounded-full bg-brand-hi opacity-90" />
      <Blob className="h-[54px] w-[54px] top-[280px] right-[110px] rounded-full bg-brand opacity-70" />
      <Blob className="h-[92px] w-[92px] bottom-[160px] right-[190px] rotate-12 rounded-[26px] bg-brand-veil" />
      <Blob className="h-[30px] w-[30px] top-[200px] left-[400px] -rotate-6 rounded-[9px] bg-brand-tint" />

      <div className="relative z-[2] flex flex-col items-center px-16 text-center">
        <LogoMark className="h-11" />
        <span aria-hidden="true" className="mt-3 block h-px w-[120px] bg-brand-gradient" />
        <h1 className="mt-7 mb-[18px] max-w-[680px] font-display text-[56px] leading-[1.08] font-bold">
          Welcome.
        </h1>
        <p className="mb-14 max-w-[460px] text-[18px] leading-[1.6] text-navy/70">
          Looks like this is a brand new workspace. Let's get the first administrator account set up so
          your team can start tracking time.
        </p>
        <button
          type="button"
          onClick={onContinue}
          aria-label="Continue"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_24px_rgba(31,43,77,0.18)] transition-transform hover:-translate-y-[3px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <span className="mt-[18px] font-display text-[13px] font-semibold text-navy/55">Click to continue</span>
      </div>
    </>
  )
}

function AdminStep() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Capture the backend's ?authError=... once on mount, then strip it from the URL.
  const [errorMessage] = useState<string | null>(() => searchParams.get('authError'))

  useEffect(() => {
    if (!searchParams.get('authError')) return
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  return (
    <>
      <StepBadge label="Step 2 of 2" />
      <Blob className="h-[360px] w-[360px] -top-[160px] -right-[120px] rounded-full bg-brand-veil" />
      <Blob className="h-[220px] w-[220px] top-[120px] -left-[90px] rounded-full bg-brand-tint" />
      <Blob className="h-[120px] w-[120px] bottom-[100px] left-[90px] rotate-6 rounded-[32px] bg-brand opacity-85" />
      <Blob className="h-[76px] w-[76px] bottom-[200px] left-[240px] rounded-full bg-brand-hi opacity-90" />
      <Blob className="h-[54px] w-[54px] top-[280px] right-[90px] rounded-full bg-brand opacity-70" />
      <Blob className="h-[92px] w-[92px] bottom-[130px] right-[170px] rotate-12 rounded-[26px] bg-brand-veil" />

      <div className="relative z-[2] flex flex-col items-center px-16">
        <div className="w-[460px] max-w-full rounded-[25px] bg-brand-gradient p-px shadow-[0_30px_70px_rgba(31,43,77,0.14)]">
          <div className="flex flex-col items-center rounded-[24px] bg-white px-14 py-[52px] text-center">
            <LogoMark className="mb-5 h-9" />
            <h1 className="mb-3 font-display text-[28px] leading-[1.25] font-bold">
              Create the first administrator account
            </h1>
            <p className="mb-8 text-[15px] leading-[1.6] text-navy/70">
              You're the first person here. This account will manage billing, users and settings for your
              company on ReeTrack.
            </p>

            <GoogleSignInButton
              returnUrl="/onboarding"
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border-2 border-navy bg-white px-6 py-[15px] font-display text-[15.5px] font-semibold text-navy hover:bg-surface-muted"
            >
              <GoogleIcon className="h-5 w-5 flex-shrink-0" />
              <span>Sign up with Google</span>
            </GoogleSignInButton>

            {errorMessage && (
              <div className="mt-5 flex w-full items-start gap-2.5 rounded-[14px] bg-red-tint px-4 py-3.5 text-left text-[13.5px] leading-[1.5] text-red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-px h-[18px] w-[18px] flex-shrink-0">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="13" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <Fineprint />
          </div>
        </div>
      </div>
    </>
  )
}

function StepBadge({ label }: { label: string }) {
  return (
    <div className="absolute top-0 right-0 left-0 z-[3] flex items-center justify-end px-14 py-9">
      <span className="rounded-full bg-brand-tint px-4 py-2 font-mono text-[12px] font-medium tracking-[0.12em] text-brand uppercase">
        {label}
      </span>
    </div>
  )
}

function StepDots({ step }: { step: 0 | 1 }) {
  return (
    <div className="absolute bottom-10 left-0 z-[3] flex w-full justify-center gap-2">
      {[0, 1].map((index) => (
        <span
          key={index}
          className={`h-2 w-2 rounded-full ${step === index ? 'bg-brand' : 'bg-navy/15'}`}
        />
      ))}
    </div>
  )
}

function Blob({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute ${className}`} />
}
