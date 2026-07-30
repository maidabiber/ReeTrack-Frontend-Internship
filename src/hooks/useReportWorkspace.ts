import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { getDetailedReport, getSummaryReport } from '../api/reports'
import {
  cloneReportQuery,
  defaultReportQuery,
  queriesEqual,
  reportQueryKey,
} from '../lib/reportQuery'
import type { DetailedReport, SummaryReport } from '../types/report'
import type { ReportQuery, ReportType } from '../types/reportQuery'

type SummaryCache = Map<string, SummaryReport>
type DetailedCache = Map<string, DetailedReport>

const DETAILED_PAGE_SIZE = 50

export function useReportWorkspace() {
  const [draftQuery, setDraftQuery] = useState<ReportQuery>(() => defaultReportQuery())
  const [appliedQuery, setAppliedQuery] = useState<ReportQuery>(() => defaultReportQuery())
  const [activeTab, setActiveTab] = useState<ReportType>('summary')
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [detailed, setDetailed] = useState<DetailedReport | null>(null)
  const [detailedPage, setDetailedPage] = useState(1)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const summaryCacheRef = useRef<SummaryCache>(new Map())
  const detailedCacheRef = useRef<DetailedCache>(new Map())
  const appliedKey = useMemo(() => reportQueryKey(appliedQuery), [appliedQuery])
  const detailedCacheKey = `${appliedKey}|p=${detailedPage}`
  const isDirty = !queriesEqual(draftQuery, appliedQuery)
  const isLoading =
    (activeTab === 'summary' && summaryLoading) ||
    (activeTab === 'detailed' && detailedLoading)

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

  const applyFilters = useCallback(() => {
    summaryCacheRef.current.clear()
    detailedCacheRef.current.clear()
    setDetailedPage(1)
    setAppliedQuery(cloneReportQuery(draftQuery))
  }, [draftQuery])

  const resetFilters = useCallback(() => {
    const next = defaultReportQuery()
    summaryCacheRef.current.clear()
    detailedCacheRef.current.clear()
    setDetailedPage(1)
    setDraftQuery(next)
    setAppliedQuery(cloneReportQuery(next))
  }, [])

  useEffect(() => {
    if (activeTab !== 'summary') return

    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      const cached = summaryCacheRef.current.get(appliedKey)
      if (cached) {
        setSummary(cached)
        setSummaryLoading(false)
        setError(null)
        return
      }

      setSummaryLoading(true)
      setError(null)

      try {
        const loaded = await getSummaryReport(appliedQuery, { signal: controller.signal })
        if (cancelled) return
        summaryCacheRef.current.set(appliedKey, loaded)
        setSummary(loaded)
        setError(null)
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return
        setSummary(null)
        setError(apiErrorMessage(cause, 'Could not load the summary report. Is the backend running?'))
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeTab, appliedKey, appliedQuery])

  useEffect(() => {
    if (activeTab !== 'detailed') return

    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      const cached = detailedCacheRef.current.get(detailedCacheKey)
      if (cached) {
        setDetailed(cached)
        setDetailedLoading(false)
        setError(null)
        return
      }

      setDetailedLoading(true)
      setError(null)

      try {
        const loaded = await getDetailedReport(appliedQuery, {
          page: detailedPage,
          pageSize: DETAILED_PAGE_SIZE,
          signal: controller.signal,
        })
        if (cancelled) return
        detailedCacheRef.current.set(detailedCacheKey, loaded)
        setDetailed(loaded)
        setError(null)
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return
        setDetailed(null)
        setError(apiErrorMessage(cause, 'Could not load the detailed report. Is the backend running?'))
      } finally {
        if (!cancelled) setDetailedLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeTab, appliedKey, appliedQuery, detailedCacheKey, detailedPage])

  return {
    draftQuery,
    appliedQuery,
    activeTab,
    setActiveTab,
    summary,
    detailed,
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
