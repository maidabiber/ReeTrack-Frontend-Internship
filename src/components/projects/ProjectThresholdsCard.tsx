import { useEffect, useMemo, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import {
  createProjectThreshold,
  deleteProjectThreshold,
  listProjectThresholds,
  updateProjectThreshold,
} from '../../api/projectThresholds'
import type { ProjectThreshold, ProjectThresholdMetricType } from '../../types/projectThreshold'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}%`
}

function parsePercentage(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0 || value > 100) return null
  return value
}

type MetricCopy = {
  title: string
  description: string
  unitLabel: string
  missingBaseline: string
  emptyTitle: string
  emptyHint: string
}

const METRIC_COPY: Record<ProjectThresholdMetricType, MetricCopy> = {
  Cost: {
    title: 'Cost alerts',
    description:
      'Notify admins when labour cost reaches a percentage of the project fixed fee. Each threshold fires once until cost drops below it again.',
    unitLabel: '% of fixed fee',
    missingBaseline:
      'This project has no fixed fee yet. You can still configure thresholds; evaluation skips projects without a positive fixed fee.',
    emptyTitle: 'No thresholds yet',
    emptyHint: 'Add a percentage above to start monitoring project cost.',
  },
  TimeEstimate: {
    title: 'Time estimate alerts',
    description:
      'Notify admins when tracked hours reach a percentage of the project time estimate. Each threshold fires once until hours drop below it again.',
    unitLabel: '% of time estimate',
    missingBaseline:
      'This project has no time estimate yet. You can still configure thresholds; evaluation skips projects without a positive time estimate.',
    emptyTitle: 'No thresholds yet',
    emptyHint: 'Add a percentage above to start monitoring time usage.',
  },
}

export function ProjectThresholdsCard({
  projectId,
  metricType,
  hasBaseline,
  onError,
}: {
  projectId: string
  metricType: ProjectThresholdMetricType
  hasBaseline: boolean
  onError: (message: string) => void
}) {
  const copy = METRIC_COPY[metricType]
  const [thresholds, setThresholds] = useState<ProjectThreshold[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPercentage, setNewPercentage] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPercentage, setEditPercentage] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProjectThreshold | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadedKey, setLoadedKey] = useState(`${projectId}:${metricType}`)

  if (loadedKey !== `${projectId}:${metricType}`) {
    setLoadedKey(`${projectId}:${metricType}`)
    setThresholds([])
    setIsLoading(true)
    setEditingId(null)
    setPendingDelete(null)
  }

  useEffect(() => {
    let cancelled = false

    listProjectThresholds(projectId, metricType)
      .then((rows) => {
        if (!cancelled) setThresholds(rows)
      })
      .catch((error) => {
        if (!cancelled) onError(apiErrorMessage(error, 'Could not load project thresholds.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // intentionally omit onError — parent recreates it each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, metricType])

  const sorted = useMemo(
    () => [...thresholds].sort((a, b) => a.thresholdPercentage - b.thresholdPercentage),
    [thresholds],
  )

  const handleAdd = () => {
    const percentage = parsePercentage(newPercentage)
    if (percentage === null || isAdding) {
      if (percentage === null && newPercentage.trim() !== '') {
        onError('Threshold percentage must be greater than 0 and at most 100.')
      }
      return
    }

    setIsAdding(true)
    createProjectThreshold(projectId, metricType, percentage)
      .then((created) => {
        setThresholds((current) => [...current, created])
        setNewPercentage('')
      })
      .catch((error) => onError(apiErrorMessage(error, 'Could not add the threshold.')))
      .finally(() => setIsAdding(false))
  }

  const startEdit = (threshold: ProjectThreshold) => {
    setEditingId(threshold.id)
    setEditPercentage(String(threshold.thresholdPercentage))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPercentage('')
  }

  const saveEdit = (thresholdId: string) => {
    const percentage = parsePercentage(editPercentage)
    if (percentage === null || isSavingEdit) {
      if (percentage === null) {
        onError('Threshold percentage must be greater than 0 and at most 100.')
      }
      return
    }

    setIsSavingEdit(true)
    updateProjectThreshold(projectId, thresholdId, percentage)
      .then((updated) => {
        setThresholds((current) => current.map((row) => (row.id === updated.id ? updated : row)))
        cancelEdit()
      })
      .catch((error) => onError(apiErrorMessage(error, 'Could not update the threshold.')))
      .finally(() => setIsSavingEdit(false))
  }

  const confirmDelete = () => {
    if (!pendingDelete || isDeleting) return
    setIsDeleting(true)
    deleteProjectThreshold(projectId, pendingDelete.id)
      .then(() => {
        setThresholds((current) => current.filter((row) => row.id !== pendingDelete.id))
        if (editingId === pendingDelete.id) cancelEdit()
        setPendingDelete(null)
      })
      .catch((error) => onError(apiErrorMessage(error, 'Could not delete the threshold.')))
      .finally(() => setIsDeleting(false))
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card">
      <div>
        <h2 className="font-display text-body-lg font-bold text-navy">{copy.title}</h2>
        <p className="mt-0.5 text-sm text-navy/55">{copy.description}</p>
      </div>

      {!hasBaseline && (
        <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-navy/65">
          {copy.missingBaseline}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          handleAdd()
        }}
        className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2"
      >
        <input
          type="number"
          min="0.01"
          max="100"
          step="0.01"
          className="w-[110px] rounded-sm border-control border-navy/[0.08] bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-brand"
          placeholder="e.g. 80"
          value={newPercentage}
          onChange={(event) => setNewPercentage(event.target.value)}
        />
        <span className="text-sm text-navy/55">{copy.unitLabel}</span>
        <button
          type="submit"
          disabled={newPercentage.trim() === '' || isAdding}
          className="ml-auto flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" className="h-3 w-3" />
          {isAdding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {isLoading ? (
        <div className="mt-6 flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-6 rounded-xl bg-surface-muted px-4 py-8 text-center">
          <p className="font-display text-body font-semibold text-navy">{copy.emptyTitle}</p>
          <p className="mt-1 text-sm text-navy/55">{copy.emptyHint}</p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-navy/[0.06]">
          {sorted.map((threshold) => {
            const isEditing = editingId === threshold.id
            return (
              <div key={threshold.id} className="flex flex-wrap items-center gap-2.5 py-3">
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      className="w-[110px] rounded-sm border-control border-navy/[0.08] bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-brand"
                      value={editPercentage}
                      onChange={(event) => setEditPercentage(event.target.value)}
                      autoFocus
                    />
                    <span className="text-sm text-navy/55">%</span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSavingEdit}
                      className="rounded-full border-control border-navy/15 px-3 py-1.5 font-display text-sm font-semibold text-navy hover:border-navy disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(threshold.id)}
                      disabled={isSavingEdit}
                      className="rounded-full bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                    >
                      {isSavingEdit ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-display text-md font-semibold text-navy tabular-nums">
                      {formatPercent(threshold.thresholdPercentage)}
                    </span>
                    <span
                     className={`rounded-full px-2 py-0.5 font-mono text-caption font-medium tracking-[0.06em] ${
                        threshold.isTriggered
                          ? 'bg-red-tint text-red'
                          : 'bg-surface-muted text-navy/55'
                      }`}
                    >
                      {threshold.isTriggered ? 'Reached' : 'Armed'}
                    </span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => startEdit(threshold)}
                      className="rounded-full border-control border-navy/15 px-3 py-1.5 font-display text-sm font-semibold text-navy hover:border-navy"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(threshold)}
                      className="rounded-full border-control border-red/25 px-3 py-1.5 font-display text-sm font-semibold text-red hover:border-red"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pendingDelete && (
        <Modal title="Delete threshold?" onClose={() => !isDeleting && setPendingDelete(null)}>
          <p className="text-body leading-normal text-navy/70">
            Remove the {formatPercent(pendingDelete.thresholdPercentage)} alert for this project?
            Undelivered pending alerts for this threshold will also be removed.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
              className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 rounded-full bg-red py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-red/90 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
