import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createTimeEntry,
  createSharedTimeEntry,
  getActiveTimer,
  listTimeEntries,
  shareExistingTimeEntry,
  startTimer,
  stopTimer,
  updateTimeEntry,
} from '../api/timeEntries'
import type { TimeEntryRequest } from '../api/timeEntries'
import { ApiError, apiErrorMessage } from '../api/client'
import { elapsedSecondsSince } from '../lib/formatDuration'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'
import { useAuth } from '../hooks/useAuth'
import { TimerContext } from './timer'

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
  const activeTimerRef = useRef<ActiveTimer | null>(null)

  const requestKey = isAuthInitializing
    ? null
    : isAuthenticated
      ? 'authenticated'
      : 'anonymous'
  const isInitializing = requestKey === null || fetchedKey !== requestKey

  useEffect(() => {
    activeTimerRef.current = activeTimer
  }, [activeTimer])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setActiveTimer(null)
      setEntries([])
      return
    }

    const [active, list] = await Promise.all([getActiveTimer(), listTimeEntries()])
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

        const [active, list] = await Promise.all([getActiveTimer(), listTimeEntries()])
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
      const entry = await stopTimer(request)
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
      return entry
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
        await stop(request)
        return
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
        const entries = await createSharedTimeEntry(request)
        entry = entries.find((item) => item.shareGroupId) ?? entries[0]
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
        // Refresh the list to pick up the new pending clones
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
      start,
      stop,
      toggle,
      addManualEntry,
      addDurationEntry,
      updateEntry,
      shareEntry,
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
      start,
      stop,
      toggle,
      addManualEntry,
      addDurationEntry,
      updateEntry,
      shareEntry,
      refresh,
    ],
  )

  return <TimerContext value={value}>{children}</TimerContext>
}
