/* ============================================================================
   capture-walkthrough.mjs — smooth, frame-by-frame invitation walkthroughs
   ----------------------------------------------------------------------------
   WHY frame-by-frame (and NOT Playwright recordVideo):
     recordVideo records the live compositor in real time. When a frame is
     expensive (Three.js / software WebGL / GSAP pins) the encoder drops it and
     the motion tears. Here we instead:
       1. set the scroll position by hand for each output frame,
       2. wait for the page to actually render that position (double rAF),
       3. screenshot it,
       4. stitch the stills at a FIXED framerate with ffmpeg.
     The capture rate is decoupled from playback, so motion is always buttery
     no matter how slow a frame was to render.

   Smooth-scroll awareness:
     Both templates hijack scroll with Lenis. window.scrollTo is unreliable
     because Lenis snaps back to its own interpolated target on the next tick.
     So we drive the library directly: lenis.scrollTo(y, { immediate: true }).
     Lovebirds exposes window.__lenis (see SmoothScroll.tsx); Solary exposes it
     via startSmoothScroll. Native scrollTo is only a last-resort fallback.

   Output (separate folder per template, per the brief):
     captures/<template>/screenshots/<viewport>/NN-id.png   (per-section stills)
     captures/<template>/video/<viewport>.mp4               (stitched walkthrough)
     captures/<template>/frames/<viewport>/*.jpg            (transient, removed)

   Usage:
     node scripts/capture-walkthrough.mjs
   Env overrides (all optional):
     CAP_BASE_URL=http://localhost:3000
     CAP_TEMPLATES=lovebirds,solary
     CAP_VIEWPORTS=mobile,desktop
     CAP_FPS=60               output framerate
     CAP_SPS=2.4              seconds per section (the one pacing knob)
     CAP_KEEP_FRAMES=1        keep the transient jpg frames
     CAP_SMOKE=1              fast validation pass (fps 12, sps 1.2, mobile-ish)
   ============================================================================ */

import { chromium } from '@playwright/test'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import path from 'node:path'

/* ---------------------------------------------------------------- config -- */
const BASE = process.env.CAP_BASE_URL || 'http://localhost:3000'
const OUT_ROOT = path.resolve('captures')
const SMOKE = process.env.CAP_SMOKE === '1'

const FPS = Number(process.env.CAP_FPS) || (SMOKE ? 12 : 60)
const SECONDS_PER_SECTION = Number(process.env.CAP_SPS) || (SMOKE ? 1.2 : 2.4)
const MIN_DURATION = 8 // seconds — floor so short pages aren't a blip

const TEMPLATES = (process.env.CAP_TEMPLATES || 'lovebirds,solary')
  .split(',').map((s) => s.trim()).filter(Boolean)
  .map((id) => ({ id, slug: `demo-${id}` }))

