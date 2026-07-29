import { useEffect, useRef, type RefObject } from 'react'

interface DismissOptions {
  /**
   * Also dismiss on Escape. Off by default: several call sites sit inside a Modal
   * that already handles Escape, and closing both at once is rarely what's wanted.
   */
  closeOnEscape?: boolean
  /** Portalled descendants that should count as inside the popover. */
  ignoreSelector?: string
  /** Nested overlays that should consume Escape before this popover. */
  ignoreEscapeSelector?: string
}

/**
 * Dismisses a popover / dropdown when a pointer goes down outside `ref`.
 *
 * Listeners are only attached while `open`, and `onDismiss` is read through a ref so
 * an inline arrow function doesn't resubscribe on every render.
 */
export function useDismissOnOutside(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
  {
    closeOnEscape = false,
    ignoreSelector,
    ignoreEscapeSelector,
  }: DismissOptions = {},
): void {
  const dismissRef = useRef(onDismiss)

  // Written in an effect, not during render: React 19 forbids touching refs while
  // rendering, and the listener below only ever fires after commit.
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!ref.current || !(target instanceof Node)) return
      if (ref.current.contains(target)) return
      if (ignoreSelector && target instanceof Element && target.closest(ignoreSelector)) return
      dismissRef.current()
    }

    document.addEventListener('mousedown', onPointerDown)

    if (!closeOnEscape) {
      return () => document.removeEventListener('mousedown', onPointerDown)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (ignoreEscapeSelector && document.querySelector(ignoreEscapeSelector)) return
      dismissRef.current()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, open, closeOnEscape, ignoreSelector, ignoreEscapeSelector])
}
