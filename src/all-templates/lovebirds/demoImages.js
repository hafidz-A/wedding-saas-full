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

   Assets live in public/templates/lovebirds/demo/<key>.jpg and are
   verified by `node scripts/check-lovebirds-images.mjs`.
   Provenance + licensing: public/templates/lovebirds/demo/CREDITS.md
   ============================================================ */

const BASE = '/templates/lovebirds/demo'

// Every slot Lovebirds references (hero gate + blast, ourStory,
// brideGroom, galleryMasonry, footer). Filename === slot key.
export const LOVEBIRDS_PHOTOS = {
  // — couple & portraits (anchor couple) —
  coupleGate: 'coupleGate.jpg',
  bridePortrait: 'bridePortrait.jpg',
  groomPortrait: 'groomPortrait.jpg',
  coupleClassic: 'coupleClassic.jpg',
  coupleCasual: 'coupleCasual.jpg',

  // — story moments (anchor couple) —
  storyFirstMeet: 'storyFirstMeet.jpg',
  storyFirstDate: 'storyFirstDate.jpg',
  storyHoliday: 'storyHoliday.jpg',
  storyProposal: 'storyProposal.jpg',
  storyWedding: 'storyWedding.jpg',

  // — gallery moments (anchor couple) —
  gallerySunsetWalk: 'gallerySunsetWalk.jpg',
  galleryFirstDance: 'galleryFirstDance.jpg',
  galleryBeach: 'galleryBeach.jpg',
  galleryRoadTrip: 'galleryRoadTrip.jpg',
  galleryCityLights: 'galleryCityLights.jpg',
  galleryFamilyDinner: 'galleryFamilyDinner.jpg',
  galleryBirthday: 'galleryBirthday.jpg',

  // — gallery details (people-free, tone-matched) —
  galleryCoffee: 'galleryCoffee.jpg',
  galleryCooking: 'galleryCooking.jpg',
  gallerySunrise: 'gallerySunrise.jpg',
  galleryRings: 'galleryRings.jpg',
}

/** Build a local path for a Lovebirds demo slot. `width` is ignored. */
export function lovebirdsImg(key, _width) {
  const file = LOVEBIRDS_PHOTOS[key]
  if (!file) throw new Error(`unknown lovebirds demo image key: ${key}`)
  return `${BASE}/${file}`
}
