import { useEffect, useRef, useState } from 'react'
import { ColorSwatchPicker } from '../ui/ColorSwatchPicker'
import { SearchSelect } from '../ui/SearchSelect'
import { Icon } from '../ui/Icon'
import { listClients } from '../../api/clients'
import type { Client } from '../../types/client'
import { createProjectWithTasks, type ProjectInput } from '../../api/projects'
import { fetchAllPages } from '../../api/pagination'
import { apiErrorMessage } from '../../api/client'
import type { ProjectDraft, ProjectTaskDraft } from '../../types/assistant'
import type { Project } from '../../types/project'

const LABEL = 'mb-1 block font-display text-label font-semibold text-navy/70'
const FIELD =
  'w-full rounded-md border-control border-navy/10 bg-white/70 px-3 py-1.5 text-body text-navy outline-none transition-colors focus:border-brand focus:bg-white'
const AMOUNT_FIELD = `${FIELD} font-mono tabular-nums`
const TASK_FIELD = 'rounded-md border-control border-navy/10 bg-white/70 px-3 py-1 text-sm text-navy outline-none transition-colors focus:border-brand focus:bg-white'

function amountToField(value: number | null): string {
  return value === null ? '' : String(value)
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

type DraftFields = {
  name: string
  clientId: string
  currencyCode: string
  hourlyRate: string
  fixedFeeAmount: string
  timeEstimateHours: string
  color: string | null
  tasks: ProjectTaskDraft[]
}

function buildDraft(
  fields: DraftFields,
  clients: Client[],
  fallbackClientName: string | null,
): ProjectDraft {
  const resolvedClientId = fields.clientId || null
  const clientName = resolvedClientId
    ? (clients.find((c) => c.id === resolvedClientId)?.name ?? fallbackClientName)
    : null

  return {
    name: fields.name,
    clientId: resolvedClientId,
    clientName,
    currencyCode: fields.currencyCode,
    hourlyRate: parseAmount(fields.hourlyRate),
    fixedFeeAmount: parseAmount(fields.fixedFeeAmount),
    timeEstimateHours: parseAmount(fields.timeEstimateHours),
    color: fields.color,
    tasks: fields.tasks,
  }
}

export function ProjectDraftCard({
  draft,
  onChange,
  onCreated,
}: {
  draft: ProjectDraft
  onChange: (draft: ProjectDraft) => void
  onCreated: (project: Project) => void
}) {
  const [name, setName] = useState(draft.name)
  const [clientId, setClientId] = useState(draft.clientId ?? '')
  const [currencyCode, setCurrencyCode] = useState(draft.currencyCode)
  const [hourlyRate, setHourlyRate] = useState(amountToField(draft.hourlyRate))
  const [fixedFeeAmount, setFixedFeeAmount] = useState(amountToField(draft.fixedFeeAmount))
  const [timeEstimateHours, setTimeEstimateHours] = useState(amountToField(draft.timeEstimateHours))
  const [color, setColor] = useState<string | null>(draft.color)
  const [tasks, setTasks] = useState<ProjectTaskDraft[]>(draft.tasks.length > 0 ? draft.tasks : [{ name: '', timeEstimateHours: null }])
  const [clients, setClients] = useState<Client[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldsRef = useRef<DraftFields>({
    name: draft.name,
    clientId: draft.clientId ?? '',
    currencyCode: draft.currencyCode,
    hourlyRate: amountToField(draft.hourlyRate),
    fixedFeeAmount: amountToField(draft.fixedFeeAmount),
    timeEstimateHours: amountToField(draft.timeEstimateHours),
    color: draft.color,
    tasks: draft.tasks.length > 0 ? draft.tasks : [{ name: '', timeEstimateHours: null }],
  })

  useEffect(() => {
    let cancelled = false
    fetchAllPages((page, pageSize) => listClients('active', { page, pageSize }))
      .then((loaded) => { if (!cancelled) setClients(loaded) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const emitDraft = (patch: Partial<DraftFields>) => {
    const fields: DraftFields = {
      ...fieldsRef.current,
      ...patch,
    }
    fieldsRef.current = fields

    if (patch.name !== undefined) setName(fields.name)
    if (patch.clientId !== undefined) setClientId(fields.clientId)
    if (patch.currencyCode !== undefined) setCurrencyCode(fields.currencyCode)
    if (patch.hourlyRate !== undefined) setHourlyRate(fields.hourlyRate)
    if (patch.fixedFeeAmount !== undefined) setFixedFeeAmount(fields.fixedFeeAmount)
    if (patch.timeEstimateHours !== undefined) setTimeEstimateHours(fields.timeEstimateHours)
    if (patch.color !== undefined) setColor(fields.color)
    if (patch.tasks !== undefined) setTasks(fields.tasks)

    onChange(buildDraft(fields, clients, draft.clientName))
  }

  const canSave = name.trim().length > 0 && clientId !== '' && !isSaving

  const handleCreate = async () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)

    try {
      const latest = buildDraft(fieldsRef.current, clients, draft.clientName)
      const projectInput: ProjectInput = {
        name: latest.name.trim(),
        clientId: latest.clientId!,
        currencyCode: latest.currencyCode.trim().toUpperCase() || 'EUR',
        hourlyRate: latest.hourlyRate,
        fixedFeeAmount: latest.fixedFeeAmount,
        timeEstimateHours: latest.timeEstimateHours,
        color: latest.color,
      }

      const validTasks = latest.tasks
        .filter((t) => t.name.trim().length > 0)
        .map((t) => ({
          name: t.name.trim(),
          timeEstimateHours: t.timeEstimateHours,
        }))

      const project = await createProjectWithTasks(projectInput, validTasks)

      onCreated(project)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the project.'))
      setIsSaving(false)
    }
  }

  const addTask = () => {
    emitDraft({ tasks: [...fieldsRef.current.tasks, { name: '', timeEstimateHours: null }] })
  }

  const removeTask = (index: number) => {
    emitDraft({ tasks: fieldsRef.current.tasks.filter((_, i) => i !== index) })
  }

  const updateTask = (index: number, patch: Partial<ProjectTaskDraft>) => {
    emitDraft({
      tasks: fieldsRef.current.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    })
  }

  const totalTaskHours = tasks.reduce((sum, t) => sum + (t.timeEstimateHours ?? 0), 0)

  return (
    <div className="rounded-2xl border border-brand/20 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-display text-label font-semibold text-navy">Project Draft</h4>
        <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-micro font-medium text-brand">
          AI proposed
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className={LABEL}>Name</label>
          <input
            className={FIELD}
            value={name}
            onChange={(e) => emitDraft({ name: e.target.value })}
          />
        </div>

        <div>
          <label className={LABEL}>Client</label>
          <SearchSelect
            ariaLabel="Client"
            placeholder="Select a client..."
            searchPlaceholder="Search clients..."
            value={clientId || null}
            onChange={(v) => emitDraft({ clientId: v ?? '' })}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div className="flex gap-2.5">
          <div className="w-[80px] flex-shrink-0">
            <label className={LABEL}>Currency</label>
            <input
              className={AMOUNT_FIELD}
              value={currencyCode}
              onChange={(e) => emitDraft({ currencyCode: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL}>Hourly rate</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={AMOUNT_FIELD}
              placeholder="90"
              value={hourlyRate}
              onChange={(e) => emitDraft({ hourlyRate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className={LABEL}>Fixed fee</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={AMOUNT_FIELD}
              placeholder="Optional"
              value={fixedFeeAmount}
              onChange={(e) => emitDraft({ fixedFeeAmount: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL}>Estimate (h)</label>
            <input
              type="number"
              min="0"
              step="0.25"
              className={AMOUNT_FIELD}
              placeholder="Optional"
              value={timeEstimateHours}
              onChange={(e) => emitDraft({ timeEstimateHours: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Colour</label>
          <ColorSwatchPicker
            value={color}
            onChange={(next) => emitDraft({ color: next })}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className={LABEL}>Tasks</label>
            {totalTaskHours > 0 && (
              <span className="text-micro text-navy/50">
                Total: {totalTaskHours}h
              </span>
            )}
          </div>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  className={`${TASK_FIELD} flex-1 min-w-0`}
                  placeholder={`Task ${index + 1}`}
                  value={task.name}
                  onChange={(e) => updateTask(index, { name: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  className={`${TASK_FIELD} w-16 flex-shrink-0`}
                  placeholder="h"
                  value={task.timeEstimateHours ?? ''}
                  onChange={(e) => updateTask(index, { timeEstimateHours: parseAmount(e.target.value) })}
                />
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-navy/30 transition-colors hover:bg-red-tint hover:text-red"
                  aria-label="Remove task"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTask}
            className="mt-2 flex items-center gap-1 text-micro font-medium text-brand transition-colors hover:text-brand-deep"
          >
            <Icon name="plus" className="h-3 w-3" />
            Add task
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-tint px-3 py-2 text-sm text-red">{error}</div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSave}
          className="w-full rounded-full bg-brand py-2 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Creating...' : 'Create project'}
        </button>
      </div>
    </div>
  )
}
