import React from 'react'
import { cn } from '../../lib/utils'

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }

export function Input({ className, label, hint, onFocus, onClick, ...props }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  function openDatePicker() {
    const el = inputRef.current
    if (!el || props.type !== 'date' || props.disabled) return
    try {
      ;(el as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
      if (document.activeElement !== el) el.focus()
    } catch {
      el.focus()
      el.click()
    }
  }

  return (
    <label className="block">
      {label ? <div className="mb-1.5 text-xs font-medium text-white/70">{label}</div> : null}
      <input
        ref={inputRef}
        className={cn(
          'h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b1622] px-4 text-sm text-[#e5e7eb] placeholder:text-[#6b7280] outline-none transition-colors duration-150',
          'focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20',
          className,
        )}
        {...props}
        onFocus={(e) => {
          onFocus?.(e)
          openDatePicker()
        }}
        onClick={(e) => {
          onClick?.(e)
          openDatePicker()
        }}
      />
      {hint ? <div className="mt-1 text-xs text-white/45">{hint}</div> : null}
    </label>
  )
}
