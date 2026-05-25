import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

export function PageLoadOverlay(props: { show: boolean; label?: string; className?: string }) {
  const { show, label = 'Loading…', className } = props
  if (!show) return null
  return (
    <div
      className={cn(
        'pointer-events-auto fixed inset-0 z-[50000] flex items-center justify-center bg-[#040814]/75 backdrop-blur-[2px]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1220]/95 px-8 py-6 shadow-2xl">
        <Loader2 className="h-9 w-9 animate-spin text-skyish-400" aria-hidden />
        <span className="text-sm font-medium text-white/85">{label}</span>
      </div>
    </div>
  )
}
