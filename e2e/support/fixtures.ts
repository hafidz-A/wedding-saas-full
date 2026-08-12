import { test, type Page } from '@playwright/test'

/**
 * Skip — loudly and with a reason — when a fixture invitation is missing.
 *
 * The dummy-* invitations these specs need were purged in the go-live database
 * wipe (2026-07-21) and must NOT be re-seeded: this suite runs against the
 * production database, and fake rows there are worse than missing coverage.
 *
 * Skipping is deliberately not the end state. It converts 12 permanent reds
 * into visible, explained gaps so the suite is usable as a release gate again;
 * the coverage itself only comes back with a dedicated test database.
 */
export async function requireFixture(page: Page, path: string): Promise<void> {
  const res = await page.goto(path)
  // Public invitation routes 404 outright for a missing slug, so the status
  // check alone covers those. The per-slug DASHBOARD route does NOT: a missing
  // invitation still renders its own "NoSuchInvitation" placeholder at a normal
  // 200 (see src/app/[template]/[slug]/dashboard/page.tsx), with i18n copy
  // "tidak ditemukan" / "not found" — so it needs a content check too, or this
  // guard would never fire and the test would hang on the (never-rendered)
  // login form, i.e. the exact symptom this guard exists to catch.
  const notFoundCopy = await page
    .getByText(/tidak ditemukan|not found/i)
    .count()
    .catch(() => 0)
  const missing = !res || res.status() >= 400 || notFoundCopy > 0
  test.skip(missing, `fixture missing: ${path} (purged in the 2026-07-21 go-live wipe; needs a test database)`)
}
