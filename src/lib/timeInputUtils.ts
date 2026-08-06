import { toTimeInputValue } from './calendarDate'

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function parseHh(timeValue: string): string {
  const match = timeValue.match(/^(\d{1,2}):/)
  return match ? pad(Number(match[1])) : '00'
}

export function parseMm(timeValue: string): string {
  const match = timeValue.match(/:(\d{2})$/)
  return match ? pad(Number(match[1])) : '00'
}

export function parseTimeString(raw: string): { hour: number; minute: number } | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

export function formatTimeFromDate(date: Date): string {
  return toTimeInputValue(date)
}

export function commitHourValue(
  raw: string,
  currentTimeValue: string,
): { time: string; invalid: boolean } {
  let hour: number
  let invalid = false
  if (raw === '') {
    hour = 0
  } else {
    hour = Number.parseInt(raw, 10)
    if (Number.isNaN(hour) || hour < 0 || hour > 23) {
      invalid = true
      hour = Math.min(Math.max(hour || 0, 0), 23)
    }
  }
  return { time: `${pad(hour)}:${parseMm(currentTimeValue)}`, invalid }
}

export function commitMinuteValue(
  raw: string,
  currentTimeValue: string,
): { time: string; invalid: boolean } {
  let minute: number
  let invalid = false
  if (raw === '') {
    minute = 0
  } else {
    minute = Number.parseInt(raw, 10)
    if (Number.isNaN(minute) || minute < 0 || minute > 59) {
      invalid = true
      minute = Math.min(Math.max(minute || 0, 0), 59)
    }
  }
  return { time: `${parseHh(currentTimeValue)}:${pad(minute)}`, invalid }
}

export function sanitizeTimeDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, 2)
}
