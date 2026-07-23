import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Pill } from '../components/ui/Pill'
import { Modal } from '../components/ui/Modal'
import { ProjectModal } from '../components/projects/ProjectModal'
import { apiErrorMessage } from '../api/client'
import { getProject, updateProject } from '../api/projects'
import { createTask, deleteTask, listTasks, updateTask } from '../api/tasks'
import { fetchAllPages } from '../api/pagination'
import { listMembers, type Member } from '../api/members'
import { formatMoney } from '../lib/projectFormat'
import { formatPlannedVsActual } from '../lib/projectFormat'
import type { Project } from '../types/project'
import type { Task } from '../types/task'

const STATUS_DOT: Record<'active' | 'archived', string> = {
  active: 'bg-[#1E8A57]',
  archived: 'bg-navy/35',
}

function memberName(member: Member): string {
  return member.displayName ?? member.email
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * RT-37/RT-42 — a single project with its billing details and task list. Tasks
 * can be added inline, toggled done, reassigned, renamed (modal) and deleted;
 * deleting a task with tracked time is blocked server-side (409) and surfaced as
 * a notice.
 */
export default function ProjectDetailPage() {
  const { id = '' } = useParams()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editingProject, setEditingProject] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null)

  const refresh = () => setReloadKey((key) => key + 1)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 4000)
  }

  // Members are stable across the session; load them once.
  useEffect(() => {
    let cancelled = false
    listMembers()
      .then((loaded) => !cancelled && setMembers(loaded))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getProject(id),
      fetchAllPages((page, pageSize) => listTasks(id, 'all', { page, pageSize })),
    ])
      .then(([loadedProject, loadedTasks]) => {
        if (cancelled) return
        setProject(loadedProject)
        setTasks(loadedTasks)
        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(apiErrorMessage(error, 'Could not load this project.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  const handleToggleArchived = () => {
    if (!project) return
    const nextStatus = project.status === 'active' ? 'archived' : 'active'
    updateProject(project.id, { status: nextStatus })
      .then((updated) => {
        refresh()
        showNotice(updated.status === 'active' ? 'Project restored.' : 'Project archived.')
      })
      .catch((error) => showNotice(apiErrorMessage(error, 'Could not update the project.')))
  }

  const handleToggleTaskDone = (task: Task) => {
    updateTask(id, task.id, { status: task.status === 'done' ? 'open' : 'done' })
      .then(() => refresh())
      .catch((error) => showNotice(apiErrorMessage(error, 'Could not update the task.')))
  }

  // Reassigning keeps the task's name and estimate: the backend only applies
  // assignee when the name is present (a full content update).
  const handleReassign = (task: Task, assignedToUserId: string | null) => {
    updateTask(id, task.id, {
      name: task.name,
      assignedToUserId,
      timeEstimateHours: task.timeEstimateHours,
    })
      .then(() => refresh())
      .catch((error) => showNotice(apiErrorMessage(error, 'Could not reassign the task.')))
  }

  const handleDeleteTask = (task: Task) => {
    setOpenTaskMenuId(null)
    deleteTask(id, task.id)
      .then(() => {
        refresh()
        showNotice(`“${task.name}” was deleted.`)
      })
      .catch((error) => showNotice(apiErrorMessage(error, `Could not delete “${task.name}”.`)))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
      </div>
    )
  }

  if (loadError || !project) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
        <span className="text-body text-red">{loadError ?? 'Project not found.'}</span>
        <Link
          to="/projects"
          className="rounded-full border-control border-navy px-4 py-1.5 font-display text-sm font-semibold text-navy"
        >
          Back to projects
        </Link>
      </div>
    )
  }

  const isActive = project.status === 'active'

  return (
    <div className="min-h-full flex-1 px-10 py-8" onClick={() => setOpenTaskMenuId(null)}>
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
        <Link
          to="/projects"
          className="flex w-fit items-center gap-1.5 font-display text-sm font-semibold text-navy/55 hover:text-navy"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
          Projects
        </Link>

        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
              style={{
                backgroundColor: project.color ?? 'var(--color-navy)',
                opacity: project.color ? 1 : 0.2,
              }}
            />
            <h1 className="truncate font-display text-[22px] font-bold text-navy">{project.name}</h1>
            <Pill
              label={isActive ? 'Active' : 'Archived'}
              dotClassName={STATUS_DOT[isActive ? 'active' : 'archived']}
            />
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={handleToggleArchived}
              className="rounded-full border-control border-navy/15 px-4 py-2 font-display text-sm font-semibold text-navy hover:border-navy"
            >
              {isActive ? 'Archive' : 'Restore'}
            </button>
            <button
              type="button"
              onClick={() => setEditingProject(true)}
              className="rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              Edit
            </button>
          </div>
        </header>

        {notice && (
          <div className="flex items-center gap-2 rounded-xl bg-brand-tint px-4 py-3 text-body font-medium text-navy">
            <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
            {notice}
          </div>
        )}

        {/* Details card */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-2xl bg-white p-6 shadow-card sm:grid-cols-3">
          <InfoRow label="Client" value={project.clientName} />
          <InfoRow
            label="Hourly rate"
            value={formatMoney(project.hourlyRate, project.currencyCode) ?? '—'}
          />
          <InfoRow
            label="Fixed fee"
            value={formatMoney(project.fixedFeeAmount, project.currencyCode) ?? '—'}
          />
          <InfoRow label="Planned vs actual" value={formatPlannedVsActual(project)} />
          <InfoRow label="Created" value={formatDate(project.createdAtUtc)} />
        </div>

        {/* Tasks card */}
        <TasksCard
          projectId={project.id}
          tasks={tasks}
          members={members}
          openTaskMenuId={openTaskMenuId}
          onToggleTaskMenu={setOpenTaskMenuId}
          onCreated={() => {
            refresh()
          }}
          onToggleDone={handleToggleTaskDone}
          onReassign={handleReassign}
          onRename={(task) => {
            setOpenTaskMenuId(null)
            setEditingTask(task)
          }}
          onDelete={handleDeleteTask}
          onError={showNotice}
        />
      </div>

      {editingProject && (
        <ProjectModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSaved={(saved) => {
            setEditingProject(false)
            refresh()
            showNotice(`${saved.name} was updated.`)
          }}
        />
      )}

      {editingTask && (
        <TaskModal
          projectId={project.id}
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSaved={(saved) => {
            setEditingTask(null)
            refresh()
            showNotice(`“${saved.name}” was updated.`)
          }}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
        {label}
      </p>
      <p className="text-md font-medium text-navy">{value}</p>
    </div>
  )
}

const ASSIGNEE_SELECT =
  'max-w-[150px] rounded-sm border-control border-navy/[0.08] bg-white px-2 py-1 text-sm text-navy/80 outline-none focus:border-brand'

function TasksCard({
  projectId,
  tasks,
  members,
  openTaskMenuId,
  onToggleTaskMenu,
  onCreated,
  onToggleDone,
  onReassign,
  onRename,
  onDelete,
  onError,
}: {
  projectId: string
  tasks: Task[]
  members: Member[]
  openTaskMenuId: string | null
  onToggleTaskMenu: (id: string | null) => void
  onCreated: () => void
  onToggleDone: (task: Task) => void
  onReassign: (task: Task, assignedToUserId: string | null) => void
  onRename: (task: Task) => void
  onDelete: (task: Task) => void
  onError: (message: string) => void
}) {
  const [newName, setNewName] = useState('')
  const [newEstimate, setNewEstimate] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    [tasks],
  )

  const addTask = () => {
    const name = newName.trim()
    if (name === '' || isAdding) return
    setIsAdding(true)
    const estimate = newEstimate.trim() === '' ? null : Number(newEstimate)
    createTask(projectId, {
      name,
      assignedToUserId: newAssignee === '' ? null : newAssignee,
      timeEstimateHours: Number.isFinite(estimate as number) ? estimate : null,
    })
      .then(() => {
        setNewName('')
        setNewEstimate('')
        setNewAssignee('')
        onCreated()
      })
      .catch((error) => onError(apiErrorMessage(error, 'Could not add the task.')))
      .finally(() => setIsAdding(false))
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-body-lg font-bold text-navy">Tasks</h2>
        <span className="font-mono text-sm text-navy/45 tabular-nums">
          {tasks.filter((t) => t.status === 'done').length}/{tasks.length} done
        </span>
      </div>

      {/* Inline add row */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          addTask()
        }}
        className="mb-2 flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2"
      >
        <input
          className="min-w-0 flex-1 border-none bg-transparent text-body text-navy outline-none placeholder:text-navy/45"
          placeholder="Add a task…"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.25"
          className="w-[70px] rounded-sm border-control border-navy/[0.08] bg-white px-2 py-1 text-sm text-navy outline-none focus:border-brand"
          placeholder="h"
          value={newEstimate}
          onChange={(event) => setNewEstimate(event.target.value)}
        />
        <select
          className={ASSIGNEE_SELECT}
          value={newAssignee}
          onChange={(event) => setNewAssignee(event.target.value)}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {memberName(member)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={newName.trim() === '' || isAdding}
          className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" className="h-3 w-3" />
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="px-3 py-6 text-center text-body text-navy/50">
          No tasks yet. Add one above to break this project down.
        </p>
      ) : (
        <div className="divide-y divide-navy/[0.06]">
          {sorted.map((task) => {
            const done = task.status === 'done'
            return (
              <div key={task.id} className="flex items-center gap-2.5 py-2">
                <button
                  type="button"
                  onClick={() => onToggleDone(task)}
                  aria-label={done ? 'Mark as open' : 'Mark as done'}
                  className={`flex size-icon-md flex-shrink-0 items-center justify-center rounded-xs border-control ${
                    done ? 'border-green bg-green text-white' : 'border-navy/25 text-transparent hover:border-navy/50'
                  }`}
                >
                  <Icon name="check-badge" className="h-3 w-3" />
                </button>

                <span
                  className={`min-w-0 flex-1 truncate text-md ${
                    done ? 'text-navy/40 line-through' : 'font-medium text-navy'
                  }`}
                >
                  {task.name}
                </span>

                {task.timeEstimateHours !== null && (
                  <span className="flex-shrink-0 font-mono text-sm text-navy/45 tabular-nums">
                    {task.timeEstimateHours}h
                  </span>
                )}

                <select
                  className={ASSIGNEE_SELECT}
                  value={task.assignedToUserId ?? ''}
                  onChange={(event) => onReassign(task, event.target.value === '' ? null : event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberName(member)}
                    </option>
                  ))}
                </select>

                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    aria-label="Task actions"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleTaskMenu(openTaskMenuId === task.id ? null : task.id)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-xs text-navy/50 hover:bg-surface-muted hover:text-navy"
                  >
                    <Icon name="more" className="h-[15px] w-[15px]" />
                  </button>
                  {openTaskMenuId === task.id && (
                    <div className="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[150px] rounded-xl bg-white p-menu shadow-dropdown">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onRename(task)
                        }}
                        className="flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left text-caption font-medium text-navy hover:bg-surface-muted"
                      >
                        <Icon name="settings" className="size-icon-sm opacity-65" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete(task)
                        }}
                        className="flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left text-caption font-medium text-red hover:bg-surface-muted"
                      >
                        <Icon name="ban" className="size-icon-sm opacity-80" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Edit a task's content: name, estimate and assignee (a full content update). */
function TaskModal({
  projectId,
  task,
  members,
  onClose,
  onSaved,
}: {
  projectId: string
  task: Task
  members: Member[]
  onClose: () => void
  onSaved: (saved: Task) => void
}) {
  const [name, setName] = useState(task.name)
  const [estimate, setEstimate] = useState(task.timeEstimateHours === null ? '' : String(task.timeEstimateHours))
  const [assignee, setAssignee] = useState(task.assignedToUserId ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 200 && !isSaving

  const save = () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    const estimateValue = estimate.trim() === '' ? null : Number(estimate)
    updateTask(projectId, task.id, {
      name: trimmed,
      assignedToUserId: assignee === '' ? null : assignee,
      timeEstimateHours: Number.isFinite(estimateValue as number) ? estimateValue : null,
    })
      .then((saved) => onSaved(saved))
      .catch((saveError) => {
        setError(apiErrorMessage(saveError, 'Could not save the task.'))
        setIsSaving(false)
      })
  }

  return (
    <Modal title="Edit task" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="mb-3">
          <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">Task name</label>
          <input
            autoFocus
            className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="mb-3 flex gap-2.5">
          <div className="w-[110px] flex-shrink-0">
            <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">Estimate (h)</label>
            <input
              type="number"
              min="0"
              step="0.25"
              className="w-full rounded-md border-control border-navy/[0.08] px-3 py-field text-body text-navy outline-none focus:border-brand"
              placeholder="Optional"
              value={estimate}
              onChange={(event) => setEstimate(event.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block font-display text-label font-semibold text-navy/70">Assignee</label>
            <select
              className="w-full rounded-md border-control border-navy/[0.08] bg-white px-3 py-field text-body text-navy outline-none focus:border-brand"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberName(member)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-tint px-3 py-2.5 text-sm leading-[1.5] text-red">
            {error}
          </div>
        )}

        <div className="mt-4.5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border-control border-navy bg-transparent py-2.5 font-display text-body font-semibold text-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-full bg-brand py-2.5 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
