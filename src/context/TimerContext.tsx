import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createTimeEntry,
  createSharedTimeEntry,
  deleteTimeEntry,
  getActiveTimer,
  listTimeEntries,
  shareExistingTimeEntry,
  startTimer,
  stopTimer,
  updateTimeEntry,
} from '../api/timeEntries'
import type { StopTimerResult, TimeEntryRequest } from '../api/timeEntries'
import { fetchAllPages } from '../api/pagination'
import { ApiError, apiErrorMessage } from '../api/client'
import { elapsedSecondsSince } from '../lib/formatDuration'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'
import { useAuth } from '../hooks/useAuth'
import {
  TimerContext,
  type PendingOverlapStatus,
  type PendingTimerOverlap,
} from './timer'

function entryToUpdateRequest(entry: TimeEntry, endedAtUtc: string): TimeEntryRequest {
  return {
    description: entry.description ?? undefined,
    isBillable: entry.isBillable,
    startedAtUtc: entry.startedAtUtc ?? undefined,
    endedAtUtc,
    projectId: entry.projectId,
    projectTaskId: entry.projectTaskId,
    tagIds: entry.tags.map((tag) => tag.id),
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing: isAuthInitializing } = useAuth()
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [tick, setTick] = useState(0)
  const [fetchedKey, setFetchedKey] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [isSavingManual, setIsSavingManual] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOverlap, setPendingOverlap] = useState<PendingTimerOverlap | null>(null)
  const activeTimerRef = useRef<ActiveTimer | null>(null)
  const pendingOverlapRef = useRef<PendingTimerOverlap | null>(null)

  const requestKey = isAuthInitializing
    ? null
    : isAuthenticated
      ? 'authenticated'
      : 'anonymous'
  const isInitializing = requestKey === null || fetchedKey !== requestKey

  useEffect(() => {
    activeTimerRef.current = activeTimer
  }, [activeTimer])

  useEffect(() => {
    pendingOverlapRef.current = pendingOverlap
  }, [pendingOverlap])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setActiveTimer(null)
      setEntries([])
      return
    }

    const [active, list] = await Promise.all([
      getActiveTimer(),
      fetchAllPages((page, pageSize) => listTimeEntries({ page, pageSize })),
    ])
    setActiveTimer(active)
    setEntries(list)
  }, [isAuthenticated])

  useEffect(() => {
    if (requestKey === null) return

    let cancelled = false

    void (async () => {
      try {
        if (!isAuthenticated) {
          await Promise.resolve()
          if (cancelled) return
          setActiveTimer(null)
          setEntries([])
          setError(null)
          setFetchedKey(requestKey)
          return
        }

        const [active, list] = await Promise.all([
          getActiveTimer(),
          fetchAllPages((page, pageSize) => listTimeEntries({ page, pageSize })),
        ])
        if (cancelled) return
        setActiveTimer(active)
        setEntries(list)
        setError(null)
        setFetchedKey(requestKey)
      } catch {
        if (cancelled) return
        setError('Could not load timer state.')
        setFetchedKey(requestKey)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [requestKey, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    const syncOnFocus = () => {
      refresh().catch(() => undefined)
    }

    window.addEventListener('focus', syncOnFocus)
    return () => window.removeEventListener('focus', syncOnFocus)
  }, [isAuthenticated, refresh])

  useEffect(() => {
    if (!activeTimer) return

    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeTimer])

  const elapsedSeconds =
    tick >= 0 && activeTimer ? elapsedSecondsSince(activeTimer.startedAtUtc) : 0

  const clearPendingOverlap = useCallback(() => {
    setPendingOverlap(null)
  }, [])

  const setPendingOverlapFromStop = useCallback((result: StopTimerResult) => {
    if (!result.hasOverlap) {
      setPendingOverlap(null)
      return
    }

    setPendingOverlap({
      entry: result.entry,
      overlapMessage: result.overlapMessage,
      suggestedClipEndedAtUtc: result.suggestedClipEndedAtUtc,
      overlappingEntries: result.overlappingEntries,
      status: 'open',
    })
  }, [])

  const setPendingOverlapStatus = useCallback((status: PendingOverlapStatus) => {
    setPendingOverlap((current) => (current ? { ...current, status } : null))
  }, [])

  const resolvePendingOverlap = useCallback(async () => {
    const pending = pendingOverlapRef.current
    if (!pending) return

    const { entry, suggestedClipEndedAtUtc } = pending

    if (suggestedClipEndedAtUtc) {
      const updated = await updateTimeEntry(
        entry.id,
        entryToUpdateRequest(entry, suggestedClipEndedAtUtc),
      )
      setEntries((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => {
            const aTime = a.startedAtUtc ? Date.parse(a.startedAtUtc) : 0
            const bTime = b.startedAtUtc ? Date.parse(b.startedAtUtc) : 0
            return bTime - aTime
          }),
      )
    } else {
      await deleteTimeEntry(entry.id)
      setEntries((current) => current.filter((item) => item.id !== entry.id))
    }

    setPendingOverlap(null)
  }, [])

  const start = useCallback(async (request?: TimeEntryRequest) => {
    setIsToggling(true)
    setError(null)

    try {
      const timer = await startTimer(request)
      setActiveTimer(timer)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start the timer.'))
      throw err
    } finally {
      setIsToggling(false)
    }
  }, [])

  const stop = useCallback(async (request?: TimeEntryRequest) => {
    setIsToggling(true)
    setError(null)

    const timerSnapshot = activeTimerRef.current
    if (timerSnapshot) {
      setActiveTimer(null)
    }

    try {
      const result = await stopTimer(request)
      setEntries((current) => [
        result.entry,
        ...current.filter((item) => item.id !== result.entry.id),
      ])
      return result
    } catch (err) {
      if (timerSnapshot) {
        setActiveTimer(timerSnapshot)
      }

      setError(apiErrorMessage(err, 'Could not stop the timer.'))
      throw err
    } finally {
      setIsToggling(false)
    }
  }, [])

  const toggle = useCallback(
    async (request?: TimeEntryRequest) => {
      if (activeTimer) {
        return stop(request)
      }

      await start(request)
    },
    [activeTimer, start, stop],
  )

  const saveEntry = useCallback(async (request: TimeEntryRequest, fallbackError: string) => {
    setIsSavingManual(true)
    setError(null)

    try {
      let entry: TimeEntry
      if (request.assigneeUserIds?.length) {
        const created = await createSharedTimeEntry(request)
        entry = created.find((item) => item.shareGroupId) ?? created[0]
      } else {
        entry = await createTimeEntry(request)
      }

      if (entry) {
        setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        throw err
      }

      const message = apiErrorMessage(err, fallbackError)
      setError(message)
      throw err
    } finally {
      setIsSavingManual(false)
    }
  }, [])

  const addManualEntry = useCallback(
    async (request: TimeEntryRequest) => {
      await saveEntry(request, 'Could not save the manual entry.')
    },
    [saveEntry],
  )

  const addDurationEntry = useCallback(
    async (request: TimeEntryRequest) => {
      await saveEntry(request, 'Could not save the duration entry.')
    },
    [saveEntry],
  )

  const updateEntry = useCallback(
    async (id: string, request: TimeEntryRequest) => {
      setIsSavingEdit(true)
      setError(null)

      try {
        const updated = await updateTimeEntry(id, request)
        setEntries((current) =>
          current
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((a, b) => {
              const aTime = a.startedAtUtc ? Date.parse(a.startedAtUtc) : 0
              const bTime = b.startedAtUtc ? Date.parse(b.startedAtUtc) : 0
              return bTime - aTime
            }),
        )

        if (pendingOverlapRef.current?.entry.id === id) {
          setPendingOverlap(null)
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw err
        }

        const message = apiErrorMessage(err, 'Could not update the time entry.')
        setError(message)
        throw err
      } finally {
        setIsSavingEdit(false)
      }
    },
    [],
  )

  const shareEntry = useCallback(
    async (entryId: string, assigneeUserIds: string[]) => {
      setError(null)
      try {
        const shared = await shareExistingTimeEntry(entryId, { assigneeUserIds })
        await refresh()
        return shared
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not share this entry.')
        setError(message)
        throw err
      }
    },
    [refresh],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await deleteTimeEntry(id)
        setEntries((current) => current.filter((item) => item.id !== id))
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not delete the time entry.')
        setError(message)
        throw err
      }
    },
    [],
  )

  const value = useMemo(
    () => ({
      activeTimer,
      entries,
      elapsedSeconds,
      isRunning: activeTimer !== null,
      isInitializing: isAuthInitializing || isInitializing,
      isToggling,
      isSavingManual,
      isSavingEdit,
      error,
      pendingOverlap,
      start,
      stop,
      toggle,
      addManualEntry,
      addDurationEntry,
      updateEntry,
      deleteEntry,
      shareEntry,
      setPendingOverlapFromStop,
      setPendingOverlapStatus,
      clearPendingOverlap,
      resolvePendingOverlap,
      refresh,
    }),
    [
      activeTimer,
      entries,
      elapsedSeconds,
      isAuthInitializing,
      isInitializing,
      isToggling,
      isSavingManual,
      isSavingEdit,
      error,
      pendingOverlap,
      start,
      stop,
      toggle,
      addManualEntry,
      addDurationEntry,
      updateEntry,
      deleteEntry,
      shareEntry,
      setPendingOverlapFromStop,
      setPendingOverlapStatus,
      clearPendingOverlap,
      resolvePendingOverlap,
      refresh,
    ],
  )

  return <TimerContext value={value}>{children}</TimerContext>
}
