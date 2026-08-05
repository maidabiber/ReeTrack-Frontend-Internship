import { createContext } from 'react'

export type OverviewEventKind =
  | 'timer-started'
  | 'timer-stopped'
  | 'timer-updated'

export interface OverviewEvent {
  kind: OverviewEventKind
  payload: Record<string, unknown>
}

export interface OverviewRealtimeContextValue {
  latest: OverviewEvent | null
  connectionState: string
  registerRefetcher: (fn: () => void) => void
}

export const OverviewRealtimeContext = createContext<OverviewRealtimeContextValue | undefined>(
  undefined,
)
