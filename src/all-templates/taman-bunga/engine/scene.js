/* ============================================================
   taman-bunga/engine/scene.js — the scroll-driven garden walk.

   One <canvas> paints the whole scene (sky, hills, garden, paper lanterns, gate,
   night tint, moon, stars, petals, fireflies, rising wish lanterns). A single
   canvas keeps memory flat and predictable on phones: the earlier DOM-layer
   version (one composited layer per painting) ran out of memory on iPhone
   inside the Claude app and was janky while zooming.

   The canvas only redraws when something changes (scroll, pointer, the doors
   opening); ambient life (lamps, fireflies, petals, wish lanterns) runs at
   ~30 fps while the reader is still. If a device still can't keep up, quality
   steps down on its own: lower canvas resolution first, then the extras.

   The DOM copy (text panels, portrait cards, gallery polaroids) is rendered by
   React; this module only fades/moves it, found via data-tb-* attributes.
   Client-only — imported from the Shell, which is loaded with ssr:false.
   ============================================================ */
import { ART, isWideViewport } from '../config/art.js'
import { SCENE } from '../config/assets.js'
import { walkDistance } from '../config/timeline.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1)
const ease = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t
const parseT = (el) => (el.dataset.t || '0,0,0,0').split(',').map(Number)

function sprite(stops) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x2 = c.getContext('2d')
  const gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (const [o, col] of stops) gr.addColorStop(o, col)
  x2.fillStyle = gr
  x2.fillRect(0, 0, 128, 128)
  return c
}

function makeStars(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x2 = c.getContext('2d')
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const n = Math.round((170 * (w * h)) / (768 * 720))
  for (let i = 0; i < n; i++) {
    const y = Math.pow(rnd(), 1.6) * h * 0.78
    const x = rnd() * w
    const r = 0.5 + rnd() * 1.3
    x2.globalAlpha = 0.35 + rnd() * 0.65
    x2.fillStyle = rnd() > 0.85 ? '#ffe2b8' : '#ffffff'
    x2.beginPath()
    x2.arc(x, y, r, 0, Math.PI * 2)
    x2.fill()
  }
  return c
}

/** Path row (image coords) whose half width is hw; past the painted bottom, extend the last bend. */
function pathRow(path, hw) {
  if (hw < path[0][2] * 0.8) return null
  if (hw <= path[0][2]) return { y: path[0][0], c: path[0][1], hw }
  for (let i = 1; i < path.length; i++) {
    const [y0, c0, h0] = path[i - 1]
    const [y1, c1, h1] = path[i]
    if (hw <= h1) {
      const t = (hw - h0) / (h1 - h0)
      return { y: lerp(y0, y1, t), c: lerp(c0, c1, t), hw }
    }
  }
  const [y0, c0, h0] = path[path.length - 2]
  const [y1, c1, h1] = path[path.length - 1]
  const y = y1 + ((hw - h1) * (y1 - y0)) / (h1 - h0)
  return { y, c: c1 + ((y - y1) * (c1 - c0)) / (y1 - y0), hw }
}

const PETAL_COLORS = ['#f7b8c4', '#f4a3b5', '#fbd3d9', '#e9b6e0', '#ffd7c2']
const CONFETTI_COLORS = ['#f2c98a', '#fff1d6', '#f6b6c8', '#d9c2f0', '#e8b36a']
// firework bursts: [main, highlight]
const FIREWORK_COLORS = [
  ['#ffd98a', '#fff3d6'],
  ['#ff8fb1', '#ffe0ea'],
  ['#c7a6ff', '#f1e8ff'],
  ['#ffd98a', '#ff8fb1'],
  ['#8fe3d0', '#fff3d6'],
  ['#ff9e7a', '#ffd98a'],
]
// paper lanterns in the garden outside the gazebo: [body, glow]
const LANTERN_COLORS = [['#ffb3c6', 'rgba(255, 150, 180, 0.55)'], ['#ffd9a0', 'rgba(255, 200, 120, 0.55)'], ['#fff1dc', 'rgba(255, 230, 190, 0.5)']]

/**
 * @param {HTMLElement} root   the Shell's root element
 * @param {object} opts
 * @param {(p:number)=>number} opts.toNominal  scroll progress → nominal timeline
 * @param {number[]} opts.lanternStops  walk distances at which a paper lantern lifts off
 * @param {number} opts.wishCount   wishes already on the wall (seeds the sky lanterns)
 */
