import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getIntegrationErrorFromUrl } from '../api/integrations'
import { GoogleCalendarCard } from '../components/integrations/GoogleCalendarCard'
import { Pill } from '../components/ui/Pill'
import { UserAvatar } from '../components/ui/UserAvatar'
import { useAuth } from '../hooks/useAuth'
import type { Role, UserStatus } from '../types/user'

const ROLE_DOT: Record<Role, string> = {
  Admin: 'bg-brand',
  Member: 'bg-navy/45',
}

const STATUS_DISPLAY: Record<UserStatus, string> = {
  Active: 'Active',
  Invited: 'Invited',
  Disabled: 'Deactivated',
}

const STATUS_DOT: Record<UserStatus, string> = {
  Active: 'bg-[#1E8A57]',
  Invited: 'bg-[#B8860B]',
  Disabled: 'bg-navy/35',
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs font-medium tracking-[0.1em] text-navy/45 uppercase">
        {label}
      </span>
      <div className="text-md text-navy">{children}</div>
    </div>
  )
}

/** Account profile and connected outside-app integrations. */
export default function ProfilePage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrationError] = useState<string | null>(() =>
    getIntegrationErrorFromUrl(searchParams.toString()),
  )

  useEffect(() => {
    if (!searchParams.get('integrationError')) return

    const next = new URLSearchParams(searchParams)
    next.delete('integrationError')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  if (!user) return null

  const avatarName = user.displayName ?? user.email

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-10 py-8">
      <header>
        <h1 className="font-display text-xl font-bold text-navy">Profile</h1>
        <p className="mt-segment max-w-lede text-body leading-[1.5] text-navy/60">
          Your account details and connected services.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start gap-6">
          <UserAvatar name={avatarName} size={72} aria-label={`Avatar for ${avatarName}`} />

          <div className="grid min-w-0 flex-1 gap-5 sm:grid-cols-2">
            <ProfileField label="Display name">
              {user.displayName ?? '—'}
            </ProfileField>
            <ProfileField label="Email">
              <span className="font-mono tabular-nums">{user.email}</span>
            </ProfileField>
            <ProfileField label="Role">
              <Pill label={user.role} dotClassName={ROLE_DOT[user.role]} />
            </ProfileField>
            <ProfileField label="Status">
              <Pill label={STATUS_DISPLAY[user.status]} dotClassName={STATUS_DOT[user.status]} />
            </ProfileField>
            <ProfileField label="Email verified">
              {user.emailVerified ? 'Yes' : 'No'}
            </ProfileField>
            <ProfileField label="Last login">
              {user.lastLoginAtUtc
                ? new Date(user.lastLoginAtUtc).toLocaleString()
                : '—'}
            </ProfileField>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-body-lg font-bold text-navy">Integrations</h2>

        {integrationError && (
          <div className="rounded-xl bg-red-tint px-4 py-3.5 text-notice leading-[1.5] text-red">
            {integrationError}
          </div>
        )}

        <GoogleCalendarCard />
      </section>
    </div>
  )
}
