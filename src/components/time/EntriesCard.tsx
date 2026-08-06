import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AddShareMembersModal } from './AddShareMembersModal'
import { EditEntryModal } from './EditEntryModal'
import { ReviewPendingEntryModal } from './ReviewPendingEntryModal'
import { TimeEntryListItem } from './TimeEntryListItem'
import { Icon } from '../ui/Icon'
import { useTimer } from '../../hooks/useTimer'
import { useAuth } from '../../hooks/useAuth'
import { isPendingSharedWithCurrentUser } from '../../lib/entryShare'
import { TIME_ENTRY_LIST_CLASS } from '../../lib/pendingEntryStyles'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatFullDate } from '../calendar/dateUtils'
import { toDateInputValue } from '../../lib/manualEntry'
import {
  createTimeEntryTemplate,
  notifyTimeEntryTemplatesChanged,
} from '../../api/timeEntryTemplates'
import { listTimeEntries, type TimeEntrySort } from '../../api/timeEntries'
import { apiErrorMessage } from '../../api/client'
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal'
import type { TimeEntry } from '../../types/timeEntry'

const TIMER_PANEL_OVERFLOW_CLASS = 'timer-panel overflow-hidden'
const PAGE_SIZE = 15

/** Outer wrapper keeps the tour ring outside overflow-hidden on the panel. */
function EntriesListShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative" data-tour-target="entries-list">
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>{children}</div>
    </div>
  )
}

type DayGroup = {
  key: string
  heading: string
  entries: TimeEntry[]
  totalDurationSeconds: number
}

function groupEntriesByDay(entries: TimeEntry[], newestFirst: boolean): DayGroup[] {
  const groups = new Map<string, { day: Date; entries: TimeEntry[] }>()
  const unscheduled: TimeEntry[] = []

  for (const entry of entries) {
    if (!entry.startedAtUtc) {
      unscheduled.push(entry)
      continue
    }
    const day = new Date(entry.startedAtUtc)
    const key = toDateInputValue(day)
    const group = groups.get(key) ?? { day, entries: [] }
    group.entries.push(entry)
    groups.set(key, group)
  }

  const sorted = [...groups.values()].sort((a, b) =>
    newestFirst ? b.day.getTime() - a.day.getTime() : a.day.getTime() - b.day.getTime(),
  )

  const result: DayGroup[] = sorted.map(({ day, entries: dayEntries }) => ({
    key: toDateInputValue(day),
    heading: formatFullDate(day),
    entries: dayEntries,
    totalDurationSeconds: dayEntries.reduce((sum, e) => sum + e.durationSeconds, 0),
  }))

  if (unscheduled.length > 0) {
    result.push({
      key: 'unscheduled',
      heading: 'No start time',
      entries: unscheduled,
      totalDurationSeconds: unscheduled.reduce((sum, e) => sum + e.durationSeconds, 0),
    })
  }

  return result
}

