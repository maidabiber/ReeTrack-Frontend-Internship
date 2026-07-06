import type { SetupStatusResponse } from '../types/auth'
import { apiClient } from './client'

export function getSetupStatus(): Promise<SetupStatusResponse> {
  return apiClient.get<SetupStatusResponse>('/setup/status')
}
