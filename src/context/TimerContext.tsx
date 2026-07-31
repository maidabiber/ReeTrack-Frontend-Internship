import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
} from '../api/timeEntries'
import { ApiError, apiErrorMessage } from '../api/client'
import { elapsedSecondsSince } from '../lib/formatDuration'
import type { ActiveTimer, TimeEntry, TimeEntryAssociations, TimeEntryTag } from '../types/timeEntry'
import { useAuth } from '../hooks/useAuth'
import { TimerContext } from './timer'
import {
  initialTimeEntryDraft,
  timeEntryDraftReducer,
} from './timerDraftReducer'
import type { Teammate } from '../lib/mention'

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
  const [draft, dispatchDraft] = useReducer(timeEntryDraftReducer, initialTimeEntryDraft)
  const hadActiveTimerRef = useRef(false)

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

  useEffect(() => {
    // or started elsewhere) so the tracker bar reflects it. Deliberately
    // does not fire on every activeTimer update so in-flight edits to the
    // draft (e.g. changing the project while the timer runs) are not
    // clobbered by our own start()/refresh() responses.
    if (activeTimer && !hadActiveTimerRef.current) {
      dispatchDraft({ type: 'SYNC_FROM_TIMER', timer: activeTimer })
    }
    hadActiveTimerRef.current = activeTimer !== null
  }, [activeTimer])

  const setDraftDescription = useCallback((description: string) => {
    dispatchDraft({ type: 'SET_DESCRIPTION', description })
  }, [])

  const setDraftMentionedTeammates = useCallback((mentionedTeammates: Teammate[]) => {
    dispatchDraft({ type: 'SET_MENTIONED_TEAMMATES', mentionedTeammates })
  }, [])

  const setDraftProject = useCallback(
    (project: {
      projectId: string | null
      projectTaskId: string | null
      projectName: string | null
      projectColor: string | null
      projectTaskName: string | null
    }) => {
      dispatchDraft({ type: 'SET_PROJECT', ...project })
    },
    [],
  )

  const clearDraftProject = useCallback(() => {
    console.log('Clearing draft project')
    dispatchDraft({ type: 'CLEAR_PROJECT' })
  }, [])

  const setDraftTags = useCallback((tagIds: string[], knownTags: TimeEntryTag[]) => {
    dispatchDraft({ type: 'SET_TAGS', tagIds, knownTags })
  }, [])

  const removeDraftTag = useCallback((tagId: string) => {
    dispatchDraft({ type: 'REMOVE_TAG', tagId })
  }, [])

  const setDraftBillable = useCallback((isBillable: boolean) => {
    dispatchDraft({ type: 'SET_BILLABLE', isBillable })
  }, [])

  const applyDraftTemplate = useCallback(
    (template: {
      description: string
      projectId: string | null
      projectTaskId: string | null
      projectName: string | null
      projectColor: string | null
      projectTaskName: string | null
      tagIds: string[]
      knownTags: TimeEntryTag[]
      isBillable: boolean
    }) => {
      dispatchDraft({ type: 'APPLY_TEMPLATE', ...template })
    },
    [],
  )

  const clearDraft = useCallback(() => {
    dispatchDraft({ type: 'RESET' })
  }, [])

  const elapsedSeconds =
    tick >= 0 && activeTimer ? elapsedSecondsSince(activeTimer.startedAtUtc) : 0

  const start = useCallback(async (description?: string, associations?: TimeEntryAssociations) => {
    setIsToggling(true)
    setError(null)

    try {
      const timer = await startTimer(description, associations)
      setActiveTimer(timer)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start the timer.'))
      throw err
    } finally {
      setIsToggling(false)
    }
  }, [])

  const stop = useCallback(async (options?: {
    description?: string
    assigneeUserIds?: string[]
    associations?: TimeEntryAssociations
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

      dispatchDraft({ type: 'RESET' })
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
    async (
      description?: string,
      options?: {
        assigneeUserIds?: string[]
        associations?: TimeEntryAssociations
      },
    ) => {
      if (activeTimer) {
        await stop({ description, ...options })
        return
      }

      await start(description, options?.associations)
    },
    [activeTimer, start, stop],
  )

  const addManualEntry = useCallback(
    async (params: {
      description?: string
      startedAtUtc: string
      endedAtUtc: string
      isBillable?: boolean
      assigneeUserIds?: string[]
      projectId?: string | null
      projectTaskId?: string | null
      tagIds?: string[]
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
              projectId: params.projectId,
              projectTaskId: params.projectTaskId,
              tagIds: params.tagIds,
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

        dispatchDraft({ type: 'RESET' })
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw err
        }

        const message = apiErrorMessage(err, 'Could not save the manual entry.')
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
      projectId?: string | null
      projectTaskId?: string | null
      tagIds?: string[]
    }) => {
      setIsSavingManual(true)
      setError(null)

      try {
        const result = await createDurationOnlyEntry(params)
        setEntries((current) => [result.entry, ...current.filter((item) => item.id !== result.entry.id)])
        dispatchDraft({ type: 'RESET' })
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not save the duration entry.')
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
      projectId?: string | null
      projectTaskId?: string | null
      tagIds?: string[]
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
                projectId: params.projectId,
                projectTaskId: params.projectTaskId,
                tagIds: params.tagIds,
              })
            : await updateTimeEntry(params.id, {
                description: params.description,
                startedAtUtc: params.startedAtUtc!,
                endedAtUtc: params.endedAtUtc!,
                isBillable: params.isBillable,
                projectId: params.projectId,
                projectTaskId: params.projectTaskId,
                tagIds: params.tagIds,
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
      draft,
      setDraftDescription,
      setDraftMentionedTeammates,
      setDraftProject,
      clearDraftProject,
      setDraftTags,
      removeDraftTag,
      setDraftBillable,
      applyDraftTemplate,
      clearDraft,
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
      draft,
      setDraftDescription,
      setDraftMentionedTeammates,
      setDraftProject,
      clearDraftProject,
      setDraftTags,
      removeDraftTag,
      setDraftBillable,
      applyDraftTemplate,
      clearDraft,
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
