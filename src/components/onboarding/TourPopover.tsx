import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  /** CSS selector for the anchor element (querySelector on document). */
  target: string
  title: string
  description: string
  /** Prefer left/right when a dropdown opens below the anchor. */
  placement?: TourPlacement
  /** Filled panel frame, or filled circular frame for icon buttons. */
  highlight?: 'filled' | 'circle'
  /** Anchor to the start edge instead of centering on wide targets. */
  align?: 'start' | 'center'
  /** Nudge the popover horizontally after placement (px). */
  offsetX?: number
}

interface Position {
  top: number
  left: number
}

/**
 * A single step of the first-track tour. Positions itself near the anchor
 * element (querySelector on document) and renders a card-scale popover with a
 * title, description, step dots and actions. Uses the same visual language as
 * modals but lighter — no gradient frame, since this floats over live content.
 */
export function TourPopover({
  step,
  index,
  totalSteps,
  placement = 'bottom',
  align = 'center',
  offsetX = 0,
  revision = 0,
  onNext,
  onSkip,
}: {
  step: TourStep
  index: number
  totalSteps: number
  placement?: TourPlacement
  align?: 'start' | 'center'
  offsetX?: number
  /** Bump after DOM changes (e.g. a menu opens) so position is recalculated. */
  revision?: number
  onNext: () => void
  onSkip: () => void
}) {
  const [position, setPosition] = useState<Position | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const isLastStep = index === totalSteps - 1

  const measure = useCallback(() => {
    const anchor = document.querySelector<HTMLElement>(step.target)
    const popover = popoverRef.current
    if (!anchor || !popover) {
      setPosition(null)
      return
    }

    const popoverRect = popover.getBoundingClientRect()
    const gap = 12
    // Keep clear of the tour highlight ring (matches .tour-highlight::after inset).
    const highlightPad = 5
    const leftGap = 24
    const viewPad = 12

    if (placement === 'center') {
      let top = window.innerHeight / 2 - popoverRect.height / 2
      let left = window.innerWidth / 2 - popoverRect.width / 2 + offsetX
      left = Math.max(viewPad, Math.min(left, window.innerWidth - popoverRect.width - viewPad))
      top = Math.max(viewPad, Math.min(top, window.innerHeight - popoverRect.height - viewPad))
      setPosition({ top, left })
      return
    }

    const anchorRect = anchor.getBoundingClientRect()

    // If the mode dropdown is open, clear its left edge too (it hangs left of the chevron).
    const openMenu = document.querySelector<HTMLElement>('[data-tour-target="mode-options"]')
    const menuRect = openMenu?.getBoundingClientRect()
    const clearLeft = menuRect ? Math.min(anchorRect.left, menuRect.left) : anchorRect.left

    let top = anchorRect.bottom + gap
    let left =
      align === 'start'
        ? anchorRect.left
        : anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2

    if (placement === 'top') {
      top = anchorRect.top - popoverRect.height - gap
      left =
        align === 'start'
          ? anchorRect.left
          : anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2
    } else if (placement === 'left') {
      // When the mode menu is open, line the card up with the dropdown
      // instead of centering on the small chevron above it.
      top =
        align === 'start'
          ? anchorRect.top
          : menuRect
            ? menuRect.top
            : anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2
      left = clearLeft - highlightPad - popoverRect.width - leftGap
      if (left < viewPad) {
        left = viewPad
      }
    } else if (placement === 'right') {
      top =
        align === 'start'
          ? anchorRect.top
          : anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2
      left = anchorRect.right + gap
      if (left + popoverRect.width > window.innerWidth - viewPad) {
        left = clearLeft - highlightPad - popoverRect.width - leftGap
      }
    }

    left = Math.max(viewPad, Math.min(left, window.innerWidth - popoverRect.width - viewPad))
    top = Math.max(viewPad, Math.min(top, window.innerHeight - popoverRect.height - viewPad))

    left += offsetX
    left = Math.max(viewPad, Math.min(left, window.innerWidth - popoverRect.width - viewPad))

    // Only flip bottom↔top when that was the requested axis — never shove a
    // left/right card under an open dropdown (that stacks two white cards).
    if (placement === 'bottom' && top + popoverRect.height > window.innerHeight - viewPad) {
      top = Math.max(viewPad, anchorRect.top - popoverRect.height - gap)
    }
    if (placement === 'top' && top < viewPad) {
      top = Math.min(
        window.innerHeight - popoverRect.height - viewPad,
        anchorRect.top - popoverRect.height - gap,
      )
      top = Math.max(viewPad, top)
    }

    setPosition({ top, left })
  }, [step.target, placement, align, offsetX])

  useLayoutEffect(() => {
    measure()
  }, [measure, revision])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  // Always mount the popover so measure() can read its size. Until positioned,
  // keep it invisible/off-screen — returning null here would leave the tour
  // overlay blocking the page with no Skip/Next controls.
  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={step.title}
      className="fixed z-[100] w-[280px] rounded-xl border border-navy/[0.08] bg-white p-4 shadow-panel motion-safe:animate-pop"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <p className="font-mono text-eyebrow font-medium tracking-[0.12em] text-brand uppercase">
        Step {index + 1} of {totalSteps}
      </p>
      <h3 className="mt-1.5 font-display text-caption font-semibold text-navy">{step.title}</h3>
      <p className="mt-1 text-caption leading-[1.5] text-navy/60">{step.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, dotIndex) => (
            <span
              key={dotIndex}
              className={`h-1.5 w-1.5 rounded-full ${
                dotIndex === index ? 'bg-brand' : 'bg-navy/15'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {!isLastStep ? (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full px-3 py-1.5 font-display text-caption font-medium text-navy/45 transition-colors hover:bg-surface-muted hover:text-navy"
            >
              Skip
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-brand px-3.5 py-1.5 font-display text-caption font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            {isLastStep ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
