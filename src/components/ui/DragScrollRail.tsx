import React, { useCallback, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

const DRAG_THRESHOLD_PX = 6

type DragScrollRailProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: React.ReactNode
}

/**
 * Horizontal scroll container with click-and-drag to scroll (grab cursor).
 * Preserves native wheel / trackpad scrolling on the element.
 */
export function DragScrollRail({ className, children, ...rest }: DragScrollRailProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [grabbing, setGrabbing] = useState(false)
  const dragStart = useRef<{ x: number; scroll: number } | null>(null)
  const dragEngaged = useRef(false)

  const endDrag = useCallback((el: HTMLDivElement | null) => {
    dragStart.current = null
    const wasDrag = dragEngaged.current
    dragEngaged.current = false
    setGrabbing(false)
    if (wasDrag && el) {
      const stop = (ev: Event) => {
        ev.preventDefault()
        ev.stopImmediatePropagation()
        el.removeEventListener('click', stop, true)
      }
      el.addEventListener('click', stop, true)
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const t = e.target as HTMLElement | null
    // Let clicks on chips/buttons/links work — only drag-scroll from empty track
    if (t?.closest('button, a, [role="button"], input, select, textarea, label')) return
    const el = ref.current
    if (!el) return
    dragStart.current = { x: e.clientX, scroll: el.scrollLeft }
    dragEngaged.current = false
    setGrabbing(true)
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !(e.buttons & 1)) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
      dragEngaged.current = true
    }
    if (dragEngaged.current) {
      el.scrollLeft = dragStart.current.scroll - dx
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
    endDrag(el)
  }

  const onLostPointerCapture = () => {
    endDrag(ref.current)
  }

  return (
    <div
      ref={ref}
      role="presentation"
      className={cn(
        'min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain',
        '[-ms-overflow-style:auto] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/22 [&::-webkit-scrollbar-track]:bg-transparent',
        grabbing ? 'cursor-grabbing select-none [&_button]:cursor-grabbing' : 'cursor-grab [&_button]:cursor-grab',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onLostPointerCapture}
      {...rest}
    >
      {children}
    </div>
  )
}
