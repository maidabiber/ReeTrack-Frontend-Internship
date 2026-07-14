import { useEffect, useRef, useState } from 'react'
import { MentionDescriptionField } from './MentionDescriptionField'
import {
  DurationModeInput,
  type DurationModeInputHandle,
} from './DurationModeInput'
import {
  ManualModeInput,
  type ManualModeInputHandle,
} from './ManualModeInput'
import {
  TimerModeInput,
  type TimerModeInputHandle,
} from './TimerModeInput'
import { Icon } from '../ui/Icon'
import { useTimer } from '../../hooks/useTimer'
import type { Teammate } from '../../lib/mention'

const TIMER_PANEL_CLASS = 'timer-panel'

type TrackerMode = 'timer' | 'manual' | 'duration'

function IconButton({ name, title }: { name: 'projects' | 'tags' | 'billable'; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="flex size-control flex-shrink-0 items-center justify-center rounded-md border border-navy/[0.06] bg-white text-navy/55 shadow-soft transition-colors hover:border-brand/20 hover:text-navy"
    >
      <Icon name={name} className="h-4 w-4" />
    </button>
  )
}

export function TrackerBar() {
  const {
    activeTimer,
    isRunning,
    isInitializing,
    isToggling,
    isSavingManual,
  } = useTimer()

  const [trackerMode, setTrackerMode] = useState<TrackerMode>('timer')
  const [description, setDescription] = useState('')
  const [mentionedTeammates, setMentionedTeammates] = useState<Teammate[]>([])
  const [shareNotice, setShareNotice] = useState<string | null>(null)

  const timerRef = useRef<TimerModeInputHandle>(null)
  const manualRef = useRef<ManualModeInputHandle>(null)
  const durationRef = useRef<DurationModeInputHandle>(null)

  // Keep the description field aligned with the running timer from TimerContext.
  useEffect(() => {
    if (activeTimer?.description) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from TimerContext
      setDescription(activeTimer.description)
    } else if (!activeTimer && trackerMode === 'timer') {
      setDescription('')
    }
  }, [activeTimer, trackerMode])

  const clearShareNotice = () => setShareNotice(null)

  const switchMode = (mode: TrackerMode) => {
    if ((mode === 'manual' || mode === 'duration') && isRunning) return
    setTrackerMode(mode)
    clearShareNotice()
  }

  const handleDescriptionEnter = () => {
    if (trackerMode === 'timer') {
      timerRef.current?.toggle()
      return
    }
    if (trackerMode === 'manual') {
      void manualRef.current?.saveEntry(manualRef.current.pendingOverlapConfirm)
      return
    }
    void durationRef.current?.saveEntry()
  }

  return (
    <>
      <div className={TIMER_PANEL_CLASS}>
        {trackerMode === 'duration' ? (
          <input
            className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-lg text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
            placeholder="What did you work on?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isInitializing || isSavingManual}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleDescriptionEnter()
              }
            }}
          />
        ) : (
          <MentionDescriptionField
            className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-lg text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
            placeholder="What are you working on? Type @ to share with a teammate"
            value={description}
            onChange={setDescription}
            selectedTeammates={mentionedTeammates}
            onMentionChange={setMentionedTeammates}
            disabled={isInitializing || isToggling || isSavingManual}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleDescriptionEnter()
              }
            }}
          />
        )}

        {shareNotice ? (
          <div className="mx-6 mb-3 rounded-md bg-brand-tint px-3 py-2.5 text-sm text-navy">
            {shareNotice}
          </div>
        ) : null}

        <span aria-hidden="true" className="block h-px w-full bg-brand-gradient" />

        <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-navy/[0.06] bg-surface-muted/25 px-4 py-3.5">
          <IconButton name="projects" title="Project" />
          <IconButton name="tags" title="Tags" />
          <IconButton name="billable" title="Billable" />

          <div className="mx-1 h-5.5 w-px flex-shrink-0 bg-navy/10" />

          <div className="flex flex-shrink-0 rounded-full border border-navy/[0.06] bg-white p-segment shadow-soft">
            <button
              type="button"
              onClick={() => switchMode('timer')}
              className={`rounded-full px-4 py-compact font-display text-sm font-semibold ${
                trackerMode === 'timer' ? 'bg-navy text-cream' : 'text-navy/55'
              }`}
            >
              Timer
            </button>
            <button
              type="button"
              onClick={() => switchMode('manual')}
              disabled={isRunning}
              title={isRunning ? 'Stop the running timer before adding a manual entry' : undefined}
              className={`rounded-full px-4 py-compact font-display text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                trackerMode === 'manual' ? 'bg-navy text-cream' : 'text-navy/55'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => switchMode('duration')}
              disabled={isRunning}
              title={isRunning ? 'Stop the running timer before adding a duration entry' : undefined}
              className={`rounded-full px-3.5 py-compact font-display text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                trackerMode === 'duration' ? 'bg-navy text-cream' : 'text-navy/55'
              }`}
            >
              Duration
            </button>
          </div>

          <div className="flex-1" />

          {trackerMode === 'timer' ? (
            <TimerModeInput
              ref={timerRef}
              description={description}
              setDescription={setDescription}
              mentionedTeammates={mentionedTeammates}
              setMentionedTeammates={setMentionedTeammates}
              onShared={setShareNotice}
              onClearShareNotice={clearShareNotice}
            />
          ) : trackerMode === 'manual' ? (
            <ManualModeInput
              ref={manualRef}
              description={description}
              mentionedTeammates={mentionedTeammates}
              onShared={setShareNotice}
              onClearDescription={() => setDescription('')}
              onClearMentions={() => setMentionedTeammates([])}
              onClearShareNotice={clearShareNotice}
            />
          ) : (
            <DurationModeInput
              ref={durationRef}
              description={description}
              onClearDescription={() => setDescription('')}
              onClearShareNotice={clearShareNotice}
            />
          )}
        </div>
      </div>
    </>
  )
}
