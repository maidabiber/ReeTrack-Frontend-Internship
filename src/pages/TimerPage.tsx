import { Icon } from '../components/ui/Icon'

/**
 * RT-270 — the screen a signed-in user lands on.
 *
 * This renders the standard layout for the timer screen (tracker bar, totals,
 * view toggle, entries card, and the Goals/Favorites rail) with placeholder,
 * non-interactive content. The actual timer behaviour and time entries are
 * added under later tickets.
 */
export default function TimerPage() {
  return (
    <div className="flex">
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-8 py-6">
        <TrackerBar />
        <Toolbar />
        <EntriesCard />
      </div>
      <RightRail />
    </div>
  )
}

function TrackerBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-[18px] bg-white py-2.5 pr-3 pl-5 shadow-card">
      <input
        className="min-w-[160px] flex-1 border-none bg-transparent py-1.5 font-sans text-[15px] text-navy outline-none placeholder:font-medium placeholder:text-navy/40"
        placeholder="What are you working on?"
        disabled
      />

      <IconButton name="projects" title="Project" />
      <IconButton name="tags" title="Tags" />
      <IconButton name="billable" title="Billable" />

      <div className="mx-0.5 h-[22px] w-px flex-shrink-0 bg-navy/10" />

      <div className="flex flex-shrink-0 rounded-full bg-surface-muted p-[3px]">
        <button type="button" className="rounded-full bg-navy px-3.5 py-[7px] font-display text-xs font-semibold text-cream">
          Timer
        </button>
        <button type="button" className="rounded-full px-3.5 py-[7px] font-display text-xs font-semibold text-navy/55">
          Manual
        </button>
      </div>

      <div className="min-w-[86px] flex-shrink-0 text-right font-display text-[18px] font-bold text-navy">
        0:00:00
      </div>

      <button
        type="button"
        className="flex flex-shrink-0 items-center gap-[7px] rounded-full bg-purple px-5 py-2.5 font-display text-[13px] font-semibold text-cream"
      >
        <Icon name="play" className="h-3 w-3" />
        Start
      </button>
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

function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 font-display text-[12.5px] font-bold text-navy shadow-card">
        <Icon name="calendar" className="h-[13px] w-[13px] opacity-55" />
        All dates
      </div>

      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          TODAY TOTAL
          <b className="ml-[5px] font-display text-[13px] font-bold text-navy">0:00:00</b>
        </span>
      </div>
      <div className="flex items-center gap-[18px] text-xs text-navy/60">
        <span>
          WEEK TOTAL
          <b className="ml-[5px] font-display text-[13px] font-bold text-navy">0:00:00</b>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex rounded-full bg-surface-muted p-[3px]">
        <button type="button" className="rounded-full bg-navy px-3.5 py-[7px] font-display text-[12.5px] font-semibold text-cream">
          List view
        </button>
        <button type="button" title="Coming soon" className="rounded-full px-3.5 py-[7px] font-display text-[12.5px] font-semibold text-navy/55">
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
      <div className="px-5 py-14 text-center text-[13px] leading-[1.6] text-navy/50">
        No time entries yet.
        <br />
        <br />
        Start the timer above, or add one manually, to see it here.
      </div>
    </div>
  )
}

function RightRail() {
  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-2.5 py-6 pr-5">
      <RailPanel title="Goals" body="No goals set yet." />
      <RailPanel title="Favorites" body="Star a project to pin it here." />
    </div>
  )
}

function RailPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[16px] bg-white shadow-card">
      <div className="flex items-center gap-2 px-3.5 py-3 font-display text-[13px] font-bold select-none">
        <Icon name="chevron-down" className="h-3 w-3 opacity-60" />
        {title}
      </div>
      <div className="px-3.5 pb-3.5 text-xs text-navy/50">{body}</div>
    </div>
  )
}
