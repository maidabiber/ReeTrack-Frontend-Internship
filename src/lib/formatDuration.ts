/** Formats a duration in seconds as H:MM:SS (e.g. 1:05:09). */
export function formatDurationHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Elapsed seconds from a UTC ISO start timestamp to now. */
export function elapsedSecondsSince(startedAtUtc: string, nowMs = Date.now()): number {
  const startedMs = Date.parse(startedAtUtc)
  if (Number.isNaN(startedMs)) return 0
  return Math.max(0, Math.floor((nowMs - startedMs) / 1000))
}
