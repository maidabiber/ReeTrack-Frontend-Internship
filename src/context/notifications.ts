import { createContext } from 'react'
import type { InAppNotification } from '../types/notification'

export interface NotificationsContextValue {
  unread: InAppNotification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)
