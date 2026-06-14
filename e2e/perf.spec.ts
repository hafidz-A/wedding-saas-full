import { test, expect, type Page } from '@playwright/test'

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
  await page.goto('/solary/demo-e2e')
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
  const fps = await measureFps(page, 2)
  console.log(`[perf] solary FPS ≈ ${fps.toFixed(1)}`)
  expect(fps, 'Three.js scene must animate (rAF not frozen)').toBeGreaterThan(20)
})

test('lovebirds invitation stays responsive (rAF active)', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/lovebirds/demo-e2e')
  await page.locator('h1, h2').first().waitFor()
  const fps = await measureFps(page, 2)
  console.log(`[perf] lovebirds FPS ≈ ${fps.toFixed(1)}`)
  expect(fps, 'page must stay responsive (rAF not frozen)').toBeGreaterThan(20)
})
