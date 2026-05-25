import React, { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../auth/AuthProvider'
import {
  applyBackgroundTheme,
  DEFAULT_BACKGROUND_THEME,
  loadBackgroundTheme,
  saveBackgroundTheme,
  type BackgroundTheme,
} from '../theme/backgroundTheme'
import { clearAllAppCache } from '../data/localCache'
import { THEME_PRESETS } from '../theme/themePresets'
import { applyUserTheme, saveUserTheme } from '../theme/userTheme'

export function ProfilePage() {
  const { profile, user } = useAuth()
  const [cacheMsg, setCacheMsg] = useState<string | null>(null)

  const [theme, setTheme] = useState<BackgroundTheme>(() => loadBackgroundTheme())

  useEffect(() => {
    applyBackgroundTheme(theme)
    saveBackgroundTheme(theme)
  }, [theme])

  function applyPreset(preset: (typeof THEME_PRESETS)[number]) {
    setTheme(preset.background)
    applyBackgroundTheme(preset.background)
    saveBackgroundTheme(preset.background)
    if (user?.uid) {
      saveUserTheme(user.uid, preset.user)
      applyUserTheme(preset.user)
    }
  }

  return (
    <Layout>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-white">Settings</div>
        <div className="mt-1.5 text-sm text-white/52">Theme + account options.</div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="text-xs text-white/55">Display name</div>
              <div className="mt-1 font-semibold">{profile?.displayName ?? '—'}</div>
              <div className="mt-3 text-xs text-white/55">Email</div>
              <div className="mt-1 font-semibold">{profile?.email ?? user?.email ?? '—'}</div>
              <div className="mt-3 text-xs text-white/55">Role</div>
              <div className="mt-1 font-semibold">{profile?.role ?? '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Background theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-white/55">Quick presets (one click)</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-left transition-colors duration-150 hover:border-white/16 hover:bg-white/[0.05]"
                >
                  <div className="text-sm font-semibold text-white">{p.label}</div>
                  <div className="mt-0.5 text-[11px] text-white/45">{p.description}</div>
                </button>
              ))}
            </div>

            <details className="rounded-xl border border-white/[0.07] bg-white/[0.015] px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-medium text-white/80">Custom theme (advanced)</summary>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-xs text-white/55">
                    Top
                    <input
                      type="color"
                      value={theme.bgTop}
                      onChange={(e) => setTheme((t) => ({ ...t, bgTop: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-white/5 p-2"
                    />
                  </label>

                  <label className="text-xs text-white/55">
                    Middle
                    <input
                      type="color"
                      value={theme.bgMid}
                      onChange={(e) => setTheme((t) => ({ ...t, bgMid: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-white/5 p-2"
                    />
                  </label>

                  <label className="text-xs text-white/55">
                    Bottom
                    <input
                      type="color"
                      value={theme.bgBottom}
                      onChange={(e) => setTheme((t) => ({ ...t, bgBottom: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-white/5 p-2"
                    />
                  </label>

                  <label className="text-xs text-white/55">
                    Selection highlight
                    <input
                      type="color"
                      value={rgbaToHex(theme.selection)}
                      onChange={(e) => setTheme((t) => ({ ...t, selection: hexToRgba(e.target.value, 0.35) }))}
                      className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-white/5 p-2"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-xs text-white/55">
                    Glow 1 (top-left)
                    <input
                      type="color"
                      value={rgbaToHex(theme.glow1)}
                      onChange={(e) => setTheme((t) => ({ ...t, glow1: hexToRgba(e.target.value, 0.22) }))}
                      className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-white/5 p-2"
                    />
                  </label>

                  <label className="text-xs text-white/55">
                    Glow 2 (top-right)
                    <input
                      type="color"
                      value={rgbaToHex(theme.glow2)}
                      onChange={(e) => setTheme((t) => ({ ...t, glow2: hexToRgba(e.target.value, 0.18) }))}
                      className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-white/5 p-2"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTheme(DEFAULT_BACKGROUND_THEME)}
                  >
                    Reset gradient
                  </Button>
                </div>
              </div>
            </details>

            <div className="text-xs text-white/45">
              Saved to this browser only (demo build).
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cached dashboard data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <p>
              Clears cached dashboard metadata in this browser. Demo data is generated in memory on each visit.
            </p>
            <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
              {cacheMsg ? (
                <p className="text-sm leading-relaxed text-white/65">{cacheMsg}</p>
              ) : (
                <span className="hidden sm:block" aria-hidden />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  void (async () => {
                    setCacheMsg(null)
                    const { localKeys } = await clearAllAppCache()
                    setCacheMsg(
                      localKeys
                        ? `Cleared ${localKeys} local key(s). Reloading…`
                        : 'Cache cleared. Reloading…',
                    )
                    window.setTimeout(() => window.location.reload(), 400)
                  })()
                }}
              >
                Clear cache and reload
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  )
}

function hexToRgba(hex: string, alpha: number) {
  const x = hex.replace('#', '')
  const r = parseInt(x.slice(0, 2), 16)
  const g = parseInt(x.slice(2, 4), 16)
  const b = parseInt(x.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function rgbaToHex(rgba: string) {
  const m = rgba.match(/rgba\((\d+),(\d+),(\d+),([0-9.]+)\)/i)
  if (!m) return '#5da1ff'
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(Number(m[1]))}${toHex(Number(m[2]))}${toHex(Number(m[3]))}`
}
