import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { fetchAllPages } from '../../api/pagination'
import { listTasks } from '../../api/tasks'
import { timeEntryApiErrorMessage } from '../../api/timeEntries'
import { useTimer } from '../../hooks/useTimer'
import { useWeekLock } from '../../hooks/useWeekLock'
import { WeekLockBanner } from '../timesheet/WeekLockBanner'
import {
  applyManualFieldChange,
  createManualEntryFromTimeEntry,
  dateInputToUtcIso,
  entryDateToDateInputValue,
  formatManualDurationInput,
  MAX_MANUAL_DURATION_SECONDS,
  parseDatetimeLocal,
  parseDurationInput,
  toDatetimeLocalValue,
  validateDurationOnlyEntry,
  validateManualEntry,
} from '../../lib/manualEntry'
import type { Task } from '../../types/task'
import type { TimeEntry } from '../../types/timeEntry'
import { Modal } from '../ui/Modal'

import { SearchSelect } from '../ui/SearchSelect'
import { ProjectPicker } from '../pickers/ProjectPicker'
import { TagMultiSelect } from '../pickers/TagMultiSelect'
import { DURATION_LIMIT_MESSAGE, isDurationLimitError } from '../../lib/timeEntryErrors'
import { useOverlapAlert } from '../../hooks/useOverlapAlert'
import { DurationLimitModal } from './durationLimitModal'
import { OverlapAlertModal } from './overlapAlert'

