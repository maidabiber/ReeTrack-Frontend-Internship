import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getIntegrationErrorFromUrl } from '../api/integrations'
import {
  listNotificationPreferences,
  notificationPreferencesErrorMessage,
  updateNotificationPreferences,
} from '../api/notificationPreferences'
import { GoogleCalendarCard } from '../components/integrations/GoogleCalendarCard'
import { Pill } from '../components/ui/Pill'
import { UserAvatar } from '../components/ui/UserAvatar'
import { useAuth } from '../hooks/useAuth'
import {
  PROFILE_NOTIFICATION_TYPES,
  type NotificationType,
} from '../types/notificationPreferences'
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

type EmailPreferenceState = Record<NotificationType, boolean>

const DEFAULT_EMAIL_PREFS: EmailPreferenceState = {
  TimeEntryShared: true,
  TimesheetDecision: true,
}

/** Account profile and connected outside-app integrations. */
export default function ProfilePage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrationError] = useState<string | null>(() =>
    getIntegrationErrorFromUrl(searchParams.toString()),
  )

  const userId = user?.id
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferenceState>(DEFAULT_EMAIL_PREFS)
  const [loadedPrefsUserId, setLoadedPrefsUserId] = useState<string | null>(null)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const prefsLoading = Boolean(userId) && loadedPrefsUserId !== userId

  useEffect(() => {
    if (!searchParams.get('integrationError')) return

    const next = new URLSearchParams(searchParams)
    next.delete('integrationError')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    void listNotificationPreferences(userId)
      .then((items) => {
        if (cancelled) return
        const next = { ...DEFAULT_EMAIL_PREFS }
        for (const item of items) {
          if (item.deliveryChannel === 'Email') {
            next[item.notificationType] = item.isEnabled
          }
        }
        setEmailPrefs(next)
        setPrefsError(null)
        setLoadedPrefsUserId(userId)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPrefsError(notificationPreferencesErrorMessage(error))
        setLoadedPrefsUserId(userId)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleEmailPrefChange = useCallback(
    async (type: NotificationType, enabled: boolean) => {
      if (!user) return

      const previous = emailPrefs
      const next = { ...emailPrefs, [type]: enabled }
      setEmailPrefs(next)
      setPrefsSaving(true)
      setPrefsError(null)

      try {
        const saved = await updateNotificationPreferences(
          user.id,
          PROFILE_NOTIFICATION_TYPES.map((row) => ({
            notificationType: row.type,
            deliveryChannel: 'Email' as const,
            isEnabled: next[row.type],
          })),
        )

        const synced = { ...DEFAULT_EMAIL_PREFS }
        for (const item of saved) {
          if (item.deliveryChannel === 'Email') {
            synced[item.notificationType] = item.isEnabled
          }
        }
        for (const row of PROFILE_NOTIFICATION_TYPES) {
          if (!saved.some((item) => item.notificationType === row.type && item.deliveryChannel === 'Email')) {
            synced[row.type] = next[row.type]
          }
        }
        setEmailPrefs(synced)
      } catch (error: unknown) {
        setEmailPrefs(previous)
        setPrefsError(notificationPreferencesErrorMessage(error))
      } finally {
        setPrefsSaving(false)
      }
    },
    [emailPrefs, user],
  )

  if (!user) return null

  const avatarName = user.displayName ?? user.email
  const prefsBusy = prefsLoading || prefsSaving

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
        <h2 className="font-display text-body-lg font-bold text-navy">Notifications</h2>
        <p className="max-w-lede text-notice leading-[1.5] text-navy/55">
          Important updates are always shown in the app. You can optionally also receive them by email.
        </p>

        {prefsError && !prefsLoading && (
          <div className="rounded-xl bg-red-tint px-4 py-3.5 text-notice leading-[1.5] text-red">
            {prefsError}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full min-w-[28rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-navy/[0.06]">
                <th className="px-6 py-4 font-mono text-xs font-medium tracking-[0.1em] text-navy/45 uppercase">
                  Notification
                </th>
                <th className="w-28 px-4 py-4 text-center font-mono text-xs font-medium tracking-[0.1em] text-navy/45 uppercase">
                  In app
                </th>
                <th className="w-28 px-4 py-4 text-center font-mono text-xs font-medium tracking-[0.1em] text-navy/45 uppercase">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {PROFILE_NOTIFICATION_TYPES.map((row) => (
                <tr key={row.type} className="border-b border-navy/[0.06] last:border-b-0">
                  <td className="px-6 py-4">
                    <p className="font-display text-md font-semibold text-navy">{row.label}</p>
                    <p className="mt-1 text-notice leading-[1.5] text-navy/55">{row.description}</p>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      aria-label={`${row.label} in app (always on)`}
                      className="h-4 w-4 accent-brand disabled:cursor-not-allowed disabled:opacity-60"
                      title="Always on"
                    />
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={emailPrefs[row.type]}
                      disabled={prefsBusy}
                      onChange={(event) => {
                        void handleEmailPrefChange(row.type, event.target.checked)
                      }}
                      aria-label={`${row.label} email`}
                      className="h-4 w-4 accent-brand disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
