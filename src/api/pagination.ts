import type { PagedResult } from '../types/paged'

/** Shared paging + search options for list endpoints. */
export interface ListQueryOptions {
  page?: number
  pageSize?: number
  q?: string
  clientId?: string
}

/** Appends page, pageSize, and q onto an existing URLSearchParams. */
export function appendListQueryParams(
  params: URLSearchParams,
  options: ListQueryOptions,
): void {
  if (options.page != null) params.set('page', String(options.page))
  if (options.pageSize != null) params.set('pageSize', String(options.pageSize))
  if (options.q?.trim()) params.set('q', options.q.trim())
  if (options.clientId) params.set('clientId', options.clientId)
}

/** Maps a backend PagedResult of response DTOs into domain items. */
export function toPagedResult<TResponse, T>(
  result: PagedResult<TResponse>,
  mapItem: (item: TResponse) => T,
): PagedResult<T> {
  return {
    items: result.items.map(mapItem),
    totalCount: result.totalCount,
    page: result.page,
    pageSize: result.pageSize,
  }
}

/** Fetches every page from a paginated list endpoint and returns the combined items. */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PagedResult<T>>,
  pageSize = 200,
): Promise<T[]> {
  const first = await fetchPage(1, pageSize)
  const all = [...first.items]

  if (all.length >= first.totalCount) return all

  let page = 2
  while (all.length < first.totalCount) {
    const next = await fetchPage(page, pageSize)
    all.push(...next.items)
    if (next.items.length === 0) break
    page++
  }

  return all
}
