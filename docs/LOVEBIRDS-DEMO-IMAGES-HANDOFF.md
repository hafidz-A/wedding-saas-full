# Session Handoff — Lovebirds demo-image overhaul

> Purpose: resume this task in a fresh Claude Code session without recap.
> Status as of 2026-06-18: **DONE (v2 — art-directed luxury editorial).** The
> first pass (one couple in every slot) was rejected as a "prewedding album," so
> the set was re-directed: ~30% couple / ~70% atmosphere-detail-venue-floral in a
> warm ivory·blush·gold palette. Only the hero + 2 solos show clear faces; other
> couple moments are silhouettes / from-behind for continuity without portrait
> overload. Hero = Pexels 32167185 (bright cheek-to-cheek, both faces to camera,
> clean neutral tone) — re-picked twice (38096061 split the couple behind the gate
> card; 30039385 read too yellow); 32167185 is centre-cropped so both faces stay
> together and survive the gate cover-crop on desktop (top/bottom trimmed) AND
> mobile (sides trimmed), and the two solos are cropped from it. See `public/templates/lovebirds/demo/CREDITS.md` for the full per-slot
> provenance and the [[premium-wedding-imagery-art-direction]] rule.
> Verified live: 98/98 images load locally, 0 broken, 0 console errors, gate
> shows both faces on desktop + mobile (390px), 3.x MB total assets. Not committed
> (commit-only-when-asked). Unchanged from v1: `demoImages.js`, the two import
> swaps, and `scripts/check-lovebirds-images.mjs` (filenames/keys identical — only
> the image bytes changed); `scripts/crop-lovebirds-portraits.mjs` crops from the
> hero (30039385).

---

## What we're doing

Replace all demo images in the **Lovebirds** wedding-invitation template so every
photo matches its section's context, the whole thing reads as one cohesive
premium story, and the live preview never shows a broken image.

Full design spec (read this first):
`docs/superpowers/specs/2026-06-17-lovebirds-demo-images-design.md`

---

## Decisions already locked (do NOT re-litigate)

| Decision | Choice | Implication |
|---|---|---|
| **Scope** | **Lovebirds-only override** | Do NOT touch the shared `src/lib/demoImages.js`, Solary, editor schemas, marketing, or `fillEmptyImages`. |
| **Consistency** | **Maximize same-couple identity** | One anchor couple reused across all face slots; repetition across gallery/blast is OK. |
| **Sources/hosting** | **Any free source (Unsplash/Pexels/Pixabay), download into the repo** | Photos must be legal for commercial use + downloadable. Download winners into `public/templates/lovebirds/demo/`. |
| **Licensing** | Hard requirement | Free commercial use, no attribution required. Demo photos are placeholders each couple replaces — within license. Keep a provenance log (`CREDITS.md`). Never sell the photos as stock. |
| **Hero/Gate** | Top priority | Must show BOTH bride + groom, faces clear, romantic, premium. Show user 3–4 finalists to pick the final face. Composition must work as a **portrait ~3:4 center-crop** (gate is `object-fit: cover`). Clearly man + woman — no ambiguous/LGBT framing (user requirement). |

---

## Architecture findings

- Every demo photo flows through ONE shared registry: `src/lib/demoImages.js`
  → `demoImg(key, width)` builds an Unsplash CDN URL.
- Lovebirds consumes it in exactly TWO places:
  - `src/all-templates/lovebirds/defaultConfig.js`
  - `src/all-templates/lovebirds/sections/OurStoryStack/OurStory.jsx` (fallback `DEMO_STORIES`)
- All 38 current images resolve HTTP 200 (`node scripts/check-demo-images.mjs`).
  The problem is cohesion/context, not broken links.
- Hero gate render: `Hero.jsx` ~line 431, `Hero.module.css` `.gateImg`
  (`object-fit: cover`, collapses to ~440×580 portrait card → faces must be
  centered vertically).

---

## Slot plan — 21 distinct slots Lovebirds uses

**Same-couple, man+woman (17):** `coupleGate` (hero), `bridePortrait` (solo
bride), `groomPortrait` (solo groom), `coupleClassic`, `coupleCasual`,
`storyFirstMeet`, `storyFirstDate`, `storyHoliday`, `storyProposal`,
`storyWedding`, `gallerySunsetWalk`, `galleryFirstDance`, `galleryBeach`,
`galleryRoadTrip`, `galleryCityLights`, `galleryFamilyDinner`, `galleryBirthday`.

**Tone-matched detail, no people (4):** `galleryCoffee`, `galleryCooking`,
`gallerySunrise`, `galleryRings`.

> Open question the user had NOT yet answered when the session ended: whether the
> 4 detail slots should stay people-free (current plan) or also feature the
> couple. Confirm before finalizing those 4.

---

## Planned code changes (not yet done)

1. **New** `src/all-templates/lovebirds/demoImages.js` — exports
   `lovebirdsImg(key, width)` (same signature as `demoImg`), mapping each slot
   to a local `/templates/lovebirds/demo/<slot>.jpg` path.
2. **Download** vetted images into `public/templates/lovebirds/demo/`
   (hero ~1600px, portraits/story ~1100px, gallery ~800px) + `CREDITS.md`.
3. **Edit** `defaultConfig.js`: swap
   `import { demoImg } from '../../lib/demoImages.js'`
   → `import { lovebirdsImg as demoImg } from './demoImages.js'`.
4. **Edit** `OurStoryStack/OurStory.jsx`: same import swap.

Nothing else changes; shared registry keeps all keys intact.

---

## Curation method (quality gate)

Don't trust URLs — **download each candidate and visually inspect it** before
use. Must pass: (1) clearly man + woman, (2) faces visible where the slot shows
a face, (3) warm editorial/film tone, (4) high-res, no watermark. Prefer a
single photographer's engagement/wedding series for one identifiable couple.

---

## Verification + deliverables

- Add `scripts/check-lovebirds-images.mjs` — assert each local asset exists +
  non-empty.
- `npm run dev` / build, load Lovebirds preview, screenshot each section: no
  broken image, hero shows both faces, cohesive tone, story reads end-to-end.
- Deliver: table of `slot → old → new + source URL + reason`, `CREDITS.md`,
  section screenshots, and the diff.

---

## Next action when resuming

User had just said **"oke execute"**. Resume by:
1. Confirm the 4 detail-slot open question above (or proceed with people-free).
2. Search Unsplash/Pexels/Pixabay for one cohesive man+woman couple series;
   download + visually vet candidates.
3. Present 3–4 Hero finalists for the user to pick.
4. Build the new module, download all 21 vetted assets, swap the two imports,
   add the check script, screenshot the preview.

(Spec is written but was left UNCOMMITTED per the user's "commit only when asked"
rule.)
