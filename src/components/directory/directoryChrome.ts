import type { CSSProperties } from 'react'

/**
 * Non-component chrome shared by the directory pages (projects, clients,
 * members, tags). Kept out of the component files so those stay
 * component-only (react-refresh lint rule), like sidebarRow.ts.
 */

/* Active/archived as coloured text for StatusMark — the shared lifecycle
 * palette for anything archivable (projects, clients). */
export const STATUS_COLOR: Record<'active' | 'archived', string> = {
  active: 'text-[#1E8A57]',
  archived: 'text-navy/45',
}

/**
 * Staggered entrance for directory rows: pair with motion-safe:animate-rise.
 * The delay is capped so long lists settle quickly instead of trickling in.
 */
export function riseDelay(index: number, capIndex = 14): CSSProperties {
  return { animationDelay: `${Math.min(index, capIndex) * 30}ms` }
}
