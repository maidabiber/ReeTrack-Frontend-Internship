import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTimer } from '../../hooks/useTimer'
import {
  TOUR_CLOSE_MODE_MENU_EVENT,
  TOUR_FORCE_LIST_VIEW_EVENT,
  TOUR_FORCE_TIMER_MODE_EVENT,
  TOUR_OPEN_MODE_MENU_EVENT,
} from './tourEvents'
import { TourPopover, type TourStep } from './TourPopover'

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour-target="entry-description"]',
    title: 'Describe the work',
    description:
      'Add a short note about what you’re working on before you start the entry. Type @ and pick a teammate to share it with them. They’ll be notified to approve it.',
    placement: 'bottom',
    highlight: 'filled',
  },
  {
    target: '[data-tour-target="entry-details"]',
    title: 'Set up the entry',
    description:
      'Pick a project, add tags if you need them, and toggle billable when the time should be charged.',
    placement: 'bottom',
    highlight: 'filled',
  },
  {
    target: '[data-tour-target="timer-play"]',
    title: 'Start the timer',
    description:
      'Hit play and the timer runs in the background while you keep working.',
    placement: 'left',
    highlight: 'circle',
  },
  {
    // Highlight the chevron; menu opens to the right so the left card stays clear.
    target: '[data-tour-target="mode-menu"]',
    title: 'Manual and Duration',
    description:
      'The down arrow next to play opens this menu. Pick Manual for a start/end time, or Duration when you only know how long it took.',
    placement: 'left',
    highlight: 'circle',
  },
  {
    target: '[data-tour-target="pomodoro"]',
    title: 'Pomodoro focus',
    description:
      'Available in Timer mode. Optional focus sessions with work and break intervals when you want structured sprints.',
    placement: 'bottom',
    highlight: 'filled',
  },
  {
    target: '[data-tour-target="smart-parse"]',
    title: 'Smart AI entry',
    description:
      'Write a sentence about the time you tracked and include the key details. ReeTrack splits that into the entry metadata for you to confirm and save.',
    placement: 'left',
    highlight: 'circle',
  },
  {
    target: '[data-tour-target="suggestions"]',
    title: 'Suggestions',
    description:
      'These cards are one click presets from your recent work. Tap one to fill the tracker and start faster.',
    placement: 'bottom',
    highlight: 'filled',
  },
  {
    target: '[data-tour-target="favourites"]',
    title: 'Favourites',
    description:
      'Save entries you reuse often. Star an entry in your list and it appears here for quick reuse.',
    placement: 'bottom',
    highlight: 'filled',
  },
  {
    target: '[data-tour-target="content-views"]',
    title: 'List, Calendar, Timesheet',
    description:
      'Switch how you review time: a day list, a calendar of entries, or the weekly timesheet for submit and approval.',
    placement: 'bottom',
    highlight: 'filled',
  },

  {
    target: '[data-tour-target="entries-list"]',
    title: 'Your entries',
    description:
      'Every entry lands in List view. From here you can edit, share, star as a favourite, or jump to Calendar and Timesheet anytime.',
    placement: 'center',
    offsetX: 300,
    highlight: 'filled',
  },
]

const HIGHLIGHT_CLASS = 'tour-highlight'
const HIGHLIGHT_FILLED_CLASS = 'tour-highlight-filled'
const HIGHLIGHT_CIRCLE_CLASS = 'tour-highlight-circle'

function clearHighlight() {
  document.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS, HIGHLIGHT_FILLED_CLASS, HIGHLIGHT_CIRCLE_CLASS)
  })
}

function applyHighlight(target: string, highlight: 'filled' | 'circle' = 'filled') {
  const el = document.querySelector<HTMLElement>(target)
  if (!el) return
  el.classList.add(HIGHLIGHT_CLASS)
  if (highlight === 'filled') {
    el.classList.add(HIGHLIGHT_FILLED_CLASS)
  } else {
    el.classList.add(HIGHLIGHT_FILLED_CLASS, HIGHLIGHT_CIRCLE_CLASS)
  }
}

