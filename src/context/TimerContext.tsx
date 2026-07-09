import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createManualEntry,
  createSharedManualEntry,
  createDurationOnlyEntry,
  getActiveTimer,
  listTimeEntries,
  startTimer,
  stopTimer,
  updateTimeEntry,
  updateDurationOnlyEntry,
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
  const activeTimerRef = useRef<ActiveTimer | null>(null)

  useEffect(() => {
    activeTimerRef.current = activeTimer
  }, [activeTimer])

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

  const stop = useCallback(async (options?: {
    description?: string
    assigneeUserIds?: string[]
    confirmOverlap?: boolean
  }) => {
    setIsToggling(true)
    setError(null)

    const timerSnapshot = activeTimerRef.current
    if (timerSnapshot) {
      setActiveTimer(null)
      setElapsedSeconds(0)
    }

    try {
      const result = await stopTimer(options)

      const createdEntries = result.kind === 'shared' ? result.entries : [result.entry]
      setEntries((current) => {
        let next = [...current]
        for (const entry of createdEntries) {
          next = [entry, ...next.filter((item) => item.id !== entry.id)]
        }
        return next
      })

      return {
        overlapWarning: result.kind === 'shared' ? result.overlapWarning : null,
      }
    } catch (err) {
      if (timerSnapshot) {
        setActiveTimer(timerSnapshot)
        setElapsedSeconds(elapsedSecondsSince(timerSnapshot.startedAtUtc))
      }

      setError(timeEntryApiErrorMessage(err, 'Could not stop the timer.'))
      throw err
    } finally {
      setIsToggling(false)
    }
  }, [])

  const toggle = useCallback(
    async (
      description?: string,
      options?: {
        assigneeUserIds?: string[]
        confirmOverlap?: boolean
      },
    ) => {
      if (activeTimer) {
        return await stop({ description, ...options })
      }

      await start(description)
      return { overlapWarning: null }
    },
    [activeTimer, start, stop],
  )

  const addManualEntry = useCallback(
    async (params: {
      description?: string
      startedAtUtc: string
      endedAtUtc: string
      confirmOverlap?: boolean
      assigneeUserIds?: string[]
    }) => {
      setIsSavingManual(true)
      setError(null)

      try {
        const result = params.assigneeUserIds?.length
          ? await createSharedManualEntry({
              assigneeUserIds: params.assigneeUserIds,
              description: params.description,
              startedAtUtc: params.startedAtUtc,
              endedAtUtc: params.endedAtUtc,
              confirmOverlap: params.confirmOverlap,
            })
          : await createManualEntry(params)

        const createdEntries = 'entries' in result ? result.entries : [result.entry]
        setEntries((current) => {
          let next = [...current]
          for (const entry of createdEntries) {
            next = [entry, ...next.filter((item) => item.id !== entry.id)]
          }
          return next
        })

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

  const addDurationEntry = useCallback(
    async (params: {
      description?: string
      entryDateUtc: string
      durationSeconds: number
      isBillable?: boolean
    }) => {
      setIsSavingManual(true)
      setError(null)

      try {
        const result = await createDurationOnlyEntry(params)
        setEntries((current) => [result.entry, ...current.filter((item) => item.id !== result.entry.id)])
        return { overlapWarning: null }
      } catch (err) {
        const message = timeEntryApiErrorMessage(err, 'Could not save the duration entry.')
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
      startedAtUtc?: string
      endedAtUtc?: string
      durationSeconds?: number
      isBillable?: boolean
      confirmOverlap?: boolean
    }) => {
      setIsSavingEdit(true)
      setError(null)

      try {
        const result =
          params.durationSeconds !== undefined && params.endedAtUtc === undefined
            ? await updateDurationOnlyEntry(params.id, {
                description: params.description,
                entryDateUtc: params.startedAtUtc!,
                durationSeconds: params.durationSeconds,
                isBillable: params.isBillable,
              })
            : await updateTimeEntry(params.id, {
                description: params.description,
                startedAtUtc: params.startedAtUtc!,
                endedAtUtc: params.endedAtUtc!,
                isBillable: params.isBillable,
                confirmOverlap: params.confirmOverlap,
              })
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
      addDurationEntry,
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
      addDurationEntry,
      updateEntry,
      refresh,
    ],
  )

  return <TimerContext value={value}>{children}</TimerContext>
}
