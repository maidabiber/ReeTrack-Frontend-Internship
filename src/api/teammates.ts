import type { Teammate } from '../lib/mention'
import { apiClient } from './client'

interface TeammateResponse {
  id: string
  email: string
  displayName: string | null
}

function toTeammate(response: TeammateResponse & Partial<Record<'Id' | 'Email' | 'DisplayName', unknown>>): Teammate {
  const id = response.id ?? response.Id
  const email = response.email ?? response.Email
  const displayName = response.displayName ?? response.DisplayName

  return {
    id: String(id ?? ''),
    email: String(email ?? ''),
    displayName: typeof displayName === 'string' ? displayName : displayName == null ? null : String(displayName),
  }
}

export function listTeammates(): Promise<Teammate[]> {
  return apiClient
    .get<(TeammateResponse & Partial<Record<'Id' | 'Email' | 'DisplayName', unknown>>)[]>('/teammates')
    .then((teammates) => teammates.map(toTeammate).filter((teammate) => teammate.id.length > 0))
}
