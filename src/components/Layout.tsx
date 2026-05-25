import React from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, Settings, Shield, Timer, CheckCheck, MessagesSquare } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../auth/AuthProvider'
import { BrandLogoBlock } from './BrandLogo'

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-2 text-[13px] font-medium leading-snug transition-colors duration-150',
          isActive
            ? 'border-l-2 border-[var(--app-accent)] bg-[var(--accent-soft)] text-[var(--app-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            : 'border-l-2 border-transparent text-[var(--app-muted-text)] hover:bg-white/[0.04] hover:text-[var(--app-text)]',
        )
      }
    >
      <Icon size={16} className="shrink-0 opacity-90" />
      {label}
    </NavLink>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth()

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto w-full max-w-[1540px] px-5 py-7 md:px-7 lg:px-9 md:py-9">
        <div className="flex w-full flex-col gap-6 md:flex-row md:items-start">
          <aside className="w-full shrink-0 md:sticky md:top-8 md:h-[calc(100vh-4rem)] md:w-[272px] md:self-start">
            <div
              className={cn(
                'flex h-full flex-col rounded-2xl border p-3.5 shadow-sidebar',
                'border-[var(--app-border)] bg-[var(--surface-sidebar)]',
              )}
            >
              <div className="border-b border-[var(--app-border)] pb-3">
                <BrandLogoBlock variant="sidebar" />
                <div className="mt-2.5 rounded-lg border border-[var(--app-border)] bg-white/[0.03] px-2.5 py-1.5 text-sm leading-relaxed">
                  <span className="font-medium text-[var(--app-text)]">{profile.displayName}</span>
                  <span className="mx-1.5 text-slate-500">·</span>
                  <span className="text-[var(--app-muted-text)]">{role}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--accent-ring)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-medium text-skyish-200/95">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--app-accent)] shadow-[0_0_6px_var(--app-accent)]" />
                  Demo mode — sample data only
                </div>
              </div>

              <nav className="mt-3 flex flex-1 flex-col gap-0.5">
                <NavItem to="/dashboard" icon={BarChart3} label="Dashboard" />
                <NavItem to="/entry" icon={ClipboardList} label="New Entry" />
                <NavItem to="/ongoing" icon={Timer} label="Ongoing" />
                <NavItem to="/resolved" icon={CheckCheck} label="Resolved" />
                <NavItem to="/social-media" icon={MessagesSquare} label="Social Media" />
                <NavItem to="/profile" icon={Settings} label="Settings" />
                {role === 'admin' ? <NavItem to="/admin/users" icon={Shield} label="Admin: Users" /> : null}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div
              className={cn(
                'min-w-0 w-full rounded-xl border shadow-card',
                'border-[var(--app-border)] bg-[var(--app-card)]',
              )}
            >
              <div className="min-w-0 p-5 md:p-6">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
