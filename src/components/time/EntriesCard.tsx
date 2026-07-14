import { useState } from 'react'
import { AddShareMembersModal } from './AddShareMembersModal'
import { EditEntryModal } from './EditEntryModal'
import { ReviewPendingEntryModal } from './ReviewPendingEntryModal'
import { TimeEntryListItem } from './TimeEntryListItem'
import { useTimer } from '../../hooks/useTimer'
import { useAuth } from '../../hooks/useAuth'
import { isPendingSharedWithCurrentUser, isSharedByCurrentUser } from '../../lib/entryShare'
import { groupEntriesForDisplay } from '../../lib/displayEntries'
import { TIME_ENTRY_LIST_CLASS } from '../../lib/pendingEntryStyles'
import type { TimeEntry } from '../../types/timeEntry'

const TIMER_PANEL_OVERFLOW_CLASS = 'timer-panel overflow-hidden'

export function EntriesCard() {
  const { entries, isInitializing, refresh } = useTimer()
  const { user } = useAuth()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)
  const [shareEntry, setShareEntry] = useState<{
    entry: TimeEntry
    groupedEntries?: TimeEntry[]
  } | null>(null)

  const handleEntryClick = (entry: TimeEntry) => {
    if (user && isPendingSharedWithCurrentUser(entry, user.id)) {
      setReviewEntry(entry)
      return
    }

    if (entry.status === 'Confirmed') {
      if (user && isSharedByCurrentUser(entry, user.id)) {
        return
      }

      setEditingEntry(entry)
    }
  }

  const handleApproved = () => {
    setReviewEntry(null)
    void refresh()
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

  const displayEntries = user
    ? groupEntriesForDisplay(entries, user.id)
    : entries.map((entry) => ({
        key: entry.id,
        entry,
        groupedEntries: [entry],
        isGroupedShare: false,
      }))

  return (
    <>
      <div className={TIMER_PANEL_OVERFLOW_CLASS}>
        <ul className={TIME_ENTRY_LIST_CLASS}>
          {displayEntries.map((displayEntry) => (
            <TimeEntryListItem
              key={displayEntry.key}
              displayEntry={displayEntry}
              currentUserId={user?.id}
              onEntryClick={handleEntryClick}
              onShareClick={(entry, groupedEntries) =>
                setShareEntry({ entry, groupedEntries })
              }
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
          entry={shareEntry.entry}
          groupedEntries={shareEntry.groupedEntries}
          currentUserId={user.id}
          onClose={() => setShareEntry(null)}
          onShared={() => void refresh()}
        />
      ) : null}
    </>
  )
}
