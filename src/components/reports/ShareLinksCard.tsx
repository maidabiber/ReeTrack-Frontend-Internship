import { useEffect, useState } from 'react'
import { fetchAllLinks, removeLink, type ShareLink } from '../../api/reportShares'
import { apiErrorMessage } from '../../api/client'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import type { ReportQuery, ReportType } from '../../types/reportQuery'

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  summary: 'Summary',
  detailed: 'Detailed',
  workload: 'Workload',
  profitability: 'Profitability',
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

function formatQuerySummary(query: ReportQuery | null): string {
  if (!query) return 'No filters'

  const parts: string[] = []

  if (query.from || query.to) {
    const from = query.from ? formatDateShort(query.from) : '…'
    const to = query.to ? formatDateShort(query.to) : '…'
    parts.push(`${from} – ${to}`)
  }

  if (query.userIds.length > 0) {
    parts.push(`${query.userIds.length} member${query.userIds.length !== 1 ? 's' : ''}`)
  }

  if (query.projectIds.length > 0) {
    parts.push(`${query.projectIds.length} project${query.projectIds.length !== 1 ? 's' : ''}`)
  }

  if (query.clientIds.length > 0) {
    parts.push(`${query.clientIds.length} client${query.clientIds.length !== 1 ? 's' : ''}`)
  }

  if (query.tagIds.length > 0) {
    parts.push(`${query.tagIds.length} tag${query.tagIds.length !== 1 ? 's' : ''}`)
  }

  if (query.billable === true) parts.push('Billable only')
  if (query.billable === false) parts.push('Non-billable only')

  return parts.length > 0 ? parts.join(' · ') : 'All time'
}

interface ShareLinksCardProps {
  onClose: () => void
}

export function ShareLinksCard({ onClose }: ShareLinksCardProps) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAllLinks()
      .then((data) => {
        if (!cancelled) setLinks(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not load share links.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  const handleRevoke = async (link: ShareLink) => {
    try {
      await removeLink(link.id)
      setLinks((prev) => prev.filter((l) => l.id !== link.id))
      setNotice('Link revoked.')
      window.setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not revoke link.'))
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <Modal title="All share links" onClose={onClose} widthClassName="w-[640px]">
      <div className="space-y-3">
        {error ? (
          <p className="rounded-md bg-red-tint px-3 py-2 text-sm text-red" role="alert">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-md bg-brand-tint px-3 py-2 text-sm text-navy" role="status">
            {notice}
          </p>
        ) : null}

        {loading ? (
          <p className="py-6 text-center text-sm text-navy/50">Loading…</p>
        ) : links.length === 0 ? (
          <div className="py-8 text-center">
            <Icon name="share" className="mx-auto mb-2 h-6 w-6 text-navy/20" />
            <p className="text-sm text-navy/45">No share links yet.</p>
          </div>
        ) : (
          <div className="max-h-[28rem] space-y-3 overflow-y-auto">
            {links.map((link) => (
              <div
                key={link.id}
                className="rounded-xl border border-navy/10 px-4 py-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-navy">
                    {REPORT_TYPE_LABELS[link.reportType]}
                  </span>
                  <span className="text-xs text-navy/50">
                    {link.accessLevel === 'public' ? 'Public' : `Private · ${link.recipientCount} member${link.recipientCount !== 1 ? 's' : ''}`}
                  </span>
                  <span className="ml-auto text-[11px] text-navy/45">{formatDate(link.createdAtUtc)}</span>
                </div>

                <p className="mb-1.5 text-xs text-navy/70">{formatQuerySummary(link.query)}</p>

                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md bg-brand-tint px-2.5 py-1.5 font-mono text-[11px] leading-snug text-navy">
                    {link.url}
                  </code>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void handleCopy(link.url, link.id)}
                      className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-deep"
                    >
                      <Icon name={copiedId === link.id ? 'check' : 'copy'} className="h-3 w-3" />
                      {copiedId === link.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRevoke(link)}
                      className="inline-flex items-center gap-1 rounded-full border border-red/30 px-2.5 py-1.5 text-[11px] font-medium text-red transition hover:bg-red/10"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
