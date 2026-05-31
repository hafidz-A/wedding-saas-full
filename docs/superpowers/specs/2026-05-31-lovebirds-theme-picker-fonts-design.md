# Lovebirds Global Theme Picker + Font Swap — Design Spec

**Date:** 2026-05-31
**Status:** Approved (design), pending spec review
**Author:** Claude (brainstorming session with user)

---

## 1. Goal

Give the **lovebirds** template a runtime theme system modeled on the existing **solary**
pattern:

- **Demo / preview** (`isDemo`): a floating palette switcher lets anyone preview **all**
  themes live.
- **Published**: the invitation is **locked** to the palette the owner chose; only the
  owner can change it, via the dashboard **Palette** tab (owner-authenticated).
- Each theme is a **complete look** applied globally, but the **Hero keeps a dramatic
  dark/inverted treatment** in every theme (Approach B).
- The invitation card's fonts are **globally swapped** to Playfair Display (display) +
  Plus Jakarta Sans (body) + Sacramento (script), scoped to the lovebirds route only.

This makes real the "Classy & Fun" exploration that currently lives only in
`style-guide-lovebirds.html`.

### Non-goals (YAGNI)

- No change to marketing site or dashboard fonts — the font swap is scoped to
  `body.lovebirds-route` only.
- No new dashboard infrastructure — reuse the existing `PaletteTab` + theme API, just
  generalize them per-template.
- No destructive DB migration — legacy per-section `theme:` fields become inert, not
  deleted (optional cleanup only).
- No Three.js / scene work (lovebirds has none).

---

## 2. Architecture (mirror of solary)

Solary already implements exactly the desired behavior. We port the same shape to
lovebirds:

| Concern | Solary (reference) | Lovebirds (to build) |
|---|---|---|
| Palette definitions | `config/themeTokens.js` `PALETTES` + `applyPaletteToDOM` + `themeBus` | NEW `config/palettes.js` — `PALETTES` + `applyPalette` + bus |
| Provider | `contexts/ThemeContext.jsx` (`defaultPalette`, `allowGuestSwitch`) | UPGRADE `components/ThemeProvider.jsx` to same contract |
| Guest/demo switcher | `components/PaletteSwitcher.jsx`, rendered `{isDemo && …}` | NEW `components/PaletteSwitcher.jsx`, same gating |
| Shell wiring | `Shell.jsx` passes `defaultPalette` + `allowGuestSwitch={isDemo}` | `Shell.jsx` add `isDemo` prop, same wiring |
| Mount | `InvitationView.tsx` passes `isDemo` to SolaryShell | also pass `isDemo` to LovebirdsShell |
| Owner picker | dashboard `PaletteTab.tsx` (hardcoded solary palettes) | generalize `PaletteTab.tsx` per `templateId` |
| Persist | `PUT /api/invitation/[slug]/theme` → `config.theme.defaultPalette` | same route, per-template `ALLOWED_PALETTES` |

**Demo vs published signal** already exists: `src/app/[template]/[slug]/page.tsx`
computes `isDemoSlug` and passes `isDemo` down through `InvitationView`. Guests on a
published slug get `isDemo=false` → `allowGuestSwitch=false` → locked palette, no switcher.

---

## 3. Palette model

NEW file `src/all-templates/lovebirds/config/palettes.js`.

Each palette is an object with **two token layers**:

```js
PALETTES = {
  warmCream: {
    id: 'warmCream',
    label: 'Warm Cream',
    group: 'light',           // for switcher/dashboard grouping
    swatch: '#E8553E',        // dashboard dot
    base: { /* CSS var map */ },
    inverted: { /* CSS var map for Hero */ },
  },
  ...
}
```

**`base` vars** (themes body + most sections):
`--page-bg` (body ambient), `--bg`, `--fg`, `--fg-muted`, `--accent`, `--accent-soft`,
`--glass-bg`, `--glass-border`, `--glass-text`, `--button-bg`, `--button-fg`.

**`inverted` vars** (Hero gate only) — same keys, dark/dramatic treatment.

### The 7 palettes — base values (from `style-guide-lovebirds.html` + `themes.js`)

| key | group | --page-bg | --fg | --accent | --accent-soft | --button-bg / fg |
|---|---|---|---|---|---|---|
| warmCream | light | cream→cream-deep gradient | #2A2118 | #E8553E | #F4A38F | #2A2118 / #FDF6EC |
| emeraldGarden | light | cream→cream-deep | #2A2118 | #2D8C4E | #8FCBA1 | #2A2118 / #FDF6EC |
| skyEditorial | light | cream→cream-deep | #2A2118 | #3D9BC1 | #A8D5E3 | #2A2118 / #FDF6EC |
| blossomVelvet | light | #FAF0EC→#F2B6C1 | #802B43 | #E06B7B | #F2B6C1 | #802B43 / #FAF0EC |
| sunsetClay | light | #FAF2EA→#EAD0A8 | #C85A32 | #C85A32 | #EAD0A8 | #C85A32 / #FAF2EA |
| darkLuxury | dark | #2A2118 | #FDF6EC | #F5C842 | #FBE3A6 | #FDF6EC / #2A2118 |
| midnightStardust | dark | #1E222D | #F5E5C9 | #E3C08D | #5D9CEC | #E3C08D / #1E222D |

