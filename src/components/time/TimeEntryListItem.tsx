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

const ACTION_BUTTON_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy/10 bg-white text-navy/55 transition-colors hover:border-brand/30 hover:bg-brand-tint hover:text-navy disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-navy/10 disabled:hover:bg-white disabled:hover:text-navy/55'

type TimeEntryListItemProps = {
  displayEntry: DisplayTimeEntry
  currentUserId?: string
  onEntryClick: (entry: TimeEntry) => void
  onShareClick: (entry: TimeEntry, groupedEntries?: TimeEntry[]) => void
  onFavouriteClick?: (entry: TimeEntry) => void
  favouriteBusyId?: string | null
}

export function TimeEntryListItem({
  displayEntry,
  currentUserId,
  onEntryClick,
  onShareClick,
  onFavouriteClick,
  favouriteBusyId = null,
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
  const canFavourite =
    !entry.isRunning &&
    entry.status === 'Confirmed' &&
    !isSubmitterConfirmedShare &&
    !isPendingCard
  const showActions = canFavourite || canAddMembers
  const isFavouriteBusy = favouriteBusyId === entry.id

  return (
    <li className={TIME_ENTRY_ITEM_CLASS}>
      <div
        className={`group flex w-full items-center gap-4 px-5 py-4 ${
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

        {showActions ? (
          <div className="flex max-w-0 shrink-0 items-center gap-1.5 overflow-hidden opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-[8.5rem] group-hover:opacity-100 group-focus-within:max-w-[8.5rem] group-focus-within:opacity-100">
            {canFavourite ? (
              <>
                <button
                  type="button"
                  title="Add to favourites"
                  aria-label="Add to favourites"
                  disabled={isFavouriteBusy || !onFavouriteClick}
                  onClick={() => onFavouriteClick?.(entry)}
                  className={ACTION_BUTTON_CLASS}
                >
                  <Icon name="star" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Create entry from template (coming soon)"
                  aria-label="Create entry from template (coming soon)"
                  disabled
                  className={ACTION_BUTTON_CLASS}
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}

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
                className={ACTION_BUTTON_CLASS}
              >
                <Icon name="share" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}
