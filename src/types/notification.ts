export interface InAppNotification {
  id: string
  userId: string
  subject: string
  body: string
  actionUrl: string | null
  isRead: boolean
  createdAtUtc: string
}
