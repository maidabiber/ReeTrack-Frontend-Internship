import { useEffect, useMemo, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { fetchAllPages } from '../api/pagination'
import {
  approveTimesheet,
  getTimesheetForReview,
  listTimesheetsForReview,
  rejectTimesheet,
} from '../api/timesheets'
import { addDays } from '../components/calendar/dateUtils'
import {
  DirectorySearch,
  LoadErrorState,
  NoticeBanner,
  SegmentedTabs,
} from '../components/directory/DirectoryControls'
import { HeaderCell, SkeletonRow, StatusMark } from '../components/directory/DirectoryTable'
import { riseDelay } from '../components/directory/directoryChrome'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { WeekEntriesList } from '../components/timesheet/WeekEntriesList'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Pill } from '../components/ui/Pill'
import { UserAvatar } from '../components/ui/UserAvatar'
import { useAuth } from '../hooks/useAuth'
import { invalidateWeekLock } from '../hooks/useWeekLock'
import { formatDurationHms } from '../lib/formatDuration'
import { parseDateInput } from '../lib/manualEntry'
import type {
  AdminTimesheetDetail,
  AdminTimesheetListItem,
  TimesheetStatus,
} from '../types/timesheet'

type StatusFilter = TimesheetStatus | 'all'

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'Submitted', label: 'Awaiting' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

/* Status as coloured text (design.md — no badge chrome): awaiting carries the
 * brand hue, approved the lifecycle green, rejected a quiet red. */
const STATUS_COLOR: Record<TimesheetStatus, string> = {
  Submitted: 'text-brand',
  Approved: 'text-[#1E8A57]',
  Rejected: 'text-red/80',
}

/* Dotted variant for the detail modal, where it sits beside the entries' own
 * billable/pending pills. */
const STATUS_DOT: Record<TimesheetStatus, string> = {
  Submitted: 'bg-brand',
  Approved: 'bg-[#1E8A57]',
  Rejected: 'bg-red/80',
}

/* Member · week · submitted · total · entries · status. Numeric columns are
 * right-aligned so the queue reads like a ledger. */
const GRID = 'grid grid-cols-[1.8fr_1.3fr_1.4fr_0.8fr_0.7fr_1fr] items-center gap-2.5 px-3.5 py-2'

const weekRangeFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function formatWeekRange(weekStartIso: string): string {
  const start = parseDateInput(weekStartIso)
  if (!start) return weekStartIso
  return `${weekRangeFmt.format(start)} – ${weekRangeFmt.format(addDays(start, 6))}`
}

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TimesheetReviewPage() {
  return <ReviewQueue />
}


