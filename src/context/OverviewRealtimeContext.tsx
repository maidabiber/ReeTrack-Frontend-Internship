import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Permissions } from '../lib/permissions'
import type { OverviewEvent, OverviewEventKind } from '../context/overviewRealtime'
import { OverviewRealtimeContext } from '../context/overviewRealtime'

const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/hubs/overview'

const EVENT_MAP: Record<string, OverviewEventKind> = {
  TimerStarted: 'timer-started',
  TimerStopped: 'timer-stopped',
  TimerUpdated: 'timer-updated',
}

export function OverviewRealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing: isAuthInitializing, hasPermission } = useAuth()
  const [latest, setLatest] = useState<OverviewEvent | null>(null)
  const [connectionState, setConnectionState] = useState<string>('disconnected')
  const refetcherRef = useRef<(() => void) | null>(null)

  const canConnect = !isAuthInitializing && isAuthenticated && hasPermission(Permissions.ReportsView)

  const registerRefetcher = useCallback((fn: () => void) => {
    refetcherRef.current = fn
  }, [])

  useEffect(() => {
    if (!canConnect) return

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    for (const [serverEvent, kind] of Object.entries(EVENT_MAP)) {
      connection.on(serverEvent, (payload: Record<string, unknown>) => {
        setLatest({ kind, payload })
        refetcherRef.current?.()
      })
    }

    connection.onreconnecting(() => setConnectionState('reconnecting'))
    connection.onreconnected(() => {
      setConnectionState('connected')
      refetcherRef.current?.()
    })
    connection.onclose(() => setConnectionState('disconnected'))

    void connection.start().then(() => setConnectionState('connected')).catch(() => {
      // Connection failures are non-fatal; REST polling still works.
    })

    return () => {
      connection.off('TimerStarted')
      connection.off('TimerStopped')
      connection.off('TimerUpdated')
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop().catch(() => {})
      }
    }
  }, [canConnect])

  const value = useMemo(
    () => ({ latest, connectionState, registerRefetcher }),
    [latest, connectionState, registerRefetcher],
  )

  return <OverviewRealtimeContext value={value}>{children}</OverviewRealtimeContext>
}
