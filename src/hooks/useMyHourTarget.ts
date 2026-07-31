import { useEffect, useState } from 'react'
import { getMyHourTarget } from '../api/hourTargets'
import type { EffectiveHourTarget } from '../types/hourTarget'

export function useMyHourTarget(): {
  target: EffectiveHourTarget | null
  isLoading: boolean
} {
  const [target, setTarget] = useState<EffectiveHourTarget | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getMyHourTarget()
      .then((loaded) => {
        if (!cancelled) setTarget(loaded)
      })
      .catch(() => {
        if (!cancelled) setTarget(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { target, isLoading }
}
