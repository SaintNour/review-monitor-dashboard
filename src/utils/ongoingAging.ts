import type { Timestamp } from '../lib/timestamp'
import { toTimestamp } from '../lib/timestamp'
import type { OngoingAgeFilter } from '../types'

export function msSinceCreated(createdAt: unknown): number | null {
  const ts = toTimestamp(createdAt)
  if (!ts) return null
  const d = ts.toDate()
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  return Date.now() - d.getTime()
}

/** Full days elapsed since creation (floor). */
export function ageDaysElapsed(ms: number): number {
  return Math.floor(ms / 86_400_000)
}

/** Short label: `12m`, `5h`, or `3d`. */
export function formatAgingShort(ms: number): string {
  if (ms < 0) return '0m'
  if (ms < 3_600_000) return `${Math.max(0, Math.floor(ms / 60_000))}m`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`
  return `${Math.floor(ms / 86_400_000)}d`
}

export type AgingTone = 'green' | 'orange' | 'red'

export function agingToneFromDays(days: number): AgingTone {
  if (days <= 3) return 'green'
  if (days <= 7) return 'orange'
  return 'red'
}

export function agingBadgeClass(tone: AgingTone) {
  if (tone === 'green') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25'
  if (tone === 'orange') return 'bg-amber-500/15 text-amber-200 border-amber-400/25'
  return 'bg-red-500/15 text-red-200 border-red-400/25'
}

export function matchesAgeFilter(ms: number | null, bucket: OngoingAgeFilter) {
  if (bucket === 'all' || ms == null) return true
  const days = ageDaysElapsed(ms)
  if (bucket === '0-3') return days <= 3
  if (bucket === '4-7') return days >= 4 && days <= 7
  return days >= 8
}
