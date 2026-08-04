import { useEffect, useMemo, useState } from 'react'
import { listTeammates } from '../../api/teammates'
import { shareExistingTimeEntry } from '../../api/timeEntries'
import { apiErrorMessage } from '../../api/client'
import { filterTeammates, teammateLabel, type Teammate } from '../../lib/mention'
import type { TimeEntry } from '../../types/timeEntry'
import { Modal } from '../ui/Modal'
import { UserAvatar } from '../ui/UserAvatar'

interface AddShareMembersModalProps {
  entry: TimeEntry
  currentUserId: string
  onClose: () => void
  onShared: () => void
}

function collectExcludedUserIds(
  entry: TimeEntry,
  currentUserId: string,
): Set<string> {
  const excluded = new Set<string>([currentUserId])

  for (const participant of entry.participants) {
    if (participant.role === 'Assignee') {
      excluded.add(participant.userId)
    }
  }

  return excluded
}

export function AddShareMembersModal({
  entry,
  currentUserId,
  onClose,
  onShared,
}: AddShareMembersModalProps) {
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Teammate[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const excludedIds = useMemo(
    () => collectExcludedUserIds(entry, currentUserId),
    [entry, currentUserId],
  )

  useEffect(() => {
    listTeammates()
      .then(setTeammates)
      .catch(() => setTeammates([]))
  }, [])

  const selectedIds = new Set(selected.map((teammate) => teammate.id))
  const suggestions = filterTeammates(teammates, query)
    .filter((teammate) => !excludedIds.has(teammate.id) && !selectedIds.has(teammate.id))
    .slice(0, 6)

  const toggleTeammate = (teammate: Teammate) => {
    setSelected((current) =>
      current.some((item) => item.id === teammate.id)
        ? current.filter((item) => item.id !== teammate.id)
        : [...current, teammate],
    )
    setError(null)
  }

  const handleShare = async () => {
    if (selected.length === 0) {
      setError('Select at least one teammate.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await shareExistingTimeEntry(entry.id, {
        assigneeUserIds: selected.map((teammate) => teammate.id),
      })
      onShared()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not share this entry.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title="Share with teammates"
      subtitle="They will receive an invitation to approve this time entry."
      onClose={onClose}
    >
      <div className="space-y-4">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((teammate) => (
              <button
                key={teammate.id}
                type="button"
                onClick={() => toggleTeammate(teammate)}
                className="inline-flex items-center gap-2 rounded-full bg-surface-muted py-1 pl-1 pr-2.5 text-left"
              >
                <UserAvatar name={teammateLabel(teammate)} size={24} className="block" />
                <span className="text-sm font-semibold text-navy">{teammateLabel(teammate)}</span>
                <span className="text-md leading-none text-navy/40">&times;</span>
              </button>
            ))}
          </div>
        ) : null}

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search teammates"
          className="w-full rounded-md border border-navy/10 px-3 py-2.5 text-body text-navy outline-none focus:border-brand/40"
        />

        {suggestions.length > 0 ? (
          <ul className="max-h-44 overflow-y-auto rounded-md border border-navy/10 py-1">
            {suggestions.map((teammate) => (
              <li key={teammate.id}>
                <button
                  type="button"
                  onClick={() => toggleTeammate(teammate)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-muted"
                >
                  <UserAvatar name={teammateLabel(teammate)} size={24} className="block shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-md font-medium text-navy">{teammateLabel(teammate)}</span>
                    <span className="block truncate text-xs text-navy/45">{teammate.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-navy/50">
            {teammates.length === 0 ? 'No teammates available.' : 'No matching teammates.'}
          </p>
        )}

        {error ? (
          <p className="text-sm text-red" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy/60 hover:text-navy disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={isSaving || selected.length === 0}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
