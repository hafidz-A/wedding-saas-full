# Lovebirds — Cleanup + Screen Ornament System

**Date:** 2026-05-31
**Branch:** `feat/solary-editor`
**Status:** Design — awaiting implementation plan

---

## 1. Goal

Two related deliverables, executed in order:

1. **Repo tidy-up** — remove irrelevant loose files, dead in-repo code, and trim
   verbose comments to lower token cost when reading the project.
2. **Lovebirds ornament system** — replace the bundled `wedding-animation.gif`
   with three selectable, fully-responsive screen ornaments ported from
   `style-guide-lovebirds.html`:
   - **Birds** 🐦 (default)
   - **Butterflies** 🦋
   - **Perched** 🪵 (Canvas 2D — birds fly in, land on a procedurally-drawn
     branch, heart particles drift up)

   The couple picks the ornament from the dashboard. The lovebirds palette set
   is expanded from 7 → 10 presets to match the style guide.
3. **"Classy & Fun" component pass** (§4.8) — port the remaining style-guide
   component variations (glass card, polaroid Arch/Stamp frames, decorative
   buttons) and wire the fitting ones into real sections via the frontend-design
   skill, for a playful but tasteful visual upgrade.

**Reference (read-only):** `c:\Users\arifi\Downloads\multi-template\style-guide-lovebirds.html` (3082 lines).

### Non-goals
- No template-*engine* switcher (lovebirds ↔ solary). The dashboard picker
  stays within lovebirds variants. `template_id` is untouched.
- No GIF-upload feature retained — it is fully removed.
- No `variant-classy-fun` body toggle / dashboard font-mode control. Fonts are
  fixed at the base level only (§4.6).

---

## 2. Phase 0 — Safety checkpoint (prerequisite)

The working tree has large uncommitted WIP (solary editor + lovebirds, edited in
parallel). Before any deletion or refactor:

- Stage **everything currently in the tree** and commit as
  `wip: snapshot before lovebirds ornament work` on `feat/solary-editor`.
- This is the one sanctioned `git add -A`, because the checkpoint's purpose is to
  capture all in-flight work so cleanup is reversible. The staged set is shown to
  the user before committing.
- The design doc commit is a separate, targeted commit (only the spec file).

---

## 3. Phase 1 — Cleanup

### 3.1 Root loose files (`multi-template/`, NOT under git → irreversible)
**Delete:** `landing-desktop*.png`, `landing-fixed.png`, `landing-mobile-*.png`,
`login-with-nav.png`, `templates-with-nav.png`, `test-*.png`,
`landing_page_concept.html`, `landing_page_concept_mobile.html`.
**Keep:** `style-guide-lovebirds.html` (reference), `proyek_integration_prompt.md`,
the `.playwright-mcp/` dir, and the `wedding-saas-next/` repo.

### 3.2 Dead in-repo code (`wedding-saas-next/`, safe — under git)
Find-and-verify-then-delete. A file/symbol is removed only after grep proves it
has no remaining importers/references:
- Orphaned section variants (e.g. confirm whether `sections/OurStoryStack/` or
  `sections/OurStory/Story*` helpers are still wired through `registry.js` /
  `blockRegistry.js`; delete the unreferenced set).
- Dangling references to already-deleted files (`NotesTab`, `services/wishes.js`).
- Unused imports / exports surfaced by `tsc --noEmit` and grep.

**Explicitly protected from deletion:** the "Classy & Fun" component-variation
classes in lovebirds `theme.css` (`.glass-iridescent`, `.polaroid-arch`,
`.polaroid-stamp`, `.btn-offset-border`, and the buttons added in Phase 3).
They are currently unused but will be wired into real sections in Phase 3 (§4.8)
— do NOT treat them as dead code.

### 3.3 Comment trimming
- Collapse decorative banner / multi-line restatement comments into concise
  one-liners in: the lovebirds template, the dashboard, and every file touched
  by Phase 2.
- **Preserve:** `eslint-disable`, `@ts-*`, license headers, JSDoc on exported
  APIs, and TODO/FIXME that carry real intent.
- Do **not** mass-rewrite untouched solary files (avoids noise vs. ongoing WIP).

---

## 4. Phase 2 — Ornament system

### 4.1 Data model

- New field: `config.theme.ornamentType` ∈ `'birds' | 'butterflies' | 'perched'`.
  Default (absent) → `'birds'`.
- Persisted via the existing `PUT /api/invitation/[slug]/theme` route, extended
  to accept an optional `ornamentType`, server-validated against the enum
  (reject otherwise). `defaultPalette` handling is unchanged. Owner-only, same
  isolated-merge pattern (`cfg.theme = { ...cfg.theme, ornamentType }`).

### 4.2 New component: `lovebirds/components/Ornaments.jsx` (+ `.module.css`)

Props: `{ ornamentType = 'birds', paletteKey }`.

Renders three things into a fixed, viewport-pinned, `pointer-events:none` layer:

1. **Fly-zone (background)** — `z-index: 1`, 5 SVG ornaments
   (`lovebird-5`…`lovebird-9`), parallax wrappers.
