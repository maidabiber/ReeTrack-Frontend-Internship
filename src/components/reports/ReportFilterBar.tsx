import { CalendarDate } from '@internationalized/date'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { listClients } from '../../api/clients'
import { listMembers } from '../../api/members'
import { listProjects } from '../../api/projects'
import { listTags } from '../../api/tags'
import { listTasksAcrossProjects } from '../../api/tasks'
import { useAuth } from '../../hooks/useAuth'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'
import {
  cascadeAfterClientsChange,
  cascadeAfterProjectsChange,
  pinFromTask,
} from '../../lib/reportFilterCascade'
import {
  matchReportDatePreset,
  reportDatePreset,
  type ReportDatePreset,
} from '../../lib/reportQuery'
import type { ReportQuery } from '../../types/reportQuery'
import { Icon } from '../ui/Icon'
import { DatePickerField } from '../ui/date-picker'
import {
  ReportEntityMultiSelect,
  type ReportEntityOption,
} from './ReportEntityMultiSelect'

const DATE_PRESETS: ReadonlyArray<{ kind: ReportDatePreset; label: string }> = [
  { kind: 'thisWeek', label: 'This week' },
  { kind: 'lastWeek', label: 'Last week' },
  { kind: 'thisMonth', label: 'This month' },
  { kind: 'lastMonth', label: 'Last month' },
  { kind: 'thisYear', label: 'This year' },
  { kind: 'lastYear', label: 'Last year' },
  { kind: 'allTime', label: 'All time' },
]

