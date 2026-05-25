import React, { useState } from 'react'
import { cn } from '../lib/utils'

export const BRAND_LOGO_SRC = '/brand-logo.png'

type BrandLogoBlockProps = {
  variant?: 'sidebar' | 'auth'
  className?: string
  align?: 'start' | 'center'
}

export function BrandLogoBlock({ variant = 'sidebar', className, align = 'start' }: BrandLogoBlockProps) {
  const [missing, setMissing] = useState(false)
  const isAuth = variant === 'auth'

  return (
    <div
      className={cn(
        'flex flex-col',
        isAuth ? 'gap-3' : 'gap-2',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-xl',
          'border border-[var(--accent-ring)] bg-[var(--surface-raised)]',
          'px-3 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_24px_rgba(0,0,0,0.25)]',
          missing && 'border-dashed border-[var(--app-border)] bg-white/[0.02]',
        )}
      >
        {!missing ? (
          <img
            src={BRAND_LOGO_SRC}
            alt="Saed Nour"
            className={cn(
              'h-auto w-full max-w-full object-contain object-center',
              'drop-shadow-[0_2px_16px_rgba(56,232,199,0.15)]',
              isAuth ? 'min-h-[112px] max-h-[140px]' : 'min-h-[108px] max-h-[148px]',
            )}
            onError={() => setMissing(true)}
          />
        ) : (
          <div className="py-6 text-center">
            <div className="text-xl font-semibold tracking-tight text-[var(--app-text)]">Saed Nour</div>
            <div className="mt-1 text-xs font-medium text-[var(--app-muted-text)]">Feedback Dashboard</div>
          </div>
        )}
      </div>
    </div>
  )
}