For light palettes, `--bg: transparent` (body `--page-bg` shows through); `--glass-bg:
rgba(255,255,255,0.55)`. For dark palettes, `--bg` = the page bg; glass-bg per the
style guide (darkLuxury `rgba(30,23,17,0.55)`, midnightStardust `rgba(21,37,68,0.65)`).
`--fg-muted`: light palettes `#5C4A3A` (sunsetClay uses sage `#6E8268`); dark palettes a
~0.75–0.78 alpha of `--fg`.

### Inverted (Hero) rule — explicit

Hero always renders dark/dramatic regardless of palette:

- `--bg` / `--page-bg`: `#2A2118` for warm-family palettes (warmCream, darkLuxury,
  emeraldGarden, blossomVelvet, sunsetClay); `#1E222D` for cool/night palettes
  (skyEditorial, midnightStardust).
- `--fg`: `#FDF6EC` (warm-family) / `#F5E5C9` (cool/night).
- `--fg-muted`: 0.78 alpha of `--fg`.
- `--accent` / `--accent-soft`: the palette's own accent / accent-soft (unchanged).
- `--button-bg` = `--fg`, `--button-fg` = `--bg`, `--glass-bg`:
  `rgba(255,255,255,0.10)` over the dark surface.

So each palette keeps its accent identity while the Hero stays cinematic-dark.

### New brand color constants

Add to `src/all-templates/lovebirds/styles/theme.css` `body.lovebirds-route` block (kept
template-scoped, not in the app-global `tokens.css`): `--color-plum #802B43`,
`--color-rose #E06B7B`, `--color-rose-soft #F2B6C1`, `--color-mauve-cream #FAF0EC`,
`--color-terracotta #C85A32`, `--color-sage #6E8268`, `--color-peach-sand #FAF2EA`,
`--color-gold-sand #EAD0A8`, `--color-midnight #1E222D`, `--color-celestial #5D9CEC`,
`--color-champagne #E3C08D`, `--color-champagne-soft #F5E5C9`. Palette objects may
reference raw hex directly to stay self-contained.

---

## 4. Runtime application

NEW `applyPalette(name)` (in `palettes.js`):
1. Resolve palette (fallback to `warmCream` if unknown).
2. Write every `base` var onto `document.body` (the `.lovebirds-route` element) via
   `style.setProperty`.
3. Toggle body class `theme-<kebab(name)>` (remove other `theme-*` first).
4. Expose `paletteBus` snapshot (`current`, `set`, `subscribe`) mirroring solary's
   `themeBus`, for any non-React reader.

The Hero's `inverted` vars are applied by `SectionRenderer` on the Hero wrapper (see §5),
NOT globally.

UPGRADE `components/ThemeProvider.jsx` to the solary contract:
```
ThemeProvider({ defaultPalette = 'warmCream', allowGuestSwitch = false, children })
```
- State `palette`, seeded from `sessionStorage('lovebirds:palette')` when
  `allowGuestSwitch`, else `defaultPalette`.
- On change: `applyPalette(palette)`; persist to sessionStorage when allowed.
- When `!allowGuestSwitch`, force `palette = defaultPalette` (locked).
- Context value: `{ palette, setPalette, options }`. `useTheme()` exported.

The current `DEFAULT_THEME` color/font context is removed (unused by sections — they read
CSS vars, not context).

---

## 5. Hero stays dramatic (SectionRenderer)

MODIFY `renderers/SectionRenderer.jsx`:
- Stop calling `resolveTheme(section.theme)` for arbitrary per-section palettes.
- Determine the active palette from `ThemeProvider` (via `useTheme()`).
- For each section wrapper:
  - If `section.type === 'hero'` (or `section.role === 'inverted'`): spread the active
    palette's **inverted** vars onto the wrapper.
  - Else: spread nothing (section inherits **base** vars from `body.lovebirds-route`),
    still honoring an explicit `section.background` override via `resolveBackground`.
- `resolveBackground` is retained.

Result: switching palette re-themes the whole card; the Hero always gets the dark
inverted set of whichever palette is active.

`config/themes.js` `resolveTheme` becomes unused by the renderer; keep the file's
`resolveBackground` export, remove/retire `resolveTheme`/`themes` (or leave inert). Legacy
`section.theme` values in stored configs are simply ignored.

---

## 6. Fonts (global swap, scoped to the card)

- `src/styles/fonts.css`: extend the Google Fonts `@import` to also load **Playfair
  Display**, **Plus Jakarta Sans**, **Sacramento** (keep existing families loaded for
  fallback/other templates).
