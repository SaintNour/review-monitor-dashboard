import React from 'react'
import { cn } from '../../lib/utils'

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }

export function Textarea({ className, label, hint, ...props }: Props) {
  return (
    <label className="block">
      {label ? <div className="mb-1.5 text-xs font-medium text-white/70">{label}</div> : null}
      <textarea
        className={cn(
          'min-h-[120px] w-full rounded-xl border border-white/[0.08] bg-[#0b1622] px-4 py-3 text-sm text-[#e5e7eb] placeholder:text-[#6b7280] outline-none transition-colors duration-150',
          'focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20',
          className,
        )}
        {...props}
      />
      {hint ? <div className="mt-1 text-xs text-white/45">{hint}</div> : null}
    </label>
  )
}
