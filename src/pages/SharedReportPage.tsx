import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, apiClient, apiErrorMessage } from '../api/client'
import { parseReportShareType, parseShareAccessLevel } from '../api/reportShares'
import { AccessDenied } from '../components/auth/AccessDenied'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { LoadErrorState } from '../components/directory/DirectoryControls'
import { SummaryReportPanel } from '../components/reports/SummaryReportPanel'
import { DetailedReportPanel } from '../components/reports/DetailedReportPanel'
import { WorkloadReportPanel } from '../components/reports/WorkloadReportPanel'
import { ProfitabilityReportPanel } from '../components/reports/ProfitabilityReportPanel'
import { CustomReportPanel, type CustomReportPanelProps } from '../components/reports/CustomReportPanel'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { useAuth } from '../hooks/useAuth'
import type {
  SummaryReport,
  DetailedReport,
  WorkloadReport,
  ProfitabilityReport,
} from '../types/report'

interface SharedReportResponse {
  reportType: number | string
  accessLevel: number | string
  summary: SummaryReport | null
  detailed: DetailedReport | null
  workload: WorkloadReport | null
  profitability: ProfitabilityReport | null
  custom: CustomReportPanelProps | null
}

function isRevokedShareMessage(message: string): boolean {
  return message.toLowerCase().includes('revoked')
}

function isPrivateShareAccessMessage(message: string): boolean {
  return message.toLowerCase().includes('do not have access')
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState<SharedReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.get<SharedReportResponse>(`/shared/${token}`)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setData(null)
          setError({
            message: apiErrorMessage(err, 'Could not load this shared report.'),
            status: err instanceof ApiError ? err.status : null,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [token, retryCount])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-body text-navy/50">Loading report…</p>
      </div>
    )
  }

  if (error) {
    const returnUrl = token ? `/shared/${token}` : '/'

    if (error.status === 401) {
      return (
        <div className="min-h-screen bg-canvas">
          <AccessDenied
            title="Sign in required"
            description="This report was shared with workspace members. Please sign in to view it."
          >
            <GoogleSignInButton
              returnUrl={returnUrl}
              className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full border-2 border-navy bg-white px-5 py-2.5 font-display text-sm font-semibold text-navy hover:bg-surface-muted"
            >
              <GoogleIcon className="h-4 w-4 flex-shrink-0" />
              <span>Continue with Google</span>
            </GoogleSignInButton>
          </AccessDenied>
        </div>
      )
    }

    if (error.status === 403 && isRevokedShareMessage(error.message)) {
      return (
        <div className="min-h-screen bg-canvas">
          <AccessDenied
            title="Link unavailable"
            description="This share link has been revoked. Ask the person who shared the report for a new link."
          />
        </div>
      )
    }

    if (error.status === 403 && isPrivateShareAccessMessage(error.message)) {
      return (
        <div className="min-h-screen bg-canvas">
          <AccessDenied
            title="You don't have access"
            description={
              isAuthenticated
                ? 'This report was shared privately with specific workspace members. Your account does not have access.'
                : 'Sign in with the Google account that was invited to view this report.'
            }
          >
            {!isAuthenticated && returnUrl ? (
              <GoogleSignInButton
                returnUrl={returnUrl}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full border-2 border-navy bg-white px-5 py-2.5 font-display text-sm font-semibold text-navy hover:bg-surface-muted"
              >
                <GoogleIcon className="h-4 w-4 flex-shrink-0" />
                <span>Continue with Google</span>
              </GoogleSignInButton>
            ) : null}
          </AccessDenied>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-card">
          <LoadErrorState
            message={error.message}
            onRetry={() => setRetryCount((count) => count + 1)}
          />
        </div>
      </div>
    )
  }

  if (!data) return null

  const reportType = parseReportShareType(data.reportType)
  const accessLevel = parseShareAccessLevel(data.accessLevel)

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-page px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-xl font-bold text-navy">Shared Report</h1>
          <p className="mt-1 text-sm text-navy/50">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} report
            {accessLevel === 'private' ? ' · Private' : ''}
          </p>
        </div>

        {reportType === 'summary' && data.summary ? (
          <SummaryReportPanel report={data.summary} isLoading={false} />
        ) : reportType === 'detailed' && data.detailed ? (
          <DetailedReportPanel report={data.detailed} isLoading={false} readOnly />
        ) : reportType === 'workload' && data.workload ? (
          <WorkloadReportPanel report={data.workload} isLoading={false} />
        ) : reportType === 'profitability' && data.profitability ? (
          <ProfitabilityReportPanel report={data.profitability} isLoading={false} />
        ) : reportType === 'custom' && data.custom ? (
          <CustomReportPanel {...data.custom} />
        ) : (
          <p className="text-body text-navy/50">Report data is not available.</p>
        )}
      </div>
    </div>
  )
}
