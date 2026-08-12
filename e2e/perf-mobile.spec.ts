import { test, expect, devices, type Page } from '@playwright/test'
import { invitationRoot } from './support/invitation-page'
import { requireFixture } from './support/fixtures'

/**
 * L6 — throttled-mobile perf probe (the "budget Android" proxy).
 *
 * Emulates a mid/low-tier Android: Pixel 5 viewport/UA/touch + 4× CPU throttle +
 * Slow-4G network — the same constraint class Lighthouse "mobile" applies. A
 * genuinely cheap handset can be ~6× slower still, so treat these as OPTIMISTIC.
 *
 * The numbers (logged) are the finding; assertions only fail on a frozen scene
 * or a catastrophic load, not on a specific budget. Run explicitly:
 *   npx playwright test perf-mobile --project=desktop
 */
test.use({ ...devices['Pixel 5'] })

async function constrain(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // ~Slow 4G
    uploadThroughput: (750 * 1024) / 8,
  })
  return cdp
}

function startFpsCounter(page: Page, sec: number): Promise<number> {
  return page.evaluate(
    (s) =>
      new Promise<number>((res) => {
        let n = 0
        const t = performance.now()
        const tick = () => {
          n++
          performance.now() - t < s * 1000 ? requestAnimationFrame(tick) : res(n / s)
        }
        requestAnimationFrame(tick)
      }),
    sec,
  )
}

/** Real TOUCH swipes (what a phone user does) — bypasses Lenis (syncTouch:false). */
async function touchScrollFps(page: Page, cdp: any, sec = 3): Promise<number> {
  const counter = startFpsCounter(page, sec)
  const x = 180
  const end = Date.now() + sec * 1000
  while (Date.now() < end) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 620 }] })
    for (let y = 620; y >= 180; y -= 70) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  return counter
}

async function fps(page: Page, sec = 3): Promise<number> {
  return page.evaluate(
    (s) =>
      new Promise<number>((res) => {
        let n = 0
        const t = performance.now()
        const tick = () => {
          n++
          performance.now() - t < s * 1000 ? requestAnimationFrame(tick) : res(n / s)
        }
        requestAnimationFrame(tick)
      }),
    sec,
  )
}

async function loadMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')?.startTime
    return {
      dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      fcp: fcp ? Math.round(fcp) : null,
    }
  })
}

// This spec sets its own Pixel 5 UA (test.use above), so PhoneFrameView always
// frames these routes. The `fps`/`startFpsCounter`/`touchScrollFps` helpers below
// run page.evaluate() against the TOP-LEVEL document, which under a phone UA is
// the fixed-position wrapper, not the invitation — same-origin frames share a
// main thread, so a number would still come out even if the scene's own rAF loop
// died while the wrapper stayed idle. That would be a vacuously-green test, the
// exact failure this spec exists to catch. `?noframe=1` makes the invitation
// itself the top-level document so every FPS reading here is really the scene's.
// The phone-frame wrapper is covered elsewhere (invitation.spec.ts, a11y.spec.ts
// under the `mobile` project) — it doesn't need re-coverage in this FPS-only spec.
for (const [name, url, sel] of [
  ['lovebirds-demo (2x gallery)', '/lovebirds/demo-e2e?noframe=1', 'h1, h2'],
  ['lovebirds-real (1x gallery)', '/lovebirds/dummy-lovebirds?noframe=1', 'h1, h2'],
  ['solary', '/solary/demo-e2e?noframe=1', 'canvas'],
] as const) {
  test(`${name}: throttled mobile (4x CPU, Slow-4G) — load + FPS`, async ({ page }) => {
    test.setTimeout(180_000)
    // Only the dummy-lovebirds row depends on a purged fixture — the demo-slug
    // rows above/below must keep running unguarded.
    if (url.includes('dummy-')) await requireFixture(page, url)
    const cdp = await constrain(page)
    const t0 = Date.now()
    await page.goto(url, { waitUntil: 'load', timeout: 120_000 })
    const wallMs = Date.now() - t0
    const root = await invitationRoot(page)
    await root.locator(sel).first().waitFor({ timeout: 90_000 })
    const m = await loadMetrics(page)
    await page.waitForTimeout(4000) // let load settle
    const fIdle = await fps(page, 3) // steady-state idle

    // WHEEL scroll = the Lenis-smoothed path (desktop/trackpad). A phone user
    // does NOT hit this (syncTouch:false).
    const wheelCounter = startFpsCounter(page, 3)
    for (let i = 0; i < 25; i++) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(100)
    }
    const fWheel = await wheelCounter
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // TOUCH scroll = native scroll (Lenis bypassed) — the REAL phone experience.
    const fTouch = await touchScrollFps(page, cdp, 3)

    console.log(
      `[mobile-4x] ${name}: idle≈${fIdle.toFixed(1)} | wheel/Lenis≈${fWheel.toFixed(1)} | TOUCH/native≈${fTouch.toFixed(1)}`,
    )
    expect(fIdle, `${name} steady-state must not be frozen`).toBeGreaterThan(5)
  })
}
