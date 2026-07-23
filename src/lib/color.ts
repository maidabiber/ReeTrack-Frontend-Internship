/**
 * Blend a hex colour toward white by `amount` (0 = unchanged, 1 = pure white).
 * Returns a `#rrggbb` string. Invalid input falls back to the original hex.
 */
export function tintTowardWhite(hex: string, amount: number): string {
  const normalized = hex.trim().replace(/^#/, '')
  const channels = normalized.match(/../g)
  if (!channels || channels.length < 3) {
    return hex.startsWith('#') ? hex : `#${hex}`
  }

  const mixed = channels
    .slice(0, 3)
    .map((channel) => {
      const value = parseInt(channel, 16)
      return Math.round(value + (255 - value) * amount)
        .toString(16)
        .padStart(2, '0')
    })
    .join('')

  return `#${mixed}`
}

/** Shared wash for calendar event fills and project row identity swatches. */
export const SOFT_ACCENT_TINT = 0.72

/** Soft gray for colourless projects / accents (chips, calendar, swatches). */
export const NO_ACCENT_COLOR = '#C7CDDB'

/** Soft fill from a project/tag accent hex — same treatment as calendar cards. */
export function softAccentFill(hex: string | null | undefined): string {
  return tintTowardWhite(hex?.trim() || NO_ACCENT_COLOR, SOFT_ACCENT_TINT)
}
