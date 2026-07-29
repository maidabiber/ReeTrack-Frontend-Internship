import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { getSummaryReport } from '../api/reports'
import {
  cloneReportQuery,
  defaultReportQuery,
  queriesEqual,
  reportQueryKey,
} from '../lib/reportQuery'
import type { SummaryReport } from '../types/report'
import type { ReportQuery, ReportType } from '../types/reportQuery'

type SummaryCache = Map<string, SummaryReport>

export function useReportWorkspace() {
  const [draftQuery, setDraftQuery] = useState<ReportQuery>(() => defaultReportQuery())
  const [appliedQuery, setAppliedQuery] = useState<ReportQuery>(() => defaultReportQuery())
  const [activeTab, setActiveTab] = useState<ReportType>('summary')
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cacheRef = useRef<SummaryCache>(new Map())
  const appliedKey = useMemo(() => reportQueryKey(appliedQuery), [appliedQuery])
  const isDirty = !queriesEqual(draftQuery, appliedQuery)
  const isLoading = activeTab === 'summary' && summaryLoading

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
    cacheRef.current.clear()
    setAppliedQuery(cloneReportQuery(draftQuery))
  }, [draftQuery])

  const resetFilters = useCallback(() => {
    const next = defaultReportQuery()
    cacheRef.current.clear()
    setDraftQuery(next)
    setAppliedQuery(cloneReportQuery(next))
  }, [])

  useEffect(() => {
    if (activeTab !== 'summary') return

    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      // Yield so setState is not synchronous with the effect body (eslint).
      await Promise.resolve()
      if (cancelled) return

      const cached = cacheRef.current.get(appliedKey)
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
        cacheRef.current.set(appliedKey, loaded)
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

  return {
    draftQuery,
    appliedQuery,
    activeTab,
    setActiveTab,
    summary,
    isLoading,
    error,
    isDirty,
    patchDraft,
    replaceDraft,
    applyFilters,
    resetFilters,
  }
}
