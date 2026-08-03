import { useCallback, useMemo, useState } from 'react'
import {
  cloneReportQuery,
  defaultReportQuery,
  queriesEqual,
} from '../lib/reportQuery'
import type { ReportQuery } from '../types/reportQuery'

/**
 * Shared draft/applied ReportQuery state used by Reports and Invoices so filter
 * bars stay identical without copying patch/reset logic.
 */
export function useReportFilterDraft(options?: {
  /** When set, draft/applied always keep this billable value (invoices = true). */
  billable?: boolean
}) {
  const forcedBillable = options?.billable

  const createDefault = useCallback((): ReportQuery => {
    const next = defaultReportQuery()
    if (forcedBillable !== undefined) next.billable = forcedBillable
    return next
  }, [forcedBillable])

  const [draftQuery, setDraftQuery] = useState<ReportQuery>(() => {
    const next = defaultReportQuery()
    if (options?.billable !== undefined) next.billable = options.billable
    return next
  })
  const [appliedQuery, setAppliedQuery] = useState<ReportQuery>(() => {
    const next = defaultReportQuery()
    if (options?.billable !== undefined) next.billable = options.billable
    return next
  })

  const isDirty = useMemo(
    () => !queriesEqual(draftQuery, appliedQuery),
    [draftQuery, appliedQuery],
  )

  const patchDraft = useCallback(
    (patch: Partial<ReportQuery>) => {
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
        if (forcedBillable !== undefined) next.billable = forcedBillable
        return next
      })
    },
    [forcedBillable],
  )

  const replaceDraft = useCallback(
    (query: ReportQuery) => {
      const next = cloneReportQuery(query)
      if (forcedBillable !== undefined) next.billable = forcedBillable
      setDraftQuery(next)
    },
    [forcedBillable],
  )

  const applyFilters = useCallback(() => {
    const next = cloneReportQuery(draftQuery)
    if (forcedBillable !== undefined) next.billable = forcedBillable
    setAppliedQuery(next)
  }, [draftQuery, forcedBillable])

  const resetFilters = useCallback(
    (resetOptions?: { keepClientIds?: string[] }) => {
      const next = createDefault()
      if (resetOptions?.keepClientIds?.length) {
        next.clientIds = [...resetOptions.keepClientIds]
      }
      setDraftQuery(next)
      setAppliedQuery(cloneReportQuery(next))
    },
    [createDefault],
  )

  return {
    draftQuery,
    appliedQuery,
    isDirty,
    patchDraft,
    replaceDraft,
    applyFilters,
    resetFilters,
  }
}
