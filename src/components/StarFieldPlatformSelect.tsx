import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'

type Props = {
  label?: string
  /** Empty array = All platforms */
  value: string[]
  platformOptions: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  className?: string
}

export function StarFieldPlatformSelect({
  label,
  value,
  platformOptions,
  onChange,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })

  const isAll = value.length === 0

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
  }, [open])

  useEffect(() => {
    if (!open) return
    function sync() {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
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

  function selectAll() {
    onChange([])
    setOpen(false)
  }

  function togglePlatform(key: string) {
    if (value.length === 0) {
      onChange([key])
      return
    }
    const set = new Set(value)
    if (set.has(key)) set.delete(key)
    else set.add(key)
    onChange(Array.from(set).sort((a, b) => a.localeCompare(b)))
  }

  const menu =
    open && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        className="fixed z-[100000] max-h-[min(320px,calc(100vh-24px))] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#0b1220] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
        }}
      >
        <div
          role="option"
          aria-selected={isAll}
          onClick={() => selectAll()}
          className={cn(
            'cursor-pointer px-3 py-2.5 text-sm transition',
            isAll ? 'bg-skyish-500/15 text-white' : 'text-white hover:bg-white/[0.06]',
          )}
        >
          <span className="font-medium">All</span>
          <span className="ml-2 text-xs text-white/45">(all platforms)</span>
        </div>
        <div className="my-1 border-t border-white/[0.06]" />
        {platformOptions.map((p) => {
          const selected = !isAll && value.includes(p)
          return (
            <div
              key={p}
              role="option"
              aria-selected={selected}
              onClick={() => togglePlatform(p)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm text-white transition',
                selected ? 'bg-skyish-500/15' : 'hover:bg-white/[0.06]',
              )}
            >
              <span className="min-w-0 truncate">{p}</span>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px]',
                  selected ? 'border-skyish-400/50 bg-skyish-500/20 text-skyish-200' : 'border-white/20 text-transparent',
                )}
                aria-hidden
              >
                ✓
              </span>
            </div>
          )
        })}
      </div>
    ) : null

  return (
    <div ref={rootRef} className={cn('min-w-0', className)}>
      {label ? <div className="mb-1.5 text-xs font-medium text-white/70">{label}</div> : null}

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((s) => !s)}
        className={cn(
          'flex min-h-[2.75rem] w-full cursor-pointer items-start gap-2 rounded-xl border border-white/[0.08] bg-[rgb(15_23_42/0.92)] px-3 py-2 text-left text-sm outline-none transition',
          'focus:border-skyish-500/50 focus:ring-2 focus:ring-skyish-500/15',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <div className="min-w-0 flex-1">
          {isAll ? (
            <span className="text-white/90">All</span>
          ) : (
            <div className="flex min-w-0 flex-wrap gap-1">
              {value.map((p) => (
                <span
                  key={p}
                  className="max-w-full truncate rounded-md border border-white/12 bg-white/[0.08] px-2 py-0.5 text-xs text-white/95"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-white/45" aria-hidden>
          ▾
        </span>
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
