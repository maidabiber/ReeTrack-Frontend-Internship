import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { listUnreadNotifications, markNotificationRead } from '../api/notifications'
import { useAuth } from '../hooks/useAuth'
import type { InAppNotification } from '../types/notification'
import { NotificationsContext } from './notifications'

const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/hubs/notifications'

interface ReceiveNotificationPayload {
  id?: string
  Id?: string
  subject?: string
  Subject?: string
  body?: string
  Body?: string
  createdAtUtc?: string
  CreatedAtUtc?: string
  actionUrl?: string | null
  ActionUrl?: string | null
  userId?: string
  UserId?: string
  isRead?: boolean
  IsRead?: boolean
}

function toRealtimeNotification(
  payload: ReceiveNotificationPayload,
  currentUserId: string,
): InAppNotification | null {
  const id = payload.id ?? payload.Id
  const subject = payload.subject ?? payload.Subject
  const body = payload.body ?? payload.Body
  const createdAtUtc = payload.createdAtUtc ?? payload.CreatedAtUtc

  if (!id || !subject || !body || !createdAtUtc) return null

  return {
    id: String(id),
    userId: String(payload.userId ?? payload.UserId ?? currentUserId),
    subject: String(subject),
    body: String(body),
    actionUrl: (payload.actionUrl ?? payload.ActionUrl) ?? null,
    isRead: Boolean(payload.isRead ?? payload.IsRead ?? false),
    createdAtUtc: String(createdAtUtc),
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing: isAuthInitializing, user } = useAuth()
  const [unread, setUnread] = useState<InAppNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const userIdRef = useRef(user?.id ?? '')

  useEffect(() => {
    userIdRef.current = user?.id ?? ''
  }, [user?.id])

  useEffect(() => {
    if (isAuthInitializing) return

    let cancelled = false

    void (async () => {
      // Yield so setState is not synchronous with the effect body.
      await Promise.resolve()
      if (cancelled) return

      if (!isAuthenticated) {
        setUnread([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const items = await listUnreadNotifications()
        if (!cancelled) setUnread(items)
      } catch {
        if (!cancelled) setUnread([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isAuthInitializing])

  useEffect(() => {
    if (isAuthInitializing || !isAuthenticated) return

    // Auth is the HttpOnly rt.session cookie. Same-origin /hubs proxy +
    // withCredentials sends it on negotiate and WebSocket upgrade.
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('ReceiveNotification', (payload: ReceiveNotificationPayload) => {
      const notification = toRealtimeNotification(payload, userIdRef.current)
      if (!notification) return

      setUnread((current) => {
        if (current.some((item) => item.id === notification.id)) return current
        return [notification, ...current]
      })
    })

    void connection.start().catch(() => {
      // Connection failures are non-fatal; unread list still works via REST.
    })

    return () => {
      connection.off('ReceiveNotification')
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop().catch(() => {
          // Ignore stop errors during unmount / sign-out.
        })
      }
    }
  }, [isAuthenticated, isAuthInitializing])

  const markAsRead = useCallback(async (notificationId: string) => {
    await markNotificationRead(notificationId)
    setUnread((current) => current.filter((item) => item.id !== notificationId))
  }, [])

  const value = useMemo(
    () => ({
      unread,
      unreadCount: unread.length,
      isLoading,
      markAsRead,
    }),
    [unread, isLoading, markAsRead],
  )

  return <NotificationsContext value={value}>{children}</NotificationsContext>
}
