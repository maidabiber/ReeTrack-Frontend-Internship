export type HourTargetMode = 'Daily' | 'Weekly'

export interface HourTargetSettings {
  mode: HourTargetMode
  targetHours: number
}

export interface UserHourTarget {
  userId: string
  mode: HourTargetMode
  targetHours: number
}

export interface EffectiveHourTarget {
  mode: HourTargetMode
  targetHours: number
  isOverride: boolean
  isWorkdayToday: boolean
  holidayDates: string[]
}
