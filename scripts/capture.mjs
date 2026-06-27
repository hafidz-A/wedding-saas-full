/* ============================================================================
   capture.mjs — section screenshots + cinematic walkthrough videos
   ----------------------------------------------------------------------------
   Captures the two wedding-invitation templates (solary, lovebirds) as:
     (A) per-section screenshots — the REAL viewport, shot only once the section
         is fully revealed AND visually settled (no motion).
     (B) a slow, constant-speed cinematic walkthrough video, rendered
         frame-by-frame (NOT recordVideo) so Three.js / GSAP never tear.

   Cardinal rules (the root of every past failure):
     1. SCREENSHOT = page.screenshot() clipped to the live viewport. NEVER
        element.screenshot() — that re-composites the element box and puts
        fixed/sticky nav + scroll-reveal transforms in the wrong place.
     2. VIDEO = manual scroll per frame -> render -> page.screenshot -> ffmpeg.
        NEVER Playwright recordVideo (real-time = dropped frames = stutter).
     3. Lenis smooth-scroll fights window.scrollTo. We drive lenis directly
        (mode A) or destroy it and use native scroll (mode B). Reported per run.
     4. Constant speed: per-segment travel time is PROPORTIONAL TO DISTANCE, so
        px/sec is identical everywhere (no "suddenly fast in the middle").

   Usage:
     node scripts/capture.mjs                         # both templates, both viewports, everything
     node scripts/capture.mjs --target=solary
     node scripts/capture.mjs --viewport=mobile --only=screenshots
     node scripts/capture.mjs --target=lovebirds --only=video
     node scripts/capture.mjs --target=lovebirds --sections=3,5,7 --only=screenshots
     node scripts/capture.mjs --only=stitch           # re-encode video from existing frames
     node scripts/capture.mjs --restitch              # alias for --only=stitch
     node scripts/capture.mjs --hideNav               # hide nav on inner-section screenshots
     node scripts/capture.mjs --smoke                 # fast low-fps validation pass

   Extra knobs (sensible defaults; you normally only touch --sps / --hold):
     --base=http://localhost:3000   --fps=60   --sps=6   --hold=1.2
     --gl=d3d11|swiftshader|egl|none   (default d3d11 — real GPU, 65x faster
                                        than swiftshader for Solary's Three.js;
                                        swiftshader = the spec's CPU fallback)
   ============================================================================ */

import { chromium } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, existsSync, readdirSync, statSync, writeFileSync, copyFileSync } from 'node:fs'
import path from 'node:path'

/* ----------------------------------------------------------------- args ---- */
const argv = process.argv.slice(2)
const flag = (name, def = undefined) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return def
  const eq = hit.indexOf('=')
  return eq === -1 ? true : hit.slice(eq + 1)
}
const list = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean)

const SMOKE = !!flag('smoke', false)
const BASE = flag('base', 'http://localhost:3000')
const FPS = Number(flag('fps', SMOKE ? 20 : 60))
const SECONDS_PER_SECTION = Number(flag('sps', SMOKE ? 2.0 : 6.0)) // pace knob
const HOLD_PER_SECTION = Number(flag('hold', SMOKE ? 0.5 : 1.2))   // gentle gaze
const GL = flag('gl', 'd3d11')
const HIDE_NAV = !!flag('hideNav', false)

const TARGETS = (flag('target') ? list(flag('target')) : ['solary', 'lovebirds'])
const VIEWPORTS_SEL = (flag('viewport') ? list(flag('viewport')) : ['mobile', 'desktop'])
let ONLY = flag('only', null)               // screenshots | video | stitch
if (flag('restitch', false)) ONLY = 'stitch'
const SECTIONS_SEL = flag('sections') ? new Set(list(flag('sections')).map((n) => Number(n) - 1)) : null

const OUT_ROOT = path.resolve('captures')

