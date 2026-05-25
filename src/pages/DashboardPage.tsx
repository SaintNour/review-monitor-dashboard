import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Layout } from '../components/Layout'
import { PageLoadOverlay } from '../components/PageLoadOverlay'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Dropdown } from '../components/ui/Dropdown'
import { DragScrollRail } from '../components/ui/DragScrollRail'
import { DateField } from '../components/ui/DateField'
import { StarFieldPlatformSelect } from '../components/StarFieldPlatformSelect'
import { cn } from '../lib/utils'
import { fetchEntriesApi } from '../data/entries.api'
import { fetchDashboardMetricsApi, type DashboardMetricsApiResponse } from '../data/dashboard.api'
import { ERROR_CATEGORIES, getErrorCategoryChartColor } from '../types'
import { readCache, writeCache, isCacheFresh } from '../data/localCache'
import { getDashboardReviewsSnapshot, putDashboardReviewsSnapshot } from '../data/dashboardReviewsIdb'

type Review = {
  id: string
  platform?: string
  status?: string
  feedbackDate?: any

  // ✅ real schema
  ratingStars?: number
  errorCategory?: string

  // keep everything else
  [key: string]: any
}

type DashboardCachePayload = {
  /** Not stored in localStorage (quota); full snapshot is in IndexedDB. */
  reviews?: Review[]
  filters: {
    selectedPlatforms: string[]
    fromDate: string
    toDate: string
    starsFilter: string
    errorFilter: string
    starFieldPlatforms: string[]
    starFieldStars: string
    starFieldDate: string
  }
  metrics: {
    total: number
    avgStars: number
    resolvedTickets: number
    unresolved: number
    unresolvedOver7: number
  }
  charts: {
    platformDist: Array<{ key: string; value: number }>
    starsDist: Array<{ key: string; value: number }>
    errorsDist: Array<{ key: string; value: number }>
  }
  meta?: {
    lastFullSyncAt?: number
  }
}

const DASHBOARD_CACHE_KEY = 'dashboard-page'
const DASHBOARD_METRICS_CACHE_KEY_PREFIX = 'dashboard-metrics'
const DASHBOARD_METRICS_TTL_MS = 2 * 60_000
const DASHBOARD_LIST_TTL_MS = 10 * 60_000
/** Periodic full list reconcile even when counts match (deletes / edge cases). */
const DASHBOARD_FULL_RECONCILE_MS = 6 * 60 * 60_000

