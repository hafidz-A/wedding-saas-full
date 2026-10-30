/* ============================================================
   musi/engine/scene.js — the scroll-driven journey, three.js.

   One WebGL canvas, one camera. Scroll is the only thing that moves the
   camera along its path (smoothed so it never snaps); ambient life (guests,
   boats, water, fireworks) runs on the clock.

     act 1 (the track, nominal T from config/timeline.js)
       T 0.000–0.105  the Rumah Limas courtyard, up the steps, into the door
       T 0.105        a white-gold flash — high over Sumatra
       T 0.105–0.200  South Sumatra lights up, the dive through the clouds
       T 0.200–1.000  the boat ride down the Musi: per segment the boat rides
                      in, the landmark pops up, the card shows, the boat drifts
     act 2 (RSVP, wishes, gift scroll normally): the camera lifts off the boat
                      in a long arc and turns to face the night city
     finale (the closing track): fireworks over Palembang

   The DOM copy is rendered by React; this module only fades it, found via
   data-mu-* attributes. If WebGL is unavailable the copy still works: the
   root gets data-mu-nogl and a plain painted background shows instead.

   Quality: high / medium / low, picked from the device and stepped down on
   its own when frames run slow (pixel ratio, shadows, crowd and city size).
   Client-only — imported from the Shell, which is loaded with ssr:false.
   ============================================================ */
import * as THREE from 'three'
import { CHAPTERS, FINALE_CHAPTER, riverAt } from '../config/timeline.js'
import { createMaterials } from './kit.js'
import { createSky } from './sky.js'
import { createLimas } from './limas.js'
import { createMap } from './map.js'
import { createCity, createRiver } from './city.js'
import { createFireworks } from './fireworks.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const bell = (x, c, w) => Math.exp(-(((x - c) / w) ** 2))
const parseT = (el) => (el.dataset.t || '0,0,0,0').split(',').map(Number)
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const QUALITIES = ['high', 'medium', 'low']

/** Where the camera holds for each stretch when motion is reduced. */
const STATIONS = [
  [0.03, 0.012],
  [0.045, 0.04],
  [0.056, 0.054],
  [0.072, 0.066],
  [0.08, 0.077],
  [0.088, 0.085],
  [0.096, 0.093],
  [0.105, 0.1],
  [0.2, 0.165],
  [0.38, 0.3],
  [0.56, 0.5],
  [0.65, 0.62],
  [0.78, 0.74],
  [1.01, 0.92],
]

function pickQuality() {
  try {
    const forced = new URLSearchParams(window.location.search).get('q')
    if (QUALITIES.includes(forced)) return forced
  } catch {
    /* ignore */
  }
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (cores <= 4 || mem <= 3) return 'low'
  if (!coarse && cores >= 8 && window.innerWidth >= 1024) return 'high'
  return 'medium'
}

/** A camera path through keyframes [T, position, look-at] (Catmull-Rom through both). */
function keyPath(keys) {
  const pos = new THREE.CatmullRomCurve3(keys.map((k) => k[1]))
  const look = new THREE.CatmullRomCurve3(keys.map((k) => k[2]))
  const n = keys.length - 1
  return (T, outPos, outLook) => {
    let i = 0
    while (i < n - 1 && T > keys[i + 1][0]) i++
    const k = clamp((T - keys[i][0]) / (keys[i + 1][0] - keys[i][0] || 1), 0, 1)
    const u = (i + k) / n
    pos.getPoint(u, outPos)
    look.getPoint(u, outLook)
  }
}

