import type { BlockTypeId } from '../../../lib/customReportSpec'

export const PALETTE_PREFIX = 'palette:'

export function paletteTypeFromId(id: string): BlockTypeId | null {
  if (!id.startsWith(PALETTE_PREFIX)) return null
  return id.slice(PALETTE_PREFIX.length) as BlockTypeId
}
