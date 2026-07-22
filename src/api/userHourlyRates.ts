import { apiClient } from './client'

/** Mirrors backend UserHourlyRateResponse. */
export interface UserHourlyRate {
  id: string
  userId: string
  hourlyRate: number
  currencyCode: string
  /** ISO date yyyy-MM-dd */
  validFrom: string
  /** ISO date yyyy-MM-dd, or null when open-ended */
  validTo: string | null
}

interface UserHourlyRateResponse {
  id: string
  userId: string
  hourlyRate: number
  currencyCode: string
  validFrom: string
  validTo: string | null
}

function toUserHourlyRate(response: UserHourlyRateResponse): UserHourlyRate {
  return {
    id: response.id,
    userId: response.userId,
    hourlyRate: response.hourlyRate,
    currencyCode: response.currencyCode,
    validFrom: response.validFrom,
    validTo: response.validTo,
  }
}

export function getCurrentUserHourlyRate(
  userId: string,
  onDate?: string,
): Promise<UserHourlyRate> {
  const query = onDate ? `?onDate=${encodeURIComponent(onDate)}` : ''
  return apiClient
    .get<UserHourlyRateResponse>(`/members/${userId}/hourly-rates/current${query}`)
    .then(toUserHourlyRate)
}

export function listUserHourlyRates(userId: string): Promise<UserHourlyRate[]> {
  return apiClient
    .get<UserHourlyRateResponse[]>(`/members/${userId}/hourly-rates`)
    .then((rates) => rates.map(toUserHourlyRate))
}

export interface ChangeUserHourlyRateInput {
  hourlyRate: number
  /** ISO date yyyy-MM-dd */
  validFrom: string
  currencyCode?: string
}

export function changeUserHourlyRate(
  userId: string,
  input: ChangeUserHourlyRateInput,
): Promise<UserHourlyRate> {
  return apiClient
    .post<UserHourlyRateResponse>(`/members/${userId}/hourly-rates`, input)
    .then(toUserHourlyRate)
}

export interface UpdateUserHourlyRateInput {
  hourlyRate: number
  /** ISO date yyyy-MM-dd */
  validFrom: string
  /** ISO date yyyy-MM-dd, or null when open-ended */
  validTo: string | null
  currencyCode?: string
}

export function updateUserHourlyRate(
  userId: string,
  rateId: string,
  input: UpdateUserHourlyRateInput,
): Promise<UserHourlyRate> {
  return apiClient
    .patch<UserHourlyRateResponse>(`/members/${userId}/hourly-rates/${rateId}`, input)
    .then(toUserHourlyRate)
}
