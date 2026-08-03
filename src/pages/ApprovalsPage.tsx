import { useEffect, useState } from 'react'
import { listPendingTimeEntries } from '../api/timeEntries'
import { EntryParticipantAvatars } from '../components/time/EntryParticipantAvatars'
import { ReviewPendingEntryModal } from '../components/time/ReviewPendingEntryModal'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { Icon } from '../components/ui/Icon'
import { Pill } from '../components/ui/Pill'
import { useAuth } from '../hooks/useAuth'
import { getEntryMembers } from '../lib/entryParticipants'
import { formatDurationHms } from '../lib/formatDuration'
import {
  PENDING_ENTRY_AVATAR_RING_CLASS,
  PENDING_ENTRY_ROW_CLASS,
  TIME_ENTRY_LIST_CLASS,
} from '../lib/pendingEntryStyles'
import type { TimeEntry } from '../types/timeEntry'

/**
 * RT-111 / RT-112 — pending shared time entries awaiting assignee approval.
 */
export default function ApprovalsPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [hasFetched, setHasFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)

  const isLoading = !hasFetched

  useEffect(() => {
    let cancelled = false

    listPendingTimeEntries()
      .then((pending) => {
        if (cancelled) return
        setError(null)
        setEntries(pending)
        setHasFetched(true)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load pending entries.')
        setHasFetched(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={`mx-auto w-full max-w-[980px] ${PAGE_PAD}`}>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy">Approvals</h1>
        <p className="mt-1 text-md text-navy/55">
          Review time entries teammates logged on your behalf. Edit the duration or times before approving.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {isLoading ? (
          <div className="px-5 py-16 text-center text-body text-navy/50">Loading pending entries…</div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-16 text-center text-body leading-[1.6] text-navy/50">
            No pending entries.
            <br />
            When a teammate shares a manual entry with you, it will appear here.
          </div>
        ) : (
          <ul className={TIME_ENTRY_LIST_CLASS}>
            {entries.map((entry) => {
              const members = getEntryMembers(entry, { excludeUserId: user?.id })

              return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setReviewEntry(entry)}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-left ${PENDING_ENTRY_ROW_CLASS}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-md font-medium text-navy">
                      {entry.description?.trim() || 'No description'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/50">
                      <Pill label="Invitation" dotClassName="bg-brand" />
                      {entry.startedAtUtc ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(entry.startedAtUtc).toLocaleString()}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {members.length > 0 ? (
                    <EntryParticipantAvatars
                      participants={members}
                      ringClassName={PENDING_ENTRY_AVATAR_RING_CLASS}
                    />
                  ) : null}
                  <div className="shrink-0 font-mono text-md tabular-nums text-navy">
                    {formatDurationHms(entry.durationSeconds)}
                  </div>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-navy/30" />
                </button>
              </li>
              )
            })}
          </ul>
        )}
      </div>

      {reviewEntry ? (
        <ReviewPendingEntryModal
          entry={reviewEntry}
          allPending={entries}
          onClose={() => setReviewEntry(null)}
          onUpdated={(updated) => {
            setEntries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
            setReviewEntry(updated)
          }}
          onApproved={() => {
            setEntries((current) => current.filter((item) => item.id !== reviewEntry.id))
            setReviewEntry(null)
          }}
        />
      ) : null}
    </div>
  )
}
