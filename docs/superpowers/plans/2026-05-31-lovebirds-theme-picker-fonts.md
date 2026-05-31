# Lovebirds Global Theme Picker + Font Swap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give lovebirds a runtime theme system (7 palettes) with a demo-only floating
switcher and an owner-only locked palette on published invitations, plus a global font swap
(Playfair Display / Plus Jakarta Sans / Sacramento) scoped to the lovebirds route.

**Architecture:** Mirror the proven solary pattern. A new `palettes.js` defines palettes
(each with a `base` layer + a dark `inverted` layer for the Hero) and an `applyPalette`
DOM-writer. An upgraded `ThemeProvider` (props `defaultPalette` + `allowGuestSwitch`) drives
it; `SectionRenderer` applies the active palette globally and the Hero gets the inverted set.
A `PaletteSwitcher` renders only in demo. The dashboard Palette tab + theme API are
generalized per-template.

**Tech Stack:** Next.js 14 (App Router), React 18, CSS Modules + CSS variables, vitest
(node env, `.test.ts` only — no DOM testing library, so component/CSS pieces are verified by
`npm run build` + a browser smoke check, and only pure logic is unit-tested).

**Spec:** `docs/superpowers/specs/2026-05-31-lovebirds-theme-picker-fonts-design.md`

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/all-templates/lovebirds/config/palettes.js` | `PALETTES` (7, base+inverted), `resolvePalette`, `applyPalette`, `paletteBus`, `DEFAULT_PALETTE`, `PALETTE_GROUPS` |
| Create | `src/all-templates/lovebirds/config/__tests__/palettes.test.ts` | Unit tests for palette resolution/shape |
| Create | `src/all-templates/lovebirds/components/PaletteSwitcher.jsx` | Floating demo theme picker |
| Create | `src/all-templates/lovebirds/components/PaletteSwitcher.module.css` | Switcher styling (cream/glass) |
| Create | `src/lib/config/palette-allowlist.ts` | `isPaletteAllowedForTemplate` (shared by API + tests) |
| Create | `src/lib/config/__tests__/palette-allowlist.test.ts` | Unit tests for the allowlist |
| Modify | `src/styles/fonts.css` | Add Playfair/Jakarta/Sacramento to the `@import` |
| Modify | `src/all-templates/lovebirds/styles/theme.css` | Scoped font overrides, base-var defaults, palette-driven `--page-bg` |
| Modify | `src/all-templates/lovebirds/components/ThemeProvider.jsx` | Solary-contract provider |
| Modify | `src/all-templates/lovebirds/renderers/SectionRenderer.jsx` | Apply active palette; Hero = inverted |
| Modify | `src/all-templates/lovebirds/Shell.jsx` | `isDemo` prop, ThemeProvider wiring, switcher |
| Modify | `src/all-templates/lovebirds/components/FloatingNavbar.module.css` | Active pill uses `--accent` |
| Modify | `src/app/[template]/[slug]/InvitationView.tsx` | Forward `isDemo` to LovebirdsShell |
| Modify | `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` | Show Palette tab for lovebirds; pass `template` |
| Modify | `src/app/[template]/[slug]/dashboard/PaletteTab.tsx` | Per-template palette list |
| Modify | `src/app/api/invitation/[slug]/theme/route.ts` | Per-template allowlist via helper |

Note on bracket paths in PowerShell: `git add` of files under `[template]`/`[slug]` needs
`$env:GIT_LITERAL_PATHSPECS=1` before the command (per project convention). Examples below
include it.

---

### Task 1: Load fonts + scope the global font swap to the lovebirds route

**Files:**
- Modify: `src/styles/fonts.css:1`
- Modify: `src/all-templates/lovebirds/styles/theme.css` (inside `body.lovebirds-route`)

- [ ] **Step 1: Add the three families to the font import**

Replace line 1 of `src/styles/fonts.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Sacramento&display=swap');
```

- [ ] **Step 2: Override the font vars inside the lovebirds route only**

In `src/all-templates/lovebirds/styles/theme.css`, inside the existing
`body.lovebirds-route { … }` rule (after the existing custom-property block, before the
closing brace), add:

```css
  /* ---------- Global font swap — scoped to the invitation card only ---------- */
  --font-display: 'Playfair Display', 'Cormorant Garamond', 'Times New Roman', serif;
  --font-body: 'Plus Jakarta Sans', 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
  --font-script: 'Sacramento', 'Great Vibes', cursive;
  /* --font-serif-soft (Kameron) intentionally left unchanged */
```

- [ ] **Step 3: Verify build + scoping**

Run: `npm run build`
Expected: compiles with no errors. (Visual confirmation that marketing/dashboard fonts are
unchanged happens in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add src/styles/fonts.css "src/all-templates/lovebirds/styles/theme.css"
git commit -m "feat(lovebirds): swap card fonts to Playfair/Jakarta/Sacramento (route-scoped)"
```

---

### Task 2: Palette definitions + resolver + bus (`palettes.js`) with tests

