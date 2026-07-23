import { Icon } from '../ui/Icon'
import { weekLockMessage, type WeekLockStatus } from '../../hooks/useWeekLock'

/**
 * RT-71 — inline notice explaining why a week's entries can't be edited: its
 * timesheet has been submitted or approved. Shown on the timer, manual form,
 * calendar and edit surfaces alongside the disabled controls. Pass `className`
 * to swap the default rounded box for a full-width strip.
 */
export function WeekLockBanner({
  status,
  className = 'rounded-lg bg-surface-muted px-3.5 py-2.5',
}: {
  status: WeekLockStatus
  className?: string
}) {
  if (!status) return null
  return (
    <div role="status" className={`flex items-center gap-2 text-sm text-navy/70 ${className}`}>
      <Icon name="lock" className="h-3.5 w-3.5 flex-shrink-0 text-navy/45" />
      {weekLockMessage(status)}
    </div>
  )
}

/**
 * Compact lock affordance for tight surfaces (the timer bar): a lock glyph whose
 * hover/focus tooltip carries the message, instead of an inline text warning
 * that would crowd or grow the bar.
 */
export function WeekLockIcon({
  status,
  className = '',
}: {
  status: WeekLockStatus
  className?: string
}) {
  if (!status) return null
  const message = weekLockMessage(status)
  return (
    <span
      className={`inline-flex cursor-help items-center rounded-md p-1.5 text-navy/50 ring-1 ring-navy/10 transition-colors hover:bg-surface-muted hover:text-navy ${className}`}
      title={message}
      role="img"
      aria-label={message}
      tabIndex={0}
    >
      <Icon name="lock" className="h-4 w-4" />
    </span>
  )
}
