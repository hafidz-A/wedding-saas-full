import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { PALETTES, DEFAULT_PALETTE, themeBus } from "../config/themeTokens.js";

const Ctx = createContext(null);
const STORAGE_KEY = "galactic:palette";

export function ThemeProvider({ defaultPalette = DEFAULT_PALETTE, options, children }) {
  const [palette, setPaletteState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved && PALETTES[saved]) return saved;
    } catch {}
    return defaultPalette;
  });

  /* Sync to :root CSS vars AND themeBus (read by Three.js). */
  useEffect(() => {
    themeBus.set(palette);
    try { sessionStorage.setItem(STORAGE_KEY, palette); } catch {}
  }, [palette]);

  const setPalette = useCallback((name) => {
    if (!PALETTES[name]) return;
    setPaletteState(name);
  }, []);

  const value = {
    palette,
    setPalette,
    tokens: PALETTES[palette] || PALETTES[DEFAULT_PALETTE],
    options: options || Object.keys(PALETTES),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
