import { apiClient } from './client'
import type { ReportQuery, ReportType } from '../types/reportQuery'

type AccessLevel = 'public' | 'private'

interface ShareLinkResponse {
  id: string
  token: string
  url: string
  reportType: number | string
  accessLevel: number | string
  isActive: boolean
  createdAtUtc: string
  recipientCount: number
  queryJson: string | null
}

export interface ShareLink {
  id: string
  token: string
  url: string
  reportType: ReportType
  accessLevel: AccessLevel
  isActive: boolean
  createdAtUtc: string
  recipientCount: number
  query: ReportQuery | null
}

interface CreateShareLinkRequest {
  reportType: number
  queryJson?: string
  specJson?: string
  accessLevel: number
  recipientUserIds?: string[]
}

const REPORT_TYPE_MAP: Record<ReportType, number> = {
  summary: 0,
  detailed: 1,
  workload: 2,
  profitability: 3,
  custom: 4,
}

const REPORT_TYPE_FROM_API: Record<string, ReportType> = {
  summary: 'summary',
  detailed: 'detailed',
  workload: 'workload',
  profitability: 'profitability',
  custom: 'custom',
  Summary: 'summary',
  Detailed: 'detailed',
  Workload: 'workload',
  Profitability: 'profitability',
  Custom: 'custom',
}

const ACCESS_LEVEL_MAP: Record<AccessLevel, number> = {
  public: 0,
  private: 1,
}

/** Backend serializes enums as strings; accept numeric values too. */
export function parseReportShareType(value: unknown): ReportType {
  if (typeof value === 'number') {
    const match = (Object.entries(REPORT_TYPE_MAP) as [ReportType, number][]).find(
      ([, v]) => v === value,
    )
    if (match) return match[0]
  }

  if (typeof value === 'string') {
    const direct = REPORT_TYPE_FROM_API[value]
    if (direct) return direct
    const normalized = REPORT_TYPE_FROM_API[value.toLowerCase()]
    if (normalized) return normalized
  }

  return 'summary'
}

export function parseShareAccessLevel(value: unknown): AccessLevel {
  if (value === 1 || value === 'Private' || value === 'private') return 'private'
  return 'public'
}

function toShareLink(response: ShareLinkResponse): ShareLink {
  const reportType = parseReportShareType(response.reportType)
  const accessLevel = parseShareAccessLevel(response.accessLevel)

  let query: ReportQuery | null = null
  if (response.queryJson) {
    try {
      query = JSON.parse(response.queryJson) as ReportQuery
    } catch {
      // ignore
    }
  }

  return {
    id: response.id,
    token: response.token,
    url: response.url,
    reportType,
    accessLevel,
    isActive: response.isActive,
    createdAtUtc: response.createdAtUtc,
    recipientCount: response.recipientCount,
    query,
  }
}

export async function generateLink(
  reportType: ReportType,
  query: ReportQuery | null,
  accessLevel: AccessLevel,
  recipientUserIds?: string[],
  specJson?: string,
): Promise<ShareLink> {
  const body: CreateShareLinkRequest = {
    reportType: REPORT_TYPE_MAP[reportType],
    queryJson: query ? JSON.stringify(query) : undefined,
    specJson: specJson ?? undefined,
    accessLevel: ACCESS_LEVEL_MAP[accessLevel],
    ...(recipientUserIds && recipientUserIds.length > 0
      ? { recipientUserIds }
      : {}),
  }
  const response = await apiClient.post<ShareLinkResponse>('/report-shares', body)
  return toShareLink(response)
}

export async function fetchLinks(reportType: ReportType): Promise<ShareLink[]> {
  const response = await apiClient.get<ShareLinkResponse[]>(
    `/report-shares/${REPORT_TYPE_MAP[reportType]}`,
  )
  return response.map(toShareLink)
}

export async function removeLink(id: string): Promise<void> {
  await apiClient.delete(`/report-shares/${id}`)
}

export async function fetchAllLinks(): Promise<ShareLink[]> {
  const types = [0, 1, 2, 3] as const
  const results = await Promise.all(
    types.map((t) =>
      apiClient
        .get<ShareLinkResponse[]>(`/report-shares/${t}`)
        .catch(() => [] as ShareLinkResponse[]),
    ),
  )
  return results.flat().map(toShareLink)
}
