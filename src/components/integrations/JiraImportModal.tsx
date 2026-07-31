import { useEffect, useState } from 'react'
import { listClients } from '../../api/clients'
import { getJiraConnection, listJiraProjects } from '../../api/jira'
import { apiErrorMessage } from '../../api/client'
import { fetchAllPages } from '../../api/pagination'
import type { Client } from '../../types/client'
import type { JiraRemoteProject } from '../../types/jira'
import { Modal } from '../ui/Modal'
import { JiraProjectRow } from './JiraProjectRow'


export function JiraImportModal({
  onClose,
  onImported,
  onIntegrated,
}: {
  onClose: () => void
  onImported: (message: string) => void
  onIntegrated: (projectId: string, message: string) => void
}) {
  const [projects, setProjects] = useState<JiraRemoteProject[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [notConfigured, setNotConfigured] = useState(false)

  const reload = () => {
    setIsLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    let cancelled = false

    getJiraConnection()
      .then(async (connection) => {
        if (cancelled) return

        if (!connection.isConfigured) {
          setNotConfigured(true)
          setProjects([])
          setClients([])
          setLoadError(null)
          setIsLoading(false)
          return
        }

        setNotConfigured(false)
        const [projectList, clientList] = await Promise.all([
          listJiraProjects(),
          fetchAllPages((page, pageSize) => listClients('active', { page, pageSize })),
        ])
        if (cancelled) return
        setProjects(projectList)
        setClients(clientList)
        setLoadError(null)
        setIsLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(
          apiErrorMessage(error, 'Could not load Jira projects. Is the backend running?'),
        )
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return (
    <Modal
      title="Import from Jira"
      subtitle="Assign a client, then integrate. Issues become trackable tasks."
      widthClassName="w-[560px] max-w-[calc(100vw-2rem)]"
      onClose={onClose}
    >
      <div className="-mx-modal max-h-[60vh] overflow-y-auto overscroll-contain border-t border-navy/[0.06]">
        <div className="px-modal">
          {isLoading && (
            <div className="flex justify-center py-8">
              <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-navy/20 border-t-navy" />
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex flex-col gap-3 py-4">
              <p className="text-sm text-red">{loadError}</p>
              <button
                type="button"
                onClick={reload}
                className="self-start rounded-full border-control border-navy px-3.5 py-1.5 font-display text-sm font-semibold text-navy"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !loadError && notConfigured && (
            <p className="py-4 text-sm leading-[1.5] text-navy/60">
              Jira is not configured. Set <span className="font-mono">Jira__SiteUrl</span>,{' '}
              <span className="font-mono">Jira__Email</span>, and{' '}
              <span className="font-mono">Jira__ApiToken</span> in the API{' '}
              <span className="font-mono">.env</span>, then restart the backend.
            </p>
          )}

          {!isLoading && !loadError && !notConfigured && projects.length === 0 && (
            <p className="py-4 text-sm text-navy/50">No Jira projects found for this account.</p>
          )}

          {!isLoading && !loadError && !notConfigured && projects.length > 0 && (
            <div>
              {projects.map((project) => (
                <JiraProjectRow
                  key={project.id}
                  project={project}
                  clients={clients}
                  onChanged={reload}
                  onNotice={(message) => {
                    onImported(message)
                    reload()
                  }}
                  onIntegrated={onIntegrated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
