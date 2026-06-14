import { test, expect, type Page } from '@playwright/test'

/**
 * L3 E2E — public invitation render smoke for BOTH templates.
 *
 * Uses `demo-*` slugs: the server renders each template's bundled defaultConfig
 * WITHOUT a DB row, and forces submit endpoints into simulated-success mode
 * (no real writes). So these tests are deterministic and never touch prod data.
 *
 * Value: this is the crash-smoke for the heaviest pages in the app — the
 * cinematic Lovebirds shell (GSAP + scroll) and the Solary Three.js scene.
 */

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

test('lovebirds demo invitation renders without crashing', async ({ page }) => {
  const errors = collectPageErrors(page)
  const resp = await page.goto('/lovebirds/demo-e2e')
  expect(resp, 'navigation response').not.toBeNull()
  expect(resp!.status(), 'must not be 4xx/5xx').toBeLessThan(400)

  // Cinematic shell rendered real content (gate + sections), not an error page.
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  const text = (await page.locator('body').innerText()).trim()
  expect(text.length, 'shell should render substantial content').toBeGreaterThan(80)

  await page.screenshot({ path: 'test-results/screens/lovebirds-demo.png', fullPage: false })
  expect(errors, 'no uncaught runtime errors').toEqual([])
})

test('lovebirds demo RSVP submits with simulated success (no real write)', async ({ page }) => {
  // Fail loudly if the form actually POSTs — demo mode must stay offline.
  let posted = false
  await page.route('**/api/rsvp', (route) => {
    posted = true
    return route.abort()
  })

  await page.goto('/lovebirds/demo-e2e')
  const rsvp = page.locator('section[aria-label="RSVP"]')
  await expect(rsvp).toHaveCount(1)

  const name = rsvp.getByPlaceholder('e.g. Maya Larasati')
  const submitBtn = rsvp.getByRole('button', { name: 'Send my RSVP' })
  const success = rsvp.getByText('Thank you')

  // The cinematic page (GSAP + 60+ gallery images) hydrates slowly and unevenly
  // under load — a single fill→submit can race React Hook Form attaching its
  // handlers (value lands in the DOM but not RHF state → "Please enter your name").
  // Retry the whole interaction until the simulated-success card shows; once
  // hydration is done the fill registers and submit succeeds.
  await expect(async () => {
    await name.scrollIntoViewIfNeeded()
    await name.fill('Maya Larasati')
    await submitBtn.click()
    await expect(success).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 25_000 })

  await expect(rsvp.getByText(/RSVP has been recorded/i)).toBeVisible()
  expect(posted, 'demo RSVP must NOT POST to the API').toBe(false)
})

test('solary demo invitation boots its 3D scene without crashing', async ({ page }) => {
  test.setTimeout(60_000) // Three.js + dynamic(ssr:false) boot is heavier
  const errors = collectPageErrors(page)
  const resp = await page.goto('/solary/demo-e2e')
  expect(resp!.status(), 'must not be 4xx/5xx').toBeLessThan(400)

  // The Three.js renderer mounts a <canvas> once the scene boots.
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })

  await page.screenshot({ path: 'test-results/screens/solary-demo.png', fullPage: false })
  // Tolerate benign WebGL/context warnings surfaced as pageerror in headless;
  // fail only on real script crashes (TypeError/ReferenceError).
  const fatal = errors.filter((m) => /TypeError|ReferenceError|is not a function|undefined is not/i.test(m))
  expect(fatal, `no fatal runtime errors (saw: ${errors.join(' | ')})`).toEqual([])
})
