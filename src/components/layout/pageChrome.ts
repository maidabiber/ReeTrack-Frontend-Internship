/**
 * Shared in-app page scaffolding. Pages sit in a centered column
 * (`max-w-page`) with responsive padding that stays comfortable on phones.
 */
export const PAGE_PAD = 'px-4 sm:px-6 lg:px-10 py-6 lg:py-8'

/**
 * Tall panels that scroll internally (the calendar) instead of growing the page.
 * `dvh` rather than `vh` so a phone's collapsing URL bar doesn't leave the panel
 * overflowing. The subtracted chrome is deliberately approximate — the tracker
 * bar's height varies with chips and panels, so this is a comfortable ceiling,
 * not an exact fit, and the panel scrolls internally either way.
 */
export const VIEWPORT_PANEL_HEIGHT =
  'h-[68dvh] min-h-[420px] sm:h-[calc(100dvh-16rem)] sm:min-h-[520px]'

/**
 * Pages that own the whole viewport rather than scrolling with it — the assistant chat, where
 * the composer has to stay pinned to the bottom edge. Height is exact (not a `min`) so inner
 * `flex-1 min-h-0` regions can derive one and scroll internally. Below `lg` the sticky
 * MobileTopBar (`h-14`) sits above the page, so its height comes off the top.
 */
export const FULL_VIEWPORT_PAGE = 'h-[calc(100dvh-3.5rem)] lg:h-[100dvh]'
