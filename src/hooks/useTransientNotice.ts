import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 4000

/**
 * A banner message that clears itself. The timer is cancelled on unmount so a page left
 * during the window does not set state after it is gone.
 */
export function useTransientNotice(
  durationMs = DEFAULT_DURATION_MS,
): [string | null, (message: string) => void, () => void] {
  const [notice, setNotice] = useState<string | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const clear = useCallback(() => {
    window.clearTimeout(timerRef.current)
    setNotice(null)
  }, [])

  const show = useCallback(
    (message: string) => {
      window.clearTimeout(timerRef.current)
      setNotice(message)
      timerRef.current = window.setTimeout(() => setNotice(null), durationMs)
    },
    [durationMs],
  )

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return [notice, show, clear]
}