2. **Fly-zone (foreground)** — `z-index: 3`, 3 SVG ornaments
   (`lovebird-1`…`lovebird-3`).
3. **`<canvas>`** — the perched engine, `z-index: 1`, `display:none` unless
   `ornamentType === 'perched'`.

SVG path set is chosen by `ornamentType` from a `SHAPES` map
(`birds` / `butterflies` / `perched`) ported verbatim from style guide
lines 2310–2331. Birds & butterflies animate via ported CSS keyframes
(`@keyframes` using `vw`/`vh` translation) plus the mobile size-ramp media query
(`max-width: 768px`, `lovebird-1`…`lovebird-15`) from the integration prompt.

When `ornamentType === 'perched'`: the two fly-zones are hidden (CSS) and the
canvas is shown + animation loop runs; otherwise the canvas loop is stopped.
This mirrors the style guide's `body.active-type-perched` rules (lines 222–236),
implemented in React via conditional `className`/render rather than mutating
`document.body`.

### 4.3 Canvas 2D engine (perched)

Ported from style guide lines 2481–3082 into a `useEffect` (with `useRef` for the
canvas + animation-frame handle). Faithful port of:
- `resizeCanvas()` with DPR handling and the clamped global `branchScale`
  (`Math.min(W/500, H/350) * 0.85`, clamped to `[0.65, 1.4]`) — lines 2507–2518.
- Synced perch coordinates (`getFlightWaypoints`, `getFlightPosition`,
  `renderCanvas`) all using the same `branchScale` — lines 2821–3060.
- Catmull-Rom spline flight through viewport-proportional waypoints; body
  rotation from `atan2(dy,dx)`; 3D body-flip via dynamic `scaleX`; banking tilt
  from turn acceleration.
- Procedural branch with highlights; rising heart particles while perched.
- Bird + branch colours bound to the **active theme**: accent read at runtime via
  `getComputedStyle` on the themed root; `branch`/`branchDark` from a per-palette
  hex map (values copied from style guide lines 2096–2269).

Cleanup on unmount / type-change: cancel the rAF loop and remove the resize
listener.

### 4.4 Theme / palette expansion (7 → 10)

Add `royalPlum`, `forestMist`, `terracottaOasis` to:
- `lovebirds/config/themes.js` (CSS-var-key map form, derived from style guide
  theme objects: `bg`→`--bg`, `fg`→`--fg`, `accent`→`--accent`, etc.).
- Any missing color tokens in `src/styles/tokens.css`.
- `PaletteTab.tsx` `LOVEBIRDS_LIGHT` / `LOVEBIRDS_DARK` swatch groups + the
  server-side `palette-allowlist`.
- A `BRANCH_COLORS` map (palette key → `{ branch, branchDark }`) consumed by the
  canvas engine, sourced from the style guide theme objects.

### 4.5 Dashboard — Ornament picker

Repurpose the existing `background` tab:
- Rename `BackgroundTab.tsx` → `OrnamentTab.tsx` (remove all GIF upload / preview
  logic). Three pill buttons (Birds 🐦 / Butterflies 🦋 / Perched 🪵) with a live
  inline SVG preview of the selected shape. Saves `ornamentType` via the theme
  route.
- `DashboardClient.tsx`: rename tab key `background` → `ornament`; keep the
  "hidden for solary" guard; update i18n dictionary keys (`tabs.ornament`, label
  strings in ID + EN).
- Wire `invitation.config?.theme?.ornamentType` as the tab's `initial`.

### 4.6 Fonts — base correctness (no variant toggle)

Make the lovebirds font system match the style guide. Scope is **base wiring
only** — no `variant-classy-fun` body toggle and no dashboard control (the
existing `.glass-iridescent` / `.polaroid-arch` components that reference
`--font-display-classy` simply resolve to the right family instead of falling
back).

- `src/app/layout.tsx`: add two `next/font/google` loaders and expose their CSS
  vars on the body:
  - `Sacramento` → `--font-sacramento` (the "classy" display script).
  - `Kameron` (weights 400/700) → `--font-kameron` (serif-soft, already named by
    `--font-serif-soft`; currently unloaded).
  - `Plus Jakarta Sans` is already loaded as `--font-jakarta` — reuse it for the
    "fun" body.
- Define the missing vars so existing references resolve (in `tokens.css` and/or
  lovebirds `theme.css`):
  - `--font-display-classy: var(--font-sacramento), 'Sacramento', cursive;`
  - `--font-body-fun: var(--font-jakarta), 'Plus Jakarta Sans', sans-serif;`
  - point `--font-serif-soft` at `var(--font-kameron), 'Kameron', serif`.
- Verify the default lovebirds pairing still matches the style guide
  (display `Great Vibes`, body `Plus Jakarta Sans`, serif-soft `Kameron`).

### 4.7 Mount + GIF removal

- `Shell.jsx`: render `<Ornaments ornamentType={config?.theme?.ornamentType}
  paletteKey={config?.theme?.defaultPalette} />` alongside the existing
  `<GlobalBackground />`.