/* ----- per-pass viewports. dsf is high for crisp stills, 2 for video. ----- */
const VP = {
  mobile: { name: 'mobile', width: 390, height: 844, isMobile: true, shotDsf: 3, vidDsf: 2 },
  desktop: { name: 'desktop', width: 1440, height: 900, isMobile: false, shotDsf: 2, vidDsf: 2 },
}
const VIEWPORTS = VIEWPORTS_SEL.map((n) => VP[n]).filter(Boolean)

const TEMPLATES = TARGETS.map((id) => ({ id, slug: `demo-${id}` }))

/* Solary's WebGL camera is time-damped — give it extra render frames per step
   so it converges to the scroll target before the shot. Lovebirds is pure
   scroll-driven DOM, so a plain double-rAF is already exact. */
const EXTRA_RAF = { solary: 3, lovebirds: 0 }
const HAS_WEBGL = { solary: true, lovebirds: false }

/* ANGLE/GL backend. The brief's spec uses swiftshader (CPU) — correct but ~65x
   slower per this repo's own bench-capture.mjs (≈4000ms vs ≈60ms per shot),
   which makes a 60fps video pass take hours. We keep the spec's WebGL-enabling
   flags verbatim and only switch the ANGLE renderer to the machine's real GPU
   (d3d11) by default. Both render Three.js correctly; --gl=swiftshader restores
   the literal spec path on machines without a usable GPU. */
const GL_PRESETS = {
  d3d11: ['--use-gl=angle', '--use-angle=d3d11'],
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader'],
  egl: ['--use-gl=egl'],
  none: [],
}
const launchArgs = () => [
  ...(GL_PRESETS[GL] || GL_PRESETS.d3d11),
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--disable-frame-rate-limit',
  '--hide-scrollbars',
  '--mute-audio',
]

/* --------------------------------------------------------------- helpers --- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pad = (n, w) => String(n).padStart(w, '0')
const ensureDir = (p) => { mkdirSync(p, { recursive: true }); return p }
const clearDir = (p) => { if (existsSync(p)) for (const f of readdirSync(p)) rmSync(path.join(p, f), { recursive: true, force: true }) }

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    proc.stderr.on('data', (d) => { err += d.toString() })
    proc.on('error', reject)
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-1500)}`))))
  })
}

/* Downscale a PNG buffer to `w` px wide RGBA (sharp = fast path). Used only for
   the settle comparison, where exact colour is irrelevant — we just want a
   cheap, fixed-size frame to diff. */
