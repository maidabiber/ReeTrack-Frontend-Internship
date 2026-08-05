import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listNotificationPreferences,
  notificationPreferencesErrorMessage,
  updateNotificationPreferences,
} from '../../api/notificationPreferences'
import { getSlackStatus, slackStatusErrorMessage, type SlackStatus } from '../../api/slack'
import { useAuth } from '../../hooks/useAuth'
import { canManageProjectThresholds } from '../../lib/projectThresholds'
import {
  PROFILE_NOTIFICATION_TYPES,
  PROFILE_TOGGLE_CHANNELS,
  createDefaultPrefsMatrix,
  isToggleableDeliveryChannel,
  type NotificationPreference,
  type NotificationType,
  type PrefsMatrix,
  type ProfileNotificationTypeRow,
  type ToggleableDeliveryChannel,
} from '../../types/notificationPreferences'

function visibleNotificationTypes(canManageAlerts: boolean): ProfileNotificationTypeRow[] {
  return PROFILE_NOTIFICATION_TYPES.filter((row) => !row.adminOnly || canManageAlerts)
}

function applyPreferencesToMatrix(
  items: NotificationPreference[],
  defaults: PrefsMatrix = createDefaultPrefsMatrix(),
): PrefsMatrix {
  const next = createDefaultPrefsMatrix()
  for (const column of PROFILE_TOGGLE_CHANNELS) {
    next[column.channel] = { ...defaults[column.channel] }
  }

  for (const item of items) {
    if (!isToggleableDeliveryChannel(item.deliveryChannel)) continue
    next[item.deliveryChannel][item.notificationType] = item.isEnabled
  }

  return next
}

function syncChannelSlice(
  channel: ToggleableDeliveryChannel,
  saved: NotificationPreference[],
  fallback: PrefsMatrix[ToggleableDeliveryChannel],
  defaults: PrefsMatrix[ToggleableDeliveryChannel],
  typesToSync: readonly ProfileNotificationTypeRow[],
): PrefsMatrix[ToggleableDeliveryChannel] {
  const synced = { ...defaults }
  for (const item of saved) {
    if (item.deliveryChannel === channel) {
      synced[item.notificationType] = item.isEnabled
    }
  }
  for (const row of typesToSync) {
    if (!saved.some((item) => item.notificationType === row.type && item.deliveryChannel === channel)) {
      synced[row.type] = fallback[row.type]
    }
  }
  return synced
}

interface NotificationPreferencesSectionProps {
  userId: string
}

export function NotificationPreferencesSection({ userId }: NotificationPreferencesSectionProps) {
  const { role } = useAuth()
  const canManageAlerts = canManageProjectThresholds(role)
  const visiblePrefs = useMemo(
    () => visibleNotificationTypes(canManageAlerts),
    [canManageAlerts],
  )

  const [prefs, setPrefs] = useState<PrefsMatrix>(() => createDefaultPrefsMatrix())
  const [loadedPrefsUserId, setLoadedPrefsUserId] = useState<string | null>(null)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null)
  const [slackStatusError, setSlackStatusError] = useState<string | null>(null)

  const prefsLoading = loadedPrefsUserId !== userId
  const prefsBusy = prefsLoading || prefsSaving

  useEffect(() => {
    let cancelled = false

    void listNotificationPreferences(userId)
      .then((items) => {
        if (cancelled) return
        setPrefs(applyPreferencesToMatrix(items))
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

  useEffect(() => {
    let cancelled = false

    void getSlackStatus()
      .then((status) => {
        if (cancelled) return
        setSlackStatus(status)
        setSlackStatusError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSlackStatus(null)
        setSlackStatusError(slackStatusErrorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleChannelPrefChange = useCallback(
    async (channel: ToggleableDeliveryChannel, type: NotificationType, enabled: boolean) => {
      const previous = prefs
      const nextSlice = { ...prefs[channel], [type]: enabled }
      const next = { ...prefs, [channel]: nextSlice }
      setPrefs(next)
      setPrefsSaving(true)
      setPrefsError(null)

      const typesToSave = visibleNotificationTypes(canManageAlerts)

      try {
        const saved = await updateNotificationPreferences(
          userId,
          typesToSave.map((row) => ({
            notificationType: row.type,
            deliveryChannel: channel,
            isEnabled: nextSlice[row.type],
          })),
        )
        setPrefs((current) => ({
          ...current,
          [channel]: syncChannelSlice(
            channel,
            saved,
            nextSlice,
            createDefaultPrefsMatrix()[channel],
            typesToSave,
          ),
        }))
      } catch (error: unknown) {
        setPrefs(previous)
        setPrefsError(notificationPreferencesErrorMessage(error))
      } finally {
        setPrefsSaving(false)
      }
    },
    [canManageAlerts, prefs, userId],
  )

  const showSlackColumn = slackStatus?.isMember === true
  const visibleToggleChannels = PROFILE_TOGGLE_CHANNELS.filter(
    (column) => column.channel !== 'Slack' || showSlackColumn,
  )

  const showSlackInvite =
    slackStatus?.isConfigured === true &&
    slackStatus.isMember === false &&
    Boolean(slackStatus.inviteUrl)

  const channelLabels = visibleToggleChannels.map((column) => column.label.toLowerCase()).join(' or ')

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-body-lg font-bold text-navy">Notifications</h2>
      <p className="max-w-lede text-notice leading-[1.5] text-navy/55">
        Important updates are always shown in the app. You can optionally also receive them by{' '}
        {channelLabels}.
      </p>

      {showSlackInvite && (
        <div className="rounded-xl bg-white px-4 py-3.5 text-notice leading-[1.5] text-navy/70 shadow-card">
          <p>You are not in the Slack workspace yet. Join to receive Slack notifications.</p>
          <a
            href={slackStatus!.inviteUrl!}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex font-display text-md font-semibold text-brand underline-offset-2 hover:underline"
          >
            Accept Slack invite
          </a>
        </div>
      )}

      {slackStatusError && (
        <div className="rounded-xl bg-red-tint px-4 py-3.5 text-notice leading-[1.5] text-red">
          {slackStatusError}
        </div>
      )}

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
              {visibleToggleChannels.map((column) => (
                <th
                  key={column.channel}
                  className="w-28 px-4 py-4 text-center font-mono text-xs font-medium tracking-[0.1em] text-navy/45 uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiblePrefs.map((row) => (
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
                {visibleToggleChannels.map((column) => (
                  <td key={column.channel} className="px-4 py-4 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={prefs[column.channel][row.type]}
                      disabled={prefsBusy}
                      onChange={(event) => {
                        void handleChannelPrefChange(column.channel, row.type, event.target.checked)
                      }}
                      aria-label={`${row.label} ${column.label}`}
                      className="h-4 w-4 accent-brand disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
