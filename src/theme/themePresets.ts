import type { BackgroundTheme } from './backgroundTheme'
import type { UserTheme } from './userTheme'

export type AppThemePreset = {
  id: string
  label: string
  description: string
  background: BackgroundTheme
  user: UserTheme
}

/** One-click looks: gradient + card/accent tokens */
export const THEME_PRESETS: AppThemePreset[] = [
  {
    id: 'dark-blue',
    label: 'Slate Teal',
    description: 'Unified cool accent (default)',
    background: {
      bgTop: '#070d18',
      bgMid: '#0a1220',
      bgBottom: '#060a12',
      glow1: 'rgba(56, 232, 199, 0.08)',
      glow2: 'rgba(22, 199, 168, 0.06)',
      selection: 'rgba(56, 232, 199, 0.28)',
    },
    user: {
      appBg: '#070d18',
      appCard: 'rgba(12, 18, 32, 0.92)',
      appBorder: 'rgba(148, 163, 184, 0.14)',
      appText: 'rgba(248, 250, 252, 0.96)',
      appMutedText: 'rgba(203, 213, 225, 0.62)',
      appAccent: '#38E8C7',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep purple-black',
    background: {
      bgTop: '#0a0612',
      bgMid: '#120a1c',
      bgBottom: '#080510',
      glow1: 'rgba(120, 80, 200, 0.14)',
      glow2: 'rgba(60, 40, 120, 0.12)',
      selection: 'rgba(167, 139, 250, 0.35)',
    },
    user: {
      appBg: '#0a0612',
      appCard: 'rgba(255,255,255,0.05)',
      appBorder: 'rgba(255,255,255,0.1)',
      appText: 'rgba(255,255,255,0.94)',
      appMutedText: 'rgba(255,255,255,0.58)',
      appAccent: '#a78bfa',
    },
  },
  {
    id: 'soft-dark',
    label: 'Soft Dark',
    description: 'Slightly lifted grays',
    background: {
      bgTop: '#0f1419',
      bgMid: '#151c24',
      bgBottom: '#0f1419',
      glow1: 'rgba(100, 140, 180, 0.1)',
      glow2: 'rgba(80, 100, 130, 0.08)',
      selection: 'rgba(130, 170, 220, 0.28)',
    },
    user: {
      appBg: '#0f1419',
      appCard: 'rgba(255,255,255,0.055)',
      appBorder: 'rgba(255,255,255,0.11)',
      appText: 'rgba(255,255,255,0.92)',
      appMutedText: 'rgba(255,255,255,0.6)',
      appAccent: '#5eead4',
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'High-contrast accent',
    background: {
      bgTop: '#020617',
      bgMid: '#0c1220',
      bgBottom: '#020617',
      glow1: 'rgba(34, 211, 238, 0.18)',
      glow2: 'rgba(52, 211, 153, 0.1)',
      selection: 'rgba(34, 211, 238, 0.35)',
    },
    user: {
      appBg: '#020617',
      appCard: 'rgba(255,255,255,0.06)',
      appBorder: 'rgba(34, 211, 238, 0.22)',
      appText: 'rgba(255,255,255,0.96)',
      appMutedText: 'rgba(226, 232, 240, 0.65)',
      appAccent: '#22d3ee',
    },
  },
]
