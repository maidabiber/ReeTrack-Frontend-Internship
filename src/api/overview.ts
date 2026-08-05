import { apiClient, type RequestOptions } from './client'
import type { AdminOverview } from '../types/overview'

export function getAdminOverview(options?: RequestOptions): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('/overview', options)
}
