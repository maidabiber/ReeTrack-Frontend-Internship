import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/client'
import {
  getMyWeekTimesheet,
  listRecentWeeks,
  submitTimesheet,
  withdrawTimesheet,
} from '../../api/timesheets'
import {
  addWeeks,
  formatHeaderLabel,
  formatMonthDay,
  getWeekDays,
  isSameDay,
  isToday,
  startOfWeek,
} from '../calendar/dateUtils'
import { BillableSplitCard } from '../charts/BillableSplitCard'
import { formatHoursLabel } from '../charts/chartFormat'
import { ProjectBreakdown } from '../charts/ProjectBreakdown'
import { RecentWeeksTrend } from '../charts/RecentWeeksTrend'
import { WeekHoursBarChart } from '../charts/WeekHoursBarChart'
import { BREAKPOINT, useMediaQuery } from '../../hooks/useMediaQuery'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Pill } from '../ui/Pill'
import { StatTile } from '../ui/StatTile'
import { WeekEntriesList } from './WeekEntriesList'
import { formatDurationHms } from '../../lib/formatDuration'
import { formatLoggedVsTarget, resolveWeekTargetSeconds } from '../../lib/hourTargetProgress'
import { parseDateInput, toDateInputValue } from '../../lib/manualEntry'
import { billableSplit, hoursPerDay, projectTotals } from '../../lib/timesheetStats'
import { useMyHourTarget } from '../../hooks/useMyHourTarget'
import { syncWeekLock } from '../../hooks/useWeekLock'
import type { MyWeekTimesheet, WeekStatus, WeekSummary } from '../../types/timesheet'


const STATUS_DOT: Record<WeekStatus, string> = {
  None: 'bg-navy/35',
  Submitted: 'bg-yellow',
  Approved: 'bg-green',
  Rejected: 'bg-red',
}

const STATUS_LABEL: Record<WeekStatus, string> = {
  None: 'Not submitted',
  Submitted: 'Submitted',
  Approved: 'Approved',
  Rejected: 'Rejected',
}

/**
 * The backend keys timesheet weeks by UTC Monday (TimesheetWeek.ToWeekStart),
 * so "this week" must come from the UTC calendar date, not local time —
 * otherwise early Monday local time (still Sunday UTC) resolves to a week the
 * backend considers future and refuses to submit.
 */
