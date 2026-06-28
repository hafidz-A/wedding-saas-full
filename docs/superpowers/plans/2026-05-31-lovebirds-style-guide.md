# Lovebirds Style Guide HTML — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or
> superpowers:subagent-driven-development to implement this plan. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Build one self-contained `wedding-saas-next/style-guide-lovebirds.html` documenting
the lovebirds design system (palette, typography, tokens, signature components), with every
value transcribed verbatim from the lovebirds source files.

**Architecture:** Single static HTML file, inline `<style>` block, fonts via Google Fonts
CDN. Light cream/charcoal shell (lovebirds world). Structure mirrors the user's Galactic
style guide: Hero → 01 Color → 02 Typography → 03 Tokens → 04 Components → 05 How-to-use →
06 Section→theme mapping → Footer. No source files are modified.

**Tech Stack:** Plain HTML5 + CSS. No JS required (optional tiny easing demo via CSS keyframes).

**Verification model:** This is a documentation artifact, not testable code. "Verification"
per task = (a) every value matches the cited source file, (b) the file renders correctly when
opened in a browser. A final visual check is done in Task 8.

---

## Source-of-truth value reference (transcribe verbatim)

All paths under `wedding-saas-next/src/`:

**Brand palette** (`styles/tokens.css:3-12`):
coral `#E8553E` / soft `#F4A38F`; gold `#F5C842` / soft `#FBE3A6`;
emerald `#2D8C4E` / soft `#8FCBA1`; purple `#6B35A8` / soft `#BFA5DC`;
sky `#3D9BC1` / soft `#A8D5E3`.

**Neutral / surface** (`styles/tokens.css:15-21`):
cream `#FDF6EC`, cream-deep `#F7EBD7`, greige `#d6d1be`, charcoal `#2A2118`,
charcoal-light `#5C4A3A`, paper `#ffffff`, ink `#1a1a1a`.

**Fonts** (`styles/tokens.css:24-27`, `styles/fonts.css:1`):
`--font-display` Cormorant Garamond; `--font-body` DM Sans; `--font-script` Great Vibes;
`--font-serif-soft` Kameron. CDN import (note: Kameron must be ADDED to the CDN URL since
fonts.css only loads Cormorant + DM Sans + Great Vibes).

**Radii** *(updated 2026-06-28 — unified scale; `--border-radius-*` removed)*: `--radius-xs` 4, `--radius-sm` 8, `--radius-md` 16 (card/panel), `--radius-lg` 24, `--radius-pill` 999, `--radius-round` 50%. Control heights: `--ctl-h-sm` 36 / `--ctl-h` 44 / `--ctl-h-lg` 52. Guard: `npm run check:tokens`.
**Shadows** (`tokens.css:62-65`): card `0 8px 32px rgba(42,33,24,0.10)`;
card-hover `0 16px 48px rgba(42,33,24,0.16)`; soft `0 4px 14px rgba(42,33,24,0.06)`;
polaroid `5px 5px 16px rgba(0,0,0,0.28)`.
**Spacing/layout** (`tokens.css:37-54`): section `clamp(64px,9vw,120px)`;
section-mobile `clamp(56px,12vw,80px)`; container-max 1240px; container-pad
`clamp(20px,4vw,48px)`; tap-target 44px; bp 768/1024.
**Motion** (`tokens.css:68-70`): default `all 0.35s cubic-bezier(0.4,0,0.2,1)`;
slow `all 0.65s cubic-bezier(0.4,0,0.2,1)`; ease-out `cubic-bezier(0.16,1,0.3,1)`.

**Lovebirds glass + 3D button vars** (`all-templates/lovebirds/styles/theme.css:23-37`):
glass-bg `rgba(255,255,255,0.55)`; glass-bg-hover `rgba(255,255,255,0.70)`;
glass-border `rgba(255,255,255,0.45)`; glass-backdrop-filter `blur(16px) saturate(120%)`;
gold-gradient `linear-gradient(135deg,#FFEAB0 0%,#EAA220 50%,#C49010 100%)`;
shadow-glass `0 16px 36px rgba(42,33,24,0.07), inset 0 1px 0 rgba(255,255,255,0.7)`;
shadow-button-3d `0 4px 0 var(--color-charcoal-light), 0 8px 20px rgba(42,33,24,0.12)`
(+ hover/active variants).

**Theme presets** (`all-templates/lovebirds/config/themes.js:16-72`):
`warmCream` (accent coral), `darkLuxury` (bg charcoal, accent gold),
`emeraldGarden` (accent emerald), `skyEditorial` (accent sky). Each defines
`--bg --fg --fg-muted --accent --accent-soft --glass-bg --glass-border --glass-text
--glass-text-muted --button-bg --button-fg`.

