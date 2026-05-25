import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PageLoadOverlay } from '../components/PageLoadOverlay'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { useAuth } from '../auth/AuthProvider'
import { fetchEntriesApi } from '../data/entries.api'
import type { ReviewDoc, ReviewStatus } from '../types'
import { format } from 'date-fns'
import { Eye, Pencil, RefreshCw, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { EntriesFilterBar, type StatusPageFilters } from '../components/EntriesFilterBar'
import { ErrorCategoryDisplay } from '../components/ErrorCategoryDisplay'
import { exportToCsv } from '../utils/exportCsv'
import { isCacheFresh, readCache, writeCache } from '../data/localCache'
import {
  agingBadgeClass,
  agingToneFromDays,
  ageDaysElapsed,
  formatAgingShort,
  matchesAgeFilter,
  msSinceCreated,
} from '../utils/ongoingAging'

type ReviewRow = ReviewDoc & { id: string }
type CachedPageData = {
  rows: ReviewRow[]
  currentPage: number
  totalCount: number
  pageCount: number
  hasNext: boolean
}

const PAGE_SIZE_OPTIONS = [25, 100, 150, 200] as const
const STATUS_PAGE_TTL_MS = 3 * 60_000

function canEditEntry() {
  return true
}

function parseDate(s: string) {
  if (!s) return null
  return new Date(s)
}

function toIsoOrNull(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function reviveTimestampLike(value: any) {
  const iso = toIsoOrNull(value)
  if (!iso) return value
  return { toDate: () => new Date(iso) }
}

function serializeRow(row: ReviewRow): ReviewRow {
  return {
    ...row,
    feedbackDate: toIsoOrNull((row as any).feedbackDate) ?? (row as any).feedbackDate,
    responseDate: toIsoOrNull((row as any).responseDate) ?? (row as any).responseDate,
    createdAt: toIsoOrNull((row as any).createdAt) ?? (row as any).createdAt,
    updatedAt: toIsoOrNull((row as any).updatedAt) ?? (row as any).updatedAt,
  } as ReviewRow
}

function deserializeRow(row: ReviewRow): ReviewRow {
  return {
    ...row,
    feedbackDate: reviveTimestampLike((row as any).feedbackDate),
    responseDate: reviveTimestampLike((row as any).responseDate),
    createdAt: reviveTimestampLike((row as any).createdAt),
    updatedAt: reviveTimestampLike((row as any).updatedAt),
  } as ReviewRow
}

function pageCacheKey(status: ReviewStatus, pageSize: number, page: number, filters: StatusPageFilters) {
  return `status-page:${status}:mock:${pageSize}:${page}:${JSON.stringify(filters)}`
}

function parseAgeBucket(v: string | null): StatusPageFilters['ageBucket'] {
  if (v === '0-3' || v === '4-7' || v === '8+') return v
  if (v === '8plus' || v === '8-plus') return '8+'
  return 'all'
}

function initialStatusFilters(status: ReviewStatus, params: URLSearchParams): StatusPageFilters {
  const ab = params.get('age') ?? params.get('aging')
  const ageBucket: StatusPageFilters['ageBucket'] =
    status === 'Ongoing' ? parseAgeBucket(ab) : 'all'
  return {
    platform: params.get('platform') ?? '',
    statusType: (params.get('statusType') as any) ?? '',
    errorCategory: (params.get('errorCategory') as any) ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    search: params.get('search') ?? '',
    ageBucket,
  }
}

function toCsvRow(r: any) {
  const feedbackDate = r.feedbackDate?.toDate?.()
  const responseDate = r.responseDate?.toDate?.()
  return {
    id: r.id,
    feedbackDate: feedbackDate ? format(feedbackDate, 'yyyy-MM-dd') : '',
    responseDate: responseDate ? format(responseDate, 'yyyy-MM-dd') : '',
    platform: r.platform ?? '',
    status: r.status ?? '',
    statusType: r.statusType ?? '',
    errorCategory: r.errorCategory ?? '',
    policyType: r.policyType ?? '',
    clientUsername: r.clientUsername ?? '',
    orderNumber: r.orderNumber ?? '',
    ratingStars: r.ratingStars ?? '',
    moderatorName: r.moderatorName ?? '',
    moderatorEmail: r.moderatorEmail ?? '',
    feedbackText: r.feedbackText ?? '',
    resolveComment: r.resolveComment ?? '',
    updatedAt: r.updatedAt?.toDate?.() ? format(r.updatedAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
    createdAt: r.createdAt?.toDate?.() ? format(r.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
  }
}

export function StatusListPage({ status }: { status: ReviewStatus }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { role, user } = useAuth()
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [ongoingTotalCount, setOngoingTotalCount] = useState(0)
  const [ongoingPageCount, setOngoingPageCount] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [resolvedHasNext, setResolvedHasNext] = useState(false)
  const [resolvedPageCount, setResolvedPageCount] = useState(1)
  const requestSeqRef = useRef(0)

  const [uiFilters, setUiFilters] = useState<StatusPageFilters>(() => initialStatusFilters(status, searchParams))

  const title = useMemo(() => status, [status])
  const isOngoing = status === 'Ongoing'

  const filteredRows = useMemo(() => {
    if (!isOngoing) return rows
    return rows.filter((r) => {
      const ms = msSinceCreated(r.createdAt)
      return matchesAgeFilter(ms, uiFilters.ageBucket)
    })
  }, [rows, isOngoing, uiFilters.ageBucket])

  const totalPages = useMemo(() => {
    if (!isOngoing) return Math.max(1, resolvedPageCount)
    return Math.max(1, ongoingPageCount)
  }, [isOngoing, ongoingPageCount, resolvedPageCount])
  const visiblePageCount = isOngoing ? totalPages : resolvedPageCount

  const pagedRows = useMemo(() => {
    return filteredRows
  }, [filteredRows])

  useEffect(() => {
    if (!isOngoing) return
    setCurrentPage(1)
  }, [isOngoing, status, pageSize, uiFilters.ageBucket, rows.length])

  useEffect(() => {
    if (currentPage > visiblePageCount) setCurrentPage(visiblePageCount)
  }, [currentPage, visiblePageCount])

  useEffect(() => {
    const fromQuery = initialStatusFilters(status, searchParams)
    setUiFilters(fromQuery)
    setCurrentPage(1)
    if (searchParams.toString()) {
      setSearchParams(new URLSearchParams(), { replace: true })
    }
    // intentionally only on status switch/mount behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function load(using: StatusPageFilters, targetPage = 1, opts?: { force?: boolean }) {
    if (!role || !user) return
    const page = Math.max(1, targetPage)
    const cacheKey = pageCacheKey(status, pageSize, page, using)
    const fromCache = readCache<CachedPageData>(cacheKey)
    if (!opts?.force && fromCache && isCacheFresh(fromCache.expiresAt)) {
      setRows((fromCache.value.rows || []).map(deserializeRow))
      setCurrentPage(fromCache.value.currentPage)
      setOngoingTotalCount(fromCache.value.totalCount)
      setOngoingPageCount(fromCache.value.pageCount)
      return
    }
    setBusy(true)
    setLoadError(null)
    try {
      if (!isOngoing) return
      const result = await fetchEntriesApi({
        status: 'Ongoing',
        filters: using,
        page,
        pageSize,
      })
      const nextRows = (result.rows as ReviewRow[]).map(serializeRow)
      setRows(nextRows.map(deserializeRow))
      setCurrentPage(result.page)
      setOngoingTotalCount(result.totalCount)
      setOngoingPageCount(result.pageCount)
      writeCache<CachedPageData>(
        cacheKey,
        {
          rows: nextRows,
          currentPage: result.page,
          totalCount: result.totalCount,
          pageCount: result.pageCount,
          hasNext: result.page < result.pageCount,
        },
        STATUS_PAGE_TTL_MS,
        Date.now(),
      )
    } catch (e: any) {
      setLoadError(String(e?.message ?? 'Failed to load'))
    } finally {
      setBusy(false)
    }
  }

  async function loadResolvedPage(using: StatusPageFilters, targetPage: number, opts?: { reset?: boolean; force?: boolean }) {
    if (!role || !user) return
    const reqId = ++requestSeqRef.current
    const reset = !!opts?.reset
    const nextPage = Math.max(1, targetPage)
    const cacheKey = pageCacheKey(status, pageSize, nextPage, using)
    const fromCache = readCache<CachedPageData>(cacheKey)
    if (!opts?.force && fromCache && isCacheFresh(fromCache.expiresAt)) {
      setRows((fromCache.value.rows || []).map(deserializeRow))
      setCurrentPage(fromCache.value.currentPage)
      setTotalCount(fromCache.value.totalCount)
      setResolvedPageCount(fromCache.value.pageCount)
      setResolvedHasNext(fromCache.value.hasNext)
      return
    }
    setBusy(true)
    setLoadError(null)

    try {
      if (reset) setCurrentPage(1)
      const result = await fetchEntriesApi({
        status: status as 'Resolved' | 'Social Media',
        filters: using,
        page: nextPage,
        pageSize,
      })
      if (reqId !== requestSeqRef.current) return
      setRows(result.rows as ReviewRow[])
      setCurrentPage(result.page)
      setTotalCount(result.totalCount)
      setResolvedPageCount(result.pageCount)
      setResolvedHasNext(result.page < result.pageCount)
      writeCache<CachedPageData>(
        cacheKey,
        {
          rows: (result.rows as ReviewRow[]).map(serializeRow),
          currentPage: result.page,
          totalCount: result.totalCount,
          pageCount: result.pageCount,
          hasNext: result.page < result.pageCount,
        },
        STATUS_PAGE_TTL_MS,
        Date.now(),
      )
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (reqId === requestSeqRef.current) setBusy(false)
    }
  }

  function handleExport() {
    const stamp = format(new Date(), 'yyyy-MM-dd_HH-mm')
    const filename = `reviews_${status.replace(' ', '_').toLowerCase()}_${stamp}.csv`
    exportToCsv(filename, filteredRows.map(toCsvRow))
  }

  useEffect(() => {
    if (isOngoing) {
      load(uiFilters)
      return
    }
    setResolvedHasNext(false)
    setTotalCount(0)
    setResolvedPageCount(1)
    setCurrentPage(1)
    loadResolvedPage(uiFilters, 1, { reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.uid, status, pageSize])

  const tableRows = isOngoing ? pagedRows : rows
  /** Ongoing: Age column; Resolved: same simplified layout (no Order # / Feedback). */
  const colCount = isOngoing ? 9 : 8
  const hasActiveFilters =
    !!uiFilters.platform ||
    !!uiFilters.statusType ||
    !!uiFilters.errorCategory ||
    !!uiFilters.from ||
    !!uiFilters.to ||
    !!uiFilters.search.trim() ||
    (isOngoing && uiFilters.ageBucket !== 'all')

  function applyFilterChange(next: StatusPageFilters) {
    setCurrentPage(1)
    setUiFilters(next)
    if (isOngoing) {
      void load(next, 1)
      return
    }
    void loadResolvedPage(next, 1, { reset: true })
  }

  return (
    <Layout>
      <PageLoadOverlay show={busy} label="Loading entries…" />
      <div className="flex min-w-0 flex-col gap-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-white">{title}</div>
          <div className="mt-1.5 text-sm leading-relaxed text-white/52">
            All entries ·{' '}
            {isOngoing ? `${ongoingTotalCount} matching` : `${totalCount}`} entries
            {isOngoing ? ` · Page ${currentPage} of ${totalPages}` : ` · Page ${currentPage} of ${visiblePageCount}`}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={handleExport} disabled={!filteredRows.length}>
            <Download size={17} /> Export CSV
          </Button>
          <Button onClick={() => (isOngoing ? load(uiFilters, currentPage, { force: true }) : loadResolvedPage(uiFilters, currentPage, { force: true }))} disabled={busy}>
            <RefreshCw size={17} /> Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-visible">
      <EntriesFilterBar
        status={status}
        value={uiFilters}
        onChange={setUiFilters}
        onApply={() => {
          applyFilterChange(uiFilters)
        }}
        onClear={() => {
          applyFilterChange({
            platform: '',
            statusType: '',
            errorCategory: '',
            from: '',
            to: '',
            search: '',
            ageBucket: 'all',
          })
        }}
        busy={busy}
      />
      </div>

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/50">Active filters:</span>
          {uiFilters.platform ? (
            <button
              type="button"
              onClick={() => applyFilterChange({ ...uiFilters, platform: '' })}
              className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
            >
              Platform: {uiFilters.platform}
              <X size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}
          {uiFilters.statusType ? (
            <button
              type="button"
              onClick={() => applyFilterChange({ ...uiFilters, statusType: '' })}
              className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
            >
              Type: {uiFilters.statusType}
              <X size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}
          {isOngoing && uiFilters.ageBucket !== 'all' ? (
            <button
              type="button"
              onClick={() => applyFilterChange({ ...uiFilters, ageBucket: 'all' })}
              className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
            >
              Age: {uiFilters.ageBucket} days
              <X size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}
          {uiFilters.errorCategory ? (
            <button
              type="button"
              onClick={() => applyFilterChange({ ...uiFilters, errorCategory: '' })}
              className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
            >
              Error: {uiFilters.errorCategory}
              <X size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}
          {uiFilters.from || uiFilters.to ? (
            <button
              type="button"
              onClick={() => applyFilterChange({ ...uiFilters, from: '', to: '' })}
              className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
            >
              {uiFilters.from || '...'} to {uiFilters.to || '...'}
              <X size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}
          {uiFilters.search ? (
            <button
              type="button"
              onClick={() => applyFilterChange({ ...uiFilters, search: '' })}
              className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
            >
              Search: {uiFilters.search}
              <X size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              applyFilterChange({
                platform: '',
                statusType: '',
                errorCategory: '',
                from: '',
                to: '',
                search: '',
                ageBucket: 'all',
              })
            }
          >
            Clear all
          </Button>
        </div>
      ) : null}

      {loadError ? (
        <Card className="border-red-400/20 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-red-200">Couldn’t load entries</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-100/90">{loadError}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-white/[0.07]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.055] pb-4 pt-5">
          <CardTitle className="text-base">Entries</CardTitle>
          <Badge className="shrink-0">Latest first</Badge>
        </CardHeader>
        <CardContent className="min-w-0 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
          <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-white/[0.07] bg-black/10">
            <table className="w-full min-w-0 table-auto border-collapse text-left text-[13px] leading-snug">
              <thead className="bg-white/[0.025] text-[10px] font-semibold uppercase tracking-wider text-white/48">
                <tr>
                  <th className="w-[76px] whitespace-nowrap px-2 py-2">Date</th>
                  {isOngoing ? <th className="w-[44px] px-1.5 py-2">Age</th> : null}
                  <th className="w-[78px] px-2 py-2">Platform</th>
                  <th className="w-[72px] px-2 py-2">Status</th>
                  <th className="min-w-[100px] max-w-[200px] px-2 py-2">Type</th>
                  <th className="min-w-[100px] max-w-[200px] px-2 py-2">Error</th>
                  <th className="min-w-[88px] max-w-[160px] px-2 py-2">Client</th>
                  <th className="sticky right-[164px] z-10 w-[88px] border-l border-white/[0.08] bg-[var(--app-card)] px-2 py-2">
                    Moderator
                  </th>
                  <th className="sticky right-0 z-20 w-[164px] border-l border-white/[0.08] bg-[var(--app-card)] px-2 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r: any) => {
                  const allowEdit = !!user ? canEditEntry() : false
                  const fd = r.feedbackDate?.toDate?.()
                  const ageMs = isOngoing ? msSinceCreated(r.createdAt) : null
                  const ageLabel =
                    ageMs !== null ? formatAgingShort(ageMs) : '—'
                  const ageDays = ageMs !== null ? ageDaysElapsed(ageMs) : null
                  const tone = ageDays !== null ? agingToneFromDays(ageDays) : null

                  return (
                    <tr key={r.id} className="group border-t border-white/[0.045] hover:bg-white/[0.015]">
                      <td className="px-2 py-1.5 align-top tabular-nums text-white/75">
                        {fd ? format(fd, 'yyyy-MM-dd') : '—'}
                      </td>
                      {isOngoing ? (
                        <td className="px-1.5 py-1.5 align-top">
                          {ageMs !== null && tone ? (
                            <span
                              className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-tight ${agingBadgeClass(tone)}`}
                            >
                              {ageLabel}
                            </span>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      ) : null}
                      <td className="px-2 py-1.5 align-top">
                        <Badge className="max-w-full truncate border-skyish-500/30 bg-skyish-500/10 text-[11px]">
                          {r.platform}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <Badge className="border-white/15 bg-white/[0.06] text-[11px] text-white/85">{r.status ?? '—'}</Badge>
                      </td>
                      <td className="min-w-0 px-2 py-1.5 align-top text-white/72">
                        <div className="line-clamp-2 break-words" title={r.statusType ?? ''}>
                          {r.statusType ?? '—'}
                        </div>
                      </td>
                      <td className="min-w-0 px-2 py-1.5 align-top">
                        <ErrorCategoryDisplay errorCategory={r.errorCategory} policyType={r.policyType} />
                      </td>
                      <td className="min-w-0 truncate px-2 py-1.5 align-top text-white/88" title={r.clientUsername}>
                        {r.clientUsername}
                      </td>
                      <td className="sticky right-[164px] z-10 w-[88px] truncate border-l border-white/[0.08] bg-[var(--app-card)] px-2 py-1.5 align-top text-[12px] text-white/58 group-hover:bg-white/[0.03]" title={r.moderatorName}>
                        {r.moderatorName}
                      </td>
                      <td className="sticky right-0 z-20 w-[164px] border-l border-white/[0.08] bg-[var(--app-card)] px-1.5 py-1.5 align-middle group-hover:bg-white/[0.03]">
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          <Link to={`/entries/${r.id}`} className="shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                              <Eye size={14} /> View
                            </Button>
                          </Link>
                          <Link to={`/entries/${r.id}/edit`} className="shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" disabled={!allowEdit}>
                              <Pencil size={14} /> Edit
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!tableRows.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-white/50" colSpan={colCount}>
                      No entries in this status.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/50">Rows per page</span>
                <Select
                  className="w-[100px]"
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/55">
                  Page {currentPage} / {visiblePageCount} ({isOngoing ? ongoingTotalCount : totalCount} total)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  disabled={busy || currentPage <= 1}
                  onClick={() => {
                    if (isOngoing) {
                      void load(uiFilters, Math.max(1, currentPage - 1))
                      return
                    }
                    void loadResolvedPage(uiFilters, currentPage - 1)
                  }}
                >
                  <ChevronLeft size={18} /> Prev
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  disabled={busy || (isOngoing ? currentPage >= totalPages : !resolvedHasNext)}
                  onClick={() => {
                    if (isOngoing) {
                      void load(uiFilters, Math.min(totalPages, currentPage + 1))
                      return
                    }
                    void loadResolvedPage(uiFilters, currentPage + 1)
                  }}
                >
                  Next <ChevronRight size={18} />
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  )
}
