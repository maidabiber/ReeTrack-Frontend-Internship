import { useEffect, useState } from 'react'

/** Mirrors the Tailwind default breakpoints so JS-side layout decisions can't drift from `sm:`/`md:`/`lg:` classes. */
export const BREAKPOINT = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
} as const

/** Reactive `matchMedia` check — updates on resize/orientation change, not just at mount. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}
