'use client'

import { createContext, useContext, useMemo } from 'react'

const ThemeContext = createContext(null)

const DEFAULT_THEME = {
  colors: {
    coral: 'var(--color-coral)',
    gold: 'var(--color-gold)',
    emerald: 'var(--color-emerald)',
    purple: 'var(--color-purple)',
    sky: 'var(--color-sky)',
    cream: 'var(--color-cream)',
    charcoal: 'var(--color-charcoal)',
  },
  fonts: {
    display: 'var(--font-display)',
    body: 'var(--font-body)',
    script: 'var(--font-script)',
    serifSoft: 'var(--font-serif-soft)',
  },
}

export default function ThemeProvider({ children, theme }) {
  const value = useMemo(() => theme || DEFAULT_THEME, [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) return DEFAULT_THEME
  return ctx
}
