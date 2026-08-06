import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TrackerBar } from '../components/time/TrackerBar'
import { Toolbar, type TimerContentView } from '../components/time/Toolbar'
import { EntriesCard } from '../components/time/EntriesCard'
import { EventCalendar } from '../components/calendar/EventCalendar'
import { PAGE_PAD } from '../components/layout/pageChrome'
import { useAuth } from '../hooks/useAuth'
import { Permissions } from '../lib/permissions'

// Lazy so recharts (the heaviest dependency) stays out of the main bundle
// until the timesheet view is actually opened.
const TimesheetView = lazy(() =>
  import('../components/timesheet/TimesheetView').then((module) => ({
    default: module.TimesheetView,
  })),
)

/**
 * RT-270 / RT-23 / RT-24 / RT-28 — timer landing screen with one-click timer,
 * manual time entry, and entry editing. Also hosts the weekly timesheet view
 * (RT-71). The timesheet is the /timesheet route (not local state) so decision
 * -email deep links, the back button, and in-app navigation all stay in sync;
 * list vs calendar remains a local toggle on the index route.
 */
export default function TimerPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isInitializing, hasPermission } = useAuth()
  const isTimesheet = useLocation().pathname.startsWith('/timesheet')
  const [listView, setListView] = useState<Exclude<TimerContentView, 'timesheet'>>('list')
  const contentView: TimerContentView = isTimesheet ? 'timesheet' : listView

  // Redirect admins/PMs to /overview on the initial app load only.
  // Uses a module-level flag so navigating back to / doesn't re-redirect.
  useEffect(() => {
    if (!isInitializing && isAuthenticated && hasPermission(Permissions.ReportsView)) {
      if (!sessionStorage.getItem('overviewRedirected')) {
        sessionStorage.setItem('overviewRedirected', '1')
        navigate('/overview', { replace: true })
      }
    }
  }, [isInitializing, isAuthenticated, hasPermission, navigate])

  const handleContentViewChange = (view: TimerContentView) => {
    if (view === 'timesheet') {
      navigate('/timesheet')
    } else {
      setListView(view)
      if (isTimesheet) navigate('/')
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface-muted/45">
      <div className={`mx-auto w-full max-w-page ${PAGE_PAD}`}>
        <div className="mb-5">
          <TrackerBar />
        </div>

        <Toolbar contentView={contentView} onContentViewChange={handleContentViewChange} />

        <div className="mt-4">
          {contentView === 'list' ? (
            <EntriesCard />
          ) : contentView === 'calendar' ? (
            <EventCalendar />
          ) : (
            <Suspense
              fallback={
                <div className="rounded-2xl bg-white px-5 py-16 text-center text-body text-navy/50 shadow-card">
                  Loading timesheet…
                </div>
              }
            >
              <TimesheetView />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
