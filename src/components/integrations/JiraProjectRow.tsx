import { useState } from 'react'
import { integrateJiraProject, syncJiraProject } from '../../api/jira'
import { integrationApiErrorMessage } from '../../api/integrations'
import type { Client } from '../../types/client'
import type { JiraRemoteProject } from '../../types/jira'
import { SearchSelect } from '../ui/SearchSelect'

export function JiraProjectRow({
  project,
  clients,
  onChanged,
  onNotice,
  onIntegrated,
}: {
  project: JiraRemoteProject
  clients: Client[]
  onChanged: () => void
  onNotice: (message: string) => void
  onIntegrated: (projectId: string, message: string) => void
}) {
  const [clientId, setClientId] = useState<string | null>(project.clientId)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canIntegrate = clientId !== null && !isBusy && !project.isIntegrated

  const handleIntegrate = () => {
    if (!clientId || project.isIntegrated) return
    setIsBusy(true)
    setError(null)

    integrateJiraProject({ jiraProjectId: project.id, clientId })
      .then((result) => {
        onIntegrated(result.projectId, result.message)
      })
      .catch((err) => {
        setError(integrationApiErrorMessage(err, 'Could not integrate project. Please try again.'))
        setIsBusy(false)
      })
  }

  const handleSync = () => {
    if (!project.reeTrackProjectId || isBusy) return
    setIsBusy(true)
    setError(null)

    syncJiraProject(project.reeTrackProjectId)
      .then((result) => {
        onNotice(result.message)
        onChanged()
      })
      .catch((err) => {
        setError(integrationApiErrorMessage(err, 'Could not sync project. Please try again.'))
      })
      .finally(() => setIsBusy(false))
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-navy/[0.06] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-display text-body font-semibold text-navy">{project.name}</p>
        <p className="font-mono text-sm text-navy/50">{project.key}</p>
        {project.isIntegrated && project.clientName && (
          <p className="mt-1 text-sm text-navy/55">Client: {project.clientName}</p>
        )}
      </div>

      {!project.isIntegrated && (
        <div className="w-56">
          <SearchSelect
            ariaLabel={`Client for ${project.key}`}
            placeholder="Assign a client…"
            searchPlaceholder="Search clients…"
            value={clientId}
            onChange={setClientId}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            disabled={isBusy}
          />
        </div>
      )}

      {project.isIntegrated ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={handleSync}
          className="rounded-full border-control border-navy bg-transparent px-4 py-2 font-display text-body font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? 'Syncing…' : 'Sync tasks'}
        </button>
      ) : (
        <button
          type="button"
          disabled={!canIntegrate}
          title={!clientId ? 'Assign a client before integrating' : undefined}
          onClick={handleIntegrate}
          className="rounded-full bg-brand px-4 py-2 font-display text-body font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? 'Integrating…' : 'Integrate'}
        </button>
      )}

      {!project.isIntegrated && !clientId && (
        <p className="w-full text-sm text-navy/50">
          Assign a client before integrating this project.
        </p>
      )}
      {error && <p className="w-full text-sm text-red">{error}</p>}
    </div>
  )
}
