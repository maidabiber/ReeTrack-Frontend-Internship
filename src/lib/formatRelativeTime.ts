/**
 * Human-readable relative time for an ISO timestamp (e.g. "3 minutes ago").
 * Returns an empty string when the input is not a valid date.
 */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const deltaSeconds = Math.round((then - now) / 1000)
  const abs = Math.abs(deltaSeconds)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (abs < 60) return rtf.format(deltaSeconds, 'second')
  if (abs < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour')
  return rtf.format(Math.round(deltaSeconds / 86_400), 'day')
}
