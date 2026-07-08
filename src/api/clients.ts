import type { Client } from '../types/client'
import { apiClient } from './client'

/**
 * Clients API (ClientsController, RT-45/RT-153). Reads are member-accessible;
 * mutations are admin-only.
 */

export type ClientStatusFilter = 'active' | 'archived' | 'all'

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

export function listClients(status: ClientStatusFilter = 'active'): Promise<Client[]> {
  return apiClient
    .get<ClientResponse[]>(`/clients?status=${status}`)
    .then((clients) => clients.map(toClient))
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

/** Extracts the backend's `{ message }` error body, falling back to a default. */
export function clientApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body: unknown }).body
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message.length > 0) return message
    }
  }
  return fallback
}
