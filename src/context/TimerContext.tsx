import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createManualEntry,
  getActiveTimer,
  listTimeEntries,
  startTimer,
  stopTimer,
  updateTimeEntry,
  timeEntryApiErrorMessage,
} from '../api/timeEntries'
import { ApiError } from '../api/client'
import { elapsedSecondsSince } from '../lib/formatDuration'
import type { ActiveTimer, TimeEntry } from '../types/timeEntry'
import { useAuth } from '../hooks/useAuth'
import { TimerContext } from './timer'

export function TimerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing: isAuthInitializing } = useAuth()
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [isSavingManual, setIsSavingManual] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setActiveTimer(null)
      setEntries([])
      setElapsedSeconds(0)
      setIsInitializing(false)
      return
    }

    const [active, list] = await Promise.all([getActiveTimer(), listTimeEntries()])
    setActiveTimer(active)
    setEntries(list)
    setElapsedSeconds(active ? elapsedSecondsSince(active.startedAtUtc) : 0)
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthInitializing) return

    let cancelled = false
    setIsInitializing(true)
    setError(null)

    refresh()
      .catch(() => {
        if (!cancelled) setError('Could not load timer state.')
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthInitializing, refresh])

  useEffect(() => {
    if (!isAuthenticated) return

    const syncOnFocus = () => {
      refresh().catch(() => undefined)
    }

    window.addEventListener('focus', syncOnFocus)
    return () => window.removeEventListener('focus', syncOnFocus)
  }, [isAuthenticated, refresh])

  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0)
      return
    }

    setElapsedSeconds(elapsedSecondsSince(activeTimer.startedAtUtc))

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(elapsedSecondsSince(activeTimer.startedAtUtc))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeTimer])

  const start = useCallback(async (description?: string) => {
    setIsToggling(true)
    setError(null)

    try {
      const timer = await startTimer(description)
      setActiveTimer(timer)
      setElapsedSeconds(0)
    } catch (err) {
      setError(timeEntryApiErrorMessage(err, 'Could not start the timer.'))
      throw err
    } finally {
      setIsToggling(false)
    }
  }, [])

  const stop = useCallback(async (description?: string) => {
    setIsToggling(true)
    setError(null)

    try {
      const entry = await stopTimer(description)
      setActiveTimer(null)
      setElapsedSeconds(0)
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
    } catch (err) {
      setError(timeEntryApiErrorMessage(err, 'Could not stop the timer.'))
      throw err
    } finally {
      setIsToggling(false)
    }
  }, [])

  const toggle = useCallback(
    async (description?: string) => {
      if (activeTimer) {
        await stop(description)
      } else {
        await start(description)
      }
    },
    [activeTimer, start, stop],
  )

  const addManualEntry = useCallback(
    async (params: {
      description?: string
      startedAtUtc: string
      endedAtUtc: string
      confirmOverlap?: boolean
    }) => {
      setIsSavingManual(true)
      setError(null)

      try {
        const result = await createManualEntry(params)
        setEntries((current) => [result.entry, ...current.filter((item) => item.id !== result.entry.id)])
        return { overlapWarning: result.overlapWarning }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw err
        }

        const message = timeEntryApiErrorMessage(err, 'Could not save the manual entry.')
        setError(message)
        throw err
      } finally {
        setIsSavingManual(false)
      }
    },
    [],
  )

  const updateEntry = useCallback(
    async (params: {
      id: string
      description?: string
      startedAtUtc: string
      endedAtUtc: string
      isBillable?: boolean
      confirmOverlap?: boolean
    }) => {
      setIsSavingEdit(true)
      setError(null)

      try {
        const result = await updateTimeEntry(params.id, params)
        setEntries((current) =>
          current
            .map((item) => (item.id === result.entry.id ? result.entry : item))
            .sort((a, b) => {
              const aTime = a.startedAtUtc ? Date.parse(a.startedAtUtc) : 0
              const bTime = b.startedAtUtc ? Date.parse(b.startedAtUtc) : 0
              return bTime - aTime
            }),
        )
        return { overlapWarning: result.overlapWarning }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw err
        }

        const message = timeEntryApiErrorMessage(err, 'Could not update the time entry.')
        setError(message)
        throw err
      } finally {
        setIsSavingEdit(false)
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
      start,
      stop,
      toggle,
      addManualEntry,
      updateEntry,
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
      updateEntry,
      refresh,
    ],
  )

  return <TimerContext value={value}>{children}</TimerContext>
}