async function smallRGBA(pngBuffer, w, h) {
  const { data } = await sharp(pngBuffer).resize(w, h, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return data
}

/* Fraction of pixels that changed between two screenshots (0..1). */
async function diffRatio(bufA, bufB, w, h) {
  const [a, b] = await Promise.all([smallRGBA(bufA, w, h), smallRGBA(bufB, w, h)])
  const diff = pixelmatch(a, b, null, w, h, { threshold: 0.1 })
  return diff / (w * h)
}

/* easeInOutSine: zero velocity at both ends, no mid-stroke jolt. */
const easeInOutSine = (t) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2

const clamp = (y, max) => Math.max(0, Math.min(Math.round(y), max))
// Reveal scroll position: centre a short section in the viewport; for a section
// taller than the viewport, scroll so its whole content has passed (bottom-aligned).
const revealY = (s, vh, max) => clamp(s.height <= vh ? s.top - (vh - s.height) / 2 : s.top + s.height - vh, max)

/* =====================================================================
   In-page helpers — installed once per page as window.__cap.
   Kept framework-agnostic so they survive both shells.
   ===================================================================== */
function installPageHelpers() {
  const w = window
  const doc = document

  const lenis = () => w.__lenis || w.lenis || null

  function getMax() {
    return Math.max(0, doc.documentElement.scrollHeight - w.innerHeight)
  }

  function setScroll(y) {
    const max = getMax()
    y = Math.max(0, Math.min(y, max))
    const l = lenis()
    if (l && typeof l.scrollTo === 'function') {
      l.scrollTo(y, { immediate: true, force: true }) // jump, ignore stop() state
      try { l.raf(performance.now()) } catch {}
    } else {
      w.scrollTo(0, y)
    }
    // Belt-and-braces: scrub-reveal listeners key off the native scroll event,
    // and ScrollTrigger.update snaps any scrubbed timeline to this position.
    w.dispatchEvent(new Event('scroll'))
    if (w.ScrollTrigger && typeof w.ScrollTrigger.update === 'function') w.ScrollTrigger.update()
    else if (w.gsap && w.gsap.core && w.ScrollTrigger) { try { w.ScrollTrigger.update() } catch {} }
  }

  function waitRender(extra = 0) {
    // double rAF (GSAP ticker + a real paint) plus optional extra frames so a
    // time-damped WebGL camera converges nearer the target before the shot.
    const total = 2 + extra
    return new Promise((resolve) => {
      let i = 0
      const step = () => { i += 1; i >= total ? resolve() : requestAnimationFrame(step) }
      requestAnimationFrame(step)
    })
  }

  async function warmup() {
    const max = getMax()
    for (let y = 0; y <= max; y += 200) { setScroll(y); await new Promise((r) => setTimeout(r, 120)) }
    setScroll(max); await new Promise((r) => setTimeout(r, 800))
    setScroll(0); await new Promise((r) => setTimeout(r, 1000))
  }

  function indexSections() {
    setScroll(0)
    const vh = w.innerHeight
    const tries = [
      '[data-section]',
      'section[id]',
      'main > section, .section',
      '[data-scroll-section]',
      'main > div[id]',
    ]
    let els = [], used = ''
    for (const sel of tries) {
      els = Array.from(doc.querySelectorAll(sel))
      if (els.length) { used = sel; break }
    }
    const seen = new Set()
    const items = els
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { el, top: Math.round(r.top + w.scrollY), height: Math.round(r.height) }
      })
      .filter((s) => s.height > vh * 0.25 && s.top >= -5) // real sections, not slivers
      .sort((a, b) => a.top - b.top)
      .filter((s) => { const k = Math.round(s.top / 20); if (seen.has(k)) return false; seen.add(k); return true })

    items.forEach((s, i) => {
      s.el.setAttribute('data-cap-index', String(i))
      const raw = s.el.id || s.el.getAttribute('data-section') ||
        (s.el.className && String(s.el.className).split(/\s+/)[0]) || `section`
      s.id = String(raw).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || `section-${i}`
    })
    return { vh, max: getMax(), selector: used, sections: items.map((s, i) => ({ index: i, id: s.id, top: s.top, height: s.height })) }
  }

  function setNavHidden(hidden) {
    const sel = 'nav, [class*="FloatingNavbar"], [class*="Navbar"], [class*="navbar"], [class*="SectionArrows"]'
    doc.querySelectorAll(sel).forEach((el) => { el.style.visibility = hidden ? 'hidden' : '' })
  }

  w.__cap = { getMax, setScroll, waitRender, warmup, indexSections, setNavHidden, hasLenis: !!lenis() }
}

