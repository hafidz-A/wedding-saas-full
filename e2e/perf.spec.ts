import { test, expect, type Page } from '@playwright/test'
import { invitationRoot } from './support/invitation-page'

/**
 * L6 — runtime perf smoke. We measure sustained frame rate (requestAnimationFrame)
 * to prove the heavy scenes ANIMATE and aren't frozen — a real risk for the Solary
 * Three.js scene and Lovebirds ornaments.
 *
 * NOTE: formal Lighthouse perf SCORES must run against a production build
 * (`next build && next start`) — `next dev` numbers (un-minified, on-demand
 * compile) are not representative, so a Lighthouse score gate is intentionally
 * deferred (can be run via Chrome DevTools MCP `lighthouse_audit` on a prod build).
 * Mobile-throttled FPS (the case that actually bit before) needs device + CPU
 * emulation — noted as a deeper follow-up.
 */
async function measureFps(page: Page, seconds = 2): Promise<number> {
  return page.evaluate(
    (sec) =>
      new Promise<number>((resolve) => {
        let frames = 0
        const start = performance.now()
        function tick() {
          frames++
          if (performance.now() - start < sec * 1000) requestAnimationFrame(tick)
          else resolve(frames / sec)
        }
        requestAnimationFrame(tick)
      }),
    seconds,
  )
}

test('solary 3D scene sustains an interactive frame rate (not frozen)', async ({ page }) => {
  test.setTimeout(60_000)
  // FPS is measured via page.evaluate() below, which runs against the TOP-LEVEL
  // document. On a phone UA that document is the fixed-position PhoneFrameView
  // wrapper, not the invitation — same-origin frames share a main thread, so a
  // number would still come out even if the scene's own rAF loop died while the
  // wrapper stayed idle, which is a vacuously-green test. `?noframe=1` makes the
  // invitation itself the top-level document so the FPS is really the scene's.
  // The phone-frame wrapper is covered elsewhere (invitation.spec.ts, a11y.spec.ts
  // under the `mobile` project) — it doesn't need re-coverage here too.
  await page.goto('/solary/demo-e2e?noframe=1')
  const root = await invitationRoot(page)
  await expect(root.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
  const fps = await measureFps(page, 2)
  console.log(`[perf] solary FPS ≈ ${fps.toFixed(1)}`)
  expect(fps, 'Three.js scene must animate (rAF not frozen)').toBeGreaterThan(20)
})

test('lovebirds invitation stays responsive (rAF active)', async ({ page }) => {
  test.setTimeout(60_000)
  // Same reasoning as the solary test above: opt out of the phone-frame wrapper
  // with `?noframe=1` so measureFps() reads the invitation's own rAF loop, not
  // the wrapper document's. See that test's comment for the full rationale.
  await page.goto('/lovebirds/demo-e2e?noframe=1')
  const root = await invitationRoot(page)
  await root.locator('h1, h2').first().waitFor()
  const fps = await measureFps(page, 2)
  console.log(`[perf] lovebirds FPS ≈ ${fps.toFixed(1)}`)
  expect(fps, 'page must stay responsive (rAF not frozen)').toBeGreaterThan(20)
})
