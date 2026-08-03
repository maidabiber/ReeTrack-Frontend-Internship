import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { ActiveTimer, TimeEntryTag } from '../types/timeEntry'
import type { Teammate } from '../lib/mention'

// ---------------------------------------------------------------------------
// Draft state
// ---------------------------------------------------------------------------

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

const initialDraft: TimeEntryDraft = {
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

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type DraftAction =
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

function draftReducer(state: TimeEntryDraft, action: DraftAction): TimeEntryDraft {
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
      return initialDraft
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseEntryDraftReturn {
  draft: TimeEntryDraft
  setDescription: (description: string) => void
  setMentionedTeammates: (mentionedTeammates: Teammate[]) => void
  setProject: (project: {
    projectId: string | null
    projectTaskId: string | null
    projectName: string | null
    projectColor: string | null
    projectTaskName: string | null
  }) => void
  clearProject: () => void
  setTags: (tagIds: string[], knownTags: TimeEntryTag[]) => void
  removeTag: (tagId: string) => void
  setBillable: (isBillable: boolean) => void
  applyTemplate: (template: {
    description: string
    projectId: string | null
    projectTaskId: string | null
    projectName: string | null
    projectColor: string | null
    projectTaskName: string | null
    tagIds: string[]
    knownTags: TimeEntryTag[]
    isBillable: boolean
  }) => void
  reset: () => void
}

export function useEntryDraft(activeTimer?: ActiveTimer | null): UseEntryDraftReturn {
  const [draft, dispatch] = useReducer(draftReducer, initialDraft)
  const hadActiveTimerRef = useRef(false)

  // Sync draft from active timer when one first appears (e.g. started on another tab).
  useEffect(() => {
    if (activeTimer && !hadActiveTimerRef.current) {
      dispatch({ type: 'SYNC_FROM_TIMER', timer: activeTimer })
    }
    hadActiveTimerRef.current = activeTimer !== null
  }, [activeTimer])

  const setDescription = useCallback(
    (description: string) => dispatch({ type: 'SET_DESCRIPTION', description }),
    [],
  )

  const setMentionedTeammates = useCallback(
    (mentionedTeammates: Teammate[]) =>
      dispatch({ type: 'SET_MENTIONED_TEAMMATES', mentionedTeammates }),
    [],
  )

  const setProject = useCallback(
    (project: {
      projectId: string | null
      projectTaskId: string | null
      projectName: string | null
      projectColor: string | null
      projectTaskName: string | null
    }) => dispatch({ type: 'SET_PROJECT', ...project }),
    [],
  )

  const clearProject = useCallback(
    () => dispatch({ type: 'CLEAR_PROJECT' }),
    [],
  )

  const setTags = useCallback(
    (tagIds: string[], knownTags: TimeEntryTag[]) =>
      dispatch({ type: 'SET_TAGS', tagIds, knownTags }),
    [],
  )

  const removeTag = useCallback(
    (tagId: string) => dispatch({ type: 'REMOVE_TAG', tagId }),
    [],
  )

  const setBillable = useCallback(
    (isBillable: boolean) => dispatch({ type: 'SET_BILLABLE', isBillable }),
    [],
  )

  const applyTemplate = useCallback(
    (template: {
      description: string
      projectId: string | null
      projectTaskId: string | null
      projectName: string | null
      projectColor: string | null
      projectTaskName: string | null
      tagIds: string[]
      knownTags: TimeEntryTag[]
      isBillable: boolean
    }) => dispatch({ type: 'APPLY_TEMPLATE', ...template }),
    [],
  )

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    draft,
    setDescription,
    setMentionedTeammates,
    setProject,
    clearProject,
    setTags,
    removeTag,
    setBillable,
    applyTemplate,
    reset,
  }
}
