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
          // Yield so setState is not synchronous with the effect body.
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

  const start = useCallback(async (description?: string) => {
    setIsToggling(true)
    setError(null)

    try {
      const timer = await startTimer(description)
      setActiveTimer(timer)
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
      isBillable?: boolean
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
              isBillable: params.isBillable,
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
