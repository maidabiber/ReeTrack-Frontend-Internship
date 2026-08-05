/**
 * Notification preference types (mirrors backend NotificationType / DeliveryChannel).
 */

export type NotificationType =
  | 'TimeEntryShared'
  | 'TimesheetDecision'
  | 'ProjectThresholdAlert'
  | 'WeeklyTargetCheckIn'

export type DeliveryChannel = 'Email' | 'InApp' | 'Slack'

export interface NotificationPreference {
  id: string
  userId: string
  notificationType: NotificationType
  deliveryChannel: DeliveryChannel
  isEnabled: boolean
}

export interface UpsertNotificationPreference {
  notificationType: NotificationType
  deliveryChannel: DeliveryChannel
  isEnabled: boolean
}

export interface ProfileNotificationTypeRow {
  type: NotificationType
  label: string
  description: string
  /** When true, only Admins (and later Project Managers) see this row. */
  adminOnly?: boolean
}

/** Workflow notification types shown on Profile (InApp mandatory; Email/Slack optional). */
export const PROFILE_NOTIFICATION_TYPES: readonly ProfileNotificationTypeRow[] = [
  {
    type: 'TimeEntryShared',
    label: 'Shared time entries',
    description: 'When someone logs time on your behalf and needs your approval.',
  },
  {
    type: 'TimesheetDecision',
    label: 'Timesheet reviews',
    description: 'When your timesheet is approved or sent back for changes.',
  },
  {
    type: 'WeeklyTargetCheckIn',
    label: 'Weekly target check-in',
    description: 'Friday progress toward your hour target, with remaining hours and tips.',
  },
  {
    type: 'ProjectThresholdAlert',
    label: 'Project threshold alerts',
    description:
      'When a project reaches a configured percentage of its fixed fee or time estimate.',
    adminOnly: true,
  },
]

/** Toggleable Profile columns (InApp is mandatory and not listed here). */
export const PROFILE_TOGGLE_CHANNELS = [
  { channel: 'Email' as const, label: 'Email', defaultEnabled: true },
  { channel: 'Slack' as const, label: 'Slack', defaultEnabled: false },
] as const

export type ToggleableDeliveryChannel = (typeof PROFILE_TOGGLE_CHANNELS)[number]['channel']

export type ChannelPreferenceState = Record<NotificationType, boolean>

export type PrefsMatrix = Record<ToggleableDeliveryChannel, ChannelPreferenceState>

function buildChannelDefaults(defaultEnabled: boolean): ChannelPreferenceState {
  const state = {} as ChannelPreferenceState
  for (const row of PROFILE_NOTIFICATION_TYPES) {
    state[row.type] = defaultEnabled
  }
  return state
}

export function createDefaultPrefsMatrix(): PrefsMatrix {
  const matrix = {} as PrefsMatrix
  for (const column of PROFILE_TOGGLE_CHANNELS) {
    matrix[column.channel] = buildChannelDefaults(column.defaultEnabled)
  }
  return matrix
}

export function isToggleableDeliveryChannel(value: string): value is ToggleableDeliveryChannel {
  return PROFILE_TOGGLE_CHANNELS.some((column) => column.channel === value)
}

const NOTIFICATION_TYPES: ReadonlySet<string> = new Set(
  PROFILE_NOTIFICATION_TYPES.map((row) => row.type),
)

const DELIVERY_CHANNELS: ReadonlySet<string> = new Set(['Email', 'InApp', 'Slack'])

export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.has(value)
}

export function isDeliveryChannel(value: string): value is DeliveryChannel {
  return DELIVERY_CHANNELS.has(value)
}
