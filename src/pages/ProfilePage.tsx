import { Icon } from '../components/ui/Icon'
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
      <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-navy/45 uppercase">
        {label}
      </span>
      <div className="text-[14px] text-navy">{children}</div>
    </div>
  )
}

/**
 * Account profile and outside-app integration settings.
 * Integrations are display-only until backend OAuth wiring is added.
 */
export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  const avatarName = user.displayName ?? user.email

  return (
    <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-6 px-10 py-8">
      <header>
        <h1 className="font-display text-[19px] font-bold text-navy">Profile</h1>
        <p className="mt-[3px] max-w-[560px] text-[13px] leading-[1.5] text-navy/60">
          Your account details and connected services.
        </p>
      </header>

      <section className="rounded-[18px] bg-white p-6 shadow-card">
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
        <h2 className="font-display text-[15px] font-bold text-navy">Integrations</h2>

        <div className="rounded-[18px] bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-surface-muted">
              <Icon name="calendar" className="h-5 w-5 text-navy/70" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-semibold text-navy">Google Calendar</p>
              <p className="mt-0.5 text-[13px] text-navy/60">
                Sync calendar events to your timer view.
              </p>
            </div>

            <span className="rounded-full bg-brand-tint px-3 py-1 font-mono text-[11px] font-medium tracking-[0.1em] text-brand uppercase">
              Not connected
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
