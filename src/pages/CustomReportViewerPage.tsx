import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { runCustomReport } from '../api/customReports'
import { LoadErrorState } from '../components/directory/DirectoryControls'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { AdminsOnly } from '../components/reports/AdminsOnly'
import { BlockRenderer } from '../components/reports/render/BlockRenderer'
import { useAuth } from '../hooks/useAuth'
import { formatPeriodLabel } from '../lib/reportView'
import type { CustomReportResult, CustomReportSpec } from '../types/customReport'

/** Demo spec — KPI totals, client breakdown, weekly area trend (matches BE integration test). */
const DEMO_SPEC: CustomReportSpec = {
  version: 1,
  query: {
    userIds: [],
    projectIds: [],
    clientIds: [],
    taskIds: [],
    tagIds: [],
    billable: null,
    from: null,
    to: null,
    groupBy: [],
  },
  blocks: [
    {
      type: 'kpi',
      id: 'b1',
      metrics: ['totalHours', 'billablePct'],
    },
    {
      type: 'breakdown',
      id: 'b2',
      title: 'By client',
      dimensions: ['client'],
      metrics: ['totalHours', 'labourCost'],
      sortKey: 'totalHours',
      sortDescending: true,
      showTotals: true,
    },
    {
      type: 'chart',
      id: 'b3',
      title: 'Weekly trend',
      dimension: 'week',
      metrics: ['totalHours'],
      kind: 'Area',
    },
  ],
}

/**
 * Runs a fixed demo spec and renders the IR blocks it comes back with — proves the catalogue/run
 * API client and the block renderers end-to-end before the drag-and-drop builder replaces this
 * page (and its route) with the real one.
 */
export default function CustomReportViewerPage() {
  const { role } = useAuth()
  if (role !== 'Admin') return <AdminsOnly />
  return <CustomReportViewer />
}

function CustomReportViewer() {
  const { id } = useParams()
  const [report, setReport] = useState<CustomReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (id) return

    let cancelled = false

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      setIsLoading(true)
      setError(null)
      try {
        const result = await runCustomReport(DEMO_SPEC)
        if (!cancelled) setReport(result)
      } catch (cause) {
        if (!cancelled) {
          setReport(null)
          setError(apiErrorMessage(cause, 'Could not run the custom report.'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, retryCount])

  // Saved definitions are not wired yet (FE3). Keep the :id route so deep
  // links don't 404, but do not pretend this id was loaded.
  if (id) {
    return (
      <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
        <div className="mb-6">
          <h1 className="font-display text-xl font-bold text-navy">Custom reports</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
            Saved definition
          </p>
        </div>
        <div className="rounded-2xl bg-white px-6 py-8 shadow-card">
          <h2 className="font-display text-base font-bold text-navy">Not available yet</h2>
          <p className="mt-2 max-w-md text-body leading-[1.5] text-navy/60">
            Loading saved report definitions by id is coming in a later slice. This preview only
            runs the demo spec.
          </p>
          <Link
            to="/reports/custom"
            className="mt-5 inline-flex text-body font-medium text-brand hover:text-brand-hi"
          >
            Open demo preview
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-navy">Custom reports</h1>
        {report ? (
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
            {formatPeriodLabel(report)}
          </p>
        ) : (
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
            Demo preview
          </p>
        )}
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="rounded-2xl bg-white shadow-card">
          <LoadErrorState message={error} onRetry={() => setRetryCount((count) => count + 1)} />
        </div>
      ) : report ? (
        <div className="space-y-4">
          {report.warnings.length > 0 ? (
            <div className="rounded-lg bg-brand-tint px-4 py-3 text-body text-navy">
              {report.warnings.join(' ')}
            </div>
          ) : null}

          {report.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}

          <p className="text-xs text-navy/40">
            Generated {new Date(report.generatedAtUtc).toLocaleString()}
            {report.generatedByName ? ` · by ${report.generatedByName}` : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="motion-safe:animate-pulse rounded-2xl bg-white px-5 py-4 shadow-card"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="h-3 w-20 rounded bg-surface-muted" />
            <div className="mt-3 h-7 w-28 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
      <div className="motion-safe:animate-pulse rounded-2xl bg-white px-5 py-8 shadow-card">
        <div className="h-4 w-32 rounded bg-surface-muted" />
        <div className="mt-4 h-40 rounded bg-surface-muted/70" />
      </div>
      <div className="motion-safe:animate-pulse rounded-2xl bg-white px-5 py-8 shadow-card">
        <div className="h-4 w-28 rounded bg-surface-muted" />
        <div className="mt-4 h-48 rounded bg-surface-muted/70" />
      </div>
    </div>
  )
}
