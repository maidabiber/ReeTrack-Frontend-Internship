import { useCallback, useEffect, useState, type UIEvent } from 'react'
import type { PagedResult } from '../types/paged'

export interface UsePaginatedListOptions<T> {
  fetchPage: (page: number, pageSize: number, query: string) => Promise<PagedResult<T>>
  enabled?: boolean
  query?: string
  pageSize?: number
  debounceMs?: number
}

export function usePaginatedList<T>({
  fetchPage,
  enabled = true,
  query = '',
  pageSize = 50,
  debounceMs = 300,
}: UsePaginatedListOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), debounceMs)
    return () => window.clearTimeout(timer)
  }, [query, debounceMs])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    void (async () => {
      // Yield so setState is not synchronous with the effect body.
      await Promise.resolve()
      if (cancelled) return

      setItems([])
      setTotalCount(0)
      setPage(0)
      setError(null)
      setLoading(true)

      try {
        const result = await fetchPage(1, pageSize, debouncedQuery)
        if (cancelled) return
        setItems(result.items)
        setTotalCount(result.totalCount)
        setPage(1)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setItems([])
          setTotalCount(0)
          setPage(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, debouncedQuery, pageSize, fetchPage])

  const hasMore = enabled && items.length < totalCount

  const loadMore = useCallback(() => {
    if (!enabled || loading || loadingMore || !hasMore) return

    const nextPage = page + 1
    setLoadingMore(true)

    void (async () => {
      try {
        const result = await fetchPage(nextPage, pageSize, debouncedQuery)
        setItems((prev) => {
          const seen = new Set(
            prev.map((item) => (item as { id?: string }).id).filter(Boolean),
          )
          const merged = [...prev]
          for (const item of result.items) {
            const id = (item as { id?: string }).id
            if (id && seen.has(id)) continue
            if (id) seen.add(id)
            merged.push(item)
          }
          return merged
        })
        setTotalCount(result.totalCount)
        setPage(nextPage)
        setError(null)
      } catch (err) {
        setError(err)
      } finally {
        setLoadingMore(false)
      }
    })()
  }, [enabled, loading, loadingMore, hasMore, page, pageSize, debouncedQuery, fetchPage])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        loadMore()
      }
    },
    [loadMore],
  )

  const reset = useCallback(() => {
    setItems([])
    setTotalCount(0)
    setPage(0)
    setError(null)
  }, [])

  return {
    items: enabled ? items : [],
    totalCount: enabled ? totalCount : 0,
    loading: enabled && loading,
    loadingMore: enabled && loadingMore,
    error: enabled ? error : null,
    hasMore,
    loadMore,
    handleScroll,
    reset,
  }
}
