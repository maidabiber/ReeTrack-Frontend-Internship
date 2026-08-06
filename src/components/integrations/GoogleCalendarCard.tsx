import { useEffect, useState } from 'react'
import {
  disconnectCalendarConnection,
  listCalendarConnections,
  syncCalendarConnection,
} from '../../api/integrations'
import { apiErrorMessage } from '../../api/client'
import type { CalendarConnection, CalendarSyncStatus } from '../../types/integrations'
import { GoogleCalendarConnectButton } from './GoogleCalendarConnectButton'
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal'
import { Icon } from '../ui/Icon'
import { Pill } from '../ui/Pill'
import { GoogleIcon } from '../ui/GoogleIcon'

const SYNC_STATUS_DOT: Record<CalendarSyncStatus, string> = {
  Idle: 'bg-[#1E8A57]',
  Syncing: 'bg-[#B8860B]',
  Error: 'bg-red',
}

function formatLastSynced(value: string | null): string {
  if (!value) return 'Never synced'
  return new Date(value).toLocaleString()
}

export function GoogleCalendarCard() {
  const [connection, setConnection] = useState<CalendarConnection | null>(null)
  const [fetchedKey, setFetchedKey] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  const isLoading = fetchedKey !== reloadKey

  useEffect(() => {
    let cancelled = false

    listCalendarConnections()
      .then((connections) => {
        if (cancelled) return
        const google = connections.find((item) => item.providerType === 'Google') ?? null
        setConnection(google)
        setLoadError(null)
        setFetchedKey(reloadKey)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load calendar connections. Is the backend running?')
        setFetchedKey(reloadKey)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const handleSync = () => {
    if (!connection || isSyncing) return

    setIsSyncing(true)
    setActionError(null)

    syncCalendarConnection(connection.id)
      .then((response) => {
        showNotice(response.message)
        setReloadKey((key) => key + 1)
      })
      .catch((error) => {
        setActionError(apiErrorMessage(error, 'Could not sync calendar. Please try again.'))
      })
      .finally(() => {
        setIsSyncing(false)
      })
  }

  const isConnected = connection !== null
  const syncStatus = connection?.syncStatus ?? 'Idle'
  const actionsDisabled = isSyncing || syncStatus === 'Syncing'

  return (
    <>
      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-tint px-4 py-3 text-body font-medium text-navy">
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
          {notice}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-surface-muted">
            <Icon name="calendar" className="h-5 w-5 text-navy/70" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-body font-semibold text-navy">Google Calendar</p>
            <p className="mt-0.5 text-md text-navy/60">
              Sync calendar events to your timer view.
            </p>

            {isConnected && connection.providerAccountId && (
              <p className="mt-2 font-mono text-sm text-navy/55">{connection.providerAccountId}</p>
            )}

            {isConnected && (
              <p className="mt-1 text-sm text-navy/50">
                Last synced: {formatLastSynced(connection.lastSyncedAtUtc)}
              </p>
            )}

            {isConnected && syncStatus === 'Error' && connection.lastSyncError && (
              <p className="mt-2 text-sm leading-[1.5] text-red">{connection.lastSyncError}</p>
            )}

            {actionError && (
              <p className="mt-2 text-sm leading-[1.5] text-red">{actionError}</p>
            )}
          </div>

          <div className="flex flex-shrink-0 flex-col items-end gap-3">
            {isLoading && (
              <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
            )}

            {!isLoading && loadError && (
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="rounded-full border-control border-navy px-3.5 py-1.5 font-display text-sm font-semibold text-navy"
              >
                Retry
              </button>
            )}

            {!isLoading && !loadError && !isConnected && (
              <span className="rounded-full bg-brand-tint px-3 py-1 font-mono text-xs font-medium tracking-[0.1em] text-brand uppercase">
                Not connected
              </span>
            )}

            {!isLoading && !loadError && isConnected && (
              <Pill
                label={syncStatus === 'Error' ? 'Error' : syncStatus === 'Syncing' ? 'Syncing' : 'Connected'}
                dotClassName={SYNC_STATUS_DOT[syncStatus]}
              />
            )}
          </div>
        </div>

        {!isLoading && loadError && (
          <p className="mt-4 text-body text-red">{loadError}</p>
        )}

        {!isLoading && !loadError && !isConnected && (
          <div className="mt-4 flex justify-end">
            <GoogleCalendarConnectButton className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-navy bg-white px-4 py-2 font-display text-body font-semibold text-navy transition-colors hover:bg-cream-card">
              <GoogleIcon className="h-4 w-4 flex-shrink-0" />
              <span>Connect with Google</span>
            </GoogleCalendarConnectButton>
          </div>
        )}

        {!isLoading && !loadError && isConnected && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setDisconnectOpen(true)}
              disabled={actionsDisabled}
              className="rounded-full border-control border-navy bg-transparent px-4 py-2 font-display text-body font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={actionsDisabled}
              className="rounded-full bg-brand px-4 py-2 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncStatus === 'Error' ? 'Retry sync' : 'Sync now'}
            </button>
          </div>
        )}
      </div>

      {disconnectOpen && connection && (
        <ConfirmDeleteModal
          title="Disconnect Google Calendar?"
          message="Synced events will be removed from ReeTrack. You can reconnect at any time."
          confirmLabel="Disconnect"
          confirmingLabel="Disconnecting…"
          onCancel={() => setDisconnectOpen(false)}
          onConfirm={async () => {
            await disconnectCalendarConnection(connection.id)
            setDisconnectOpen(false)
            setConnection(null)
            showNotice('Google Calendar disconnected.')
          }}
        />
      )}
    </>
  )
}
