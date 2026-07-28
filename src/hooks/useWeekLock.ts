import { useEffect, useState } from 'react'
import { getMyWeekTimesheet } from '../api/timesheets'
import { startOfWeek } from '../components/calendar/dateUtils'
import { toDateInputValue } from '../lib/manualEntry'
import type { TimesheetStatus } from '../types/timesheet'

/**
 * RT-71 week lock — surfaces (timer, manual entry, calendar, edit) consult this
 * to disable edits in a week whose timesheet has been submitted or approved,
 * ahead of the backend guard's 409. Rejected weeks are editable again, so only
 * Submitted/Approved lock.
 *
 * State is cached at module scope keyed by the week's UTC Monday (matching the
 * backend's TimesheetWeek.ToWeekStart), so the timer bar, manual form and
 * calendar querying the same week share one fetch instead of each hitting the
 * API. The cache refreshes on window focus and can be invalidated after a
 * submit/withdraw/send-back so the lock reflects the change without a reload.
 */

export type WeekLockStatus = Extract<TimesheetStatus, 'Submitted' | 'Approved'> | null

export interface WeekLock {
  /** UTC-Monday key of the queried week, or null when no date was given. */
  weekStartIso: string | null
  status: WeekLockStatus
  locked: boolean
}

const UNLOCKED: Omit<WeekLock, 'weekStartIso'> = { status: null, locked: false }

/** Inline copy for a locked week, matching the timesheet's own status wording. */
export function weekLockMessage(status: WeekLockStatus): string {
  return status === 'Approved'
    ? 'This week is locked. Timesheet approved.'
    : 'This week is locked. Timesheet submitted.'
}

const cache = new Map<string, Omit<WeekLock, 'weekStartIso'>>()
const inflight = new Map<string, Promise<void>>()
/** Bumped to drop stale in-flight probes when sync/invalidate races a load. */
const epoch = new Map<string, number>()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function lockFromStatus(status: TimesheetStatus | null | undefined): Omit<WeekLock, 'weekStartIso'> {
  const locked = status === 'Submitted' || status === 'Approved'
  return { status: locked ? status : null, locked }
}

function bump(weekStartIso: string) {
  epoch.set(weekStartIso, (epoch.get(weekStartIso) ?? 0) + 1)
  inflight.delete(weekStartIso)
}

/**
 * UTC-Monday key for an instant. Mirrors the timesheet view's currentWeekStart:
 * take the instant's UTC calendar date, then its Monday — so a moment logged
 * near the week boundary maps to the same week the backend locks.
 */
export function weekLockKey(instant: Date): string {
  const utcDate = new Date(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
  return toDateInputValue(startOfWeek(utcDate))
}

function load(weekStartIso: string): Promise<void> {
  const existing = inflight.get(weekStartIso)
  if (existing) return existing

  const myEpoch = epoch.get(weekStartIso) ?? 0
  const promise = getMyWeekTimesheet(weekStartIso)
    .then((week) => {
      if ((epoch.get(weekStartIso) ?? 0) !== myEpoch) return
      cache.set(weekStartIso, lockFromStatus(week.timesheet?.status ?? null))
    })
    .catch(() => {
      if ((epoch.get(weekStartIso) ?? 0) !== myEpoch) return
      // Leave the week unknown (unlocked) on error — the backend 409 is the
      // real guard, so a failed lock probe must never block editing outright.
      cache.set(weekStartIso, UNLOCKED)
    })
    .finally(() => {
      if (inflight.get(weekStartIso) === promise) inflight.delete(weekStartIso)
      notify()
    })

  inflight.set(weekStartIso, promise)
  return promise
}

/**
 * Apply an authoritative timesheet status (e.g. from TimesheetView's own fetch)
 * so timer/calendar unlock immediately when a week is Rejected without waiting
 * for window focus.
 */
export function syncWeekLock(weekStartIso: string, status: TimesheetStatus | null) {
  bump(weekStartIso)
  cache.set(weekStartIso, lockFromStatus(status))
  notify()
}

/** Drop cached lock state and refetch (all weeks, or one). */
export function invalidateWeekLock(weekStartIso?: string) {
  if (weekStartIso) {
    bump(weekStartIso)
    cache.delete(weekStartIso)
    notify()
    void load(weekStartIso)
    return
  }

  const keys = [...cache.keys()]
  for (const key of keys) bump(key)
  cache.clear()
  notify()
  for (const key of keys) void load(key)
}

/**
 * Lock state for the week containing `instant` (pass null to skip, e.g. an
 * entry with no start time). Re-renders when the shared cache updates.
 */
export function useWeekLock(instant: Date | null): WeekLock {
  const weekStartIso = instant ? weekLockKey(instant) : null
  const [, forceRender] = useState(0)

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!weekStartIso) return
    if (!cache.has(weekStartIso)) void load(weekStartIso)

    const refresh = () => void load(weekStartIso)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [weekStartIso])

  if (!weekStartIso) return { weekStartIso: null, ...UNLOCKED }
  return { weekStartIso, ...(cache.get(weekStartIso) ?? UNLOCKED) }
}
