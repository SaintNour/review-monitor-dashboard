import type { StatusPageFilters } from '../components/EntriesFilterBar'
import { Timestamp, timestampToIso, toTimestamp } from '../lib/timestamp'
import type {
  ErrorCategory,
  OngoingAgeFilter,
  Platform,
  ReviewDoc,
  ReviewStatus,
  Role,
  UserProfile,
} from '../types'
import {
  ERROR_CATEGORIES,
  ONGOING_TYPES,
  PLATFORMS,
  RESOLVED_TYPES,
  SOCIAL_MEDIA_TYPES,
  STATUSES,
} from '../types'

export type EntryRow = ReviewDoc & { id: string }

export type MockUser = { uid: string } & UserProfile

const MODERATORS = [
  { uid: 'mod-alex', name: 'Alex Morgan', email: 'alex.morgan@example.com' },
  { uid: 'mod-jordan', name: 'Jordan Lee', email: 'jordan.lee@example.com' },
  { uid: 'demo-admin', name: 'Demo Admin', email: 'demo@example.com' },
] as const

const CLIENT_NAMES = [
  'customer_alpha',
  'buyer_42',
  'shopper_ny',
  'user_west_coast',
  'reviewer_mike',
  'client_sarah',
  'parts_buyer_9',
  'auto_owner_j',
  'fleet_mgr_12',
  'diy_mechanic',
]

const FEEDBACK_SAMPLES = [
  'Product arrived damaged. Requesting a replacement or refund.',
  'Part did not fit my vehicle despite compatibility listing. Returning the order.',
  'Shipping took longer than expected. Package arrived after the promised date.',
  'Excellent support experience — issue resolved within 24 hours.',
  'Still waiting on a response regarding warranty coverage for defective rotors.',
  'Listing photos did not match the item received. Quality below expectations.',
  'Social post flagged for brand mention — coordinating with marketing team.',
  'Customer requested escalation after two follow-ups with no resolution.',
  'Refund processed; customer confirmed satisfaction in follow-up message.',
  'Order number mismatch in system — corrected and documented for QA.',
]