const ALL_VIEWPORTS = {
  mobile: { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
  desktop: { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
}
const VIEWPORTS = (process.env.CAP_VIEWPORTS || (SMOKE ? 'mobile' : 'mobile,desktop'))
  .split(',').map((s) => s.trim()).filter(Boolean).map((n) => ALL_VIEWPORTS[n]).filter(Boolean)

// Solary's WebGL camera is time-damped; one extra render frame lets it converge
// closer to the scroll target before we shoot. Lovebirds is purely
// scroll-driven, so a plain double-rAF is already exact.
const SETTLE_RAF = { lovebirds: 2, solary: 3 }

// GPU backend for headless WebGL. Measured on this machine:
//   d3d11 (real GPU)  → ~60ms / screenshot, Three.js renders correctly
//   swiftshader (CPU) → ~4000ms / screenshot (every compositor readback is a
//                       software copy) — 65× slower, unusable for 60fps.
// So we default to the real GPU and keep swiftshader only as a fallback for
// machines without one (CAP_GL=swiftshader).
const GL_PRESETS = {
  none: [], // default headless compositor — fastest + most stable for pure DOM
  d3d11: ['--use-gl=angle', '--use-angle=d3d11'],
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader'],
  egl: ['--use-gl=egl'],
}
// Per-template GPU backend. Lovebirds is pure DOM/CSS/2D-canvas — forcing a GPU
// backend adds nothing and the heavy page occasionally stalled the GPU
// readback, so it uses the default compositor. Solary needs real WebGL for its
// Three.js scene, so it drives the machine's GPU via ANGLE d3d11 (measured 65×
// faster than the swiftshader software path). CAP_GL overrides both.
const TEMPLATE_GL = { lovebirds: 'none', solary: 'd3d11' }
function launchArgs(tplId) {
  const gl = process.env.CAP_GL || TEMPLATE_GL[tplId] || 'd3d11'
  return [
    ...(GL_PRESETS[gl] || []),
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-frame-rate-limit',
    '--hide-scrollbars',
    '--mute-audio',
  ]
}

/* ------------------------------------------------------------- helpers ---- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pad = (n, w = 6) => String(n).padStart(w, '0')

function ensureDir(p) {
  mkdirSync(p, { recursive: true })
  return p
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    proc.stderr.on('data', (d) => { err += d.toString() })
    proc.on('error', reject)
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-1200)}`)))
  })
}

/* In-page helpers, installed once per page. Returns nothing; attaches a single
   window.__cap namespace. Kept dependency-free so it survives any framework. */
function installPageHelpers() {
  const w = window
  const doc = document

  function maxScroll() {
    return Math.max(0, doc.documentElement.scrollHeight - w.innerHeight)
  }

  function setScroll(y) {
    const max = maxScroll()
    y = Math.max(0, Math.min(y, max))
    const lenis = w.__lenis
    if (lenis && typeof lenis.scrollTo === 'function') {
      // immediate = jump (no interpolation); force = ignore any stop() state.
      lenis.scrollTo(y, { immediate: true, force: true })
      try { lenis.raf(performance.now()) } catch {}
    } else if (w.ScrollSmoother && w.ScrollSmoother.get && w.ScrollSmoother.get()) {
      w.ScrollSmoother.get().scrollTo(y, false)
    } else {
      w.scrollTo(0, y)
    }
    // Belt-and-braces: some listeners key off the native event.
    w.dispatchEvent(new Event('scroll'))
  }

  function nextFrames(n) {
    return new Promise((resolve) => {
      let i = 0
      const step = () => { i += 1; i >= n ? resolve() : requestAnimationFrame(step) }
      requestAnimationFrame(step)
    })
  }

  // Collect the section elements with the same query the brief specifies, tag
  // each chosen one with data-cap-index, and return their layout metrics.
  // Must run AFTER warm-up so lazily-inserted spacers (Solary rhythm) exist.
  function indexSections() {
    setScroll(0)
    const vh = w.innerHeight
    let els = Array.from(doc.querySelectorAll('section[id], [data-section], [data-scroll-section]'))
    if (!els.length) els = Array.from(doc.querySelectorAll('main > section, .section'))
    if (!els.length) els = Array.from(doc.querySelectorAll('main > div'))

    const seen = new Set()
    const items = els
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { el, top: Math.round(r.top + w.scrollY), height: Math.round(r.height) }
      })
      // Real sections only — skip slivers / decorative wrappers.
      .filter((s) => s.height > vh * 0.3 && s.top >= 0)
      .sort((a, b) => a.top - b.top)
      .filter((s) => { // dedupe near-identical tops
        const k = Math.round(s.top / 20)
        if (seen.has(k)) return false
        seen.add(k); return true
      })

    items.forEach((s, i) => {
      s.el.setAttribute('data-cap-index', String(i))
      const idAttr = s.el.id || s.el.getAttribute('data-section') ||
        (s.el.className && String(s.el.className).split(/\s+/)[0]) || `section`
      s.id = String(idAttr).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || `section-${i}`
    })
    return { vh, max: maxScroll(), sections: items.map((s, i) => ({ index: i, id: s.id, top: s.top, height: s.height })) }
  }

  async function warmup() {
    const max = maxScroll()
    for (let y = 0; y <= max; y += 200) {
      setScroll(y)
      await new Promise((r) => setTimeout(r, 120))
    }
    setScroll(max)
    await new Promise((r) => setTimeout(r, 800))
    setScroll(0)
    await new Promise((r) => setTimeout(r, 1000))
  }

  w.__cap = { setScroll, nextFrames, indexSections, warmup, maxScroll }
}

const smoothstep = (x) => {
  x = Math.max(0, Math.min(1, x))
  return x * x * (3 - 2 * x)
}

