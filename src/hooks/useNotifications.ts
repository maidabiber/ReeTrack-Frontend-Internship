import { useContext } from 'react'
import { NotificationsContext } from '../context/notifications'
import type { NotificationsContextValue } from '../context/notifications'

/** Access unread in-app notifications. Must be used within a <NotificationsProvider>. */
export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