export function mountScene(root, { timeline, palette }) {
  const $ = (sel) => root.querySelector(sel)
  const canvas = $('[data-mu-canvas]')
  const track = $('[data-mu-track]')
  const act2El = $('[data-mu-act2]')
  const finaleEl = $('[data-mu-finale]')
  const closingEl = $('[data-mu-closing]')
  const flashEl = $('[data-mu-flash]')
  const fadeEl = $('[data-mu-fade]')
  const pinEl = $('[data-mu-pin]')
  const railFill = $('[data-mu-rail-fill]')
  const chapterEl = $('[data-mu-chapter]')
  const hintEl = $('[data-mu-hint]')
  let panels = []
  const collect = () => {
    panels = [...root.querySelectorAll('[data-mu-panel]')].map((el) => ({ el, t: parseT(el), o: -1 }))
  }
  collect()

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches
  let quality = pickQuality()
  root.dataset.muQ = quality

  // ---------- scroll ----------
  let pT = 0
  let p = 0
  let qT = 0
  let q = 0
  let gT = 0
  let g = 0
  let pageK = 0
  function readScroll() {
    const top = track.getBoundingClientRect().top + window.scrollY
    const jr = track.offsetHeight - window.innerHeight
    const y = window.scrollY - top
    pT = jr > 0 ? clamp(y / jr, 0, 1) : 0
    const fTop = finaleEl ? finaleEl.getBoundingClientRect().top + window.scrollY : top + jr
    const run = fTop - (top + jr) - window.innerHeight * 0.4
    qT = run > 0 ? clamp((y - jr) / run, 0, 1) : y > jr ? 1 : 0
    const gRun = finaleEl ? finaleEl.offsetHeight - window.innerHeight : 0
    gT = gRun > 0 ? clamp((window.scrollY - fTop) / gRun, 0, 1) : 0
    const docH = document.documentElement.scrollHeight - window.innerHeight
    pageK = docH > 0 ? clamp(window.scrollY / docH, 0, 1) : 0
  }
  let snapNext = false

  // ---------- DOM driver (runs with or without WebGL) ----------
  let pulse = 0 // reduced-motion cut / skip fade, decays to 0
  let override = 0 // a held full fade while jumping (skip / back to start)
  function driveDom(T, act, finaleK, mapView) {
    for (const panel of panels) {
      const [a, b, c, d] = panel.t
      let o = 0
      if (act <= 0.001) {
        if (T >= a && T < b) o = (T - a) / (b - a || 1)
        else if (T >= b && T <= c) o = 1
        else if (T > c && T < d) o = 1 - (T - c) / (d - c || 1)
      }
      if (Math.abs(o - panel.o) < 0.002) continue
      panel.o = o
      const s = panel.el.style
      s.opacity = o.toFixed(3)
      s.transform = reduce ? '' : `translate3d(0, ${((1 - o) * 16).toFixed(1)}px, 0)`
      s.visibility = o > 0.004 ? 'visible' : 'hidden'
      s.pointerEvents = o > 0.6 ? 'auto' : 'none'
    }
    if (flashEl) {
      const f = T < 0.105 ? smooth(0.0995, 0.105, T) : 1 - smooth(0.105, 0.124, T)
      flashEl.style.opacity = (act > 0 ? 0 : f).toFixed(3)
    }
    if (fadeEl) {
      const f = T < 0.2 ? smooth(0.188, 0.2, T) : 1 - smooth(0.2, 0.216, T)
      fadeEl.style.opacity = Math.max(act > 0 ? 0 : f, pulse, override).toFixed(3)
    }
    if (closingEl) {
      const o = smooth(0.12, 0.38, finaleK)
      closingEl.style.opacity = o.toFixed(3)
      closingEl.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
      closingEl.style.visibility = o > 0.004 ? 'visible' : 'hidden'
    }
    if (railFill) railFill.style.transform = `scaleY(${pageK.toFixed(4)})`
    if (chapterEl) {
      let label = CHAPTERS[0].label
      for (const c of CHAPTERS) if (T >= c.from) label = c.label
      if (act > 0.02) label = FINALE_CHAPTER
      if (chapterEl.textContent !== label) chapterEl.textContent = label
    }
    if (hintEl && T > 0.012) hintEl.hidden = true
    if (pinEl && !mapView) pinEl.style.opacity = '0'
  }

  // ---------- WebGL ----------
  let renderer = null
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' })
    if (!renderer.getContext()) throw new Error('no context')
  } catch {
    renderer = null
  }

  let raf = 0
  let running = true
  const cleanups = []
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }

  if (!renderer) {
    root.dataset.muNogl = '1'
    readScroll()
    const loopDom = () => {
      readScroll()
      const T = timeline.toNominal(pT)
      driveDom(T, qT + gT, gT, false)
      raf = requestAnimationFrame(loopDom)
    }
    raf = requestAnimationFrame(loopDom)
    return {
      open() {},
      setPalette() {},
      launchFirework() {},
      scrollToNominal(T, smoothScroll) {
        const top = track.getBoundingClientRect().top + window.scrollY
        const jr = track.offsetHeight - window.innerHeight
        window.scrollTo({ top: top + timeline.toProgress(T) * jr, behavior: smoothScroll ? 'smooth' : 'auto' })
      },
      skipToEnd() {
        window.scrollTo({ top: document.documentElement.scrollHeight })
      },
      backToStart() {
        window.scrollTo({ top: 0 })
      },
      refresh: collect,
      destroy() {
        cancelAnimationFrame(raf)
      },
    }
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog('#e4eef0', 60, 260)
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 3200)
  scene.add(camera)

  const hemi = new THREE.HemisphereLight('#cfe6f0', '#6b5a3a', 1.1)
  const sun = new THREE.DirectionalLight('#fff0d4', 2.6)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -34
  sun.shadow.camera.right = sun.shadow.camera.top = 34
  sun.shadow.camera.near = 10
  sun.shadow.camera.far = 220
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.02
  scene.add(hemi, sun, sun.target)

  const mats = createMaterials(palette)
  const time = { value: 0 }
  const ripple = (mat, amp, freq, key) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time
      sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 rw = modelMatrix * vec4(transformed, 1.0);
        transformed.y += (sin(rw.x * ${freq.toFixed(3)} + uTime * 1.3) * cos(rw.z * ${(freq * 1.37).toFixed(3)} + uTime * 0.9)
          + 0.5 * sin((rw.x + rw.z) * ${(freq * 2.3).toFixed(3)} - uTime * 1.7)) * ${amp.toFixed(3)};`,
      )
    }
    mat.customProgramCacheKey = () => key
  }
  ripple(mats.get('water'), 0.16, 0.16, 'musi-water')
  ripple(mats.get('sea'), 0.12, 0.09, 'musi-sea')

  const sky = createSky(quality)
  const limas = createLimas(mats, quality)
  const map = createMap(mats, quality)
  const river = createRiver()
  const city = createCity(mats, quality, river)
  const fw = createFireworks(quality, 0.15)
  fw.setPalette(palette.scene.trim)
  scene.add(sky.group, limas.group, map.group, city.group, fw.group, limas.doorLight, limas.hallLight)

  // ---------- quality ----------
  function applyQuality(qq) {
    quality = qq
    root.dataset.muQ = qq
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qq === 'high' ? 1.5 : qq === 'medium' ? 1.25 : 1))
    sun.castShadow = qq !== 'low'
    sun.shadow.mapSize.set(qq === 'high' ? 2048 : 1024, qq === 'high' ? 2048 : 1024)
    if (sun.shadow.map) {
      sun.shadow.map.dispose()
      sun.shadow.map = null
    }
    limas.setQuality(qq)
    city.setQuality(qq)
  }
  applyQuality(quality)

  // ---------- camera paths ----------
  // the house tour: across the yard, up the right-hand stair onto the garang,
  // in through the folded-up lawang kipas, up the kekijing to the gegajah,
  // a glance left into a pangkeng and right down to the dapur, then the
  // pelaminan (eye height = floor + 1.6, see HOUSE in limas.js)
  const limasPath = keyPath([
    [0, V(0, 3.3, 34), V(0, 4.8, 0)],
    [0.03, V(3.4, 3.0, 22), V(4.5, 3.4, 6)],
    [0.037, V(6.3, 2.0, 14.6), V(6.3, 3.0, 9.5)],
    [0.044, V(6.3, 3.6, 9.0), V(2, 4.0, 6)],
    [0.05, V(2.4, 3.6, 8.6), V(0, 4.2, 5)],
    [0.056, V(0.3, 3.65, 7.6), V(0, 4.2, 0)],
    [0.064, V(0, 4.0, 3.6), V(0, 4.5, -6)],
    [0.068, V(0, 4.35, 0.2), V(0, 4.8, -8)],
    [0.072, V(0, 4.7, -3.2), V(0, 4.95, -9)],
    [0.078, V(0, 5.05, -5.8), V(0, 4.9, -11)],
    [0.084, V(-0.6, 5.05, -6.6), V(-5, 4.6, -7.6)],
    [0.092, V(1.8, 5.05, -7.6), V(7.9, 3.6, -15.4)],
    [0.099, V(0.2, 5.0, -7.4), V(0, 4.75, -11.8)],
    [0.106, V(0, 4.9, -8.3), V(0, 4.75, -12)],
  ])
  const mapPath = keyPath([
    [0.105, V(-26, 128, 74), V(-14, 0, -12)],
    [0.13, V(-8, 88, 50), V(-3, 0, -2)],
    [0.16, V(0, 58, 35), V(0, 0, 0)],
    [0.185, V(0.5, 30, 15), V(0, 0, 0)],
    [0.2, V(0.3, 7, 2.6), V(0, 0, -1)],
  ])
  const attention = [
    { key: 'ampera', c: 0.05, w: 0.03, k: 0.5 },
    { key: 'kutoBesak', c: 0.285, w: 0.03, k: 0.55 },
    { key: 'masjidAgung', c: 0.432, w: 0.025, k: 0.55 },
    { key: 'limasRow', c: 0.612, w: 0.03, k: 0.5 },
    { key: 'rafts', c: 0.655, w: 0.02, k: 0.45 },
    { key: 'lrt', c: 0.79, w: 0.022, k: 0.38 },
    { key: 'pempek', c: 0.8, w: 0.02, k: 0.4 },
    { key: 'kampung', c: 0.822, w: 0.02, k: 0.45 },
  ]
  const P = V(0, 0, 0)
  const Tg = V(0, 0, 0)
  const N = V(0, 0, 0)
  const tmp = V(0, 0, 0)
  function riverPose(T, outPos, outLook, now) {
    const u = riverAt(T)
    river.point(u, P)
    river.tangent(u, Tg)
    outPos.copy(P).addScaledVector(Tg, -1.6).setY(2.9)
    // forward, then glance at whichever landmark is framed: a weighted
    // average of the way ahead and the landmarks (at most 70% landmark)
    river.point(u + 0.035, tmp).setY(2.6)
    let total = 0
    for (const a of attention) total += bell(u, a.c, a.w) * a.k
    const scale = total > 0.7 ? 0.7 / total : 1
    outLook.copy(tmp).multiplyScalar(1 - total * scale)
    for (const a of attention) {
      const w = bell(u, a.c, a.w) * a.k * scale
      if (w > 0.0005) outLook.addScaledVector(city.focus[a.key], w)
    }
    // the boat itself
    city.boat.position.copy(P).setY(0.25 + (reduce ? 0 : Math.sin(now * 1.4) * 0.05))
    city.boat.rotation.set(0, Math.atan2(Tg.x, Tg.z), reduce ? 0 : Math.sin(now * 0.9) * 0.02)
    return u
  }
  // act 2: the long arc up from the boat to the view over the city
  const endPos = V(0, 0, 0)
  const endLook = V(0, 0, 0)
  riverPose(1, endPos, endLook, 0)
  const highPos = river.point(0.62, V(0, 0, 0)).addScaledVector(river.normal(0.62, N), 150).setY(84)
  const midPos = river.point(0.78, V(0, 0, 0)).addScaledVector(river.normal(0.78, N), 40).setY(58)
  // level enough that the fireworks fill the sky above the lit city
  const highLook = river.point(0.32, V(0, 0, 0)).setY(46)
  function risePose(k, outPos, outLook) {
    const e = smooth(0, 1, k)
    const a = 1 - e
    outPos.set(0, 0, 0).addScaledVector(endPos, a * a).addScaledVector(midPos, 2 * a * e).addScaledVector(highPos, e * e)
    outLook.copy(endLook).lerp(highLook, smooth(0.05, 0.75, k))
  }

  // ---------- time of day ----------
  const sunDay = V(0.45, 0.8, 0.4).normalize()
  const sunLow = V(-0.85, 0.22, -0.48).normalize()
  const moonDir = V(-0.42, 0.5, -0.76).normalize()
  const sunDir = V(0, 0, 0)
  const hemiSkyDay = new THREE.Color('#cfe6f0')
  const hemiSkyNight = new THREE.Color('#3a4a8a')
  const hemiGroundDay = new THREE.Color('#6b5a3a')
  const hemiGroundNight = new THREE.Color('#1a1626')
  const sunWarm = new THREE.Color('#ffb06a')
  const sunDayC = new THREE.Color('#fff0d4')
  const moonC = new THREE.Color('#9fb4ff')
  const horizon = new THREE.Color()
  function setDay({ golden, dusk, night }) {
    sunDir.copy(sunDay).lerp(sunLow, clamp(golden * 0.6 + dusk, 0, 1)).normalize()
    sky.setTime({ golden, dusk, night }, night > 0.5 ? moonDir : sunDir)
    if (night > 0.5) sunDir.copy(moonDir)
    sun.color.copy(sunDayC).lerp(sunWarm, clamp(golden + dusk, 0, 1)).lerp(moonC, night)
    sun.intensity = lerp(lerp(2.6, 1.6, clamp(golden * 0.5 + dusk, 0, 1)), 0.45, night)
    hemi.color.copy(hemiSkyDay).lerp(hemiSkyNight, night)
    hemi.groundColor.copy(hemiGroundDay).lerp(hemiGroundNight, night)
    hemi.intensity = lerp(lerp(1.15, 0.8, dusk), 0.55, night)
    sky.horizon(horizon)
    scene.fog.color.copy(horizon)
    mats.setNight(night)
    renderer.toneMappingExposure = lerp(1.0, 1.15, night)
  }

  // ---------- resize ----------
  let viewH = 1
  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    viewH = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = camera.aspect < 0.8 ? 62 : 52
    camera.updateProjectionMatrix()
  }
  resize()
  on(window, 'resize', () => {
    resize()
    readScroll()
  })
  on(window, 'scroll', readScroll, { passive: true })
  // older browsers without overflow:clip: never let the fixed frame scroll
  const frameEl = root.querySelector('.mu-frame')
  if (frameEl) on(frameEl, 'scroll', () => {
    frameEl.scrollTop = 0
    frameEl.scrollLeft = 0
  })
  let mx = 0
  let my = 0
  let tmx = 0
  let tmy = 0
  if (finePointer && !reduce) {
    on(window, 'pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1
      tmy = (e.clientY / window.innerHeight) * 2 - 1
    }, { passive: true })
  }
  on(canvas, 'webglcontextlost', (e) => {
    e.preventDefault()
    running = false
    cancelAnimationFrame(raf)
    root.dataset.muNogl = '1'
  })

  // ---------- fireworks schedule ----------
  const burstSpot = () => {
    const u = 0.3 + Math.random() * 0.26
    const side = Math.random() < 0.5 ? -1 : 1
    const at = river.at(u, side, Math.random() * 70, 0, tmp)
    return { x: at.x, y: 58 + Math.random() * 60, z: at.z }
  }
  let nextAuto = 0
  let heartsDone = false
  let frozenDone = false

  // ---------- the loop ----------
  readScroll()
  p = pT
  q = qT
  g = gT
  const camPos = V(0, 0, 0)
  const camLook = V(0, 0, 0)
  const lookSmooth = V(0, 0, 0)
  let lookInit = false
  let last = performance.now()
  let started = last
  let frameAcc = 0
  let frameN = 0
  let windowStart = last
  let fpsShow = 0
  let fpsN = 0
  let lastRender = 0
  let station = -1
  let prevChapter = ''

  function frame(now) {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const dtRaw = Math.min(0.1, (now - last) / 1000)
    // low quality: cap at ~30 fps
    if (quality === 'low' && now - lastRender < 31) return
    lastRender = now
    last = now
    const dt = dtRaw
    time.value += dt
    const t = time.value

    // smoothed scroll
    const k = snapNext ? 1 : 1 - Math.exp(-dt * 6.5)
    snapNext = false
    p += (pT - p) * k
    q += (qT - q) * k
    g += (gT - g) * k
    pulse = Math.max(0, pulse - dt * 2.2)
    // the copy always follows the real scroll; with reduced motion only the
    // CAMERA holds still at one station per stretch
    const Treal = timeline.toNominal(p)
    let T = Treal
    let act = q
    let fin = g

    if (reduce) {
      const s = STATIONS.findIndex(([end]) => T < end)
      const actStation = g > 0.05 ? 10 : q > 0.25 ? 9 : -1
      const id = actStation > 0 ? actStation : s
      if (station !== -1 && id !== station) pulse = 1
      station = id
      if (actStation < 0) T = STATIONS[s][1]
      act = q > 0.25 ? 1 : 0
      fin = g > 0.05 ? 1 : 0
    }

    // chapter + camera
    let chapter
    if (act > 0.0001 || fin > 0) {
      chapter = 'city'
      risePose(Math.min(1, act), camPos, camLook)
      if (fin > 0 && !reduce) {
        camPos.x += Math.sin(t * 0.15) * 6
        camPos.y += Math.sin(t * 0.21) * 2
        camPos.z += Math.cos(t * 0.12) * 6
      }
    } else if (T < 0.105) {
      chapter = 'limas'
      limasPath(T, camPos, camLook)
      // the courtyard breathes a little before the doors
      if (!reduce) {
        mx += (tmx - mx) * (1 - Math.exp(-dt * 3))
        my += (tmy - my) * (1 - Math.exp(-dt * 3))
        const free = 1 - smooth(0.012, 0.03, T)
        camPos.x += mx * 1.4 * free + Math.sin(t * 0.3) * 0.25 * free
        camPos.y -= my * 0.4 * free
      }
    } else if (T < 0.2) {
      chapter = 'map'
      mapPath(T, camPos, camLook)
    } else {
      chapter = 'river'
      riverPose(T, camPos, camLook, t)
    }
    if (chapter !== prevChapter) {
      lookInit = false
      prevChapter = chapter
    }
    camera.position.copy(camPos)
    if (!lookInit || reduce) {
      lookSmooth.copy(camLook)
      lookInit = true
    } else lookSmooth.lerp(camLook, 1 - Math.exp(-dt * (chapter === 'river' ? 3.5 : 12)))
    camera.lookAt(lookSmooth)
    if (chapter === 'river' && !reduce) camera.rotateZ(Math.sin(t * 0.9) * 0.012 + Math.sin(t * 1.7) * 0.005)
    if (fin > 0) {
      camera.fov = lerp(camera.aspect < 0.8 ? 62 : 52, camera.aspect < 0.8 ? 56 : 47, smooth(0, 1, fin))
      camera.updateProjectionMatrix()
    }

    // which world is on screen
    limas.group.visible = chapter === 'limas'
    map.group.visible = chapter === 'map'
    city.group.visible = chapter === 'river' || chapter === 'city'
    fw.group.visible = chapter === 'city'
    limas.doorLight.intensity = chapter === 'limas' ? 10 : 0
    limas.hallLight.intensity = chapter === 'limas' ? 22 : 0

    // time of day + fog per world
    if (chapter === 'limas') {
      setDay({ golden: 0.25, dusk: 0, night: 0 })
      scene.fog.near = 50
      scene.fog.far = 230
    } else if (chapter === 'map') {
      setDay({ golden: 0, dusk: 0, night: 0 })
      scene.fog.near = 160
      scene.fog.far = 560
    } else {
      const night = chapter === 'city' ? 1 : smooth(0.74, 0.9, T)
      setDay({ golden: smooth(0.36, 0.55, T), dusk: chapter === 'city' ? 1 : smooth(0.58, 0.76, T), night })
      scene.fog.near = chapter === 'city' ? 240 : 90
      scene.fog.far = chapter === 'city' ? 1500 : lerp(720, 1100, night)
    }
    // the shadow box sits on the courtyard; elsewhere only the direction matters
    sun.target.position.set(0, 0, 12)
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 90)
    sun.target.updateMatrixWorld()

    // ambient life
    if (chapter === 'limas') {
      limas.update(dt, t, reduce)
      limas.setOpen(smooth(0.0465, 0.054, T))
    }
    if (chapter === 'map') {
      map.update(dt, t, smooth(0.124, 0.15, T), smooth(0.14, 0.156, T), reduce, smooth(0.178, 0.192, T))
      if (pinEl) {
        tmp.copy(map.palembang).project(camera)
        const o = smooth(0.145, 0.158, T) * (1 - smooth(0.184, 0.192, T))
        pinEl.style.opacity = o.toFixed(3)
        pinEl.style.transform = `translate3d(${((tmp.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * viewH).toFixed(1)}px, 0)`
      }
    }
    if (city.group.visible) city.update(dt, t, chapter === 'city' ? 1 : smooth(0.74, 0.9, T), reduce, chapter === 'city' ? 1 : T)
    if (fw.group.visible) {
      fw.setView(camera, viewH)
      if (reduce) {
        if (fin > 0 && !frozenDone) {
          frozenDone = true
          fw.freeze([
            { ...burstSpot(), pattern: 'peony' },
            { ...burstSpot(), pattern: 'ring' },
            { ...burstSpot(), pattern: 'heart', scale: 1.4 },
            { ...burstSpot(), pattern: 'willow' },
          ])
        }
      } else {
        const rate = fin > 0.05 ? lerp(0.6, 2.4, smooth(0.05, 0.5, fin)) : act > 0.35 ? 0.22 : 0
        if (rate > 0 && t > nextAuto) {
          fw.launch(burstSpot())
          nextAuto = t + (0.4 + Math.random()) / rate
        }
        if (fin > 0.4 && !heartsDone) {
          heartsDone = true
          const c = river.at(0.44, 0, 0, 0, V(0, 0, 0))
          fw.launch({ x: c.x - 30, y: 100, z: c.z, pattern: 'heart', scale: 1.5 })
          fw.launch({ x: c.x + 30, y: 104, z: c.z, pattern: 'heart', scale: 1.5 })
        }
        if (fin < 0.2) heartsDone = false
        fw.update(dt)
      }
    }

    sky.follow(camera)
    driveDom(Treal, q, g, chapter === 'map')
    renderer.render(scene, camera)

    // fps watch: step quality down when frames stay slow
    frameAcc += dtRaw * 1000
    frameN++
    fpsN++
    if (now - windowStart > 2000) {
      const avg = frameAcc / Math.max(1, frameN)
      if (now - started > 3500 && avg > 24 && quality !== 'low') applyQuality(QUALITIES[QUALITIES.indexOf(quality) + 1])
      frameAcc = 0
      frameN = 0
      windowStart = now
    }
    const fpsEl = now - fpsShow > 500 ? $('[data-mu-fps]') : null
    if (fpsEl) {
      fpsEl.textContent = `${Math.round((fpsN * 1000) / (now - fpsShow || 1))} fps · ${quality}`
      fpsShow = now
      fpsN = 0
    }
  }

  on(document, 'visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
      raf = 0
    } else if (running && !raf) {
      last = performance.now()
      windowStart = last
      frameAcc = 0
      frameN = 0
      raf = requestAnimationFrame(frame)
    }
  })
  raf = requestAnimationFrame(frame)

  // ---------- jumps (skip to the end / back to the start) ----------
  function jump(top) {
    override = 1
    fadeEl?.style.setProperty('transition', 'opacity .25s ease')
    setTimeout(() => {
      window.scrollTo({ top, behavior: 'auto' })
      readScroll()
      snapNext = true
      setTimeout(() => {
        override = 0
        setTimeout(() => fadeEl?.style.removeProperty('transition'), 300)
      }, 120)
    }, 260)
  }

  return {
    open() {
      readScroll()
    },
    setPalette(pal) {
      mats.setPalette(pal)
      fw.setPalette(pal.scene.trim)
    },
    /** A guest's wish lights one firework over the river. */
    launchFirework() {
      if (reduce) return
      const c = river.at(0.4 + Math.random() * 0.12, 0, 0, 0, V(0, 0, 0))
      fw.launch({ x: c.x, y: 92, z: c.z, pattern: 'heart', scale: 1.2 })
    },
    scrollToNominal(T, smoothScroll) {
      const top = track.getBoundingClientRect().top + window.scrollY
      const jr = track.offsetHeight - window.innerHeight
      window.scrollTo({ top: top + timeline.toProgress(T) * jr, behavior: smoothScroll && !reduce ? 'smooth' : 'auto' })
    },
    skipToEnd() {
      jump(document.documentElement.scrollHeight)
    },
    backToStart() {
      jump(0)
    },
    refresh: collect,
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      for (const c of cleanups) c()
      sky.dispose()
      limas.dispose()
      map.dispose()
      city.dispose()
      fw.dispose()
      mats.dispose()
      renderer.dispose()
    },
  }
}
