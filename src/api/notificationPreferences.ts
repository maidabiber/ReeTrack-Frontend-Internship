import { apiClient, apiErrorMessage } from './client'
import type {
  DeliveryChannel,
  NotificationPreference,
  NotificationType,
  UpsertNotificationPreference,
} from '../types/notificationPreferences'

interface NotificationPreferenceResponse {
  id: string
  userId: string
  notificationType: string
  deliveryChannel: string
  isEnabled: boolean
}

function toPreference(response: NotificationPreferenceResponse): NotificationPreference | null {
  if (
    response.notificationType !== 'TimeEntryShared' &&
    response.notificationType !== 'TimesheetDecision'
  ) {
    return null
  }

  if (response.deliveryChannel !== 'Email' && response.deliveryChannel !== 'InApp') {
    return null
  }

  return {
    id: response.id,
    userId: response.userId,
    notificationType: response.notificationType,
    deliveryChannel: response.deliveryChannel,
    isEnabled: response.isEnabled,
  }
}

export function listNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
  return apiClient
    .get<NotificationPreferenceResponse[]>(`/users/${userId}/preferences`)
    .then((items) => items.map(toPreference).filter((item): item is NotificationPreference => item !== null))
}

export function updateNotificationPreferences(
  userId: string,
  preferences: UpsertNotificationPreference[],
): Promise<NotificationPreference[]> {
  return apiClient
    .put<NotificationPreferenceResponse[]>(`/users/${userId}/preferences`, {
      preferences,
    })
    .then((items) => items.map(toPreference).filter((item): item is NotificationPreference => item !== null))
}

export function notificationPreferencesErrorMessage(error: unknown): string {
  return apiErrorMessage(error, 'Could not update notification preferences.')
}

export type { NotificationType, DeliveryChannel, UpsertNotificationPreference }
