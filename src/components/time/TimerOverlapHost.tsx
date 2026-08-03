import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import type { TimeEntry } from '../../types/timeEntry'
import { useTimer } from '../../hooks/useTimer'
import { EditEntryModal } from './EditEntryModal'
import { TimerOverlapResolveModal } from './TimerOverlapResolveModal'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

function entryToUpdateBody(entry: TimeEntry, endedAtUtc: string) {
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

function keepaliveResolve(entry: TimeEntry, suggestedClipEndedAtUtc: string | null) {
  if (suggestedClipEndedAtUtc) {
    void fetch(`${API_BASE_URL}/time-entries/${entry.id}`, {
      method: 'PUT',
      credentials: 'include',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entryToUpdateBody(entry, suggestedClipEndedAtUtc)),
    })
    return
  }

  void fetch(`${API_BASE_URL}/time-entries/${entry.id}`, {
    method: 'DELETE',
    credentials: 'include',
    keepalive: true,
    headers: { Accept: 'application/json' },
  })
}

/**
 * Hosts the timer-stop overlap modal, edit flow, and leave/navigation clip guard.
 * Must render inside the router tree (e.g. AppLayout) for useBlocker.
 */
export function TimerOverlapHost() {
  const {
    entries,
    pendingOverlap,
    setPendingOverlapStatus,
    resolvePendingOverlap,
  } = useTimer()
  const resolvingRef = useRef(false)

  const blocker = useBlocker(Boolean(pendingOverlap))

  useEffect(() => {
    if (blocker.state !== 'blocked') return

    let cancelled = false

    void (async () => {
      if (resolvingRef.current) return
      resolvingRef.current = true
      try {
        await resolvePendingOverlap()
        if (!cancelled) blocker.proceed()
      } catch {
        if (!cancelled) blocker.reset()
      } finally {
        resolvingRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [blocker, resolvePendingOverlap])

  useEffect(() => {
    if (!pendingOverlap) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const onPageHide = () => {
      keepaliveResolve(pendingOverlap.entry, pendingOverlap.suggestedClipEndedAtUtc)
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [pendingOverlap])

  if (!pendingOverlap) return null

  const dayEntries = entries.filter((entry) => {
    if (!entry.startedAtUtc || !pendingOverlap.entry.startedAtUtc) return false
    const day = new Date(pendingOverlap.entry.startedAtUtc)
    const entryDay = new Date(entry.startedAtUtc)
    return (
      day.getFullYear() === entryDay.getFullYear() &&
      day.getMonth() === entryDay.getMonth() &&
      day.getDate() === entryDay.getDate()
    )
  })

  return (
    <>
      {pendingOverlap.status === 'open' ? (
        <TimerOverlapResolveModal
          entry={pendingOverlap.entry}
          overlapMessage={pendingOverlap.overlapMessage}
          suggestedClipEndedAtUtc={pendingOverlap.suggestedClipEndedAtUtc}
          overlappingEntries={pendingOverlap.overlappingEntries}
          dayEntries={dayEntries}
          onEdit={() => setPendingOverlapStatus('editing')}
          onDismiss={() => setPendingOverlapStatus('dismissed')}
        />
      ) : null}

      {pendingOverlap.status === 'editing' ? (
        <EditEntryModal
          entry={pendingOverlap.entry}
          onClose={() => setPendingOverlapStatus('open')}
        />
      ) : null}
    </>
  )
}
