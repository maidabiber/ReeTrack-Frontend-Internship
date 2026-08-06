import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { ProjectPicker } from '../pickers/ProjectPicker'
import { TagMultiSelect } from '../pickers/TagMultiSelect'
import { SearchSelect } from '../ui/SearchSelect'
import { useEntryAssociations } from '../../hooks/useEntryAssociations'
import { cached } from '../../api/entityCache'
import { getProject } from '../../api/projects'
import {
  MAX_MANUAL_DURATION_SECONDS,
  formatManualDurationInput,
  parseDurationInput,
} from '../../lib/manualEntry'
import type { TimeEntryDraftItem } from '../../types/assistant'
import { LABEL, FIELD } from './draftFieldStyles'

const ROW_MODES = [
  { value: 'duration', label: 'Duration' },
  { value: 'range', label: 'Range' },
] as const

type RowMode = (typeof ROW_MODES)[number]['value']

/** yyyy-MM-dd (internal draft value) -> dd/mm/yyyy (displayed). */
function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

/** dd/mm/yyyy (typed) -> yyyy-MM-dd, or null if not a valid calendar date. */
function parseDisplayDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function TimeEntryDraftRow({
  row,
  onChange,
  onRemove,
  hasConflict = false,
}: {
  row: TimeEntryDraftItem
  onChange: (patch: Partial<TimeEntryDraftItem>) => void
  onRemove?: () => void
  /** This row collided with an existing entry on the last create attempt. */
  hasConflict?: boolean
}) {
  const mode: RowMode = row.startTime && row.endTime ? 'range' : 'duration'

  const associations = useEntryAssociations({
    projectId: row.projectId,
    projectTaskId: row.projectTaskId,
    tagIds: row.tagIds,
    isBillable: row.isBillable,
  })
  const [tagNames, setTagNames] = useState<string[]>(row.tagNames)
  const [resolvedProjectName, setResolvedProjectName] = useState<string | null>(row.projectName)

  // ProjectPicker/SearchSelect only hand back ids, not labels — resolve the
  // project's name whenever the selection changes so it round-trips back to
  // the backend (which otherwise has no name to show for a carried-over id).
  // Clearing the project doesn't need to reset this: the payload below only
  // uses it while associations.projectId is set.
  useEffect(() => {
    if (!associations.projectId) return
    let cancelled = false
    const projectId = associations.projectId
    cached(`project:${projectId}`, () => getProject(projectId))
      .then((project) => { if (!cancelled) setResolvedProjectName(project.name) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [associations.projectId])

  const projectName = associations.projectId ? resolvedProjectName : null
  const taskName = associations.projectTaskId
    ? (associations.taskOptions.find((o) => o.value === associations.projectTaskId)?.label ?? row.taskName)
    : null

  // The task list loads asynchronously, so a selected task isn't in taskOptions on first
  // paint — and SearchSelect shows its placeholder for a value it can't find, which reads
  // as "the task has no name". Carry the drafted name until the real option arrives.
  const taskOptions =
    associations.projectTaskId &&
    !associations.taskOptions.some((option) => option.value === associations.projectTaskId)
      ? [
          { value: associations.projectTaskId, label: row.taskName ?? 'Selected task' },
          ...associations.taskOptions,
        ]
      : associations.taskOptions

  // useEntryAssociations owns its own state; forward every change back up so
  // the card's draft (and the next <current_time_entry_draft> round trip)
  // stays in sync with what the row is showing.
  useEffect(() => {
    onChange({
      projectId: associations.projectId,
      projectName,
      projectTaskId: associations.projectTaskId,
      taskName,
      tagIds: associations.tagIds,
      tagNames,
      isBillable: associations.isBillable,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    associations.projectId,
    projectName,
    associations.projectTaskId,
    taskName,
    associations.tagIds,
    tagNames,
    associations.isBillable,
  ])

  const setMode = (next: RowMode) => {
    if (next === 'duration') {
      onChange({ startTime: null, endTime: null, durationMinutes: row.durationMinutes || 60 })
    } else {
      onChange({ startTime: row.startTime ?? '09:00', endTime: row.endTime ?? '10:00' })
    }
  }

  const knownTags =
    row.tagIds.length > 0
      ? row.tagIds.map((id, i) => ({ id, name: row.tagNames[i] ?? '', color: null }))
      : []

  return (
    <div
      className={`rounded-xl border p-3 ${
        hasConflict ? 'border-red/40 bg-red-tint/40' : 'border-navy/10 bg-surface-muted/40'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <SegmentedToggle value={mode} onChange={setMode} options={[...ROW_MODES]} />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-navy/30 transition-colors hover:bg-red-tint hover:text-red"
            aria-label="Remove entry"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {mode === 'range' ? (
        <>
          <div className="mb-2.5">
            <label className={LABEL}>Date</label>
            <input
              key={row.entryDate}
              className={`${FIELD} min-w-0 font-mono tabular-nums`}
              placeholder="dd/mm/yyyy"
              defaultValue={toDisplayDate(row.entryDate)}
              onBlur={(e) => {
                const parsed = parseDisplayDate(e.target.value)
                if (parsed) onChange({ entryDate: parsed })
                else e.target.value = toDisplayDate(row.entryDate)
              }}
            />
          </div>
          <div className="mb-2.5 grid grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <label className={LABEL}>Start</label>
              <input
                type="time"
                className={`${FIELD} min-w-[7.5rem] font-mono tabular-nums`}
                value={row.startTime ?? ''}
                onChange={(e) => onChange({ startTime: e.target.value })}
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL}>End</label>
              <input
                type="time"
                className={`${FIELD} min-w-[7.5rem] font-mono tabular-nums`}
                value={row.endTime ?? ''}
                onChange={(e) => onChange({ endTime: e.target.value })}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <div className="min-w-0">
            <label className={LABEL}>Date</label>
            <input
              key={row.entryDate}
              className={`${FIELD} min-w-0 font-mono tabular-nums`}
              placeholder="dd/mm/yyyy"
              defaultValue={toDisplayDate(row.entryDate)}
              onBlur={(e) => {
                const parsed = parseDisplayDate(e.target.value)
                if (parsed) onChange({ entryDate: parsed })
                else e.target.value = toDisplayDate(row.entryDate)
              }}
            />
          </div>
          <div className="min-w-0">
            <label className={LABEL}>Duration</label>
            <input
              key={mode}
              className={`${FIELD} min-w-0 font-mono tabular-nums`}
              placeholder="1:00:00"
              defaultValue={formatManualDurationInput(row.durationMinutes * 60)}
              onBlur={(e) => {
                const seconds = parseDurationInput(e.target.value)
                if (seconds !== null) {
                  const clamped = Math.min(seconds, MAX_MANUAL_DURATION_SECONDS)
                  onChange({ durationMinutes: Math.round(clamped / 60) })
                  e.target.value = formatManualDurationInput(clamped)
                } else {
                  e.target.value = formatManualDurationInput(row.durationMinutes * 60)
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="mb-2.5">
        <label className={LABEL}>Description</label>
        <input
          className={FIELD}
          placeholder="What did you work on?"
          value={row.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Project</label>
          <ProjectPicker
            value={associations.projectId}
            onChange={associations.handleProjectChange}
            allowClear
            placeholder="No project"
          />
        </div>
        <div>
          <label className={LABEL}>Task</label>
          <SearchSelect
            ariaLabel="Task"
            options={taskOptions}
            value={associations.projectTaskId}
            onChange={associations.setProjectTaskId}
            placeholder={associations.projectId ? 'No task' : 'Select a project first'}
            searchPlaceholder="Search tasks…"
            allowClear
            disabled={!associations.projectId}
          />
        </div>
      </div>

      <div className="mb-2.5">
        <label className={LABEL}>Tags</label>
        <TagMultiSelect
          knownTags={knownTags}
          selectedIds={associations.tagIds}
          onChange={(ids, tags) => {
            associations.setTagIds(ids)
            setTagNames(tags.map((t) => t.name))
          }}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={associations.isBillable}
          onChange={(e) => associations.setIsBillable(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-navy/20 text-brand focus:ring-brand/30"
        />
        <span className="text-sm font-medium text-navy/80">Billable</span>
      </label>
    </div>
  )
}
