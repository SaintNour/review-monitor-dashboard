import type { Timestamp } from './lib/timestamp'

export type Role = 'admin' | 'moderator'

export type UserProfile = {
  email: string
  displayName: string
  role: Role
  createdAt?: Timestamp
  createdBy?: string
}

export type Platform =
  | 'Amazon'
  | 'Instagram'
  | 'TikTok'
  | 'Facebook'
  | 'Yotpo'
  | 'Yelp'
  | 'Reddit'
  | 'Ebay'
  | 'Google 8 Mile'
  | 'Google Warren'
  | 'Trust Pilot'
  | 'BBB'
  | 'Sitejabber'
  | 'Realreviews.io'

export const PLATFORMS: Platform[] = [
  'Amazon',
  'Instagram',
  'TikTok',
  'Facebook',
  'Yotpo',
  'Yelp',
  'Reddit',
  'Ebay',
  'Google 8 Mile',
  'Google Warren',
  'Trust Pilot',
  'BBB',
  'Sitejabber',
  'Realreviews.io',
]

export type ReviewStatus = 'Resolved' | 'Ongoing' | 'Social Media'

export const STATUSES: ReviewStatus[] = ['Ongoing', 'Resolved', 'Social Media']

export type ReviewDoc = {
  moderatorUid: string
  moderatorName: string
  moderatorEmail: string

  clientUsername: string
  clientUsernameLower: string

  platform: Platform

  status: ReviewStatus

  statusType?: OngoingType | ResolvedType | SocialMediaType | null

  // Optional analytics fields (older docs may not have them yet)
  errorCategory?: string | null

  feedbackDate: Timestamp
  responseDate?: Timestamp | null

  feedbackText: string
  orderNumber?: string | null

  /** Comment/history (primary storage shape: id, text, authorName, createdAt). */
  resolvedLog?: unknown[]

  resolveComment: string

  // Resolve comment audit (optional; older docs may not have it)
  resolveCommentUpdatedByUid?: string | null
  resolveCommentUpdatedByName?: string | null
  resolveCommentUpdatedAt?: Timestamp | null

  ratingStars?: number | null // 1-5
  hasRating: boolean
  hasOrderNumber: boolean

  responseTimeHours?: number | null

  /** May be missing on very old documents; treat as unknown age. */
  createdAt?: Timestamp
  updatedAt: Timestamp
}
// -------------------- Status Type (sub-type) --------------------

export const ONGOING_TYPES = [
  'On Going - Follow ups.',
  'On Going - Revision Requests.',
  'On Going - No Response.',
  'On Going - Return request.',
] as const

export const RESOLVED_TYPES = [
  'Resolved - Removed.',
  'Resolved - Not Removed.',
] as const

export const SOCIAL_MEDIA_TYPES = [
  'Social Media - On going',
  'Social Media - Done',
] as const

export type OngoingType = (typeof ONGOING_TYPES)[number]
export type ResolvedType = (typeof RESOLVED_TYPES)[number]
export type SocialMediaType = (typeof SOCIAL_MEDIA_TYPES)[number]

export type StatusType = OngoingType | ResolvedType | SocialMediaType

/** Age bucket filter for Ongoing list (client-side). */
export type OngoingAgeFilter = 'all' | '0-3' | '4-7' | '8+'

// -------------------- Error Categories --------------------

export const ERROR_CATEGORIES = [
  'CS Error.',
  'WH Error.',
  'Sup/Support Errors',
  'Both.',
  'None.',
  'Listing.',
  "Part's Quality.",
  'Policies.',
  'Others.',
] as const

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]

/** Stable colors for dashboard Errors donut + legend (aligned to each canonical label). */
export const ERROR_CATEGORY_CHART_COLORS: { readonly [K in ErrorCategory]: string } = {
  'CS Error.': '#14b8a6',
  'WH Error.': '#15803d',
  /** Distinct from teals/greens/purples used for other slices */
  'Sup/Support Errors': '#d946ef',
  'Both.': '#b45309',
  'None.': '#64748b',
  'Listing.': '#6d28d9',
  "Part's Quality.": '#1d4ed8',
  'Policies.': '#0f766e',
  'Others.': '#be123c',
}

const CHART_COLOR_BY_KEY = ERROR_CATEGORY_CHART_COLORS as Record<string, string>

/** Color for Errors chart/legend/table dot; unknown labels get a neutral slate. */
export function getErrorCategoryChartColor(key: string): string {
  const k = key.trim()
  if (k === '' || k === 'None') return ERROR_CATEGORY_CHART_COLORS['None.']
  return CHART_COLOR_BY_KEY[k] ?? '#94a3b8'
}

// -------------------- Policies Subtypes --------------------

export const POLICY_TYPES = [
  'Warranty.',
  'Refunds / Return.',
] as const

export type PolicyType = (typeof POLICY_TYPES)[number]

export type ResolveCommentEntry = {
  id: string
  text: string
  createdByUid: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp | null
}

export type ActivityLogEntry = {
  action: 'status_changed' | 'comment_added' | 'comment_edited' | 'comment_deleted'
  performedBy: string
  performedByUid: string | null
  timestamp: Timestamp
  details: Record<string, unknown> | null
}
