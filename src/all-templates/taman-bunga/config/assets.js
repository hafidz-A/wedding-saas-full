/* ============================================================
   taman-bunga/config/assets.js — every committed image the template draws.

   Files live in public/templates/taman-bunga/ (painted scene layers) and
   public/templates/taman-bunga/demo/ (the demo couple's photos).

   Served through staticAsset(): local public/ by default, R2
   (media.fincards.land) in production where NEXT_PUBLIC_STATIC_ASSET_HOST is
   set. A new or renamed file here must be uploaded to R2 BEFORE the deploy
   that references it (GitHub Actions → "Upload static assets to R2"),
   otherwise production draws a blank layer. CLAUDE.md gotcha 11.

   Plain data, server-safe: defaultConfig.js imports the demo photo paths and
   is itself pulled in by src/config/templateIndex.js.
   ============================================================ */
import { staticAsset } from '../../../lib/assets/staticAsset.js'

const BASE = staticAsset('/templates/taman-bunga')

/** Painted scene layers. Filenames carry no content hash, so replacing an
 *  image means renaming it (Cache-Control is 30 days, see next.config.js). */
export const SCENE = {
  sky: `${BASE}/sky.webp`,
  skyNoSun: `${BASE}/sky-nosun.webp`,
  hills: `${BASE}/hills.webp`,
  hillsWide: `${BASE}/hills-wide.webp`, // the 3:1 silhouette for wide screens
  // closing: the gazebo up close (entrance cut out, roof + cupola completed) and
  // its inside, per art set; the patches paint the small gazebo out of the garden
  gazeboFrontTall: `${BASE}/gazebo-front-full-tall.webp`,
  gazeboFrontWide: `${BASE}/gazebo-front-full-wide.webp`,
  gazeboPatchTall: `${BASE}/gazebo-patch-tall.webp`,
  gazeboPatchWide: `${BASE}/gazebo-patch-wide.webp`,
  gazeboInsideTall: `${BASE}/gazebo-inside-tall.webp`,
  gazeboInsideWide: `${BASE}/gazebo-inside-wide.webp`,
  // where the inside paintings' night sky shows (alpha = sky), for the fireworks
  gazeboSkyTall: `${BASE}/gazebo-inside-tall-sky.webp`,
  gazeboSkyWide: `${BASE}/gazebo-inside-wide-sky.webp`,
  garden: `${BASE}/garden.webp`,
  gardenWide: `${BASE}/garden-wide.webp`,
  gardenWideNear: `${BASE}/garden-wide-near.webp`, // garden-wide with the arch opening cut out
  // new name, not garden-inner-wide.webp: that name is cached (30 days) with the old mountain version
  gardenInnerWide: `${BASE}/garden-inside-wide.webp`, // inside the arch: garden + gazebo, no mountains
  gate: `${BASE}/gate.webp`,
  gateWide: `${BASE}/gate-wide.webp`,
  front: `${BASE}/flowers-front.webp`,
  frontWide: `${BASE}/flowers-front-wide.webp`,
  doorL: `${BASE}/door-l.webp`,
  doorR: `${BASE}/door-r.webp`,
  lantern: `${BASE}/lantern.webp`,
  garland: `${BASE}/garland.webp`,
  corner: `${BASE}/corner.webp`,
  gift: `${BASE}/gift.webp`,
  skyLantern: `${BASE}/sky-lantern.webp`,
  // the same lantern with real transparency, for the ones resting in the garden
  paperLantern: `${BASE}/paper-lantern.webp`,
  moon: `${BASE}/moon.webp`,
  frame: `${BASE}/frame.webp`,
  frameBack: `${BASE}/frame-back.webp`,
}

/** Demo couple photos (illustrated, not real people). */
export const DEMO_PHOTOS = {
  groom: `${BASE}/demo/groom.webp`,
  bride: `${BASE}/demo/bride.webp`,
  couple: `${BASE}/demo/couple.webp`,
  coupleClose: `${BASE}/demo/couple-close.webp`,
}
