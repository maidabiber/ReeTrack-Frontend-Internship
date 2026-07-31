import type { EffectiveHourTarget, HourTargetMode } from '../types/hourTarget'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isWorkdayDate(date: Date, holidayDates: ReadonlySet<string> | readonly string[]): boolean {
  const holidays =
    holidayDates instanceof Set ? holidayDates : new Set(holidayDates)
  return !isWeekend(date) && !holidays.has(toDateKey(date))
}

export function countWorkdaysInWeek(
  weekStart: Date,
  holidayDates: ReadonlySet<string> | readonly string[],
): number {
  const holidays =
    holidayDates instanceof Set ? holidayDates : new Set(holidayDates)
  let count = 0
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    if (isWorkdayDate(day, holidays)) count++
  }
  return count
}

export function targetSecondsForMode(
  mode: HourTargetMode,
  targetHours: number,
  options: {
    isWorkdayToday?: boolean
    weekStart?: Date
    holidayDates?: readonly string[]
  } = {},
): number | null {
  if (mode === 'Daily') {
    if (options.isWorkdayToday === false) return null
    if (options.weekStart) {
      const workdays = countWorkdaysInWeek(
        options.weekStart,
        options.holidayDates ?? [],
      )
      return Math.round(targetHours * workdays * 3600)
    }
    return Math.round(targetHours * 3600)
  }

  return Math.round(targetHours * 3600)
}

export function formatLoggedVsTarget(
  loggedSeconds: number,
  targetSeconds: number | null,
  formatDuration: (seconds: number) => string,
): string {
  const logged = formatDuration(loggedSeconds)
  if (targetSeconds === null) return logged
  return `${logged} / ${formatDuration(targetSeconds)}`
}

export function resolveWeekTargetSeconds(target: EffectiveHourTarget, weekStart: Date): number {
  return (
    targetSecondsForMode(target.mode, target.targetHours, {
      weekStart,
      holidayDates: target.holidayDates,
      isWorkdayToday: true,
    }) ?? 0
  )
}
