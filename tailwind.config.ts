import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050B1A',
          900: '#08112A',
          850: '#0A1533',
          800: '#0C1A3D',
          700: '#10224F',
        },
        skyish: {
          50: '#ECFFFB',
          100: '#D6FFF6',
          200: '#A7FCEB',
          300: '#6FF4DB',
          400: '#38E8C7',
          500: '#16C7A8',
          600: '#109C85',
          700: '#0B7565',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56,232,199,0.2), 0 18px 48px rgba(0,0,0,0.45)',
        card: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 20px 48px rgba(0,0,0,0.32)',
        sidebar: '0 0 0 1px rgba(148,163,184,0.1), 0 16px 40px rgba(0,0,0,0.38)',
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
