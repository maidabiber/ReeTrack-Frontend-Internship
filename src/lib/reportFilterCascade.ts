import type { ReportQuery } from '../types/reportQuery'

export interface TaskFilterMeta {
  taskId: string
  projectId: string
  clientId: string
}

/** Drop projects that cannot be verified as belonging to the selected clients. */
export function pruneProjectsForClients(
  projectIds: string[],
  projectClientById: ReadonlyMap<string, string>,
  clientIds: string[],
): string[] {
  if (clientIds.length === 0) return []
  const allowed = new Set(clientIds)
  return projectIds.filter((id) => {
    const clientId = projectClientById.get(id)
    return clientId !== undefined && allowed.has(clientId)
  })
}

/** Drop tasks that cannot be verified as belonging to the selected projects. */
export function pruneTasksForProjects(
  taskIds: string[],
  taskProjectById: ReadonlyMap<string, string>,
  projectIds: string[],
): string[] {
  if (projectIds.length === 0) return []
  const allowed = new Set(projectIds)
  return taskIds.filter((id) => {
    const projectId = taskProjectById.get(id)
    return projectId !== undefined && allowed.has(projectId)
  })
}

/**
 * Selecting a task pins its single client + project and keeps only tasks that
 * share that project (typically just the chosen task).
 */
export function pinFromTask(
  task: TaskFilterMeta,
  selectedTaskIds: string[],
  taskProjectById: ReadonlyMap<string, string>,
): Pick<ReportQuery, 'clientIds' | 'projectIds' | 'taskIds'> {
  const taskIds = selectedTaskIds.filter((id) => {
    if (id === task.taskId) return true
    return taskProjectById.get(id) === task.projectId
  })
  if (!taskIds.includes(task.taskId)) taskIds.push(task.taskId)

  return {
    clientIds: [task.clientId],
    projectIds: [task.projectId],
    taskIds,
  }
}

/** After clients change: prune projects then tasks. */
export function cascadeAfterClientsChange(
  draft: ReportQuery,
  nextClientIds: string[],
  projectClientById: ReadonlyMap<string, string>,
  taskProjectById: ReadonlyMap<string, string>,
): Pick<ReportQuery, 'clientIds' | 'projectIds' | 'taskIds'> {
  const projectIds = pruneProjectsForClients(draft.projectIds, projectClientById, nextClientIds)
  const taskIds = pruneTasksForProjects(draft.taskIds, taskProjectById, projectIds)
  return { clientIds: nextClientIds, projectIds, taskIds }
}

/** After projects change: prune tasks. */
export function cascadeAfterProjectsChange(
  draft: ReportQuery,
  nextProjectIds: string[],
  taskProjectById: ReadonlyMap<string, string>,
): Pick<ReportQuery, 'projectIds' | 'taskIds'> {
  return {
    projectIds: nextProjectIds,
    taskIds: pruneTasksForProjects(draft.taskIds, taskProjectById, nextProjectIds),
  }
}
