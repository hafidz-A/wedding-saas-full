# Lovebirds demo-image overhaul — design

**Date:** 2026-06-17
**Status:** Approved (approach), pending spec review
**Scope:** Lovebirds template only. Shared registry, Solary, editor schemas, marketing, and `fillEmptyImages` are NOT touched.

---

## Problem

The Lovebirds live-preview demo currently pulls every photo from the shared
`src/lib/demoImages.js` registry (Unsplash IDs). All 38 IDs resolve (HTTP 200),
so nothing is *broken* — but the photos are unrelated stock shots:

- inconsistent color/tone and photography style across sections,
- several couple shots are silhouettes or ambiguous framings,
- no single couple identity ties the story together.

The result reads like a random mood board, not a premium template ready to sell.

## Goals

1. Every Lovebirds section image supports the text/context of that section.
2. **Hero/Gate is the priority:** one frame showing **both** bride and groom,
   faces clear, natural + romantic, premium, wedding-focused. Composition must
   work as a portrait ~3:4 crop (gate collapses to `object-fit: cover` portrait
   card — faces must sit in the central vertical band).
3. **One anchor couple** reused across all face-bearing slots ("maximize
   same-couple identity"); repetition across gallery/blast slots is acceptable.
4. Clearly a **man + woman** in every couple shot. No ambiguous / LGBT framing.
5. Cohesive warm editorial / film tone end to end.
6. Live preview never shows a broken image.

## Non-goals

- No changes to Solary, the shared registry, editor placeholder schemas,
  marketing components, or `fillEmptyImages`.
- Not converting any section from photo to illustration/video (all current
  Lovebirds image slots are genuinely photographic; no slot is better served by
  an illustration — the existing SVG ornaments already cover decorative needs).

---

## Licensing (hard requirement)

Every image must be **legal to download, save, modify, and ship inside a
commercially sold template**.

| Source | License | Commercial use | Attribution | Download/modify |
|---|---|---|---|---|
| Unsplash | Unsplash License | ✅ | Not required | ✅ |
| Pexels | Pexels License | ✅ | Not required | ✅ |
| Pixabay | Pixabay Content License | ✅ | Not required | ✅ |

**The one catch for a sold product:** all three licenses permit embedding photos
*inside* a product (a template) but forbid selling the photos *as* stock. Here
the photos are **demo placeholders each couple replaces with their own** — well
within the license. We will not sell the photos themselves.

**Provenance log:** for every shipped image we record `slot → source URL →
license` in `public/templates/lovebirds/demo/CREDITS.md`, so there is a paper
trail even though attribution is not required.

---

## Curation method (how quality is guaranteed)

For each candidate, it is not enough that the URL returns 200. The candidate is
**downloaded and visually inspected** (the Read tool renders the image) before
it is allowed in. Each photo must pass all of:

1. clearly a **man + woman** couple (or, for portrait slots, the matching solo
   person) — no ambiguous/LGBT framing,
2. faces visible where the slot shows a face,
3. warm editorial/film tone matching the anchor set,
4. high resolution, no watermark.

Preference order for finding the anchor couple: a **single photographer's
engagement/wedding series** (same two people across many frames) on
Pexels/Unsplash/Pixabay.

**Hero finalist pick:** 3–4 finalist gate photos are downloaded, rendered to the
user, and the user picks the final face before it is committed.

---

## Slot plan — the 21 distinct slots Lovebirds actually uses

Derived from `defaultConfig.js` (hero.gateImage, hero.blastPhotos[8],
ourStory.stories[5], brideGroom.people[2], galleryMasonry.photos[16],
footer.photos[2]) and `OurStoryStack/OurStory.jsx` fallback `DEMO_STORIES`.

### Same-couple, man+woman (17 slots) — all the anchor couple
`coupleGate` (hero, both faces), `bridePortrait` (solo bride), `groomPortrait`
(solo groom), `coupleClassic`, `coupleCasual`, `storyFirstMeet`,
`storyFirstDate`, `storyHoliday`, `storyProposal`, `storyWedding`,
`gallerySunsetWalk`, `galleryFirstDance`, `galleryBeach`, `galleryRoadTrip`,
`galleryCityLights`, `galleryFamilyDinner`, `galleryBirthday`.

### Tone-matched detail, no people (4 slots)
`galleryCoffee`, `galleryCooking`, `gallerySunrise`, `galleryRings` —
objects/scenes in the same warm palette. Keeps couple-identity clean and avoids
forcing faces where none are needed.

---

## Architecture / code changes

1. **New file** `src/all-templates/lovebirds/demoImages.js`
   - Exports `lovebirdsImg(key, width)` — same signature as the shared
     `demoImg` (`width` accepted for call-site compatibility; local files are
     pre-sized so it may be ignored).
   - Maps each of the ~21 slot keys to a local
     `/templates/lovebirds/demo/<slot>.jpg` path.

2. **Downloaded assets** in `public/templates/lovebirds/demo/`
   - Sized on download: hero ~1600px wide, portraits/story ~1100px, gallery
     ~800px. JPG (or webp if the CDN serves it directly — no local conversion
     dependency).
   - Plus `CREDITS.md` provenance log.

3. **Edit `src/all-templates/lovebirds/defaultConfig.js`**
   - Swap `import { demoImg } from '../../lib/demoImages.js'`
     → `import { lovebirdsImg as demoImg } from './demoImages.js'`.
   - No other logic changes — every `demoImg('slot', w)` call keeps working.

4. **Edit `src/all-templates/lovebirds/sections/OurStoryStack/OurStory.jsx`**
   - Same import swap for its fallback `DEMO_STORIES` array.

Nothing else changes. The shared `src/lib/demoImages.js` keeps every existing
key, so Solary / editor / marketing / `fillEmptyImages` are byte-for-byte
unaffected.

---

## Verification

1. `scripts/check-lovebirds-images.mjs` — assert every slot's local file exists
   and is non-empty (mirrors the existing `check-demo-images.mjs` guard).
2. `npm run build` (or dev) and load the Lovebirds preview; **screenshot each
   section** to confirm: no broken image, hero shows both faces, tone is
   cohesive, story reads end to end.

## Deliverables

- Table: every slot `old → new`, source URL, one-line reason.
- `CREDITS.md` provenance/license log.
- Section screenshots from the live preview.
- The code diff (new module + two import swaps + downloaded assets + check
  script).

## Risks / trade-offs (accepted)

- A single free series rarely covers all 17 face-slots cleanly → **some
  repetition** of the anchor couple across gallery/blast slots (the chosen
  trade-off for identity over variety).
- Downloading adds a few MB of binary assets to the repo (chosen for
  bulletproof "no broken image" guarantee).
