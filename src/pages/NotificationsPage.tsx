import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { listNotifications } from '../api/notifications'
import { useNotifications } from '../hooks/useNotifications'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { formatRelativeTime } from '../lib/formatRelativeTime'
import type { InAppNotification } from '../types/notification'

const PAGE_SIZE = 10

/** Full inbox of the current user's in-app notifications (read and unread). */
export default function NotificationsPage() {
  const { markAsRead } = useNotifications()
  const [items, setItems] = useState<InAppNotification[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listNotifications(nextPage, PAGE_SIZE)
      setItems(result.items)
      setTotalCount(result.totalCount)
      setPage(result.page)
    } catch (cause: unknown) {
      setError(apiErrorMessage(cause, 'Could not load notifications. Is the backend running?'))
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      // Yield so setState is not synchronous with the effect body.
      await Promise.resolve()
      if (cancelled) return

      setLoading(true)
      setError(null)
      try {
        const result = await listNotifications(1, PAGE_SIZE)
        if (cancelled) return
        setItems(result.items)
        setTotalCount(result.totalCount)
        setPage(result.page)
      } catch (cause: unknown) {
        if (cancelled) return
        setError(apiErrorMessage(cause, 'Could not load notifications. Is the backend running?'))
        setItems([])
        setTotalCount(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const canPrev = page > 1 && !loading
  const canNext = page < totalPages && !loading

  const handleMarkAsRead = async (notification: InAppNotification) => {
    if (notification.isRead) return
    await markAsRead(notification.id)
    setItems((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
    )
  }

  return (
    <div className={`mx-auto flex w-full max-w-page flex-col gap-6 ${PAGE_PAD}`}>
      <header>
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-xl font-bold text-navy">Notifications</h1>
          {!loading && !error && (
            <span className="font-mono text-sm text-navy/55 tabular-nums">
              {String(totalCount).padStart(2, '0')}
            </span>
          )}
        </div>
        <p className="mt-segment max-w-lede text-body leading-[1.5] text-navy/70">
          Your notification history, including ones you&apos;ve already read.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl bg-white px-6 py-5 shadow-card">
          <p className="font-sans text-sm text-navy">{error}</p>
          <button
            type="button"
            className="mt-3 font-mono text-xs text-navy underline-offset-2 hover:underline"
            onClick={() => void load(page)}
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-card">
          {loading && items.length === 0 ? (
            <p className="px-6 py-8 font-sans text-sm text-navy/60">Loading notifications…</p>
          ) : items.length === 0 ? (
            <p className="px-6 py-8 font-sans text-sm text-navy/60">No notifications yet.</p>
          ) : (
            <ul>
              {items.map((notification) => (
                <li
                  key={notification.id}
                  className="border-b border-navy/10 last:border-b-0"
                >
                  <div className="flex flex-col gap-1.5 px-6 py-4">
                    <div className="flex items-start gap-2.5">
                      {!notification.isRead && (
                        <span
                          className="mt-1.5 size-2 flex-shrink-0 rounded-full bg-amber-500"
                          aria-label="Unread"
                        />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p
                          className={
                            notification.isRead
                              ? 'font-display text-sm font-medium text-navy/80'
                              : 'font-display text-sm font-semibold text-navy'
                          }
                        >
                          {notification.subject}
                        </p>
                        <p
                          className={
                            notification.isRead
                              ? 'font-sans text-sm text-navy/70'
                              : 'font-sans text-sm text-navy'
                          }
                        >
                          {notification.body}
                        </p>
                        <div className="mt-1 flex items-end justify-between gap-3">
                          <p className="font-mono text-micro text-navy/55">
                            {formatRelativeTime(notification.createdAtUtc)}
                          </p>
                          {(notification.actionUrl || !notification.isRead) && (
                            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3">
                              {notification.actionUrl && (
                                <a
                                  href={notification.actionUrl}
                                  className="font-mono text-body text-navy underline underline-offset-2 hover:text-navy/80"
                                  onClick={() => {
                                    void handleMarkAsRead(notification)
                                  }}
                                >
                                  Open
                                </a>
                              )}
                              {!notification.isRead && (
                                <button
                                  type="button"
                                  className="rounded px-1.5 py-0.5 font-mono text-body tracking-wide text-navy/70 uppercase hover:bg-navy/5 hover:text-navy"
                                  onClick={() => {
                                    void handleMarkAsRead(notification)
                                  }}
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-4 border-t border-navy/10 px-6 py-4">
              <button
                type="button"
                disabled={!canPrev}
                className="font-mono text-sm text-navy disabled:text-navy/35 hover:enabled:underline"
                onClick={() => void load(page - 1)}
              >
                Previous
              </button>
              <span className="font-mono text-sm text-navy/60 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={!canNext}
                className="font-mono text-sm text-navy disabled:text-navy/35 hover:enabled:underline"
                onClick={() => void load(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
