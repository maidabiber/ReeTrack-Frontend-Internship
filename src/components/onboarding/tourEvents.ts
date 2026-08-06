/** TrackerBar listens for this so Pomodoro (Timer-only) stays mounted during the tour. */
export const TOUR_FORCE_TIMER_MODE_EVENT = 'reetrack:tour-force-timer-mode'

/** TimerPage switches back to List so the entries step has a mounted target. */
export const TOUR_FORCE_LIST_VIEW_EVENT = 'reetrack:tour-force-list-view'

/** Opens / closes the tracker mode chevron menu during the Manual & Duration step. */
export const TOUR_OPEN_MODE_MENU_EVENT = 'reetrack:tour-open-mode-menu'
export const TOUR_CLOSE_MODE_MENU_EVENT = 'reetrack:tour-close-mode-menu'
