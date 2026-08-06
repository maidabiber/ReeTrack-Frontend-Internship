import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { getAdminOverview } from '../api/overview'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/reports/ChartCard'
import { ProjectBreakdown } from '../components/charts/ProjectBreakdown'
import { formatHoursLabel } from '../components/charts/chartFormat'
import { useMemberDirectory } from '../hooks/useMemberDirectory'
import { useOverviewEvents } from '../hooks/useOverviewEvents'
import { OverviewRealtimeProvider } from '../context/OverviewRealtimeContext'
import type { AdminOverview, OverviewProjectDigest } from '../types/overview'
import { ActiveTimersPanel } from '../components/overview/ActiveTimersPanel'
import { IdleMembersPanel } from '../components/overview/IdleMembersPanel'
import { TopMembersPanel } from '../components/overview/TopMembersPanel'
import { WeekStripPanel } from '../components/overview/WeekStripPanel'
import { LiveIndicator } from '../components/overview/LiveIndicator'
import { ScopeBadge } from '../components/overview/ScopeBadge'
import {
  OVERVIEW_SCROLL_CLASS,
  OVERVIEW_VISIBLE_ROWS,
  PROJECT_ROW_HEIGHT_PX,
} from '../components/overview/overviewPanelLayout'

const SAFETY_POLL_MS = 300_000 // 5 minutes — safety net behind the realtime hub

/**
 * Live admin ops dashboard: today's KPIs, active timers, idle members,
 * weekly chart, and project/member breakdowns.
 * Uses a SignalR hub for real-time updates with a safety-net poll.
 */
export default function OverviewPage() {
  return (
    <OverviewRealtimeProvider>
      <OverviewDashboard />
    </OverviewRealtimeProvider>
  )
}

function OverviewDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const { teamSize } = useMemberDirectory()

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const overview = await getAdminOverview({ signal })
      if (signal?.aborted) return
      setData(overview)
      setError(null)
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
      setError(apiErrorMessage(err, 'Could not load overview.'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    getAdminOverview({ signal: controller.signal })
      .then(overview => {
        if (!controller.signal.aborted) {
          setData(overview)
          setError(null)
        }
      })
      .catch(err => {
        if (!controller.signal.aborted && !(err instanceof DOMException && err.name === 'AbortError')) {
          setError(apiErrorMessage(err, 'Could not load overview.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    const interval = window.setInterval(() => {
      void load()
    }, SAFETY_POLL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  useEffect(() => {
    if (!(data?.activeTimers.length ?? 0)) return
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [data?.activeTimers.length])

  const handleRefetch = useCallback(() => {
    void load()
  }, [load])

  // Register this dashboard's load function with the realtime provider
  const { registerRefetcher, connectionState } = useOverviewEvents()
  useEffect(() => {
    registerRefetcher(handleRefetch)
  }, [registerRefetcher, handleRefetch])

  const updatedLabel = data
    ? new Date(data.generatedAtUtc).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  // Week strip data
  const activity = data?.digest?.activity ?? []
  const todaySeconds = data?.today.totalSeconds ?? 0

  // Determine today's index (Mon=0, Sun=6)
  const todayDate = data?.today.date
  let todayIndex = -1
  if (todayDate) {
    const d = new Date(todayDate + 'T00:00:00Z')
    todayIndex = (d.getUTCDay() + 6) % 7 // Mon=0
  }

  const elapsedDays =
    todayIndex >= 0 ? activity.slice(0, todayIndex + 1) : activity
  const avgSeconds =
    elapsedDays.length > 0
      ? Math.round(
          elapsedDays.reduce((sum, d) => sum + d.seconds, 0) / elapsedDays.length,
        )
      : 0

  const activeTimers = data?.activeTimers ?? []
  const topProjects = data?.digest?.projects ?? []
  const topMembers = data?.digest?.members ?? []
  const idleMembers = data?.idleMembers ?? []
  const idleCount = data?.idleCount ?? 0
  const onTheClock = data?.onTheClock ?? 0

  return (
    <div className={`${PAGE_PAD} mx-auto w-full min-w-0 max-w-page overflow-x-clip space-y-5`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-navy">Overview</h1>
            {data ? <ScopeBadge scope={data.scope} projectCount={data.digest?.projects.length} /> : null}
          </div>
          <p className="mt-1 text-body text-navy/55">
            Live team pulse for today (UTC)
            {updatedLabel ? (
              <span className="text-navy/40"> · Updated {updatedLabel}</span>
            ) : null}
          </p>
        </div>
        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <LiveIndicator state={connectionState} />
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void load()
            }}
            className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-navy shadow-card hover:bg-surface-muted"
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl bg-red-tint px-5 py-4 text-body text-red">{error}</div>
      ) : null}

      {loading && !data ? (
        <p className="py-16 text-center text-navy/45">Loading overview…</p>
      ) : data ? (
        <>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatTile
              label="Hours today"
              value={formatHoursLabel(data.today.totalSeconds)}
            />
            <StatTile
              label="Billable"
              value={`${Number(data.today.billablePct).toFixed(0)}%`}
            />
            <StatTile label="On the clock" value={String(onTheClock)} />
            <StatTile
              label="Logged members"
              value={teamSize > 0 ? `${data.today.membersLogged}/${teamSize}` : String(data.today.membersLogged)}
            />
          </div>

          {activity.length > 0 ? (
            <WeekStripPanel
              activity={activity}
              todayIndex={todayIndex}
              todaySeconds={todaySeconds}
              avgSeconds={avgSeconds}
            />
          ) : null}

          <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:items-stretch">
            <ActiveTimersPanel timers={activeTimers} nowMs={nowMs} />
            <div className="min-w-0 space-y-5">
              {topProjects.length > 0 ? (
                <ChartCard title="Top projects today">
                  <div
                    className={OVERVIEW_SCROLL_CLASS}
                    style={{ maxHeight: OVERVIEW_VISIBLE_ROWS * PROJECT_ROW_HEIGHT_PX }}
                  >
                    <ProjectBreakdown
                      data={topProjects.map((p: OverviewProjectDigest) => ({
                        name: p.name,
                        seconds: p.totalSeconds,
                      }))}
                    />
                  </div>
                </ChartCard>
              ) : null}
              <TopMembersPanel members={topMembers} />
              <IdleMembersPanel members={idleMembers} idleCount={idleCount} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