- `src/all-templates/lovebirds/styles/theme.css` — inside `body.lovebirds-route`, override:
  - `--font-display: 'Playfair Display', 'Cormorant Garamond', serif;`
  - `--font-body: 'Plus Jakarta Sans', 'DM Sans', sans-serif;`
  - `--font-script: 'Sacramento', 'Great Vibes', cursive;`
  - `--font-serif-soft` (Kameron) left unchanged.
- Because every lovebirds section reads these vars, all section typography updates
  automatically. Marketing pages and the dashboard (outside `.lovebirds-route`) are
  unaffected.

---

## 7. Dashboard owner picker + permission

MODIFY `src/app/[template]/[slug]/dashboard/PaletteTab.tsx`:
- Replace the hardcoded solary `DARK`/`LIGHT` arrays with a per-template lookup keyed by
  `templateId` (passed in as a prop, alongside existing `slug`/`initial`).
- Lovebirds groups (from §3): **Light** = warmCream, emeraldGarden, skyEditorial,
  blossomVelvet, sunsetClay; **Dark** = darkLuxury, midnightStardust. Labels + swatch
  dots per palette.
- `DashboardClient.tsx`: pass `templateId` into `PaletteTab` (it already knows the
  template from the route).

MODIFY `src/app/api/invitation/[slug]/theme/route.ts`:
- Replace the single `ALLOWED_PALETTES` set with a per-template map:
  `{ solary: Set(...existing), lovebirds: Set('warmCream','darkLuxury','emeraldGarden',
  'skyEditorial','blossomVelvet','sunsetClay','midnightStardust') }`.
- Resolve the invitation's template from the row's `template_id` column (extend the
  existing `.select('config')` to `.select('config, template_id')`) and validate
  `defaultPalette` against that template's allowed set (fall back to the union if
  `template_id` is null).
- Keep `verifyOwnership(slug)` gate unchanged → **only the owner** can change a published
  invitation's palette.

Persisted shape unchanged: `config.theme.defaultPalette` (same as solary). Lovebirds
`Shell` reads `config.theme?.defaultPalette`.

---

## 8. Shell + InvitationView wiring

MODIFY `src/all-templates/lovebirds/Shell.jsx`:
- Signature → `Shell({ config, slug, isDemo = false })`.
- Wrap the tree in the upgraded `<ThemeProvider defaultPalette={config.theme?.defaultPalette}
  allowGuestSwitch={isDemo}>`.
- Render `{isDemo && <PaletteSwitcher />}`.
- Keep `document.body.classList.add('lovebirds-route')` effect; the initial palette is
  applied by ThemeProvider.

MODIFY `src/app/[template]/[slug]/InvitationView.tsx`: pass `isDemo` to `LovebirdsShell`
(currently only forwarded to `SolaryShell`).

NEW `src/all-templates/lovebirds/components/PaletteSwitcher.jsx`: floating 🎨 toggle +
panel grouping palettes (Light / Dark) with active state, calling `setPalette` from
`useTheme()`. Visual style consistent with the lovebirds cream/glass aesthetic (own CSS
module, not solary's). No confetti dependency required.

---

## 9. Body background becomes palette-driven

Currently `theme.css` hardcodes the warm cream radial-gradient ambient on
`body.lovebirds-route`. Change it to consume `--page-bg` (set by `applyPalette`), with the
current cream gradient kept as the `warmCream` palette's `--page-bg` value (so default
appearance is unchanged). Dark palettes set a solid/dark `--page-bg`.

---

## 10. Backward compatibility

- Existing stored configs without `config.theme.defaultPalette` → ThemeProvider falls back
  to `warmCream` (current default look preserved, modulo the global font swap).
- Existing per-section `theme:` fields → ignored by the new SectionRenderer (no crash, no
  visual reliance). `migrate-lovebirds.ts` MAY strip them later; not required for launch.
- The global font change is intentional and applies to all lovebirds invitations.

---

## 11. Success criteria

- On a demo slug, the 🎨 switcher appears and switching any of the 7 palettes re-themes the
  whole card live (colors + body bg); the Hero stays dark/dramatic in every palette.
- On a published slug (guest), no switcher; the card renders the owner's saved palette and
  cannot be changed client-side.
- Dashboard Palette tab lists the 7 lovebirds palettes, saves via the theme API, and the
  published card reflects the choice after reload.
- The theme API rejects a palette not in the active template's allowed set, and rejects
  non-owners (403).
- Invitation card uses Playfair Display / Plus Jakarta Sans / Sacramento; marketing and
  dashboard fonts are unchanged.
- No regression: a config with no `theme` renders warmCream with the new fonts.

---

## 12. Risks / consequences (flagged to user)

1. **All existing lovebirds invitations change fonts** (card only). Accepted.
2. The fixed "dark hero over light body" contrast is now derived from each palette's
   `inverted` set rather than a hardcoded `darkLuxury` — verify the dark palettes
   (darkLuxury, midnightStardust) still read well when the whole card is already dark
   (Hero inverted ≈ base for those; acceptable).
3. Per-section theming is removed as a feature; if any couple relied on mixed per-section
   themes (none do in `defaultConfig`), they would lose it. Acceptable per design.
