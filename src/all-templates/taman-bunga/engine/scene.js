/* ============================================================
   taman-bunga/engine/scene.js — the scroll-driven garden walk.

   One <canvas> paints the whole scene (sky, hills, garden, lanterns, gate,
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
const FIREWORK_COLORS = [['#ffd98a', '#fff3d6'], ['#ffa8c2', '#ffe0ea'], ['#cdb2ff', '#f1e8ff'], ['#ffd98a', '#ffa8c2']]

/**
 * @param {HTMLElement} root   the Shell's root element
 * @param {object} opts
 * @param {(p:number)=>number} opts.toNominal  scroll progress → nominal timeline
 * @param {number[]} opts.lanternDepths
 * @param {number} opts.wishCount   wishes already on the wall (seeds the sky lanterns)
 */
export function mountScene(root, { toNominal, lanternDepths, wishCount = 0 }) {
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
      x.fillStyle = '#6f5d9c'
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
  // ...and the same with its night sky cut out (navy pixels within int.sky
  // rows): wish lanterns and fireworks are drawn between the two, so they only
  // show through the arches. Reading pixels needs a same-origin image; if that
  // fails (e.g. a CDN without CORS) this returns null and the sky effects are
  // simply drawn on top, faded out once inside.
  const FORE = new Map()
  const foreOf = (i, band) => {
    const warm = warmOf(i)
    if (!warm || !band) return null
    if (!FORE.has(i)) {
      let c = null
      try {
        const raw = document.createElement('canvas')
        raw.width = warm.width
        raw.height = warm.height
        const rx = raw.getContext('2d', { willReadFrequently: true })
        rx.drawImage(i, 0, 0)
        const src = rx.getImageData(0, 0, raw.width, raw.height).data
        c = document.createElement('canvas')
        c.width = warm.width
        c.height = warm.height
        const x = c.getContext('2d')
        x.drawImage(warm, 0, 0)
        const out = x.getImageData(0, 0, c.width, c.height)
        const d = out.data
        for (let y = Math.max(0, band.y0); y < Math.min(c.height, band.y1); y++) {
          for (let px = 0; px < c.width; px++) {
            const o = (y * c.width + px) * 4
            const r = src[o]
            const gg = src[o + 1]
            const b = src[o + 2]
            if (b > r + 18 && b >= gg && b < 150) d[o + 3] = 0
          }
        }
        x.putImageData(out, 0, 0)
      } catch {
        c = null
      }
      FORE.set(i, c)
    }
    return FORE.get(i)
  }
  const hillsImg = img(SCENE.hills)
  const moonImg = img(SCENE.moon)
  const lanternImg = img(SCENE.lantern)
  const doorL = img(SCENE.doorL)
  const doorR = img(SCENE.doorR)
  const skyLanternImg = img(SCENE.skyLantern)

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
    ;[a.sky.src, a.garden, a.gate.src, a.front.src, a.inner?.src, a.inner?.hills.src, a.gazebo?.ext.src, a.gazebo?.int.src, a.gazebo?.patch.src].filter(Boolean).forEach(img)
    starsCv = makeStars(a.stars.w, a.stars.h)
    nightGrad = g.createLinearGradient(0, a.skyNight.t, 0, a.skyNight.t + a.skyNight.h)
    nightGrad.addColorStop(0, '#0f0d2c')
    nightGrad.addColorStop(0.45, '#231a4a')
    nightGrad.addColorStop(0.75, 'rgba(70, 40, 90, 0.85)')
    nightGrad.addColorStop(1, 'rgba(120, 60, 90, 0)')
    dirty = true
  }

  // gallery geometry
  const gallery = {
    el: $('[data-tb-gallery]'),
    garland: $('[data-tb-garland]'),
    items: [...root.querySelectorAll('[data-tb-polaroid]')].map((el, i) => ({ el, i })),
  }
  let gw = 0
  let gx = 0
  let gTop = 0
  let pw = 0
  let cw = 0
  let ch = 0
  // centre line of the painted garland strand, in garland.webp pixels (1376×768)
  const curveY = (u) => (520 - 480 * Math.pow(2 * u - 1, 2)) * (gw / 1376) + gTop

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
    duskGrad = g.createLinearGradient(0, 0, 0, sh)
    duskGrad.addColorStop(0, '#120c2e')
    duskGrad.addColorStop(0.6, '#1d1233')
    duskGrad.addColorStop(1, '#140a1c')
    cw = copy.clientWidth
    ch = copy.clientHeight
    gw = Math.min(cw, 760, ch * 1.05)
    gx = (cw - gw) / 2
    gTop = -0.02 * ch
    pw = Math.round(Math.min(cw * 0.44, 230, ch * 0.26))
    if (gallery.garland) gallery.garland.style.width = `${gw}px`
    gallery.items.forEach((it) => (it.el.style.width = `${pw}px`))
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
    gallery.garland = $('[data-tb-garland]')
    gallery.items = [...root.querySelectorAll('[data-tb-polaroid]')].map((el, i) => ({ el, i }))
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
  const fxState = { petals: 0, flies: 0, lamps: 0, wish: 0, cel: 0 }
  const lanterns = lanternDepths.map((z, i) => ({ z, side: i % 2 === 0 ? -1 : 1 }))

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
          g.globalAlpha = base * a * J.night * 0.85
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
          glowAt(LAMP, lp.l + lp.w * 0.5, lp.t + lp.h * 0.5, lp.w / 2, lp.h / 2, J.lamps * fl * 0.7, true)
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
          glowAt(LAMP, lp.l + lp.w * 0.48, lp.t + lp.h * 0.56, lp.w / 2, lp.h / 2, J.lamps * fl * 0.85, true)
        }
      })
      g.globalAlpha = 1
    }

    // lanterns, far to near, standing on the verge of the painted path. A lantern at
    // depth z sits on the path row whose on-screen half width is K / z, so it follows
    // the path's bends and perspective and rides the same transform as the painting.
    if (J.show3d > 0) {
      // lanterns only start after the arch, so on the wide set they stand on the inner path
      const P = I ? I : A
      const ps = I ? is : gs
      const gx0 = P.vp.x + (I ? itx : tx) + px(20)
      const gy0 = P.vp.y + (I ? ity : ty) + py(20)
      for (let i = lanterns.length - 1; i >= 0; i--) {
        const ln = lanterns[i]
        const z = ln.z - J.c
        if (z <= 0.42 || z >= 4.9) continue // only the next few, so the far ones don't crowd the gazebo
        const row = pathRow(P.path, P.lantern.K / (z * ps))
        if (!row) continue
        const side = row.c + ln.side * (row.hw * 1.25 + 10)
        const x = gx0 + (side - P.vp.x) * ps
        const foot = gy0 + (row.y - P.vp.y) * ps
        const h = P.lantern.h * row.hw * ps
        const w = h * 0.3316
        const o = J.show3d * (1 - seg(z, 3.6, 4.9)) * seg(z, 0.42, 0.75)
        const glow = (0.25 + 0.75 * J.lit) * (0.35 + 0.65 * (1 - seg(z, 1.6, 3.6)))
        if (!lite) glowAt(GLOW, x, foot - h * 0.74, w * 1.5, w * 1.5, o * glow * 0.8, true)
        g.globalAlpha = o
        draw(lanternImg, x - w / 2, foot - h, w, h)
        g.globalAlpha = 1
      }
    }

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
    if (J.night > 0 && !(G && G.full)) {
      g.globalAlpha = 0.5 * J.night
      g.fillStyle = duskGrad
      g.fillRect(0, 0, sw, sh)
      g.globalAlpha = 1
    }
    // the interior is painted at night already, so it goes over the tint;
    // lanterns and fireworks go between it and its sky-less copy, so they only
    // show through the arches
    const inside = (fore) => {
      g.setTransform(dpr * S, 0, 0, dpr * S, dpr * OX, dpr * OY)
      const drawn = drawGazeboInside(A.gazebo, G, fore)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      return drawn
    }
    if (G) inside(false)
    const fore = !!G && !!foreOf(img(A.gazebo.int.src), A.gazebo.int.sky)
    drawSkyLanterns(now, G && !fore ? 1 - seg(J.g, 0.3, 0.6) : 1)
    if (G) {
      // the inside's sky rows, on screen: fireworks burst there
      const N = A.gazebo.int
      const y0 = OY + S * (G.int.y + G.int.s * N.sky.y0)
      const y1 = OY + S * (G.int.y + G.int.s * N.sky.y1)
      drawFireworks(now, Math.max(0, y0), Math.min(sh, y1))
      if (fore) inside(true)
    }
    drawFx(now)
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
      g.globalAlpha = G.o * J.night * 0.85
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

  // ---------- fireworks (inside the gazebo, seen through the arches) ----------
  const confetti = []
  const bursts = []
  let nextBurst = 0
  let lastBurstT = 0
  const polaroidEl = closingEl && closingEl.querySelector('[data-tb-snap]')
  function drawFireworks(now, skyTop, skyBot) {
    const dt = Math.min(0.05, (now - lastBurstT) / 1000 || 0.016)
    lastBurstT = now
    if (reduce || lite) return
    const cel = fxState.cel
    const u = Math.min(sw, sh)
    if (cel > 0.3 && now > nextBurst && bursts.length < 4 && skyBot - skyTop > 40) {
      // beside the polaroid, not behind it
      let x = sw * (0.12 + Math.random() * 0.76)
      const r = polaroidEl && polaroidEl.getBoundingClientRect()
      if (r && r.width && x > r.left - 20 && x < r.right + 20) {
        const left = Math.random() < 0.5
        x = left ? Math.max(sw * 0.06, r.left - 30 - Math.random() * Math.max(10, r.left - 50)) : Math.min(sw * 0.94, r.right + 30 + Math.random() * Math.max(10, sw - r.right - 50))
      }
      bursts.push({
        x,
        y: skyTop + (skyBot - skyTop) * (0.12 + Math.random() * 0.45),
        t: 0,
        rise: 0.5 + Math.random() * 0.25,
        c: FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0],
        sparks: null,
      })
      nextBurst = now + 650 + Math.random() * 900
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
        b.sparks = Array.from({ length: 56 }, (_, j) => {
          const a = (j / 56) * Math.PI * 2 + Math.random() * 0.12
          const v = (0.55 + Math.random() * 0.45) * u * 0.42
          return { x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, hi: j % 3 === 0 }
        })
      }
      const age = b.t - b.rise
      const life = 1.7
      if (age > life) {
        bursts.splice(i, 1)
        continue
      }
      const fade = 1 - age / life
      if (age < 0.35) glowAt(GLOW, b.x, b.y, u * 0.16, u * 0.16, cel * (1 - age / 0.35), true)
      const drag = Math.pow(0.35, dt)
      for (const sp of b.sparks) {
        sp.vx *= drag
        sp.vy = sp.vy * drag + u * 0.12 * dt
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        // a short streak along its motion, the way a spark reads at night
        g.globalAlpha = cel * fade * (0.75 + 0.25 * Math.random())
        g.strokeStyle = age < 0.12 ? '#fffaf0' : sp.hi ? b.c[1] : b.c[0]
        g.lineWidth = 1.2 + fade * 1.6
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
    if (gallery.el && gallery.t) {
      const [ga, gb, gx0, gx1] = gallery.t
      const gin = ease(seg(T, ga, gb))
      const gout = ease(seg(T, gx0, gx1))
      const go = gin * (1 - gout)
      show(gallery.el, go)
      gOn = go > 0.001
      if (gOn) {
        if (gallery.garland) gallery.garland.style.transform = `translate(-50%, ${-(1 - gin) * 60 - gout * 30}%)`
        const n = gallery.items.length
        const spacing = wide ? 0.34 : 0.48
        const gg = seg(T, gb, 0.965) * Math.max(0, n - 1)
        const tsec = now / 1000
        for (const it of gallery.items) {
          const u = 0.5 + (it.i - gg) * spacing
          const edge = clamp(Math.abs(u - 0.5) / 0.48, 0, 1)
          const x = gx + clamp(u, 0.03, 0.97) * gw
          const y = curveY(clamp(u, 0.03, 0.97)) + 38 - (1 - gin) * 80
          const sway = reduce ? 0 : Math.sin(tsec * 1.1 + it.i * 1.7) * 2.2
          it.el.style.transform = `translate(${x - pw / 2}px, ${y}px) rotate(${sway}deg) scale(${1 - 0.28 * edge})`
          it.el.style.opacity = clamp(1.25 - edge * 1.15, 0, 1)
          it.el.style.zIndex = String(100 - Math.round(edge * 50))
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
      (fxState.petals > 0.02 || petals.length > 0 || fxState.flies > 0.01 || fxState.lamps > 0 || fxState.wish > 0 || fxState.cel > 0 || confetti.length > 0 || bursts.length > 0)
    if (dirty || moved || pointer || doors || (ambient && now - lastDraw > 32)) {
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
