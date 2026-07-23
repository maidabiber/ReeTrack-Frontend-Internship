import { useEffect, useMemo, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { getLatestProjectCost, recalculateProjectCost } from '../../api/projectCosts'
import { formatMoney } from '../../lib/projectFormat'
import type { ProjectCost } from '../../types/projectCost'
import type { Task } from '../../types/task'
import {
  ProjectRateHoursBarChart,
  TaskRateStackedBarChart,
  type RateHoursSeriesItem,
} from '../charts/RateHoursBarChart'

const UNASSIGNED_EPSILON = 0.005

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(hours)} h`
}

function formatCalculatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProjectCostCard({
  projectId,
  currencyCode,
  tasks,
  onError,
}: {
  projectId: string
  currencyCode: string
  tasks: Task[]
  onError: (message: string) => void
}) {
  const [cost, setCost] = useState<ProjectCost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [loadedProjectId, setLoadedProjectId] = useState(projectId)

  if (loadedProjectId !== projectId) {
    setLoadedProjectId(projectId)
    setCost(null)
    setIsLoading(true)
  }

  useEffect(() => {
    let cancelled = false

    getLatestProjectCost(projectId)
      .then((latest) => {
        if (!cancelled) setCost(latest)
      })
      .catch((error) => {
        if (!cancelled) onError(apiErrorMessage(error, 'Could not load project cost.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // intentionally omit onError — parent recreates it each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const taskNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const task of tasks) map.set(task.id, task.name)
    return map
  }, [tasks])

  const unassigned = useMemo(() => {
    if (!cost) return null

    const sums = cost.taskCosts.reduce(
      (acc, task) => ({
        calculatedCost: acc.calculatedCost + task.calculatedCost,
        totalHours: acc.totalHours + task.totalHours,
        weekendHours: acc.weekendHours + task.weekendHours,
        holidayHours: acc.holidayHours + task.holidayHours,
        overtimeHours: acc.overtimeHours + task.overtimeHours,
      }),
      {
        calculatedCost: 0,
        totalHours: 0,
        weekendHours: 0,
        holidayHours: 0,
        overtimeHours: 0,
      },
    )

    return {
      calculatedCost: cost.calculatedCost - sums.calculatedCost,
      totalHours: cost.totalHours - sums.totalHours,
      weekendHours: cost.weekendHours - sums.weekendHours,
      holidayHours: cost.holidayHours - sums.holidayHours,
      overtimeHours: cost.overtimeHours - sums.overtimeHours,
    }
  }, [cost])

  const hasUnassigned = unassigned !== null && unassigned.totalHours > UNASSIGNED_EPSILON
  const showBreakdown = cost !== null && (cost.taskCosts.length > 0 || hasUnassigned)

  const taskSeries = useMemo<RateHoursSeriesItem[]>(() => {
    if (!cost) return []

    const rows: RateHoursSeriesItem[] = cost.taskCosts.map((taskCost) => ({
      name: taskNameById.get(taskCost.projectTaskId) ?? 'Unknown task',
      totalHours: taskCost.totalHours,
      weekendHours: taskCost.weekendHours,
      holidayHours: taskCost.holidayHours,
      overtimeHours: taskCost.overtimeHours,
    }))

    if (hasUnassigned && unassigned) {
      rows.push({
        name: 'Unassigned',
        totalHours: unassigned.totalHours,
        weekendHours: unassigned.weekendHours,
        holidayHours: unassigned.holidayHours,
        overtimeHours: unassigned.overtimeHours,
      })
    }

    return rows
  }, [cost, taskNameById, hasUnassigned, unassigned])

  const costRows = useMemo(() => {
    if (!cost) return []

    const rows = cost.taskCosts.map((taskCost) => ({
      key: taskCost.projectTaskId,
      name: taskNameById.get(taskCost.projectTaskId) ?? 'Unknown task',
      calculatedCost: taskCost.calculatedCost,
    }))

    if (hasUnassigned && unassigned) {
      rows.push({
        key: 'unassigned',
        name: 'Unassigned',
        calculatedCost: unassigned.calculatedCost,
      })
    }

    return rows
  }, [cost, taskNameById, hasUnassigned, unassigned])

  const handleRecalculate = () => {
    setIsRecalculating(true)
    recalculateProjectCost(projectId)
      .then((next) => setCost(next))
      .catch((error) => onError(apiErrorMessage(error, 'Could not recalculate project cost.')))
      .finally(() => setIsRecalculating(false))
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-body-lg font-bold text-navy">Project cost</h2>
          <p className="mt-0.5 text-sm text-navy/55">
            {cost
              ? `Latest calculation · ${formatCalculatedAt(cost.calculatedAtUtc)}`
              : 'No calculation yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={isRecalculating || isLoading}
          className="rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRecalculating ? 'Calculating…' : 'Recalculate'}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      ) : !cost ? (
        <div className="mt-6 rounded-xl bg-surface-muted px-4 py-8 text-center">
          <p className="font-display text-body font-semibold text-navy">No cost snapshot yet</p>
          <p className="mt-1 text-sm text-navy/55">
            Run a calculation to see cost and hour statistics for this project.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1 font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
                  Calculated cost
                </p>
                <p className="font-display text-[28px] font-bold tracking-tight text-navy">
                  {formatMoney(cost.calculatedCost, currencyCode)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatChip label="Total" value={formatHours(cost.totalHours)} />
                <StatChip label="Weekend" value={formatHours(cost.weekendHours)} />
                <StatChip label="Holiday" value={formatHours(cost.holidayHours)} />
                <StatChip label="Overtime" value={formatHours(cost.overtimeHours)} />
              </div>
            </div>

            <ProjectRateHoursBarChart
              hours={{
                totalHours: cost.totalHours,
                weekendHours: cost.weekendHours,
                holidayHours: cost.holidayHours,
                overtimeHours: cost.overtimeHours,
              }}
              className="h-[220px] w-full"
            />
          </div>

          {showBreakdown && (
            <div className="mt-6 border-t border-navy/8 pt-5">
              <h3 className="font-display text-body font-bold text-navy">Hours by task</h3>
              <TaskRateStackedBarChart series={taskSeries} className="mt-4 h-[280px] w-full" />
              <div className="mt-3 flex flex-col gap-1.5">
                {costRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-0.5"
                  >
                    <p className="truncate font-display text-sm font-semibold text-navy">{row.name}</p>
                    <p className="font-mono text-sm tabular-nums text-navy">
                      {formatMoney(row.calculatedCost, currencyCode)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2.5">
      <p className="font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-md tabular-nums text-navy">{value}</p>
    </div>
  )
}
