import { apiClient, apiErrorMessage } from './client'
import type { RateMultiplierSettings } from '../types/rateMultiplierSettings'

interface RateMultiplierSettingsResponse {
  weekendPremium: number
  holidayPremium: number
  overtimePremium: number
  weeklyOvertimeThresholdHours: number
}

function toSettings(response: RateMultiplierSettingsResponse): RateMultiplierSettings {
  return {
    weekendPremium: response.weekendPremium,
    holidayPremium: response.holidayPremium,
    overtimePremium: response.overtimePremium,
    weeklyOvertimeThresholdHours: response.weeklyOvertimeThresholdHours,
  }
}

export function getRateMultiplierSettings(): Promise<RateMultiplierSettings> {
  return apiClient
    .get<RateMultiplierSettingsResponse>('/rate-multiplier-settings')
    .then(toSettings)
}

export function updateRateMultiplierSettings(
  settings: RateMultiplierSettings,
): Promise<RateMultiplierSettings> {
  return apiClient
    .put<RateMultiplierSettingsResponse>('/rate-multiplier-settings', settings)
    .then(toSettings)
}

export function rateMultiplierSettingsApiErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback)
}
