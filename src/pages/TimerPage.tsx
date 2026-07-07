import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { EventCalendar } from '../components/calendar/EventCalendar'
import { useTimer } from '../hooks/useTimer'
import { formatDurationHms } from '../lib/formatDuration'

/**
 * RT-270 / RT-23 — the signed-in timer landing screen with one-click
 * start/stop, live elapsed display, and completed entries below.
 */
export default function TimerPage() {
  const [contentView, setContentView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1340px] px-10 pt-8">
        <div className="px-8 pb-4">
          <TrackerBar />
        </div>
      </div>

      <div className="px-15 pt-4">
        <Toolbar contentView={contentView} onContentViewChange={setContentView} />
        {contentView === 'list' ? <EntriesCard /> : <EventCalendar />}
      </div>
    </div>
  )
}

function TrackerBar() {
  const {
    activeTimer,
    elapsedSeconds,
    isRunning,
    isInitializing,
    isToggling,
    error,
    toggle,
  } = useTimer()
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (activeTimer?.description) {
      setDescription(activeTimer.description)
    } else if (!activeTimer) {
      setDescription('')
    }
  }, [activeTimer])

  const handleToggle = () => {
    void toggle(description.trim() || undefined)
  }

  return (
    <div className="rounded-[18px] bg-white shadow-card">
      <input
        className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-[16px] text-navy outline-none placeholder:font-medium placeholder:text-navy/40 disabled:opacity-60"
        placeholder="What are you working on?"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        disabled={isInitializing || isToggling}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            handleToggle()
          }
        }}
      />

      <span aria-hidden="true" className="block h-px w-full bg-brand-gradient" />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3.5">
        <IconButton name="projects" title="Project" />
        <IconButton name="tags" title="Tags" />
        <IconButton name="billable" title="Billable" />

        <div className="mx-1 h-[22px] w-px flex-shrink-0 bg-navy/10" />

        <div className="flex flex-shrink-0 rounded-full bg-surface-muted p-[3px]">
          <button type="button" className="rounded-full bg-navy px-4 py-[7px] font-display text-xs font-semibold text-cream">
            Timer
          </button>
          <button type="button" className="rounded-full px-4 py-[7px] font-display text-xs font-semibold text-navy/55">
            Manual
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex min-w-[104px] items-center justify-end gap-2">
          {isRunning ? (
            <span
              className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-brand"
              title="Timer running"
              aria-label="Timer running"
            />
          ) : null}
          <div
            className={`text-right font-mono text-[22px] font-light tracking-tight tabular-nums ${
              isRunning ? 'text-brand' : 'text-navy'
            }`}
          >
            {formatDurationHms(elapsedSeconds)}
          </div>
        </div>

        <button
          type="button"
          aria-label={isRunning ? 'Stop timer' : 'Start timer'}
          aria-pressed={isRunning}
          disabled={isInitializing || isToggling}
          onClick={handleToggle}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isRunning
              ? 'bg-navy hover:bg-navy/90'
              : 'bg-brand hover:bg-brand-deep'
          }`}
        >
          <Icon
            name={isRunning ? 'stop' : 'play'}
            className={isRunning ? 'h-[14px] w-[14px]' : 'h-[15px] w-[15px] translate-x-px'}
          />
        </button>
      </div>

      {error ? (
        <p className="px-6 pb-4 text-[13px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IconButton({ name, title }: { name: 'projects' | 'tags' | 'billable'; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-navy/55 hover:bg-surface-muted hover:text-navy"
    >
      <Icon name={name} className="h-4 w-4" />
    </button>
  )
}

function Toolbar({
  contentView,
  onContentViewChange,
}: {
  contentView: 'list' | 'calendar'
  onContentViewChange: (view: 'list' | 'calendar') => void
}) {
  const { entries } = useTimer()

  const todayTotalSeconds = entries.reduce((total, entry) => {
    if (!entry.startedAtUtc) return total
    const started = new Date(entry.startedAtUtc)
    const now = new Date()
    const isToday =
      started.getFullYear() === now.getFullYear() &&
      started.getMonth() === now.getMonth() &&
      started.getDate() === now.getDate()
    return isToday ? total + entry.durationSeconds : total
  }, 0)

  return (
    <div className="flex w-full flex-wrap items-center gap-4 px-10 py-3">
      <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-display text-[12.5px] font-bold text-navy shadow-card">
        <Icon name="calendar" className="h-[13px] w-[13px] opacity-55" />
        All dates
      </div>

      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          TODAY TOTAL
          <b className="ml-[5px] font-mono text-[13px] font-normal tabular-nums text-navy">
            {formatDurationHms(todayTotalSeconds)}
          </b>
        </span>
      </div>
      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          WEEK TOTAL
          <b className="ml-[5px] font-mono text-[13px] font-normal tabular-nums text-navy">0:00:00</b>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex rounded-full bg-surface-muted p-[3px]">
        <button
          type="button"
          onClick={() => onContentViewChange('list')}
          className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
            contentView === 'list' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          List view
        </button>
        <button
          type="button"
          onClick={() => onContentViewChange('calendar')}
          className={`rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold ${
            contentView === 'calendar' ? 'bg-navy text-cream' : 'text-navy/55'
          }`}
        >
          Calendar
        </button>
        <button type="button" title="Coming soon" className="rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold text-navy/55">
          Timesheet
        </button>
      </div>
    </div>
  )
}

function EntriesCard() {
  const { entries, isInitializing } = useTimer()

  if (isInitializing) {
    return (
      <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
        <div className="px-5 py-16 text-center text-[13px] leading-[1.6] text-navy/50">
          Loading entries…
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
        <div className="px-5 py-16 text-center text-[13px] leading-[1.6] text-navy/50">
          No time entries yet.
          <br />
          <br />
          Start the timer above, or add one manually, to see it here.
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
      <ul className="divide-y divide-navy/5">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-navy">
                {entry.description?.trim() || 'No description'}
              </p>
              {entry.startedAtUtc ? (
                <p className="mt-0.5 text-[12px] text-navy/50">
                  {new Date(entry.startedAtUtc).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="font-mono text-[14px] tabular-nums text-navy">
              {formatDurationHms(entry.durationSeconds)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
