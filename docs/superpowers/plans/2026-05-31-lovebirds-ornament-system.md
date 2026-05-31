# Lovebirds Cleanup + Ornament System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bundled `wedding-animation.gif` with three selectable, responsive lovebirds ornaments (birds / butterflies / perched-canvas), expand palettes 7→10, fix the font system, tidy the repo, and tastefully wire the style guide's "Classy & Fun" components into real sections.

**Architecture:** Ornaments live in a new `'use client'` `Ornaments.jsx` mounted in the lovebirds `Shell` alongside the existing `GlobalBackground`. Birds/butterflies are CSS-animated SVGs in two fly-zones; "perched" is a self-contained `<canvas>` rAF engine inside a `useEffect`. The chosen type is stored in `config.theme.ornamentType` and persisted through the existing `PUT /api/invitation/[slug]/theme` route; a repurposed dashboard tab picks it. Colors track the active palette via a static per-palette map.

**Tech Stack:** Next.js 14 (App Router), React 18, CSS Modules + CSS variables, `next/font/google`, Supabase, vitest.

**Reference (read-only):** `c:\Users\arifi\Downloads\multi-template\style-guide-lovebirds.html` (3082 lines). Line numbers below refer to this file.

**Source of truth — 10 themes** (style guide lines 2096–2269): `warmCream, darkLuxury, emeraldGarden, skyEditorial, blossomVelvet, sunsetClay, midnightStardust, royalPlum, forestMist, terracottaOasis`.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `src/app/layout.tsx` | modify | add Sacramento + Kameron `next/font` loaders + body vars |
| `src/styles/tokens.css` | modify | `--font-display-classy`, `--font-body-fun`, point `--font-serif-soft` at Kameron; new palette color tokens |
| `src/all-templates/lovebirds/config/themes.js` | modify | add 3 themes (royalPlum/forestMist/terracottaOasis) |
| `src/all-templates/lovebirds/config/ornamentThemes.js` | create | per-palette `{accent, accentSoft, branch, branchDark}` map for canvas |
| `src/lib/config/palette-allowlist.ts` | modify | add 3 palette keys to lovebirds |
| `src/app/[template]/[slug]/dashboard/PaletteTab.tsx` | modify | 3 new swatches |
| `src/app/api/invitation/[slug]/theme/route.ts` | modify | accept + validate optional `ornamentType` |
| `src/all-templates/lovebirds/components/Ornaments.jsx` | create | fly-zones + canvas; owns rAF lifecycle |
| `src/all-templates/lovebirds/components/Ornaments.module.css` | create | fly-zone layout, flight keyframes, responsive ramp, canvas pinning |
| `src/all-templates/lovebirds/components/GlobalBackground.jsx` | modify | remove GIF layer + `gifUrl` prop (keep petals/corners/washes) |
| `src/all-templates/lovebirds/Shell.jsx` | modify | mount `<Ornaments>`, drop `gifUrl` |
| `src/app/[template]/[slug]/dashboard/OrnamentTab.tsx` | create (from BackgroundTab) | ornament picker UI + save |
| `src/app/[template]/[slug]/dashboard/BackgroundTab.tsx` | delete | replaced by OrnamentTab |
| `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` | modify | rename tab `background`→`ornament` |
| `src/lib/i18n/dictionaries/dashboard.ts` | modify | rename tab label + `ornament` strings (id+en) |
| `src/app/templates/TemplateCard.tsx` | modify | remove gif `<img>` |
| `src/components/marketing/TemplateShowcase.tsx` | modify | remove gif `<img>` |
| `src/app/api/invitation/[slug]/background/route.ts` | delete (if unused) | GIF save route |
| `src/all-templates/lovebirds/styles/theme.css` | modify | add `.btn-magnetic-slide`, `.btn-iridescent-glass`; apply classy vars |
| section files (Phase 3) | modify | wire classy components (frontend-design pass) |

---

## Phase 0 — Safety checkpoint

### Task 0: Checkpoint the WIP tree

**Files:** none (git only).

- [ ] **Step 1: Show what will be committed**

Run: `git status --short`
Expected: the full list of modified/deleted/untracked WIP files.

- [ ] **Step 2: Stage everything and commit the checkpoint**

This is the one sanctioned `git add -A` (purpose: capture all in-flight work so cleanup is reversible).

```bash
git add -A
git commit -m "wip: snapshot before lovebirds ornament work"
```

- [ ] **Step 3: Verify clean tree**

Run: `git status --short`
Expected: empty (clean). Run `git log --oneline -2` and confirm the checkpoint sits on top of the spec commit.

---

