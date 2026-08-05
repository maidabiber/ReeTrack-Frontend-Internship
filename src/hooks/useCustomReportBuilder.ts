import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { runCustomReport } from '../api/customReports'
import {
  addBlock,
  cloneBlock,
  cloneSpec,
  duplicateBlock,
  emptyCustomReportSpec,
  moveBlock,
  removeBlock,
  replaceBlock,
  specHash,
  type BlockTypeId,
} from '../lib/customReportSpec'
import { cloneReportQuery } from '../lib/reportQuery'
import type {
  ComparisonMode,
  CustomReportResult,
  CustomReportSpec,
  ReportBlockSpec,
} from '../types/customReport'
import type { ReportQuery } from '../types/reportQuery'

/**
 * Draft-vs-applied workspace for the custom report builder.
 * Cache key is `specHash(applied)` because `/run` is a POST with no URL query.
 */
const MAX_CACHED_RUNS = 12

export function useCustomReportBuilder(resetKey?: string | null, initialSpec?: CustomReportSpec | null) {
  const [draftSpec, setDraftSpec] = useState<CustomReportSpec>(() =>
    initialSpec ? cloneSpec(initialSpec) : emptyCustomReportSpec(),
  )
  const [appliedSpec, setAppliedSpec] = useState<CustomReportSpec>(() =>
    initialSpec ? cloneSpec(initialSpec) : emptyCustomReportSpec(),
  )
  const [report, setReport] = useState<CustomReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)

  const cacheRef = useRef<Map<string, CustomReportResult>>(new Map())
  const lastResetKey = useRef<string | null | undefined>(undefined)
  const lastRunNonce = useRef(0)
  // Bumping this re-runs the applied spec even though its hash is unchanged.
  const [runNonce, setRunNonce] = useState(0)

  useEffect(() => {
    if (lastResetKey.current === resetKey) return
    lastResetKey.current = resetKey
    const next = initialSpec ? cloneSpec(initialSpec) : emptyCustomReportSpec()
    setDraftSpec(next)
    setAppliedSpec(cloneSpec(next))
    setReport(null)
    setError(null)
    setHasApplied(false)
    cacheRef.current.clear()
  }, [resetKey, initialSpec])

  // Hashing walks and stringifies the whole spec, so both sides are memoised — the dirty
  // check used to do it twice per render, including on every keystroke in a block title.
  const appliedKey = useMemo(() => specHash(appliedSpec), [appliedSpec])
  const draftKey = useMemo(() => specHash(draftSpec), [draftSpec])
  const isDirty = draftKey !== appliedKey

  useEffect(() => {
    if (!hasApplied) return

    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      const cached = runNonce === lastRunNonce.current ? cacheRef.current.get(appliedKey) : undefined
      lastRunNonce.current = runNonce
      if (cached) {
        setReport(cached)
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const loaded = await runCustomReport(appliedSpec, { signal: controller.signal })
        if (cancelled) return
        rememberResult(cacheRef.current, appliedKey, loaded)
        setReport(loaded)
        setError(null)
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return
        setReport(null)
        setError(apiErrorMessage(cause, 'Could not run the custom report. Is the backend running?'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [appliedKey, appliedSpec, hasApplied, runNonce])

  const patchQuery = useCallback((patch: Partial<ReportQuery>) => {
    setDraftSpec((previous) => {
      const next = cloneSpec(previous)
      const query = cloneReportQuery(next.query)
      if (patch.userIds !== undefined) query.userIds = [...patch.userIds]
      if (patch.projectIds !== undefined) query.projectIds = [...patch.projectIds]
      if (patch.clientIds !== undefined) query.clientIds = [...patch.clientIds]
      if (patch.taskIds !== undefined) query.taskIds = [...patch.taskIds]
      if (patch.tagIds !== undefined) query.tagIds = [...patch.tagIds]
      if (patch.groupBy !== undefined) query.groupBy = [...patch.groupBy]
      if (patch.billable !== undefined) query.billable = patch.billable
      if (patch.from !== undefined) query.from = patch.from
      if (patch.to !== undefined) query.to = patch.to
      next.query = query
      return next
    })
  }, [])

  const setComparison = useCallback((comparison: ComparisonMode) => {
    setDraftSpec((previous) =>
      previous.comparison === comparison ? previous : { ...cloneSpec(previous), comparison },
    )
  }, [])

  const setBlocks = useCallback((blocks: ReportBlockSpec[]) => {
    setDraftSpec((previous) => {
      const next = cloneSpec(previous)
      next.blocks = blocks.map(cloneBlock)
      return next
    })
  }, [])

  const addBlockType = useCallback((type: BlockTypeId, atIndex?: number) => {
    setDraftSpec((previous) => addBlock(previous, type, atIndex))
  }, [])

  const removeBlockById = useCallback((blockId: string) => {
    setDraftSpec((previous) => removeBlock(previous, blockId))
  }, [])

  const duplicateBlockById = useCallback((blockId: string) => {
    setDraftSpec((previous) => duplicateBlock(previous, blockId))
  }, [])

  const moveBlockByIndex = useCallback((fromIndex: number, toIndex: number) => {
    setDraftSpec((previous) => moveBlock(previous, fromIndex, toIndex))
  }, [])

  const updateBlockById = useCallback((block: ReportBlockSpec) => {
    setDraftSpec((previous) => replaceBlock(previous, cloneBlock(block)))
  }, [])

  const replaceDraft = useCallback((spec: CustomReportSpec) => {
    setDraftSpec(cloneSpec(spec))
  }, [])

  const applySpec = useCallback(() => {
    setAppliedSpec(cloneSpec(draftSpec))
    setHasApplied(true)
  }, [draftSpec])

  /**
   * Re-runs the applied spec against current data. Without this a report cached under its
   * spec hash can never be refreshed — the numbers age silently while the spec is untouched.
   */
  const refresh = useCallback(() => {
    cacheRef.current.delete(specHash(appliedSpec))
    setRunNonce((nonce) => nonce + 1)
    setHasApplied(true)
  }, [appliedSpec])

  const runSaved = useCallback((spec: CustomReportSpec) => {
    const next = cloneSpec(spec)
    setDraftSpec(next)
    setAppliedSpec(cloneSpec(next))
    setHasApplied(true)
  }, [])

  const resetQuery = useCallback(() => {
    setDraftSpec((previous) => {
      const next = cloneSpec(previous)
      next.query = cloneReportQuery(emptyCustomReportSpec().query)
      return next
    })
  }, [])

  return {
    draftSpec,
    appliedSpec,
    report,
    isLoading,
    error,
    isDirty,
    hasApplied,
    patchQuery,
    setComparison,
    setBlocks,
    addBlockType,
    removeBlockById,
    duplicateBlockById,
    moveBlockByIndex,
    updateBlockById,
    replaceDraft,
    applySpec,
    refresh,
    runSaved,
    resetQuery,
  }
}

/** Keeps the newest results only — a builder session produces a spec hash per edit. */
function rememberResult(
  cache: Map<string, CustomReportResult>,
  key: string,
  value: CustomReportResult,
) {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > MAX_CACHED_RUNS) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}
