import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import {
  getDetailedReport,
  getProfitabilityReport,
  getSummaryReport,
  getWorkloadReport,
} from '../api/reports'
import {
  cloneReportQuery,
  defaultReportQuery,
  queriesEqual,
  reportQueryKey,
} from '../lib/reportQuery'
import type { ReportQuery, ReportType } from '../types/reportQuery'

const DETAILED_PAGE_SIZE = 50

/**
 * Fetch-with-cache for one report tab: caches by key, tracks its own loading state,
 * and writes failures into the shared `setError` the caller passes in (all four report
 * tabs share one error banner — see `useReportWorkspace`, this must not become per-tab).
 * `fetcher` only needs to be stable for the inputs it closes over (wrap it in
 * `useCallback` at the call site) — this hook re-fetches whenever `active`, `cacheKey`
 * or `fetcher` change.
 */
function useCachedReport<T>(
  active: boolean,
  cacheKey: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  errorMessage: string,
  setError: (message: string | null) => void,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(active)
  const cacheRef = useRef<Map<string, T>>(new Map())

  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  useEffect(() => {
    if (!active) return

    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      const cached = cacheRef.current.get(cacheKey)
      if (cached) {
        setData(cached)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const loaded = await fetcher(controller.signal)
        if (cancelled) return
        cacheRef.current.set(cacheKey, loaded)
        setData(loaded)
        setError(null)
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return
        setData(null)
        setError(apiErrorMessage(cause, errorMessage))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [active, cacheKey, fetcher, errorMessage, setError])

  return { data, loading, clearCache }
}

export function useReportWorkspace() {
  const [draftQuery, setDraftQuery] = useState<ReportQuery>(() => defaultReportQuery())
  const [appliedQuery, setAppliedQuery] = useState<ReportQuery>(() => defaultReportQuery())
  const [activeTab, setActiveTab] = useState<ReportType>('summary')
  const [detailedPage, setDetailedPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const appliedKey = useMemo(() => reportQueryKey(appliedQuery), [appliedQuery])
  const detailedCacheKey = `${appliedKey}|p=${detailedPage}`
  const isDirty = !queriesEqual(draftQuery, appliedQuery)

  const summaryFetcher = useCallback(
    (signal: AbortSignal) => getSummaryReport(appliedQuery, { signal }),
    [appliedQuery],
  )
  const detailedFetcher = useCallback(
    (signal: AbortSignal) =>
      getDetailedReport(appliedQuery, { page: detailedPage, pageSize: DETAILED_PAGE_SIZE, signal }),
    [appliedQuery, detailedPage],
  )
  const workloadFetcher = useCallback(
    (signal: AbortSignal) => getWorkloadReport(appliedQuery, { signal }),
    [appliedQuery],
  )
  const profitabilityFetcher = useCallback(
    (signal: AbortSignal) => getProfitabilityReport(appliedQuery, { signal }),
    [appliedQuery],
  )

  const {
    data: summary,
    loading: summaryLoading,
    clearCache: clearSummaryCache,
  } = useCachedReport(
    activeTab === 'summary',
    appliedKey,
    summaryFetcher,
    'Could not load the summary report. Is the backend running?',
    setError,
  )
  const {
    data: detailed,
    loading: detailedLoading,
    clearCache: clearDetailedCache,
  } = useCachedReport(
    activeTab === 'detailed',
    detailedCacheKey,
    detailedFetcher,
    'Could not load the detailed report. Is the backend running?',
    setError,
  )
  const {
    data: workload,
    loading: workloadLoading,
    clearCache: clearWorkloadCache,
  } = useCachedReport(
    activeTab === 'workload',
    appliedKey,
    workloadFetcher,
    'Could not load the workload report. Is the backend running?',
    setError,
  )
  const {
    data: profitability,
    loading: profitabilityLoading,
    clearCache: clearProfitabilityCache,
  } = useCachedReport(
    activeTab === 'profitability',
    appliedKey,
    profitabilityFetcher,
    'Could not load the profitability report. Is the backend running?',
    setError,
  )

  const isLoading =
    (activeTab === 'summary' && summaryLoading) ||
    (activeTab === 'detailed' && detailedLoading) ||
    (activeTab === 'workload' && workloadLoading) ||
    (activeTab === 'profitability' && profitabilityLoading)

  const patchDraft = useCallback((patch: Partial<ReportQuery>) => {
    setDraftQuery((previous) => {
      const next = cloneReportQuery(previous)
      if (patch.userIds !== undefined) next.userIds = [...patch.userIds]
      if (patch.projectIds !== undefined) next.projectIds = [...patch.projectIds]
      if (patch.clientIds !== undefined) next.clientIds = [...patch.clientIds]
      if (patch.taskIds !== undefined) next.taskIds = [...patch.taskIds]
      if (patch.tagIds !== undefined) next.tagIds = [...patch.tagIds]
      if (patch.groupBy !== undefined) next.groupBy = [...patch.groupBy]
      if (patch.billable !== undefined) next.billable = patch.billable
      if (patch.from !== undefined) next.from = patch.from
      if (patch.to !== undefined) next.to = patch.to
      return next
    })
  }, [])

  const replaceDraft = useCallback((query: ReportQuery) => {
    setDraftQuery(cloneReportQuery(query))
  }, [])

  const clearCaches = useCallback(() => {
    clearSummaryCache()
    clearDetailedCache()
    clearWorkloadCache()
    clearProfitabilityCache()
  }, [clearSummaryCache, clearDetailedCache, clearWorkloadCache, clearProfitabilityCache])

  const applyFilters = useCallback(() => {
    clearCaches()
    setDetailedPage(1)
    setAppliedQuery(cloneReportQuery(draftQuery))
  }, [clearCaches, draftQuery])

  const resetFilters = useCallback(() => {
    const next = defaultReportQuery()
    clearCaches()
    setDetailedPage(1)
    setDraftQuery(next)
    setAppliedQuery(cloneReportQuery(next))
  }, [clearCaches])

  return {
    draftQuery,
    appliedQuery,
    activeTab,
    setActiveTab,
    summary,
    detailed,
    workload,
    profitability,
    detailedPage,
    setDetailedPage,
    detailedPageSize: DETAILED_PAGE_SIZE,
    isLoading,
    error,
    isDirty,
    patchDraft,
    replaceDraft,
    applyFilters,
    resetFilters,
  }
}