function currentWeekStart(): Date {
  const now = new Date()
  return startOfWeek(new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * RT-71 — weekly timesheet view on the Timer page: review the visible week's
 * logged time, submit it for approval, and track recent weeks' statuses.
 * Deep-linkable via /timesheet?week=yyyy-MM-dd (the target of timesheet
 * decision emails).
 */
export function TimesheetView() {
  const isMd = useMediaQuery(BREAKPOINT.md)
  const [searchParams, setSearchParams] = useSearchParams()
  const weekStart = useMemo(() => {
    const requested = parseDateInput(searchParams.get('week') ?? '')
    return requested ? startOfWeek(requested) : currentWeekStart()
  }, [searchParams])
  const weekStartIso = toDateInputValue(weekStart)
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart())

  const [week, setWeek] = useState<MyWeekTimesheet | null>(null)
  const [recentWeeks, setRecentWeeks] = useState<WeekSummary[]>([])
  const [fetchedWeek, setFetchedWeek] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'submit' | 'withdraw' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  // Bumped after submit/withdraw so both fetch effects re-run with their usual
  // cancellation and error handling (a post-action refresh is just a reload).
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  const goToWeek = useCallback(
    (date: Date) => {
      setSearchParams({ week: toDateInputValue(startOfWeek(date)) })
      setNotice(null)
    },
    [setSearchParams],
  )

  const isLoading = fetchedWeek !== weekStartIso

  useEffect(() => {
    let cancelled = false

    getMyWeekTimesheet(weekStartIso)
      .then((weekData) => {
        if (cancelled) return
        setWeek(weekData)
        setError(null)
        setFetchedWeek(weekStartIso)
        // Keep timer/calendar lock in sync (e.g. unlock after an admin send-back).
        syncWeekLock(weekStartIso, weekData.timesheet?.status ?? null)
      })
      .catch((cause) => {
        if (cancelled) return
        setWeek(null)
        setError(apiErrorMessage(cause, 'Could not load this week.'))
        setFetchedWeek(weekStartIso)
      })

    return () => {
      cancelled = true
    }
  }, [weekStartIso, refreshKey])

  // Recent-weeks summaries don't depend on the visible week, so they load once
  // and refresh only after submit/withdraw instead of on every navigation.
  useEffect(() => {
    let cancelled = false

    listRecentWeeks()
      .then((recent) => {
        if (cancelled) return
        setRecentWeeks(recent)
        setRecentError(null)
      })
      .catch((cause) => {
        if (cancelled) return
        setRecentError(apiErrorMessage(cause, 'Could not load recent weeks.'))
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const { target: hourTarget } = useMyHourTarget()
  const timesheet = week?.timesheet ?? null
  const status: WeekStatus = timesheet?.status ?? 'None'
  const entries = useMemo(() => week?.entries ?? [], [week])
  const split = useMemo(() => billableSplit(entries), [entries])
  const perDay = useMemo(() => hoursPerDay(entries, weekDays), [entries, weekDays])
  const todayInWeek = useMemo(() => weekDays.findIndex(isToday), [weekDays])
  const todayIndex = todayInWeek >= 0 ? todayInWeek : undefined
  const perProject = useMemo(() => projectTotals(entries), [entries])
  const weekTargetSeconds = useMemo(
    () => (hourTarget ? resolveWeekTargetSeconds(hourTarget, weekStart) : null),
    [hourTarget, weekStart],
  )
  const trendData = useMemo(
    () =>
      [...recentWeeks].reverse().map((summary) => ({
        week: formatMonthDay(parseDateInput(summary.weekStartDate) ?? new Date(summary.weekStartDate)),
        seconds: summary.totalSeconds,
        status: summary.status,
      })),
    [recentWeeks],
  )

  const confirmSubmit = () => {
    setIsActing(true)
    setActionError(null)
    submitTimesheet(weekStartIso)
      .then(() => {
        setConfirmAction(null)
        setNotice('Timesheet submitted for approval.')
        // Lock timer/calendar for this week immediately (no focus wait).
        syncWeekLock(weekStartIso, 'Submitted')
        refresh()
      })
      .catch((cause) => setActionError(apiErrorMessage(cause, 'Could not submit this week.')))
      .finally(() => setIsActing(false))
  }

  const confirmWithdraw = () => {
    if (!timesheet) return
    setIsActing(true)
    setActionError(null)
    withdrawTimesheet(timesheet.id)
      .then(() => {
        setConfirmAction(null)
        setNotice('Submission withdrawn — this week is editable again.')
        // Unlock timer/calendar for this week immediately (no focus wait).
        syncWeekLock(weekStartIso, null)
        refresh()
      })
      .catch((cause) => setActionError(apiErrorMessage(cause, 'Could not withdraw this submission.')))
      .finally(() => setIsActing(false))
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-body-lg font-bold text-navy">
          {formatHeaderLabel(weekStart, 'week')}
        </h2>
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => goToWeek(currentWeekStart())}
              className="rounded-full border border-navy/12 px-3.5 py-1.5 font-display text-sm font-semibold text-navy hover:bg-surface-muted"
            >
              This week
            </button>
          )}
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => goToWeek(addWeeks(weekStart, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy/55 hover:bg-surface-muted hover:text-navy"
          >
            <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => goToWeek(addWeeks(weekStart, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy/55 hover:bg-surface-muted hover:text-navy"
          >
            <Icon name="chevron-right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg bg-green-tint px-4 py-3 text-body text-navy" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {error}
        </div>
      )}
      {recentError && (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {recentError}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl bg-white px-5 py-16 text-center text-body text-navy/50 shadow-card">
          Loading timesheet…
        </div>
      ) : week ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-card">
            <div className="min-w-0">
              <Pill label={STATUS_LABEL[status]} dotClassName={STATUS_DOT[status]} />
              {timesheet?.reviewedAtUtc && (
                <p className="mt-1 text-sm text-navy/50">
                  Reviewed by {timesheet.reviewedByDisplayName ?? 'an admin'} on{' '}
                  {new Date(timesheet.reviewedAtUtc).toLocaleDateString()}
                </p>
              )}
            </div>
            {status === 'None' || status === 'Rejected' ? (
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null)
                    setConfirmAction('submit')
                  }}
                  disabled={!week.canSubmit}
                  className="rounded-full bg-brand px-5 py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'Rejected' ? 'Resubmit week' : 'Submit week'}
                </button>
                {week.blockers.map((blocker) => (
                  <p key={blocker} className="text-sm text-navy/55">
                    {blocker}
                  </p>
                ))}
              </div>
            ) : status === 'Submitted' ? (
              <button
                type="button"
                onClick={() => {
                  setActionError(null)
                  setConfirmAction('withdraw')
                }}
                className="rounded-full border-control border-navy bg-transparent px-5 py-2.5 font-display text-body font-semibold text-navy hover:bg-surface-muted"
              >
                Withdraw submission
              </button>
            ) : null}
          </div>

          {status === 'Rejected' && timesheet?.reviewComment && (
            <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-navy" role="alert">
              <span className="font-semibold text-red">Rejected:</span> {timesheet.reviewComment}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Total logged"
              value={formatLoggedVsTarget(split.totalSeconds, weekTargetSeconds, formatDurationHms)}
            />
            <StatTile label="Billable" value={`${split.billablePct}%`} />
            <StatTile
              label="Projects"
              value={String(perProject.filter((p) => p.seconds > 0).length)}
            />
          </div>

          {/* Collapsed below `md` so the entries list — what most visits are for — isn't
              behind four chart cards' worth of scrolling. Open by default at md+, where
              the hero chart's draw-in animation is visible without scrolling either way. */}
          <details className="mb-4 group" open={isMd}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl bg-white px-5 py-4 font-display text-body font-bold text-navy shadow-card [&::-webkit-details-marker]:hidden">
              Insights
              <Icon
                name="chevron-right"
                className="h-4 w-4 text-navy/40 transition-transform group-open:rotate-90"
              />
            </summary>

            <div className="mt-4">
              <ChartCard title="Recent weeks">
                <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                  <RecentWeeksTrend data={trendData} />
                  <ul className="space-y-1 self-center">
                    {recentWeeks.map((summary) => {
                      const summaryStart = parseDateInput(summary.weekStartDate)
                      return (
                        <li key={summary.weekStartDate}>
                          <button
                            type="button"
                            onClick={() => summaryStart && goToWeek(summaryStart)}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted ${
                              summary.weekStartDate === weekStartIso ? 'bg-surface-muted' : ''
                            }`}
                          >
                            <span className="text-sm text-navy">
                              {summaryStart ? formatHeaderLabel(summaryStart, 'week') : summary.weekStartDate}
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="font-mono text-sm tabular-nums text-navy/60">
                                {formatHoursLabel(summary.totalSeconds)}
                              </span>
                              <Pill label={STATUS_LABEL[summary.status]} dotClassName={STATUS_DOT[summary.status]} />
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </ChartCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChartCard title="Hours per day">
                <WeekHoursBarChart data={perDay} todayIndex={todayIndex} />
              </ChartCard>
              <ChartCard title="Billable split">
                <div className="flex h-44 items-center justify-center">
                  <BillableSplitCard split={split} />
                </div>
              </ChartCard>
            </div>

            <div className="mt-4">
              <ChartCard title="Projects">
                {perProject.length === 0 ? (
                  <p className="py-6 text-center text-body text-navy/50">No time logged this week.</p>
                ) : (
                  <ProjectBreakdown data={perProject} />
                )}
              </ChartCard>
            </div>
          </details>

          <WeekEntriesList entries={entries} />
        </>
      ) : null}

      {confirmAction === 'submit' && (
        <Modal
          title="Submit timesheet?"
          subtitle={`${formatHeaderLabel(weekStart, 'week')} — ${formatHoursLabel(split.totalSeconds)} logged. Entries in this week are locked until an admin reviews it.`}
          onClose={() => (isActing ? undefined : setConfirmAction(null))}
        >
          <ConfirmButtons
            confirmLabel="Submit"
            isActing={isActing}
            error={actionError}
            onCancel={() => setConfirmAction(null)}
            onConfirm={confirmSubmit}
          />
        </Modal>
      )}

      {confirmAction === 'withdraw' && (
        <Modal
          title="Withdraw submission?"
          subtitle={`${formatHeaderLabel(weekStart, 'week')} will go back to draft and its entries become editable again.`}
          onClose={() => (isActing ? undefined : setConfirmAction(null))}
        >
          <ConfirmButtons
            confirmLabel="Withdraw"
            isActing={isActing}
            error={actionError}
            onCancel={() => setConfirmAction(null)}
            onConfirm={confirmWithdraw}
          />
        </Modal>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <h3 className="font-display text-body font-bold text-navy">{title}</h3>
      <span aria-hidden className="mt-1.5 mb-3 block h-px w-9 bg-brand-gradient" />
      {children}
    </div>
  )
}

function ConfirmButtons({
  confirmLabel,
  isActing,
  error,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string
  isActing: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="mt-4">
      {error && (
        <div className="mb-3 rounded-lg bg-red-tint px-3 py-2 text-sm text-red" role="alert">
          {error}
        </div>
      )}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isActing}
          className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isActing}
          className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isActing ? 'Working…' : confirmLabel}
        </button>
      </div>
    </div>
  )
}
