import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelativeTime } from '../../lib/formatRelativeTime'
import { Icon } from '../ui/Icon'

function NotificationBody({ body }: { body: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [truncated, setTruncated] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setTruncated(el.scrollHeight > el.clientHeight)
  }, [])

  useEffect(() => {
    measure()
  }, [body, measure])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  return (
    <p
      ref={ref}
      title={truncated ? body : undefined}
      className="line-clamp-2 font-sans text-xs text-navy/55"
    >
      {body}
    </p>
  )
}

export function NotificationBell() {
  const { unread, unreadCount, markAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-0.5 font-mono text-[9px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Unread notifications"
          className="absolute top-full right-0 z-30 mt-2 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-navy/10 bg-white shadow-lg"
        >
          <div className="border-b border-navy/8 px-3 py-2 font-display text-sm font-medium text-navy">
            Unread
          </div>

          {unread.length === 0 ? (
            <p className="px-3 py-4 font-sans text-sm text-navy/45">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {unread.map((notification) => (
                <li key={notification.id} className="border-b border-navy/5 last:border-b-0">
                  <div className="flex flex-col gap-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-display text-sm font-medium text-navy">
                        {notification.subject}
                      </p>
                    </div>
                    <NotificationBody body={notification.body} />
                    <p className="font-mono text-[10px] text-navy/35">
                      {formatRelativeTime(notification.createdAtUtc)}
                    </p>
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        className="font-mono text-[11px] text-navy/70 underline-offset-2 hover:text-navy hover:underline"
                        onClick={() => {
                          markAsRead(notification.id)
                          setOpen(false)
                        }}
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-navy/40 uppercase hover:bg-navy/5 hover:text-navy"
                      onClick={() => {
                        void markAsRead(notification.id)
                      }}
                    >
                      Mark as read
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-navy/8 px-3 py-2">
            <Link
              to="/notifications"
              className="font-mono text-[11px] text-navy/70 underline-offset-2 hover:text-navy hover:underline"
              onClick={() => setOpen(false)}
            >
              All notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