**Component CSS (verbatim snippets):**
- Glass card → `sections/EventDetails/EventDetails.module.css:111-125` /
  `sections/BrideGroom/BrideGroom.module.css:158-188` (`.cardFront`).
- Polaroid / story card → `sections/OurStoryStack/OurStory.module.css:78-103` (`.card`):
  `border: 14px solid #fff; border-bottom: 64px solid #fff; border-radius:16px;
  box-shadow: var(--shadow-polaroid);` rotation via transform.
- Buttons → `blocks/blocks.module.css:135-164` (`.cta`, `.cta-secondary`, `.cta-ghost`)
  + 3D button vars from theme.css.
- Eyebrow tag → `blocks/blocks.module.css:10-17` (`.textEyebrow`) /
  `OurStoryStack/OurStory.module.css:24-32` (`.sectionEyebrow`): uppercase,
  letter-spacing 0.28–0.32em, accent color.
- Floating navbar → `components/FloatingNavbar.module.css:31-45,89-125`: cream glass pill
  `rgba(253,246,236,0.82)`, blur(16px) saturate(1.4), radius 26px; active pill coral bg +
  cream text + `0 4px 12px rgba(232,85,62,0.32)`.
- BrideGroom person card → `BrideGroom.module.css:257-303` (circular photo, dashed spin
  ring, role pill).

**Section → theme mapping** (`all-templates/lovebirds/defaultConfig.js`):
hero→`darkLuxury`; quote→`warmCream`; ourStory→`warmCream`; eventDetails→`warmCream`;
brideGroom→`warmCream`; galleryMasonry→`warmCream`; schedule→`warmCream`; rsvp→`warmCream`;
weddingGift→`warmCream`; footer→`warmCream`. Note: `emeraldGarden` and `skyEditorial`
presets exist in themes.js but are NOT assigned in defaultConfig — document them as
"available, unused by default".

---

## File Structure

- Create: `wedding-saas-next/style-guide-lovebirds.html` — the entire deliverable, one file.

No other files created or modified.

---

### Task 1: Document shell + `<head>` + base CSS

**Files:** Create `wedding-saas-next/style-guide-lovebirds.html`

- [ ] **Step 1:** Write `<!doctype html>`, `<html lang="id">`, `<head>` with charset,
  viewport, `<title>Lovebirds · Style Guide</title>`, and the Google Fonts `<link>`
  importing **Cormorant Garamond + DM Sans + Great Vibes + Kameron** (extend the
  fonts.css URL to add `Kameron:wght@300;400;700`).
- [ ] **Step 2:** Add `<style>` with reset (`*{box-sizing:border-box}`), `:root` holding
  ALL lovebirds tokens from the value reference above (palette, neutrals, fonts, radii,
  shadows, spacing, motion, glass + 3D-button vars), and a light shell:
  `body{background:#FDF6EC; color:#2A2118; font-family:var(--font-body)}` plus the warm
  multi-radial-gradient ambient background from `theme.css:11-17`.
- [ ] **Step 3:** Add layout helpers: `.page{max-width:1240px;margin:0 auto;padding:…}`,
  `section{padding:64px 0;border-top:1px solid rgba(42,33,24,0.10)}`, `.eyebrow`
  (Cormorant or DM Sans uppercase tracked, coral), `.section-title` (Cormorant italic),
  `.section-sub`.
- [ ] **Step 4 (verify):** Open the file in a browser. Expect cream background with warm
  glow, no console errors, all four fonts available.

### Task 2: Hero header

- [ ] **Step 1:** Add `<header class="hero">` with eyebrow `Lovebirds Template · Style Guide`,
  an `<h1>` in Cormorant (italic accent span in Great Vibes, e.g. "written in warm light"),
  an intro `<p>` naming the source of truth (`tokens.css`, `theme.css`, `themes.js`), and a
  `Last sync: 2026-05-31` line.
- [ ] **Step 2 (verify):** Hero renders with serif display + script accent, cream shell.

### Task 3: 01 · Color System

- [ ] **Step 1:** Section header `01 · Color System`.
- [ ] **Step 2:** A `.theme-grid` of 4 preview cards, one per preset (`warmCream`,
  `darkLuxury`, `emeraldGarden`, `skyEditorial`). Each card is styled inline with that
  preset's `--bg/--fg/--accent` and shows eyebrow + heading + a swatch row + the JS key,
  using the exact values from themes.js.
- [ ] **Step 3:** A "brand palette" swatch grid (coral/gold/emerald/purple/sky + soft) with
  hex labels, and a neutral/surface row (cream, cream-deep, greige, charcoal,
  charcoal-light, paper, ink).
