import { searchClients } from '../../api/clients'
import { listProjects } from '../../api/projects'
import { listTasksAcrossProjects } from '../../api/tasks'
import { listTags } from '../../api/tags'
import type { MentionType } from '../../types/assistant'

export interface MentionSuggestion {
  id: string
  name: string
  hint?: string
  /** Task suggestions carry their project so the assistant can resolve both at once. */
  projectId?: string | null
  projectName?: string | null
}

export interface MentionSource {
  type: MentionType
  glyph: string
  groupLabel: string
  search: (query: string) => Promise<MentionSuggestion[]>
}

const CLIENT_SOURCE: MentionSource = {
  type: 'client',
  glyph: '◇',
  groupLabel: 'CLIENTS',
  search: (query) => searchClients(query, 6),
}

const PROJECT_SOURCE: MentionSource = {
  type: 'project',
  glyph: '▣',
  groupLabel: 'PROJECTS',
  search: async (query) => {
    const result = await listProjects('active', { q: query, pageSize: 6 })
    return result.items.map((project) => ({ id: project.id, name: project.name }))
  },
}

const TASK_SOURCE: MentionSource = {
  type: 'task',
  glyph: '◆',
  groupLabel: 'TASKS',
  search: async (query) => {
    const result = await listTasksAcrossProjects('open', { q: query, pageSize: 6 })
    return result.items.map((task) => ({
      id: task.id,
      name: task.name,
      hint: task.projectName ?? undefined,
      projectId: task.projectId,
      projectName: task.projectName,
    }))
  },
}

const TAG_SOURCE: MentionSource = {
  type: 'tag',
  glyph: '●',
  groupLabel: 'TAGS',
  search: async (query) => {
    const result = await listTags({ q: query, pageSize: 6 })
    return result.items.map((tag) => ({ id: tag.id, name: tag.name }))
  },
}

/** Time-entry mode: mention a project, task, or tag. */
export const PROJECT_MENTIONS: MentionSource[] = [PROJECT_SOURCE, TASK_SOURCE, TAG_SOURCE]

/** Project-creation mode: mention a client (today's behaviour). */
export const CLIENT_MENTIONS: MentionSource[] = [CLIENT_SOURCE]
