/* ============================================================
   themeTokens.js — SATU SUMBER WARNA
   Dipakai bersama oleh CSS (via :root vars) DAN Three.js
   (atmosfer planet, glow, partikel, cahaya).

   2026-05-27: Migrated palettes ke neo-brutalist playful style
   (style-guide-add.html). Existing keys (cosmicPurple etc.) RETAINED
   supaya pageConfig section assignments tidak break, tapi VALUES
   diganti ke light themes (Lavender/Sunburst/Rose/Botanical).
   Labels juga di-update. The "cosmic" prefix stays as the legacy key.
   ============================================================ */

export const PALETTES = {
  /* ===== Dark Themes — match style-guide-addadd.html exactly ===== */
  cosmicDark: {
    id: "cosmicDark",
    label: "Cosmic Purple",
    bg:        "#06061a",
    bgSoft:    "#0e0c24",
    surface:   "rgba(14, 12, 36, 0.65)",
    fg:        "#ece5f6",
    fgMute:    "rgba(236, 229, 246, 0.72)",
    fgFaint:   "rgba(236, 229, 246, 0.45)",
    line:      "rgba(255, 255, 255, 0.08)",
    lineSoft:  "rgba(255, 255, 255, 0.04)",
    accent:    "#c19bff",
    accentRGB: "193 155 255",
    glow:      "#c19bff",
    sun:       "#f5c518",
    starColor: "#e8d3ff",
    mode:      "dark",
  },
  nebulaDark: {
    id: "nebulaDark",
    label: "Golden Nebula",
    bg:        "#0d0a07",
    bgSoft:    "#1a1410",
    surface:   "rgba(26, 20, 16, 0.65)",
    fg:        "#f8efd9",
    fgMute:    "rgba(248, 239, 217, 0.72)",
    fgFaint:   "rgba(248, 239, 217, 0.45)",
    line:      "rgba(255, 255, 255, 0.08)",
    lineSoft:  "rgba(255, 255, 255, 0.04)",
    accent:    "#e8b86a",
    accentRGB: "232 184 106",
    glow:      "#e8b86a",
    sun:       "#fff0c0",
    starColor: "#fff0c0",
    mode:      "dark",
  },
  roseDark: {
    id: "roseDark",
    label: "Rose Galaxy",
    bg:        "#100608",
    bgSoft:    "#1f0d12",
    surface:   "rgba(31, 13, 18, 0.65)",
    fg:        "#fae8ea",
    fgMute:    "rgba(250, 232, 234, 0.72)",
    fgFaint:   "rgba(250, 232, 234, 0.45)",
    line:      "rgba(255, 255, 255, 0.08)",
    lineSoft:  "rgba(255, 255, 255, 0.04)",
    accent:    "#f08aa6",
    accentRGB: "240 138 166",
    glow:      "#f08aa6",
    sun:       "#ffd8e0",
    starColor: "#ffd8e0",
    mode:      "dark",
  },
  emeraldDark: {
    id: "emeraldDark",
    label: "Emerald Void",
    bg:        "#04100b",
    bgSoft:    "#0c1f17",
    surface:   "rgba(12, 31, 23, 0.65)",
    fg:        "#e3f3ec",
    fgMute:    "rgba(227, 243, 236, 0.72)",
    fgFaint:   "rgba(227, 243, 236, 0.45)",
    line:      "rgba(255, 255, 255, 0.08)",
    lineSoft:  "rgba(255, 255, 255, 0.04)",
    accent:    "#7be0a9",
    accentRGB: "123 224 169",
    glow:      "#7be0a9",
    sun:       "#d3f7e1",
    starColor: "#d3f7e1",
    mode:      "dark",
  },

  /* ===== Light Themes — match style-guide-addadd.html exactly ===== */
  lavenderLight: {
    id: "lavenderLight",
    label: "Cosmic Lavender",
    bg:        "#e5dbf0",
    bgSoft:    "#d2c4e3",
    surface:   "rgba(255, 255, 255, 0.75)",
    fg:        "#1d0f3a",
    fgMute:    "#48396b",
    fgFaint:   "#7a6a9f",
    line:      "#1d0f3a",
    lineSoft:  "rgba(29, 15, 58, 0.08)",
    accent:    "#7D53DE",
    accentRGB: "125 83 222",
    glow:      "#7D53DE",
    sun:       "#e9b306",
    starColor: "#e9b306",
    mode:      "light",
  },
  sunburstLight: {
    id: "sunburstLight",
    label: "Solar Sunburst",
    bg:        "#eedfc8",
    bgSoft:    "#decbb0",
    surface:   "rgba(255, 255, 255, 0.78)",
    fg:        "#301700",
    fgMute:    "#613b14",
    fgFaint:   "#9c734c",
    line:      "#301700",
    lineSoft:  "rgba(48, 23, 0, 0.08)",
    accent:    "#d97706",
    accentRGB: "217 119 6",
    glow:      "#d97706",
    sun:       "#e11d48",
    starColor: "#e11d48",
    mode:      "light",
  },
  roseLight: {
    id: "roseLight",
    label: "Rose Orbit",
    bg:        "#ead5d8",
    bgSoft:    "#dab8bd",
    surface:   "rgba(255, 255, 255, 0.75)",
    fg:        "#3b0512",
    fgMute:    "#6e2637",
    fgFaint:   "#a66271",
    line:      "#3b0512",
    lineSoft:  "rgba(59, 5, 18, 0.08)",
    accent:    "#e64980",
    accentRGB: "230 73 128",
    glow:      "#e64980",
    sun:       "#d97706",
    starColor: "#d97706",
    mode:      "light",
  },
  botanicalLight: {
    id: "botanicalLight",
    label: "Botanical Earth",
    bg:        "#dceae0",
    bgSoft:    "#c4dcd0",
    surface:   "rgba(255, 255, 255, 0.78)",
    fg:        "#082618",
    fgMute:    "#2a523d",
    fgFaint:   "#65997d",
    line:      "#082618",
    lineSoft:  "rgba(8, 38, 24, 0.08)",
    accent:    "#0f9f8e",
    accentRGB: "15 159 142",
    glow:      "#0f9f8e",
    sun:       "#f43f5e",
    starColor: "#f43f5e",
    mode:      "light",
  },
};

