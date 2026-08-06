import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { downloadReport, type ReportExportFormat } from '../api/reports'
import { DetailedReportPanel } from '../components/reports/DetailedReportPanel'
import { ExportMenu } from '../components/reports/ExportMenu'
import { ProfitabilityReportPanel } from '../components/reports/ProfitabilityReportPanel'
import { ReportFilterBar } from '../components/reports/ReportFilterBar'
import { SavedFilterSets } from '../components/reports/SavedFilterSets'
import { ShareDialog } from '../components/reports/ShareDialog'
import { SummaryReportPanel } from '../components/reports/SummaryReportPanel'
import { WorkloadReportPanel } from '../components/reports/WorkloadReportPanel'
import { SegmentedTabs } from '../components/directory/DirectoryControls'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { AccessDenied } from '../components/auth/AccessDenied'
import { useAuth } from '../hooks/useAuth'
import { useReportWorkspace } from '../hooks/useReportWorkspace'
import { Permissions } from '../lib/permissions'
import { toggleGroupBy } from '../lib/reportQuery'
import { formatPeriodLabel } from '../lib/reportView'
import { Icon } from '../components/ui/Icon'
import type { ReportType } from '../types/reportQuery'

const REPORT_TABS: ReadonlyArray<{ value: ReportType; label: string }> = [
  { value: 'summary', label: 'Summary' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'workload', label: 'Workload' },
  { value: 'profitability', label: 'Profitability' },
]

/**
 * RT-50 / RT-51 / RT-52 / RT-53 / RT-54 — portfolio reports for Admin + ProjectManager.
 * Page-gated via ReportsView; backend scopes non-Admin users to projects they created.
 */
export default function ReportsPage() {
  const { hasPermission } = useAuth()
  if (!hasPermission(Permissions.ReportsView)) {
    return (
      <AccessDenied description="Portfolio reports are available to project managers and workspace admins." />
    )
  }
  return <ReportsWorkspace />
}

function ReportsWorkspace() {
  const {
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
    detailedPageSize,
    isLoading,
    error,
    isDirty,
    patchDraft,
    replaceDraft,
    applyFilters,
    resetFilters,
  } = useReportWorkspace()

  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)
  const [showShare, setShowShare] = useState(false)

  const periodReport =
    activeTab === 'detailed'
      ? detailed
      : activeTab === 'workload'
        ? workload
        : activeTab === 'profitability'
          ? profitability
          : activeTab === 'summary'
            ? summary
            : null

  const canExport =
    (activeTab === 'summary' && !!summary) ||
    (activeTab === 'detailed' && !!detailed) ||
    (activeTab === 'workload' && !!workload) ||
    (activeTab === 'profitability' && !!profitability)

  async function handleExport(format: ReportExportFormat) {
    setExporting(format)
    setExportError(null)
    try {
      await downloadReport(activeTab, format, appliedQuery)
    } catch (cause) {
      setExportError(apiErrorMessage(cause, 'Could not download the export.'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-navy">Reports</h1>
          {periodReport ? (
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-navy/45">
              {formatPeriodLabel(periodReport)}
            </p>
          ) : null}
        </div>
        {canExport ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShare(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2.5 text-body font-medium text-navy transition hover:bg-navy/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="share" className="h-4 w-4" />
              Share
            </button>
            <ExportMenu exporting={exporting} onExport={handleExport} disabled={isLoading} />
          </div>
        ) : null}
      </div>

      <div className="mb-4">
        <SegmentedTabs options={REPORT_TABS} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ReportFilterBar
          draft={draftQuery}
          isDirty={isDirty}
          onPatch={patchDraft}
          onReset={resetFilters}
        />
        <SavedFilterSets draft={draftQuery} onLoad={replaceDraft} />
        <button
          type="button"
          onClick={applyFilters}
          disabled={!isDirty}
          className="rounded-full bg-brand px-4 py-2 text-body font-medium text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {isDirty ? (
        <div className="mb-4 rounded-lg bg-brand-tint px-4 py-3 text-body text-navy">
          Filters changed — click Apply to refresh this report.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {error}
        </div>
      ) : null}

      {exportError ? (
        <div className="mb-4 rounded-lg bg-red-tint px-4 py-3 text-body text-red" role="alert">
          {exportError}
        </div>
      ) : null}

      {activeTab === 'summary' ? (
        <SummaryReportPanel report={summary} isLoading={isLoading} />
      ) : activeTab === 'detailed' ? (
        <DetailedReportPanel
          report={detailed}
          isLoading={isLoading}
          page={detailedPage}
          pageSize={detailedPageSize}
          onPageChange={setDetailedPage}
          draftGroupBy={draftQuery.groupBy}
          onToggleGroupBy={(value) =>
            patchDraft({ groupBy: toggleGroupBy(draftQuery, value) })
          }
        />
      ) : activeTab === 'workload' ? (
        <WorkloadReportPanel report={workload} isLoading={isLoading} />
      ) : (
        <ProfitabilityReportPanel report={profitability} isLoading={isLoading} />
      )}

      {showShare ? (
        <ShareDialog
          reportType={activeTab}
          query={appliedQuery}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </div>
  )
}
