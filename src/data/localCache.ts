import { clearDashboardReviewsIdb } from './dashboardReviewsIdb'

const PREFIX = 'feedback-dashboard-cache:'
const CACHE_VERSION = 3

type CacheEnvelope<T> = {
  version: number
  value: T
  savedAt: number
  expiresAt: number
  lastSyncAt?: number
}

function keyFor(key: string) {
  return `${PREFIX}${key}`
}

export function readCache<T>(key: string): CacheEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(keyFor(key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEnvelope<T>
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) {
      localStorage.removeItem(keyFor(key))
      return null
    }
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(keyFor(key))
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(keyFor(key))
    return null
  }
}

export function writeCache<T>(key: string, value: T, ttlMs: number, lastSyncAt?: number) {
  try {
    const now = Date.now()
    const envelope: CacheEnvelope<T> = {
      version: CACHE_VERSION,
      value,
      savedAt: now,
      expiresAt: now + ttlMs,
      lastSyncAt,
    }
    localStorage.setItem(keyFor(key), JSON.stringify(envelope))
  } catch {
    /* quota or serialization — ignore */
  }
}

export function clearCache(key: string) {
  localStorage.removeItem(keyFor(key))
}

/** Removes localStorage app cache and the IndexedDB dashboard review snapshot. */
export async function clearAllAppCache(): Promise<{ localKeys: number }> {
  if (typeof localStorage === 'undefined') {
    await clearDashboardReviewsIdb()
    return { localKeys: 0 }
  }
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX)) toRemove.push(k)
  }
  for (const k of toRemove) localStorage.removeItem(k)
  await clearDashboardReviewsIdb()
  return { localKeys: toRemove.length }
}

/** Prefix used for all app cache keys (`localStorage`). */
export function appCacheStoragePrefix() {
  return PREFIX
}

export function cacheAgeMs(savedAt?: number) {
  if (!savedAt) return null
  return Math.max(0, Date.now() - savedAt)
}

export function isCacheFresh(expiresAt?: number) {
  return typeof expiresAt === 'number' && expiresAt > Date.now()
}

export type { CacheEnvelope }