## Phase 1 — Cleanup

### Task 1: Delete root loose files (irreversible — NOT under git)

**Files:** delete in `c:\Users\arifi\Downloads\multi-template\` (the repo's PARENT dir).

- [ ] **Step 1: List the loose files**

Run: `ls "c:/Users/arifi/Downloads/multi-template"`
Expected: screenshots + concept HTML + `style-guide-lovebirds.html` + `proyek_integration_prompt.md` + `wedding-saas-next/`.

- [ ] **Step 2: Delete only screenshots + concept HTML; KEEP the style guide, the prompt, and the repo**

```bash
cd "c:/Users/arifi/Downloads/multi-template"
rm -f landing-desktop-revealed.png landing-desktop.png landing-fixed.png \
  landing-mobile-menu.png landing-mobile-top.png login-with-nav.png \
  templates-with-nav.png test-draft-guest-after-fix.png test-draft-guest.png \
  test-expired.png test-notfound-bilingual.png test-notfound-id-final.png \
  test-notfound-id.png test-owner-preview-en.png test-solary-intro.png \
  test-solary-port3000.png landing_page_concept.html landing_page_concept_mobile.html
```

- [ ] **Step 3: Verify keepers remain**

Run: `ls "c:/Users/arifi/Downloads/multi-template"`
Expected: `style-guide-lovebirds.html`, `proyek_integration_prompt.md`, `wedding-saas-next/`, `.playwright-mcp/` still present; all listed PNG/concept files gone. (No git commit — these are outside the repo.)

### Task 2: Audit & delete dead in-repo code

**Files:** `wedding-saas-next/src/**` (under git → safe).

- [ ] **Step 1: Verify the `OurStoryStack` variant wiring**

Run: `grep -rn "OurStoryStack\|StoryStackedCard\|StoryPinnedScene\|StoryImageReveal\|StoryTextReveal\|StoryCard\|StoryImageReveal" src/all-templates/lovebirds/registry.js src/all-templates/lovebirds/config/blockRegistry.js src/all-templates/lovebirds/renderers`
Expected: shows which Our Story variant(s) are actually registered. Only the UNREGISTERED helpers are deletion candidates.

- [ ] **Step 2: For each candidate, confirm zero importers before deleting**

For every file flagged unused, run (example): `grep -rn "OurStoryStack" src/ | grep -v "sections/OurStoryStack/"`
Expected: no other references → safe to delete that directory. If ANY reference exists outside the file itself, keep it.

- [ ] **Step 3: Check for dangling refs to already-removed files**

Run: `grep -rn "NotesTab\|services/wishes" src/`
Expected: empty. If any import remains, remove that import line.

- [ ] **Step 4: Typecheck to surface unused/broken imports**

Run: `npx tsc --noEmit`
Expected: no errors. Fix any broken import introduced by deletions.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead lovebirds/dashboard code"
```
(`git add -A` is safe here — the tree is clean after Task 0, so only this task's deletions are staged.)

### Task 3: Trim verbose comments (scoped)

**Files:** lovebirds template + dashboard + files touched later. Do NOT mass-edit untouched solary files.

- [ ] **Step 1: Collapse decorative banner/restatement comments to one-liners**

Target files such as `themes.js`, `GlobalBackground.jsx`, `DashboardClient.tsx`, `theme.css` headers. Example transform — replace a 10-line banner block with a single `/* THEMES — named presets → CSS var overrides. */`.
**Preserve:** `eslint-disable`, `@ts-*`, license headers, JSDoc on exported functions, meaningful TODO/FIXME.

- [ ] **Step 2: Typecheck (catches accidental code deletion)**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: trim verbose comments in lovebirds + dashboard"
```

---

## Phase 2 — Ornament system

### Task 4: Fonts — load Sacramento + Kameron, define classy vars

**Files:** Modify `src/app/layout.tsx`, `src/styles/tokens.css`, `src/all-templates/lovebirds/styles/theme.css`.

- [ ] **Step 1: Add font loaders in `layout.tsx`**

In the import line add `Sacramento, Kameron`:
```tsx
import { Cormorant_Garamond, DM_Sans, Pinyon_Script, Great_Vibes, Plus_Jakarta_Sans, Sacramento, Kameron } from 'next/font/google'
```
After the `jakarta` loader add:
```tsx
const sacramento = Sacramento({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sacramento',
  display: 'swap',
})

const kameron = Kameron({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-kameron',
  display: 'swap',
})
```
Add both variables to the `<html>` className:
```tsx
<html lang="id" className={`${cormorant.variable} ${dmSans.variable} ${pinyon.variable} ${greatVibes.variable} ${jakarta.variable} ${sacramento.variable} ${kameron.variable}`}>
```

