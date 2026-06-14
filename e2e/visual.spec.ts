import { test, expect } from '@playwright/test'

/**
 * L4 — visual regression on the DETERMINISTIC pages only (auth forms have no
 * entrance animation / 3D / random demo images). Baselines live in
 * `e2e/visual.spec.ts-snapshots/`. Regenerate intentionally with:
 *   npx playwright test visual --project=desktop --update-snapshots
 *
 * The cinematic Lovebirds shell (GSAP) and Solary Three.js scene are
 * intentionally EXCLUDED: their output is non-deterministic (animation phase,
 * canvas, render-time demo-image fill), so pixel-diff would be perpetually flaky.
 * Their health is covered by crash-smoke + a11y instead.
 */
for (const [name, url] of [
  ['login', '/login'],
  ['signup', '/signup'],
  ['forgot-password', '/forgot-password'],
] as const) {
  test(`visual: ${name}`, async ({ page }) => {
    await page.goto(url)
    await page.locator('main').first().waitFor()
    // Fonts must be loaded before the snapshot or glyph metrics differ.
    await page.evaluate(() => (document as any).fonts?.ready)
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02, // tolerate sub-pixel AA/font rendering noise
      animations: 'disabled',
    })
  })
}
