/* ============================================================
   musi/config/assets.js — the only images Musi uses.

   The scene itself is built in code (engine/), so the template ships NO image
   files of its own. The demo couple's photos are the Lovebirds demo set, which
   is already committed under public/templates/lovebirds/demo/ and uploaded to
   R2 — nothing new to upload before a deploy (CLAUDE.md gotcha 11).

   Plain data, server-safe: defaultConfig.js imports these paths and is itself
   pulled in by src/config/templateIndex.js.
   ============================================================ */
import { staticAsset } from '../../../lib/assets/staticAsset.js'

const DEMO = staticAsset('/templates/lovebirds/demo')

/** Demo couple photos (Pexels photos, see that folder's CREDITS.md). */
export const DEMO_PHOTOS = {
  groom: `${DEMO}/groomPortrait.webp`,
  bride: `${DEMO}/bridePortrait.webp`,
  couple: `${DEMO}/coupleClassic.webp`,
}

export const DEMO_GALLERY = [
  ['coupleClassic', 'Laras dan Fauzan'],
  ['gallerySunsetWalk', 'Jalan sore'],
  ['galleryFirstDance', 'Dansa pertama'],
  ['galleryCityLights', 'Lampu kota'],
  ['galleryRings', 'Cincin'],
  ['coupleCasual', 'Berdua'],
].map(([f, alt]) => ({ src: `${DEMO}/${f}.webp`, alt }))
