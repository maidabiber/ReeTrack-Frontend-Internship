export type HolidaySource = 'calendar' | 'custom'

export interface Holiday {
  id: string
  date: string
  name: string
  isActive: boolean
  source: HolidaySource
  countryCode: string | null
}

export interface HolidayCalendar {
  countryCode: string
  name: string
}

export interface HolidayCalendarSettings {
  countryCode: string | null
}
