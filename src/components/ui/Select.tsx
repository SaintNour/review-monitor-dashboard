import React from 'react'
import { cn } from '../../lib/utils'

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }

export function Select({ className, label, children, ...props }: Props) {
  return (
    <label className="block">
      {label ? <div className="mb-1.5 text-xs font-medium text-white/70">{label}</div> : null}

      <div className="relative">
        <select
          style={{ colorScheme: 'dark' } as React.CSSProperties}
          className={cn(
            'h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-[#0b1622] px-4 pr-10 text-sm text-[#e5e7eb] outline-none transition-colors duration-150',
            'focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45"
          aria-hidden
        >
          ▾
        </span>
      </div>
    </label>
  )
}
