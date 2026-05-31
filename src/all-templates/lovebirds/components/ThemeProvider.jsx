'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { applyTheme, isThemeName, DEFAULT_THEME_NAME, THEME_ORDER } from '../config/applyTheme.js'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'lovebirds:theme'

/**
 * Drives the lovebirds invitation's GLOBAL theme.
 *
 *   • `defaultPalette` — the couple's saved theme (config.theme.defaultPalette).
 *   • `allowGuestSwitch` — true in demo/preview: anyone may switch (persisted to
 *     sessionStorage). false on a published invitation: locked to the default.
 *
 * Switching writes CSS vars onto <body> via applyTheme(); sections inherit them,
 * so the whole card re-themes with no React re-render.
 */
export default function ThemeProvider({
  defaultPalette = DEFAULT_THEME_NAME,
  allowGuestSwitch = false,
  children,
}) {
  const initial = isThemeName(defaultPalette) ? defaultPalette : DEFAULT_THEME_NAME

  const [theme, setThemeState] = useState(() => {
    if (allowGuestSwitch && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved && isThemeName(saved)) return saved
      } catch {}
    }
    return initial
  })

  // Apply to the DOM whenever the theme changes.
  useEffect(() => {
    applyTheme(theme)
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(STORAGE_KEY, theme) } catch {}
    }
  }, [theme, allowGuestSwitch])

  // Locked mode: always follow the couple's saved default.
  useEffect(() => {
    if (!allowGuestSwitch) setThemeState(initial)
  }, [allowGuestSwitch, initial])

  const setTheme = useCallback((name) => {
    if (isThemeName(name)) setThemeState(name)
  }, [])

  const value = { theme, setTheme, options: THEME_ORDER }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext) || { theme: DEFAULT_THEME_NAME, setTheme: () => {}, options: THEME_ORDER }
}
