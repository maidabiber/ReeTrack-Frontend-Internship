import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { clampPomodoroMinutes } from '../../lib/pomodoroPrefs'

type PomodoroControlsProps = {
  enabled: boolean
  workMinutes: number
  breakMinutes: number
  onEnabledChange: (enabled: boolean) => void
  onWorkMinutesChange: (minutes: number) => void
  onBreakMinutesChange: (minutes: number) => void
  disabled?: boolean
}

function Switch({
  checked,
  onChange,
  disabled,
  labelledBy,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-brand' : 'bg-navy/15'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function MinuteField({
  label,
  value,
  onChange,
  onEnter,
  disabled,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  onEnter: () => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-display text-sm font-semibold text-navy/70">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 3))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onEnter()
            }
          }}
          className="w-14 rounded-md border border-navy/[0.08] bg-surface-muted/40 px-2 py-1.5 text-center font-mono text-sm tabular-nums text-navy outline-none focus:border-brand disabled:opacity-60"
          aria-label={`${label} minutes`}
        />
        <span className="font-mono text-xs text-navy/35">min</span>
      </div>
    </label>
  )
}

function parseDraftMinutes(draft: string, fallback: number): number {
  const parsed = Number.parseInt(draft, 10)
  if (Number.isNaN(parsed)) return fallback
  return clampPomodoroMinutes(parsed)
}

export function PomodoroControls({
  enabled,
  workMinutes,
  breakMinutes,
  onEnabledChange,
  onWorkMinutesChange,
  onBreakMinutesChange,
  disabled = false,
}: PomodoroControlsProps) {
  const [open, setOpen] = useState(false)
  const [workDraft, setWorkDraft] = useState(String(workMinutes))
  const [breakDraft, setBreakDraft] = useState(String(breakMinutes))
  const [intervalsApplied, setIntervalsApplied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const applyIntervals = () => {
    const nextWork = parseDraftMinutes(workDraft, workMinutes)
    const nextBreak = parseDraftMinutes(breakDraft, breakMinutes)
    setWorkDraft(String(nextWork))
    setBreakDraft(String(nextBreak))
    onWorkMinutesChange(nextWork)
    onBreakMinutesChange(nextBreak)
    setIntervalsApplied(true)
  }

  const toggleSettings = () => {
    if (!open) {
      setWorkDraft(String(workMinutes))
      setBreakDraft(String(breakMinutes))
      setIntervalsApplied(false)
    }
    setOpen((current) => !current)
  }

  const nextWork = parseDraftMinutes(workDraft, workMinutes)
  const nextBreak = parseDraftMinutes(breakDraft, breakMinutes)
  const dirty = nextWork !== workMinutes || nextBreak !== breakMinutes

  return (
    <div
      ref={rootRef}
      className="relative flex flex-shrink-0 items-center"
      data-tour-target="pomodoro"
    >
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-label={enabled ? 'Pomodoro on — open settings' : 'Pomodoro settings'}
        title={enabled ? 'Pomodoro on' : 'Pomodoro'}
        onClick={toggleSettings}
        className={`relative flex size-control items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? 'border-brand/30 bg-brand/10 text-brand'
            : enabled
              ? 'border-brand/25 bg-brand-tint text-brand shadow-soft'
              : 'border-navy/[0.06] bg-white text-navy/55 shadow-soft hover:border-brand/20 hover:text-navy'
        }`}
      >
        <Icon name="timer" className="h-4 w-4" />
        {enabled ? (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand"
          />
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+8px)] right-0 z-40 w-[248px] rounded-xl bg-white p-3.5 shadow-dropdown">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p id={titleId} className="font-display text-sm font-semibold text-navy">
              Pomodoro
            </p>
            <Switch
              checked={enabled}
              onChange={onEnabledChange}
              disabled={disabled}
              labelledBy={titleId}
            />
          </div>

          <div
            className={`flex flex-col gap-3 border-t border-navy/[0.06] pt-3 transition-opacity ${
              enabled ? 'opacity-100' : 'pointer-events-none opacity-40'
            }`}
          >
            <MinuteField
              label="Focus"
              value={workDraft}
              onChange={(value) => {
                setWorkDraft(value)
                setIntervalsApplied(false)
              }}
              onEnter={applyIntervals}
              disabled={disabled || !enabled}
            />
            <MinuteField
              label="Break"
              value={breakDraft}
              onChange={(value) => {
                setBreakDraft(value)
                setIntervalsApplied(false)
              }}
              onEnter={applyIntervals}
              disabled={disabled || !enabled}
            />

            <button
              type="button"
              disabled={disabled || !enabled || !dirty}
              onClick={applyIntervals}
              className={`mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 font-display text-sm font-semibold transition-colors ${
                intervalsApplied && !dirty
                  ? 'border-brand/15 bg-brand-tint text-brand'
                  : 'border-navy bg-navy text-cream hover:bg-navy/90 disabled:cursor-not-allowed disabled:border-navy/15 disabled:bg-navy/[0.06] disabled:text-navy/35'
              }`}
            >
              {intervalsApplied && !dirty ? (
                <>
                  <Icon name="check-badge" className="h-4 w-4" />
                  Intervals saved
                </>
              ) : (
                'Apply intervals'
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
