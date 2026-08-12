import { test, expect } from '@playwright/test'
import { requireFixture } from './support/fixtures'

/**
 * L7 — multi-tenant isolation, end-to-end. A session authenticated as the owner
 * of invitation A must NOT be able to open invitation B's dashboard. The server
 * component renders a "wrong account" screen (not the editor, not a fresh login)
 * when the session user != the invitation's owner_user_id.
 *
 * Read-only (user-approved dummy login). Triggers no mutations.
 */
const LB_DASH = '/lovebirds/dummy-lovebirds/dashboard'
const SOLARY_DASH = '/solary/dummy-solary/dashboard'
const LB_EMAIL = 'dummy+dummy-lovebirds@example.com'
const LB_PASS = 'DemoTutorial123!'

test('a tenant cannot open another tenant’s dashboard', async ({ page }) => {
  test.setTimeout(60_000)

  // 1. Sign in as the lovebirds owner.
  await requireFixture(page, LB_DASH)
  await page.locator('input[type="email"]').fill(LB_EMAIL)
  await page.locator('input[type="password"]').fill(LB_PASS)
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 25_000 })

  // 2. Same session, try to open the SOLARY tenant's dashboard.
  await page.goto(SOLARY_DASH)

  // 3. Must be blocked: the wrong-account screen echoes the signed-in email and
  //    does NOT expose solary's editor. (If isolation were broken we'd instead
  //    land in the solary DashboardClient.)
  await expect(page.getByText(LB_EMAIL)).toBeVisible({ timeout: 15_000 })
  // No editor tabs / no fresh password prompt — it's the interstitial.
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
})
