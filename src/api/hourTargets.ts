import { apiClient } from './client'
import type {
  EffectiveHourTarget,
  HourTargetMode,
  HourTargetSettings,
  UserHourTarget,
} from '../types/hourTarget'

interface HourTargetSettingsResponse {
  mode: string
  targetHours: number
}

interface UserHourTargetResponse {
  userId: string
  mode: string
  targetHours: number
}

interface EffectiveHourTargetResponse {
  mode: string
  targetHours: number
  isOverride: boolean
  isWorkdayToday: boolean
  holidayDates: string[]
}

function toMode(value: string): HourTargetMode {
  return value === 'Weekly' ? 'Weekly' : 'Daily'
}

function toSettings(response: HourTargetSettingsResponse): HourTargetSettings {
  return {
    mode: toMode(response.mode),
    targetHours: response.targetHours,
  }
}

function toUserTarget(response: UserHourTargetResponse): UserHourTarget {
  return {
    userId: response.userId,
    mode: toMode(response.mode),
    targetHours: response.targetHours,
  }
}

function toEffective(response: EffectiveHourTargetResponse): EffectiveHourTarget {
  return {
    mode: toMode(response.mode),
    targetHours: response.targetHours,
    isOverride: response.isOverride,
    isWorkdayToday: response.isWorkdayToday,
    holidayDates: response.holidayDates ?? [],
  }
}

export function getHourTargetSettings(): Promise<HourTargetSettings> {
  return apiClient.get<HourTargetSettingsResponse>('/hour-target-settings').then(toSettings)
}

export function updateHourTargetSettings(
  settings: HourTargetSettings,
): Promise<HourTargetSettings> {
  return apiClient
    .put<HourTargetSettingsResponse>('/hour-target-settings', settings)
    .then(toSettings)
}

export function getMyHourTarget(): Promise<EffectiveHourTarget> {
  return apiClient.get<EffectiveHourTargetResponse>('/hour-targets/me').then(toEffective)
}

export function getMemberHourTarget(userId: string): Promise<UserHourTarget | null> {
  return apiClient
    .get<UserHourTargetResponse | null>(`/members/${userId}/hour-target`)
    .then((response) => (response ? toUserTarget(response) : null))
}

export function upsertMemberHourTarget(
  userId: string,
  settings: Pick<HourTargetSettings, 'mode' | 'targetHours'>,
): Promise<UserHourTarget> {
  return apiClient
    .put<UserHourTargetResponse>(`/members/${userId}/hour-target`, settings)
    .then(toUserTarget)
}

export function clearMemberHourTarget(userId: string): Promise<void> {
  return apiClient.delete(`/members/${userId}/hour-target`)
}