**Files:**
- Create: `src/all-templates/lovebirds/config/palettes.js`
- Create: `src/all-templates/lovebirds/config/__tests__/palettes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/all-templates/lovebirds/config/__tests__/palettes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  PALETTES, DEFAULT_PALETTE, resolvePalette, PALETTE_GROUPS,
} from '../palettes.js'

const REQUIRED_VARS = [
  '--page-bg', '--bg', '--fg', '--fg-muted', '--accent', '--accent-soft',
  '--glass-bg', '--glass-border', '--glass-text', '--button-bg', '--button-fg',
]

describe('lovebirds palettes', () => {
  it('has the 7 expected palettes', () => {
    expect(Object.keys(PALETTES).sort()).toEqual([
      'blossomVelvet', 'darkLuxury', 'emeraldGarden', 'midnightStardust',
      'skyEditorial', 'sunsetClay', 'warmCream',
    ])
  })

  it('default is warmCream and resolves to itself', () => {
    expect(DEFAULT_PALETTE).toBe('warmCream')
    expect(resolvePalette('warmCream').id).toBe('warmCream')
  })

  it('falls back to warmCream for an unknown name', () => {
    expect(resolvePalette('nope').id).toBe('warmCream')
    expect(resolvePalette(undefined).id).toBe('warmCream')
  })

  it('every palette defines all base + inverted vars, plus label/swatch/group', () => {
    for (const [key, p] of Object.entries(PALETTES)) {
      expect(p.id, key).toBe(key)
      expect(typeof p.label, key).toBe('string')
      expect(typeof p.swatch, key).toBe('string')
      expect(['light', 'dark'], key).toContain(p.group)
      for (const v of REQUIRED_VARS) {
        expect(p.base[v], `${key} base ${v}`).toBeTruthy()
        expect(p.inverted[v], `${key} inverted ${v}`).toBeTruthy()
      }
    }
  })

  it('inverted Hero is dark (charcoal/midnight bg) for every palette', () => {
    for (const [key, p] of Object.entries(PALETTES)) {
      expect(['#2A2118', '#1E222D'], key).toContain(p.inverted['--bg'])
    }
  })

  it('PALETTE_GROUPS lists every palette exactly once', () => {
    const all = [...PALETTE_GROUPS.light, ...PALETTE_GROUPS.dark].sort()
    expect(all).toEqual(Object.keys(PALETTES).sort())
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- palettes`
Expected: FAIL — `Cannot find module '../palettes.js'`.

- [ ] **Step 3: Create `palettes.js`**

Create `src/all-templates/lovebirds/config/palettes.js`:

