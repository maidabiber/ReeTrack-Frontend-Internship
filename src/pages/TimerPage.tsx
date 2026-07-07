import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { EventCalendar } from '../components/calendar/EventCalendar'

/**
 * RT-270 — the screen a signed-in user lands on.
 *
 * This renders the standard layout for the timer screen (tracker bar, totals,
 * view toggle, entries card, and the Goals/Favorites rail) with placeholder,
 * non-interactive content. The actual timer behaviour and time entries are
 * added under later tickets.
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
  return (
    <div className="rounded-[18px] bg-white shadow-card">
      <input
        className="w-full border-none bg-transparent px-6 pt-5 pb-4 font-sans text-[16px] text-navy outline-none placeholder:font-medium placeholder:text-navy/40"
        placeholder="What are you working on?"
        disabled
      />

      {/* The ReeTrack trademark: a thin brand-gradient line under the input. */}
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

        <div className="min-w-[104px] text-right font-mono text-[22px] font-light tracking-tight tabular-nums text-navy">
          0:00:00
        </div>

        <button
          type="button"
          aria-label="Start timer"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep"
        >
          <Icon name="play" className="h-[15px] w-[15px] translate-x-px" />
        </button>
      </div>
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
  return (
    <div className="flex w-full flex-wrap items-center gap-4 px-10 py-3">
      <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-display text-[12.5px] font-bold text-navy shadow-card">
        <Icon name="calendar" className="h-[13px] w-[13px] opacity-55" />
        All dates
      </div>

      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          TODAY TOTAL
          <b className="ml-[5px] font-mono text-[13px] font-normal tabular-nums text-navy">0:00:00</b>
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
