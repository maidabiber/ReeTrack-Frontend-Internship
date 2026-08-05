import { useContext } from 'react'
import { OverviewRealtimeContext } from '../context/overviewRealtime'
import type { OverviewRealtimeContextValue } from '../context/overviewRealtime'

/** Access the overview realtime connection. Must be used within an <OverviewRealtimeProvider>. */
export function useOverviewEvents(): OverviewRealtimeContextValue {
  const context = useContext(OverviewRealtimeContext)
  if (context === undefined) {
    throw new Error('useOverviewEvents must be used within an OverviewRealtimeProvider')
  }
  return context
}