function randomId(prefix = 'entry') {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`
}

function daysAgo(n: number): Timestamp {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return Timestamp.fromDate(d)
}

function statusTypeFor(status: ReviewStatus, index: number): string {
  if (status === 'Ongoing') return ONGOING_TYPES[index % ONGOING_TYPES.length]
  if (status === 'Resolved') return RESOLVED_TYPES[index % RESOLVED_TYPES.length]
  return SOCIAL_MEDIA_TYPES[index % SOCIAL_MEDIA_TYPES.length]
}

function seedEntries(): EntryRow[] {
  const rows: EntryRow[] = []
  for (let i = 0; i < 72; i++) {
    const status = STATUSES[i % STATUSES.length]
    const platform = PLATFORMS[i % PLATFORMS.length] as Platform
    const mod = MODERATORS[i % MODERATORS.length]
    const feedbackDaysAgo = 3 + (i % 45)
    const createdDaysAgo = status === 'Ongoing' ? (i % 12) : feedbackDaysAgo + 1
    const feedbackDate = daysAgo(feedbackDaysAgo)
    const createdAt = daysAgo(createdDaysAgo)
    const updatedAt = daysAgo(Math.max(0, createdDaysAgo - 1))
    const ratingStars = (i % 5) + 1
    const client = CLIENT_NAMES[i % CLIENT_NAMES.length]
    const hasComment = i % 3 === 0

    rows.push({
      id: randomId(),
      moderatorUid: mod.uid,
      moderatorName: mod.name,
      moderatorEmail: mod.email,
      clientUsername: client,
      clientUsernameLower: client.toLowerCase(),
      platform,
      status,
      statusType: statusTypeFor(status, i) as EntryRow['statusType'],
      errorCategory: ERROR_CATEGORIES[i % ERROR_CATEGORIES.length] as ErrorCategory,
      feedbackDate,
      responseDate: status === 'Resolved' ? daysAgo(feedbackDaysAgo - 1) : null,
      feedbackText: FEEDBACK_SAMPLES[i % FEEDBACK_SAMPLES.length],
      orderNumber: i % 4 === 0 ? `ORD-${10000 + i}` : null,
      resolvedLog: hasComment
        ? [
            {
              id: randomId('cmt'),
              text: 'Initial follow-up sent to customer. Awaiting response.',
              authorName: mod.name,
              createdAt: Timestamp.fromDate(
                new Date(createdAt.toDate().getTime() + 3_600_000),
              ),
            },
          ]
        : [],
      resolveComment: hasComment ? 'Initial follow-up sent to customer.' : '',
      ratingStars,
      hasRating: true,
      hasOrderNumber: i % 4 === 0,
      responseTimeHours: status === 'Resolved' ? 24 + (i % 48) : null,
      createdAt,
      updatedAt,
      activityLog: [],
    })
  }
  return rows.sort((a, b) => b.feedbackDate.toMillis() - a.feedbackDate.toMillis())
}

function seedUsers(): MockUser[] {
  return MODERATORS.map((m) => ({
    uid: m.uid,
    email: m.email,
    displayName: m.name,
    role: (m.uid === 'demo-admin' ? 'admin' : 'moderator') as Role,
    createdAt: daysAgo(120),
    createdBy: 'demo-admin',
  }))
}

let entries = seedEntries()
let users = seedUsers()

export function resetMockData() {
  entries = seedEntries()
  users = seedUsers()
}

function entryToApi(row: EntryRow): Record<string, unknown> {
  return {
    ...row,
    feedbackDate: timestampToIso(row.feedbackDate),
    responseDate: timestampToIso(row.responseDate ?? null),
    createdAt: timestampToIso(row.createdAt ?? null),
    updatedAt: timestampToIso(row.updatedAt),
    resolvedLog: Array.isArray(row.resolvedLog)
      ? row.resolvedLog.map((c) => {
          const item = c as Record<string, unknown>
          const createdAt = toTimestamp(item.createdAt)
          const updatedAt = toTimestamp(item.updatedAt)
          return {
            ...item,
            createdAt: timestampToIso(createdAt),
            updatedAt: timestampToIso(updatedAt),
          }
        })
      : [],
    activityLog: Array.isArray(row.activityLog)
      ? row.activityLog.map((e) => {
          const item = e as Record<string, unknown>
          return {
            ...item,
            timestamp: timestampToIso(toTimestamp(item.timestamp)),
          }
        })
      : [],
  }
}

function parsePayloadDates(payload: Record<string, unknown>): Partial<EntryRow> {
  const patch: Partial<EntryRow> = { ...payload } as Partial<EntryRow>
  if ('feedbackDate' in payload) {
    patch.feedbackDate = toTimestamp(payload.feedbackDate) ?? Timestamp.now()
  }
  if ('responseDate' in payload) {
    patch.responseDate = toTimestamp(payload.responseDate)
  }
  if ('createdAt' in payload) {
    patch.createdAt = toTimestamp(payload.createdAt) ?? undefined
  }
  if ('updatedAt' in payload) {
    patch.updatedAt = toTimestamp(payload.updatedAt) ?? Timestamp.now()
  }
  if (Array.isArray(payload.resolvedLog)) {
    patch.resolvedLog = payload.resolvedLog.map((raw) => {
      const item = raw as Record<string, unknown>
      return {
        ...item,
        createdAt: toTimestamp(item.createdAt) ?? Timestamp.now(),
        updatedAt: toTimestamp(item.updatedAt),
      }
    })
  }
  if (Array.isArray(payload.activityLog)) {
    patch.activityLog = payload.activityLog.map((raw) => {
      const item = raw as Record<string, unknown>
      return {
        ...item,
        timestamp: toTimestamp(item.timestamp) ?? Timestamp.now(),
      }
    }) as EntryRow['activityLog']
  }
  return patch
}

function matchesSearch(row: EntryRow, term: string) {
  if (!term) return true
  const t = term.toLowerCase()
  return (
    row.clientUsername.toLowerCase().includes(t) ||
    String(row.orderNumber ?? '').toLowerCase().includes(t) ||
    row.feedbackText.toLowerCase().includes(t)
  )
}

function matchesAge(ms: number | null, bucket: OngoingAgeFilter) {
  if (bucket === 'all' || ms == null) return true
  const days = Math.floor(ms / 86_400_000)
  if (bucket === '0-3') return days <= 3
  if (bucket === '4-7') return days >= 4 && days <= 7
  return days >= 8
}

function msSinceCreated(createdAt: Timestamp | undefined) {
  if (!createdAt) return null
  return Date.now() - createdAt.toMillis()
}

function filterEntries(opts: {
  status?: ReviewStatus
  filters: StatusPageFilters
}): EntryRow[] {
  const { status, filters } = opts
  const from = filters.from ? new Date(filters.from + 'T00:00:00') : null
  const to = filters.to ? new Date(filters.to + 'T23:59:59') : null

  return entries.filter((row) => {
    if (status && row.status !== status) return false
    if (filters.platform && row.platform !== filters.platform) return false
    if (filters.statusType && row.statusType !== filters.statusType) return false
    if (filters.errorCategory && row.errorCategory !== filters.errorCategory) return false
    const fd = row.feedbackDate.toDate()
    if (from && fd < from) return false
    if (to && fd > to) return false
    if (!matchesSearch(row, filters.search.trim())) return false
    if (status === 'Ongoing' && filters.ageBucket !== 'all') {
      const ms = msSinceCreated(row.createdAt)
      if (!matchesAge(ms, filters.ageBucket)) return false
    }
    return true
  })
}

export function listEntries(params: {
  status?: ReviewStatus
  filters: StatusPageFilters
  page: number
  pageSize: number
}) {
  const filtered = filterEntries({ status: params.status, filters: params.filters })
  const totalCount = filtered.length
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  const page = Math.min(Math.max(1, params.page), pageCount)
  const start = (page - 1) * params.pageSize
  const slice = filtered.slice(start, start + params.pageSize)
  return {
    rows: slice.map(entryToApi),
    totalCount,
    page,
    pageSize: params.pageSize,
    pageCount,
  }
}

export function listAllEntriesForDashboard(limit = 500) {
  return entries.slice(0, limit).map(entryToApi)
}

export function getEntryById(id: string) {
  const row = entries.find((e) => e.id === id)
  if (!row) throw new Error('Entry not found')
  return entryToApi(row)
}

export function createEntry(payload: Record<string, unknown>) {
  const id = randomId()
  const patch = parsePayloadDates(payload)
  const now = Timestamp.now()
  const row: EntryRow = {
    id,
    moderatorUid: String(patch.moderatorUid ?? 'demo-admin'),
    moderatorName: String(patch.moderatorName ?? 'Demo Admin'),
    moderatorEmail: String(patch.moderatorEmail ?? 'demo@example.com'),
    clientUsername: String(patch.clientUsername ?? ''),
    clientUsernameLower: String(patch.clientUsername ?? '').toLowerCase(),
    platform: (patch.platform as Platform) ?? 'Amazon',
    status: (patch.status as ReviewStatus) ?? 'Ongoing',
    statusType: patch.statusType ?? ONGOING_TYPES[0],
    feedbackDate: patch.feedbackDate ?? now,
    feedbackText: String(patch.feedbackText ?? ''),
    orderNumber: (patch.orderNumber as string | null) ?? null,
    resolvedLog: patch.resolvedLog ?? [],
    resolveComment: String(patch.resolveComment ?? ''),
    ratingStars: (patch.ratingStars as number | null) ?? null,
    hasRating: Boolean(patch.hasRating),
    hasOrderNumber: Boolean(patch.hasOrderNumber),
    responseDate: patch.responseDate ?? null,
    responseTimeHours: (patch.responseTimeHours as number | null) ?? null,
    errorCategory: patch.errorCategory ?? 'None.',
    policyType: patch.policyType ?? null,
    createdAt: patch.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
    activityLog: patch.activityLog ?? [],
  }
  entries = [row, ...entries]
  return entryToApi(row)
}

export function updateEntry(id: string, payload: Record<string, unknown>) {
  const idx = entries.findIndex((e) => e.id === id)
  if (idx < 0) throw new Error('Entry not found')
  const patch = parsePayloadDates(payload)
  const prev = entries[idx]
  const next: EntryRow = {
    ...prev,
    ...patch,
    id,
    updatedAt: patch.updatedAt ?? Timestamp.now(),
  }
  entries[idx] = next
  return entryToApi(next)
}

export function getDashboardMetrics(filters: {
  selectedPlatforms: string[]
  fromDate: string
  toDate: string
  starsFilter: string
  errorFilter: string
}) {
  let rows = [...entries]
  if (filters.selectedPlatforms.length) {
    rows = rows.filter((r) => filters.selectedPlatforms.includes(r.platform))
  }
  if (filters.fromDate) {
    const from = new Date(filters.fromDate + 'T00:00:00')
    rows = rows.filter((r) => r.feedbackDate.toDate() >= from)
  }
  if (filters.toDate) {
    const to = new Date(filters.toDate + 'T23:59:59')
    rows = rows.filter((r) => r.feedbackDate.toDate() <= to)
  }
  if (filters.starsFilter && filters.starsFilter !== 'All') {
    const star = Number(filters.starsFilter)
    rows = rows.filter((r) => r.ratingStars === star)
  }
  if (filters.errorFilter && filters.errorFilter !== 'All') {
    rows = rows.filter((r) => r.errorCategory === filters.errorFilter)
  }

  const total = rows.length
  const resolved = rows.filter((r) => r.status === 'Resolved').length
  const ongoing = rows.filter((r) => r.status === 'Ongoing').length
  const unresolved = ongoing
  const unresolvedOver7 = rows.filter((r) => {
    if (r.status !== 'Ongoing') return false
    const ms = msSinceCreated(r.createdAt)
    return ms != null && ms >= 7 * 86_400_000
  }).length

  const rated = rows.filter((r) => r.ratingStars != null)
  const avgStars = rated.length
    ? rated.reduce((s, r) => s + (r.ratingStars ?? 0), 0) / rated.length
    : 0

  const aging = { '0-3': 0, '4-7': 0, '8+': 0 }
  for (const r of rows) {
    if (r.status !== 'Ongoing') continue
    const ms = msSinceCreated(r.createdAt)
    if (ms == null) continue
    const days = Math.floor(ms / 86_400_000)
    if (days <= 3) aging['0-3']++
    else if (days <= 7) aging['4-7']++
    else aging['8+']++
  }

  const platformMap = new Map<string, number>()
  const errorMap = new Map<string, number>()
  const ratingMap = new Map<string, number>()
  for (const r of rows) {
    platformMap.set(r.platform, (platformMap.get(r.platform) ?? 0) + 1)
    const err = r.errorCategory ?? 'None.'
    errorMap.set(err, (errorMap.get(err) ?? 0) + 1)
    const ratingKey = r.ratingStars != null ? String(r.ratingStars) : '—'
    ratingMap.set(ratingKey, (ratingMap.get(ratingKey) ?? 0) + 1)
  }

  const toSorted = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)

  return {
    total,
    resolved,
    ongoing,
    unresolved,
    unresolvedOver7,
    avgStars: Math.round(avgStars * 10) / 10,
    aging,
    byPlatform: toSorted(platformMap),
    byError: toSorted(errorMap),
    byRating: toSorted(ratingMap),
  }
}

export function listUsers() {
  return users.map((u) => ({
    id: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: timestampToIso(u.createdAt),
  }))
}

export function getMe() {
  const u = users.find((x) => x.uid === 'demo-admin') ?? users[0]
  return {
    id: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: timestampToIso(u.createdAt),
  }
}

export function createUserProfile(payload: {
  id: string
  email: string
  displayName: string
  role: Role
}) {
  const row: MockUser = {
    uid: payload.id,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    createdAt: Timestamp.now(),
    createdBy: 'demo-admin',
  }
  users = [...users, row]
  return {
    id: row.uid,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    createdAt: timestampToIso(row.createdAt),
  }
}

export function updateUserRole(uid: string, role: Role) {
  const idx = users.findIndex((u) => u.uid === uid)
  if (idx < 0) throw new Error('User not found')
  users[idx] = { ...users[idx], role }
  const u = users[idx]
  return {
    id: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: timestampToIso(u.createdAt),
  }
}

export function addCommentToEntry(
  entryId: string,
  payload: { id?: string; commentText: string; agentName: string },
) {
  const idx = entries.findIndex((e) => e.id === entryId)
  if (idx < 0) throw new Error('Entry not found')
  const row = entries[idx]
  const log = Array.isArray(row.resolvedLog) ? [...row.resolvedLog] : []
  const item = {
    id: payload.id ?? randomId('cmt'),
    text: payload.commentText,
    authorName: payload.agentName,
    createdAt: Timestamp.now(),
  }
  log.push(item)
  const resolveComment = log.map((c) => String((c as { text?: string }).text ?? '')).join('\n')
  entries[idx] = {
    ...row,
    resolvedLog: log,
    resolveComment,
    updatedAt: Timestamp.now(),
  }
  return { id: item.id, entryId, commentText: item.text, agentName: item.authorName }
}

export function updateCommentOnEntry(commentId: string, commentText: string) {
  for (let i = 0; i < entries.length; i++) {
    const row = entries[i]
    const log = Array.isArray(row.resolvedLog) ? [...row.resolvedLog] : []
    const j = log.findIndex((c) => String((c as { id?: string }).id) === commentId)
    if (j < 0) continue
    log[j] = { ...(log[j] as object), text: commentText, updatedAt: Timestamp.now() }
    const resolveComment = log.map((c) => String((c as { text?: string }).text ?? '')).join('\n')
    entries[i] = { ...row, resolvedLog: log, resolveComment, updatedAt: Timestamp.now() }
    return { id: commentId, commentText }
  }
  throw new Error('Comment not found')
}

export function deleteCommentFromEntry(commentId: string) {
  for (let i = 0; i < entries.length; i++) {
    const row = entries[i]
    const log = Array.isArray(row.resolvedLog) ? [...row.resolvedLog] : []
    const next = log.filter((c) => String((c as { id?: string }).id) !== commentId)
    if (next.length === log.length) continue
    const resolveComment = next.map((c) => String((c as { text?: string }).text ?? '')).join('\n')
    entries[i] = { ...row, resolvedLog: next, resolveComment, updatedAt: Timestamp.now() }
    return
  }
  throw new Error('Comment not found')
}

/** Legacy reviews module: list all matching (client-side pagination). */
export function listReviewsMatching(filters: {
  platform?: Platform[]
  status?: ReviewStatus[]
  feedbackDateFrom?: Date | null
  feedbackDateTo?: Date | null
  searchText?: string
  errorCategory?: string | null
  statusType?: string | null
}) {
  const status = filters.status?.[0]
  const using: StatusPageFilters = {
    platform: filters.platform?.[0] ?? '',
    statusType: filters.statusType ?? '',
    errorCategory: filters.errorCategory ?? '',
    from: filters.feedbackDateFrom
      ? filters.feedbackDateFrom.toISOString().slice(0, 10)
      : '',
    to: filters.feedbackDateTo ? filters.feedbackDateTo.toISOString().slice(0, 10) : '',
    search: filters.searchText ?? '',
    ageBucket: 'all',
  }
  return filterEntries({ status, filters: using })
}

export function countReviewsMatching(filters: Parameters<typeof listReviewsMatching>[0]) {
  return listReviewsMatching(filters).length
}

export function pageReviewsMatching(
  filters: Parameters<typeof listReviewsMatching>[0],
  pageSize: number,
  startAfterId: string | null,
) {
  const all = listReviewsMatching(filters)
  let start = 0
  if (startAfterId) {
    const idx = all.findIndex((r) => r.id === startAfterId)
    start = idx >= 0 ? idx + 1 : 0
  }
  const slice = all.slice(start, start + pageSize + 1)
  const hasMore = slice.length > pageSize
  const page = slice.slice(0, pageSize)
  const nextCursor = page.length ? page[page.length - 1].id : null
  return { rows: page, nextCursor: hasMore ? nextCursor : null, hasMore }
}