function dashboardMetricsCacheKey(filters: {
  selectedPlatforms: string[]
  fromDate: string
  toDate: string
  starsFilter: string
  errorFilter: string
}) {
  return `${DASHBOARD_METRICS_CACHE_KEY_PREFIX}:${JSON.stringify(filters)}`
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

function deserializeReview(row: Review): Review {
  return {
    ...row,
    feedbackDate: toIsoOrNull((row as any).feedbackDate) ?? (row as any).feedbackDate,
    createdAt: toIsoOrNull((row as any).createdAt) ?? (row as any).createdAt,
    updatedAt: toIsoOrNull((row as any).updatedAt) ?? (row as any).updatedAt,
  }
}

const PLATFORMS = [
  'All',
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
  'Trust pilot',
  'BBB',
  'Sitejabber',
  'Realreviews,io',
]

function toDateSafe(v: any): Date | null {
  if (!v) return null
  if (typeof v?.toDate === 'function') return v.toDate()
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function fmtInt(n: number) {
  return new Intl.NumberFormat().format(n)
}

function fmtDateYMD(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${yyyy}-${mm}-${dd}`
}

function csvEscape(v: any) {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'string' ? v : JSON.stringify(v)
  s = s.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim()
  if (s.includes('"')) s = s.replace(/"/g, '""')
  if (/[",]/.test(s)) s = `"${s}"`
  return s
}

function downloadCSV(rows: any[], filename: string) {
  if (!rows.length) return
  const keySet = new Set<string>()
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keySet.add(k)))
  const headers = Array.from(keySet)

  const body = rows.map((r) => headers.map((h) => csvEscape(r?.[h])).join(','))
  const csv = [headers.join(','), ...body].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getStars(r: Review): number | null {
  const n = Number((r as any).ratingStars)
  return Number.isFinite(n) ? n : null
}

function getErrorCategory(r: Review): string {
  const e = (r as any).errorCategory
  return (typeof e === 'string' && e.trim()) ? e.trim() : 'None'
}

// ---- Donut with hover highlight ----
function Donut({
  title,
  data,
  pickedKey,
  onPick,
  colorAt,
  legendMaxItems = 10,
}: {
  title: string
  data: { key: string; value: number }[]
  pickedKey: string
  onPick: (k: string) => void
  /** When set, slice color follows category key (e.g. Errors chart), not display order. */
  colorAt?: (key: string, index: number) => string
  legendMaxItems?: number
}) {
  // Ignore invalid/empty entries so they don't affect the chart.
  const clean = useMemo(
    () =>
      (data || [])
        .filter((d) => d && String(d.key || '').trim())
        .map((d) => ({ key: String(d.key), value: Number((d as any).value) }))
        .filter((d) => Number.isFinite(d.value) && d.value > 0),
    [data],
  )

  const total = clean.reduce((a, b) => a + b.value, 0)
  const defaultPalette = ['#14b8a6', '#15803d', '#b45309', '#991b1b', '#6d28d9', '#1d4ed8', '#0f766e', '#be123c', '#d946ef']
  const strokeColor = (key: string, i: number) =>
    colorAt ? colorAt(key, i) : defaultPalette[i % defaultPalette.length]

  const [hoverKey, setHoverKey] = useState<string | null>(null)

  let acc = 0
  const r = 52
  const cx = 70
  const cy = 70
  const stroke = 18
  const dash = 2 * Math.PI * r

  return (
    <div style={{ display: 'grid', gap: 10, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Filter: {pickedKey || 'All'}</div>
          <Button size="sm" variant="ghost" onClick={() => onPick('All')}>
            Clear
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ justifySelf: 'center' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
          {clean.map((d, i) => {
            const frac = total > 0 ? d.value / total : 0
            // Use remainder gap so slices sum to a full ring.
            const dashArray = `${dash * frac} ${dash * (1 - frac)}`
            const dashOffset = dash * (1 - acc)
            acc += frac

            const active = pickedKey !== 'All' && pickedKey ? d.key === pickedKey : false
            const hovered = hoverKey ? d.key === hoverKey : false

            const isFiltered = pickedKey !== 'All' && pickedKey
            const opacity = isFiltered ? (active || hovered ? 1 : 0.36) : hovered ? 1 : 0.86
            const strokeWidth = active || hovered ? stroke + 2 : stroke

            return (
            <motion.circle
              key={d.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={strokeColor(d.key, i)}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{
                transformOrigin: '70px 70px',
                transform: 'rotate(-90deg)',
                cursor: 'pointer',
              }}
              initial={false}
              animate={{ opacity }}
              transition={{ duration: 0.12 }}
              onMouseEnter={() => {
                setHoverKey(d.key)
              }}
              onMouseLeave={() => {
                setHoverKey(null)
              }}
              onClick={() => onPick(d.key)}
            />
          )
        })}

          <text x="70" y="72" textAnchor="middle" style={{ fill: 'white', fontSize: 13, fontWeight: 600, opacity: 0.98 }}>
            {fmtInt(total)}
          </text>
          <text x="70" y="89" textAnchor="middle" style={{ fill: 'white', fontSize: 10, opacity: 0.5 }}>
            total
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'grid', gap: 8 }}>
          {clean.slice(0, legendMaxItems).map((d, i) => {
            const active = pickedKey !== 'All' && pickedKey ? d.key === pickedKey : false
            const hovered = hoverKey ? d.key === hoverKey : false
            const isFiltered = pickedKey !== 'All' && pickedKey
            const opacity = isFiltered ? (active || hovered ? 1 : 0.58) : hovered ? 1 : 0.94

            return (
              <div
                key={d.key}
                onClick={() => onPick(d.key)}
                onMouseEnter={() => setHoverKey(d.key)}
                onMouseLeave={() => setHoverKey(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 12,
                  opacity,
                  cursor: 'pointer',
                  padding: '7px 10px',
                  borderRadius: 12,
                  background: active ? 'rgba(20,184,166,0.14)' : hovered ? 'rgba(255,255,255,0.055)' : 'transparent',
                  transition: 'background 120ms ease, opacity 120ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 13, height: 13, borderRadius: 999, background: strokeColor(d.key, i), flex: '0 0 auto' }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.9)' }}>
                    {d.key}
                  </span>
                </div>
                <div style={{ opacity: 0.9, color: 'rgba(255,255,255,0.94)', flex: '0 0 auto' }}>{fmtInt(d.value)}</div>
              </div>
            )
          })}

          {clean.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.7, padding: '6px 2px' }}>No data.</div>
          ) : null}
        </div>
      </div>

    </div>
  )
}

// ✅ named export (matches your project)
export function DashboardPage() {
  const nav = useNavigate()
  const useApi = true
  const cachedBootstrap = useMemo(() => readCache<DashboardCachePayload>(DASHBOARD_CACHE_KEY), [])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const lastSyncRef = useRef<number | null>(cachedBootstrap?.lastSyncAt ?? null)
  const lastFullSyncRef = useRef<number | null>(cachedBootstrap?.value?.meta?.lastFullSyncAt ?? null)
  const [apiMetrics, setApiMetrics] = useState<DashboardMetricsApiResponse | null>(null)

  /** Empty array = All platforms. Filters are not restored from cache so refresh = full dataset + no drill-down. */
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [fromDate, setFromDate] = useState<string>('') // yyyy-mm-dd
  const [toDate, setToDate] = useState<string>('') // yyyy-mm-dd

  const [starsFilter, setStarsFilter] = useState<string>('All')
  const [errorFilter, setErrorFilter] = useState<string>('All')

  /** Star Field: empty = All platforms */
  const [starFieldPlatforms, setStarFieldPlatforms] = useState<string[]>([])
  const [starFieldStars, setStarFieldStars] = useState<string>('')
  const [starFieldDate, setStarFieldDate] = useState<string>(() => fmtDateYMD(new Date()))

  useEffect(() => {
  }, [cachedBootstrap])

  useEffect(() => {
    const filterPayload = {
      selectedPlatforms,
      fromDate,
      toDate,
      starsFilter,
      errorFilter,
    }
    const metricsKey = dashboardMetricsCacheKey(filterPayload)
    async function loadMetrics() {
      setMetricsLoading(true)
      const cached = readCache<DashboardMetricsApiResponse>(metricsKey)
      if (cached?.value) {
        setApiMetrics(cached.value)
        if (isCacheFresh(cached.expiresAt)) {
          setMetricsLoading(false)
          return
        }
      }
      try {
        const next = await fetchDashboardMetricsApi(filterPayload)
        setApiMetrics(next)
        writeCache(metricsKey, next, DASHBOARD_METRICS_TTL_MS, Date.now())
      } catch {
        /* keep last cached metrics on failure */
      } finally {
        setMetricsLoading(false)
      }
    }
    void loadMetrics()
  }, [selectedPlatforms, fromDate, toDate, starsFilter, errorFilter])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = await fetchEntriesApi({
          filters: {
            platform: '',
            statusType: '',
            errorCategory: '',
            from: '',
            to: '',
            search: '',
            ageBucket: 'all',
          },
          page: 1,
          pageSize: 200,
        })
        const rows = (result.rows as Review[]).map((row) => deserializeReview(row))
        if (!cancelled) {
          setReviews(rows)
          lastSyncRef.current = Date.now()
          try {
            await putDashboardReviewsSnapshot(rows as unknown[])
          } catch {
            /* IndexedDB optional — dashboard still works from in-memory rows */
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cachedBootstrap])

  const filtered = useMemo(() => {
    const from = fromDate ? startOfDay(new Date(fromDate)) : null
    const to = toDate ? startOfDay(new Date(toDate)) : null

    return reviews.filter((r) => {
      if (selectedPlatforms.length > 0) {
        const rp = String(r.platform || '').trim()
        if (!selectedPlatforms.includes(rp)) return false
      }

      const d = toDateSafe((r as any).feedbackDate)
      if (from && d && startOfDay(d) < from) return false
      if (to && d && startOfDay(d) > to) return false

      if (starsFilter !== 'All') {
        const s = getStars(r)
        if (s === null) return false
        if (String(s) !== starsFilter) return false
      }

      if (errorFilter !== 'All') {
        const e = getErrorCategory(r)
        if (e !== errorFilter) return false
      }

      return true
    })
  }, [reviews, selectedPlatforms, fromDate, toDate, starsFilter, errorFilter])

  const computedKpis = useMemo(() => {
    const total = filtered.length
    const starVals = filtered.map(getStars).filter((x): x is number => x !== null)
    const avgStars = starVals.length ? starVals.reduce((a, b) => a + b, 0) / starVals.length : 0
    const resolvedTickets = filtered.filter((r) => String(r.status || '').toLowerCase() === 'resolved').length
    const unresolved = filtered.filter((r) => String(r.status || '').toLowerCase() !== 'resolved').length

    const now = new Date()
    const unresolvedOver7 = filtered.filter((r) => {
      if (String(r.status || '').toLowerCase() === 'resolved') return false
      const d = toDateSafe((r as any).feedbackDate)
      if (!d) return false
      return daysBetween(d, now) > 7
    }).length

    return { total, avgStars, resolvedTickets, unresolved, unresolvedOver7 }
  }, [filtered])
  const kpis = useMemo(() => {
    if (useApi && apiMetrics) {
      return {
        total: apiMetrics.total ?? 0,
        avgStars: apiMetrics.avgStars ?? 0,
        resolvedTickets: apiMetrics.resolved ?? 0,
        unresolved: apiMetrics.unresolved ?? apiMetrics.ongoing ?? 0,
        unresolvedOver7: apiMetrics.unresolvedOver7 ?? apiMetrics.aging?.['8+'] ?? 0,
      }
    }
    return computedKpis
  }, [useApi, apiMetrics, computedKpis])

  // distributions
  const computedPlatformDist = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((r) => {
      const k = (r.platform || 'Unknown').trim() || 'Unknown'
      map.set(k, (map.get(k) || 0) + 1)
    })
    const arr = Array.from(map.entries()).map(([key, value]) => ({ key, value }))
    arr.sort((a, b) => b.value - a.value)
    return arr
  }, [filtered])

  // ✅ B behavior: only show existing values
  const computedStarsDist = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((r) => {
      const s = getStars(r)
      if (s === null) return
      if (s === 0) return
      const k = String(s)
      map.set(k, (map.get(k) || 0) + 1)
    })
    const arr = Array.from(map.entries()).map(([key, value]) => ({ key, value }))
    arr.sort((a, b) => Number(a.key) - Number(b.key))
    return arr
  }, [filtered])

  const computedErrorsDist = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((r) => {
      const k = getErrorCategory(r)
      map.set(k, (map.get(k) || 0) + 1)
    })
    const arr = Array.from(map.entries()).map(([key, value]) => ({ key, value }))
    arr.sort((a, b) => b.value - a.value)
    return arr
  }, [filtered])
  const platformDist = useMemo(() => {
    if (useApi && apiMetrics) return apiMetrics.byPlatform ?? []
    return computedPlatformDist
  }, [useApi, apiMetrics, computedPlatformDist])
  const starsDist = useMemo(() => {
    if (useApi && apiMetrics) return apiMetrics.byRating ?? []
    return computedStarsDist
  }, [useApi, apiMetrics, computedStarsDist])
  const errorsDist = useMemo(() => {
    if (useApi && apiMetrics) return apiMetrics.byError ?? []
    return computedErrorsDist
  }, [useApi, apiMetrics, computedErrorsDist])

  const starFieldPlatformKeys = useMemo(() => {
    return Array.from(new Set(filtered.map((r) => ((r.platform || 'Unknown') as string).trim() || 'Unknown'))).sort()
  }, [filtered])

  const starFieldStarsOptions = useMemo(() => {
    const keys = Array.from(
      new Set(
        filtered
          .map((r) => getStars(r))
          .filter((n): n is number => n !== null && n > 0)
          .map((n) => String(n)),
      ),
    ).sort((a, b) => Number(a) - Number(b))
    return [{ value: '', label: 'All' }, ...keys.map((k) => ({ value: k, label: `${k}★` }))]
  }, [filtered])

  const starFieldRows = useMemo(() => {
    const target = startOfDay(new Date(`${starFieldDate}T00:00:00`))
    if (isNaN(target.getTime())) return []
    const map = new Map<string, { dateKey: string; platform: string; stars: number; count: number }>()

    filtered.forEach((r) => {
      const d = toDateSafe((r as any).feedbackDate)
      if (!d) return
      const sd = startOfDay(d)
      if (sd.getTime() !== target.getTime()) return

      const platformKey = ((r.platform || 'Unknown') as string).trim() || 'Unknown'
      if (starFieldPlatforms.length > 0 && !starFieldPlatforms.includes(platformKey)) return

      const s = getStars(r)
      if (s === null || s <= 0) return
      if (starFieldStars && starFieldStars !== 'All' && String(s) !== starFieldStars) return

      const dateKey = sd.toISOString().slice(0, 10)
      const key = `${platformKey}|${s}`
      const cur = map.get(key) || { dateKey, platform: platformKey, stars: s, count: 0 }
      cur.count += 1
      map.set(key, cur)
    })

    const rows = Array.from(map.values())
    rows.sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1
      if (a.count !== b.count) return b.count - a.count
      return a.platform.localeCompare(b.platform)
    })
    return rows
  }, [filtered, starFieldPlatforms, starFieldStars, starFieldDate])

  const starFieldByPlatform = useMemo(() => {
    const map = new Map<string, { stars: number; count: number }[]>()
    for (const r of starFieldRows) {
      if (!map.has(r.platform)) map.set(r.platform, [])
      map.get(r.platform)!.push({ stars: r.stars, count: r.count })
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => b.stars - a.stars)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [starFieldRows])

  // aging
  const computedAging = useMemo(() => {
    const now = new Date()
    const a = { '0-3': 0, '4-7': 0, '8+': 0 }
    filtered.forEach((r) => {
      if (String(r.status || '').toLowerCase() === 'resolved') return
      const d = toDateSafe((r as any).feedbackDate)
      if (!d) return
      const diff = daysBetween(d, now)
      if (diff <= 3) a['0-3']++
      else if (diff <= 7) a['4-7']++
      else a['8+']++
    })
    return a
  }, [filtered])
  const aging = useMemo(() => {
    if (useApi && apiMetrics?.aging) {
      const a = apiMetrics.aging
      return {
        '0-3': Math.max(0, Number(a['0-3']) || 0),
        '4-7': Math.max(0, Number(a['4-7']) || 0),
        '8+': Math.max(0, Number(a['8+']) || 0),
      }
    }
    return computedAging
  }, [useApi, apiMetrics, computedAging])

  function setPresetDays(days: number) {
    const now = new Date()
    const to = startOfDay(now)
    const from = startOfDay(new Date(now.getTime() - days * 24 * 60 * 60 * 1000))
    setFromDate(from.toISOString().slice(0, 10))
    setToDate(to.toISOString().slice(0, 10))
  }
  function clearDates() {
    setFromDate('')
    setToDate('')
  }

  function exportAll() {
    downloadCSV(reviews, `dashboard_all_${new Date().toISOString().slice(0, 10)}.csv`)
  }
  function exportFiltered() {
    downloadCSV(filtered, `dashboard_filtered_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function navigateToOngoingWithFilters(ageBucket: '0-3' | '4-7' | '8+') {
    const params = new URLSearchParams()
    params.set('age', ageBucket)
    if (selectedPlatforms.length === 1) params.set('platform', selectedPlatforms[0])
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (errorFilter !== 'All') params.set('errorCategory', errorFilter)
    nav(`/ongoing?${params.toString()}`)
  }

  function togglePlatformChip(p: string) {
    if (p === 'All') {
      setSelectedPlatforms([])
      return
    }
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return Array.from(next)
    })
  }

  // dropdown options
  const starOptions = useMemo(() => {
    const keys = Array.from(new Set(starsDist.map((x) => x.key))).sort((a, b) => Number(a) - Number(b))
    return [{ value: 'All', label: 'All' }, ...keys.map((k) => ({ value: k, label: k }))]
  }, [starsDist])

  const errorOptions = useMemo(() => {
    const fromData = errorsDist.map((x) => x.key)
    const keys = Array.from(new Set([...ERROR_CATEGORIES, ...fromData])).sort((a, b) =>
      a.localeCompare(b),
    )
    return [{ value: 'All', label: 'All' }, ...keys.map((k) => ({ value: k, label: k }))]
  }, [errorsDist])

  useEffect(() => {
    // Keep localStorage small: metrics/charts + sync metadata only. Full rows live in IndexedDB (see load effect).
    const payload: DashboardCachePayload = {
      reviews: [],
      filters: {
        selectedPlatforms,
        fromDate,
        toDate,
        starsFilter,
        errorFilter,
        starFieldPlatforms,
        starFieldStars,
        starFieldDate,
      },
      metrics: kpis,
      charts: { platformDist, starsDist, errorsDist },
      meta: {
        lastFullSyncAt: lastFullSyncRef.current ?? undefined,
      },
    }
    writeCache(
      DASHBOARD_CACHE_KEY,
      payload,
      reviews.length ? DASHBOARD_LIST_TTL_MS : DASHBOARD_METRICS_TTL_MS,
      lastSyncRef.current ?? undefined,
    )
  }, [
    reviews,
    selectedPlatforms,
    fromDate,
    toDate,
    starsFilter,
    errorFilter,
    starFieldPlatforms,
    starFieldStars,
    starFieldDate,
    kpis,
    platformDist,
    starsDist,
    errorsDist,
  ])

  return (
    <Layout>
      <PageLoadOverlay show={loading} label="Loading dashboard…" />
      <div className="flex min-w-0 flex-col gap-9">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          </div>
          <div className="text-sm text-white/50">
            {loading || metricsLoading
              ? '—'
              : useApi
                ? `${fmtInt(kpis.total)} total from metrics API`
                : `${fmtInt(filtered.length)} filtered / ${fmtInt(reviews.length)} total`}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-white/55">Total Reviews</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-white md:text-2xl">{fmtInt(kpis.total)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-white/55">Avg Rating</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-white md:text-2xl">
                {(Number.isFinite(kpis.avgStars) ? kpis.avgStars : 0).toFixed(2)} ★
              </div>
            </CardContent>
          </Card>
          <Card className="border-skyish-500/20 bg-skyish-500/[0.05]">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-skyish-200/90">Resolved tickets</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-skyish-100 md:text-2xl">{fmtInt(kpis.resolvedTickets)}</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/25 bg-red-500/[0.06]">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-red-300/90">Unresolved</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-red-200 md:text-2xl">{fmtInt(kpis.unresolved)}</div>
            </CardContent>
          </Card>
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="text-xs text-white/55">Unresolved &gt; 7 days</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-white md:text-2xl">{fmtInt(kpis.unresolvedOver7)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Global filter */}
        <Card className="overflow-visible">
          <CardContent className="grid w-full min-w-0 gap-4 overflow-visible p-4 md:p-5">
            {/* Row 1: PLATFORM + chips */}
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/45 sm:w-[5.5rem]">
                Platform
              </span>
              <DragScrollRail className="min-w-0 w-full sm:flex-1">
                <div className="flex w-max min-w-0 flex-nowrap items-center gap-2 px-0.5 pb-1">
                  {PLATFORMS.map((p) => {
                    const active =
                      p === 'All' ? selectedPlatforms.length === 0 : selectedPlatforms.includes(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        className={cn(
                          'shrink-0 cursor-pointer select-none whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[13px] text-white transition-[background-color,border-color,color,opacity] duration-150 ease-out',
                          active
                            ? 'border-skyish-400/45 bg-skyish-500/10 text-white'
                            : 'border-white/12 bg-transparent hover:border-white/18 hover:bg-white/[0.045]',
                        )}
                        onClick={() => togglePlatformChip(p)}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </DragScrollRail>
            </div>

            {/* Row 2: date presets */}
            <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-4">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 transition-colors duration-150 ease-out hover:border-white/15 hover:bg-white/[0.08]"
                onClick={() => setPresetDays(7)}
              >
                Last 7d
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 transition-colors duration-150 ease-out hover:border-white/15 hover:bg-white/[0.08]"
                onClick={() => setPresetDays(30)}
              >
                Last 30d
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 transition-colors duration-150 ease-out hover:border-white/15 hover:bg-white/[0.08]"
                onClick={() => setPresetDays(90)}
              >
                Last 90d
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 transition-colors duration-150 ease-out hover:border-white/15 hover:bg-white/[0.08]"
                onClick={clearDates}
              >
                Clear dates
              </Button>
            </div>

            {/* Row 3: Stars, Errors, From, To + downloads (right) */}
            <div className="flex w-full min-w-0 flex-col gap-3 border-t border-white/[0.06] pt-4 lg:flex-row lg:items-end lg:gap-4">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
                <div className="min-w-0 max-w-full sm:max-w-none xl:max-w-[11rem]">
                  <Dropdown label="Stars" value={starsFilter} options={starOptions} onChange={setStarsFilter} />
                </div>
                <div className="min-w-0 max-w-full sm:max-w-none xl:max-w-[11rem]">
                  <Dropdown label="Errors" value={errorFilter} options={errorOptions} onChange={setErrorFilter} />
                </div>
                <DateField label="From" value={fromDate} onChange={setFromDate} />
                <DateField label="To" value={toDate} onChange={setToDate} />
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:ml-auto lg:pb-0.5">
                <Button size="sm" className="h-9 shrink-0" onClick={exportAll}>
                  Download (All)
                </Button>
                <Button size="sm" variant="ghost" className="h-9 shrink-0" onClick={exportFiltered}>
                  Download (Filtered)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Star Field */}
        <Card className="overflow-visible">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Star Field</CardTitle>
              <div className="text-xs text-white/55">Counts for the selected calendar day</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0 lg:max-w-[min(100%,20rem)]">
                  <StarFieldPlatformSelect
                    label="Platform"
                    value={starFieldPlatforms}
                    platformOptions={starFieldPlatformKeys}
                    onChange={setStarFieldPlatforms}
                  />
                </div>
                <div className="min-w-0 lg:max-w-[13rem]">
                  <Dropdown
                    label="Stars"
                    value={starFieldStars}
                    options={starFieldStarsOptions}
                    placeholder="All"
                    onChange={setStarFieldStars}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
                  <span className="text-xs font-medium text-white/70">Day</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-11 shrink-0 px-3"
                      onClick={() => {
                        const d = startOfDay(new Date(`${starFieldDate}T00:00:00`))
                        d.setDate(d.getDate() - 1)
                        setStarFieldDate(fmtDateYMD(d))
                      }}
                    >
                      ←
                    </Button>
                    <div className="min-w-0 flex-1">
                      <DateField value={starFieldDate} onChange={setStarFieldDate} />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-11 shrink-0 px-3"
                      onClick={() => {
                        const d = startOfDay(new Date(`${starFieldDate}T00:00:00`))
                        d.setDate(d.getDate() + 1)
                        setStarFieldDate(fmtDateYMD(d))
                      }}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-end lg:pb-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9"
                  onClick={() => {
                    setStarFieldPlatforms([])
                    setStarFieldStars('')
                    setStarFieldDate(fmtDateYMD(new Date()))
                  }}
                >
                  Today
                </Button>
              </div>
            </div>

            <div className="divide-y divide-white/[0.055] rounded-xl border border-white/[0.07] bg-white/[0.015]">
              {starFieldByPlatform.length ? (
                starFieldByPlatform.map(([plat, rows]) => {
                  const positive = rows.filter((x) => x.count > 0)
                  if (!positive.length) return null
                  return (
                    <div key={plat} className="px-3 py-3 sm:px-4">
                      <div className="mb-2 text-sm font-semibold text-white/90">{plat}</div>
                      <div className="grid gap-0">
                        {positive.map(({ stars, count }, idx) => (
                          <div
                            key={stars}
                            className={cn(
                              'flex items-center justify-between gap-3 border-t border-white/[0.05] py-2 text-[13px]',
                              idx === 0 && 'border-t-0 pt-0',
                            )}
                          >
                            <span className="text-white/70">{stars} stars</span>
                            <span className="tabular-nums font-medium text-white">{fmtInt(count)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-white/50">No matching star activity for this day.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donuts row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <Card><CardContent style={{ padding: 14 }}>
            <Donut
              title="Platform"
              data={platformDist.slice(0, 10)}
              pickedKey={selectedPlatforms.length === 1 ? selectedPlatforms[0] : 'All'}
              onPick={(k) => setSelectedPlatforms(k === 'All' ? [] : [k])}
            />
          </CardContent></Card>

          <Card><CardContent style={{ padding: 14 }}>
            <Donut title="Stars" data={starsDist} pickedKey={starsFilter} onPick={(k) => setStarsFilter(k || 'All')} />
          </CardContent></Card>

          <Card><CardContent style={{ padding: 14 }}>
            <Donut
              title="Errors"
              data={errorsDist.slice(0, 10)}
              pickedKey={errorFilter}
              onPick={(k) => setErrorFilter(k || 'All')}
              colorAt={(key) => getErrorCategoryChartColor(key)}
              legendMaxItems={10}
            />
          </CardContent></Card>
        </div>

        {/* Aging Risk */}
        <Card>
          <CardHeader>
            <CardTitle>Unresolved Aging Risk</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: 10 }}>
            {(['0-3', '4-7', '8+'] as const).map((k) => {
              const v = Number(aging[k]) || 0
              const max = Math.max(
                1,
                Number(aging['0-3']) || 0,
                Number(aging['4-7']) || 0,
                Number(aging['8+']) || 0,
              )
              const pct = clamp(Number.isFinite(v / max) ? v / max : 0, 0, 1)
              const barColor = k === '0-3' ? '#34d399' : k === '4-7' ? '#fbbf24' : '#f87171'

              return (
                <button
                  key={k}
                  type="button"
                  className="w-full cursor-pointer rounded-xl border border-transparent bg-transparent p-0 text-left transition hover:border-white/[0.08] hover:bg-white/[0.03]"
                  onClick={() => navigateToOngoingWithFilters(k)}
                >
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.85 }}>
                      <div>{k} days</div>
                      <div>{fmtInt(v)} entries</div>
                    </div>

                    <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                        style={{ height: '100%', borderRadius: 999, background: barColor }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}