export type UserTheme = {
  appBg: string
  appCard: string
  appBorder: string
  appText: string
  appMutedText: string
  appAccent: string
}

const DEFAULT_THEME: UserTheme = {
  appBg: '#070d18',
  appCard: 'rgba(12, 18, 32, 0.92)',
  appBorder: 'rgba(148, 163, 184, 0.14)',
  appText: 'rgba(248, 250, 252, 0.96)',
  appMutedText: 'rgba(203, 213, 225, 0.62)',
  appAccent: '#38e8c7',
}

const DEMO_UID = 'demo-admin'
const THEME_STORAGE_VERSION = 'v2'

function keyFor(uid: string) {
  return `theme:${THEME_STORAGE_VERSION}:${uid}`
}

export function loadUserTheme(uid: string): UserTheme {
  try {
    const raw = localStorage.getItem(keyFor(uid))
    if (!raw) return DEFAULT_THEME
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_THEME, ...parsed }
  } catch {
    return DEFAULT_THEME
  }
}

export function saveUserTheme(uid: string, theme: UserTheme) {
  localStorage.setItem(keyFor(uid), JSON.stringify(theme))
}

export function resetUserTheme(uid: string) {
  localStorage.removeItem(keyFor(uid))
}

export function applyUserTheme(theme: UserTheme) {
  const root = document.documentElement
  root.style.setProperty('--app-bg', theme.appBg)
  root.style.setProperty('--app-card', theme.appCard)
  root.style.setProperty('--app-border', theme.appBorder)
  root.style.setProperty('--app-text', theme.appText)
  root.style.setProperty('--app-muted-text', theme.appMutedText)
  root.style.setProperty('--app-accent', theme.appAccent)
}

export function bootTheme() {
  applyUserTheme(loadUserTheme(DEMO_UID))
}