```js
/* ============================================================================
   LOVEBIRDS PALETTES — runtime-swappable global themes.

   Each palette has two CSS-var layers:
     • base     → themes the body + most sections
     • inverted → dark/dramatic treatment applied to the Hero gate only
   `applyPalette(name)` writes the BASE layer onto body.lovebirds-route.
   SectionRenderer spreads `inverted` onto the Hero wrapper (see SectionRenderer).
   ============================================================================ */

// Warm cream ambient (the historical default body background).
const CREAM_PAGE =
  'radial-gradient(50% 38% at 50% 82%, rgba(232,85,62,0.18), transparent 70%),' +
  'radial-gradient(40% 32% at 12% 18%, rgba(245,200,66,0.18), transparent 70%),' +
  'radial-gradient(40% 32% at 88% 16%, rgba(45,140,78,0.11), transparent 70%),' +
  'radial-gradient(38% 28% at 8% 84%, rgba(107,53,168,0.11), transparent 70%),' +
  'radial-gradient(38% 28% at 92% 82%, rgba(61,155,193,0.11), transparent 70%),' +
  'linear-gradient(180deg, #FDF6EC 0%, #F7EBD7 100%)'

// Build the dark Hero "inverted" layer from a palette's accent identity.
function invertedSet(accent, accentSoft, family /* 'warm' | 'cool' */) {
  const dark = family === 'cool' ? '#1E222D' : '#2A2118'
  const light = family === 'cool' ? '#F5E5C9' : '#FDF6EC'
  const mute = family === 'cool' ? 'rgba(245,229,201,0.78)' : 'rgba(253,246,236,0.78)'
  return {
    '--page-bg': dark,
    '--bg': dark,
    '--fg': light,
    '--fg-muted': mute,
    '--accent': accent,
    '--accent-soft': accentSoft,
    '--glass-bg': 'rgba(255,255,255,0.10)',
    '--glass-border': 'rgba(255,255,255,0.18)',
    '--glass-text': light,
    '--button-bg': light,
    '--button-fg': dark,
  }
}

// Shared base for the light/cream-surfaced palettes.
function lightBase({ pageBg = CREAM_PAGE, fg = '#2A2118', fgMuted = '#5C4A3A', accent, accentSoft, buttonBg = '#2A2118', buttonFg = '#FDF6EC' }) {
  return {
    '--page-bg': pageBg,
    '--bg': 'transparent',
    '--fg': fg,
    '--fg-muted': fgMuted,
    '--accent': accent,
    '--accent-soft': accentSoft,
    '--glass-bg': 'rgba(255,255,255,0.55)',
    '--glass-border': 'rgba(255,255,255,0.45)',
    '--glass-text': fg,
    '--button-bg': buttonBg,
    '--button-fg': buttonFg,
  }
}

export const PALETTES = {
  warmCream: {
    id: 'warmCream', label: 'Warm Cream', group: 'light', swatch: '#E8553E',
    base: lightBase({ accent: '#E8553E', accentSoft: '#F4A38F' }),
    inverted: invertedSet('#E8553E', '#F4A38F', 'warm'),
  },
  emeraldGarden: {
    id: 'emeraldGarden', label: 'Emerald Garden', group: 'light', swatch: '#2D8C4E',
    base: lightBase({ accent: '#2D8C4E', accentSoft: '#8FCBA1' }),
    inverted: invertedSet('#2D8C4E', '#8FCBA1', 'warm'),
  },
  skyEditorial: {
    id: 'skyEditorial', label: 'Sky Editorial', group: 'light', swatch: '#3D9BC1',
    base: lightBase({ accent: '#3D9BC1', accentSoft: '#A8D5E3' }),
    inverted: invertedSet('#3D9BC1', '#A8D5E3', 'cool'),
  },
  blossomVelvet: {
    id: 'blossomVelvet', label: 'Blossom Velvet', group: 'light', swatch: '#E06B7B',
    base: lightBase({
      pageBg: 'linear-gradient(180deg, #FAF0EC 0%, #F2B6C1 100%)',
      fg: '#802B43', accent: '#E06B7B', accentSoft: '#F2B6C1',
      buttonBg: '#802B43', buttonFg: '#FAF0EC',
    }),
    inverted: invertedSet('#E06B7B', '#F2B6C1', 'warm'),
  },
  sunsetClay: {
    id: 'sunsetClay', label: 'Sunset Clay', group: 'light', swatch: '#C85A32',
    base: lightBase({
      pageBg: 'linear-gradient(180deg, #FAF2EA 0%, #EAD0A8 100%)',
      fg: '#C85A32', fgMuted: '#6E8268', accent: '#C85A32', accentSoft: '#EAD0A8',
      buttonBg: '#C85A32', buttonFg: '#FAF2EA',
    }),
    inverted: invertedSet('#C85A32', '#EAD0A8', 'warm'),
  },
  darkLuxury: {
    id: 'darkLuxury', label: 'Dark Luxury', group: 'dark', swatch: '#F5C842',
    base: {
      '--page-bg': '#2A2118',
      '--bg': '#2A2118',
      '--fg': '#FDF6EC',
      '--fg-muted': 'rgba(253,246,236,0.78)',
      '--accent': '#F5C842',
      '--accent-soft': '#FBE3A6',
      '--glass-bg': 'rgba(30,23,17,0.55)',
      '--glass-border': 'rgba(255,255,255,0.15)',
      '--glass-text': '#FDF6EC',
      '--button-bg': '#FDF6EC',
      '--button-fg': '#2A2118',
    },
    inverted: invertedSet('#F5C842', '#FBE3A6', 'warm'),
  },
  midnightStardust: {
    id: 'midnightStardust', label: 'Midnight Stardust', group: 'dark', swatch: '#E3C08D',
    base: {
      '--page-bg': '#1E222D',
      '--bg': '#1E222D',
      '--fg': '#F5E5C9',
      '--fg-muted': 'rgba(245,229,201,0.75)',
      '--accent': '#E3C08D',
      '--accent-soft': '#5D9CEC',
      '--glass-bg': 'rgba(21,37,68,0.65)',
      '--glass-border': 'rgba(255,255,255,0.14)',
      '--glass-text': '#F5E5C9',
      '--button-bg': '#E3C08D',
      '--button-fg': '#1E222D',
    },
    inverted: invertedSet('#E3C08D', '#5D9CEC', 'cool'),
  },
}

export const DEFAULT_PALETTE = 'warmCream'

export const PALETTE_GROUPS = {
  light: ['warmCream', 'emeraldGarden', 'skyEditorial', 'blossomVelvet', 'sunsetClay'],
  dark: ['darkLuxury', 'midnightStardust'],
}

export function resolvePalette(name) {
  return PALETTES[name] || PALETTES[DEFAULT_PALETTE]
}

/* Write the active palette's BASE layer onto the lovebirds route element and
   toggle a `theme-<name>` body class. No-op on the server. */
export function applyPalette(name) {
  const p = resolvePalette(name)
  if (typeof document === 'undefined' || !document.body) return p
  const s = document.body.style
  for (const [k, v] of Object.entries(p.base)) s.setProperty(k, v)
  document.body.classList.forEach((cls) => {
    if (cls.startsWith('theme-')) document.body.classList.remove(cls)
  })
  const kebab = p.id.replace(/([A-Z])/g, '-$1').toLowerCase()
  document.body.classList.add(`theme-${kebab}`)
  paletteBus.current = p
  paletteBus.listeners.forEach((fn) => fn(p))
  return p
}

/* Snapshot for any non-React reader (parity with solary themeBus). */
export const paletteBus = {
  current: PALETTES[DEFAULT_PALETTE],
  listeners: new Set(),
  set(name) { return applyPalette(name) },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) },
}

export default PALETTES
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- palettes`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/all-templates/lovebirds/config/palettes.js" "src/all-templates/lovebirds/config/__tests__/palettes.test.ts"
git commit -m "feat(lovebirds): add 7-palette theme system (base + inverted layers)"
```

---

### Task 3: Make the body background palette-driven + base-var defaults

**Files:**
- Modify: `src/all-templates/lovebirds/styles/theme.css` (the `body.lovebirds-route` rule)

- [ ] **Step 1: Replace the hardcoded background with `--page-bg`, add base-var defaults**

In `src/all-templates/lovebirds/styles/theme.css`, replace the existing
`background-color` + `background-image` + `background-*` declarations inside
`body.lovebirds-route` with the block below, and add the warmCream base-var defaults so the
first paint (pre-hydration / JS-off) matches today's look:

```css
  /* ---------- Palette-driven ambient (set at runtime by applyPalette) ---------- */
  --page-bg:
    radial-gradient(50% 38% at 50% 82%, rgba(232, 85, 62, 0.18), transparent 70%),
    radial-gradient(40% 32% at 12% 18%, rgba(245, 200, 66, 0.18), transparent 70%),
    radial-gradient(40% 32% at 88% 16%, rgba(45, 140, 78, 0.11), transparent 70%),
    radial-gradient(38% 28% at 8%  84%, rgba(107, 53, 168, 0.11), transparent 70%),
    radial-gradient(38% 28% at 92% 82%, rgba(61, 155, 193, 0.11), transparent 70%),
    linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-deep) 100%);
  background: var(--page-bg) !important;
  background-attachment: fixed !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;

  /* ---------- warmCream base tokens (default; applyPalette overrides inline) ---------- */
  --bg: transparent;
  --fg: var(--color-charcoal);
  --fg-muted: var(--color-charcoal-light);
  --accent: var(--color-coral);
  --accent-soft: var(--color-coral-soft);
  --glass-text: var(--color-charcoal);
  --button-bg: var(--color-charcoal);
  --button-fg: var(--color-cream);
