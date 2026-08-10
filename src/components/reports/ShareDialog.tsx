import { useEffect, useState } from 'react'
import { generateLink, type ShareLink } from '../../api/reportShares'
import { listTeammates } from '../../api/teammates'
import { apiErrorMessage } from '../../api/client'
import { filterTeammates, teammateLabel, type Teammate } from '../../lib/mention'
import type { ReportQuery, ReportType } from '../../types/reportQuery'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { UserAvatar } from '../ui/UserAvatar'
import { ShareLinksCard } from './ShareLinksCard'

type AccessLevel = 'public' | 'private'

interface ShareDialogProps {
  reportType: ReportType
  query: ReportQuery | null
  specJson?: string
  onClose: () => void
}

export function ShareDialog({ reportType, query, specJson, onClose }: ShareDialogProps) {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public')
  const [selectedRecipients, setSelectedRecipients] = useState<Teammate[]>([])
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [recipientQuery, setRecipientQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newLink, setNewLink] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLinks, setShowLinks] = useState(false)

  useEffect(() => {
    if (accessLevel === 'private') {
      listTeammates()
        .then(setTeammates)
        .catch(() => setTeammates([]))
    }
  }, [accessLevel])

  const selectedIds = new Set(selectedRecipients.map((t) => t.id))
  const recipientSuggestions = filterTeammates(teammates, recipientQuery)
    .filter((t) => !selectedIds.has(t.id))
    .slice(0, 6)

  const toggleRecipient = (teammate: Teammate) => {
    setSelectedRecipients((current) =>
      current.some((t) => t.id === teammate.id)
        ? current.filter((t) => t.id !== teammate.id)
        : [...current, teammate],
    )
  }

  const handleCreate = async () => {
    if (accessLevel === 'private' && selectedRecipients.length === 0) {
      setError('Select at least one team member.')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const link = await generateLink(
        reportType,
        query,
        accessLevel,
        selectedRecipients.map((t) => t.id),
        specJson,
      )
      setNewLink(link)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not generate link.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  return (
    <Modal title="Share report" onClose={onClose} widthClassName="w-[440px]">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-navy">Access level</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAccessLevel('public')}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                accessLevel === 'public'
                  ? 'border-brand bg-brand-tint text-navy'
                  : 'border-navy/10 text-navy/60 hover:border-navy/20'
              }`}
            >
              <span className="font-semibold">Public</span>
              <span className="mt-0.5 block text-xs text-navy/50">
                Anyone with the link
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAccessLevel('private')}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                accessLevel === 'private'
                  ? 'border-brand bg-brand-tint text-navy'
                  : 'border-navy/10 text-navy/60 hover:border-navy/20'
              }`}
            >
              <span className="font-semibold">Private</span>
              <span className="mt-0.5 block text-xs text-navy/50">
                Only specific team members
              </span>
            </button>
          </div>
        </div>

        {accessLevel === 'private' ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-navy">Team members</label>
            {selectedRecipients.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedRecipients.map((teammate) => (
                  <button
                    key={teammate.id}
                    type="button"
                    onClick={() => toggleRecipient(teammate)}
                    className="inline-flex items-center gap-2 rounded-full bg-surface-muted py-1 pl-1 pr-2.5 text-left"
                  >
                    <UserAvatar name={teammateLabel(teammate)} size={24} className="block" />
                    <span className="text-sm font-semibold text-navy">
                      {teammateLabel(teammate)}
                    </span>
                    <span className="text-md leading-none text-navy/40">&times;</span>
                  </button>
                ))}
              </div>
            ) : null}
            <input
              type="text"
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              placeholder="Search teammates"
              className="w-full rounded-md border border-navy/10 px-3 py-2.5 text-body text-navy outline-none focus:border-brand/40"
            />
            {recipientSuggestions.length > 0 ? (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-navy/10 py-1">
                {recipientSuggestions.map((teammate) => (
                  <li key={teammate.id}>
                    <button
                      type="button"
                      onClick={() => toggleRecipient(teammate)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-muted"
                    >
                      <UserAvatar
                        name={teammateLabel(teammate)}
                        size={24}
                        className="block shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-md font-medium text-navy">
                          {teammateLabel(teammate)}
                        </span>
                        <span className="block truncate text-xs text-navy/45">
                          {teammate.email}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-navy/45">
                {teammates.length === 0 ? 'No teammates found.' : 'No matching teammates.'}
              </p>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-red-tint px-3 py-2 text-sm text-red" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating || (accessLevel === 'private' && selectedRecipients.length === 0)}
          className="w-full rounded-full bg-brand px-4 py-2.5 text-body font-medium text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? 'Generating…' : 'Generate link'}
        </button>

        {newLink ? (
          <div className="rounded-xl border border-brand/20 bg-brand-tint/30 p-3">
            <p className="mb-1.5 text-xs font-medium text-navy/60">Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newLink.url}
                className="min-w-0 flex-1 rounded-md border border-navy/10 bg-white px-2.5 py-1.5 font-mono text-xs text-navy"
              />
              <button
                type="button"
                onClick={() => void handleCopy(newLink.url)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-deep"
              >
                <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowLinks(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-navy/45 transition hover:text-navy"
          >
            <Icon name="share" className="h-3.5 w-3.5" />
            Manage all links
          </button>
        </div>
      </div>

      {showLinks ? <ShareLinksCard onClose={() => setShowLinks(false)} /> : null}
    </Modal>
  )
}