export function mountScene(root, { toNominal, lanternStops, wishCount = 0 }) {
  const $ = (sel) => root.querySelector(sel)
  const cv = $('[data-tb-canvas]')
  const g = cv.getContext('2d', { alpha: false })
  const copy = $('[data-tb-copy]')
  const track = $('[data-tb-track]')
  const act2 = $('[data-tb-act2]')
  const gazeboEl = $('[data-tb-gazebo]')
  const closingEl = $('[data-tb-closing]')
  const hint = $('[data-tb-hint]')

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches

  // ---------- images ----------
  let dirty = true
  const IMG = {}
  const img = (src) => {
    if (!IMG[src]) {
      const i = new Image()
      i.decoding = 'async'
      i.onload = () => {
        dirty = true
      }
      i.src = src
      IMG[src] = i
    }
    return IMG[src]
  }
  const draw = (i, x, y, w, h) => {
    if (i.complete && i.naturalWidth) g.drawImage(i, x, y, w, h)
  }
  // A dusk-tinted copy of a painting (multiplied with lavender, alpha kept),
  // built once when it has loaded — cross-faded in as night falls for a
  // layer painted in daylight colours.
  const loaded = (i) => i instanceof HTMLCanvasElement || (i.complete && i.naturalWidth > 0)
  // the palette's night (config/palettes.js); setNight swaps it
  let NC = { sky: ['#0f0d2c', '#231a4a', 'rgba(70, 40, 90, 0.85)'], tint: '#6f5d9c', shade: ['#5a4a8c', '#8a6a9c'] }
  const NIGHT = new Map()
  const nightOf = (i) => {
    if (!loaded(i)) return null
    if (!NIGHT.has(i)) {
      const c = document.createElement('canvas')
      c.width = i.naturalWidth || i.width
      c.height = i.naturalHeight || i.height
      const x = c.getContext('2d')
      x.drawImage(i, 0, 0)
      x.globalCompositeOperation = 'multiply'
      x.fillStyle = NC.tint
      x.fillRect(0, 0, c.width, c.height)
      x.globalCompositeOperation = 'destination-in'
      x.drawImage(i, 0, 0)
      NIGHT.set(i, c)
    }
    return NIGHT.get(i)
  }
  // The painting with its small gazebo painted out (art.gazebo.patch), built
  // once both have loaded. The full-size gazebo front replaces that gazebo, so
  // keeping it would only leave a second, blurry roof peeking out behind.
  const BARE = new Map()
  const bareOf = (i) => {
    const P = art.gazebo?.patch
    const p = P && img(P.src)
    if (!p || !loaded(i) || !loaded(p)) return null
    if (!BARE.has(i)) {
      const c = document.createElement('canvas')
      c.width = i.naturalWidth
      c.height = i.naturalHeight
      const x = c.getContext('2d')
      x.drawImage(i, 0, 0)
      x.clearRect(P.x, P.y, P.w, P.h)
      x.drawImage(p, P.x, P.y, P.w, P.h)
      BARE.set(i, c)
    }
    return BARE.get(i)
  }
  // The inside of the gazebo, warmed: it is painted as a cool blue night, which
  // on its own reads as an empty, solemn pavilion. A soft amber grade and a glow
  // under the string lights make it a party at night. Built once per painting.
  const WARM = new Map()
  const warmOf = (i) => {
    if (!loaded(i)) return null
    if (!WARM.has(i)) {
      const c = document.createElement('canvas')
      const w = (c.width = i.naturalWidth)
      const h = (c.height = i.naturalHeight)
      const x = c.getContext('2d')
      x.drawImage(i, 0, 0)
      x.globalCompositeOperation = 'soft-light'
      x.fillStyle = 'rgba(255, 170, 100, 0.6)'
      x.fillRect(0, 0, w, h)
      x.globalCompositeOperation = 'screen'
      const glow = x.createRadialGradient(w / 2, h * 0.28, 0, w / 2, h * 0.28, Math.max(w, h) * 0.6)
      glow.addColorStop(0, 'rgba(255, 196, 130, 0.3)')
      glow.addColorStop(1, 'rgba(255, 196, 130, 0)')
      x.fillStyle = glow
      x.fillRect(0, 0, w, h)
      x.globalCompositeOperation = 'destination-in'
      x.drawImage(i, 0, 0)
      WARM.set(i, c)
    }
    return WARM.get(i)
  }
  // ...and the same with its night sky cut out (int.sky.src: a mask, alpha =
  // sky, measured offline down to the treeline): wish lanterns and fireworks
  // are drawn between the two, so they only show through the arches.
  const FORE = new Map()
  const foreOf = (i, sky) => {
    const warm = warmOf(i)
    const m = sky && img(sky.src)
    if (!warm || !m || !loaded(m)) return null
    if (!FORE.has(i)) {
      const c = document.createElement('canvas')
      c.width = warm.width
      c.height = warm.height
      const x = c.getContext('2d')
      x.drawImage(warm, 0, 0)
      x.globalCompositeOperation = 'destination-out'
      x.drawImage(m, 0, 0, c.width, c.height)
      FORE.set(i, c)
    }
    return FORE.get(i)
  }
  const hillsImg = img(SCENE.hills)
  const moonImg = img(SCENE.moon)
  const doorL = img(SCENE.doorL)
  const doorR = img(SCENE.doorR)
  const skyLanternImg = img(SCENE.skyLantern)
  const paperLanternImg = img(SCENE.paperLantern)

  const GLOW = sprite([[0, 'rgba(255, 210, 130, 0.8)'], [0.45, 'rgba(255, 170, 90, 0.28)'], [1, 'rgba(255, 170, 90, 0)']])
  const LAMP = sprite([[0, 'rgba(255, 214, 140, 0.95)'], [0.55, 'rgba(255, 170, 90, 0.35)'], [1, 'rgba(255, 170, 90, 0)']])
  const SUN = sprite([[0, '#fff3d6'], [0.3, '#fff3d6'], [0.36, '#ffe0b0'], [0.46, 'rgba(255, 196, 150, 0.55)'], [0.7, 'rgba(255, 170, 130, 0)'], [1, 'rgba(255, 170, 130, 0)']])
  const FLY = sprite([[0, 'rgba(255, 236, 160, 1)'], [1, 'rgba(255, 200, 90, 0)']])

  function glowAt(spr, x, y, rx, ry, alpha, light) {
    if (alpha <= 0.002) return
    g.globalAlpha = Math.min(1, alpha)
    if (light) g.globalCompositeOperation = 'lighter'
    g.drawImage(spr, x - rx, y - ry, rx * 2, ry * 2)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }
  // A light in the painting (lamp, string lights): drawn now, and remembered so
  // it shines again over the night darkening, which would otherwise dim it too.
  const lights = []
  function lightAt(spr, x, y, rx, ry, alpha) {
    glowAt(spr, x, y, rx, ry, alpha, true)
    if (alpha > 0.002) lights.push([g.getTransform(), spr, x, y, rx, ry, alpha])
  }
  // transform about an origin, the way CSS transform-origin + translate + scale would
  function xform(ox, oy, s, tx, ty, fn) {
    g.save()
    g.translate(ox + tx, oy + ty)
    g.scale(s, s)
    g.translate(-ox, -oy)
    fn()
    g.restore()
  }

  // ---------- art set + layout ----------
  let art = null
  let starsCv = null
  let nightGrad = null
  let duskGrad = null
  let wide = false
  let sw = 0
  let sh = 0
  let dpr = 1
  let S = 1
  let OX = 0
  let OY = 0
  let dprDrop = 0 // quality steps down on its own if the device can't keep up
  let lite = false

  function applyArt(a) {
    if (art === a) return
    art = a
    ;[a.sky.src, a.garden, a.gate.src, a.front.src, a.inner?.src, a.inner?.hills.src, a.gazebo?.ext.src, a.gazebo?.int.src, a.gazebo?.int.sky?.src, a.gazebo?.patch.src].filter(Boolean).forEach(img)
    starsCv = makeStars(a.stars.w, a.stars.h)
    skyGrad()
    dirty = true
  }
  function skyGrad() {
    nightGrad = g.createLinearGradient(0, art.skyNight.t, 0, art.skyNight.t + art.skyNight.h)
    nightGrad.addColorStop(0, NC.sky[0])
    nightGrad.addColorStop(0.45, NC.sky[1])
    nightGrad.addColorStop(0.75, NC.sky[2])
    nightGrad.addColorStop(1, 'rgba(120, 60, 90, 0)')
  }
  function screenGrad() {
    duskGrad = g.createLinearGradient(0, 0, 0, sh)
    duskGrad.addColorStop(0, NC.shade[0])
    duskGrad.addColorStop(1, NC.shade[1])
  }

  // gallery: one easel board (its own px size read from the element) and its pages
  const gallery = { el: null, easel: null, caption: null, pages: [] }
  let easelSc = 1
  let cw = 0
  let ch = 0

  function layout() {
    sw = window.innerWidth
    sh = window.innerHeight
    wide = isWideViewport(sw, sh)
    applyArt(wide ? ART.wide : ART.tall)
    // An attribute, not a class: React owns root.className and rewrites it
    // whenever the Shell re-renders (e.g. tb-open), which would drop a class.
    root.toggleAttribute('data-tb-wide', wide)
    // pixel budget: sharp enough for a soft painting, light enough to redraw every frame on a phone
    dpr = Math.min(window.devicePixelRatio || 1, sw < 700 ? 1.5 : 2)
    while (dpr > 1 && sw * sh * dpr * dpr > 2.4e6) dpr -= 0.25
    dpr = Math.max(1, dpr - dprDrop)
    cv.width = Math.round(sw * dpr)
    cv.height = Math.round(sh * dpr)
    S = Math.max(sw / art.W, sh / art.H)
    OX = (sw - art.W * S) / 2
    OY = (sh - art.H * S) / 2
    // Screens wider than the wide painting (ultrawide) lose height: crop it
    // mostly from the foreground flowers, not the sky with the moon.
    if (wide && OY < 0) OY *= 0.3
    screenGrad()
    placeLanterns()
    cw = copy.clientWidth
    ch = copy.clientHeight
    // the paper: three quarters of a phone's width, never taller than ~45% of the screen
    // (read here, once per layout: reading them while turning pages would force a reflow each frame)
    const board = gallery.easel?.querySelector('[data-tb-easel-board]')
    if (board) {
      easelSc = Math.min(cw * 0.74, ch * 0.38, 340) / board.offsetWidth
      gallery.ew = gallery.easel.offsetWidth
      gallery.eh = gallery.easel.offsetHeight
    }
    dirty = true
  }

  // ---------- copy elements ----------
  let panels = []
  let cards = []
  function scanCopy() {
    panels = [...root.querySelectorAll('[data-tb-panel]')].map((el) => ({ el, t: parseT(el) }))
    cards = [...root.querySelectorAll('[data-tb-card]')].map((el) => ({
      el,
      t: parseT(el),
      portrait: el.querySelector('[data-tb-portrait]'),
      photo: el.querySelector('[data-tb-photo]'),
      dim: -1,
    }))
    gallery.el = $('[data-tb-gallery]')
    gallery.easel = $('[data-tb-easel]')
    gallery.caption = $('[data-tb-gallery-caption]')
    gallery.pages = [...root.querySelectorAll('[data-tb-page]')].map((el) => ({
      el,
      // outermost (at the rings) first: document order of the nested strips
      strips: [...el.querySelectorAll('[data-tb-strip]')].map((s) => ({
        el: s,
        shade: s.querySelector(':scope > .tb-strip-face:not(.tb-strip-back) > .tb-page-shade'),
        backShade: s.querySelector(':scope > .tb-strip-back > .tb-page-shade'),
      })),
      p: -1,
    }))
    if (gallery.el) gallery.t = parseT(gallery.el)
    lastP = -1
  }

  let opened = false
  let openAt = 0
  let reveal = 0 // 0 → 1 just after the cover opens

  function show(el, o) {
    o *= reveal
    el.style.opacity = o
    const vis = o > 0.001
    if ((el.style.visibility === 'visible') !== vis) el.style.visibility = vis ? 'visible' : 'hidden'
    el.classList.toggle('tb-on', o > 0.5)
  }

  // ---------- state ----------
  let mx = 0
  let my = 0
  let tmx = 0
  let tmy = 0
  const fxState = { petals: 0, flies: 0, lamps: 0, wish: 0, cel: 0, paper: 0 }

  // ---------- paper lanterns along the path ----------
  // A few lanterns rest, lit, on the stones at the edge of the painted path
  // (alternating sides). Each is pinned to one spot of the painting, chosen so
  // that when the walk reaches its stop it stands 80% down the screen, beside
  // us. A moment later it floats up off the stones, hangs there, then climbs
  // on its own clock (not the scroll): slowly at first, carried by a light
  // breeze, wandering and tilting with it, farther and smaller as it rises,
  // its flame flickering, until it melts into the sky. Its body is painted
  // with the garden (so dusk and night grade it too) and its light is added
  // over the night tint. Walking back past its stop sets it down again.
  const LANTERN_FLIGHT = 13000 // ms from lift-off to out of sight
  const paper = lanternStops.map((stop, i) => ({
    stop,
    side: i % 2 === 0 ? -1 : 1,
    x: 0,
    y: 0,
    hw: 0,
    at: 0,
    ph: i * 2.39, // phase of its wander and flicker
    wait: 250 + ((i * 377) % 600), // ms between reaching it and lift-off
  }))
  function pathAtY(path, y) {
    if (y <= path[0][0]) return { c: path[0][1], hw: path[0][2] }
    for (let i = 1; i < path.length; i++) {
      const [y0, c0, h0] = path[i - 1]
      const [y1, c1, h1] = path[i]
      if (y <= y1) {
        const t = (y - y0) / (y1 - y0)
        return { c: lerp(c0, c1, t), hw: lerp(h0, h1, t) }
      }
    }
    const [y0, c0, h0] = path[path.length - 2]
    const [y1, c1, h1] = path[path.length - 1]
    const t = (y - y1) / (y1 - y0)
    return { c: c1 + (c1 - c0) * t, hw: h1 + (h1 - h0) * t }
  }
  // The painting the lanterns stand on (the wide set: the one past the arch),
  // and its scale + drift once the arch is passed, at walk distance c.
  const walkPose = (c) => {
    const I = art.inner
    if (I) return { P: I, s: I.scale * (1 + I.zoom * c), ty: (I.walk.ty * c) / 8 }
    return { P: art, s: 1 + 0.12 + art.zoom.arch + art.zoom.walk * c, ty: (art.walk.ty * c) / 8 }
  }
  function placeLanterns() {
    const near = (sh * 0.8 - OY) / S // stage row 80% down the screen
    for (const l of paper) {
      const { P, s, ty } = walkPose(l.stop)
      l.y = P.vp.y + (near - P.vp.y - ty) / s
      const row = pathAtY(P.path, l.y)
      l.hw = row.hw
      l.x = row.c + l.side * row.hw * 0.7 // on the stones, near the edge
    }
  }
  const airborne = [] // this frame's lanterns, in stage pixels; their light goes over the night tint
  /** Where a lantern is, t seconds after lift-off: rise and drift in stage px, tilt, flame. */
  function flight(l, t, h0) {
    // floats off the stones and hangs a moment...
    const hop = ease(clamp(t / 1.8, 0, 1)) * 0.45 * h0
    // ...then climbs, speeding up gently to a steady drift upward
    const u = Math.max(0, t - 1.6)
    const tau = 2.6
    const climb = art.H * 0.075 * (u - tau * (1 - Math.exp(-u / tau)))
    const calm = Math.min(1, t / 2.2)
    // a light breeze carries every lantern the same way; each wanders on its own
    const wander = Math.sin(t * 0.55 + l.ph) * 0.3 + Math.sin(t * 1.3 + l.ph * 2) * 0.12
    const drift = (art.W * 0.01 * u + wander * h0 * 1.4) * calm
    const tilt = (Math.cos(t * 0.55 + l.ph) * 0.09 + Math.cos(t * 1.3 + l.ph * 2) * 0.05) * calm
    const bob = Math.sin(t * 2.1 + l.ph) * 0.04 * h0 * (1 - Math.min(1, u / 3))
    return { rise: hop + climb + bob, drift, tilt }
  }
  const flicker = (now, l) => 0.88 + 0.12 * Math.sin(now / 110 + l.ph) * Math.sin(now / 270 + l.ph * 3)

  function journey(T, a2, q, gz) {
    const c = walkDistance(T, q)
    return {
      T,
      g: gz, // 0 → 1 through the closing: up the gazebo steps and inside
      through: ease(seg(T, 0.025, 0.13)),
      settle: ease(seg(T, 0.025, 0.14)),
      arch: ease(seg(T, 0.16, 0.22)),
      sunset: ease(seg(T, 0.3, 0.72)),
      night: ease(seg(T, 0.45, 0.86)),
      lit: ease(seg(T, 0.3, 0.7)),
      c,
      bob: reduce ? 0 : Math.sin(c * Math.PI * 3) * 3 * Math.min(1, c),
      moonT: ease(seg(T, 0.86, 1)) * 0.7 + ease(clamp(a2, 0, 1)) * 0.3,
      stars: ease(seg(T, 0.6, 0.88)),
      lamps: ease(seg(T, 0.58, 0.78)),
      fr: ease(seg(T, 0.015, 0.1)),
      show3d: opened ? seg(T, 0.385, 0.43) : 0,
    }
  }

  // ---------- draw the whole painted scene ----------
  function drawScene(J, now) {
    const A = art
    const px = (k) => -mx * k
    const py = (k) => -my * k * 0.5
    const tx = (A.walk.tx * J.c) / 8
    const ty = (A.walk.ty * J.c) / 8 + J.bob
    const Z = A.zoom
    const fl = reduce ? 1 : 1 + 0.09 * Math.sin(now / 520) + 0.05 * Math.sin(now / 197)
    // Wide set: two layers, like a real 2.5D shot. The rose arch painting has
    // its opening cut out (A.garden = garden-wide-near) and the "inside the
    // garden" painting (A.inner) sits behind it, scaled so its gazebo lands
    // exactly on the painted one. Passing the arch (k 0 → 1), the near layer
    // grows much faster than the far one, so the arch slides out past the
    // edges of the screen while the garden behind keeps coming closer — no
    // image swap. Tall set: one painting, zoomed about the gazebo.
    const I = A.inner
    const k = I ? ease(seg(J.T, 0.15, 0.27)) : 0
    const gs = I ? (1 + 0.12 * J.settle) * Math.pow(I.near.zoom, k) : 1 + 0.12 * J.settle + Z.arch * J.arch + Z.walk * J.c
    const gox = I ? I.near.x : A.vp.x
    const goy = I ? I.near.y : A.vp.y
    // far layer pose: k = 0 → glued to the painted gazebo, k = 1 → its own walk
    const itx = I ? (I.walk.tx * J.c) / 8 : 0
    const ity = I ? (I.walk.ty * J.c) / 8 + J.bob : 0
    const is = I ? I.scale * (1 + I.zoom * J.c) : 1
    // where a point of the painting that holds the gazebo lands on the stage
    const paintTo = I
      ? (x, y) => [I.vp.x + (x - I.vp.x) * is + itx + px(20), I.vp.y + (y - I.vp.y) * is + ity + py(20)]
      : (x, y) => [gox + (x - gox) * gs + tx + px(20), goy + (y - goy) * gs + ty + py(20)]
    const G = A.gazebo && J.g > 0 ? gazeboPose(A, J, paintTo, I ? is : gs) : null
    // the whole garden rides the same camera as the gazebo front, so it stays glued to it
    const cam = (depth) => {
      if (!G) return
      const z = Math.pow(G.z, depth)
      g.translate(G.a0x + (G.ax - G.a0x) * depth, G.a0y + (G.ay - G.a0y) * depth)
      g.scale(z, z)
      g.translate(-G.a0x, -G.a0y)
    }
    // a painting that holds the gazebo: as the gazebo front fades in, it
    // cross-fades to its copy without the small painted gazebo (no dip: the
    // bare copy goes down first at full strength, the original over it)
    const paintGz = (src, dusk) => {
      const base = g.globalAlpha
      const layer = (im, a) => {
        g.globalAlpha = base * a
        g.drawImage(im, 0, 0, A.W, A.H)
        const n = dusk && J.night > 0 && nightOf(im)
        if (n) {
          g.globalAlpha = base * a * J.night * 0.7
          g.drawImage(n, 0, 0, A.W, A.H)
        }
      }
      const im = img(src)
      if (!loaded(im)) return
      const bare = G && bareOf(im)
      if (bare) layer(bare, 1)
      if (!bare || G.o < 1) layer(im, bare ? 1 - G.o : 1)
      g.globalAlpha = base
    }

    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = '#3a2440'
    g.fillRect(0, 0, cv.width, cv.height)
    g.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY)
    if (!G || !G.full) drawWorld()
    function drawWorld() {
    g.save()
    cam(0.15)
    // sky, sun, night sky, moon, stars
    draw(img(A.sky.src), A.sky.l + px(5), A.sky.t + A.sky.set * J.sunset + py(5), A.sky.w, A.sky.h)
    if (A.sun) glowAt(SUN, A.sun.x + px(5), A.sun.y + A.sun.set * J.sunset + py(5), A.sun.d / 2, A.sun.d / 2, 1, false)
    if (J.night > 0) {
      g.globalAlpha = 0.94 * J.night
      g.fillStyle = nightGrad
      g.fillRect(0, A.skyNight.t, A.W, A.skyNight.h)
      g.globalAlpha = 1
    }
    if (J.moonT > 0) {
      g.globalAlpha = J.moonT
      g.globalCompositeOperation = 'lighter'
      draw(moonImg, A.moon.l + px(5), A.moon.t + (1 - J.moonT) * A.H * 0.16 + py(5), A.moon.s, A.moon.s)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    }
    if (J.stars > 0) {
      g.globalAlpha = J.stars
      g.drawImage(starsCv, 0, 0)
      g.globalAlpha = 1
    }
    g.restore()
    g.save()
    cam(1)

    // hills and garden zoom about the gazebo as we walk
    const hs = 1 + 0.04 * J.settle + 0.08 * J.arch + Z.walk * 0.36 * J.c
    // (the wide set draws its treeline inside the far layer instead, below)
    if (!A.inner) xform(A.vp.x, A.vp.y, hs, tx * 0.4 + px(10), ty * 0.4 + py(10), () => draw(hillsImg, A.hills.l, A.hills.t, A.hills.w, A.hills.h))

    if (I) {
      const nb = 1 + 0.12 * J.settle
      const s0 = I.start.scale * nb
      const x0 = gox + tx + nb * (I.start.x - gox) - I.vp.x
      const y0 = goy + ty + nb * (I.start.y - goy) - I.vp.y
      // The far layer must always fill the (fast-growing) opening, or its
      // edges show; it reaches full size at k = 1 / I.near.catch — still
      // slower than the arch, so the depth reads right.
      const kf = Math.min(1, k * I.near.catch)
      // glued to the arch painting at kf = 0, on its own walk pose at kf = 1
      const far = (scale, wx, wy, fn) =>
        xform(I.vp.x, I.vp.y, s0 * Math.pow(scale / s0, kf), lerp(x0, wx, kf) + px(20), lerp(y0, wy, kf) + py(20), fn)
      // back: the mountain + treeline silhouette (the same hills.webp the
      // tall set uses), far away so it barely moves and the sky stays in view
      const hk = I.hillsDepth
      far(I.scale * (1 + I.zoom * hk * J.c), itx * hk, ity * hk, () => draw(img(I.hills.src), I.hills.l, I.hills.t, I.hills.w, I.hills.h))
      // front: garden, path and gazebo (the painting's own mountains cut away) walk toward us
      far(is, itx, ity, () => {
        paintGz(I.src, true)
        if (J.lamps > 0) {
          const lp = I.lamps
          lightAt(LAMP, lp.l + lp.w * 0.5, lp.t + lp.h * 0.5, lp.w / 2, lp.h / 2, J.lamps * fl * 0.85)
        }
      })
    }
    // the near layer fades only in its last stretch, as the arch leaves the frame
    const nearO = I ? 1 - seg(k, 0.72, 1) : 1
    if (nearO > 0) {
      g.globalAlpha = nearO
      xform(gox, goy, gs, tx + px(20), ty + py(20), () => {
        if (I) draw(img(A.garden), 0, 0, A.W, A.H)
        else paintGz(A.garden, false)
        if (!I && J.lamps > 0) {
          const lp = A.lamps
          lightAt(LAMP, lp.l + lp.w * 0.48, lp.t + lp.h * 0.56, lp.w / 2, lp.h / 2, J.lamps * fl * 0.95)
        }
      })
      g.globalAlpha = 1
    }

    // paper lanterns: resting on the stones, or rising. The body is drawn
    // here, with the garden; its light is added after the night tint.
    airborne.length = 0
    if (J.show3d > 0 && !G && loaded(paperLanternImg)) {
      const P = I ? I : A
      const ps = I ? is : gs
      const gx0 = P.vp.x + (I ? itx : tx) + px(20)
      const gy0 = P.vp.y + (I ? ity : ty) + py(20)
      const ar = paperLanternImg.naturalWidth / paperLanternImg.naturalHeight
      for (const l of paper) {
        if (!l.at && J.c >= l.stop && !reduce) l.at = now + l.wait
        const t = l.at ? Math.max(0, (now - l.at) / 1000) : 0
        if (l.at && t * 1000 >= LANTERN_FLIGHT && J.c < l.stop - 0.25) l.at = 0 // walked back: it rests again
        const h0 = 0.85 * l.hw * ps
        const f = l.at ? flight(l, t, h0) : { rise: 0, drift: 0, tilt: 0 }
        const far = 1 / (1 + f.rise / (A.H * 0.55)) // farther away as it climbs
        const h = h0 * far
        // far-off ones fade in out of the distance; climbing ones melt into the sky
        const o = J.show3d * seg(h * S, 6, 20) * (1 - seg(f.rise, A.H * 0.5, A.H * 0.78))
        if (o <= 0) continue
        const q = {
          x: gx0 + (l.x - P.vp.x) * ps + f.drift,
          y: gy0 + (l.y - P.vp.y) * ps - f.rise,
          foot: gy0 + (l.y - P.vp.y) * ps,
          fx: gx0 + (l.x - P.vp.x) * ps,
          h,
          h0,
          o,
          rise: f.rise,
          tilt: f.tilt,
          fl: flicker(now, l),
        }
        airborne.push(q)
        g.save()
        g.translate(q.x, q.y - h * 0.5)
        g.rotate(q.tilt)
        g.globalAlpha = o
        g.drawImage(paperLanternImg, (-h * ar) / 2, -h / 2, h * ar, h)
        g.restore()
      }
      g.globalAlpha = 1
    }
    fxState.paper = paper.some((l) => l.at && now - l.at < LANTERN_FLIGHT) ? 1 : 0

    // gate with its doors, then the front flower bed
    const gateO = 1 - seg(J.T, 0.1, 0.13)
    if (gateO > 0) {
      g.globalAlpha = gateO
      xform(A.gate.ox, A.gate.oy, 1 + 2.8 * Math.pow(J.through, 1.35), px(30), py(30), () => {
        // doors swing open toward the garden: drawn as a narrowing leaf on each hinge,
        // fading into the painted open doors once they're through
        const d = A.doors
        const t = opened ? (reduce ? 1 : ease(clamp((now - openAt) / 1700, 0, 1))) : 0
        const leaf = (d.w / 2) * Math.cos(t * 1.4)
        const doorO = 1 - seg(t, 0.55, 1)
        if (leaf > 1 && doorO > 0) {
          g.globalAlpha = gateO * doorO
          draw(doorL, d.l, d.t, leaf, d.h)
          draw(doorR, d.l + d.w - leaf, d.t, leaf, d.h)
          g.globalAlpha = gateO
        }
        draw(img(A.gate.src), 0, 0, A.W, A.H)
      })
      g.globalAlpha = 1
    }
    const frontO = 1 - seg(J.T, 0.08, 0.1)
    if (frontO > 0) {
      g.globalAlpha = frontO
      xform(A.W / 2, A.front.t, 1 + 0.6 * J.fr, px(38), A.H * 0.3 * J.fr + py(38), () => draw(img(A.front.src), 0, A.front.t, A.W, A.front.h))
      g.globalAlpha = 1
    }
    g.restore()
    // the gazebo front, glued over the painted gazebo, its entrance cut out
    if (G) drawGazeboFront(A.gazebo, G, J, !!I)
    }

    // screen-space: night tint, wish lanterns, petals, fireflies
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Night falls by MULTIPLYING the scene with the palette's shade: it
    // darkens and tints but never lifts the blacks, so no milky haze (a
    // translucent dark wash over the painting read as fog).
    if (J.night > 0 && !(G && G.full)) {
      g.globalCompositeOperation = 'multiply'
      g.globalAlpha = 0.6 * J.night
      g.fillStyle = duskGrad
      g.fillRect(0, 0, sw, sh)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
      // the lights shine through the night instead of dimming with it
      for (const [m, spr, x, y, rx, ry, a] of lights) {
        g.setTransform(m)
        glowAt(spr, x, y, rx, ry, a * J.night * 0.7, true)
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    lights.length = 0
    drawPaperLanterns(J)
    // the interior is painted at night already, so it goes over the tint;
    // lanterns and fireworks go between it and its sky-less copy, so they only
    // show through the arches
    // Once inside, the camera breathes: a slow drift and a hint of zoom about
    // the screen centre, so the last scene never freezes into a still.
    const sway = G && G.full && !reduce ? seg(J.g, 0.7, 0.95) : 0
    const t = now / 1000
    const z = 1 + sway * (0.02 + 0.006 * Math.sin(t * 0.31))
    const dx = sway * 2.5 * Math.sin(t * 0.53)
    const dy = sway * 2 * Math.sin(t * 0.41 + 1)
    const inside = (fore) => {
      g.setTransform(dpr * z * S, 0, 0, dpr * z * S, dpr * (z * OX + (sw / 2) * (1 - z) + dx), dpr * (z * OY + (sh / 2) * (1 - z) + dy))
      const drawn = drawGazeboInside(A.gazebo, G, fore)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      return drawn
    }
    if (G) inside(false)
    const fore = !!G && !!foreOf(img(A.gazebo.int.src), A.gazebo.int.sky)
    // the inside's sky rows, on screen
    const skyY = (row) => (sh / 2) * (1 - z) + dy + z * (OY + S * (G.int.y + G.int.s * row))
    const y0 = G ? Math.max(0, skyY(A.gazebo.int.sky.y0)) : 0
    const y1 = G ? Math.min(sh, skyY(A.gazebo.int.sky.y1)) : 0
    drawSkyLanterns(now, G && !fore ? 1 - seg(J.g, 0.3, 0.6) : 1)
    if (G) {
      // the garden outside is lit for the party too: no dark woods around the gazebo
      if (fore) drawGardenLights(now, skyY(A.gazebo.int.sky.y0), skyY(A.gazebo.int.sky.y1), dx, G.o)
      drawFireworks(now, y0, y1)
      if (fore) inside(true)
    }
    drawFx(now)
  }

  function drawPaperLanterns(J) {
    if (!airborne.length) return
    const ar = paperLanternImg.naturalWidth / paperLanternImg.naturalHeight
    g.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY)
    const lit = 0.25 + 0.35 * J.lit
    for (const q of airborne) {
      // the warm pool it throws on the stones, fading as it leaves them
      const pool = 1 - seg(q.rise, 0, q.h0 * 1.6)
      if (pool > 0) glowAt(LAMP, q.fx, q.foot, q.h0 * 1.1, q.h0 * 0.3, q.o * pool * lit * q.fl, true)
      // a soft halo, and the paper glowing from the flame inside (stronger at night)
      glowAt(GLOW, q.x, q.y - q.h * 0.45, q.h * 0.95, q.h * 0.95, q.o * lit * q.fl, true)
      const shine = q.o * q.fl * (0.15 + 0.4 * J.night)
      if (shine > 0.01) {
        g.save()
        g.translate(q.x, q.y - q.h * 0.5)
        g.rotate(q.tilt)
        g.globalAlpha = shine
        g.globalCompositeOperation = 'lighter'
        g.drawImage(paperLanternImg, (-q.h * ar) / 2, -q.h / 2, q.h * ar, q.h)
        g.restore()
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // ---------- the gazebo (closing): up the steps and inside ----------
  // Two more layers, the same trick as the rose arch. The FRONT painting
  // (pillars, steps, roses; entrance cut out) is glued over the small painted
  // gazebo, and the whole garden rides one camera with it, so nothing jumps.
  // The INSIDE painting is glued behind the entrance. Walking in, the front
  // grows past the screen edges while the inside grows a little slower (it is
  // further away) until it fills the screen. All numbers: config/art.js.
  function gazeboPose(A, J, paintTo, ps) {
    const Gz = A.gazebo
    const E = Gz.ext
    const N = Gz.int
    const [pcx, pfy] = paintTo(Gz.painted.cx, Gz.painted.floor)
    const s0 = (Gz.painted.w * ps) / E.w
    const t0x = pcx - s0 * E.cx
    const t0y = pfy - s0 * E.floor
    const h = E.hole
    const hcx = (h.x0 + h.x1) / 2
    const hcy = (h.y0 + h.y1) / 2
    // the part of the stage this screen shows, and its centre
    const visW = Math.min(A.W, sw / S)
    const visH = Math.min(A.H, sh / S)
    const vcx = (sw / 2 - OX) / S
    const vcy = (sh / 2 - OY) / S
    // end: the entrance is well past the screen edges, pillars gone
    const s1 = Math.max((visW * Gz.pass) / (h.x1 - h.x0), (visH * Gz.pass) / (h.y1 - h.y0))
    const e = ease(seg(J.g, 0, 0.8))
    const s = s0 * Math.pow(s1 / s0, e)
    const a0x = s0 * hcx + t0x
    const a0y = s0 * hcy + t0y
    const ax = lerp(a0x, vcx, e)
    const ay = lerp(a0y, vcy, e)
    // inside: glued under the entrance (its back arch where the front shows
    // one), then its own pose — centred, covering the screen; a painting with
    // its own front pillars is enlarged until they are out of view
    const nbx = (N.back.x0 + N.back.x1) / 2
    const ebx = (E.back.x0 + E.back.x1) / 2
    const i0 = s0 * N.glue
    let iF = Math.max(A.W / N.W, A.H / N.H) * 1.02
    if (N.pillars) iF = Math.max(iF, (visW / 2 + 24) / ((N.pillars.r - N.pillars.l) / 2))
    const ei = Math.min(1, e * Gz.catch)
    const si = i0 * Math.pow(iF / i0, ei)
    const bx = lerp(s0 * ebx + t0x, vcx + (nbx - N.W / 2) * iF, ei)
    const by = lerp(s0 * E.back.top + t0y, vcy + (N.back.top - N.H / 2) * iF, ei)
    return {
      z: s / s0,
      a0x,
      a0y,
      ax,
      ay,
      ext: { s, x: ax - s * hcx, y: ay - s * hcy },
      int: { s: si, x: bx - si * nbx, y: by - si * N.back.top },
      // cross-fade over the painted gazebo while it is still small
      o: ease(seg(J.g, 0, 0.14)),
      full: e >= Gz.clipOff,
    }
  }
  // dusk: the wide set's inner painting is daylight-coloured and gets the
  // lavender copy at night, so the front glued onto it must too; the tall
  // painting gets only the screen tint, and so does the front.
  function drawGazeboFront(Gz, G, J, dusk) {
    const E = Gz.ext
    const im = img(E.src)
    g.save()
    g.globalAlpha = G.o
    g.translate(G.ext.x, G.ext.y)
    g.scale(G.ext.s, G.ext.s)
    draw(im, 0, 0, E.W, E.H)
    const night = dusk && J.night > 0 && nightOf(im)
    if (night) {
      g.globalAlpha = G.o * J.night * 0.7
      g.drawImage(night, 0, 0, E.W, E.H)
    }
    g.restore()
  }
  function drawGazeboInside(Gz, G, fore) {
    const E = Gz.ext
    const N = Gz.int
    const h = E.hole
    const raw = img(N.src)
    const im = fore ? foreOf(raw, N.sky) : warmOf(raw) || raw
    if (!im || !loaded(im)) return false
    g.save()
    if (!G.full) {
      // only through the entrance until the entrance is bigger than the screen
      g.beginPath()
      g.rect(G.ext.x + h.x0 * G.ext.s, G.ext.y + h.y0 * G.ext.s, (h.x1 - h.x0) * G.ext.s, (h.y1 - h.y0) * G.ext.s)
      g.clip()
      g.globalAlpha = G.o
    }
    g.translate(G.int.x, G.int.y)
    g.scale(G.int.s, G.int.s)
    g.drawImage(im, 0, 0, N.W, N.H)
    g.restore()
    return true
  }

  // ---------- petals + fireflies ----------
  const petals = []
  const flies = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: 0.45 + Math.random() * 0.5,
    ph: Math.random() * 6.28,
    sp: 0.4 + Math.random() * 0.6,
  }))
  let lastFx = 0
  function drawFx(now) {
    if (reduce || lite) return
    const k = Math.min(3, (now - lastFx) / 16.7 || 1) // keep petal speed steady at 30 or 60 fps
    lastFx = now
    if (fxState.petals > 0.02 && petals.length < 34 + 26 * fxState.cel && Math.random() < fxState.petals * 0.35 * k) {
      petals.push({
        x: Math.random() * sw * 1.2 - sw * 0.1,
        y: -20,
        vx: -0.3 + Math.random() * 0.9,
        vy: 0.6 + Math.random() * 0.9,
        r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.06,
        s: 5 + Math.random() * 5,
        c: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0],
        w: Math.random() * 6.28,
      })
    }
    for (let i = petals.length - 1; i >= 0; i--) {
      const q = petals[i]
      q.w += 0.03 * k
      q.x += (q.vx + Math.sin(q.w) * 0.6) * k
      q.y += q.vy * k
      q.r += q.vr * k
      if (q.y > sh + 20) {
        petals.splice(i, 1)
        continue
      }
      g.save()
      g.translate(q.x, q.y)
      g.rotate(q.r)
      g.scale(1, 0.55 + 0.45 * Math.sin(q.w * 1.7))
      g.globalAlpha = 0.9
      g.fillStyle = q.c
      g.beginPath()
      g.ellipse(0, 0, q.s, q.s * 0.6, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    if (fxState.cel > 0.05 && confetti.length < 70 && Math.random() < fxState.cel * 0.45 * k) {
      confetti.push({
        x: Math.random() * sw,
        y: -12,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.9 + Math.random() * 1.1,
        r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.2,
        w: 4 + Math.random() * 3,
        h: 7 + Math.random() * 5,
        f: Math.random() * 6.28,
        c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      })
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const q = confetti[i]
      q.f += 0.12 * k
      q.x += (q.vx + Math.sin(q.f) * 0.5) * k
      q.y += q.vy * k
      q.r += q.vr * k
      if (q.y > sh + 16) {
        confetti.splice(i, 1)
        continue
      }
      g.save()
      g.translate(q.x, q.y)
      g.rotate(q.r)
      g.scale(1, Math.cos(q.f)) // flutter: the strip turns edge-on and back
      g.globalAlpha = 0.95
      g.fillStyle = q.c
      g.fillRect(-q.w / 2, -q.h / 2, q.w, q.h)
      g.restore()
    }
    if (fxState.flies > 0.01) {
      const t = now / 1000
      g.globalCompositeOperation = 'lighter'
      for (const f of flies) {
        const x = (f.x + Math.sin(t * 0.21 * f.sp + f.ph) * 0.06) * sw
        const y = (f.y + Math.cos(t * 0.17 * f.sp + f.ph * 1.3) * 0.04) * sh
        g.globalAlpha = fxState.flies * (0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 * f.sp + f.ph)))
        g.drawImage(FLY, x - 9, y - 9, 18, 18)
      }
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    }
  }

  // ---------- party lights in the garden (seen through the arches) ----------
  // Two swags of warm bulbs strung between the trees, round paper lanterns
  // hanging from the upper one, and soft bokeh of more lights deeper in the
  // garden. Laid out on the inside painting's sky rows (y0..y1 on screen, so
  // they ride the camera); drawn behind its sky-less copy, so the pillars and
  // the hedge stay in front.
  const bokeh = Array.from({ length: 22 }, () => ({ x: Math.random(), y: 0.66 + Math.random() * 0.2, r: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.28 }))
  function drawGardenLights(now, y0, y1, dx, a) {
    if (a <= 0) return
    const t = reduce ? 0 : now / 1000
    const h = y1 - y0
    const u = Math.min(sw, sh)
    const swags = [
      { y: 0.42, sag: 0.08, span: 0.36, off: 0.1 },
      { y: 0.6, sag: 0.05, span: 0.27, off: 0.62 },
    ]
    g.lineCap = 'round'
    swags.forEach((sw8, k) => {
      const span = Math.max(120, sw * sw8.span)
      const yb = y0 + h * sw8.y
      const sag = h * sw8.sag
      const start = -span * sw8.off + dx
      // the cord: a run of shallow arcs from post to post
      g.globalAlpha = a * 0.55
      g.strokeStyle = 'rgba(52, 30, 36, 0.9)'
      g.lineWidth = 1.2
      g.beginPath()
      for (let x0 = start; x0 < sw + span; x0 += span) {
        g.moveTo(x0, yb)
        g.quadraticCurveTo(x0 + span / 2, yb + sag * 2, x0 + span, yb)
      }
      g.stroke()
      // bulbs along it
      const step = Math.max(14, u * 0.045)
      let n = 0
      for (let x0 = start; x0 < sw + span; x0 += span) {
        for (let s8 = step / 2; s8 < span; s8 += step) {
          const p = s8 / span
          const x = x0 + s8
          if (x < -10 || x > sw + 10) continue
          const y = yb + sag * 4 * p * (1 - p) + 3
          const tw = 0.7 + 0.3 * Math.sin(t * 2.2 + n * 1.7 + k)
          glowAt(GLOW, x, y, u * 0.028, u * 0.028, a * 0.75 * tw, true)
          g.globalAlpha = a
          g.fillStyle = '#fff1c8'
          g.beginPath()
          g.arc(x, y, Math.max(1.6, u * 0.0045), 0, Math.PI * 2)
          g.fill()
          n++
        }
      }
      // paper lanterns hang from the upper swag, one or two per run
      if (k === 0) {
        let m = 0
        for (let x0 = start; x0 < sw + span; x0 += span, m++) {
          for (const p of [0.32, 0.7]) {
            if ((m + (p > 0.5 ? 1 : 0)) % 2) continue
            const x = x0 + span * p
            if (x < -30 || x > sw + 30) continue
            const top = yb + sag * 4 * p * (1 - p)
            const r = Math.max(9, u * 0.028)
            const [body, glow] = LANTERN_COLORS[(m + (p > 0.5 ? 1 : 0)) % LANTERN_COLORS.length]
            const sway = reduce ? 0 : Math.sin(t * 0.9 + m * 2.1 + p * 5) * 0.08
            g.save()
            g.translate(x, top)
            g.rotate(sway)
            g.globalAlpha = a * 0.6
            g.strokeStyle = 'rgba(52, 30, 36, 0.9)'
            g.lineWidth = 1
            g.beginPath()
            g.moveTo(0, 0)
            g.lineTo(0, r * 0.9)
            g.stroke()
            const cy = r * 0.9 + r
            g.globalCompositeOperation = 'lighter'
            g.globalAlpha = a
            const halo = g.createRadialGradient(0, cy, 0, 0, cy, r * 2.6)
            halo.addColorStop(0, glow)
            halo.addColorStop(1, 'rgba(255, 180, 150, 0)')
            g.fillStyle = halo
            g.fillRect(-r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2)
            g.globalCompositeOperation = 'source-over'
            const lit = g.createRadialGradient(-r * 0.25, cy - r * 0.3, r * 0.1, 0, cy, r * 1.05)
            lit.addColorStop(0, '#fffaf0')
            lit.addColorStop(0.45, body)
            lit.addColorStop(1, 'rgba(160, 80, 90, 0.95)')
            g.fillStyle = lit
            g.beginPath()
            g.ellipse(0, cy, r, r * 0.92, 0, 0, Math.PI * 2)
            g.fill()
            // ribs and caps, so it reads as paper
            g.globalAlpha = a * 0.35
            g.strokeStyle = 'rgba(120, 50, 60, 0.9)'
            g.lineWidth = 0.8
            for (const e of [0.45, 0.85]) {
              g.beginPath()
              g.ellipse(0, cy, r * e, r * 0.92, 0, 0, Math.PI * 2)
              g.stroke()
            }
            g.globalAlpha = a
            g.fillStyle = '#5a3438'
            g.fillRect(-r * 0.32, cy - r * 0.98, r * 0.64, r * 0.14)
            g.fillRect(-r * 0.32, cy + r * 0.84, r * 0.64, r * 0.14)
            g.restore()
          }
        }
      }
    })
    // more lights deeper in the garden, out of focus
    for (const b of bokeh) {
      const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + b.ph)
      glowAt(GLOW, dx + b.x * sw, y0 + h * b.y, u * 0.035 * b.r, u * 0.035 * b.r, a * 0.6 * tw, true)
    }
    g.globalAlpha = 1
    g.lineCap = 'butt'
  }

  // ---------- fireworks (inside the gazebo, seen through the arches) ----------
  // Rings and hearts in party colours; when the couple's names come up, a pair
  // of big hearts goes off either side of the photo.
  const confetti = []
  const bursts = []
  let nextBurst = 0
  let lastBurstT = 0
  let grandDone = false
  const polaroidEl = closingEl && closingEl.querySelector('[data-tb-snap]')
  // a spot in the sky beside the photo, not behind it
  function besidePhoto(side) {
    const r = polaroidEl && polaroidEl.getBoundingClientRect()
    if (!r || !r.width) return sw * (side < 0 ? 0.22 : side > 0 ? 0.78 : 0.12 + Math.random() * 0.76)
    const left = side ? side < 0 : Math.random() < 0.5
    const room = left ? r.left : sw - r.right
    const inset = Math.min(room * 0.5, 20 + Math.random() * Math.max(10, room - 40))
    return left ? Math.max(sw * 0.06, r.left - inset) : Math.min(sw * 0.94, r.right + inset)
  }
  function addBurst(x, y, shape, k, rise) {
    bursts.push({ x, y, t: 0, rise, shape, k, c: FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0], sparks: null })
  }
  function drawFireworks(now, skyTop, skyBot) {
    const dt = Math.min(0.05, (now - lastBurstT) / 1000 || 0.016)
    lastBurstT = now
    if (reduce || lite) return
    const cel = fxState.cel
    const u = Math.min(sw, sh)
    const roomy = skyBot - skyTop > 40
    if (cel < 0.3) grandDone = false
    if (roomy && !grandDone && cel > 0.97) {
      grandDone = true
      const y = skyTop + (skyBot - skyTop) * 0.3
      addBurst(besidePhoto(-1), y, 'heart', 1.3, 0.55)
      addBurst(besidePhoto(1), y, 'heart', 1.3, 0.65)
      nextBurst = now + 1500
    }
    if (roomy && cel > 0.3 && now > nextBurst && bursts.length < 5) {
      const y = skyTop + (skyBot - skyTop) * (0.12 + Math.random() * 0.45)
      addBurst(besidePhoto(0), y, Math.random() < 0.3 ? 'heart' : 'ring', 0.85 + Math.random() * 0.35, 0.5 + Math.random() * 0.25)
      nextBurst = now + 550 + Math.random() * 800
    }
    g.globalCompositeOperation = 'lighter'
    g.lineCap = 'round'
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]
      b.t += dt
      if (b.t < b.rise) {
        // the rocket: a short, slowing streak up to the burst point
        const p = b.t / b.rise
        const y = b.y + (1 - p) * (1 - p) * sh * 0.22
        g.globalAlpha = 0.85 * cel
        g.strokeStyle = b.c[1]
        g.lineWidth = 1.6
        g.beginPath()
        g.moveTo(b.x, y)
        g.lineTo(b.x, y + 10 + 18 * (1 - p))
        g.stroke()
        continue
      }
      if (!b.sparks) {
        const N = b.shape === 'heart' ? 64 : 72
        const V = u * 0.46 * b.k
        b.sparks = Array.from({ length: N }, (_, j) => {
          const a = (j / N) * Math.PI * 2
          let vx
          let vy
          if (b.shape === 'heart') {
            // the classic heart curve, scaled to unit size
            vx = (16 * Math.sin(a) ** 3) / 17
            vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17
            const f = V * (0.97 + Math.random() * 0.06)
            vx *= f
            vy *= f
          } else {
            const f = V * (0.55 + Math.random() * 0.45)
            vx = Math.cos(a + Math.random() * 0.1) * f
            vy = Math.sin(a + Math.random() * 0.1) * f
          }
          return { x: 0, y: 0, vx, vy, hi: j % 3 === 0 }
        })
      }
      const age = b.t - b.rise
      const life = b.shape === 'heart' ? 2 : 1.8
      if (age > life) {
        bursts.splice(i, 1)
        continue
      }
      const fade = 1 - age / life
      if (age < 0.35) glowAt(GLOW, b.x, b.y, u * 0.2 * b.k, u * 0.2 * b.k, cel * (1 - age / 0.35), true)
      g.globalCompositeOperation = 'lighter' // glowAt leaves source-over behind
      const drag = Math.pow(0.35, dt)
      // hearts barely fall, so they keep their shape
      const grav = u * (b.shape === 'heart' ? 0.03 : 0.12) * dt
      const glitter = age > life * 0.55
      for (const sp of b.sparks) {
        sp.vx *= drag
        sp.vy = sp.vy * drag + grav
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        // a short streak along its motion; at the end the sparks glitter out
        g.globalAlpha = cel * fade * (glitter ? Math.random() : 0.8 + 0.2 * Math.random())
        g.strokeStyle = age < 0.12 ? '#fffaf0' : sp.hi ? b.c[1] : b.c[0]
        g.lineWidth = (1.4 + fade * 2) * Math.min(1.4, b.k)
        g.beginPath()
        g.moveTo(b.x + sp.x - sp.vx * 0.05, b.y + sp.y - sp.vy * 0.05)
        g.lineTo(b.x + sp.x, b.y + sp.y)
        g.stroke()
      }
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.lineCap = 'butt'
  }

  // ---------- rising wish lanterns (act 2) ----------
  const skyLanterns = []
  function addSkyLantern(label, special) {
    const size = special ? 54 : 22 + Math.random() * 22
    skyLanterns.push({
      label,
      x: special ? 0.5 : Math.random(),
      y: special ? 1.08 : Math.random() * 1.1,
      v: (special ? 0.035 : 0.012 + Math.random() * 0.016) * (size / 40),
      ph: Math.random() * 6.28,
      size,
      special,
    })
  }
  for (let i = 0; i < clamp(wishCount, 6, 12); i++) addSkyLantern('', false)
  let lastSky = 0
  function drawSkyLanterns(now, fade = 1) {
    const dt = Math.min(0.1, (now - lastSky) / 1000)
    lastSky = now
    if (fxState.wish * fade <= 0 || !(skyLanternImg.complete && skyLanternImg.naturalWidth)) return
    const t = now / 1000
    const ar = skyLanternImg.naturalHeight / skyLanternImg.naturalWidth
    for (let i = skyLanterns.length - 1; i >= 0; i--) {
      const l = skyLanterns[i]
      if (!reduce) l.y -= l.v * dt
      if (l.y < -0.15) {
        if (l.special) {
          skyLanterns.splice(i, 1)
          continue
        }
        l.y = 1.1
        l.x = Math.random()
      }
      const x = (l.x + Math.sin(t * 0.3 + l.ph) * 0.02) * sw
      const y = l.y * sh
      g.save()
      g.translate(x, y)
      g.rotate(Math.sin(t * 0.8 + l.ph) * 0.07)
      g.globalAlpha = fxState.wish * fade
      g.globalCompositeOperation = 'lighter'
      g.drawImage(skyLanternImg, -l.size / 2, 0, l.size, l.size * ar)
      g.globalCompositeOperation = 'source-over'
      if (l.label) {
        g.font = '500 10px Montserrat, "Avenir Next", sans-serif'
        g.textAlign = 'center'
        g.fillStyle = '#fff4e8'
        g.fillText(l.label, 0, l.size * ar + 14)
      }
      g.restore()
    }
    g.globalAlpha = 1
  }

  // ---------- DOM copy ----------
  let galleryOn = false
  function renderCopy(T, J, now) {
    for (const { el, t } of panels) {
      const inn = seg(T, t[0], t[1])
      const out = seg(T, t[2], t[3])
      const o = inn * (1 - out)
      show(el, o)
      if (o > 0.001) el.style.transform = `translateY(${(1 - inn) * 22 - out * 22}px)`
    }
    const base = wide ? '-50%' : '0px'
    const dim = Math.round((1 - 0.3 * J.night) * 50) / 50
    for (const cd of cards) {
      const [a, b, x0, x1] = cd.t
      const inn = ease(seg(T, a, b))
      const out = ease(seg(T, x0, x1))
      const o = clamp(inn * 1.6, 0, 1) * clamp((1 - out) * 1.6, 0, 1)
      show(cd.el, o)
      if (o > 0.001) {
        cd.el.style.transform = `translateY(calc(${base} + ${((1 - inn) - out) * 0.72 * sh}px)) rotate(${(1 - inn) * 2.5 - out * 1.5}deg)`
        if (cd.photo) cd.photo.style.transform = `translateY(${lerp(6, -6, seg(T, a, Math.min(x1, b + 0.12)))}%)`
        if (cd.portrait && cd.dim !== dim) {
          cd.portrait.style.filter = dim < 1 ? `brightness(${dim})` : ''
          cd.dim = dim
        }
      }
    }
    let gOn = false
    if (gallery.el && gallery.t && gallery.easel) {
      const [ga, gb, gx0, gx1] = gallery.t
      const gin = ease(seg(T, ga, gb))
      const gout = ease(seg(T, gx0, gx1))
      show(gallery.el, seg(gin, 0, 0.25) * (1 - seg(gout, 0.6, 1)))
      gOn = gin > 0 && gout < 1
      if (gOn) {
        if (gallery.caption) gallery.caption.style.opacity = String(gin * (1 - gout))
        // The easel stands beside the path: far and off to the right as we come
        // up to it, then in front of us; afterwards we walk past it (it slides
        // out past our right shoulder). z = its distance, 1 = in front of us.
        const z = gout > 0 ? lerp(1, 0.55, gout) : lerp(2.8, 1, gin)
        const s = easelSc / z
        const { ew, eh } = gallery
        const horizon = ch * 0.5
        const ground = horizon + (ch * 0.84 - horizon) / z // where its legs meet the flowers
        const x = cw / 2 + (gout > 0 ? cw * 1.2 * gout : (cw * 0.55 * (z - 1)) / 1.8)
        gallery.easel.style.transform = `translate(${x - (ew / 2) * s}px, ${ground - eh * s}px) scale(${s})`
        if (gallery.dim !== dim) {
          gallery.easel.style.filter = dim < 1 ? `brightness(${dim})` : ''
          gallery.dim = dim
        }
        // Each print turns over its own stretch of scroll, like paper: its
        // bottom edge lifts first and the rest follows, so it curls up and
        // over the rings, then falls behind the pad. Strip i (from the rings
        // down) starts later the nearer it is to the rings; all end flat at 300°.
        const n = gallery.pages.length
        const turned = seg(T, gb, 0.965) * Math.max(0, n - 1)
        for (let i = 0; i < n; i++) {
          const pg = gallery.pages[i]
          const p = clamp(turned - i, 0, 1)
          if (pg.p === p) continue
          pg.p = p
          pg.el.style.visibility = p >= 1 ? 'hidden' : 'visible'
          // past the top it drops behind the pad: let it go before it would show through
          pg.el.style.opacity = String(1 - seg(p, 0.82, 0.97))
          const N = pg.strips.length
          let prev = 0
          pg.strips.forEach((st, k) => {
            const lag = 0.3 * (1 - (k + 1) / N)
            const ang = 300 * ease(clamp((p - lag) / (1 - lag), 0, 1))
            st.el.style.transform = `rotateX(${(ang - prev).toFixed(2)}deg)`
            prev = ang
            // light from in front: a strip darkens as it tips away from us
            const c = Math.cos((ang * Math.PI) / 180)
            if (st.shade) st.shade.style.opacity = (0.34 * (1 - Math.max(0, c))).toFixed(3)
            if (st.backShade) st.backShade.style.opacity = (0.3 * (1 - Math.max(0, -c))).toFixed(3)
          })
        }
        // the print under the one being lifted lies in its shadow
        for (let i = 1; i < n; i++) {
          const lift = clamp(turned - (i - 1), 0, 1)
          const sh = 0.26 * Math.sin(Math.min(1, lift * 1.6) * Math.PI)
          const top = gallery.pages[i].strips
          if (top.length && top[0].shade && gallery.pages[i].p <= 0) {
            for (const st of top) if (st.shade) st.shade.style.opacity = sh.toFixed(3)
          }
        }
      }
    }
    if (hint) hint.style.opacity = String(1 - seg(T, 0, 0.02))
    return gOn
  }

  // ---------- scroll + pointer + frame loop ----------
  let target = 0
  let cur = 0
  let a2 = 0
  let qt = 0
  let q = 0
  let gt = 0
  let gcur = 0
  function readScroll() {
    const top = track.getBoundingClientRect().top + window.scrollY
    const jr = track.offsetHeight - window.innerHeight
    const y = window.scrollY - top
    target = jr > 0 ? clamp(y / jr, 0, 1) : 0
    a2 = (y - jr) / window.innerHeight
    // the walk behind the cards ends where the gazebo track starts
    const gzTop = gazeboEl ? gazeboEl.getBoundingClientRect().top + window.scrollY : 0
    const run = gazeboEl ? gzTop - top - jr : act2 ? act2.offsetHeight - window.innerHeight : 0
    qt = run > 0 ? clamp((y - jr) / run, 0, 1) : y > jr ? 1 : 0
    const gRun = gazeboEl ? gazeboEl.offsetHeight - window.innerHeight : 0
    gt = gRun > 0 ? clamp((window.scrollY - gzTop) / gRun, 0, 1) : 0
  }
  const onPointer = (e) => {
    tmx = (e.clientX / window.innerWidth) * 2 - 1
    tmy = (e.clientY / window.innerHeight) * 2 - 1
  }
  const onResize = () => {
    layout()
    readScroll()
    lastP = -1
  }
  if (finePointer && !reduce) window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', readScroll, { passive: true })

  let raf = 0
  let lastDraw = 0
  let lastP = -1
  let lastQ = -1
  let lastG = -1
  let lastFrame = 0
  let slow = 0
  function loop(now) {
    cur = reduce ? target : cur + (target - cur) * 0.09
    q = reduce ? qt : q + (qt - q) * 0.09
    gcur = reduce ? gt : gcur + (gt - gcur) * 0.09
    if (Math.abs(target - cur) < 0.00005) cur = target
    if (Math.abs(qt - q) < 0.00005) q = qt
    if (Math.abs(gt - gcur) < 0.00005) gcur = gt
    mx += (tmx - mx) * 0.05
    my += (tmy - my) * 0.05
    const T = toNominal(cur)
    const J = journey(T, a2, q, gcur)
    // inside the gazebo it turns into a party: petals, confetti, fireworks
    fxState.cel = seg(gcur, 0.78, 0.95)
    fxState.petals = Math.max(seg(T, 0.17, 0.21) * (1 - seg(T, 0.38, 0.42)), fxState.cel)
    fxState.flies = ease(seg(T, 0.72, 0.92))
    fxState.lamps = J.lamps
    fxState.wish = clamp(a2 * 1.4, 0, 1)

    const moved = cur !== lastP || q !== lastQ || gcur !== lastG
    const nextReveal = !opened ? 0 : reduce ? 1 : ease(clamp((now - openAt - 450) / 900, 0, 1))
    const revealing = nextReveal !== reveal
    reveal = nextReveal
    if (moved || galleryOn || revealing) galleryOn = renderCopy(T, J, now)

    // sustained jank while scrolling: step quality down once, then keep watching
    if (moved && lastFrame) {
      const dt = now - lastFrame
      slow = dt > 40 ? slow + 1 : Math.max(0, slow - 0.5)
      if (slow > 18) {
        slow = 0
        if (dpr > 1) {
          dprDrop += 0.25
          layout()
        } else if (!lite) {
          lite = true
          petals.length = 0
        }
      }
    }
    lastFrame = now

    const pointer = Math.abs(tmx - mx) > 0.002 || Math.abs(tmy - my) > 0.002
    const doors = opened && now - openAt < 1800
    const ambient =
      !reduce &&
      !lite &&
      (fxState.petals > 0.02 || petals.length > 0 || fxState.flies > 0.01 || fxState.lamps > 0 || fxState.paper > 0 || fxState.wish > 0 || fxState.cel > 0 || confetti.length > 0 || bursts.length > 0)
    // a lantern in flight gets every frame: at the ambient ~30 fps its climb looks stepped
    if (dirty || moved || pointer || doors || fxState.paper > 0 || (ambient && now - lastDraw > 32)) {
      drawScene(J, now)
      lastDraw = now
      dirty = false
    }
    if (gcur !== lastG && closingEl) {
      const o = seg(gcur, 0.8, 0.94)
      closingEl.style.opacity = String(o)
      closingEl.style.transform = `translateY(${(1 - o) * 24}px)`
      closingEl.style.visibility = o > 0.01 ? 'visible' : 'hidden'
      // the snapshot drops in (CSS transition) once the closing is mostly there
      closingEl.toggleAttribute('data-in', o > 0.5)
    }
    lastP = cur
    lastQ = q
    lastG = gcur
    raf = requestAnimationFrame(loop)
  }

  scanCopy()
  layout()
  readScroll()
  cur = target
  q = qt
  raf = requestAnimationFrame(loop)

  return {
    /** The cover was opened: swing the doors, then reveal the journey copy. */
    open() {
      opened = true
      openAt = performance.now()
      dirty = true
    },
    /** React re-rendered the copy (e.g. a wish was added): re-read the elements. */
    rescan() {
      scanCopy()
      layout()
    },
    /** The palette changed: re-colour the night (palette.night). */
    setNight(night) {
      if (!night || night === NC) return
      NC = night
      NIGHT.clear()
      if (art) skyGrad()
      screenGrad()
      dirty = true
    },
    /** A guest just sent a wish: release a named lantern. */
    launchLantern(label) {
      addSkyLantern(String(label || '').slice(0, 40), true)
    },
    destroy() {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', readScroll)
    },
  }
}
