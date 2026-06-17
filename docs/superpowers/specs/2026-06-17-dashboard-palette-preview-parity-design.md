# Dashboard palette preview — landing-page parity

**Date:** 2026-06-17
**Status:** approved (layout chosen by owner: "persis landing page")

## Problem

The dashboard Editor → Palette tab ([PaletteTab.tsx](../../../src/app/[template]/[slug]/dashboard/PaletteTab.tsx))
previews a palette with a single hardcoded accent dot on a **binary** dark/light
background (`#1c1830` / `#faf7f0`). It ignores each palette's real tokens, so:

- Every light palette previews on the *same* cream — they look interchangeable.
- Several swatch dots are **wrong**: `nebulaDark` shows purple `#c19bff` but its
  real accent is gold `#e8b86a`; `cosmicDark` shows `#7D53DE` but is really `#c19bff`.

The owner wants the preview to look **exactly like the landing page** template-buying
preview — not a simplified lookalike.

## Decision

The landing page ([VibeExploration.tsx](../../../src/components/marketing/VibeExploration.tsx))
already renders the desired card via its `PreviewMock`, fed by
[vibeData.ts](../../../src/components/marketing/vibeData.ts) (real tokens for **all**
palettes, both templates). Reuse the **actual component** so the dashboard is identical,
not a copy.

Layout = landing's "explorer" pattern: a **palette menu** (list of names + accent
bullets) beside **one large preview card** that re-themes on selection. (A gallery of
many mini cards was rejected — the card is `max-width:400px` / names `clamp(40–58px)`,
designed to show one at a time; shrinking it into a grid would *diverge* from landing,
the opposite of the goal.)

## Changes

1. **Extract** `PreviewMock` out of `VibeExploration.tsx` into a shared component
   `src/components/marketing/PreviewMock.tsx` + `PreviewMock.module.css` (move the
   `.mock*` rules verbatim). Parameterize the three text strings so each caller passes
   its own copy: `{ templateId, palette, eyebrow, names, date }`.
2. **Shared util** `src/lib/color.ts` → `readableOn(hex)` (the WCAG-luminance version
   from VibeExploration). VibeExploration, PreviewMock, and PaletteTab all import it
   instead of each keeping a private copy.
3. **VibeExploration.tsx** — import the extracted `PreviewMock` + `readableOn`; drop the
   local copies. Remove the now-dead `.mock*` rules from `VibeExploration.module.css`.
   No visual change to the landing page.
4. **PaletteTab.tsx** — rewrite the picker: drive it from `TEMPLATE_VIBES`; render a
   palette menu + a preview panel painted with the selected `palette.background`,
   containing `<PreviewMock>` + the palette name + the ambience swatch row (echoing
   landing). Remove the hardcoded swatch arrays, the local `TEMPLATE_PALETTES` map, the
   old binary preview, and the local `readableOn`. **Unchanged:** header, Save button,
   `save()` + `/api/invitation/[slug]/theme` call, success/error feedback, the saved
   palette keys.
5. **EditorWorkspace.tsx** — derive `coupleName` + `weddingDate` from the `hero` section
   props (`invitation.config.sections.find(s => s.type === 'hero')?.props`) and pass them
   to `PaletteTab`, so the card shows the couple's real names/date. Fallback to the
   existing `previewHeading` placeholder when absent.

## Non-goals / deliberate choices

- Do **not** refactor the rest of `VibeExploration` (category picker, carousel, pin,
  buy-flow) — only `PreviewMock` is shared. The dashboard's menu is styled inline
  (matching PaletteTab's existing inline-style convention) using the same colour recipe
  as landing's `.menuBtn`, so it reads identically on the gradient.
- No new i18n keys. Reuse `previewEyebrow` (card eyebrow) and `previewHeading` (names
  fallback). Date is formatted from `weddingDate` (`id-ID`, long month). Group keys
  (`groupDark`/`groupLight`) and the old preview keys are left untouched (flat menu,
  matching landing); unused keys are harmless.

## Risks

- Removing `.mock*` from `VibeExploration.module.css`: verified `VibeExploration.tsx` is
  the only consumer of that module and `PreviewMock` was the only user of `.mock*`.
- Fonts: `--font-display`/`--font-script`/`--font-body` are defined globally in the root
  layout + tokens.css, so the card renders identically on the dashboard route.