```

(Keep the existing `--glass-bg`, `--glass-border`, gold/shadow vars already in the block.)

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: compiles. Default look is unchanged (Task 11 confirms visually).

- [ ] **Step 3: Commit**

```bash
git add "src/all-templates/lovebirds/styles/theme.css"
git commit -m "feat(lovebirds): drive body ambient from --page-bg + warmCream base defaults"
```

---

### Task 4: Upgrade `ThemeProvider` to the solary contract

**Files:**
- Modify: `src/all-templates/lovebirds/components/ThemeProvider.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Replace `src/all-templates/lovebirds/components/ThemeProvider.jsx` with:

```jsx
'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { PALETTES, DEFAULT_PALETTE, applyPalette } from '../config/palettes.js'

const Ctx = createContext(null)
const STORAGE_KEY = 'lovebirds:palette'

export default function ThemeProvider({
  defaultPalette = DEFAULT_PALETTE,
  allowGuestSwitch = false,
  children,
}) {
  const [palette, setPaletteState] = useState(() => {
    if (allowGuestSwitch && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved && PALETTES[saved]) return saved
      } catch {}
    }
    return PALETTES[defaultPalette] ? defaultPalette : DEFAULT_PALETTE
  })

  // Apply to the DOM whenever the palette changes.
  useEffect(() => {
    applyPalette(palette)
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(STORAGE_KEY, palette) } catch {}
    }
  }, [palette, allowGuestSwitch])

  // Locked mode: follow the couple's saved default.
  useEffect(() => {
    if (!allowGuestSwitch && PALETTES[defaultPalette]) setPaletteState(defaultPalette)
  }, [allowGuestSwitch, defaultPalette])

  const setPalette = useCallback((name) => {
    if (PALETTES[name]) setPaletteState(name)
  }, [])

  const value = { palette, setPalette, options: Object.keys(PALETTES) }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  return useContext(Ctx) || { palette: DEFAULT_PALETTE, setPalette: () => {}, options: Object.keys(PALETTES) }
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: compiles (Shell still imports `ThemeProvider` as default; `useTheme` now exported).

- [ ] **Step 3: Commit**

```bash
git add "src/all-templates/lovebirds/components/ThemeProvider.jsx"
git commit -m "feat(lovebirds): ThemeProvider with defaultPalette + allowGuestSwitch"
```

---

### Task 5: Apply the active palette in `SectionRenderer`; Hero gets inverted

**Files:**
- Modify: `src/all-templates/lovebirds/renderers/SectionRenderer.jsx`

- [ ] **Step 1: Replace the renderer**

Replace `src/all-templates/lovebirds/renderers/SectionRenderer.jsx` with:

```jsx
'use client'

import { Suspense, useMemo } from 'react'
import { sectionRegistry as lovebirdsRegistry } from '../registry.js'
import { resolveBackground } from '../config/themes.js'
import { resolvePalette } from '../config/palettes.js'
import { useTheme } from '../components/ThemeProvider.jsx'
import SectionSkeleton from '../components/SectionSkeleton.jsx'