// Aliases for legacy configurations and sessions
PALETTES.cosmicPurple    = PALETTES.lavenderLight;
PALETTES.goldenNebula    = PALETTES.sunburstLight;
PALETTES.roseGalaxy      = PALETTES.roseLight;
PALETTES.emeraldVoid     = PALETTES.botanicalLight;
PALETTES.sunriseSorbet   = PALETTES.nebulaDark;
PALETTES.mintBlossom     = PALETTES.emeraldDark;
PALETTES.velvetMidnight  = PALETTES.cosmicDark;

export const DEFAULT_PALETTE = "cosmicDark";

/* Write the active palette into :root as CSS variables so all CSS
   that uses var(--color-fg) etc. updates at once. Three.js code
   reads from `currentTokens` below. */
export function applyPaletteToDOM(name) {
  const p = PALETTES[name] || PALETTES[DEFAULT_PALETTE];
  if (typeof document === "undefined") return p;
  const r = document.documentElement.style;
  r.setProperty("--color-bg",        p.bg);
  r.setProperty("--color-bg-soft",   p.bgSoft);
  r.setProperty("--color-surface",   p.surface);
  r.setProperty("--color-fg",        p.fg);
  r.setProperty("--color-fg-mute",   p.fgMute);
  r.setProperty("--color-fg-faint",  p.fgFaint);
  r.setProperty("--color-line",      p.line);
  r.setProperty("--color-line-soft", p.lineSoft);
  r.setProperty("--color-accent",    p.accent);
  r.setProperty("--color-accent-soft", p.surface);
  r.setProperty("--color-glow",      p.accentRGB);
  r.setProperty("--color-glow-rgb",  p.accentRGB.replace(/ /g, ", "));
  r.setProperty("--color-star",      p.starColor);
  r.setProperty("--theme-mode",      p.mode);

  // Sync class on body (convert camelCase key to kebab-case)
  const body = document.body;
  if (body) {
    // Remove existing theme classes
    body.classList.forEach((cls) => {
      if (cls.startsWith("theme-")) {
        body.classList.remove(cls);
      }
    });
    const canonicalId = p.id || name;
    const kebabName = canonicalId.replace(/([A-Z])/g, "-$1").toLowerCase();
    body.classList.add(`theme-${kebabName}`);
  }
  return p;
}

/* Snapshot of the active palette readable from non-React code
   (Three.js scene). Updated by the ThemeProvider. */
export const themeBus = {
  current: PALETTES[DEFAULT_PALETTE],
  listeners: new Set(),
  set(name) {
    this.current = applyPaletteToDOM(name);
    this.listeners.forEach((fn) => fn(this.current));
  },
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
};