function ReviewQueue() {
  const [status, setStatus] = useState<StatusFilter>('Submitted')
  const [rows, setRows] = useState<AdminTimesheetListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminTimesheetListItem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchAllPages((page, pageSize) => listTimesheetsForReview({ status, page, pageSize }))
      .then((loaded) => {
        if (cancelled) return
        setRows(loaded)
        setLoadError(null)
      })
      .catch((cause) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(cause, 'Could not load timesheets. Is the backend running?'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, reloadKey])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(
      (row) =>
        (row.userDisplayName ?? '').toLowerCase().includes(query) ||
        row.userEmail.toLowerCase().includes(query),
    )
  }, [rows, search])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  const changeStatus = (next: StatusFilter) => {
    if (next === status) return
    setStatus(next)
    setIsLoading(true)
  }

  const handleReviewed = (message: string) => {
    setSelected(null)
    showNotice(message)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className={`min-h-full flex-1 ${PAGE_PAD}`}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-xl font-bold text-navy">Timesheets</h1>
            {!isLoading && !loadError && (
              <span className="font-mono text-sm text-navy/40 tabular-nums">
                {String(filtered.length).padStart(2, '0')}
              </span>
            )}
          </div>
        </header>

        {notice && <NoticeBanner>{notice}</NoticeBanner>}

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTabs options={STATUS_TABS} value={status} onChange={changeStatus} />
          <div className="w-full sm:ml-auto sm:w-auto">
            <DirectorySearch placeholder="Search member..." value={search} onChange={setSearch} />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-card">
          <div className={`hidden md:grid ${GRID} border-b border-navy/[0.08]`}>
            <HeaderCell icon="members" label="Member" />
            <HeaderCell icon="calendar" label="Week" />
            <HeaderCell icon="timer" label="Submitted" />
            <HeaderCell icon="reports" label="Total" alignEnd />
            <HeaderCell icon="approvals" label="Entries" alignEnd />
            <HeaderCell icon="check-badge" label="Status" />
          </div>

          <div className="divide-y divide-navy/[0.08]">
            {isLoading && <SkeletonRows />}

            {!isLoading && loadError && (
              <LoadErrorState
                message={loadError}
                onRetry={() => {
                  setIsLoading(true)
                  setLoadError(null)
                  setReloadKey((key) => key + 1)
                }}
              />
            )}

            {!isLoading &&
              !loadError &&
              filtered.map((item, index) => (
                <ReviewRow key={item.id} item={item} index={index} onOpen={() => setSelected(item)} />
              ))}

            {!isLoading && !loadError && filtered.length === 0 && (
              <div className="px-5 py-16 text-center text-body text-navy/50">
                {status === 'Submitted'
                  ? 'No timesheets are waiting for review.'
                  : 'No timesheets match this filter.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <ReviewDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  )
}

function ReviewRow({
  item,
  index,
  onOpen,
}: {
  item: AdminTimesheetListItem
  index: number
  onOpen: () => void
}) {
  const name = item.userDisplayName ?? item.userEmail

  return (
    <>
      {/* Below `md` the 6-column grid has no room to be readable, let alone tappable —
          a stacked card carries the same fields without forcing horizontal scroll. */}
      <button
        type="button"
        onClick={onOpen}
        style={riseDelay(index)}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise md:hidden"
      >
        <UserAvatar name={name} size={26} className="mt-0.5 flex-shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-md font-semibold text-navy">{name}</span>
          {item.userDisplayName && (
            <span className="block truncate font-mono text-xs text-navy/45">{item.userEmail}</span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
            <span className="text-navy/70">{formatWeekRange(item.weekStartDate)}</span>
            <StatusMark label={item.status} colorClassName={STATUS_COLOR[item.status]} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-navy/60">
            <span>{formatSubmittedAt(item.submittedAtUtc)}</span>
            <span className="font-mono tabular-nums">{formatDurationHms(item.totalSeconds)}</span>
            <span className="font-mono tabular-nums">
              {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>
        <Icon name="chevron-right" className="mt-1 h-4 w-4 flex-shrink-0 text-navy/30" />
      </button>

      <button
        type="button"
        onClick={onOpen}
        style={riseDelay(index)}
        className={`hidden ${GRID} w-full text-left transition-colors hover:bg-surface-muted/60 motion-safe:animate-rise md:grid`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={name} size={26} className="flex-shrink-0 rounded-full" />
          <span className="min-w-0">
            <span className="block truncate font-display text-md font-semibold text-navy">{name}</span>
            {item.userDisplayName && (
              <span className="block truncate font-mono text-xs text-navy/45">{item.userEmail}</span>
            )}
          </span>
        </span>

        <span className="truncate text-caption text-navy/70">{formatWeekRange(item.weekStartDate)}</span>
        <span className="truncate text-caption text-navy/60">{formatSubmittedAt(item.submittedAtUtc)}</span>
        <span className="justify-self-end font-mono text-caption tabular-nums text-navy/70">
          {formatDurationHms(item.totalSeconds)}
        </span>
        <span className="justify-self-end font-mono text-caption tabular-nums text-navy/60">
          {item.entryCount}
        </span>
        <StatusMark label={item.status} colorClassName={STATUS_COLOR[item.status]} />
      </button>
    </>
  )
}

/** Ghost rows while the queue loads, matching the real grid's geometry. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex items-start gap-3 px-3.5 py-3 motion-safe:animate-pulse md:hidden" style={{ animationDelay: `${index * 100}ms` }}>
          <span className="mt-0.5 h-[26px] w-[26px] flex-shrink-0 rounded-full bg-surface-muted" />
          <div className="flex-1">
            <span className="block h-3 w-24 rounded-full bg-navy/10" />
            <span className="mt-2 block h-3 w-32 rounded-full bg-navy/[0.07]" />
          </div>
        </div>
      ))}
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonRow key={index} gridClassName={`hidden md:grid ${GRID}`} index={index}>
          <div className="flex items-center gap-2.5">
            <span className="h-[26px] w-[26px] flex-shrink-0 rounded-full bg-surface-muted" />
            <span className="h-3 w-24 rounded-full bg-navy/10" />
          </div>
          <span className="h-3 w-24 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-28 rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-12 justify-self-end rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-8 justify-self-end rounded-full bg-navy/[0.07]" />
          <span className="h-3 w-16 rounded-full bg-navy/[0.07]" />
        </SkeletonRow>
      ))}
    </>
  )
}

/**
 * Row detail: the reviewed user's logged time for the week, plus approve/reject
 * with an optional note. The header is drawn from the list item immediately;
 * the entries load lazily. Approve is offered only while the sheet is Submitted;
 * Send back is also offered on an Approved sheet so an admin can reopen it for
 * fixes (the backend 409s once a sheet is already Rejected).
 */
function ReviewDetailModal({
  item,
  onClose,
  onReviewed,
}: {
  item: AdminTimesheetListItem
  onClose: () => void
  onReviewed: (message: string) => void
}) {
  const { user } = useAuth()
  const [detail, setDetail] = useState<AdminTimesheetDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    let cancelled = false
    getTimesheetForReview(item.id)
      .then((loaded) => {
        if (cancelled) return
        setDetail(loaded)
        setComment(loaded.timesheet.reviewComment ?? '')
        setLoadError(null)
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(apiErrorMessage(cause, 'Could not load this timesheet.'))
      })
    return () => {
      cancelled = true
    }
  }, [item.id])

  const name = item.userDisplayName ?? item.userEmail
  const timesheet = detail?.timesheet ?? null
  const status = timesheet?.status ?? item.status
  const canApprove = status === 'Submitted'
  const canSendBack = status === 'Submitted' || status === 'Approved'
  const billablePct = useMemo(() => {
    if (!detail || detail.totalSeconds === 0) return 0
    return Math.round((detail.billableSeconds / detail.totalSeconds) * 100)
  }, [detail])

  const runReview = (kind: 'approve' | 'reject') => {
    if (pending) return
    setPending(kind)
    setActionError(null)
    const trimmed = comment.trim() || undefined
    const request =
      kind === 'approve' ? approveTimesheet(item.id, trimmed) : rejectTimesheet(item.id, trimmed)
    request
      .then(() => {
        if (item.userId === user?.id) invalidateWeekLock(item.weekStartDate)
        onReviewed(
          kind === 'approve' ? `${name}'s timesheet approved.` : `${name}'s timesheet sent back.`,
        )
      })
      .catch((cause) => {
        setActionError(apiErrorMessage(cause, `Could not ${kind} this timesheet.`))
        setPending(null)
      })
  }

  const busy = pending !== null

  return (
    <Modal
      title={name}
      subtitle={`${formatWeekRange(item.weekStartDate)} · submitted ${formatSubmittedAt(item.submittedAtUtc)}`}
      onClose={() => (busy ? undefined : onClose())}
      widthClassName="w-[620px]"
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <SummaryStat label="Total logged" value={formatDurationHms(item.totalSeconds)} />
        <SummaryStat label="Billable" value={`${billablePct}%`} />
        <span className="ml-auto">
          <Pill label={status} dotClassName={STATUS_DOT[status]} />
        </span>
      </div>

      {timesheet && status !== 'Submitted' && (
        <div className="mb-4 rounded-lg bg-surface-muted px-4 py-3 text-sm leading-[1.5] text-navy/70">
          {status} by {timesheet.reviewedByDisplayName ?? 'an admin'}
          {timesheet.reviewedAtUtc ? ` on ${new Date(timesheet.reviewedAtUtc).toLocaleDateString()}` : ''}
          {timesheet.reviewComment && (
            <>
              {' — '}
              <span className="text-navy">“{timesheet.reviewComment}”</span>
            </>
          )}
        </div>
      )}

      {loadError ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {loadError}
        </div>
      ) : detail ? (
        <div className="mb-4 max-h-[42vh] overflow-y-auto">
          <WeekEntriesList entries={detail.entries} emptyMessage="No entries in this week." />
        </div>
      ) : (
        <div className="mb-4 py-10 text-center text-body text-navy/50">Loading entries…</div>
      )}

      {canSendBack && (
        <div>
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Note <span className="font-normal text-navy/45">(optional — shown to the member)</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Add context for an approval, or explain what to fix before resubmitting."
            className="w-full resize-y rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
          />

          {actionError && (
            <div className="mt-3 rounded-lg bg-red-tint px-3 py-2 text-sm text-red" role="alert">
              {actionError}
            </div>
          )}

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => runReview('reject')}
              disabled={busy}
              className="flex-1 rounded-full border-control border-red/60 bg-transparent py-2.5 font-display text-body font-semibold text-red transition-colors hover:bg-red-tint disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === 'reject' ? 'Sending back…' : 'Send back'}
            </button>
            {canApprove && (
              <button
                type="button"
                onClick={() => runReview('approve')}
                disabled={busy}
                className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending === 'approve' ? 'Approving…' : 'Approve'}
              </button>
            )}
          </div>
        </div>
      )}

      {!canSendBack && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy hover:bg-surface-muted"
        >
          Close
        </button>
      )}
    </Modal>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="block font-mono text-xs uppercase tracking-[0.12em] text-navy/45">{label}</span>
      <span className="mt-0.5 block font-mono text-lg font-medium text-navy">{value}</span>
    </span>
  )
}