/**
 * Render the page from config.sections using the active palette.
 *   • The body carries the palette BASE vars (set by applyPalette), which most
 *     sections inherit — so their wrappers need no inline theme vars.
 *   • The Hero (type 'hero' or section.role === 'inverted') gets the palette's
 *     INVERTED (dark/dramatic) vars on its wrapper so the gate stays cinematic
 *     in every theme.
 *   • An explicit section.background still overrides the wrapper background.
 */
export default function SectionRenderer({ config, slug, registry = lovebirdsRegistry }) {
  const { palette } = useTheme()
  const sections = useMemo(
    () => (config?.sections || []).filter((s) => s && s.enabled !== false),
    [config],
  )
  const resolved = resolvePalette(palette)

  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      {sections.map((section) => {
        const Component = registry[section.type]
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[SectionRenderer] Unknown section type "${section.type}"`)
          }
          return null
        }

        const isInverted = section.type === 'hero' || section.role === 'inverted'
        const backgroundCss = resolveBackground(section.background)
        const wrapStyle = {
          ...(isInverted ? resolved.inverted : null),
          ...(backgroundCss ? { background: backgroundCss } : null),
        }

        return (
          <div
            key={section.id}
            id={section.id}
            data-section={section.id}
            data-section-type={section.type}
            data-section-inverted={isInverted || undefined}
            style={wrapStyle}
          >
            <Suspense fallback={<SectionSkeleton label={section.id} />}>
              <Component
                {...(section.props || {})}
                id={section.id}
                slug={slug}
                blocks={section.blocks}
                decorativeLayers={section.decorativeLayers}
                layout={section.layout}
              />
            </Suspense>
          </div>
        )
      })}
    </main>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: compiles. (`themes.js` still exports `resolveBackground`; `resolveTheme` becomes
unused — leaving it in place is fine.)

- [ ] **Step 3: Commit**

```bash
git add "src/all-templates/lovebirds/renderers/SectionRenderer.jsx"
git commit -m "feat(lovebirds): SectionRenderer applies active palette, Hero stays inverted"
```

---

### Task 6: PaletteSwitcher component (demo only)

**Files:**
- Create: `src/all-templates/lovebirds/components/PaletteSwitcher.jsx`
- Create: `src/all-templates/lovebirds/components/PaletteSwitcher.module.css`

- [ ] **Step 1: Create the switcher**

Create `src/all-templates/lovebirds/components/PaletteSwitcher.jsx`:

```jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from './ThemeProvider.jsx'
import { PALETTES, PALETTE_GROUPS } from '../config/palettes.js'
import styles from './PaletteSwitcher.module.css'

export default function PaletteSwitcher() {
  const { palette, setPalette } = useTheme()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        toggleRef.current && !toggleRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const Group = ({ title, keys }) => (
    <>
      <div className={styles.groupTitle}>{title}</div>
      <div className={styles.buttons}>
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.swatchBtn} ${palette === key ? styles.active : ''}`}
            onClick={() => setPalette(key)}
          >
            <span className={styles.dot} style={{ background: PALETTES[key].swatch }} />
            {PALETTES[key].label}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <>
      <button
        ref={toggleRef}
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-label="Pilih tema"
        title="Pilih tema"
      >🎨</button>

      {open && (
        <div ref={panelRef} className={styles.panel} role="radiogroup" aria-label="Pilih tema">
          <div className={styles.header}>
            <span>Pilih Tema</span>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Tutup">&times;</button>
          </div>
          <Group title="Terang" keys={PALETTE_GROUPS.light} />
          <Group title="Gelap" keys={PALETTE_GROUPS.dark} />
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create the CSS module**

Create `src/all-templates/lovebirds/components/PaletteSwitcher.module.css`:

```css
.toggle {
  position: fixed;
  bottom: 20px; right: 20px;
  z-index: 90;
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(42, 33, 24, 0.12);
  background: rgba(253, 246, 236, 0.92);
  backdrop-filter: blur(12px) saturate(1.3);
  -webkit-backdrop-filter: blur(12px) saturate(1.3);
  box-shadow: 0 10px 28px rgba(42, 33, 24, 0.18);
  font-size: 20px; line-height: 1; cursor: pointer;
}
.panel {
  position: fixed;
  bottom: 80px; right: 20px;
  z-index: 91;
  width: 248px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(42, 33, 24, 0.10);
  background: rgba(253, 246, 236, 0.97);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  box-shadow: 0 18px 48px rgba(42, 33, 24, 0.22);
  display: grid; gap: 10px;
}
.header {
  display: flex; align-items: center; justify-content: space-between;
  font-family: var(--font-display, serif); font-style: italic; font-size: 18px;
  color: #2A2118;
}
.close { background: none; border: 0; font-size: 20px; cursor: pointer; color: rgba(42,33,24,0.55); line-height: 1; }
.groupTitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(42, 33, 24, 0.55); font-weight: 600; margin-top: 4px;
}
.buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.swatchBtn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 10px; border-radius: 10px;
  border: 1px solid rgba(42, 33, 24, 0.12);
  background: #fff; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #2A2118;
  text-align: left;
}
.swatchBtn.active { border-color: #2A2118; outline: 2px solid #2A2118; }
.dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(42,33,24,0.15); }
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add "src/all-templates/lovebirds/components/PaletteSwitcher.jsx" "src/all-templates/lovebirds/components/PaletteSwitcher.module.css"
git commit -m "feat(lovebirds): floating PaletteSwitcher for demo mode"
```

---

### Task 7: Wire Shell + InvitationView (demo gating)

**Files:**
- Modify: `src/all-templates/lovebirds/Shell.jsx`
- Modify: `src/app/[template]/[slug]/InvitationView.tsx:31`

- [ ] **Step 1: Update Shell**

In `src/all-templates/lovebirds/Shell.jsx`: add the `PaletteSwitcher` import, accept
`isDemo`, pass `defaultPalette` + `allowGuestSwitch` to `ThemeProvider`, render the switcher
in demo. Apply these three edits:

(a) After the `FloatingNavbar` import line, add:
```jsx
import PaletteSwitcher from './components/PaletteSwitcher.jsx'
```

(b) Change the signature:
```jsx
export default function Shell({ config, slug, isDemo = false }) {
```

(c) Replace the `<ThemeProvider theme={undefined}>` opening tag with:
```jsx
    <ThemeProvider
      defaultPalette={config?.theme?.defaultPalette}
      allowGuestSwitch={isDemo}
    >
```
and add the switcher just before the closing `</ThemeProvider>` (after the MusicPopup block):
```jsx
      {isDemo && <PaletteSwitcher />}
```

- [ ] **Step 2: Forward `isDemo` to LovebirdsShell**

In `src/app/[template]/[slug]/InvitationView.tsx`, replace line 31:
```tsx
  return <LovebirdsShell config={config} slug={slug} />
```
with:
```tsx
  return <LovebirdsShell config={config} slug={slug} isDemo={isDemo} />
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 4: Commit (bracket paths need GIT_LITERAL_PATHSPECS)**

```bash
git add "src/all-templates/lovebirds/Shell.jsx"
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/InvitationView.tsx"
git commit -m "feat(lovebirds): wire ThemeProvider + demo switcher into Shell"
```

(PowerShell variant: `$env:GIT_LITERAL_PATHSPECS=1; git add "src/app/[template]/[slug]/InvitationView.tsx"`)

---

### Task 8: Show the Palette tab for lovebirds + per-template palette list

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx:86,304`
- Modify: `src/app/[template]/[slug]/dashboard/PaletteTab.tsx`

- [ ] **Step 1: Enable the Palette tab for every template + pass `template`**

In `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`, change the tab-key gate on
line 86 from:
```tsx
    if (template === 'solary') keys.push('palette')
```
to:
```tsx
    keys.push('palette')
```
and update the render on line 304 from:
```tsx
              <PaletteTab slug={slug} initial={invitation.config?.theme?.defaultPalette} />
```
to:
```tsx
              <PaletteTab slug={slug} template={template} initial={invitation.config?.theme?.defaultPalette} />
```

- [ ] **Step 2: Make PaletteTab per-template**

In `src/app/[template]/[slug]/dashboard/PaletteTab.tsx`, replace the top constants + the
component signature + the default-state line + the two `<Group>` calls.

Replace the existing `DARK`/`LIGHT` const block (lines 6–17) with:
```tsx
type Swatch = { key: string; label: string; swatch: string }

const SOLARY_DARK: Swatch[] = [
  { key: 'cosmicDark', label: 'Purple', swatch: '#7D53DE' },
  { key: 'nebulaDark', label: 'Nebula', swatch: '#c19bff' },
  { key: 'roseDark', label: 'Rose', swatch: '#e64980' },
  { key: 'emeraldDark', label: 'Emerald', swatch: '#0f9f8e' },
]
const SOLARY_LIGHT: Swatch[] = [
  { key: 'lavenderLight', label: 'Lavender', swatch: '#b794f6' },
  { key: 'sunburstLight', label: 'Sunburst', swatch: '#f5c518' },
  { key: 'roseLight', label: 'Rose', swatch: '#f43f5e' },
  { key: 'botanicalLight', label: 'Botanical', swatch: '#3f9142' },
]
const LOVEBIRDS_LIGHT: Swatch[] = [
  { key: 'warmCream', label: 'Warm Cream', swatch: '#E8553E' },
  { key: 'emeraldGarden', label: 'Emerald Garden', swatch: '#2D8C4E' },
  { key: 'skyEditorial', label: 'Sky Editorial', swatch: '#3D9BC1' },
  { key: 'blossomVelvet', label: 'Blossom Velvet', swatch: '#E06B7B' },
  { key: 'sunsetClay', label: 'Sunset Clay', swatch: '#C85A32' },
]
const LOVEBIRDS_DARK: Swatch[] = [
  { key: 'darkLuxury', label: 'Dark Luxury', swatch: '#F5C842' },
  { key: 'midnightStardust', label: 'Midnight Stardust', swatch: '#E3C08D' },
]

const TEMPLATE_PALETTES: Record<string, { dark: Swatch[]; light: Swatch[]; fallback: string }> = {
  solary: { dark: SOLARY_DARK, light: SOLARY_LIGHT, fallback: 'cosmicDark' },
  lovebirds: { dark: LOVEBIRDS_DARK, light: LOVEBIRDS_LIGHT, fallback: 'warmCream' },
}
```

Replace the component signature (line 19) from:
```tsx
export default function PaletteTab({ slug, initial }: { slug: string; initial?: string }) {
```
to:
```tsx
export default function PaletteTab({ slug, template, initial }: { slug: string; template: string; initial?: string }) {
  const groups = TEMPLATE_PALETTES[template] || TEMPLATE_PALETTES.lovebirds
```

Replace the default-state line (line 21) from:
```tsx
  const [palette, setPalette] = useState(initial || 'cosmicDark')
```
to:
```tsx
  const [palette, setPalette] = useState(initial || groups.fallback)
```

Replace the two `<Group …>` calls in the return (currently `items={DARK}` / `items={LIGHT}`)
with:
```tsx
      <Group title={t.groupDark} items={groups.dark} />
      <Group title={t.groupLight} items={groups.light} />
```

And change the `Group` component's `items` type annotation from `typeof DARK` to `Swatch[]`.

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
$env:GIT_LITERAL_PATHSPECS=1; git add "src/app/[template]/[slug]/dashboard/DashboardClient.tsx" "src/app/[template]/[slug]/dashboard/PaletteTab.tsx"
git commit -m "feat(dashboard): per-template Palette tab; enable for lovebirds"
```

---

### Task 9: Per-template palette allowlist in the theme API (+ test)

**Files:**
- Create: `src/lib/config/palette-allowlist.ts`
- Create: `src/lib/config/__tests__/palette-allowlist.test.ts`
- Modify: `src/app/api/invitation/[slug]/theme/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/config/__tests__/palette-allowlist.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isPaletteAllowedForTemplate } from '../palette-allowlist'

describe('isPaletteAllowedForTemplate', () => {
  it('accepts lovebirds palettes for lovebirds', () => {
    expect(isPaletteAllowedForTemplate('lovebirds', 'blossomVelvet')).toBe(true)
    expect(isPaletteAllowedForTemplate('lovebirds', 'midnightStardust')).toBe(true)
  })
  it('rejects solary palettes for lovebirds', () => {
    expect(isPaletteAllowedForTemplate('lovebirds', 'cosmicDark')).toBe(false)
  })
  it('accepts solary palettes for solary', () => {
    expect(isPaletteAllowedForTemplate('solary', 'cosmicDark')).toBe(true)
  })
  it('falls back to the union when template is null/unknown', () => {
    expect(isPaletteAllowedForTemplate(null, 'warmCream')).toBe(true)
    expect(isPaletteAllowedForTemplate(null, 'cosmicDark')).toBe(true)
    expect(isPaletteAllowedForTemplate('mystery', 'nope')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- palette-allowlist`
Expected: FAIL — cannot find module `../palette-allowlist`.

- [ ] **Step 3: Create the helper**

Create `src/lib/config/palette-allowlist.ts`:

```ts
/** Allowed palette keys per template. Used by the theme API to validate
 *  owner palette saves. Keep in sync with each template's palette definitions. */
export const TEMPLATE_PALETTES: Record<string, readonly string[]> = {
  solary: [
    'cosmicDark', 'nebulaDark', 'roseDark', 'emeraldDark',
    'lavenderLight', 'sunburstLight', 'roseLight', 'botanicalLight',
  ],
  lovebirds: [
    'warmCream', 'emeraldGarden', 'skyEditorial', 'blossomVelvet',
    'sunsetClay', 'darkLuxury', 'midnightStardust',
  ],
}

const UNION = new Set(Object.values(TEMPLATE_PALETTES).flat())

export function isPaletteAllowedForTemplate(
  template: string | null | undefined,
  palette: string,
): boolean {
  if (template && TEMPLATE_PALETTES[template]) {
    return TEMPLATE_PALETTES[template].includes(palette)
  }
  return UNION.has(palette)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- palette-allowlist`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the helper into the route**

In `src/app/api/invitation/[slug]/theme/route.ts`:

(a) Replace the `ALLOWED_PALETTES` const (lines 7–10) with an import at the top:
```ts
import { isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'
```

(b) Change the row fetch (line 32) to also select the template:
```ts
    .select('config, template_id').eq('id', owner.id).single()
```

(c) Replace the validation block (lines 25–28) — move it to AFTER the row is fetched — so it
reads:
```ts
  const palette = body?.defaultPalette
  if (typeof palette !== 'string') {
    return NextResponse.json({ error: 'Invalid palette' }, { status: 400 })
  }
```
and immediately after the `if (fetchErr || !row) …` line, add:
```ts
  if (!isPaletteAllowedForTemplate((row as any).template_id, palette)) {
    return NextResponse.json({ error: 'Invalid palette' }, { status: 400 })
  }
```

- [ ] **Step 6: Run the full test suite + build**

Run: `npm test`
Expected: PASS (all suites, including the two new ones).
Run: `npm run build`
Expected: compiles.

- [ ] **Step 7: Commit**

```bash
git add "src/lib/config/palette-allowlist.ts" "src/lib/config/__tests__/palette-allowlist.test.ts"
$env:GIT_LITERAL_PATHSPECS=1; git add "src/app/api/invitation/[slug]/theme/route.ts"
git commit -m "feat(api): per-template palette allowlist for theme save"
```

---

### Task 10: Make the FloatingNavbar palette-aware

**Files:**
- Modify: `src/all-templates/lovebirds/components/FloatingNavbar.module.css:36-44,89-125,140-145,183-186`

- [ ] **Step 1: Use palette tokens for nav surface + active pill**

In `src/all-templates/lovebirds/components/FloatingNavbar.module.css`, make these
replacements so the bar follows the active palette instead of hardcoded cream/coral:

- `.nav` `background: rgba(253, 246, 236, 0.82);` → `background: var(--glass-bg, rgba(253, 246, 236, 0.82));`
- `.link` `color: var(--color-charcoal);` → `color: var(--fg, var(--color-charcoal));`
- `.linkActive` block `background: var(--color-coral);` → `background: var(--accent, var(--color-coral));`,
  and `color: var(--color-cream);` → `color: var(--button-fg, var(--color-cream));`, and
  `box-shadow: 0 4px 12px rgba(232, 85, 62, 0.32);` → `box-shadow: 0 4px 12px rgba(42, 33, 24, 0.22);`
- `.hamburger` `background: rgba(253, 246, 236, 0.92);` → `background: var(--glass-bg, rgba(253, 246, 236, 0.92));`
- `.sheet` `background: rgba(253, 246, 236, 0.98);` → `background: var(--glass-bg, rgba(253, 246, 236, 0.98));`
- `.bar` / `.link` text colors already inherit; leave `.sheetLink` active state mirroring
  `.linkActive` (`background: var(--accent, var(--color-coral)); color: var(--button-fg, var(--color-cream));`).

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add "src/all-templates/lovebirds/components/FloatingNavbar.module.css"
git commit -m "feat(lovebirds): navbar follows active palette tokens"
```

---

### Task 11: Final verification (tests, build, browser smoke)

**Files:** none (verification only)

- [ ] **Step 1: Run the suite + production build**

Run: `npm test` → Expected: all PASS.
Run: `npm run build` → Expected: success, no type errors.

- [ ] **Step 2: Browser smoke test (demo)**

Start `npm run dev`, open `http://localhost:3000/lovebirds/rizky-amara` (a demo slug →
`isDemo=true`). Confirm:
- The 🎨 button appears bottom-right; opening it lists 7 palettes in Terang/Gelap groups.
- Selecting **Midnight Stardust** / **Blossom Velvet** re-themes the whole card (body bg,
  accents, buttons, navbar) live; the **Hero stays dark/dramatic** in every palette.
- The card uses Playfair Display (titles) / Plus Jakarta Sans (body) / Sacramento (script).
- Reload keeps the chosen palette (sessionStorage) in demo.

- [ ] **Step 3: Browser smoke test (published lock + dashboard)**

- Open the marketing page + dashboard and confirm their fonts are unchanged (swap is
  route-scoped).
- In a couple's dashboard, open the **Palette** tab → it lists the 7 lovebirds palettes →
  pick one → Save (expect success toast; `PUT /api/invitation/<slug>/theme` returns 200).
- Visit the published invitation (non-demo slug, logged out): no 🎨 switcher; the card shows
  the owner's saved palette and cannot be changed client-side.

- [ ] **Step 4: Final commit (only if cleanup was needed)**

```bash
git add -- <only the specific files you changed>
git commit -m "chore(lovebirds): theme picker verification fixes"
```

---

## Self-Review

**Spec coverage:**
- §2 architecture (solary parity) → Tasks 2,4,6,7,8,9.
- §3 palette model (7, base+inverted) → Task 2 (+ test).
- §4 runtime (applyPalette, ThemeProvider) → Tasks 2,4.
- §5 Hero inverted in SectionRenderer → Task 5.
- §6 fonts (route-scoped) → Task 1.
- §7 dashboard + API permission → Tasks 8,9.
- §8 Shell + InvitationView → Task 7.
- §9 palette-driven body bg → Task 3.
- §10 backward-compat (legacy `theme:` inert, no `theme` → warmCream) → Tasks 4,5 (default
  fallback) + verified Task 11.
- §11 success criteria → Task 11 smoke steps.
- Navbar ("whole card re-themes") → Task 10.

**Placeholder scan:** none — every code step contains full content.

**Type/name consistency:** `resolvePalette`, `applyPalette`, `paletteBus`, `PALETTES`,
`PALETTE_GROUPS`, `DEFAULT_PALETTE` (palettes.js) used identically in ThemeProvider,
SectionRenderer, PaletteSwitcher. `useTheme` exported by ThemeProvider and consumed by
SectionRenderer + PaletteSwitcher. `isPaletteAllowedForTemplate` defined in Task 9 and used
in the same task's route edit. PaletteTab `Swatch` type + `template` prop consistent between
DashboardClient call and PaletteTab signature.
