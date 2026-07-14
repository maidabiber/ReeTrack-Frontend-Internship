import { useState } from 'react'
import { TrackerBar } from '../components/time/TrackerBar'
import { Toolbar } from '../components/time/Toolbar'
import { EntriesCard } from '../components/time/EntriesCard'
import { EventCalendar } from '../components/calendar/EventCalendar'

/**
 * RT-270 / RT-23 / RT-24 / RT-28 — timer landing screen with one-click timer,
 * manual time entry, and entry editing.
 */
export default function TimerPage() {
  const [contentView, setContentView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface-muted/45">
      <div className="mx-auto w-full max-w-page px-10 py-8">
        <div className="mb-5">
          <TrackerBar />
        </div>

        <Toolbar contentView={contentView} onContentViewChange={setContentView} />

        <div className="mt-4">
          {contentView === 'list' ? <EntriesCard /> : <EventCalendar />}
        </div>
      </div>
    </div>
  )
}
