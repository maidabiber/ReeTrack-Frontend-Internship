import { apiClient } from './client'
import type { Holiday, HolidayCalendar, HolidayCalendarSettings } from '../types/holidays'

interface HolidayResponse {
  id: string
  date: string
  name: string
  isActive: boolean
  source: string
  countryCode: string | null
}

interface HolidayCalendarResponse {
  countryCode: string
  name: string
}

interface HolidayCalendarSettingsResponse {
  countryCode: string | null
}

function toHoliday(response: HolidayResponse): Holiday {
  return {
    id: response.id,
    date: response.date,
    name: response.name,
    isActive: response.isActive,
    source: response.source === 'calendar' ? 'calendar' : 'custom',
    countryCode: response.countryCode,
  }
}

export function listHolidayCalendars(): Promise<HolidayCalendar[]> {
  return apiClient.get<HolidayCalendarResponse[]>('/holidays/calendars').then((items) =>
    items.map((item) => ({
      countryCode: item.countryCode,
      name: item.name,
    })),
  )
}

export function getHolidayCalendarSettings(): Promise<HolidayCalendarSettings> {
  return apiClient.get<HolidayCalendarSettingsResponse>('/holidays/settings').then((settings) => ({
    countryCode: settings.countryCode,
  }))
}

export function updateHolidayCalendarSettings(
  countryCode: string | null,
): Promise<HolidayCalendarSettings> {
  return apiClient
    .put<HolidayCalendarSettingsResponse>('/holidays/settings', { countryCode })
    .then((settings) => ({ countryCode: settings.countryCode }))
}

export function syncHolidays(): Promise<void> {
  return apiClient.post<null>('/holidays/sync').then(() => undefined)
}

export function listHolidays(): Promise<Holiday[]> {
  return apiClient.get<HolidayResponse[]>('/holidays').then((items) => items.map(toHoliday))
}

export function createCustomHoliday(input: { date: string; name: string }): Promise<Holiday> {
  return apiClient.post<HolidayResponse>('/holidays', input).then(toHoliday)
}

export function setHolidayActive(id: string, isActive: boolean): Promise<Holiday> {
  return apiClient.patch<HolidayResponse>(`/holidays/${id}`, { isActive }).then(toHoliday)
}

export function deleteCustomHoliday(id: string): Promise<void> {
  return apiClient.delete<null>(`/holidays/${id}`).then(() => undefined)
}
