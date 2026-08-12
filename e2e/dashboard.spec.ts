import { test, expect } from '@playwright/test'
import { requireFixture } from './support/fixtures'

/**
 * L3 E2E — per-slug dashboard. READ-ONLY: the owner-login test signs in with the
 * real dummy account (user-approved) and only asserts the dashboard renders —
 * it triggers NO mutations (save/publish/delete are covered at L2). The gate +
 * wrong-password tests are deterministic (the bad-login is intercepted).
 */
const DASH = '/lovebirds/dummy-lovebirds/dashboard'
const DUMMY_EMAIL = 'dummy+dummy-lovebirds@example.com'
const DUMMY_PASS = 'DemoTutorial123!'

test('unauthenticated visitor hits the per-slug login gate', async ({ page }) => {
  await requireFixture(page, DASH)
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  // Login is scoped to this invitation's slug.
  await expect(page.getByRole('heading', { name: 'dummy-lovebirds' })).toBeVisible()
})

test('wrong password is rejected at the gate (intercepted — no prod auth)', async ({ page }) => {
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
    }),
  )
  await requireFixture(page, DASH)
  await page.locator('input[type="email"]').fill('intruder@example.com')
  await page.locator('input[type="password"]').fill('WrongPass1!')
  await page.locator('button[type="submit"]').click()
  // Stays on the login gate — the password field is still there.
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('owner login with the dummy account opens the dashboard (read-only)', async ({ page }) => {
  test.setTimeout(60_000)
  await requireFixture(page, DASH)
  await page.locator('input[type="email"]').fill(DUMMY_EMAIL)
  await page.locator('input[type="password"]').fill(DUMMY_PASS)
  await page.locator('button[type="submit"]').click()

  // After signInWithPassword + router.refresh, DashboardClient replaces the
  // login form — so the password field disappears and the dashboard chrome
  // (slug header) is shown. No save/publish is ever triggered.
  await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 25_000 })
  await expect(page.getByRole('heading', { name: 'dummy-lovebirds' })).toBeVisible()
  await page.screenshot({ path: 'test-results/screens/dashboard-dummy.png', fullPage: false })
})
