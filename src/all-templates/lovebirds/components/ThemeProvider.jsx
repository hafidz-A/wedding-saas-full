'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { applyTheme, clearTheme, isThemeName, DEFAULT_THEME_NAME, THEME_ORDER } from '../config/applyTheme.js'
import { DEFAULT_DEVICE, isDeviceId } from '@/lib/preview/devicePresets'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'lovebirds:theme'
const ORNAMENT_STORAGE_KEY = 'lovebirds:ornament'
const DEVICE_STORAGE_KEY = 'lovebirds:device'

const ORNAMENT_TYPES = ['birds', 'butterflies', 'perched']
const DEFAULT_ORNAMENT = 'birds'
const isOrnamentType = (t) => ORNAMENT_TYPES.includes(t)

/**
 * Drives the lovebirds invitation's GLOBAL theme + ornament type.
 *
 *   • `defaultPalette` — the couple's saved theme (config.theme.defaultPalette).
 *   • `defaultOrnament` — the couple's saved ornament (config.theme.ornamentType).
 *   • `allowGuestSwitch` — true in demo/preview: anyone may switch palette AND
 *     ornament live (persisted to sessionStorage). false on a published
 *     invitation: locked to the couple's saved defaults.
 *
 * Switching the palette writes CSS vars onto <body> via applyTheme(); sections
 * inherit them, so the whole card re-themes with no React re-render. The
 * ornament type lives in React state so <Ornaments> can react to it.
 */
export default function ThemeProvider({
  defaultPalette = DEFAULT_THEME_NAME,
  defaultOrnament = DEFAULT_ORNAMENT,
  allowGuestSwitch = false,
  children,
}) {
  const initial = isThemeName(defaultPalette) ? defaultPalette : DEFAULT_THEME_NAME
  const initialOrnament = isOrnamentType(defaultOrnament) ? defaultOrnament : DEFAULT_ORNAMENT

  const [theme, setThemeState] = useState(() => {
    if (allowGuestSwitch && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved && isThemeName(saved)) return saved
      } catch {}
    }
    return initial
  })

  const [ornamentType, setOrnamentState] = useState(() => {
    if (allowGuestSwitch && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(ORNAMENT_STORAGE_KEY)
        if (saved && isOrnamentType(saved)) return saved
      } catch {}
    }
    return initialOrnament
  })

  // Live-preview device frame (demo only). Starts 'desktop' on BOTH server and
  // first client render (it changes the rendered tree, so reading sessionStorage
  // in the initializer would cause a hydration mismatch); the saved choice is
  // restored in an effect after mount.
  const [device, setDeviceState] = useState(DEFAULT_DEVICE)
  useEffect(() => {
    if (!allowGuestSwitch || typeof window === 'undefined') return
    try {
      const saved = sessionStorage.getItem(DEVICE_STORAGE_KEY)
      if (isDeviceId(saved)) setDeviceState(saved)
    } catch {}
  }, [allowGuestSwitch])
  // Persist inside the setter (not an effect): a mount effect would write the
  // 'desktop' default over the saved choice before restoring it — under React
  // StrictMode's double effect run, the second restore then reads the clobbered
  // value and the picked device reverts on reload.
  const setDevice = useCallback((d) => {
    if (!isDeviceId(d)) return
    setDeviceState(d)
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(DEVICE_STORAGE_KEY, d) } catch {}
    }
  }, [allowGuestSwitch])

  // Apply palette to the DOM whenever the theme changes.
  useEffect(() => {
    applyTheme(theme)
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(STORAGE_KEY, theme) } catch {}
    }
  }, [theme, allowGuestSwitch])

  // On unmount (SPA nav away from the invitation) scrub the inline vars +
  // theme-* class off <body> so other routes don't inherit this palette.
  useEffect(() => () => clearTheme(), [])

  // Persist ornament choice in demo mode.
  useEffect(() => {
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(ORNAMENT_STORAGE_KEY, ornamentType) } catch {}
    }
  }, [ornamentType, allowGuestSwitch])

  // Locked mode: always follow the couple's saved defaults.
  useEffect(() => {
    if (!allowGuestSwitch) {
      setThemeState(initial)
      setOrnamentState(initialOrnament)
    }
  }, [allowGuestSwitch, initial, initialOrnament])

  const setTheme = useCallback((name) => {
    if (isThemeName(name)) setThemeState(name)
  }, [])

  const setOrnamentType = useCallback((type) => {
    if (isOrnamentType(type)) setOrnamentState(type)
  }, [])

  const value = { theme, setTheme, ornamentType, setOrnamentType, device, setDevice, options: THEME_ORDER }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return (
    useContext(ThemeContext) || {
      theme: DEFAULT_THEME_NAME,
      setTheme: () => {},
      ornamentType: DEFAULT_ORNAMENT,
      setOrnamentType: () => {},
      device: DEFAULT_DEVICE,
      setDevice: () => {},
      options: THEME_ORDER,
    }
  )
}