- `GlobalBackground.jsx`: **keep** petals + corner ornaments + washes; remove the
  `gifUrl` prop and the GIF `<img>` layer entirely.
- Remove `wedding-animation.gif` references from `TemplateCard.tsx`,
  `TemplateShowcase.tsx`, and the `api/invitation/[slug]/background` route
  (the route + `BackgroundTab` GIF path are deleted; if the route has no other
  use, delete it).
- Delete the `public/images/wedding-animation.gif` asset if nothing else
  references it.

### 4.8 Phase 3 — "Classy & Fun" component integration (frontend-design pass)

The style guide's "Elegant, Fun & Classy Component Variations" (glass card,
polaroid Arch/Stamp frames, decorative buttons) currently live as **unused** CSS
in `theme.css`. This phase ports the missing ones and **wires the fitting ones
into real lovebirds sections**, choosing — with design judgment — which feel
playful-yet-tasteful for a wedding invite. The **frontend-design skill** drives
this pass; changes are validated visually (browser screenshots) and iterated with
the user.

**Approved deviation:** this intentionally breaks the CLAUDE.md "sections stay
byte-identical with the Vite project" convention. The user explicitly requested a
visual upgrade here, so it supersedes that convention for the sections touched
(recorded like the WeddingGift deviation).

**Complete the CSS set** (port from style guide lines 1130–1211):
- `.btn-magnetic-slide`, `.btn-iridescent-glass` into `theme.css`
  (`.btn-offset-border` already present).

**Proposed starting mapping** (refined during the design pass, not final):
- **Polaroid Arch frame** → Our Story photo cards (romantic arch silhouette).
- **Polaroid Stamp frame** → a few accent photos (e.g. Save-the-Date / gallery
  highlight) — used sparingly, not on every gallery tile.
- **Glass iridescent card** → Bride & Groom person cards and/or Event Details
  glass cards.
- **Buttons** — primary RSVP submit → `.btn-iridescent-glass`; a hero/navbar or
  Wedding Gift CTA → `.btn-magnetic-slide`; secondary actions (Open Map, copy) →
  `.btn-offset-border`.

**Constraints:**
- All variations must read from theme CSS vars (`--accent`, `--font-*`,
  `--shadow-polaroid`) so they track palette + the Phase 2 ornament/palette work.
- Stay within sections; do not restructure section data/config shapes.
- Respect `prefers-reduced-motion` for the animated buttons.
- Touch the **minimum** set of sections needed; avoid colliding with in-flight
  WIP files where possible, and never stage WIP into these commits.

---

## 5. Component boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `Ornaments.jsx` | Render fly-zones + canvas; own the canvas rAF lifecycle | `SHAPES`, `BRANCH_COLORS`, theme CSS vars |
| `Ornaments.module.css` | Fly-zone positioning, keyframes, responsive ramp, canvas pinning | — |
| `OrnamentTab.tsx` | Dashboard picker UI + save | theme API route, i18n dict |
| theme route (extended) | Validate + persist `ornamentType` | enum, auth |
| `themes.js` / `tokens.css` / `palette-allowlist` | 10-preset palette data | — |

The canvas engine is self-contained inside `Ornaments.jsx`'s effect — testable in
isolation by mounting with `ornamentType="perched"` and asserting a canvas mounts
+ rAF starts/stops on type change.

---

## 6. Risks / watch-items

- **Canvas perf on mobile** — `branchScale` clamp + DPR cap mitigate; gate behind
  `prefers-reduced-motion` (freeze loop) like `BotanicalBorder`/`OurStory` do.
- **SSR** — `Ornaments` is `'use client'`; all `window`/`canvas` access inside
  effects only.
- **Theme colour read timing** — read `getComputedStyle` after first paint /
  on palette change so the canvas picks up the active theme, not defaults.
- **Dirty WIP tree** — Phase 0 checkpoint makes everything reversible; never
  stage the user's parallel edits into feature commits without showing them.
- **i18n** — new `ornament` tab strings must land in both `id` and `en`
  dictionaries or the dashboard label crashes.

---

## 7. Acceptance

- Dashboard shows an **Ornament** tab (lovebirds only) with 3 working options +
  live preview; selection persists and re-renders the public invite.
- Public invite renders the chosen ornament; **no** `wedding-animation.gif`
  reference remains anywhere (`grep` clean).
- Birds/butterflies scale down correctly on ≤768px; perched canvas birds stay on
  the branch and within viewport on phone and desktop.
- 10 palettes selectable; perched branch/bird colours track the active palette.
- Fonts load correctly: `Sacramento` + `Kameron` available; `--font-display-classy`
  / `--font-body-fun` / `--font-serif-soft` all resolve to loaded families (no
  silent fallback); `.polaroid-arch` etc. render in Sacramento.
- Classy & Fun set is complete (incl. `.btn-magnetic-slide`,
  `.btn-iridescent-glass`) and visibly applied to at least the Our Story polaroid
  frames, a glass card, and the RSVP/CTA buttons — verified by screenshot.
- `tsc --noEmit` clean; repo grep for deleted symbols is clean.