/* Open a fresh page, navigate, settle fonts, install helpers, warm up lazy
   content. `dsf` is set per pass: high for crisp stills, 1 for fast video
   frames. CSS-pixel layout (and therefore section offsetTops) is identical at
   any dsf, so the two passes agree on scroll positions. */
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
  // Demo-only floating control — not what a real guest sees. Keep the
  // walkthrough representative of the shipped product.
  await page.addStyleTag({ content: '[class*="PaletteSwitcher"]{display:none!important}' }).catch(() => {})
  await page.evaluate(installPageHelpers)
  await page.waitForFunction(() => !!window.__lenis, null, { timeout: 15_000 })
    .catch(() => console.warn(`  [${tag}] window.__lenis not found — using native scroll fallback`))
  await page.evaluate(() => window.__cap.warmup())
  await sleep(300)
  return { context, page }
}

/* ------------------------------------------------------- per (tpl,viewport) */
async function captureOne(browser, tpl, vp) {
  const tag = `${tpl.id}/${vp.name}`
  const dirs = {
    frames: ensureDir(path.join(OUT_ROOT, tpl.id, 'frames', vp.name)),
    shots: ensureDir(path.join(OUT_ROOT, tpl.id, 'screenshots', vp.name)),
    video: ensureDir(path.join(OUT_ROOT, tpl.id, 'video')),
  }
  // Clear any prior frames so a re-run doesn't stitch stale images.
  for (const f of readdirSync(dirs.frames)) rmSync(path.join(dirs.frames, f))
  const settle = SETTLE_RAF[tpl.id] ?? 2

  /* ===== Pass A — per-section stills at full device scale (crisp) ======= */
  console.log(`\n▶ ${tag} · stills (dsf ${vp.deviceScaleFactor})`)
  const a = await preparePage(browser, tpl, vp, vp.deviceScaleFactor, tag)
  const meta = await a.page.evaluate(() => window.__cap.indexSections())
  const N = meta.sections.length
  if (!N) { console.warn(`  [${tag}] no sections found — skipping`); await a.context.close(); return null }
  console.log(`  sections: ${N} — ${meta.sections.map((s) => s.id).join(', ')}`)

  for (const s of meta.sections) {
    await a.page.evaluate(
      async ({ y, n }) => { window.__cap.setScroll(y); await window.__cap.nextFrames(n) },
      { y: s.top, n: settle },
    )
    await sleep(1000) // let GSAP entrances settle (per brief)
    const file = path.join(dirs.shots, `${pad(s.index + 1, 2)}-${s.id}.png`)
    // Tall pinned/scrub sections (Hero gate ~200vh, gallery pins) make an
    // unwieldy full-element shot full of pinned blank space — frame them as a
    // viewport clip instead. `animations:'disabled'` skips Playwright's
    // "element stable" wait that otherwise stalls on perpetual motion.
    const tall = s.height > vp.height * 1.6
    try {
      if (tall) await a.page.screenshot({ path: file, timeout: 15000 })
      else await a.page.locator(`[data-cap-index="${s.index}"]`)
        .screenshot({ path: file, animations: 'disabled', timeout: 3500 })
    } catch {
      await a.page.screenshot({ path: file, timeout: 15000 }).catch(() => {})
    }
  }
  console.log(`  ✓ ${N} section screenshots`)
  await a.context.close()

  /* ===== Pass B — video frames at dsf 1 (4× fewer pixels = fast) ======== */
  console.log(`  ▶ ${tag} · video frames (dsf 1)`)
  const b = await preparePage(browser, tpl, vp, 1, tag)
  const vmeta = await b.page.evaluate(() => window.__cap.indexSections())
  const sections = vmeta.sections.length ? vmeta.sections : meta.sections
  const Nv = sections.length

  const duration = Math.max(MIN_DURATION, Nv * SECONDS_PER_SECTION)
  const totalFrames = Math.round(duration * FPS)
  const stops = [...sections.map((s) => s.top), vmeta.max] // section tops then page bottom
  const HOLD = 0.25 // fraction of each segment paused on the section

  console.log(`  video: ${duration.toFixed(1)}s @ ${FPS}fps = ${totalFrames} frames`)
  const t0 = Date.now()
  let lastFrame = null
  let dup = 0
  for (let f = 0; f < totalFrames; f++) {
    const g = f / totalFrames           // 0..1 across whole timeline
    const segF = Math.min(Nv - 1, Math.floor(g * Nv))
    const segT = g * Nv - segF          // 0..1 within this section's segment
    const local = segT < HOLD ? 0 : smoothstep((segT - HOLD) / (1 - HOLD))
    const y = stops[segF] + (stops[segF + 1] - stops[segF]) * local

    await b.page.evaluate(
      async ({ y, n }) => { window.__cap.setScroll(y); await window.__cap.nextFrames(n) },
      { y, n: settle },
    )
    // Resilient shot: an occasional GPU readback can stall. Retry once; if it
    // still fails, reuse the previous frame so the numbering stays contiguous
    // (ffmpeg stops at the first gap) and one bad frame never aborts the video.
    const frameFile = path.join(dirs.frames, `f-${pad(f)}.jpg`)
    let ok = false
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        await b.page.screenshot({ path: frameFile, type: 'jpeg', quality: 88, timeout: 20000 })
        ok = true
      } catch {
        if (attempt === 1 && lastFrame) { copyFileSync(lastFrame, frameFile); ok = true; dup++ }
      }
    }
    if (ok && existsSync(frameFile)) lastFrame = frameFile

    if (f % 60 === 0 || f === totalFrames - 1) {
      const pct = (((f + 1) / totalFrames) * 100).toFixed(0)
      const eta = ((Date.now() - t0) / (f + 1)) * (totalFrames - f - 1) / 1000
      process.stdout.write(`\r  capturing frames… ${pct}% (${f + 1}/${totalFrames}) eta ${eta.toFixed(0)}s   `)
    }
  }
  process.stdout.write('\n')
  if (dup) console.warn(`  note: ${dup} frame(s) re-used after a stalled shot`)
  await b.context.close()

  /* ---- stitch with ffmpeg → mp4 --------------------------------------- */
  const outFile = path.join(dirs.video, `${vp.name}.mp4`)
  await runFfmpeg([
    '-y',
    '-framerate', String(FPS),
    '-start_number', '0',
    '-i', path.join(dirs.frames, 'f-%06d.jpg'),
    '-vf', `scale=${vp.width}:${vp.height}:flags=lanczos`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '19',
    '-preset', SMOKE ? 'veryfast' : 'medium',
    '-movflags', '+faststart',
    outFile,
  ])
  const sizeMB = (statSync(outFile).size / 1e6).toFixed(1)
  console.log(`  ✓ video ${outFile} (${sizeMB} MB)`)

  if (process.env.CAP_KEEP_FRAMES !== '1') {
    for (const f of readdirSync(dirs.frames)) rmSync(path.join(dirs.frames, f))
    rmSync(dirs.frames, { recursive: true, force: true })
  }

  return { template: tpl.id, viewport: vp.name, sections: Nv, frames: totalFrames, duration, video: outFile, sizeMB }
}