export function EditEntryModal({ entry, onClose }: { entry: TimeEntry; onClose: () => void }) {
  const isDurationOnly = entry.mode === 'DurationOnly'
  const { isSavingEdit, updateEntry } = useTimer()
  // Entries in a submitted/approved week can't be edited (the backend 409s too).
  const weekLock = useWeekLock(entry.startedAtUtc ? new Date(entry.startedAtUtc) : null)
  const [description, setDescription] = useState(entry.description ?? '')
  const [isBillable, setIsBillable] = useState(entry.isBillable)
  const [projectId, setProjectId] = useState<string | null>(entry.projectId)
  const [projectTaskId, setProjectTaskId] = useState<string | null>(entry.projectTaskId)
  const [tagIds, setTagIds] = useState<string[]>(() => entry.tags.map((t) => t.id))
  const [tasks, setTasks] = useState<Task[]>([])
  const [manualEntry, setManualEntry] = useState(() => createManualEntryFromTimeEntry(entry))
  const [durationDraft, setDurationDraft] = useState<string | null>(null)
  const [durationOnlySeconds, setDurationOnlySeconds] = useState(entry.durationSeconds)
  const [durationOnlyInput, setDurationOnlyInput] = useState(() =>
    formatManualDurationInput(entry.durationSeconds),
  )
  const [durationOnlyDate, setDurationOnlyDate] = useState(() =>
    entryDateToDateInputValue(entry.startedAtUtc),
  )
  const [error, setError] = useState<string | null>(null)
  const [durationLimitMessage, setDurationLimitMessage] = useState<string | null>(null)
  const [durationParseError, setDurationParseError] = useState<string | null>(null)

  const durationInput =
    durationDraft ?? formatManualDurationInput(manualEntry.durationSeconds)

  const validation = validateManualEntry(manualEntry, [], null)
  const durationOnlyValidationError = validateDurationOnlyEntry(durationOnlySeconds)

  const overlapAlert = useOverlapAlert()
  const { overlapWarning, showOverlapAlert } = overlapAlert

  const endOrderError =
    manualEntry.end <= manualEntry.start ? 'End must be after start' : null
  const blockingError = isDurationOnly
    ? durationOnlyValidationError ?? durationParseError ?? error
    : validation.error ?? error

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    void (async () => {
      try {
        const list = await fetchAllPages((page, pageSize) =>
          listTasks(projectId, 'all', { page, pageSize }),
        )
        if (cancelled) return
        setTasks(list)
      } catch {
        if (!cancelled) setTasks([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const taskOptions = useMemo(
    () =>
      (projectId ? tasks : []).map((task) => ({
        value: task.id,
        label: task.name,
        hint: task.status === 'done' ? '(done)' : undefined,
      })),
    [tasks, projectId],
  )

  const handleProjectChange = (nextProjectId: string | null) => {
    setProjectId(nextProjectId)
    setProjectTaskId(null)
    if (!nextProjectId) setTasks([])
  }

  const associationPayload = {
    projectId,
    projectTaskId,
    tagIds,
    isBillable,
  }

  const handleSaveDurationOnly = async () => {
    setDurationLimitMessage(null)

    if (durationOnlySeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    const validationError = durationOnlyValidationError ?? durationParseError
    if (validationError) {
      setError(validationError)
      return
    }

    const entryDateUtc = dateInputToUtcIso(durationOnlyDate)
    if (!entryDateUtc) {
      setError('Enter a valid date.')
      return
    }

    setError(null)

    try {
      await updateEntry({
        id: entry.id,
        description: description.trim() || undefined,
        startedAtUtc: entryDateUtc,
        durationSeconds: durationOnlySeconds,
        ...associationPayload,
      })
      onClose()
    } catch (err) {
      if (isDurationLimitError(err)) {
        setDurationLimitMessage(timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE))
        return
      }

      if (err instanceof ApiError && err.status === 403) {
        setError(timeEntryApiErrorMessage(err, 'This entry cannot be edited.'))
        return
      }

      setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
    }
  }

  const handleSave = async () => {
    setDurationLimitMessage(null)

    if (manualEntry.durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      setDurationLimitMessage(DURATION_LIMIT_MESSAGE)
      return
    }

    await overlapAlert.saveOrShowOverlapAlert({
      onClearError: () => setError(null),
      validationError: validation.error,
      onValidationError: setError,
      save: async () => {
        await updateEntry({
          id: entry.id,
          description: description.trim() || undefined,
          startedAtUtc: manualEntry.start.toISOString(),
          endedAtUtc: manualEntry.end.toISOString(),
          ...associationPayload,
        })
        onClose()
      },
      onOtherError: (err) => {
        if (isDurationLimitError(err)) {
          setDurationLimitMessage(
            timeEntryApiErrorMessage(err, DURATION_LIMIT_MESSAGE),
          )
          return
        }

        if (err instanceof ApiError && err.status === 403) {
          setError(timeEntryApiErrorMessage(err, 'This entry cannot be edited.'))
          return
        }

        setError(timeEntryApiErrorMessage(err, 'Could not save changes.'))
      },
    })
  }

  return (
    <>
      <Modal
        title="Edit time entry"
        subtitle={
          isDurationOnly
            ? 'Update description, project, tags, duration, and billable status.'
            : 'Update description, project, tags, times, and billable status.'
        }
        onClose={onClose}
      >
        {weekLock.locked && <WeekLockBanner status={weekLock.status} className="mb-4 rounded-lg bg-surface-muted px-3.5 py-2.5" />}

        <div className="mb-3">
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Description
          </label>
          <input
            className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
            placeholder="What did you work on?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSavingEdit}
          />
        </div>

        {isDurationOnly ? (
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EditField
              label="Date"
              type="date"
              value={durationOnlyDate}
              onChange={setDurationOnlyDate}
              disabled={isSavingEdit}
            />
            <EditField
              label="Duration"
              type="text"
              value={durationOnlyInput}
              onChange={(value) => {
                setDurationOnlyInput(value)
                setDurationParseError(null)
                setDurationLimitMessage(null)
                const parsed = parseDurationInput(value)
                if (parsed === null) return
                setDurationOnlySeconds(parsed)
              }}
              onBlur={() => {
                const parsed = parseDurationInput(durationOnlyInput)
                if (durationOnlyInput.trim() && parsed === null) {
                  setDurationParseError('Use 1:30 or 1:30:00')
                  return
                }
                setDurationParseError(null)
                setDurationOnlyInput(formatManualDurationInput(durationOnlySeconds))
              }}
              className="font-mono tabular-nums"
              hasError={Boolean(durationParseError)}
              hint={durationParseError ?? undefined}
              disabled={isSavingEdit}
            />
          </div>
        ) : (
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <EditField
              label="Start"
              type="datetime-local"
              value={toDatetimeLocalValue(manualEntry.start)}
              onChange={(value) => {
                const parsed = parseDatetimeLocal(value)
                if (!parsed) return
                setDurationLimitMessage(null)
                overlapAlert.clearOverlapAlert()
                setManualEntry((current) => applyManualFieldChange(current, 'start', parsed))
              }}
              hasError={Boolean(endOrderError)}
              disabled={isSavingEdit}
            />
            <EditField
              label="End"
              type="datetime-local"
              value={toDatetimeLocalValue(manualEntry.end)}
              onChange={(value) => {
                const parsed = parseDatetimeLocal(value)
                if (!parsed) return
                setDurationLimitMessage(null)
                overlapAlert.clearOverlapAlert()
                setManualEntry((current) => applyManualFieldChange(current, 'end', parsed))
              }}
              hint={endOrderError ?? undefined}
              hasError={Boolean(endOrderError)}
              disabled={isSavingEdit}
            />
            <EditField
              label="Duration"
              type="text"
              value={durationInput}
              onChange={(value) => {
                setDurationDraft(value)
                setDurationLimitMessage(null)
                overlapAlert.clearOverlapAlert()
                const parsed = parseDurationInput(value)
                if (parsed === null) return
                setManualEntry((current) => applyManualFieldChange(current, 'duration', parsed))
              }}
              onBlur={() => setDurationDraft(null)}
              className="font-mono tabular-nums"
              disabled={isSavingEdit}
            />
          </div>
        )}

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-label font-semibold text-navy/70">Project</span>
            <ProjectPicker
              value={projectId}
              onChange={handleProjectChange}
              allowClear
              disabled={isSavingEdit}
              placeholder="No project"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-label font-semibold text-navy/70">Task</span>
            <SearchSelect
              ariaLabel="Task"
              options={taskOptions}
              value={projectTaskId}
              onChange={setProjectTaskId}
              placeholder={projectId ? 'No task' : 'Select a project first'}
              searchPlaceholder="Search tasks…"
              allowClear
              disabled={isSavingEdit || !projectId}
            />
          </label>
        </div>

        <div className="mb-3">
          <span className="mb-1.5 block font-display text-label font-semibold text-navy/70">
            Tags
          </span>
          <TagMultiSelect
            knownTags={entry.tags}
            selectedIds={tagIds}
            onChange={(ids) => setTagIds(ids)}
            disabled={isSavingEdit}
          />
        </div>

        <label className="mb-3 flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            disabled={isSavingEdit}
            className="h-4 w-4 rounded border-navy/20 text-brand focus:ring-brand/30"
          />
          <span className="text-md font-medium text-navy/80">Billable</span>
        </label>

        {blockingError ? (
          <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
            {blockingError}
          </div>
        ) : null}

        <div className="mt-4.5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSavingEdit || Boolean(blockingError) || weekLock.locked}
            onClick={() => void (isDurationOnly ? handleSaveDurationOnly() : handleSave())}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingEdit ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Modal>

      {durationLimitMessage ? (
        <DurationLimitModal
          message={durationLimitMessage}
          onDismiss={() => setDurationLimitMessage(null)}
        />
      ) : null}

      {showOverlapAlert && overlapWarning && !isDurationOnly ? (
        <OverlapAlertModal
          message={overlapWarning}
          onDismiss={overlapAlert.clearOverlapAlert}
        />
      ) : null}
    </>
  )
}

function EditField({
  label,
  type,
  value,
  onChange,
  onBlur,
  className = '',
  disabled,
  hasError = false,
  hint,
}: {
  label: string
  type: 'datetime-local' | 'text' | 'date'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  disabled?: boolean
  hasError?: boolean
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-label font-semibold text-navy/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full rounded-md border-control px-3 py-field text-body text-navy outline-none focus:border-brand disabled:opacity-60 ${
          hasError ? 'border-red/40' : 'border-navy/[0.08]'
        } ${className}`}
      />
      {hint ? <span className="text-xs leading-tight text-red">{hint}</span> : null}
    </label>
  )
}
