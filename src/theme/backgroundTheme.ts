export type BackgroundTheme = {
  bgTop: string
  bgMid: string
  bgBottom: string
  glow1: string
  glow2: string
  selection: string
}

export const DEFAULT_BACKGROUND_THEME: BackgroundTheme = {
  bgTop: '#070d18',
  bgMid: '#0a1220',
  bgBottom: '#060a12',
  glow1: 'rgba(56, 232, 199, 0.08)',
  glow2: 'rgba(22, 199, 168, 0.06)',
  selection: 'rgba(56, 232, 199, 0.28)',
}

export const THEME_STORAGE_KEY = 'feedback_dashboard_background_theme_v2'

function safeParse(raw: string | null): BackgroundTheme | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    const keys = Object.keys(DEFAULT_BACKGROUND_THEME) as (keyof BackgroundTheme)[]
    for (const k of keys) {
      if (typeof obj?.[k] !== 'string') return null
    }
    return obj as BackgroundTheme
  } catch {
    return null
  }
}

export function loadBackgroundTheme(): BackgroundTheme {
  const saved = safeParse(localStorage.getItem(THEME_STORAGE_KEY))
  return saved ?? DEFAULT_BACKGROUND_THEME
}

export function saveBackgroundTheme(theme: BackgroundTheme) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
}

export function applyBackgroundTheme(theme: BackgroundTheme) {
  const root = document.documentElement
  root.style.setProperty('--bg-top', theme.bgTop)
  root.style.setProperty('--bg-mid', theme.bgMid)
  root.style.setProperty('--bg-bottom', theme.bgBottom)
  root.style.setProperty('--bg-glow-1', theme.glow1)
  root.style.setProperty('--bg-glow-2', theme.glow2)
  root.style.setProperty('--selection', theme.selection)
}
