import { EntryParticipantAvatars, getEntryMembers } from './EntryParticipantAvatars'
import { Icon } from '../ui/Icon'
import { Pill } from '../ui/Pill'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatEntryDate } from '../../lib/manualEntry'
import {
  isPendingSharedWithCurrentUser,
  isSharedByCurrentUser,
  isShareableByCurrentUser,
} from '../../lib/entryShare'
import {
  isAwaitingApprovalEntry,
  isInvitationEntry,
  type DisplayTimeEntry,
} from '../../lib/displayEntries'
import {
  PENDING_ENTRY_AVATAR_RING_CLASS,
  PENDING_ENTRY_ROW_CLASS,
  TIME_ENTRY_ITEM_CLASS,
  TIME_ENTRY_ROW_CLASS,
} from '../../lib/pendingEntryStyles'
import type { TimeEntry } from '../../types/timeEntry'

type TimeEntryListItemProps = {
  displayEntry: DisplayTimeEntry
  currentUserId?: string
  onEntryClick: (entry: TimeEntry) => void
  onShareClick: (entry: TimeEntry, groupedEntries?: TimeEntry[]) => void
}

export function TimeEntryListItem({
  displayEntry,
  currentUserId,
  onEntryClick,
  onShareClick,
}: TimeEntryListItemProps) {
  const { entry, groupedEntries } = displayEntry
  const isReviewable = currentUserId
    ? isPendingSharedWithCurrentUser(entry, currentUserId)
    : false
  const isInvitation = currentUserId ? isInvitationEntry(entry, currentUserId) : false
  const isAwaitingApproval = currentUserId
    ? isAwaitingApprovalEntry(entry, currentUserId)
    : false
  const isReadOnlyPending = entry.status === 'Pending' && !isReviewable
  const members = getEntryMembers(entry, {
    groupedEntries: displayEntry.isGroupedShare ? groupedEntries : undefined,
    excludeUserId: currentUserId,
  })

  const isSubmitterConfirmedShare = currentUserId
    ? isSharedByCurrentUser(entry, currentUserId) && entry.status === 'Confirmed'
    : false
  const isPendingCard = isInvitation || isAwaitingApproval || isReadOnlyPending
  const canAddMembers = currentUserId ? isShareableByCurrentUser(entry, currentUserId) : false

  return (
    <li className={TIME_ENTRY_ITEM_CLASS}>
      <div
        className={`flex w-full items-center gap-4 px-5 py-4 ${
          isPendingCard ? PENDING_ENTRY_ROW_CLASS : TIME_ENTRY_ROW_CLASS
        }`}
      >
        <button
          type="button"
          onClick={() => onEntryClick(entry)}
          disabled={isReadOnlyPending || isSubmitterConfirmedShare}
          className="flex min-w-0 flex-1 items-center gap-4 text-left disabled:cursor-default"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-md font-medium text-navy">
              {entry.description?.trim() || 'No description'}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/50">
              {isInvitation ? <Pill label="Invitation" dotClassName="bg-brand" /> : null}
              {isAwaitingApproval ? <Pill label="Pending" dotClassName="bg-brand/50" /> : null}
              {(isInvitation || isAwaitingApproval) &&
              (entry.mode === 'Manual' || entry.startedAtUtc) ? (
                <span aria-hidden="true">·</span>
              ) : null}
              {entry.mode === 'Manual' ? <span>Manual</span> : null}
              {entry.mode === 'DurationOnly' ? <span>Duration only</span> : null}
              {(entry.mode === 'Manual' || entry.mode === 'DurationOnly') &&
              entry.startedAtUtc ? (
                <span aria-hidden="true">·</span>
              ) : null}
              {entry.startedAtUtc ? (
                <span>
                  {entry.mode === 'DurationOnly'
                    ? formatEntryDate(entry.startedAtUtc)
                    : new Date(entry.startedAtUtc).toLocaleString()}
                </span>
              ) : null}
            </p>
          </div>
          {members.length > 0 ? (
            <EntryParticipantAvatars
              participants={members}
              ringClassName={isPendingCard ? PENDING_ENTRY_AVATAR_RING_CLASS : 'ring-white'}
            />
          ) : null}
          <div className="shrink-0 font-mono text-md tabular-nums text-navy">
            {formatDurationHms(entry.durationSeconds)}
          </div>
          {!isReadOnlyPending && !isSubmitterConfirmedShare ? (
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-navy/30" />
          ) : null}
        </button>

        {canAddMembers ? (
          <button
            type="button"
            title="Share with a teammate"
            aria-label="Share with a teammate"
            onClick={() =>
              onShareClick(
                entry,
                displayEntry.isGroupedShare ? groupedEntries : undefined,
              )
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy/10 bg-white text-plus leading-none text-navy/55 transition-colors hover:border-brand/30 hover:bg-brand-tint hover:text-navy"
          >
            +
          </button>
        ) : null}
      </div>
    </li>
  )
}
