/**
 * Short-lived in-flight/result cache for reference lookups that several components fetch at
 * once. The assistant's draft panel is the motivating case: a week of drafted rows mounts five
 * TimeEntryDraftRows in the same tick, each independently asking for the same project and the
 * same project's task list.
 *
 * Deliberately dumb — a TTL short enough that edits made elsewhere in the app show up on the
 * next visit, with no invalidation to keep in sync. Don't reach for this to cache anything the
 * user edits and expects to see change immediately.
 */

const TTL_MS = 30_000

interface CacheEntry<T> {
  promise: Promise<T>
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = cache.get(key)
  if (existing && existing.expiresAt > Date.now()) {
    return existing.promise as Promise<T>
  }

  const promise = factory()
  cache.set(key, { promise, expiresAt: Date.now() + TTL_MS })

  // A failed lookup must not be served to later callers for the rest of the TTL.
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key)
  })

  return promise
}
