/* ============================================================
   lovebirds/demoImages.js — Lovebirds-only demo photo override.

   The shared registry (src/lib/demoImages.js) pulls every demo
   photo from Unsplash. For the Lovebirds template we instead ship
   a hand-curated, single-couple set of LOCAL images so the live
   preview reads as one cohesive premium story and can never show a
   broken image.

   `lovebirdsImg(key, width)` is a drop-in for the shared
   `demoImg(key, width)`: same signature, so call sites are
   unchanged. `width` is accepted for compatibility but ignored —
   the local files are pre-sized on download (hero ~1600px,
   story/portrait ~1100-1200px, gallery ~900px).

   Assets live in public/templates/lovebirds/demo/<key>.webp and are
   verified by `node scripts/check-lovebirds-images.mjs`.
   Provenance + licensing: public/templates/lovebirds/demo/CREDITS.md
   ============================================================ */

import { staticAsset } from '../../lib/assets/staticAsset.js'

// Local path by default; the R2 host when NEXT_PUBLIC_STATIC_ASSET_HOST is set.
const BASE = staticAsset('/templates/lovebirds/demo')

// Every slot Lovebirds references (hero gate + blast, ourStory,
// brideGroom, galleryMasonry, footer). Filename === slot key.
export const LOVEBIRDS_PHOTOS = {
  // — couple & portraits (anchor couple) —
  coupleGate: 'coupleGate.webp',
  bridePortrait: 'bridePortrait.webp',
  groomPortrait: 'groomPortrait.webp',
  coupleClassic: 'coupleClassic.webp',
  coupleCasual: 'coupleCasual.webp',

  // — story moments (anchor couple) —
  storyFirstMeet: 'storyFirstMeet.webp',
  storyFirstDate: 'storyFirstDate.webp',
  storyHoliday: 'storyHoliday.webp',
  storyProposal: 'storyProposal.webp',
  storyWedding: 'storyWedding.webp',

  // — gallery moments (anchor couple) —
  gallerySunsetWalk: 'gallerySunsetWalk.webp',
  galleryFirstDance: 'galleryFirstDance.webp',
  galleryBeach: 'galleryBeach.webp',
  galleryRoadTrip: 'galleryRoadTrip.webp',
  galleryCityLights: 'galleryCityLights.webp',
  galleryFamilyDinner: 'galleryFamilyDinner.webp',
  galleryBirthday: 'galleryBirthday.webp',

  // — gallery details (people-free, tone-matched) —
  galleryCoffee: 'galleryCoffee.webp',
  galleryCooking: 'galleryCooking.webp',
  gallerySunrise: 'gallerySunrise.webp',
  galleryRings: 'galleryRings.webp',
}

/** Build a local path for a Lovebirds demo slot. `width` is ignored. */
export function lovebirdsImg(key, _width) {
  const file = LOVEBIRDS_PHOTOS[key]
  if (!file) throw new Error(`unknown lovebirds demo image key: ${key}`)
  return `${BASE}/${file}`
}