function isoToCalendarDate(iso: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  return new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

function calendarDateToIso(value: CalendarDate): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.year}-${pad(value.month)}-${pad(value.day)}`
}

/**
 * Draft filter controls for Reports. Changes stay local until Apply; Reset
 * restores the UTC Mon–Sun default week. Client → project → task cascade.
 */
export function ReportFilterBar({
  draft,
  isDirty,
  onPatch,
  onReset,
  onApply,
  hideClients = false,
  hideTasks = false,
  hideMembers = false,
  hideTags = false,
  hideBillable = false,
  singleClient = false,
}: {
  draft: ReportQuery
  isDirty: boolean
  onPatch: (patch: Partial<ReportQuery>) => void
  onReset: () => void
    /** When set, Apply sits next to Reset inside the panel (Invoices). */
    onApply?: () => void
    /** When true, omit the Clients multi-select (e.g. Invoices picks client outside). */
    hideClients?: boolean
    hideTasks?: boolean
    hideMembers?: boolean
    hideTags?: boolean
    hideBillable?: boolean
    /** Restrict client picker to a single selection (used on Invoices page). */
    singleClient?: boolean
  }) {
  const { user } = useAuth()
  // Admins see every project; PMs only projects they created (matches BE report scope).
  const mineProjectsOnly = user?.role !== 'Admin'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [projectClientById, setProjectClientById] = useState(() => new Map<string, string>())
  const [taskProjectById, setTaskProjectById] = useState(() => new Map<string, string>())
  const [taskMetaById, setTaskMetaById] = useState(
    () => new Map<string, { projectId: string; clientId: string }>(),
  )
  const [clientOptionsById, setClientOptionsById] = useState(
    () => new Map<string, ReportEntityOption>(),
  )
  const [projectOptionsById, setProjectOptionsById] = useState(
    () => new Map<string, ReportEntityOption>(),
  )
  const [taskOptionsById, setTaskOptionsById] = useState(
    () => new Map<string, ReportEntityOption>(),
  )
  const [memberOptionsById, setMemberOptionsById] = useState(
    () => new Map<string, ReportEntityOption>(),
  )
  const [tagOptionsById, setTagOptionsById] = useState(
    () => new Map<string, ReportEntityOption>(),
  )

  const rememberClients = useCallback((options: ReportEntityOption[]) => {
    setClientOptionsById((previous) => rememberOptions(previous, options))
  }, [])

  const rememberMembers = useCallback((options: ReportEntityOption[]) => {
    setMemberOptionsById((previous) => rememberOptions(previous, options))
  }, [])

  const rememberTags = useCallback((options: ReportEntityOption[]) => {
    setTagOptionsById((previous) => rememberOptions(previous, options))
  }, [])

  const rememberProjects = useCallback((options: ReportEntityOption[]) => {
    setProjectOptionsById((previous) => rememberOptions(previous, options))
    setProjectClientById((prev) => {
      const next = new Map(prev)
      for (const option of options) {
        if (option.clientId) next.set(option.id, option.clientId)
      }
      return next
    })
  }, [])

  const rememberTasks = useCallback((options: ReportEntityOption[]) => {
    setTaskOptionsById((previous) => rememberOptions(previous, options))
    setTaskProjectById((prev) => {
      const next = new Map(prev)
      for (const option of options) {
        if (option.projectId) next.set(option.id, option.projectId)
      }
      return next
    })
    setTaskMetaById((prev) => {
      const next = new Map(prev)
      for (const option of options) {
        if (option.projectId && option.clientId) {
          next.set(option.id, { projectId: option.projectId, clientId: option.clientId })
        }
      }
      return next
    })
    const clients: ReportEntityOption[] = []
    const projects: ReportEntityOption[] = []
    for (const option of options) {
      if (option.clientId && option.clientName) {
        clients.push({ id: option.clientId, name: option.clientName })
      }
      if (option.projectId && option.projectName) {
        projects.push({
          id: option.projectId,
          name: option.projectName,
          color: option.color,
          clientId: option.clientId,
          hint: option.clientName ?? undefined,
        })
      }
    }
    setClientOptionsById((previous) => rememberOptions(previous, clients))
    setProjectOptionsById((previous) => rememberOptions(previous, projects))
  }, [])

  const fetchMembers = useCallback(
    (page: number, pageSize: number, q: string) =>
      listMembers({ page, pageSize, q: q || undefined }).then((result) => {
        const items = result.items.map(
          (member): ReportEntityOption => ({
            id: member.id,
            name: member.displayName?.trim() || member.email,
          }),
        )
        rememberMembers(items)
        return { ...result, items }
      }),
    [rememberMembers],
  )

  const fetchClients = useCallback(
    (page: number, pageSize: number, q: string) =>
      listClients('all', { page, pageSize, q: q || undefined }).then((result) => {
        const items = result.items.map(
          (client): ReportEntityOption => ({
            id: client.id,
            name: client.name,
            hint: client.isActive ? undefined : 'archived',
          }),
        )
        rememberClients(items)
        return { ...result, items }
      }),
    [rememberClients],
  )

  const fetchProjects = useCallback(
    (page: number, pageSize: number, q: string) =>
      listProjects('all', {
        page,
        pageSize,
        q: q || undefined,
        clientIds: draft.clientIds.length > 0 ? draft.clientIds : undefined,
        mine: mineProjectsOnly || undefined,
      }).then((result) => {
        const items = result.items.map(
          (project): ReportEntityOption => ({
            id: project.id,
            name: project.name,
            color: project.color,
            clientId: project.clientId,
            hint: project.status === 'archived' ? 'archived' : project.clientName,
          }),
        )
        rememberProjects(items)
        return { ...result, items }
      }),
    [draft.clientIds, mineProjectsOnly, rememberProjects],
  )

  const fetchTasks = useCallback(
    (page: number, pageSize: number, q: string) =>
      listTasksAcrossProjects('all', {
        page,
        pageSize,
        q: q || undefined,
        projectIds: draft.projectIds.length > 0 ? draft.projectIds : undefined,
      }).then((result) => {
        const items = result.items.map(
          (task): ReportEntityOption => ({
            id: task.id,
            name: task.name,
            projectId: task.projectId,
            clientId: task.clientId,
            color: task.projectColor,
            projectName: task.projectName,
            clientName: task.clientName,
            hint: task.projectName ?? (task.status === 'done' ? 'done' : undefined),
          }),
        )
        rememberTasks(items)
        return { ...result, items }
      }),
    [draft.projectIds, rememberTasks],
  )

  const fetchTags = useCallback(
    (page: number, pageSize: number, q: string) =>
      listTags({ page, pageSize, q: q || undefined }).then((result) => {
        const items = result.items.map(
          (tag): ReportEntityOption => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          }),
        )
        rememberTags(items)
        return { ...result, items }
      }),
    [rememberTags],
  )

  const fromDate = useMemo(
    () => (draft.from ? isoToCalendarDate(draft.from) : null),
    [draft.from],
  )
  const toDate = useMemo(() => (draft.to ? isoToCalendarDate(draft.to) : null), [draft.to])
  const activePreset = matchReportDatePreset(draft.from, draft.to)
  const knownClients = useMemo(() => [...clientOptionsById.values()], [clientOptionsById])
  const knownProjects = useMemo(() => [...projectOptionsById.values()], [projectOptionsById])
  const knownTasks = useMemo(() => [...taskOptionsById.values()], [taskOptionsById])
  const knownMembers = useMemo(() => [...memberOptionsById.values()], [memberOptionsById])
  const knownTags = useMemo(() => [...tagOptionsById.values()], [tagOptionsById])
  useDismissOnOutside(rootRef, open, () => setOpen(false), {
    closeOnEscape: true,
    ignoreSelector: '.react-aria-Popover, [data-report-entity-menu]',
    ignoreEscapeSelector: '.react-aria-Popover, [data-report-entity-menu]',
  })

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-9 items-center gap-2 rounded-full px-3.5 font-mono text-eyebrow font-medium tracking-[0.12em] uppercase shadow-soft transition-colors ${
          isDirty || open
            ? 'bg-navy text-cream'
            : 'bg-white text-navy/60 hover:text-navy'
        }`}
      >
        <Icon name="filter" className="size-icon-sm" />
        Filters
        <Icon
          name="chevron-down"
          className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <section
          className="absolute top-[calc(100%+6px)] left-0 z-40 max-h-[min(76vh,680px)] w-[min(calc(100vw-3rem),28rem)] overflow-y-auto rounded-2xl bg-white/95 px-5 py-4 shadow-dropdown backdrop-blur-xl motion-safe:animate-rise"
          role="dialog"
          aria-label="Report filters"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-eyebrow font-medium tracking-[0.12em] text-navy/60 uppercase">
              Report filters
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="rounded-full border-control border-navy/20 px-3.5 py-1.5 text-caption font-medium text-navy/70 transition-colors hover:border-navy/35 hover:text-navy"
              >
                Reset
              </button>
              {onApply ? (
                <button
                  type="button"
                  onClick={() => {
                    onApply()
                    setOpen(false)
                  }}
                  disabled={!isDirty}
                  className="rounded-full bg-brand px-3.5 py-1.5 text-caption font-medium text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
              ) : null}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {DATE_PRESETS.map((preset) => {
              const active = activePreset === preset.kind
              return (
                <button
                  key={preset.kind}
                  type="button"
                  onClick={() => onPatch(reportDatePreset(preset.kind))}
                  className={`rounded-full px-3 py-1.5 font-mono text-eyebrow font-medium tracking-[0.12em] uppercase transition-colors ${
                    active
                      ? 'bg-navy text-cream'
                      : 'text-navy/55 hover:bg-surface-muted hover:text-navy'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
        <Field label="Date range">
          <div className="flex min-h-10 min-w-0 flex-col gap-2 overflow-visible sm:flex-row sm:items-center">
            <DatePickerField
              label="From"
              hideLabel
              compact
              value={fromDate}
              placeholder="No start"
              onChange={(value) => onPatch({ from: calendarDateToIso(value) })}
            />
            <span className="hidden shrink-0 text-caption text-navy/35 sm:inline">to</span>
            <DatePickerField
              label="To"
              hideLabel
              compact
              value={toDate}
              placeholder="No end"
              onChange={(value) => onPatch({ to: calendarDateToIso(value) })}
            />
            {draft.from || draft.to ? (
              <button
                type="button"
                onClick={() => onPatch({ from: null, to: null })}
                aria-label="Clear date range"
                title="Clear date range"
                className="flex size-6 shrink-0 items-center justify-center rounded-xs text-navy/40 transition-colors hover:bg-surface-muted hover:text-navy sm:ml-auto"
              >
                <Icon name="x" className="size-3" />
              </button>
            ) : null}
          </div>
        </Field>

        {hideBillable ? null : (
          <Field label="Time type">
            <BillableToggle
              value={draft.billable}
              onChange={(billable) => onPatch({ billable })}
            />
          </Field>
        )}
          </div>

          <div className="mt-3 space-y-3">
        {hideClients ? null : (
          <Field label="Clients">
          <ReportEntityMultiSelect
              selectedIds={draft.clientIds}
              onChange={(clientIds) =>
                onPatch(
                  cascadeAfterClientsChange(draft, clientIds, projectClientById, taskProjectById),
                )
              }
              fetchPage={fetchClients}
              knownOptions={knownClients}
              placeholder="All clients"
              searchPlaceholder="Search clients…"
              maxSelected={singleClient ? 1 : undefined}
            />
          </Field>
        )}

            <Field label="Projects">
              <ReportEntityMultiSelect
                selectedIds={draft.projectIds}
                onChange={(projectIds, selected) => {
                  rememberProjects(selected)
                  onPatch(cascadeAfterProjectsChange(draft, projectIds, taskProjectById))
                }}
                fetchPage={fetchProjects}
                knownOptions={knownProjects}
                placeholder={
                  draft.clientIds.length > 0 ? 'Projects for selected clients' : 'All projects'
                }
                searchPlaceholder="Search projects…"
              />
            </Field>

        {hideTasks ? null : (
          <Field label="Tasks">
            <ReportEntityMultiSelect
              selectedIds={draft.taskIds}
              onChange={(taskIds, selected) => {
                rememberTasks(selected)
                const added = selected.find((option) => !draft.taskIds.includes(option.id))
                if (added?.projectId && added.clientId) {
                  onPatch(
                    pinFromTask(
                      { taskId: added.id, projectId: added.projectId, clientId: added.clientId },
                      taskIds,
                      taskProjectById,
                    ),
                  )
                  return
                }
                if (taskIds.length === 0) {
                  onPatch({ taskIds: [] })
                  return
                }
                const first = taskIds[0]
                const meta = taskMetaById.get(first) ?? selected.find((o) => o.id === first)
                if (meta && 'projectId' in meta && meta.projectId && meta.clientId) {
                  onPatch(
                    pinFromTask(
                      {
                        taskId: first,
                        projectId: meta.projectId,
                        clientId: meta.clientId,
                      },
                      taskIds,
                      taskProjectById,
                    ),
                  )
                  return
                }
                onPatch({ taskIds })
              }}
              fetchPage={fetchTasks}
              knownOptions={knownTasks}
              placeholder={
                draft.projectIds.length > 0 ? 'Tasks for selected projects' : 'All tasks'
              }
              searchPlaceholder="Search tasks…"
            />
          </Field>
        )}

        {hideMembers ? null : (
          <Field label="Members">
            <ReportEntityMultiSelect
              selectedIds={draft.userIds}
              onChange={(userIds, selected) => {
                rememberMembers(selected)
                onPatch({ userIds })
              }}
              fetchPage={fetchMembers}
              knownOptions={knownMembers}
              placeholder="All members"
              searchPlaceholder="Search members…"
            />
          </Field>
        )}

        {hideTags ? null : (
          <Field label="Tags">
            <ReportEntityMultiSelect
              selectedIds={draft.tagIds}
              onChange={(tagIds, selected) => {
                rememberTags(selected)
                onPatch({ tagIds })
              }}
              fetchPage={fetchTags}
              knownOptions={knownTags}
              placeholder="All tags"
              searchPlaceholder="Search tags…"
            />
          </Field>
        )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function rememberOptions(
  previous: ReadonlyMap<string, ReportEntityOption>,
  options: ReportEntityOption[],
): Map<string, ReportEntityOption> {
  const next = new Map(previous)
  for (const option of options) next.set(option.id, option)
  return next
}

function BillableToggle({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (value: boolean | null) => void
}) {
  return (
    <div className="flex min-h-10 items-center gap-1.5" role="group" aria-label="Time type">
      <TimeTypeButton
        icon="clock"
        label="All time types"
        active={value === null}
        onClick={() => onChange(null)}
      />
      <TimeTypeButton
        icon="billable"
        label="Billable only"
        active={value === true}
        onClick={() => onChange(value === true ? null : true)}
      />
      <TimeTypeButton
        icon="ban"
        label="Non-billable only"
        active={value === false}
        onClick={() => onChange(value === false ? null : false)}
      />
      <span className="ml-1 truncate text-caption text-navy/55">
        {value === null ? 'All' : value ? 'Billable' : 'Non-billable'}
      </span>
    </div>
  )
}

function TimeTypeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: 'clock' | 'billable' | 'ban'
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-control shrink-0 items-center justify-center rounded-md border shadow-soft transition-colors ${
        active
          ? 'border-brand bg-brand text-white hover:bg-brand-deep'
          : 'border-navy/[0.06] bg-white text-navy/55 hover:border-brand/20 hover:text-navy'
      }`}
    >
      <Icon name={icon} className="size-icon-sm" />
    </button>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="font-display text-sm font-semibold tracking-wide text-navy/45 uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}
