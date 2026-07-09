import type { Tag } from '../types/tag'
import { apiClient } from './client'

/**
 * Tags API (TagsController, RT-44). Reads are member-accessible; mutations are
 * trust-based (any authenticated user). Deletes are soft-deletes allowed even
 * while a tag is in use, so the name can be reused immediately.
 */

/** Mirrors backend TagResponse. */
interface TagResponse {
  id: string
  name: string
  color: string | null
  usageCount: number
  createdAtUtc: string
}

function toTag(response: TagResponse): Tag {
  return {
    id: response.id,
    name: response.name,
    color: response.color,
    usageCount: response.usageCount,
    createdAtUtc: response.createdAtUtc,
  }
}

export function listTags(): Promise<Tag[]> {
  return apiClient.get<TagResponse[]>('/tags').then((tags) => tags.map(toTag))
}

export function createTag(name: string, color: string | null): Promise<Tag> {
  return apiClient.post<TagResponse>('/tags', { name, color }).then(toTag)
}

/**
 * Patch a tag. Omit `color` to leave it unchanged; send an empty string to
 * clear it (the backend's clear sentinel).
 */
export function updateTag(
  tagId: string,
  patch: { name?: string; color?: string },
): Promise<Tag> {
  return apiClient.patch<TagResponse>(`/tags/${tagId}`, patch).then(toTag)
}

export function deleteTag(tagId: string): Promise<void> {
  return apiClient.delete(`/tags/${tagId}`).then(() => undefined)
}