- [ ] **Step 4:** Semantic token `<table>`: `--bg --fg --fg-muted --accent --accent-soft
  --glass-bg --glass-border --glass-text --button-bg --button-fg` → purpose column.
- [ ] **Step 5 (verify):** Every hex matches tokens.css/themes.js; dark-luxury card reads
  legibly (gold on charcoal).

### Task 4: 02 · Typography

- [ ] **Step 1:** Section header `02 · Typography`.
- [ ] **Step 2:** Four family cards (Cormorant Garamond `--font-display`, DM Sans
  `--font-body`, Great Vibes `--font-script`, Kameron `--font-serif-soft`) each with an "Aa"
  specimen, the role, and fallback stack from tokens.css.
- [ ] **Step 3:** Type-scale rows reflecting real section CSS: display (Cormorant italic
  `clamp(38px,5.5vw,72px)` from OurStoryStack `.sectionTitle`), h-title (Cormorant italic
  `clamp(28px,4vw,56px)` from blocks `.textTitle`), eyebrow (uppercase 0.32em coral), body
  (DM Sans `clamp(15px,1.4vw,17px)` line-height 1.7), script accent (Great Vibes).
- [ ] **Step 4 (verify):** Specimens use the correct family; sizes cite real clamp values.

### Task 5: 03 · Design Tokens

- [ ] **Step 1:** Section header `03 · Design Tokens`.
- [ ] **Step 2:** Radii table (16/999/8) + small visual chips; Shadows table (card,
  card-hover, soft, polaroid, glass, button-3d) each with a live demo box using that
  shadow; Spacing/layout table (section clamp, container-max, container-pad, tap-target,
  breakpoints); Motion table (default, slow, ease-out) with an optional CSS-keyframe easing
  bar demo.
- [ ] **Step 3 (verify):** Each token value matches tokens.css / theme.css exactly.

### Task 6: 04 · Component Library

- [ ] **Step 1:** Section header `04 · Component Library`, `.component-grid`.
- [ ] **Step 2:** Build each demo card with a live render + a verbatim CSS `<pre>` snippet +
  a one-line note, for: (1) Glass card (EventDetails/BrideGroom `.cardFront`), (2) Polaroid
  story card (OurStoryStack `.card`, with rotation), (3) Buttons — primary `.cta` coral pill
  + `.cta-ghost` + a 3D button using `--shadow-button-3d`, (4) Eyebrow tag, (5) Floating
  navbar (cream glass pill, coral active), (6) BrideGroom person card (circular photo +
  dashed ring + role pill).
- [ ] **Step 3 (verify):** Each snippet is copy-pasted verbatim from its module CSS file;
  live demos visually resemble the real components.

### Task 7: 05 · How-to-use + 06 · Section→theme mapping + Footer

- [ ] **Step 1:** `05 · How to use` — two code blocks: (a) consume tokens via
  `var(--color-…)`, `var(--border-radius-…)`, `var(--ease-out)`; (b) apply a preset to a
  section via `theme: 'darkLuxury'` in pageConfig + `resolveTheme()` from themes.js.
- [ ] **Step 2:** `06 · Section → theme mapping` — a `<table>` with the 10 default sections
  and their assigned theme (from defaultConfig.js), plus a note that `emeraldGarden` and
  `skyEditorial` are available but unused by default.
- [ ] **Step 3:** Footer attribution line: source files + `Style sync: 2026-05-31`.
- [ ] **Step 4 (verify):** Mapping matches defaultConfig.js row-for-row.

### Task 8: Final review + commit

- [ ] **Step 1:** Open the finished file in a browser (or screenshot via the available
  Playwright/Chrome tooling) and visually confirm all 6 numbered sections + hero + footer
  render, fonts load, dark-luxury card is legible, no overflow on a laptop width.
- [ ] **Step 2:** Spot-check 5 random values against their source files.
- [ ] **Step 3:** Commit ONLY the new file (never `git add -A`):

```bash
git add style-guide-lovebirds.html
git commit -m "docs: add standalone lovebirds style guide HTML"
```

---

## Self-Review (done at plan-writing time)

- **Spec coverage:** Hero ✓(T2) · 01 Color ✓(T3) · 02 Typography ✓(T4) · 03 Tokens ✓(T5) ·
  04 Components ✓(T6) · 05 How-to-use ✓(T7) · 06 Mapping ✓(T7) · Footer ✓(T7) · "no source
  edits" ✓ (only the HTML is created).
- **Placeholders:** none — every task cites concrete values/files.
- **Consistency:** filename `style-guide-lovebirds.html` used throughout; token names match
  tokens.css/theme.css/themes.js exactly.
