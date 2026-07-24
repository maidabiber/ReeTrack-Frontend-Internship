import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { getProject, listProjects } from '../../api/projects'
import { listOpenTasks, listTasks } from '../../api/tasks'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import type { Project } from '../../types/project'
import type { Task } from '../../types/task'
import { Icon } from '../ui/Icon'
import { useDismissOnOutside } from '../../hooks/useDismissOnOutside'

export type ProjectTaskSelection = {
  projectId: string | null
  projectTaskId: string | null
  projectName?: string | null
  projectColor?: string | null
  taskName?: string | null
}

/**
 * Searchable project + task popover for the tracker project IconButton.
 * Fetches projects and tasks lazily with server-side search and infinite scroll.
 */
export function ProjectTaskPicker({
  open,
  onOpenChange,
  projectId,
  projectTaskId,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
  projectTaskId: string | null
  onChange: (next: ProjectTaskSelection) => void
}) {
  const [query, setQuery] = useState('')
  const [resolvedProject, setResolvedProject] = useState<Project | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const fetchProjects = useCallback(
    (page: number, pageSize: number, q: string) =>
      listProjects('active', { page, pageSize, q: q || undefined }),
    [],
  )

  const fetchOpenTasks = useCallback(
    (page: number, pageSize: number, q: string) =>
      listOpenTasks({ page, pageSize, q: q || undefined }),
    [],
  )

  const fetchProjectTasks = useCallback(
    (page: number, pageSize: number, q: string) => {
      if (!projectId) {
        return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize })
      }
      return listTasks(projectId, 'open', { page, pageSize, q: q || undefined })
    },
    [projectId],
  )

  const projectsList = usePaginatedList<Project>({
    fetchPage: fetchProjects,
    enabled: open && projectId == null,
    query,
  })

  const openTasksList = usePaginatedList<Task>({
    fetchPage: fetchOpenTasks,
    enabled: open && projectId == null,
    query,
  })

  const scopedTasksList = usePaginatedList<Task>({
    fetchPage: fetchProjectTasks,
    enabled: open && projectId != null,
    query,
  })

  const projects = projectsList.items
  const tasks = projectId ? scopedTasksList.items : openTasksList.items
  const loading =
    projectId == null
      ? (projectsList.loading && projects.length === 0) ||
        (openTasksList.loading && tasks.length === 0)
      : scopedTasksList.loading && tasks.length === 0
  const loadingMore = projectId
    ? scopedTasksList.loadingMore
    : projectsList.loadingMore || openTasksList.loadingMore

  const close = () => {
    setQuery('')
    onOpenChange(false)
  }

  useDismissOnOutside(rootRef, open, close)

  const selectedFromList = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  )
  const selectedProject =
    !projectId
      ? null
      : (selectedFromList ??
        (resolvedProject?.id === projectId ? resolvedProject : null))

  useEffect(() => {
    if (!projectId || selectedFromList) return

    let cancelled = false
    void getProject(projectId)
      .then((project) => {
        if (!cancelled) setResolvedProject(project)
      })
      .catch(() => {
        if (!cancelled) setResolvedProject(null)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, selectedFromList])

  const filteredProjects = useMemo(() => {
    if (projectId) return []
    return [...projects].sort((a, b) => a.name.localeCompare(b.name))
  }, [projects, projectId])

  const filteredTasks = useMemo(() => {
    const scoped = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks
    return [...scoped].sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks, projectId])

  const projectColorById = useMemo(() => {
    const map = new Map<string, string>()
    for (const project of projects) {
      map.set(project.id, project.color ?? '#C7CDDB')
    }
    if (selectedProject) {
      map.set(selectedProject.id, selectedProject.color ?? '#C7CDDB')
    }
    return map
  }, [projects, selectedProject])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      if (el.scrollTop + el.clientHeight < el.scrollHeight - 40) return

      if (projectId) {
        scopedTasksList.loadMore()
        return
      }

      if (projectsList.hasMore && !projectsList.loadingMore) {
        projectsList.loadMore()
      }
      if (openTasksList.hasMore && !openTasksList.loadingMore) {
        openTasksList.loadMore()
      }
    },
    [projectId, projectsList, openTasksList, scopedTasksList],
  )

  if (!open) return null

  return (
    <div
      ref={rootRef}
      className="absolute top-[calc(100%+6px)] left-0 z-40 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl bg-white p-menu shadow-dropdown"
    >
      <label className="mb-1 flex items-center gap-1.5 rounded-xs border-control border-navy/[0.08] px-2.5 py-1.5 focus-within:border-brand">
        <Icon name="search" className="h-3.5 w-3.5 flex-shrink-0 text-navy/50" />
        <input
          autoFocus
          className="w-full border-none bg-transparent text-sm text-navy outline-none placeholder:text-navy/45"
          placeholder={projectId ? 'Search tasks…' : 'Search projects or tasks…'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClick={(event) => event.stopPropagation()}
        />
      </label>

      <div className="max-h-[260px] overflow-y-auto" onScroll={handleScroll}>
        {selectedProject ? (
          <div className="mb-1 flex items-center gap-2 rounded-xs bg-surface-muted/60 px-2.5 py-compact">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: selectedProject.color ?? '#C7CDDB' }}
            />
            <span className="min-w-0 flex-1 truncate text-caption font-semibold text-navy">
              {selectedProject.name}
            </span>
            <button
              type="button"
              className="text-sm font-medium text-navy/55 hover:text-navy"
              onClick={(event) => {
                event.stopPropagation()
                onChange({ projectId: null, projectTaskId: null, projectName: null, projectColor: null, taskName: null })
              }}
            >
              Change
            </button>
          </div>
        ) : null}

        {(projectId == null || query.trim()) && filteredProjects.length > 0 ? (
          <div className="pt-1">
            <div className="px-2.5 py-1 font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
              Projects
            </div>
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange({
                    projectId: project.id,
                    projectTaskId: null,
                    projectName: project.name,
                    projectColor: project.color,
                    taskName: null,
                  })
                  setQuery('')
                }}
                className="flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption font-medium text-navy hover:bg-surface-muted"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: project.color ?? '#C7CDDB' }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {project.name}
                  <span className="text-navy/45"> · {project.clientName}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="pt-1">
          <div className="px-2.5 py-1 font-display text-eyebrow font-bold tracking-[0.05em] text-navy/45 uppercase">
            Tasks
          </div>
          {loading ? (
            <div className="px-2.5 py-3 text-center text-sm text-navy/45">Loading…</div>
          ) : filteredTasks.length === 0 ? (
            <div className="px-2.5 py-3 text-center text-sm text-navy/45">
              {projectId ? 'No open tasks for this project.' : 'No matching tasks.'}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const taskProjectColor = projectColorById.get(task.projectId) ?? '#C7CDDB'
              const taskProject = projects.find((p) => p.id === task.projectId)
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange({
                      projectId: task.projectId,
                      projectTaskId: task.id,
                      projectName: taskProject?.name ?? selectedProject?.name ?? null,
                      projectColor: taskProjectColor,
                      taskName: task.name,
                    })
                    close()
                  }}
                  className={`flex w-full items-center gap-2 rounded-xs px-2.5 py-compact text-left text-caption hover:bg-surface-muted ${
                    task.id === projectTaskId ? 'font-bold text-navy' : 'font-medium text-navy'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: taskProjectColor }}
                  />
                  <span className="min-w-0 flex-1 truncate">{task.name}</span>
                </button>
              )
            })
          )}
        </div>

        {loadingMore && (
          <div className="px-2.5 py-2 text-center text-sm text-navy/45">Loading more…</div>
        )}

        {!loading && filteredProjects.length === 0 && filteredTasks.length === 0 && !projectId ? (
          <div className="px-2.5 py-3 text-center text-sm text-navy/45">No matches.</div>
        ) : null}
      </div>
    </div>
  )
}
