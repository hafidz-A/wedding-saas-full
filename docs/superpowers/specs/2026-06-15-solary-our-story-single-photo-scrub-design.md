# Solary — Our Story: single photo + scrub-continuous scroll

**Date:** 2026-06-15
**Section:** `storyPlanet` (Uranus) in the Solary template
**Status:** Approved — ready for implementation

---

## Problem

The current Our Story section feels **heavy** and **stiff**:

- **Heavy (perf):** `PolaroidCluster` stacks up to 3 polaroids per chapter, each with
  `filter: blur()`. The mobile experience renders *every* chapter card at once, each
  animated with spring motion + blur. Blurred layers are GPU-expensive.
- **Stiff (motion):** `activeIndex = Math.floor(progress * n)` advances the chapter in
  **discrete steps**. Between thresholds, scrolling moves nothing visible, then the
  chapter snaps. It reads as "stuck", not "scrolling".

## Goals

1. Remove the photo carousel (stacked polaroid deck + tap-to-advance + dots).
2. **One photo per chapter** (single image input in the editor).
3. Keep the **sticky pin** (galaxy camera holds on the planet to tell the story), but
   make the in-pin motion **scroll-scrubbed and continuous** so the user clearly sees
   the section is being scrolled.
4. Keep the **light polaroid** look (option 1), but slimmer & lighter on dark.
5. Apply the rework to **both desktop and mobile**.
6. Preserve `prefers-reduced-motion` behavior and the `rhythm.js` galaxy-camera hold.

## Non-goals

- No change to the 3D scene / `rhythm.js` boundary logic (only the existing
  refresh/rebuild calls are kept).
- No change to other sections or shared polaroid tokens (`--bg-polaroid`,
  `--shadow-polaroid`) — those are used by other components; story gets its own scoped
  styling.

---

## Data model

Per-chapter shape changes from a photo **array** to a single photo **string**:

```diff
- { year, label, desc, photos: string[] }
+ { year, label, desc, photo: string }
```

**Back-compat (the safety net):** every consumer reads
`const photo = item.photo || item.photos?.[0] || ""`. Existing saved configs (seeded
with `photos: [...]`) still render their first photo with zero migration.

**Self-heal:** `normalizeConfig.js` folds `photos[0] → photo` and drops `photos` at
render time, so the rendered scene is clean. (The dashboard editor is schema-driven; an
old `photos` array becomes orphaned there and the couple re-uploads one photo — acceptable
for this sprint, noted as a known limitation.)

---

## Motion design — scrub-continuous (both desktop & mobile)

Keep the outer container `= items.length × 100vh` and the inner `sticky 100vh`. The
single `ScrollTrigger` (`start: top top`, `end: bottom top`) stays. The change is **what
`onUpdate` does**:

- Compute `p = self.progress`, `pinnedFraction = (n-1)/n`,
  `itemP = clamp(p / pinnedFraction, 0, 1)`, and a **continuous**
  `floatPos = itemP * (n - 1)` in `[0, n-1]`.
- `activeIndex = Math.round(floatPos)` — drives the **text/photo content swap** only.
  Pushed to React state **only when the integer changes** (no per-frame re-render).
- Everything continuous is written **directly to DOM refs** in `onUpdate` (no React
  state, 60fps):
  - **Desktop rail strip** glides: `translateY` interpolated between precomputed
    per-item dot offsets using `floatPos` (was: only moved on discrete index change).
  - **Photo parallax:** small `translateY` from the within-chapter fraction
    (`floatPos - activeIndex`, ~`±0.5` → ~`±10px`).
  - **Progress indicator** fills by `itemP` (desktop: vertical line in the rail column;
    mobile: thin horizontal bar) — the explicit "you are scrolling" cue.
  - **Shell fade-out** in the scroll-out phase (`p > pinnedFraction`) — kept from current.
- Transitions use `transform` + `opacity` only. **No `filter: blur()` anywhere.**
- The `ScrollTrigger.refresh()` + `window.galacticRhythm.rebuildBoundaries()` calls and
  retries are preserved unchanged.

`reduced-motion`: outer collapses to normal flow, content renders statically (as today).

---

## Photo treatment — light polaroid (single)

New `StoryPolaroid.jsx` (replaces `PolaroidCluster.jsx`), used by both experiences:

- One photo in a polaroid frame, **slimmer & lighter**: warm off-white frame
  (`#f3eee4`), thin top/side padding, larger bottom strip, soft small shadow, slight
  tilt. Story-scoped CSS class `.story-polaroid` — does **not** touch global polaroid
  tokens.
- No stacked peek cards, no tap-to-advance, no photo dots.
- No-photo chapter → existing cosmic placeholder (star), kept for mobile; desktop keeps
  its "blank panel when no photo" behavior.
- Cross-fade between chapters via `opacity` + small `translateY` (no blur).

---

## Components & files touched

| File | Change |
|---|---|
| `sections/story/PolaroidCluster.jsx` | **Delete** |
| `sections/story/StoryPolaroid.jsx` | **New** — single light polaroid + placeholder |
| `sections/story/MemoryViewport.jsx` | Render `StoryPolaroid`; opacity/translate transition (no blur); read `photo` |
| `sections/story/StoryDesktopExperience.jsx` | Scrub-continuous: ref-driven strip glide, photo parallax, progress line, shell fade; `activeIndex` state only on integer change; precompute dot offsets; update photo detection + `ConnectorPipe` target selector |
| `sections/story/StoryMobileExperience.jsx` | Replace deck with single `StoryPolaroid`; scrub progress bar + parallax; remove deck/tap/dots; read `photo` |
| `sections/story/TimelineRail.jsx` | `hasPhotos → !!(it.photo \|\| it.photos?.[0])` |
| `sections/story/ConnectorPipe.jsx` | Keep; target the new `.story-polaroid` (via parent selector) |
| `styles/components.css` | Replace `.polaroid*`/`.story-photo-dots`/`.story-mobile__*` deck styles with `.story-polaroid` + single-photo mobile + progress styles; keep reduced-motion block |
| `config/pageConfig.js` | Story items `photos: [...]` → `photo: ...`; inline schema `photos:"imageArray"` → `photo:"image"` |
| `config/normalizeConfig.js` | Fold `timeline[].photos[0] → photo`, drop `photos` |
| `config/__tests__/normalizeConfig.test.js` | Add a case asserting the photos→photo fold |
| `editor/schemas/solary/storyPlanet.ts` | itemFields `photos:imageArray` → `photo:image`; `newItem`/`defaults` use `photo: ''` |

---

## Risks / gotchas

- **Per-frame React state storm** — avoided by writing continuous values to DOM refs and
  only setting `activeIndex` when the integer changes.
- **Dot-offset measurement** — strip glide needs all items' dot offsets; measured in a
  layout effect into a ref array, recomputed on resize / items change.
- **rhythm.js** — keep the existing refresh + rebuild + retry timers untouched, or the
  galaxy camera can jump to the wrong planet.
- **Editor orphaning** — old `photos` arrays aren't shown in the new single-image field;
  rendering still works via back-compat. Known limitation for this sprint.

---

## Verification

- `normalizeConfig.test.js` passes (incl. the new photos→photo case).
- TypeScript/lint clean for `storyPlanet.ts`.
- Manual: run the Solary invitation, scroll Our Story on desktop + mobile widths —
  confirm continuous glide + progress cue, single photo per chapter, no blur, and that a
  legacy `photos`-array config still shows the first photo.
