import type { ActiveTimer, TimeEntryTag } from '../types/timeEntry'
import type { Teammate } from '../lib/mention'

/**
 * UI-only draft of the fields shared by every tracker mode (timer, manual,
 * duration, templates). Nullable fields mirror the shape of a time entry so
 * the same draft can seed the running timer or a manual/duration submission.
 */
export interface TimeEntryDraft {
  description: string
  mentionedTeammates: Teammate[]
  projectId: string | null
  projectTaskId: string | null
  projectName: string | null
  projectColor: string | null
  projectTaskName: string | null
  tagIds: string[]
  knownTags: TimeEntryTag[]
  isBillable: boolean
}

export const initialTimeEntryDraft: TimeEntryDraft = {
  description: '',
  mentionedTeammates: [],
  projectId: null,
  projectTaskId: null,
  projectName: null,
  projectColor: null,
  projectTaskName: null,
  tagIds: [],
  knownTags: [],
  isBillable: true,
}

export type TimeEntryDraftAction =
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_MENTIONED_TEAMMATES'; mentionedTeammates: Teammate[] }
  | {
      type: 'SET_PROJECT'
      projectId: string | null
      projectTaskId: string | null
      projectName: string | null
      projectColor: string | null
      projectTaskName: string | null
    }
  | { type: 'CLEAR_PROJECT' }
  | { type: 'SET_TAGS'; tagIds: string[]; knownTags: TimeEntryTag[] }
  | { type: 'REMOVE_TAG'; tagId: string }
  | { type: 'SET_BILLABLE'; isBillable: boolean }
  | {
      type: 'APPLY_TEMPLATE'
      description: string
      projectId: string | null
      projectTaskId: string | null
      projectName: string | null
      projectColor: string | null
      projectTaskName: string | null
      tagIds: string[]
      knownTags: TimeEntryTag[]
      isBillable: boolean
    }
  | { type: 'SYNC_FROM_TIMER'; timer: ActiveTimer }
  | { type: 'RESET' }

export function timeEntryDraftReducer(
  state: TimeEntryDraft,
  action: TimeEntryDraftAction,
): TimeEntryDraft {
  switch (action.type) {
    case 'SET_DESCRIPTION':
      return { ...state, description: action.description }
    case 'SET_MENTIONED_TEAMMATES':
      return { ...state, mentionedTeammates: action.mentionedTeammates }
    case 'SET_PROJECT':
      return {
        ...state,
        projectId: action.projectId,
        projectTaskId: action.projectTaskId,
        projectName: action.projectName,
        projectColor: action.projectColor,
        projectTaskName: action.projectTaskName,
      }
    case 'CLEAR_PROJECT':
      return {
        ...state,
        projectId: null,
        projectTaskId: null,
        projectName: null,
        projectColor: null,
        projectTaskName: null,
      }
    case 'SET_TAGS':
      return { ...state, tagIds: action.tagIds, knownTags: action.knownTags }
    case 'REMOVE_TAG':
      return {
        ...state,
        tagIds: state.tagIds.filter((id) => id !== action.tagId),
        knownTags: state.knownTags.filter((tag) => tag.id !== action.tagId),
      }
    case 'SET_BILLABLE':
      return { ...state, isBillable: action.isBillable }
    case 'APPLY_TEMPLATE':
      return {
        ...state,
        description: action.description,
        mentionedTeammates: [],
        projectId: action.projectId,
        projectTaskId: action.projectTaskId,
        projectName: action.projectName,
        projectColor: action.projectColor,
        projectTaskName: action.projectTaskName,
        tagIds: action.tagIds,
        knownTags: action.knownTags,
        isBillable: action.isBillable,
      }
    case 'SYNC_FROM_TIMER':
      return {
        ...state,
        description: action.timer.description ?? state.description,
        projectId: action.timer.projectId,
        projectTaskId: action.timer.projectTaskId,
        projectName: action.timer.projectName,
        projectColor: action.timer.projectColor,
        projectTaskName: action.timer.projectTaskName,
        tagIds: action.timer.tags.map((tag) => tag.id),
        knownTags: action.timer.tags,
        isBillable: action.timer.isBillable,
      }
    case 'RESET':
      return initialTimeEntryDraft
    default:
      return state
  }
}
