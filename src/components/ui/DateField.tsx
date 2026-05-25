import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import { format, parse } from 'date-fns'
import { cn } from '../../lib/utils'

import 'react-day-picker/style.css'

type Props = {
  label?: string
  value: string
  onChange: (ymd: string) => void
  disabled?: boolean
  className?: string
}

function parseYmd(s: string): Date | undefined {
  if (!s?.trim()) return undefined
  try {
    const d = parse(s, 'yyyy-MM-dd', new Date())
    return isNaN(d.getTime()) ? undefined : d
  } catch {
    return undefined
  }
}

export function DateField({ label, value, onChange, disabled, className }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 })

  const selected = parseYmd(value)

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: Math.max(260, r.width) })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onScroll() {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left, width: Math.max(260, r.width) })
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <div className={cn('min-w-0', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-white/70">
          {label}
        </label>
      ) : null}
      <button
        id={id}
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-[#0b1622] px-4 text-left text-sm text-[#e5e7eb] outline-none transition-colors duration-150',
          'focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={selected ? 'text-[#e5e7eb]' : 'text-[#6b7280]'}>
          {selected ? format(selected, 'MMM d, yyyy') : 'Pick date'}
        </span>
        <span className="text-white/45" aria-hidden>
          ▾
        </span>
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className="rdp-portal-root fixed z-[100000] rounded-xl border border-white/[0.14] bg-[#0b1220] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.65)]"
              style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
            >
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={(d) => {
                  if (d) onChange(format(d, 'yyyy-MM-dd'))
                  setOpen(false)
                }}
                showOutsideDays
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
