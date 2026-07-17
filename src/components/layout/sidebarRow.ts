/**
 * Shared chrome for sidebar rows (nav items, the profile row, sign out):
 * dusk brand-gradient wash when active, and a small origin-left inflate on
 * hover — a transform, not padding, so the hover stays on the compositor and
 * sibling rows don't shift. Kept out of NavItem.tsx so that file stays
 * component-only (react-refresh lint rule).
 */
export const SIDEBAR_ROW_BASE =
  'flex origin-left items-center gap-2.5 rounded-md px-3 py-2 font-display text-md font-medium no-underline transition-[transform,color,background-color] duration-200 ease-out motion-safe:hover:scale-[1.04]'

export const SIDEBAR_ROW_ACTIVE = 'bg-brand-gradient-soft text-white'

export const SIDEBAR_ROW_INACTIVE = 'text-white/70 hover:bg-white/[0.06] hover:text-white'
