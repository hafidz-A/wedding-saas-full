/* ============================================================
   taman-bunga/config/assets.js — every committed image the template draws.

   Files live in public/templates/taman-bunga/ (painted scene layers) and
   public/templates/taman-bunga/demo/ (the demo couple's photos).

   TEMPORARY: always served from the local public/ folder, bypassing R2. The
   files were never uploaded to R2, and production sets
   NEXT_PUBLIC_STATIC_ASSET_HOST, so staticAsset() pointed every layer at a
   404 (blank scene, broken photos). Once `node scripts/upload-static-assets.mjs
   --verify` passes, switch BASE back to staticAsset('/templates/taman-bunga').

   Plain data, server-safe: defaultConfig.js imports the demo photo paths and
   is itself pulled in by src/config/templateIndex.js.
   ============================================================ */
const BASE = '/templates/taman-bunga'

/** Painted scene layers. Filenames carry no content hash, so replacing an
 *  image means renaming it (Cache-Control is 30 days, see next.config.js). */
export const SCENE = {
  sky: `${BASE}/sky.webp`,
  skyNoSun: `${BASE}/sky-nosun.webp`,
  hills: `${BASE}/hills.webp`,
  garden: `${BASE}/garden.webp`,
  gardenWide: `${BASE}/garden-wide.webp`,
  gardenWideNear: `${BASE}/garden-wide-near.webp`, // garden-wide with the arch opening cut out
  gardenInnerWide: `${BASE}/garden-inner-wide.webp`,
  gardenInnerWideFront: `${BASE}/garden-inner-wide-front.webp`, // the same with its mountains cut away
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