export function EntriesCard() {
  const { entries: contextEntries, isInitializing: isContextInitializing, refresh, deleteEntry } = useTimer()
  const { user } = useAuth()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)
  const [shareEntry, setShareEntry] = useState<TimeEntry | null>(null)
  const [favouriteBusyId, setFavouriteBusyId] = useState<string | null>(null)
  const [favouriteNotice, setFavouriteNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [page, setPage] = useState(1)
  const [dateFilter, setDateFilter] = useState('')
  const [sort, setSort] = useState<TimeEntrySort>('newest')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const contextRevision = useMemo(
    () => contextEntries.map((entry) => `${entry.id}:${entry.durationSeconds}:${entry.status}`).join('|'),
    [contextEntries],
  )

  const load = useCallback(async (nextPage: number) => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await listTimeEntries({
        page: nextPage,
        pageSize: PAGE_SIZE,
        date: dateFilter || null,
        sort,
        utcOffsetMinutes: dateFilter ? new Date().getTimezoneOffset() : undefined,
      })
      setEntries(result.items)
      setTotalCount(result.totalCount)
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Could not load time entries.'))
      setEntries([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, sort])

  useEffect(() => {
    if (isContextInitializing) return
    let cancelled = false

    void (async () => {
      // Yield so setState is not synchronous with the effect body.
      await Promise.resolve()
      if (cancelled) return
      await load(page)
    })()

    return () => {
      cancelled = true
    }
  }, [isContextInitializing, load, page, contextRevision])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const canPrev = page > 1 && !loading
  const canNext = page < totalPages && !loading

  const dayGroups = useMemo(
    () => groupEntriesByDay(entries, sort === 'newest'),
    [entries, sort],
  )

  const handleDateChange = (value: string) => {
    setDateFilter(value)
    setPage(1)
  }

  const handleClearDate = () => {
    setDateFilter('')
    setPage(1)
  }

  const handleSortChange = (next: TimeEntrySort) => {
    setSort(next)
    setPage(1)
  }

  const reloadAndRefresh = async () => {
    await refresh()
  }

  const handleEntryClick = (entry: TimeEntry) => {
    if (user && isPendingSharedWithCurrentUser(entry, user.id)) {
      setReviewEntry(entry)
      return
    }

    if (entry.status === 'Confirmed') {
      setEditingEntry(entry)
    }
  }

  const handleApproved = () => {
    setReviewEntry(null)
    void reloadAndRefresh()
  }

  const handleRejected = () => {
    setReviewEntry(null)
    void reloadAndRefresh()
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleFavouriteClick = async (entry: TimeEntry) => {
    if (favouriteBusyId) return

    setFavouriteNotice(null)
    setFavouriteBusyId(entry.id)
    try {
      await createTimeEntryTemplate(entry.id)
      setFavouriteNotice('Added to favourites.')
      notifyTimeEntryTemplatesChanged()
    } catch (err) {
      setFavouriteNotice(
        apiErrorMessage(err, 'Could not add this entry to favourites.'),
      )
    } finally {
      setFavouriteBusyId(null)
    }
  }

  const handleDeleteClick = (entry: TimeEntry) => {
    setDeleteTarget(entry)
  }

  if (isContextInitializing && loading) {
    return (
      <EntriesListShell>
        <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
          Loading entries…
        </div>
      </EntriesListShell>
    )
  }

  return (
    <>
      <EntriesListShell>
        <div className="flex flex-wrap items-center gap-3 border-b border-navy/[0.06] px-4 py-3">
          <label className="flex items-center gap-2 rounded-full border border-navy/[0.06] bg-white px-3 py-1.5 font-display text-sm font-bold text-navy shadow-float">
            <span className="sr-only">Filter by date</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => handleDateChange(event.target.value)}
              className="min-w-0 border-0 bg-transparent p-0 font-display text-sm font-bold text-navy outline-none"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={handleClearDate}
                className="font-display text-xs font-semibold text-navy/50 hover:text-navy"
              >
                Clear
              </button>
            )}
          </label>

          <div className="flex rounded-full border border-navy/[0.06] bg-white p-segment shadow-float">
            <button
              type="button"
              onClick={() => handleSortChange('newest')}
              className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
                sort === 'newest' ? 'bg-navy text-cream' : 'text-navy/55'
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('oldest')}
              className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold ${
                sort === 'oldest' ? 'bg-navy text-cream' : 'text-navy/55'
              }`}
            >
              Oldest
            </button>
          </div>
        </div>

        {favouriteNotice ? (
          <div className="border-b border-navy/[0.06] px-5 py-2.5 text-[12.5px] text-navy/70">
            {favouriteNotice}
          </div>
        ) : null}

        {loadError ? (
          <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
            {loadError}
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
            Loading entries…
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
            {dateFilter
              ? 'No time entries on this date.'
              : (
                <>
                  No time entries yet.
                  <br />
                  <br />
                  Start the timer above, or add one manually, to see it here.
                </>
              )}
          </div>
        ) : (
          <div className={loading ? 'opacity-60' : undefined}>
            {dayGroups.map((group) => {
              const collapsed = collapsedGroups.has(group.key)
              return (
                <section key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!collapsed}
                    className="flex w-full items-center gap-2 bg-surface-muted px-5 py-2 text-left text-sm font-semibold text-navy/60 hover:text-navy/80"
                  >
                    <Icon
                      name="chevron-down"
                      className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
                    />
                    {group.heading}
                    <span className="ml-auto font-inter text-md tabular-nums text-navy/80">
                      {formatDurationHms(group.totalDurationSeconds)}
                    </span>
                  </button>
                  {collapsed ? null : (
                    <ul className={TIME_ENTRY_LIST_CLASS}>
                      {group.entries.map((entry) => (
                        <TimeEntryListItem
                          key={entry.id}
                          displayEntry={{
                            key: entry.id,
                            entry,
                            groupedEntries: [entry],
                            isGroupedShare: false,
                          }}
                          currentUserId={user?.id}
                          onEntryClick={handleEntryClick}
                          onShareClick={(item) => setShareEntry(item)}
                          onDeleteClick={handleDeleteClick}
                          onFavouriteClick={handleFavouriteClick}
                          favouriteBusyId={favouriteBusyId}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {totalCount > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-4 border-t border-navy/[0.06] px-5 py-3">
            <button
              type="button"
              disabled={!canPrev}
              className="font-mono text-sm text-navy disabled:text-navy/35 hover:enabled:underline"
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span className="font-mono text-sm text-navy/60 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={!canNext}
              className="font-mono text-sm text-navy disabled:text-navy/35 hover:enabled:underline"
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </EntriesListShell>

      {editingEntry ? (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => void load(page)}
        />
      ) : null}

      {reviewEntry ? (
        <ReviewPendingEntryModal
          entry={reviewEntry}
          allPending={contextEntries.filter((item) => item.status === 'Pending')}
          onClose={() => setReviewEntry(null)}
          onUpdated={(updated) => {
            void reloadAndRefresh()
            setReviewEntry(updated)
          }}
          onApproved={handleApproved}
          onRejected={handleRejected}
        />
      ) : null}

      {shareEntry && user ? (
        <AddShareMembersModal
          entry={shareEntry}
          currentUserId={user.id}
          onClose={() => setShareEntry(null)}
          onShared={() => void reloadAndRefresh()}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteModal
          title="Delete time entry?"
          message="Are you sure you want to delete this entry? This action cannot be undone."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteEntry(deleteTarget.id)
            setDeleteTarget(null)
          }}
        />
      ) : null}
    </>
  )
}
