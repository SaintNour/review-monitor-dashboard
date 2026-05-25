import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

type Option = { value: string; label: string }

type Props = {
  label?: string
  value: string
  options: Option[]
  placeholder?: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function Dropdown({
  label,
  value,
  options,
  placeholder = 'Select…',
  onChange,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value)
    return found ? found.label : ''
  }, [options, value])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [open])

  useEffect(() => {
    if (!open) return
    function sync() {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [open])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  const menu =
    open && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        className="fixed z-[100000] max-h-[min(260px,calc(100vh-24px))] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#0b1220] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          width: Math.max(menuPos.width, 160),
        }}
      >
        {options.map((o) => {
          const active = o.value === value
          return (
            <div
              key={o.value}
              role="option"
              aria-selected={active}
              onClick={() => pick(o.value)}
              className={cn(
                'cursor-pointer px-3 py-2.5 text-sm text-[#e5e7eb] transition-colors duration-150',
                active ? 'bg-skyish-500/15' : 'bg-transparent hover:bg-white/[0.06]',
              )}
            >
              {o.label}
            </div>
          )
        })}
      </div>
    ) : null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {label ? <div className="mb-1.5 text-xs font-medium text-white/70">{label}</div> : null}

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((s) => !s)}
        className={cn(
          'flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-[#0b1622] px-4 text-left text-sm text-[#e5e7eb] outline-none transition-colors duration-150',
          'focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={selectedLabel ? 'text-[#e5e7eb]' : 'text-[#6b7280]'}>{selectedLabel || placeholder}</span>
        <span className="text-white/45" aria-hidden>
          ▾
        </span>
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
