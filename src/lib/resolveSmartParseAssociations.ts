import { getProject } from '../api/projects'
import { listTasks } from '../api/tasks'
import { listTags } from '../api/tags'
import type { TimeEntryTag } from '../types/timeEntry'
import type { SmartTimeParseResult } from '../types/smartTimeParse'

export interface ResolvedSmartParseAssociations {
  projectId: string | null
  projectTaskId: string | null
  projectName: string | null
  projectColor: string | null
  projectTaskName: string | null
  tagIds: string[]
  knownTags: TimeEntryTag[]
  isBillable: boolean
}

export async function resolveSmartParseAssociations(
  parsed: SmartTimeParseResult,
): Promise<ResolvedSmartParseAssociations> {
  let projectId = parsed.matchedProjectId
  let projectTaskId = parsed.matchedProjectTaskId
  let projectName: string | null = null
  let projectColor: string | null = null
  let projectTaskName: string | null = null

  if (projectId) {
    try {
      const project = await getProject(projectId)
      projectName = project.name
      projectColor = project.color
    } catch {
      projectId = null
      projectTaskId = null
    }
  }

  if (projectId && projectTaskId) {
    try {
      const tasks = await listTasks(projectId, 'open', { pageSize: 200 })
      const task = tasks.items.find((item) => item.id === projectTaskId)
      if (task) {
        projectTaskName = task.name
      } else {
        projectTaskId = null
      }
    } catch {
      projectTaskId = null
    }
  }

  let knownTags: TimeEntryTag[] = []
  const tagIds = parsed.matchedTagIds

  if (tagIds.length > 0) {
    try {
      const tags = await listTags({ pageSize: 200 })
      knownTags = tags.items
        .filter((tag) => tagIds.includes(tag.id))
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        }))
    } catch {
      knownTags = []
    }
  }

  return {
    projectId,
    projectTaskId,
    projectName,
    projectColor,
    projectTaskName,
    tagIds: knownTags.map((tag) => tag.id),
    knownTags,
    isBillable: parsed.isBillable,
  }
}
