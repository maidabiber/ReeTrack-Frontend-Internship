import { createAvatar } from '@dicebear/core'
import { glass } from '@dicebear/collection'
import { PROJECT_COLORS } from './projectColors'
import type { Client } from '../types/client'
import type { Project } from '../types/project'

/**
 * Cover art for project and client tiles: a DiceBear "glass" tile seeded by
 * the entity id (stable across renames), themed with its accent colour as the
 * background. The style layers translucent glass shapes over the background,
 * so every palette colour — including navy — reads cleanly without per-colour
 * tuning. Generated locally as a data URI (no network round-trip, and ids
 * never leave the app).
 */

/** Colourless projects fall back to navy, like the old list's status dot. */
const FALLBACK_COVER_COLOR = '#1B2540'

/**
 * How far the accent is blended toward white before it becomes a cover.
 * At full-card scale the raw palette shouts over the brand theme; the pastel
 * keeps per-project identity while the pure accent stays on small elements
 * (dots, pills, swatches).
 */
const COVER_TINT = 0.5

function tintTowardWhite(hex: string, amount: number): string {
  const channels = hex.replace('#', '').match(/../g) ?? []
  return channels
    .map((channel) => {
      const value = parseInt(channel, 16)
      const mixed = Math.round(value + (255 - value) * amount)
      return mixed.toString(16).padStart(2, '0')
    })
    .join('')
}

// Rows regenerate their cover on every render; the SVG is pure in
// (seed, colour), so memoise the data URIs for the session.
const coverCache = new Map<string, string>()

export function projectCoverUrl(project: Pick<Project, 'id' | 'color'>): string {
  const cacheKey = `${project.id}|${project.color ?? ''}`
  const cached = coverCache.get(cacheKey)
  if (cached) return cached

  const backgroundColor = tintTowardWhite(project.color ?? FALLBACK_COVER_COLOR, COVER_TINT)
  const uri = createAvatar(glass, { seed: project.id, backgroundColor: [backgroundColor] }).toDataUri()
  coverCache.set(cacheKey, uri)
  return uri
}

/** Cover tile for a client: same glass art, with a stable accent picked from
 * the shared palette by hashing the client id. */
export function clientCoverUrl(client: Pick<Client, 'id'>): string {
  let hash = 0
  for (const char of client.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return projectCoverUrl({ id: client.id, color: PROJECT_COLORS[hash % PROJECT_COLORS.length] })
}
