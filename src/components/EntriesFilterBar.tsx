import React from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { DateField } from './ui/DateField'
import {
  ERROR_CATEGORIES,
  ONGOING_TYPES,
  PLATFORMS,
  RESOLVED_TYPES,
  SOCIAL_MEDIA_TYPES,
  type OngoingAgeFilter,
  type ReviewStatus,
  type ErrorCategory,
  type StatusType,
} from '../types'

export type StatusPageFilters = {
  platform: string
  statusType: StatusType | ''
  errorCategory: ErrorCategory | ''
  from: string
  to: string
  search: string
  /** Client-side filter on Ongoing page only. */
  ageBucket: OngoingAgeFilter
}

function statusTypeOptions(status: ReviewStatus) {
  if (status === 'Ongoing') return ONGOING_TYPES
  if (status === 'Resolved') return RESOLVED_TYPES
  if (status === 'Social Media') return SOCIAL_MEDIA_TYPES
  return []
}

export function EntriesFilterBar(props: {
  status: ReviewStatus
  value: StatusPageFilters
  onChange: (next: StatusPageFilters) => void
  onApply: () => void
  onClear: () => void
  busy?: boolean
  className?: string
}) {
  const { status, value, onChange, onApply, onClear, busy, className } = props
  const options = statusTypeOptions(status)
  const showAge = status === 'Ongoing'

  return (
    <div
      className={cn(
        'overflow-visible rounded-2xl border border-white/[0.09] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        className,
      )}
    >
      <div
        className={
          showAge
            ? 'grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-8'
            : 'grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-7'
        }
      >
        <Select
          label="Platform"
          value={value.platform}
          onChange={(e) => onChange({ ...value, platform: e.target.value })}
        >
          <option value="">All</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        <Select
          label="Status Type"
          value={value.statusType as any}
          onChange={(e) => onChange({ ...value, statusType: e.target.value as any })}
        >
          <option value="">All</option>
          {options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select
          label="Error"
          value={value.errorCategory as any}
          onChange={(e) => onChange({ ...value, errorCategory: e.target.value as any })}
        >
          <option value="">All</option>
          {ERROR_CATEGORIES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>

        {showAge ? (
          <Select
            label="Age (created)"
            value={value.ageBucket}
            onChange={(e) => onChange({ ...value, ageBucket: e.target.value as OngoingAgeFilter })}
          >
            <option value="all">All</option>
            <option value="0-3">0–3 days</option>
            <option value="4-7">4–7 days</option>
            <option value="8+">8+ days</option>
          </Select>
        ) : null}

        <DateField label="From" value={value.from} onChange={(v) => onChange({ ...value, from: v })} />

        <DateField label="To" value={value.to} onChange={(v) => onChange({ ...value, to: v })} />

        <Input
          label="Search"
          placeholder="client / order# / text"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />

        <div className="flex items-end justify-end gap-2 lg:col-span-1">
          <Button
            type="button"
            size="sm"
            className="h-9 w-9 shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-500/15 p-0 text-emerald-300 hover:bg-emerald-500/25"
            onClick={onApply}
            disabled={busy}
            title="Apply filters"
            aria-label="Apply filters"
          >
            <Check size={16} strokeWidth={2.5} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-lg border border-rose-500/35 bg-rose-500/12 p-0 text-rose-300 hover:bg-rose-500/22"
            onClick={onClear}
            disabled={busy}
            title="Clear filters"
            aria-label="Clear filters"
          >
            <X size={16} strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </div>
  )
}