/* ------------------------------------------------------------------ main -- */
async function main() {
  console.log(`Capture walkthrough — base=${BASE} fps=${FPS} sps=${SECONDS_PER_SECTION}${SMOKE ? ' [SMOKE]' : ''}`)
  console.log(`templates=${TEMPLATES.map((t) => t.id).join(',')} viewports=${VIEWPORTS.map((v) => v.name).join(',')}`)
  ensureDir(OUT_ROOT)

  const summary = []
  for (const tpl of TEMPLATES) {
    const gl = process.env.CAP_GL || TEMPLATE_GL[tpl.id] || 'd3d11'
    console.log(`\n=== ${tpl.id} (GPU backend: ${gl}) ===`)
    const browser = await chromium.launch({ headless: true, args: launchArgs(tpl.id) })
    try {
      for (const vp of VIEWPORTS) {
        try {
          const r = await captureOne(browser, tpl, vp)
          if (r) summary.push(r)
        } catch (e) {
          console.error(`\n✗ ${tpl.id}/${vp.name} failed: ${e.message}`)
        }
      }
    } finally {
      await browser.close()
    }
  }

  console.log('\n================ SUMMARY ================')
  for (const r of summary) {
    console.log(`${r.template}/${r.viewport}: ${r.sections} sections · ${r.duration.toFixed(1)}s · ${r.frames} frames · ${r.sizeMB}MB`)
    console.log(`   video:       captures/${r.template}/video/${r.viewport}.mp4`)
    console.log(`   screenshots: captures/${r.template}/screenshots/${r.viewport}/`)
  }
  if (!summary.length) { console.error('No captures produced.'); process.exit(1) }
}

main().catch((e) => { console.error(e); process.exit(1) })
