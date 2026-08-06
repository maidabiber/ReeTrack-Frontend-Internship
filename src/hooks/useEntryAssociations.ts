import { useEffect, useMemo, useState } from 'react'
import { cached } from '../api/entityCache'
import { fetchAllPages } from '../api/pagination'
import { listTasks } from '../api/tasks'
import type { Task } from '../types/task'

export interface EntryAssociationsInit {
  projectId: string | null
  projectTaskId: string | null
  tagIds: string[]
  isBillable: boolean
}

/**
 * Shared project / task / tags / billable state for the create and edit time
 * entry modals. Owns the lazy task list for the selected project and exposes a
 * ready-to-send association payload.
 */
export function useEntryAssociations(init: EntryAssociationsInit) {
  const [projectId, setProjectId] = useState<string | null>(init.projectId)
  const [projectTaskId, setProjectTaskId] = useState<string | null>(init.projectTaskId)
  const [tagIds, setTagIds] = useState<string[]>(init.tagIds)
  const [isBillable, setIsBillable] = useState(init.isBillable)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    void (async () => {
      try {
        // Cached: the assistant's draft panel mounts one of these per drafted row, and they
        // almost always share a project — five identical full paginations otherwise.
        const list = await cached(`tasks:${projectId}`, () =>
          fetchAllPages((page, pageSize) => listTasks(projectId, 'all', { page, pageSize })),
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

  return {
    projectId,
    projectTaskId,
    tagIds,
    isBillable,
    taskOptions,
    handleProjectChange,
    setProjectTaskId,
    setTagIds,
    setIsBillable,
    payload: { projectId, projectTaskId, tagIds, isBillable },
  }
}
