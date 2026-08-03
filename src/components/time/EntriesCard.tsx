import { useState } from 'react'
import { AddShareMembersModal } from './AddShareMembersModal'
import { EditEntryModal } from './EditEntryModal'
import { ReviewPendingEntryModal } from './ReviewPendingEntryModal'
import { TimeEntryListItem } from './TimeEntryListItem'
import { useTimer } from '../../hooks/useTimer'
import { useAuth } from '../../hooks/useAuth'
import { isPendingSharedWithCurrentUser } from '../../lib/entryShare'
import { TIME_ENTRY_LIST_CLASS } from '../../lib/pendingEntryStyles'
import { filterEntriesByDateRange, type DateRangeKey } from '../../lib/dateRangeFilter'
import {
  createTimeEntryTemplate,
  notifyTimeEntryTemplatesChanged,
} from '../../api/timeEntryTemplates'
import { apiErrorMessage } from '../../api/client'
import type { TimeEntry } from '../../types/timeEntry'

const TIMER_PANEL_OVERFLOW_CLASS = 'timer-panel overflow-hidden'

export function EntriesCard({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: DateRangeKey
  onDateRangeChange: (key: DateRangeKey) => void
}) {
  const { entries, isInitializing, refresh } = useTimer()
  const { user } = useAuth()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)
  const [shareEntry, setShareEntry] = useState<TimeEntry | null>(null)
  const [favouriteBusyId, setFavouriteBusyId] = useState<string | null>(null)
  const [favouriteNotice, setFavouriteNotice] = useState<string | null>(null)

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
    void refresh()
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

  if (isInitializing) {
    return (
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
          Loading entries…
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
          No time entries yet.
          <br />
          <br />
          Start the timer above, or add one manually, to see it here.
        </div>
      </div>
    )
  }

  const rangedEntries = filterEntriesByDateRange(entries, dateRange)

  if (rangedEntries.length === 0) {
    return (
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
          No entries in this range.
          <br />
          <br />
          <button
            type="button"
            onClick={() => onDateRangeChange('all')}
            className="font-semibold text-brand hover:text-brand-deep"
          >
            Show all dates
          </button>
        </div>
      </div>
    )
  }

  const displayEntries = rangedEntries.map((entry) => ({
    key: entry.id,
    entry,
    groupedEntries: [entry],
    isGroupedShare: false,
  }))

  return (
    <>
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        {favouriteNotice ? (
          <div className="border-b border-navy/[0.06] px-5 py-2.5 text-[12.5px] text-navy/70">
            {favouriteNotice}
          </div>
        ) : null}
        <ul className={TIME_ENTRY_LIST_CLASS}>
          {displayEntries.map((displayEntry) => (
            <TimeEntryListItem
              key={displayEntry.key}
              displayEntry={displayEntry}
              currentUserId={user?.id}
              onEntryClick={handleEntryClick}
              onShareClick={(entry) =>
                setShareEntry(entry)
              }
              onFavouriteClick={handleFavouriteClick}
              favouriteBusyId={favouriteBusyId}
            />
          ))}
        </ul>
      </div>

      {editingEntry ? (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
      ) : null}

      {reviewEntry ? (
        <ReviewPendingEntryModal
          entry={reviewEntry}
          allPending={entries.filter((item) => item.status === 'Pending')}
          onClose={() => setReviewEntry(null)}
          onUpdated={(updated) => {
            void refresh()
            setReviewEntry(updated)
          }}
          onApproved={handleApproved}
        />
      ) : null}

      {shareEntry && user ? (
        <AddShareMembersModal
          entry={shareEntry}
          currentUserId={user.id}
          onClose={() => setShareEntry(null)}
          onShared={() => void refresh()}
        />
      ) : null}
    </>
  )
}
