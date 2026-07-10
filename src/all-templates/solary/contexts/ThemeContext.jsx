import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { PALETTES, DEFAULT_PALETTE, themeBus, clearPaletteFromDOM } from "../config/themeTokens.js";
import { DEFAULT_DEVICE, isDeviceId } from "@/lib/preview/devicePresets";

const Ctx = createContext(null);
const STORAGE_KEY = "galactic:palette";
const DEVICE_STORAGE_KEY = "galactic:device";

export function ThemeProvider({ defaultPalette = DEFAULT_PALETTE, options, allowGuestSwitch = true, children }) {
  const [palette, setPaletteState] = useState(() => {
    if (allowGuestSwitch) {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved && PALETTES[saved]) return saved;
      } catch {}
    }
    return PALETTES[defaultPalette] ? defaultPalette : DEFAULT_PALETTE;
  });

  // Live-preview device frame (demo 🎨 "Tampilan"). Default desktop; saved
  // choice restored after mount.
  const [device, setDeviceState] = useState(DEFAULT_DEVICE);
  useEffect(() => {
    if (!allowGuestSwitch || typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem(DEVICE_STORAGE_KEY);
      if (isDeviceId(saved)) setDeviceState(saved);
    } catch {}
  }, [allowGuestSwitch]);
  // Persist inside the setter (not an effect): a mount effect would write the
  // 'desktop' default over the saved choice before restoring it — under React
  // StrictMode's double effect run, the second restore then reads the clobbered
  // value and the picked device reverts on reload.
  const setDevice = useCallback((d) => {
    if (!isDeviceId(d)) return;
    setDeviceState(d);
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(DEVICE_STORAGE_KEY, d); } catch {}
    }
  }, [allowGuestSwitch]);

  /* Sync to :root CSS vars AND themeBus (read by Three.js). */
  useEffect(() => {
    themeBus.set(palette);
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(STORAGE_KEY, palette); } catch {}
    }
  }, [palette, allowGuestSwitch]);

  /* Keep palette in sync if the couple's default changes (locked mode). */
  useEffect(() => {
    if (!allowGuestSwitch && PALETTES[defaultPalette]) setPaletteState(defaultPalette);
  }, [allowGuestSwitch, defaultPalette]);

  /* Scrub palette CSS vars on real SPA nav away (NOT on device-frame toggles —
     the scene used to clear these on its own unmount, which broke the static
     backdrop when switching to a device). Owned by the provider now. */
  useEffect(() => () => { try { clearPaletteFromDOM(); } catch {} }, []);

  const setPalette = useCallback((name) => {
    if (!PALETTES[name]) return;
    setPaletteState(name);
  }, []);

  const value = {
    palette,
    setPalette,
    device,
    setDevice,
    tokens: PALETTES[palette] || PALETTES[DEFAULT_PALETTE],
    options: options || Object.keys(PALETTES),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
