import type { Tag } from '../types/tag'
import type { PagedResult } from '../types/paged'
import { apiClient } from './client'
import {
  appendListQueryParams,
  type ListQueryOptions,
  toPagedResult,
} from './pagination'

/**
 * Tags API (TagsController, RT-44). Reads and mutations are accessible to any
 * authenticated user.
 */

export type ListTagsOptions = ListQueryOptions

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

export function listTags(options: ListTagsOptions = {}): Promise<PagedResult<Tag>> {
  const params = new URLSearchParams()
  appendListQueryParams(params, options)
  const qs = params.toString()

  return apiClient
    .get<PagedResult<TagResponse>>(`/tags${qs ? `?${qs}` : ''}`)
    .then((result) => toPagedResult(result, toTag))
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
