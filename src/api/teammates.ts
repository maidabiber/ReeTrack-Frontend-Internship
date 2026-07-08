import type { Teammate } from '../lib/mention'
import { apiClient } from './client'

interface TeammateResponse {
  id: string
  email: string
  displayName: string | null
}

function toTeammate(response: TeammateResponse): Teammate {
  return {
    id: response.id,
    email: response.email,
    displayName: response.displayName,
  }
}

export function listTeammates(): Promise<Teammate[]> {
  return apiClient.get<TeammateResponse[]>('/teammates').then((teammates) => teammates.map(toTeammate))
}
