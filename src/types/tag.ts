/**
 * A workspace tag (RT-44). Mirrors the backend TagResponse. Tags are a flat,
 * workspace-wide label list applied to time entries; `color` is an optional
 * accent from the shared PROJECT_COLORS palette.
 */
export interface Tag {
  id: string
  name: string
  /** Hex accent (e.g. "#4366E2"), or null for no colour. */
  color: string | null
  /** How many time entries currently carry this tag. */
  usageCount: number
  createdAtUtc: string
}