export function FirstTrackTour() {
  const { user, hasCompletedOnboarding, completeOnboarding } = useAuth()
  const { entries, isRunning, isInitializing } = useTimer()
  const [stepIndex, setStepIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [layoutRevision, setLayoutRevision] = useState(0)
  // Hold the card until the mode dropdown is open so it doesn't jump left after measure.
  const [cardReady, setCardReady] = useState(true)
  const finishingRef = useRef(false)
  // Baseline is captured after timer data loads so async entry fetch doesn't
  // look like the user just logged their first entry during the tour.
  const baselineEntryCount = useRef<number | null>(null)

  const shouldShow = user !== null && !hasCompletedOnboarding && !isDismissed

  // Auto-advance past the "start the timer" step once the timer is running.
  const timerStepIndex = TOUR_STEPS.findIndex((step) =>
    step.target.includes('timer-play'),
  )
  const effectiveStepIndex =
    isRunning && stepIndex === timerStepIndex ? timerStepIndex + 1 : stepIndex

  const finish = () => {
    if (finishingRef.current) return
    finishingRef.current = true
    setIsDismissed(true)
    clearHighlight()
    void completeOnboarding()
  }

  const advance = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  useEffect(() => {
    if (!shouldShow) return

    const step = TOUR_STEPS[effectiveStepIndex]
    // Share uses @ mentions (Timer/Manual); Pomodoro only mounts in Timer mode.
    const needsTimerMode =
      step.target.includes('pomodoro') || step.target.includes('entry-description')
    const needsListView = step.target.includes('entries-list')
    const isModeMenuStep = step.target.includes('mode-menu')

    // Mode step: hide card until the dropdown exists, then mount already in the final spot.
    const hideCardId = isModeMenuStep ? window.setTimeout(() => setCardReady(false), 0) : 0

    if (needsTimerMode) {
      window.dispatchEvent(new Event(TOUR_FORCE_TIMER_MODE_EVENT))
    }
    if (needsListView) {
      window.dispatchEvent(new Event(TOUR_FORCE_LIST_VIEW_EVENT))
    }

    let highlightId = 0
    const openId = window.setTimeout(() => {
      if (isModeMenuStep) {
        window.dispatchEvent(new Event(TOUR_OPEN_MODE_MENU_EVENT))
      }

      highlightId = window.setTimeout(() => {
        applyHighlight(step.target, step.highlight ?? 'filled')
        setLayoutRevision((value) => value + 1)
        setCardReady(true)
      }, isModeMenuStep || needsListView ? 50 : 0)
    }, needsTimerMode || isModeMenuStep || needsListView ? 50 : 0)

    return () => {
      window.clearTimeout(hideCardId)
      window.clearTimeout(openId)
      window.clearTimeout(highlightId)
      clearHighlight()
      if (isModeMenuStep) {
        window.dispatchEvent(new Event(TOUR_CLOSE_MODE_MENU_EVENT))
      }
    }
  }, [shouldShow, effectiveStepIndex])

  // If the user logs a new entry during the tour, the tour's job is done.
  // Users who already had entries when the tour started are NOT auto-finished —
  // they walk through (or skip) normally.
  useEffect(() => {
    if (!shouldShow || isInitializing) return

    if (baselineEntryCount.current === null) {
      baselineEntryCount.current = entries.length
      return
    }

    if (entries.length > baselineEntryCount.current) {
      finish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, isInitializing, entries.length])

  if (!shouldShow) return null

  const step = TOUR_STEPS[effectiveStepIndex]

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-navy/50 backdrop-blur-[2px] motion-safe:animate-fade" />
      {cardReady ? (
        <TourPopover
          key={effectiveStepIndex}
          step={step}
          index={effectiveStepIndex}
          totalSteps={TOUR_STEPS.length}
          placement={step.placement ?? 'bottom'}
          align={step.align ?? 'center'}
          offsetX={step.offsetX ?? 0}
          revision={layoutRevision}
          onNext={advance}
          onSkip={finish}
        />
      ) : null}
    </>
  )
}
