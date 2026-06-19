/* ============================================================
   solary/demoImages.js — Solary demo photo source.

   Solary reuses the hand-curated, single-couple LOCAL photo set
   that ships with the Lovebirds template (one set, two templates —
   no duplicate bytes) so the Solary demo reads as the same cohesive
   premium story and never shows a broken image. See
   public/templates/lovebirds/demo/CREDITS.md for provenance.

   `solaryImg(key, width)` is a drop-in for the shared
   `demoImg(key, width)` (src/lib/demoImages.js): same signature, so
   call sites are unchanged. Resolution order per key:

   1. Slot present in SOLARY_LOCAL  → local Lovebirds file. Some
      Solary slots have no exact Lovebirds match, so they map to a
      tone-matched Lovebirds photo (e.g. galleryHiking → galleryBeach).
   2. Slot absent (bridal-party avatars, gift wishlist) → fall back
      to the shared Unsplash registry. The Lovebirds set is one
      couple (2 faces); it can't supply 6 distinct party members or
      the wishlist objects, so those stay on the shared registry.

   `width` is accepted for compatibility. For local files it is
   ignored (the files are pre-sized); for the Unsplash fallback it is
   forwarded to demoImg.

   Local assets live in public/templates/lovebirds/demo/<file>.jpg and
   are verified by `node scripts/check-solary-images.mjs`.
   ============================================================ */

import { demoImg } from '../../lib/demoImages.js'

const BASE = '/templates/lovebirds/demo'

// Solary slot key → Lovebirds local filename. Keys NOT listed here
// fall through to the shared Unsplash registry (see solaryImg below).
export const SOLARY_LOCAL = {
  // — direct matches (slot exists in the Lovebirds set) —
  coupleGate: 'coupleGate.jpg',          // hero couple shot (used in the Saturn ring)
  groomPortrait: 'groomPortrait.jpg',    // groom solo (used in the Saturn ring)
  coupleClassic: 'coupleClassic.jpg',
  coupleCasual: 'coupleCasual.jpg',
  galleryBirthday: 'galleryBirthday.jpg',
  gallerySunsetWalk: 'gallerySunsetWalk.jpg',
  galleryCoffee: 'galleryCoffee.jpg',
  storyProposal: 'storyProposal.jpg',
  storyWedding: 'storyWedding.jpg',
  galleryRoadTrip: 'galleryRoadTrip.jpg',
  gallerySunrise: 'gallerySunrise.jpg',
  galleryRings: 'galleryRings.jpg',

  // — tone-matched (no exact Lovebirds slot; reuse a senada photo) —
  coupleSunset: 'gallerySunsetWalk.jpg',     // sunset couple silhouette
  galleryHiking: 'galleryBeach.jpg',         // outdoor / adventure
  galleryMovieNight: 'galleryCityLights.jpg',// night / evening
  galleryAnniversary: 'galleryFamilyDinner.jpg', // intimate dinner
  galleryCelebration: 'galleryFirstDance.jpg',   // party / celebration
  galleryVenue: 'storyHoliday.jpg',          // scenic getaway
  galleryDressFitting: 'bridePortrait.jpg',  // bride solo
  galleryCakeTasting: 'galleryCooking.jpg',  // food / home
  galleryPreWedShoot: 'storyFirstDate.jpg',  // posed couple moment
  galleryBrunch: 'storyFirstMeet.jpg',       // candid couple moment
}

/**
 * Build an image source for a Solary demo slot.
 * Local Lovebirds slot → local path (width ignored).
 * Otherwise → shared Unsplash registry (width forwarded).
 */
export function solaryImg(key, width) {
  const file = SOLARY_LOCAL[key]
  if (file) return `${BASE}/${file}`
  return demoImg(key, width)
}

export default solaryImg
