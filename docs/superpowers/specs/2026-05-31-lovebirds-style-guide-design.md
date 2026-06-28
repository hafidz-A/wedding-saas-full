# Lovebirds Style Guide — Design Spec

**Date:** 2026-05-31
**Status:** Approved (design), pending spec review
**Author:** Claude (brainstorming session with user)

---

## 1. Goal

Produce a single, self-contained `style-guide-lovebirds.html` document for the
**lovebirds** template, mirroring the structure of the existing "Galactic Wedding" style
guide the user supplied, but with **every value sourced from the real lovebirds code** — not
invented or approximated.

The artifact is documentation: a designer/developer reference that shows the palette,
typography, tokens, and signature components of the lovebirds template, with copy-ready
CSS snippets.

### Non-goals (YAGNI)

- No build step / generator script — it is a static hand-authored HTML file.
- No changes to the lovebirds template source itself.
- Not a full catalog of every section — Component Library features the *signature*
  components actually used in lovebirds (curated), while Color/Typography/Tokens are
  complete.

---

## 2. Output

| Property | Value |
|---|---|
| File | `wedding-saas-next/style-guide-lovebirds.html` |
| Format | One self-contained HTML file; CSS inline in a `<style>` block; fonts via Google Fonts CDN |
| Language | Indonesian-mixed descriptive copy, matching the tone of the Galactic guide |
| Shell theme | Lovebirds world: cream/charcoal light surface (NOT the dark-space shell of the Galactic guide) |
| Fonts loaded | Cormorant Garamond, DM Sans, Great Vibes, Kameron |

---

## 3. Source of truth (files to extract from)

All under `wedding-saas-next/src/`:

| Concern | File(s) |
|---|---|
| Brand palette, neutrals, fonts, radii, shadows, spacing, motion | `styles/tokens.css` |
| Font imports + family vars | `styles/fonts.css` |
| Lovebirds ambient background + glass/3D-button vars | `all-templates/lovebirds/styles/theme.css` |
| Named theme presets (`warmCream`, `darkLuxury`, `emeraldGarden`, `skyEditorial`) | `all-templates/lovebirds/config/themes.js` |
| Section→theme assignment | `all-templates/lovebirds/defaultConfig.js` |
| Component CSS (verbatim snippets) | `all-templates/lovebirds/components/FloatingNavbar.module.css`, `sections/OurStoryStack/OurStory.module.css` (polaroid/story card), `sections/BrideGroom/BrideGroom.module.css` (glass/cinematic card), `sections/WeddingGift/WeddingGift.module.css` + `blocks/blocks.module.css` (buttons) |

**Rule:** when a CSS value is shown as a "copy-ready" snippet, it must be transcribed
verbatim from the file above, not paraphrased. Token tables cite the real CSS var names.

---

## 4. Document structure (sections)

Mirrors the Galactic guide's skeleton. Each `<section>` separated by a divider.

### Hero
- Eyebrow: `Lovebirds Template · Style Guide`
- Display headline in Cormorant + a Great Vibes script accent.
- One-line intro naming the source of truth (`tokens.css`, `theme.css`, `themes.js`).
- `Last sync: 2026-05-31`.

### 01 · Color System
- **Brand palette swatches:** coral `#E8553E`/soft `#F4A38F`, gold `#F5C842`/soft
  `#FBE3A6`, emerald `#2D8C4E`/soft `#8FCBA1`, purple `#6B35A8`/soft `#BFA5DC`,
  sky `#3D9BC1`/soft `#A8D5E3`.
- **Theme preset cards** (4): `warmCream`, `darkLuxury`, `emeraldGarden`, `skyEditorial`
  — a preview card per theme rendered with that theme's `--bg`/`--fg`/`--accent`, plus
  a swatch row + the JS key. Values from `themes.js`.
- **Neutral / surface table:** cream, cream-deep, greige, charcoal, charcoal-light,
  paper, ink.
- **Semantic token table:** `--bg`, `--fg`, `--fg-muted`, `--accent`, `--accent-soft`,
  `--glass-bg`, `--glass-border`, `--glass-text`, `--button-bg`, `--button-fg` — purpose
  of each (from `themes.js` + `theme.css`).

### 02 · Typography
- Four family cards: Cormorant Garamond (`--font-display`), DM Sans (`--font-body`),
  Great Vibes (`--font-script`), Kameron (`--font-serif-soft`) — role + fallback.
- Type-scale rows (display / h1 / h2 / h3 / lede / body / script accent) with the
  font/role metadata.

### 03 · Design Tokens
- **Radii** *(updated 2026-06-28 — unified scale; old `--border-radius-*` removed):*
  `--radius-xs` 4 · `--radius-sm` 8 · `--radius-md` 16 (card/panel) · `--radius-lg` 24 ·
  `--radius-pill` 999 · `--radius-round` 50%. One scale across all templates + chrome.
- **Control heights** *(added 2026-06-28):* `--ctl-h-sm` 36 (dense/admin), `--ctl-h` 44
  (default; = `--tap-target`), `--ctl-h-lg` 52 (hero/gate CTA). Guard: `npm run check:tokens`.
- **Shadows:** `--shadow-card`, `--shadow-card-hover`, `--shadow-soft`,
  `--shadow-polaroid`, plus lovebirds glass/3D-button shadows from `theme.css`
  (`--shadow-glass`, `--shadow-button-3d` + hover/active).
- **Spacing & layout:** `--spacing-section` clamp, `--spacing-section-mobile`,
  `--container-max` 1240px, `--container-pad`, `--tap-target` 44px, breakpoints
  768/1024.
- **Motion:** `--transition-default`, `--transition-slow`, `--ease-out` — with a small
  animated easing demo (optional, like Galactic).

### 04 · Component Library
Live demo + verbatim CSS snippet + short note, for the curated signature set:
1. **Glass card** — from BrideGroom/WeddingGift glass surface (`--glass-bg`, backdrop blur).
2. **Polaroid / Story card** — cream frame, asymmetric padding, `--shadow-polaroid`,
   slight rotation (from OurStoryStack).
3. **Buttons** — 3D button (`--shadow-button-3d` press effect) + ghost variant.
4. **Eyebrow tag** — uppercase tracked label in accent color.
5. **Floating navbar** — cream glass pill, coral active pill (from `FloatingNavbar.module.css`).
6. **(Optional 6th)** — BrideGroom person/cinematic card if it adds value without bloat.

### 05 · How to use
- Two code blocks: (a) consuming tokens via `var(--…)` in CSS; (b) applying a theme
  preset to a section via the `theme:` field / `resolveTheme()` from `themes.js`.

### 06 · Section → theme mapping
- Table of lovebirds sections → assigned theme, read from `defaultConfig.js`.

### Footer
- Attribution line: source files + sync date.

---

## 5. Approach

**Faithful extraction (chosen).** Read the source files listed in §3, transcribe real
values and verbatim CSS into the HTML skeleton. Rejected alternatives: structural clone
with approximated values (risks drift from real code), and a build-time generator
(overkill for one static doc).

---

## 6. Success criteria

- File opens standalone in a browser with correct fonts and no broken references.
- Every hex/token/CSS value shown matches the corresponding lovebirds source file.
- All six numbered content areas present (Color, Typography, Tokens, Components,
  How-to-use, Section mapping) plus hero & footer.
- Component CSS snippets are copy-ready and verbatim from the module CSS files.
- No edits made to any lovebirds template source file.
