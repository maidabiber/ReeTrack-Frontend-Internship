import type { Client } from '../types/client'
import type { PagedResult } from '../types/paged'
import { apiClient } from './client'
import {
  appendListQueryParams,
  type ListQueryOptions,
  toPagedResult,
} from './pagination'

/**
 * Clients API (ClientsController, RT-45/RT-153). Reads are member-accessible;
 * mutations are admin-only.
 */

export type ClientStatusFilter = 'active' | 'archived' | 'all'

export type ListClientsOptions = ListQueryOptions

/** Mirrors backend ClientResponse. */
interface ClientResponse {
  id: string
  name: string
  isActive: boolean
  projectCount: number
  createdAtUtc: string
}

function toClient(response: ClientResponse): Client {
  return {
    id: response.id,
    name: response.name,
    isActive: response.isActive,
    projectCount: response.projectCount,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listClients(
  status: ClientStatusFilter = 'active',
  options: ListClientsOptions = {},
): Promise<PagedResult<Client>> {
  const params = new URLSearchParams({ status })
  appendListQueryParams(params, options)

  return apiClient
    .get<PagedResult<ClientResponse>>(`/clients?${params.toString()}`)
    .then((result) => toPagedResult(result, toClient))
}

export function createClient(name: string): Promise<Client> {
  return apiClient.post<ClientResponse>('/clients', { name }).then(toClient)
}

export function updateClient(
  clientId: string,
  patch: { name?: string; isActive?: boolean },
): Promise<Client> {
  return apiClient.patch<ClientResponse>(`/clients/${clientId}`, patch).then(toClient)
}

export function deleteClient(clientId: string): Promise<void> {
  return apiClient.delete(`/clients/${clientId}`).then(() => undefined)
}

export interface ClientLookup {
  id: string
  name: string
}

export function searchClients(query: string, max = 8): Promise<ClientLookup[]> {
  const params = new URLSearchParams({ q: query, max: String(max) })
  return apiClient.get<ClientLookup[]>(`/clients/search?${params}`)
}
