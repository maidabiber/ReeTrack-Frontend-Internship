/**
 * Notification preference types (mirrors backend NotificationType / DeliveryChannel).
 */

export type NotificationType = 'TimeEntryShared' | 'TimesheetDecision'

export type DeliveryChannel = 'Email' | 'InApp'

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

/** Workflow notification types shown on Profile (InApp mandatory; Email optional). */
export const PROFILE_NOTIFICATION_TYPES = [
  {
    type: 'TimeEntryShared' as const,
    label: 'Shared time entries',
    description: 'When someone logs time on your behalf and needs your approval.',
  },
  {
    type: 'TimesheetDecision' as const,
    label: 'Timesheet reviews',
    description: 'When your timesheet is approved or sent back for changes.',
  },
] as const
