export type TimeSlot = {
  id: string
  hour: number
  minute: number
  label: string
}

/** Full day in 5-minute steps (00:00 – 23:55). */
export const TIME_SLOTS: TimeSlot[] = Array.from({ length: 288 }, (_, index) => {
  const totalMinutes = index * 5
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return {
    id: `${hour}:${String(minute).padStart(2, '0')}`,
    hour,
    minute,
    label,
  }
})

export function timeSlotId(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, '0')}`
}
