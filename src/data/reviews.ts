import type { ErrorCategory, Platform, ReviewDoc, ReviewStatus, StatusType } from '../types'
import * as store from './mockStore'

export type ReviewFilters = {
  platform?: Platform[]
  status?: ReviewStatus[]
  feedbackDateFrom?: Date | null
  feedbackDateTo?: Date | null
  moderatorUid?: string | null
  searchText?: string
  errorCategory?: ErrorCategory | '' | null
  statusType?: StatusType | '' | null
}

export type ReviewDocRow = ReviewDoc & { id: string }

export type ReviewPageResult = {
  rows: ReviewDocRow[]
  nextCursor: string | null
  hasMore: boolean
}

export async function fetchReviewsCount(filters: ReviewFilters) {
  return store.countReviewsMatching(filters)
}

export async function fetchReviewsPage(opts: {
  filters: ReviewFilters
  pageSize: number
  startAfterDoc?: string | null
}) {
  const { filters, pageSize, startAfterDoc = null } = opts
  const result = store.pageReviewsMatching(filters, pageSize, startAfterDoc)
  return {
    rows: result.rows as ReviewDocRow[],
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  } satisfies ReviewPageResult
}

export async function fetchReviews(filters: ReviewFilters) {
  const rows = store.listReviewsMatching(filters)
  if (filters.searchText?.trim()) {
    const term = filters.searchText.trim().toLowerCase()
    return rows.filter((r) => {
      const user = r.clientUsername.toLowerCase()
      const order = String(r.orderNumber ?? '').toLowerCase()
      const text = r.feedbackText.toLowerCase()
      return user.includes(term) || order.includes(term) || text.includes(term)
    }) as ReviewDocRow[]
  }
  return rows as ReviewDocRow[]
}