/* Open + prepare a page for a (template, viewport, dsf). */
async function preparePage(browser, tpl, vp, dsf, tag) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: dsf,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    reducedMotion: 'no-preference', // we WANT the animations
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.warn(`  [${tag}] pageerror: ${e.message}`))

  const url = `${BASE}/${tpl.id}/${tpl.slug}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 })
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})

  // Hide demo-only chrome (palette switcher) + the music permission dialog so
  // they never sit on top of a section. Nav stays (it's part of the product).
  await page.addStyleTag({
    content: `[class*="PaletteSwitcher"],[class*="paletteSwitcher"],
              [role="dialog"][aria-label="Music permission"]{display:none!important}`,
  }).catch(() => {})

  await page.evaluate(installPageHelpers)

  // Lenis taming (mode A driven / mode B native) — reported by caller.
  let mode = 'B'
  try {
    await page.waitForFunction(() => !!(window.__lenis || window.lenis), null, { timeout: 15_000 })
    mode = 'A'
  } catch {}

  // For WebGL templates, wait for the Three.js scene to mount (else the page is
  // a black void and rhythm spacers never get inserted).
  if (HAS_WEBGL[tpl.id]) {
    await page.waitForFunction(() => !!window.galacticScene, null, { timeout: 20_000 })
      .catch(() => console.warn(`  [${tag}] window.galacticScene not found — WebGL may not have initialised (try --gl=swiftshader)`))
  }

  await page.evaluate(() => window.__cap.warmup())
  await sleep(300)
  return { context, page, mode }
}

/* ============================ (A) SCREENSHOTS ============================= */
async function captureScreenshots(browser, tpl, vp) {
  const tag = `${tpl.id}/${vp.name}`
  const dir = ensureDir(path.join(OUT_ROOT, tpl.id, 'screenshots', vp.name))
  const extra = EXTRA_RAF[tpl.id] ?? 0
  const settleMax = HAS_WEBGL[tpl.id] ? 10_000 : 8_000
  // Ambient-motion ceiling for plateau detection. Solary's 3D scene + drifting
  // photo-stars never freeze, so accept a higher steady plateau there.
  const ambientCeil = HAS_WEBGL[tpl.id] ? 0.06 : 0.012

  console.log(`\n▶ ${tag} · screenshots (dsf ${vp.shotDsf})`)
  const { context, page, mode } = await preparePage(browser, tpl, vp, vp.shotDsf, tag)
  const meta = await page.evaluate(() => window.__cap.indexSections())
  const all = meta.sections
  if (!all.length) { console.warn(`  [${tag}] no sections found — skipping`); await context.close(); return null }
  console.log(`  Lenis mode ${mode} (${mode === 'A' ? 'driven' : 'native fallback'}) · selector "${meta.selector}"`)
  console.log(`  ${all.length} sections: ${all.map((s) => `${s.index + 1}:${s.id}`).join(', ')}`)

  const targets = SECTIONS_SEL ? all.filter((s) => SECTIONS_SEL.has(s.index)) : all
  const unsettled = []
  const written = []

  // Per-shot helper: scroll, settle (visual-stable loop), screenshot viewport.
  async function shoot(y, file, idxForNav) {
    await page.evaluate(async ({ y, n }) => { window.__cap.setScroll(y); await window.__cap.waitRender(n) }, { y, n: extra })
    await sleep(250)
    // settle loop — capture until two consecutive <0.1% diffs (or timeout)
    const clip = { x: 0, y: 0, width: vp.width, height: vp.height }
    const dw = 360, dh = Math.round(360 * vp.height / vp.width)
    // SETTLE: poll until the frame stops changing. Truly-static sections hit
    // <0.1% (the strict spec bar). But both templates have perpetual ambient
    // motion (canvas birds/ornaments, drifting starfield) that never freezes,
    // so we also accept a low, FLAT plateau (entrance done, only the ambient
    // loop left) — otherwise every such shot would burn the whole timeout.
    let prev = await page.screenshot({ clip })
    let hits = 0, settled = false, lastRatio = 1, prevRatio = 1
    const t0 = Date.now()
    while (Date.now() - t0 < settleMax) {
      await sleep(200)
      const cur = await page.screenshot({ clip })
      const ratio = await diffRatio(prev, cur, dw, dh)
      prev = cur
      const strict = ratio < 0.001
      const flatLow = ratio < ambientCeil && Math.abs(ratio - prevRatio) < 0.0009 // plateaued ambient
      if (strict || flatLow) { if (++hits >= 2) { settled = true; lastRatio = ratio; break } } else hits = 0
      prevRatio = ratio; lastRatio = ratio
    }
    if (HIDE_NAV && idxForNav > 0) await page.evaluate(() => window.__cap.setNavHidden(true))
    await page.screenshot({ path: file, clip })
    if (HIDE_NAV && idxForNav > 0) await page.evaluate(() => window.__cap.setNavHidden(false))
    return { settled, ratio: lastRatio }
  }

  for (const s of targets) {
    const base = `${pad(s.index + 1, 2)}-${s.id}`
    if (s.height <= meta.vh) {
      const y = revealY(s, meta.vh, meta.max)
      const file = path.join(dir, `${base}.png`)
      const r = await shoot(y, file, s.index)
      written.push(path.basename(file))
      if (!r.settled) unsettled.push(`${base} (Δ${(r.ratio * 100).toFixed(2)}%)`)
      console.log(`  ✓ ${base}${r.settled ? '' : ' [not settled]'}`)
    } else {
      // Tall section: tile viewport shots top→bottom, suffix -a,-b,-c…
      const bottom = clamp(s.top + s.height - meta.vh, meta.max)
      const ys = []
      for (let y = s.top; y < bottom - 2; y += meta.vh * 0.9) ys.push(clamp(y, meta.max))
      ys.push(bottom)
      for (let i = 0; i < ys.length; i++) {
        const suffix = String.fromCharCode(97 + i) // a,b,c
        const file = path.join(dir, `${base}-${suffix}.png`)
        const r = await shoot(ys[i], file, s.index)
        written.push(path.basename(file))
        if (!r.settled) unsettled.push(`${base}-${suffix} (Δ${(r.ratio * 100).toFixed(2)}%)`)
        console.log(`  ✓ ${base}-${suffix}${r.settled ? '' : ' [not settled]'}`)
      }
    }
  }
  await context.close()
  return { mode, selector: meta.selector, sections: all, written, unsettled }
}

/* ============================== (B) VIDEO ================================ */
function buildTimeline(stops, N) {
  // distances between stops; proportional travel time => constant px/sec
  const dist = []
  for (let i = 0; i < stops.length - 1; i++) dist.push(stops[i + 1] - stops[i])
  const totalDist = dist.reduce((a, b) => a + b, 0) || 1
  const travelDuration = N * SECONDS_PER_SECTION
  const nSeg = dist.length

  const phases = []
  phases.push({ dur: 1, from: stops[0], to: stops[0] }) // opening beat (1s rest)
  for (let i = 0; i < nSeg; i++) {
    const moveTime = travelDuration * (dist[i] / totalDist)
    const creep = stops[i] + dist[i] * 0.08            // micro-creep target (~8%)
    phases.push({ dur: HOLD_PER_SECTION, from: stops[i], to: creep })   // gentle gaze
    phases.push({ dur: moveTime, from: creep, to: stops[i + 1] })       // glide to next
  }
  phases.push({ dur: 1, from: stops[stops.length - 1], to: stops[stops.length - 1] }) // tail hold
  const total = phases.reduce((a, p) => a + p.dur, 0)
  return { phases, total, travelDuration }
}

function yAt(phases, t) {
  let acc = 0
  for (const p of phases) {
    if (t <= acc + p.dur || p === phases[phases.length - 1]) {
      const local = p.dur > 0 ? (t - acc) / p.dur : 1
      return p.from + (p.to - p.from) * easeInOutSine(local)
    }
    acc += p.dur
  }
  return phases[phases.length - 1].to
}

async function renderFrames(browser, tpl, vp) {
  const tag = `${tpl.id}/${vp.name}`
  const framesDir = ensureDir(path.join(OUT_ROOT, tpl.id, 'frames', vp.name))
  clearDir(framesDir)
  const extra = EXTRA_RAF[tpl.id] ?? 0

  console.log(`\n▶ ${tag} · video frames (dsf ${vp.vidDsf})`)
  const { context, page, mode } = await preparePage(browser, tpl, vp, vp.vidDsf, tag)
  const meta = await page.evaluate(() => window.__cap.indexSections())
  const secs = meta.sections
  if (!secs.length) { console.warn(`  [${tag}] no sections — skipping`); await context.close(); return null }
  console.log(`  Lenis mode ${mode} · ${secs.length} sections`)

  // STOPS = top, each section reveal, bottom — deduped so no zero-length segment
  const raw = [0, ...secs.map((s) => revealY(s, meta.vh, meta.max)), meta.max]
  const stops = raw.filter((y, i) => i === 0 || y - raw[i - 1] > meta.vh * 0.05)
  const { phases, total } = buildTimeline(stops, secs.length)
  const totalFrames = Math.round(total * FPS)
  console.log(`  ${stops.length} stops · ${total.toFixed(1)}s @ ${FPS}fps = ${totalFrames} frames (sps ${SECONDS_PER_SECTION}, hold ${HOLD_PER_SECTION})`)

  const clip = { x: 0, y: 0, width: vp.width, height: vp.height }
  const t0 = Date.now()
  let lastGood = null, dups = 0
  for (let f = 0; f < totalFrames; f++) {
    const y = yAt(phases, f / FPS)
    await page.evaluate(async ({ y, n }) => { window.__cap.setScroll(y); await window.__cap.waitRender(n) }, { y, n: extra })
    await sleep(16)
    // JPEG (not PNG) for the TRANSIENT frames: ~10x smaller on disk and far
    // faster to encode on canvas-heavy pages. The final mp4 is h264/yuv420p
    // regardless, so q92 here is visually indistinguishable in playback.
    // Resilient shot: a WebGL GPU readback occasionally stalls (Three.js). Retry
    // once after nudging a render; if it still fails, reuse the previous frame so
    // numbering stays contiguous (ffmpeg stops at the first gap) and one bad
    // frame never aborts the whole video.
    const framePath = path.join(framesDir, `${pad(f, 5)}.jpg`)
    let ok = false
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        await page.screenshot({ path: framePath, type: 'jpeg', quality: 92, clip, timeout: 20_000 })
        ok = true
      } catch {
        if (attempt === 0) await page.evaluate((n) => window.__cap.waitRender(n), extra).catch(() => {})
        else if (lastGood) { copyFileSync(lastGood, framePath); ok = true; dups++ }
      }
    }
    if (ok && existsSync(framePath)) lastGood = framePath
    if (f % 30 === 0 || f === totalFrames - 1) {
      const pct = (((f + 1) / totalFrames) * 100).toFixed(0)
      const eta = ((Date.now() - t0) / (f + 1)) * (totalFrames - f - 1) / 1000
      process.stdout.write(`\r  frames ${pct}% (${f + 1}/${totalFrames}) eta ${eta.toFixed(0)}s    `)
    }
  }
  process.stdout.write('\n')
  if (dups) console.warn(`  note: ${dups} frame(s) reused after a stalled screenshot`)
  await context.close()
  writeFileSync(path.join(framesDir, 'meta.json'), JSON.stringify({ totalFrames, total, fps: FPS, vp: vp.name }, null, 2))
  return { framesDir, totalFrames, total }
}

async function stitch(tpl, vp) {
  const framesDir = path.join(OUT_ROOT, tpl.id, 'frames', vp.name)
  const videoDir = ensureDir(path.join(OUT_ROOT, tpl.id, 'video'))
  if (!existsSync(framesDir) || !readdirSync(framesDir).some((f) => f.endsWith('.jpg'))) {
    console.warn(`  [${tpl.id}/${vp.name}] no frames to stitch`)
    return null
  }
  const outFile = path.join(videoDir, `${vp.name}-walkthrough.mp4`)
  await runFfmpeg([
    '-y',
    '-framerate', String(FPS),
    '-start_number', '0',
    '-i', path.join(framesDir, '%05d.jpg'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '17',
    '-preset', SMOKE ? 'veryfast' : 'medium',
    '-movflags', '+faststart',
    outFile,
  ])
  const sizeMB = (statSync(outFile).size / 1e6).toFixed(1)
  console.log(`  ✓ video ${path.relative(process.cwd(), outFile)} (${sizeMB} MB)`)
  return { outFile, sizeMB }
}

/* =============================== main ==================================== */
async function main() {
  console.log(`capture.mjs — base=${BASE} gl=${GL} fps=${FPS} sps=${SECONDS_PER_SECTION} hold=${HOLD_PER_SECTION}${SMOKE ? '  [SMOKE]' : ''}`)
  console.log(`targets=${TARGETS.join(',')} viewports=${VIEWPORTS_SEL.join(',')} only=${ONLY || 'all'}${SECTIONS_SEL ? ' sections=' + [...SECTIONS_SEL].map((i) => i + 1).join(',') : ''}`)
  ensureDir(OUT_ROOT)

  const doShots = !ONLY || ONLY === 'screenshots'
  const doRender = (!ONLY || ONLY === 'video')
  const doStitch = (!ONLY || ONLY === 'video' || ONLY === 'stitch')
  const onlyStitch = ONLY === 'stitch'

  const summary = []
  for (const tpl of TEMPLATES) {
    console.log(`\n=== ${tpl.id}  (${BASE}/${tpl.id}/${tpl.slug}) ===`)
    let browser = null
    if (!onlyStitch) browser = await chromium.launch({ headless: true, args: launchArgs() })
    try {
      for (const vp of VIEWPORTS) {
        const row = { template: tpl.id, viewport: vp.name }
        try {
          if (doShots && !onlyStitch) {
            const r = await captureScreenshots(browser, tpl, vp)
            if (r) { row.mode = r.mode; row.selector = r.selector; row.sections = r.sections; row.shots = r.written.length; row.unsettled = r.unsettled }
          }
          if (doRender && !onlyStitch) {
            const r = await renderFrames(browser, tpl, vp)
            if (r) { row.frames = r.totalFrames; row.duration = r.total }
          }
          if (doStitch) {
            const r = await stitch(tpl, vp)
            if (r) { row.video = r.outFile; row.sizeMB = r.sizeMB }
          }
          summary.push(row)
        } catch (e) {
          console.error(`\n✗ ${tpl.id}/${vp.name} failed: ${e.message}`)
          summary.push({ ...row, error: e.message })
        }
      }
    } finally {
      if (browser) await browser.close()
    }
  }

  /* ------------------------------- report -------------------------------- */
  console.log('\n================= SUMMARY =================')
  for (const r of summary) {
    if (r.error) { console.log(`${r.template}/${r.viewport}: ERROR — ${r.error}`); continue }
    const bits = []
    if (r.sections) bits.push(`${r.sections.length} sections (Lenis ${r.mode}, "${r.selector}")`)
    if (r.shots != null) bits.push(`${r.shots} screenshots`)
    if (r.frames != null) bits.push(`${r.frames} frames · ${r.duration.toFixed(1)}s`)
    if (r.sizeMB) bits.push(`${r.sizeMB}MB video`)
    console.log(`\n${r.template}/${r.viewport}: ${bits.join(' · ')}`)
    if (r.sections) console.log(`   sections: ${r.sections.map((s) => `${s.index + 1}:${s.id}`).join(', ')}`)
    if (r.shots != null) console.log(`   screenshots: captures/${r.template}/screenshots/${r.viewport}/`)
    if (r.video) console.log(`   video:       ${path.relative(process.cwd(), r.video)}`)
    if (r.unsettled && r.unsettled.length) console.log(`   ⚠ not settled: ${r.unsettled.join(', ')}`)
  }
  if (!summary.length || summary.every((r) => r.error)) { console.error('\nNo captures produced.'); process.exit(1) }
  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
