/** Compact duration for chart labels: "7h 30m", "45m", "0m". */
export function formatHoursLabel(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/** Decimal hours for axis ticks: "8h", "1.5h" — one decimal so close ticks don't collapse into duplicate labels. */
export function formatHoursTick(totalSeconds: number): string {
  return `${Number((totalSeconds / 3600).toFixed(1))}h`
}
