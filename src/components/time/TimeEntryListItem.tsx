import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { EntryParticipantAvatars } from './EntryParticipantAvatars'
import { getEntryMembers } from '../../lib/entryParticipants'
import { Icon } from '../ui/Icon'
import { Pill } from '../ui/Pill'
import { formatDurationHms } from '../../lib/formatDuration'
import {
  isPendingSharedWithCurrentUser,
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

const TIME_STACK_CLASS = 'font-mono text-sm tabular-nums leading-tight text-navy/70'

const SWIPE_OPEN_EVENT = 'time-entry-swipe-open'
const SWIPE_MEDIA_QUERY = '(max-width: 639px)'
const DRAG_CLICK_THRESHOLD_PX = 8
const AXIS_LOCK_THRESHOLD_PX = 6
const OPEN_SNAP_RATIO = 0.4

type TimeEntryListItemProps = {
  displayEntry: DisplayTimeEntry
  currentUserId?: string
  onEntryClick: (entry: TimeEntry) => void
  onShareClick: (entry: TimeEntry) => void
  onDeleteClick?: (entry: TimeEntry) => void
  onFavouriteClick?: (entry: TimeEntry) => void
  favouriteBusyId?: string | null
}

function formatEntryClock(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EntryTimeBlock({ entry }: { entry: TimeEntry }) {
  const showRange = Boolean(entry.startedAtUtc) && entry.mode !== 'DurationOnly'

  return (
    <div className="flex shrink-0 items-center gap-2">
      {showRange ? (
        <>
          <div className={`flex flex-col items-end gap-0.5 ${TIME_STACK_CLASS}`}>
            <span>{formatEntryClock(entry.startedAtUtc!)}</span>
            {entry.endedAtUtc && !entry.isRunning ? (
              <span>{formatEntryClock(entry.endedAtUtc)}</span>
            ) : entry.isRunning ? (
              <span className="flex h-[1em] items-center justify-end" title="Running">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              </span>
            ) : null}
          </div>
          <div aria-hidden="true" className="w-px self-stretch bg-navy/10" />
        </>
      ) : null}
      <div className="self-center font-mono text-md tabular-nums text-navy">
        {formatDurationHms(entry.durationSeconds)}
      </div>
    </div>
  )
}

function isSwipeViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(SWIPE_MEDIA_QUERY).matches
}

export function TimeEntryListItem({
  displayEntry,
  currentUserId,
  onEntryClick,
  onShareClick,
  onDeleteClick,
  onFavouriteClick,
  favouriteBusyId = null,
}: TimeEntryListItemProps) {
  const { entry } = displayEntry
  const swipeId = useId()
  const rootRef = useRef<HTMLLIElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originOffset: number
    axis: 'undecided' | 'horizontal' | 'vertical'
    moved: boolean
  } | null>(null)

  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [suppressClick, setSuppressClick] = useState(false)

  const isReviewable = currentUserId
    ? isPendingSharedWithCurrentUser(entry, currentUserId)
    : false
  const isInvitation = currentUserId ? isInvitationEntry(entry, currentUserId) : false
  const isAwaitingApproval = currentUserId
    ? isAwaitingApprovalEntry(entry, currentUserId)
    : false
  const isReadOnlyPending = entry.status === 'Pending' && !isReviewable
  const members = getEntryMembers(entry, {
    excludeUserId: currentUserId,
  })

  const isPendingCard = isInvitation || isAwaitingApproval || isReadOnlyPending
  const canAddMembers = currentUserId ? isShareableByCurrentUser(entry, currentUserId) : false
  const canFavourite =
    !entry.isRunning &&
    entry.status === 'Confirmed' &&
    !isPendingCard
  const canDelete = canFavourite
  const showActions = canFavourite || canAddMembers
  const isFavouriteBusy = favouriteBusyId === entry.id
  const avatarRing = isPendingCard ? PENDING_ENTRY_AVATAR_RING_CLASS : 'ring-white'

  const setSwipeOffset = useCallback((next: number) => {
    offsetRef.current = next
    setOffset(next)
  }, [])

  const closeSwipe = useCallback(() => {
    setIsDragging(false)
    setSwipeOffset(0)
  }, [setSwipeOffset])

  const getActionsWidth = useCallback(() => {
    return actionsRef.current?.offsetWidth ?? 0
  }, [])

  const announceOpen = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(SWIPE_OPEN_EVENT, { detail: { id: swipeId } }),
    )
  }, [swipeId])

  useEffect(() => {
    const onOtherOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail
      if (detail?.id !== swipeId) closeSwipe()
    }
    window.addEventListener(SWIPE_OPEN_EVENT, onOtherOpen)
    return () => window.removeEventListener(SWIPE_OPEN_EVENT, onOtherOpen)
  }, [closeSwipe, swipeId])

  useEffect(() => {
    if (offset >= 0) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeSwipe()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [closeSwipe, offset])

  useEffect(() => {
    const media = window.matchMedia(SWIPE_MEDIA_QUERY)
    const onChange = () => {
      if (!media.matches) closeSwipe()
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [closeSwipe])

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (!showActions || !isSwipeViewport() || event.button !== 0) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffset: offsetRef.current,
      axis: 'undecided',
      moved: false,
    }
    setSuppressClick(false)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (drag.axis === 'undecided') {
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD_PX && Math.abs(dy) < AXIS_LOCK_THRESHOLD_PX) {
        return
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.axis = 'vertical'
        return
      }
      drag.axis = 'horizontal'
      setIsDragging(true)
      if (offsetRef.current === 0) announceOpen()
    }

    if (drag.axis !== 'horizontal') return

    event.preventDefault()
    const width = getActionsWidth()
    if (width <= 0) return

    const next = Math.min(0, Math.max(-width, drag.originOffset + dx))
    if (Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX) {
      drag.moved = true
      setSuppressClick(true)
    }
    setSwipeOffset(next)
  }

  const endDrag = (event: ReactPointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const wasHorizontal = drag.axis === 'horizontal'
    dragRef.current = null
    setIsDragging(false)

    if (!wasHorizontal) return

    const width = getActionsWidth()
    if (width <= 0) {
      setSwipeOffset(0)
      return
    }

    const open = Math.abs(offsetRef.current) >= width * OPEN_SNAP_RATIO
    setSwipeOffset(open ? -width : 0)
    if (open) announceOpen()
  }

  const handleEntryClick = () => {
    if (suppressClick) {
      setSuppressClick(false)
      return
    }
    if (offsetRef.current < 0) {
      closeSwipe()
      return
    }
    onEntryClick(entry)
  }

  const actionButtons = (
    <>
      {canFavourite ? (
        <button
          type="button"
          title="Add to favourites"
          aria-label="Add to favourites"
          disabled={isFavouriteBusy || !onFavouriteClick}
          onClick={() => {
            closeSwipe()
            onFavouriteClick?.(entry)
          }}
          className={ACTION_BUTTON_CLASS}
        >
          <Icon name="star" className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {canAddMembers ? (
        <button
          type="button"
          title="Share with a teammate"
          aria-label="Share with a teammate"
          onClick={() => {
            closeSwipe()
            onShareClick(entry)
          }}
          className={ACTION_BUTTON_CLASS}
        >
          <Icon name="share" className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          title="Delete entry"
          aria-label="Delete entry"
          onClick={() => {
            closeSwipe()
            onDeleteClick?.(entry)
          }}
          className={ACTION_BUTTON_CLASS}
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </>
  )

  return (
    <li ref={rootRef} className={TIME_ENTRY_ITEM_CLASS}>
      <div
        className={`group relative w-full overflow-hidden ${
          isPendingCard ? PENDING_ENTRY_ROW_CLASS : TIME_ENTRY_ROW_CLASS
        }`}
      >
        {showActions ? (
          <div
            ref={actionsRef}
            className="absolute inset-y-0 right-0 z-0 flex items-center gap-1.5 px-3 sm:hidden"
            aria-hidden={offset >= 0}
          >
            {actionButtons}
          </div>
        ) : null}

        <div
          className={`relative z-10 flex w-full items-center gap-2 px-3 py-3 touch-pan-y sm:gap-4 sm:px-5 sm:py-4 ${
            isDragging ? '' : 'transition-transform duration-200 ease-out'
          } ${
            isPendingCard
              ? 'bg-[#d4def8] group-hover:bg-[#c5d4f4]'
              : 'bg-white group-hover:bg-surface-muted/50'
          }`}
          style={{ transform: `translateX(${offset}px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <button
            type="button"
            onClick={handleEntryClick}
            disabled={isReadOnlyPending}
            className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4 disabled:cursor-default"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-md font-medium text-navy">
                {entry.description?.trim() || 'No description'}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-navy/50">
                {isInvitation ? <Pill label="Invitation" dotClassName="bg-brand" /> : null}
                {isAwaitingApproval ? <Pill label="Pending" dotClassName="bg-brand/50" /> : null}
                {entry.projectName ? (
                  <span className="inline-flex max-w-[16rem] items-center gap-1.5 truncate font-medium text-navy/70">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: entry.projectColor ?? '#C7CDDB' }}
                    />
                    <span className="truncate">
                      {entry.projectTaskName
                        ? `${entry.projectName} · ${entry.projectTaskName}`
                        : entry.projectName}
                    </span>
                  </span>
                ) : null}
                {entry.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full py-0.5 pr-1.5 pl-2 text-xs font-semibold text-white"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${tag.color ?? '#C7CDDB'} 85%, black)`,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                {entry.isBillable ? (
                  <Icon name="billable" className="h-3.5 w-3.5 shrink-0 text-navy/60" />
                ) : null}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              {members.length > 0 ? (
                <div className="hidden sm:block">
                  <EntryParticipantAvatars
                    participants={members}
                    ringClassName={avatarRing}
                  />
                </div>
              ) : null}
              <EntryTimeBlock entry={entry} />
              {!isReadOnlyPending ? (
                <Icon name="chevron-right" className="hidden h-4 w-4 shrink-0 text-navy/30 sm:block" />
              ) : null}
            </div>
          </button>

          {showActions ? (
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex sm:max-w-0 sm:overflow-hidden sm:opacity-0 sm:transition-[max-width,opacity] sm:duration-200 sm:ease-out sm:group-hover:max-w-[8rem] sm:group-hover:opacity-100 sm:group-focus-within:max-w-[8rem] sm:group-focus-within:opacity-100">
              {actionButtons}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}
