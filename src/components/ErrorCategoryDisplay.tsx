import React from 'react'
import { cn } from '../lib/utils'
import { getErrorCategoryChartColor } from '../types'

/** Consistent error category text + color dot for tables and detail views. */
export function ErrorCategoryDisplay(props: {
  errorCategory?: string | null
  policyType?: string | null
  className?: string
  /** Text styles for the label line (default: muted for dense tables). */
  valueClassName?: string
}) {
  const { errorCategory, policyType, className, valueClassName } = props
  const raw = typeof errorCategory === 'string' && errorCategory.trim() ? errorCategory.trim() : 'None'
  const color = getErrorCategoryChartColor(raw)
  const policySuffix =
    raw.toLowerCase().startsWith('policies') && policyType ? ` · ${policyType}` : ''

  return (
    <div className={cn('flex min-w-0 items-start gap-2', className)}>
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className={cn('line-clamp-2 min-w-0 break-words text-white/72', valueClassName)}>
        {raw}
        {policySuffix}
      </div>
    </div>
  )
}
