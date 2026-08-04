import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { getCustomReportCatalogue } from '../api/customReports'
import type { CustomReportCatalogue } from '../types/customReport'

let cachedCatalogue: CustomReportCatalogue | null = null
let cataloguePromise: Promise<CustomReportCatalogue> | null = null

function loadCatalogue(): Promise<CustomReportCatalogue> {
  if (cachedCatalogue) return Promise.resolve(cachedCatalogue)
  if (!cataloguePromise) {
    cataloguePromise = getCustomReportCatalogue()
      .then((catalogue) => {
        cachedCatalogue = catalogue
        return catalogue
      })
      .finally(() => {
        cataloguePromise = null
      })
  }
  return cataloguePromise
}

/** Fetches the custom report catalogue once per session (module-level cache). */
export function useReportCatalogue() {
  const [catalogue, setCatalogue] = useState<CustomReportCatalogue | null>(cachedCatalogue)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!cachedCatalogue)

  useEffect(() => {
    if (cachedCatalogue) return

    let cancelled = false

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await loadCatalogue()
        if (!cancelled) setCatalogue(result)
      } catch (cause) {
        if (!cancelled) {
          setError(apiErrorMessage(cause, 'Could not load the report catalogue.'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { catalogue, error, isLoading }
}
