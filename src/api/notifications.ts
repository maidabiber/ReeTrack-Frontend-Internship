import type { InAppNotification } from '../types/notification'
import type { PagedResult } from '../types/paged'
import { apiClient } from './client'
import { appendListQueryParams, toPagedResult } from './pagination'

interface InAppNotificationResponse {
  id: string
  userId: string
  subject: string
  body: string
  actionUrl: string | null
  isRead: boolean
  createdAtUtc: string
}

function toNotification(response: InAppNotificationResponse): InAppNotification {
  return {
    id: response.id,
    userId: response.userId,
    subject: response.subject,
    body: response.body,
    actionUrl: response.actionUrl,
    isRead: response.isRead,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listUnreadNotifications(): Promise<InAppNotification[]> {
  return apiClient
    .get<InAppNotificationResponse[]>('/notifications/unread')
    .then((items) => items.map(toNotification))
}

export function listNotifications(
  page = 1,
  pageSize = 10,
): Promise<PagedResult<InAppNotification>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, { page, pageSize })

  return apiClient
    .get<PagedResult<InAppNotificationResponse>>(`/notifications?${params}`)
    .then((result) => toPagedResult(result, toNotification))
}

export function markNotificationRead(notificationId: string): Promise<void> {
  return apiClient.put(`/notifications/${notificationId}/read`).then(() => undefined)
}
