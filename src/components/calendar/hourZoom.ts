export const DEFAULT_HOUR_HEIGHT = 48
export const MIN_HOUR_HEIGHT = 32
export const MAX_HOUR_HEIGHT = 120
export const HOUR_HEIGHT_STEP = 8

export function clampHourHeight(height: number): number {
  return Math.min(MAX_HOUR_HEIGHT, Math.max(MIN_HOUR_HEIGHT, height))
}

export function stepHourHeight(height: number, direction: 1 | -1): number {
  return clampHourHeight(height + direction * HOUR_HEIGHT_STEP)
}
