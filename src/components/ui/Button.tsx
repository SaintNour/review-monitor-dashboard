import React from 'react'
import { cn } from '../../lib/utils'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  fullWidth?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  ...props
}: Props) {
  const base =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-center text-sm font-semibold leading-none tracking-tight transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skyish-400/30 active:scale-[0.99] disabled:pointer-events-none disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap'

  const variants: Record<string, string> = {
    primary:
      'bg-[var(--app-accent-strong)] text-slate-950 shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:bg-[var(--app-accent)] disabled:border-white/[0.08] disabled:bg-white/[0.05] disabled:text-white/40 disabled:shadow-none',
    secondary:
      'border-white/[0.14] bg-white/[0.07] text-white/92 hover:border-white/[0.2] hover:bg-white/[0.11] disabled:border-white/[0.06] disabled:bg-transparent disabled:text-white/35',
    ghost:
      'border-white/[0.1] bg-white/[0.04] text-white/88 hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-white disabled:border-white/[0.06] disabled:bg-transparent disabled:text-white/35',
    danger:
      'border-red-500/30 bg-red-600/90 text-white hover:bg-red-500 disabled:border-red-500/15 disabled:bg-red-950/40 disabled:text-white/40',
  }

  const sizes: Record<string, string> = {
    sm: 'h-9 min-h-9 px-4 text-xs',
    md: 'h-11 min-h-11 px-5 text-sm',
  }

  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
}
