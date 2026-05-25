/**
 * Comment / history normalization for `reviews` documents.
 * Source of truth: `resolvedLog` — { id, text, authorName, createdAt, updatedAt? }
 * Fallbacks: `comments`, `resolutionLogs`, joined `resolveComment` (legacy).
 */

export type NormalizedEntryComment = {
  id: string
  text: string
  /** Display name — from authorName (resolvedLog) or createdByName / agentName (legacy). */
  agentName: string
  createdByUid?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export function newCommentId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function newLocalId() {
  return newCommentId()
}

function normalizeOne(raw: unknown): NormalizedEntryComment | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const text = String(o.text ?? o.commentText ?? '').trim()
  if (!text) return null
  const id = String(o.id ?? '').trim() || newLocalId()
  const display =
    String(o.authorName ?? o.createdByName ?? o.agentName ?? o.author ?? o.userName ?? 'Unknown').trim() ||
    'Unknown'
  const uid = o.createdByUid != null ? String(o.createdByUid) : undefined
  return {
    id,
    text,
    agentName: display,
    createdByUid: uid,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

/** Serialize one normalized comment for storage on `resolvedLog`. */
export function toResolvedLogRow(c: NormalizedEntryComment): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: c.id,
    text: c.text,
    authorName: c.agentName,
    createdAt: c.createdAt,
  }
  if (c.updatedAt != null) row.updatedAt = c.updatedAt
  return row
}

export function buildResolveCommentJoin(list: NormalizedEntryComment[]) {
  return list.map((c) => c.text).join('\n---\n')
}

export function normalizeCommentsFromDoc(data: Record<string, unknown>): NormalizedEntryComment[] {
  if (Array.isArray(data.resolvedLog) && data.resolvedLog.length > 0) {
    const out: NormalizedEntryComment[] = []
    for (const raw of data.resolvedLog) {
      const n = normalizeOne(raw)
      if (n) out.push(n)
    }
    if (out.length > 0) return out
  }

  const buckets: unknown[] = []
  if (Array.isArray(data.comments)) buckets.push(...data.comments)
  if (buckets.length === 0 && Array.isArray((data as { resolutionLogs?: unknown[] }).resolutionLogs)) {
    buckets.push(...((data as { resolutionLogs: unknown[] }).resolutionLogs as unknown[]))
  }

  const out: NormalizedEntryComment[] = []
  for (const raw of buckets) {
    const n = normalizeOne(raw)
    if (n) out.push(n)
  }
  if (out.length > 0) return out

  const rc = String(data.resolveComment ?? '').trim()
  if (rc) {
    const parts = rc.split(/\n---\n/)
    parts.forEach((part, i) => {
      const t = part.trim()
      if (!t) return
      out.push({
        id: `legacy-resolveComment-${i}`,
        text: t,
        agentName: 'Resolution log',
        createdAt: (data as { resolveCommentUpdatedAt?: unknown }).resolveCommentUpdatedAt ?? data.updatedAt,
      })
    })
  }

  return out
}