- [ ] **Step 2: Define the classy vars in `tokens.css`**

After the existing `--font-serif-soft` line (tokens.css:48), replace/extend:
```css
  --font-serif-soft: var(--font-kameron), 'Kameron', 'Cormorant Garamond', serif;
  --font-display-classy: var(--font-sacramento), 'Sacramento', cursive;
  --font-body-fun: var(--font-jakarta), 'Plus Jakarta Sans', sans-serif;
```

- [ ] **Step 3: Verify lovebirds default pairing still matches the style guide**

Confirm `theme.css` lovebirds block keeps `--font-display: var(--font-greatvibes), …` and `--font-body: var(--font-jakarta), …` (display Great Vibes, body Plus Jakarta). No change needed unless missing.

- [ ] **Step 4: Typecheck + dev smoke**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/styles/tokens.css src/all-templates/lovebirds/styles/theme.css
git commit -m "feat(lovebirds): load Sacramento + Kameron, define classy font vars"
```

### Task 5: Expand palettes 7 → 10

**Files:** Modify `themes.js`, `tokens.css`, `palette-allowlist.ts`, `PaletteTab.tsx`. Test: `src/lib/config/__tests__/palette-allowlist.test.ts`.

- [ ] **Step 1: Write the failing allowlist test**

Create `src/lib/config/__tests__/palette-allowlist.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isPaletteAllowedForTemplate } from '../palette-allowlist'

