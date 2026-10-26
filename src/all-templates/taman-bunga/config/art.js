/* ============================================================
   taman-bunga/config/art.js — the two painted art sets.

   `tall` is used on portrait screens (phones, upright tablets), `wide` on
   landscape screens (laptops, desktops, tablets on their side). Every number
   is in that set's own stage pixels — the size of its painted layers.

     vp      the gazebo: zoom origin for the walk and the path's vanishing point
     walk    how far the garden drifts (toward centre / down) by the end of the walk
     zoom    how much the garden grows about vp: `arch` while passing under the
             rose arch, `walk` per unit of walk distance (the walk ends at 8)
     path    the painted stone path, measured by hand: [image y, centre x, half width]
     lantern a lantern at depth z stands on the path row whose on-screen half
             width is K / z; its height is h × that half width
     inner   (wide only) the painting past the rose arch, with its own vp,
             walk, zoom, path, lantern and lamps — see engine/scene.js
   ============================================================ */
import { SCENE } from './assets.js'

export const ART = {
  tall: {
    W: 768,
    H: 1375,
    sky: { src: SCENE.sky, l: 0, t: -1164, w: 768, h: 1810, set: 280 },
    sun: null, // painted into sky.webp
    skyNight: { t: -40, h: 820 },
    moon: { l: 520, t: 70, s: 132 },
    stars: { w: 768, h: 720 },
    hills: { l: -166, t: 449, w: 1100, h: 538 },
    garden: SCENE.garden,
    vp: { x: 507, y: 680 },
    lamps: { l: 360, t: 600, w: 320, h: 130 },
    gate: { src: SCENE.gate, ox: 384, oy: 720 },
    doors: { l: 164, t: 522, w: 440, h: 625 },
    front: { src: SCENE.front, t: 1060, h: 315 },
    walk: { tx: -60, ty: 190 },
    zoom: { arch: 0.56, walk: 0.09 },
    path: [
      [700, 480, 20], [720, 465, 28], [740, 442, 37], [800, 447, 47], [850, 467, 52], [900, 430, 56],
      [950, 405, 62], [1000, 375, 75], [1050, 365, 85], [1100, 380, 90], [1200, 390, 120],
      [1300, 415, 135], [1375, 425, 150],
    ],
    lantern: { K: 245, h: 3 },
  },
  wide: {
    W: 1376,
    H: 768,
    sky: { src: SCENE.skyNoSun, l: 0, t: -668, w: 1376, h: 1188, set: 0 },
    sun: { x: 690, y: 246, d: 220, set: 230 }, // drawn, the wide sky has no sun
    skyNight: { t: -30, h: 560 },
    moon: { l: 170, t: 4, s: 96 }, // upper left: the treeline is lowest there
    stars: { w: 1376, h: 440 },
    hills: { l: -212, t: 268, w: 1800, h: 880 },
    garden: SCENE.gardenWideNear, // the arch layer; `inner` shows through its opening
    vp: { x: 765, y: 382 },
    lamps: { l: 650, t: 335, w: 260, h: 90 },
    gate: { src: SCENE.gateWide, ox: 710, oy: 470 },
    doors: { l: 590, t: 379, w: 240, h: 341 },
    front: { src: SCENE.frontWide, t: 520, h: 248 },
    walk: { tx: -77, ty: 120 },
    zoom: { arch: 0.56, walk: 0.09 },
    path: [
      [410, 760, 20], [450, 745, 32], [500, 738, 40], [550, 707, 44], [600, 685, 48], [650, 667, 54],
      [700, 670, 60], [768, 682, 68],
    ],
    lantern: { K: 142, h: 3 },
    // The wide painting's rose arch hugs the gazebo, so no zoom alone gets a
    // 16:9 screen through it. Instead the arch painting is the NEAR layer (its
    // opening cut out) and this "inside the garden" painting the FAR layer
    // behind it; the walk, lanterns and string-light glow continue on it.
    inner: {
      // garden + gazebo; the painting's own green mountains are cut away so the
      // hills.webp silhouette is the backdrop, matching the tall set
      src: SCENE.gardenInnerWide,
      hillsDepth: 0.15, // the silhouette moves this fraction of the garden's walk
      vp: { x: 845, y: 352 }, // the gazebo steps
      // where vp sits on the arch painting, and at what scale, so the two
      // gazebos coincide before the arch is passed
      start: { x: 752, y: 412, scale: 0.405 },
      // the near layer grows `zoom`× about the opening's centre while passing
      // the arch; the far layer is full size once k reaches 1 / catch
      near: { x: 692, y: 360, zoom: 4.5, catch: 1.5 },
      scale: 1.04, // a touch over full size, so its edges never show
      walk: { tx: -110, ty: 60 },
      zoom: 0.09,
      path: [
        [365, 845, 16], [380, 792, 22], [400, 752, 32], [440, 795, 40], [480, 808, 46], [520, 786, 52],
        [560, 755, 72], [600, 715, 100], [640, 678, 132], [680, 662, 168], [720, 665, 215], [768, 675, 255],
      ],
      lantern: { K: 120, h: 2.4 },
      lamps: { l: 690, t: 230, w: 380, h: 90 }, // the gazebo's string lights
      // hills.webp behind the gazebo: mountain ridge high, treeline below it
      hills: { l: -80, t: 10, w: 1540, h: 752 },
    },
  },
}

/** Landscape screens get the wide paintings; everything else the tall ones. */
export function isWideViewport(width, height) {
  return width >= 900 && width / height >= 1.15
}