describe('lovebirds palette allowlist', () => {
  it('accepts the three new bold palettes', () => {
    for (const p of ['royalPlum', 'forestMist', 'terracottaOasis']) {
      expect(isPaletteAllowedForTemplate('lovebirds', p)).toBe(true)
    }
  })
  it('still rejects unknown palettes', () => {
    expect(isPaletteAllowedForTemplate('lovebirds', 'notAColor')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run src/lib/config/__tests__/palette-allowlist.test.ts`
Expected: FAIL (royalPlum not allowed yet).

- [ ] **Step 3: Add the 3 keys to `palette-allowlist.ts`**

Append to the `lovebirds` array:
```ts
  lovebirds: [
    'warmCream', 'emeraldGarden', 'skyEditorial', 'blossomVelvet',
    'sunsetClay', 'darkLuxury', 'midnightStardust',
    'royalPlum', 'forestMist', 'terracottaOasis',
  ],
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/config/__tests__/palette-allowlist.test.ts`
Expected: PASS.

- [ ] **Step 5: Add color tokens in `tokens.css`**

Add (grouped with existing color tokens):
```css
  --color-royal-plum: #4A0E1D;
  --color-royal-plum-deep: #22030B;
  --color-forest-mist: #12291B;
  --color-forest-mist-soft: #9EE0B1;
  --color-terracotta-deep: #8E3A21;
  --color-terracotta-darker: #4D1A0D;
```

- [ ] **Step 6: Add 3 themes to `themes.js`**

After `midnightStardust`, add (CSS-var-map form derived from style guide 2218–2268):
```js
  royalPlum: {
    '--bg': '#4A0E1D',
    '--fg': '#FAF0EC',
    '--fg-muted': '#F2B6C1',
    '--accent': '#F5C842',
    '--accent-soft': '#E06B7B',
    '--glass-bg': 'rgba(74, 14, 29, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-text': '#FAF0EC',
    '--glass-text-muted': '#F2B6C1',
    '--button-bg': '#F5C842',
    '--button-fg': '#4A0E1D',
  },
  forestMist: {
    '--bg': '#12291B',
    '--fg': '#EAF0E9',
    '--fg-muted': '#A4B29E',
    '--accent': '#9EE0B1',
    '--accent-soft': '#2D8C4E',
    '--glass-bg': 'rgba(18, 41, 27, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-text': '#EAF0E9',
    '--glass-text-muted': '#A4B29E',
    '--button-bg': '#9EE0B1',
    '--button-fg': '#12291B',
  },
  terracottaOasis: {
    '--bg': '#8E3A21',
    '--fg': '#FAF2EA',
    '--fg-muted': '#EAD0A8',
    '--accent': '#FBE3A6',
    '--accent-soft': '#FAF2EA',
    '--glass-bg': 'rgba(142, 58, 33, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-text': '#FAF2EA',
    '--glass-text-muted': '#EAD0A8',
    '--button-bg': '#FBE3A6',
    '--button-fg': '#8E3A21',
  },
```

- [ ] **Step 7: Add swatches in `PaletteTab.tsx`**

Extend `LOVEBIRDS_LIGHT` with terracottaOasis and `LOVEBIRDS_DARK` with the two dark-bold ones:
```tsx
const LOVEBIRDS_LIGHT: Swatch[] = [
  { key: 'warmCream', label: 'Warm Cream', swatch: '#E8553E' },
  { key: 'emeraldGarden', label: 'Emerald Garden', swatch: '#2D8C4E' },
  { key: 'skyEditorial', label: 'Sky Editorial', swatch: '#3D9BC1' },
  { key: 'blossomVelvet', label: 'Blossom Velvet', swatch: '#E06B7B' },
  { key: 'sunsetClay', label: 'Sunset Clay', swatch: '#C85A32' },
  { key: 'terracottaOasis', label: 'Terracotta Oasis', swatch: '#FBE3A6' },
]
const LOVEBIRDS_DARK: Swatch[] = [
  { key: 'darkLuxury', label: 'Dark Luxury', swatch: '#F5C842' },
  { key: 'midnightStardust', label: 'Midnight Stardust', swatch: '#E3C08D' },
  { key: 'royalPlum', label: 'Royal Plum', swatch: '#F5C842' },
  { key: 'forestMist', label: 'Forest Mist', swatch: '#9EE0B1' },
]
```

- [ ] **Step 8: Typecheck + commit**

Run: `npx tsc --noEmit` (expect clean), then:
```bash
git add src/all-templates/lovebirds/config/themes.js src/styles/tokens.css src/lib/config/palette-allowlist.ts src/app/[template]/[slug]/dashboard/PaletteTab.tsx src/lib/config/__tests__/palette-allowlist.test.ts
git commit -m "feat(lovebirds): add royalPlum/forestMist/terracottaOasis palettes"
```

### Task 6: Persist `ornamentType` via the theme route

**Files:** Modify `src/app/api/invitation/[slug]/theme/route.ts`. Test: `src/app/api/invitation/__tests__/theme-ornament.test.ts` (or co-located per existing convention — check first with `grep -rl "verifyOwnership" src/**/__tests__ 2>/dev/null`).

- [ ] **Step 1: Add the enum constant + validation in the route**

Near the top of `route.ts` add:
```ts
const ORNAMENT_TYPES = ['birds', 'butterflies', 'perched'] as const
```
In `PUT`, after the palette validation block, before building `cfg`, add:
```ts
  const ornamentType = body?.ornamentType
  if (ornamentType !== undefined && !ORNAMENT_TYPES.includes(ornamentType)) {
    return NextResponse.json({ error: 'Invalid ornamentType' }, { status: 400 })
  }
```
Then when merging config, persist it when present:
```ts
  const cfg = { ...(row.config || {}) }
  cfg.theme = { ...(cfg.theme || {}), defaultPalette: palette }
  if (ornamentType !== undefined) cfg.theme.ornamentType = ornamentType
```
Also relax the early palette guard so an ornament-only save still works: change the `palette` requirement so that when `defaultPalette` is omitted but `ornamentType` is present, the route updates only `ornamentType`. Concretely, replace `if (typeof palette !== 'string')` logic with: require at least one of `defaultPalette` (string) or `ornamentType` (valid enum); only run the palette-allowlist check when `palette` is a string; only set `cfg.theme.defaultPalette` when `palette` is provided. Return `{ ok, savedAt, defaultPalette?, ornamentType? }`.

- [ ] **Step 2: Verify behavior manually with the dev server (no unit harness for route handlers exists yet)**

Run the dev server (`npm run dev`), then for an existing owned slug session, exercise via the dashboard in Task 10. For now, just typecheck:
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/invitation/[slug]/theme/route.ts
git commit -m "feat(api): persist + validate config.theme.ornamentType"
```
> Note: the path contains brackets — if the shell globs it, prefix with `GIT_LITERAL_PATHSPECS=1`.

### Task 7: `Ornaments` component — fly-zones (birds + butterflies)

**Files:** Create `src/all-templates/lovebirds/components/Ornaments.jsx` + `Ornaments.module.css`; create `src/all-templates/lovebirds/config/ornamentThemes.js`.

- [ ] **Step 1: Create `ornamentThemes.js` (per-palette canvas colors)**

Values copied from style guide theme objects (2096–2269):
```js
/* Canvas colors per palette — accent (bird) + branch wood tones. */
export const ORNAMENT_THEMES = {
  warmCream:        { accent: '#E8553E', accentSoft: '#F4A38F', branch: '#8B6F47', branchDark: '#5C4A3A' },
  darkLuxury:       { accent: '#F5C842', accentSoft: '#FBE3A6', branch: '#5C4A3A', branchDark: '#3A2D22' },
  emeraldGarden:    { accent: '#2D8C4E', accentSoft: '#8FCBA1', branch: '#6E5B3A', branchDark: '#4A3C27' },
  skyEditorial:     { accent: '#3D9BC1', accentSoft: '#A8D5E3', branch: '#7A6B55', branchDark: '#5A4D3D' },
  blossomVelvet:    { accent: '#E06B7B', accentSoft: '#F2B6C1', branch: '#7A5C50', branchDark: '#5A3E35' },
  sunsetClay:       { accent: '#C85A32', accentSoft: '#EAD0A8', branch: '#8B6F47', branchDark: '#6B5235' },
  midnightStardust: { accent: '#E3C08D', accentSoft: '#5D9CEC', branch: '#3A3545', branchDark: '#252030' },
  royalPlum:        { accent: '#F5C842', accentSoft: '#E06B7B', branch: '#6B2040', branchDark: '#3A0E1D' },
  forestMist:       { accent: '#9EE0B1', accentSoft: '#2D8C4E', branch: '#2A4A35', branchDark: '#1A3025' },
  terracottaOasis:  { accent: '#FBE3A6', accentSoft: '#FAF2EA', branch: '#6B2A15', branchDark: '#4D1A0D' },
}

export function resolveOrnamentTheme(paletteKey) {
  return ORNAMENT_THEMES[paletteKey] || ORNAMENT_THEMES.warmCream
}
```

- [ ] **Step 2: Create `Ornaments.module.css`**

Port style guide CSS lines **206–391** (fly-zones, `.lovebird-parallax-wrap`, `.lovebird`, wing flap, per-index sizing, the 4 flight keyframes `fly-ltr/rtl/diag-up/diag-down`, `flap-front/back`, AND the `@media (max-width:768px)` ramp + mobile keyframes). Adaptations:
- Scope class names under CSS-module local names (e.g. `.flyZoneBg`, `.flyZoneFg`, `.bird`, `.bird1`…`.bird15`, `.pWrap1`…) OR keep global class names by wrapping the file's selectors in `:global(...)`. Use `:global` to keep the verbatim port simplest.
- Replace `#birdCanvas` rules with a `.canvas` module class (component owns show/hide via React, not `body.active-type-perched`).
- The wing `.wing-front`/`.wing-back` fill should be `var(--accent, #E8553E)` so birds track the palette; keep `currentColor` where the style guide used it.

- [ ] **Step 3: Create `Ornaments.jsx` shell (birds + butterflies render)**

```jsx
'use client'

import { useEffect, useRef } from 'react'
import styles from './Ornaments.module.css'
import { resolveOrnamentTheme } from '../config/ornamentThemes.js'

// SVG path sets (style guide lines 2310–2331).
const SHAPES = {
  birds: `…wing-back / bird-body / wing-front paths (lines 2312–2314)…`,
  butterflies: `…(lines 2317–2319)…`,
  perched: `…(lines 2322–2329)…`,
}

// bg = 5 birds (indices 5–9), fg = 3 birds (indices 1–3) — matches style guide.
const BG_BIRDS = [5, 6, 7, 8, 9]
const FG_BIRDS = [1, 2, 3]

export default function Ornaments({ ornamentType = 'birds', paletteKey } = {}) {
  const isPerched = ornamentType === 'perched'
  const inner = SHAPES[ornamentType] || SHAPES.birds

  return (
    <div className={styles.root} aria-hidden="true">
      {!isPerched && (
        <>
          <div className={`${styles.flyZoneBg} fly-zone-bg`}>
            {BG_BIRDS.map((n) => (
              <div key={n} className={`lovebird-parallax-wrap p-wrap-${n}`}>
                <svg className={`lovebird lovebird-${n}`} viewBox="0 0 64 64"
                     dangerouslySetInnerHTML={{ __html: inner }} />
              </div>
            ))}
          </div>
          <div className={`${styles.flyZoneFg} fly-zone-fg`}>
            {FG_BIRDS.map((n) => (
              <div key={n} className={`lovebird-parallax-wrap p-wrap-${n}`}>
                <svg className={`lovebird lovebird-${n}`} viewBox="0 0 64 64"
                     dangerouslySetInnerHTML={{ __html: inner }} />
              </div>
            ))}
          </div>
        </>
      )}
      <PerchedCanvas active={isPerched} paletteKey={paletteKey} />
    </div>
  )
}
```
Copy the literal SVG path strings from the style guide into `SHAPES` (do not paraphrase the `d=` attributes). `PerchedCanvas` is implemented in Task 8 — for this task stub it as `function PerchedCanvas() { return null }` so the file compiles.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (`.jsx` is allowed via the existing jsconfig/tsconfig allowJs).

- [ ] **Step 5: Commit**

```bash
git add src/all-templates/lovebirds/components/Ornaments.jsx src/all-templates/lovebirds/components/Ornaments.module.css src/all-templates/lovebirds/config/ornamentThemes.js
git commit -m "feat(lovebirds): Ornaments component — birds + butterflies fly-zones"
```

### Task 8: `PerchedCanvas` — port the Canvas 2D engine

**Files:** Modify `src/all-templates/lovebirds/components/Ornaments.jsx`.

- [ ] **Step 1: Implement `PerchedCanvas` from style guide lines 2481–3082**

Replace the stub with a component that runs the engine in an effect:
```jsx
function PerchedCanvas({ active, paletteKey }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const theme = resolveOrnamentTheme(paletteKey)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0, H = 0, branchScale = 1.0, raf = 0
    // … all module-scope vars from the style guide engine become locals here …

    function resizeCanvas() { /* lines 2507–2518 verbatim, using local W/H/branchScale */ }
    // getFlightWaypoints, getFlightPosition, catmullRom, drawBranch, spawnHeart,
    // renderCanvas — ported from lines 2557–3060, with `currentTheme` → `theme`.

    function loop(time) { renderCanvas(time); if (!reduce) raf = requestAnimationFrame(loop) }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resizeCanvas) }
  }, [active, paletteKey])

  return <canvas ref={canvasRef} className={styles.canvas} style={{ display: active ? 'block' : 'none' }} />
}
```
Port rules:
- Every `currentTheme.branch/branchDark` → `theme.branch/branchDark`; bird fill `currentTheme.accent` → `theme.accent`.
- The style guide's module-level `canvas/ctx/W/H/branchScale` globals become effect locals.
- Keep the math verbatim: clamped `branchScale` (2517–2518), synced perch coords (2821–2867), Catmull-Rom flight, `atan2` rotation, `scaleX` flip, banking tilt, heart particles.
- `prefers-reduced-motion`: render ONE static frame (birds perched) then stop the loop.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/all-templates/lovebirds/components/Ornaments.jsx
git commit -m "feat(lovebirds): perched-bird Canvas 2D engine (responsive)"
```

### Task 9: Mount `Ornaments`, remove the GIF everywhere

**Files:** Modify `Shell.jsx`, `GlobalBackground.jsx`, `TemplateCard.tsx`, `TemplateShowcase.tsx`; delete `background/route.ts` (if unused) and the gif asset.

- [ ] **Step 1: Mount in `Shell.jsx`**

Add import `import Ornaments from './components/Ornaments.jsx'`. Replace the `bgGif` plumbing:
```jsx
  // (remove) const bgGif = config?.bgGif
  const ornamentType = config?.theme?.ornamentType || 'birds'
  const paletteKey = config?.theme?.defaultPalette
```
In the tree, change `<GlobalBackground gifUrl={bgGif} />` to:
```jsx
      <GlobalBackground />
      <Ornaments ornamentType={ornamentType} paletteKey={paletteKey} />
```

- [ ] **Step 2: Strip the GIF layer from `GlobalBackground.jsx`**

Remove the `gifUrl` param, the `resolvedGif` line (27), and the `{resolvedGif ? <img className={styles.gifLayer} … /> : null}` block (31–33). Keep washes, corner ornaments, petals. Remove the now-unused `.gifLayer` rule from `GlobalBackground.module.css`.

- [ ] **Step 3: Remove gif `<img>` in marketing**

In `TemplateCard.tsx` (~line 58) and `TemplateShowcase.tsx` (~line 178) delete the `<img src="/images/wedding-animation.gif" …>` elements (and any now-empty wrapper / unused style).

- [ ] **Step 4: Delete the background save route if unused**

Run: `grep -rn "invitation/.*/background\|/background'" src/ | grep -v node_modules`
Expected: only the route file + the soon-deleted BackgroundTab. If so:
```bash
git rm src/app/api/invitation/[slug]/background/route.ts
```
(use `GIT_LITERAL_PATHSPECS=1` if the bracket path globs).

- [ ] **Step 5: Delete the asset if unreferenced**

Run: `grep -rn "wedding-animation" src/`
Expected: empty after Steps 1–4 (and Task 10). If empty: `git rm public/images/wedding-animation.gif`.

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` (expect clean).
```bash
git add -A
git commit -m "feat(lovebirds): mount Ornaments, remove wedding-animation.gif"
```

### Task 10: Dashboard ornament picker

**Files:** Create `OrnamentTab.tsx` (from `BackgroundTab.tsx`); delete `BackgroundTab.tsx`; modify `DashboardClient.tsx`, `dashboard.ts` i18n.

- [ ] **Step 1: Add i18n strings (id + en) and rename the tab label**

In `dashboard.ts`, in BOTH `id.chrome.tabs` and `en.chrome.tabs`, replace `background: 'Latar' / 'Background'` with `ornament: 'Ornamen' / 'Ornament'`.
Replace the `id.tabs.background` block (102–126) and the `en.tabs.background` block with an `ornament` block:
```ts
      ornament: {
        title: 'Ornamen Layar',
        subtitle: 'Pilih hiasan animasi yang melayang di undangan kamu.',
        birds: 'Burung 🐦',
        butterflies: 'Kupu-kupu 🦋',
        perched: 'Bertengger 🪵',
        saving: 'Menyimpan…',
        save: 'Simpan',
        saveFailed: 'Simpan gagal',
        networkError: 'Network error',
        savedOk: 'Tersimpan ✓',
      },
```
(English variant: title 'Screen Ornaments', subtitle 'Pick the floating animated decoration for your invitation.', labels 'Birds/Butterflies/Perched', etc.)

- [ ] **Step 2: Create `OrnamentTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'

const TYPES = ['birds', 'butterflies', 'perched'] as const
type OrnamentType = typeof TYPES[number]

const PREVIEW: Record<OrnamentType, string> = {
  birds: `…birds SVG inner (style guide 2312–2314)…`,
  butterflies: `…butterflies inner…`,
  perched: `…perched inner…`,
}

export default function OrnamentTab({ slug, initial }: { slug: string; initial?: string }) {
  const t = (useDashboardDict().tabs as any).ornament
  const [type, setType] = useState<OrnamentType>(
    (TYPES as readonly string[]).includes(initial || '') ? (initial as OrnamentType) : 'birds',
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ornamentType: type }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); setMsg({ kind: 'err', text: e.error || t.saveFailed }); return }
      setMsg({ kind: 'ok', text: t.savedOk })
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || t.networkError }) }
    finally { setSaving(false) }
  }

  const labels: Record<OrnamentType, string> = { birds: t.birds, butterflies: t.butterflies, perched: t.perched }

  return (
    <div style={card}>
      <header><h2 style={h2}>{t.title}</h2><p style={sub}>{t.subtitle}</p></header>
      <div style={grid}>
        {TYPES.map((ty) => (
          <button key={ty} type="button" onClick={() => setType(ty)}
            style={{ ...optBtn, borderColor: type === ty ? '#2A2118' : 'rgba(42,33,24,0.15)', outline: type === ty ? '2px solid #2A2118' : 'none' }}>
            <svg viewBox="0 0 64 64" width="40" height="40" style={{ fill: '#E8553E' }}
                 dangerouslySetInnerHTML={{ __html: PREVIEW[ty] }} />
            <span style={{ fontSize: 13 }}>{labels[ty]}</span>
          </button>
        ))}
      </div>
      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" style={btnPrimary} onClick={save} disabled={saving}>{saving ? t.saving : t.save}</button>
      </footer>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 28, boxShadow: '0 12px 36px rgba(42,33,24,0.06)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }
const optBtn: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 14px', borderRadius: 12, border: '1px solid', background: '#fff', cursor: 'pointer', color: '#2A2118' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid rgba(42,33,24,0.06)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const msgOk: React.CSSProperties = { fontSize: 12, color: '#2D8C4E', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: '#E8553E', marginRight: 'auto' }
```
Copy the literal SVG inner strings into `PREVIEW` from the style guide.

- [ ] **Step 3: Rewire `DashboardClient.tsx`**

- In `TabKey`, replace `'background'` with `'ornament'`.
- In `tabKeys`, replace the background push with: `if (template !== 'solary') keys.push('ornament')`.
- Replace import `BackgroundTab` → `OrnamentTab`.
- Replace the render block:
```tsx
            {tab === 'ornament' && (
              <OrnamentTab slug={slug} initial={invitation.config?.theme?.ornamentType} />
            )}
```

- [ ] **Step 4: Delete `BackgroundTab.tsx`**

```bash
git rm src/app/[template]/[slug]/dashboard/BackgroundTab.tsx
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (confirm no remaining `BackgroundTab`/`bgGif` references: `grep -rn "BackgroundTab\|bgGif\|config?.bgGif" src/`).

- [ ] **Step 6: Manual verification (dev server)**

Run `npm run dev`. On a seeded lovebirds slug dashboard: open the **Ornamen** tab, pick each of Birds/Butterflies/Perched, Save → expect "Tersimpan ✓". Open the public invite in a new tab → confirm the chosen ornament renders (perched shows the canvas branch+birds; others show flying SVGs) and that NO gif appears. Screenshot each for the review checkpoint.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dashboard): ornament picker replacing background GIF tab"
```

---

## Phase 3 — "Classy & Fun" component integration (frontend-design pass)

> Use the **frontend-design** skill for this phase. Work section-by-section, screenshot each change, and get user sign-off on the look before moving on. Keep edits inside sections; do not change config/data shapes. All visuals must read theme CSS vars so they track palette + ornament work.

### Task 11: Port the missing button CSS

**Files:** Modify `src/all-templates/lovebirds/styles/theme.css`.

- [ ] **Step 1: Add `.btn-magnetic-slide` + `.btn-iridescent-glass`**

Port verbatim from style guide lines **1130–1211** into `theme.css` (after `.btn-offset-border`). Adapt: any literal `var(--theme-accent)` → `var(--accent)`; `var(--theme-button-fg)` → `var(--button-fg)`; literal font vars already match. Guard the slide animation with `@media (prefers-reduced-motion: reduce) { .btn-magnetic-slide span { transition: none } }`.

- [ ] **Step 2: Typecheck (CSS only — just confirm dev build)**

Run: `npx tsc --noEmit` (expect clean; CSS isn't typechecked but catches accidental JS edits).

- [ ] **Step 3: Commit**

```bash
git add src/all-templates/lovebirds/styles/theme.css
git commit -m "feat(lovebirds): port magnetic-slide + iridescent-glass buttons"
```

### Task 12: Wire classy components into sections (iterative)

**Files:** Modify section JSX/CSS — candidates: `sections/OurStory/*`, `sections/BrideGroom/*`, `sections/Rsvp/Rsvp.jsx`, `sections/WeddingGift/WeddingGift.jsx`, `sections/EventDetails/*`. Decide final set with frontend-design judgment.

- [ ] **Step 1: Our Story → polaroid Arch/Stamp frames**

Apply `.polaroid-arch` to the primary Our Story photo cards and `.polaroid-stamp` to 1–2 accent photos. Verify against `registry.js` which Our Story variant is active (from Task 2) and edit that one. Screenshot; confirm framing + Sacramento caption render.

- [ ] **Step 2: Bride & Groom / Event Details → glass iridescent**

Apply `.glass-iridescent` to the person cards (or event detail cards). Screenshot.

- [ ] **Step 3: Buttons → classy variants**

RSVP submit → `.btn-iridescent-glass`; a hero or Wedding Gift CTA → `.btn-magnetic-slide` (its label needs `data-text` per the style guide markup); secondary actions (map/copy) → `.btn-offset-border`. Screenshot each.

- [ ] **Step 4: Cross-palette check**

Switch palette (e.g. to `royalPlum` / `forestMist`) via the dashboard and confirm the classy components + ornaments still read correctly (contrast, accent). Screenshot.

- [ ] **Step 5: Typecheck + commit per section**

Run: `npx tsc --noEmit` after each section. Commit incrementally, e.g.:
```bash
git add src/all-templates/lovebirds/sections/OurStory
git commit -m "feat(lovebirds): polaroid arch/stamp frames in Our Story"
```

---

## Self-Review notes (spec coverage)

- Spec §2 (Phase 0) → Task 0. §3.1 → Task 1. §3.2 (+ protected classes) → Task 2 (protection honored in Tasks 11–12). §3.3 → Task 3.
- §4.1 (data + route) → Task 6. §4.2 (fly-zones) → Task 7. §4.3 (canvas) → Task 8. §4.4 (10 palettes) → Task 5. §4.5 (picker) → Task 10. §4.6 (fonts) → Task 4. §4.7 (mount/GIF removal) → Task 9. §4.8 (Phase 3) → Tasks 11–12.
- Acceptance: ornament tab + persistence (Task 10), no gif (Task 9 grep), responsive birds/canvas (Tasks 7–8 + manual), 10 palettes (Task 5), fonts (Task 4), classy components (Tasks 11–12), `tsc` clean (every task).
- Naming consistency: `config.theme.ornamentType`, `ORNAMENT_TYPES`, `resolveOrnamentTheme(paletteKey)`, `Ornaments`/`PerchedCanvas`, tab key `ornament` — used identically across Tasks 6–10.
