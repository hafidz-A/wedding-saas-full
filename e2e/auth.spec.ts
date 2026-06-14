import { test, expect, type Page } from '@playwright/test'

/**
 * L3 E2E — auth pages. Backend = INTERCEPT: every Supabase Auth / HIBP request
 * is stubbed via page.route, so NO real user is ever created and the tests are
 * deterministic & offline. Default UI language is `id` (no cookie).
 */

const email = (p: Page) => p.locator('input[type="email"]')
const submit = (p: Page) => p.locator('button[type="submit"]')

test.describe('login page', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Login akun' })).toBeVisible()
    await expect(email(page)).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(submit(page)).toBeVisible()
  })

  test('shows an error on invalid credentials (intercepted 400)', async ({ page }) => {
    await page.route('**/auth/v1/token**', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      }),
    )
    await page.goto('/login')
    await email(page).fill('wrong@example.com')
    await page.locator('input[type="password"]').fill('Abcdef1!')
    await submit(page).click()
    await expect(page.getByText('Email atau password salah.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/) // stayed put, no redirect
  })

  test('links to signup and forgot-password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Daftar di sini' }).click()
    await expect(page).toHaveURL(/\/signup/)
    await page.goto('/login')
    await page.getByRole('link', { name: 'Reset di sini' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})

test.describe('signup page', () => {
  // Stub HIBP (k-anonymity range API) so the live breach check never hits the
  // network and never flags our test password.
  test.beforeEach(async ({ page }) => {
    await page.route('**/range/**', (route) => route.fulfill({ status: 200, body: '' }))
  })

  const pw = (p: Page) => p.locator('input[type="password"]').first()
  const repeat = (p: Page) => p.locator('input[type="password"]').nth(1)
  const checklistItem = (p: Page, text: string) =>
    p.locator('form ul li').filter({ hasText: text })

  test('live password checklist turns each rule on as it is satisfied', async ({ page }) => {
    await page.goto('/signup')
    // weak: 3 chars, no upper/number/symbol → every rule unmet (○)
    await pw(page).fill('abc')
    await expect(checklistItem(page, 'Minimal 8 karakter')).toContainText('○')
    await expect(checklistItem(page, 'huruf besar')).toContainText('○')

    // strong: satisfies all four rules (✓)
    await pw(page).fill('Abcdef1!')
    await expect(checklistItem(page, 'Minimal 8 karakter')).toContainText('✓')
    await expect(checklistItem(page, 'huruf besar')).toContainText('✓')
    await expect(checklistItem(page, 'angka')).toContainText('✓')
    await expect(checklistItem(page, 'simbol')).toContainText('✓')
  })

  test('submit is disabled until both consents are checked', async ({ page }) => {
    await page.goto('/signup')
    await expect(submit(page)).toBeDisabled()
    await page.locator('#agree-privacy').check()
    await expect(submit(page)).toBeDisabled() // still missing refund consent
    await page.locator('#agree-refund').check()
    await expect(submit(page)).toBeEnabled()
  })

  test('rejects mismatched passwords client-side (no network)', async ({ page }) => {
    await page.goto('/signup')
    await email(page).fill('test@example.com')
    await pw(page).fill('Abcdef1!')
    await repeat(page).fill('Different9!')
    await page.locator('#agree-privacy').check()
    await page.locator('#agree-refund').check()
    await submit(page).click()
    await expect(page.getByText('Password dan ulangan password tidak sama')).toBeVisible()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('valid submit calls Supabase signUp and advances to verification', async ({ page }) => {
    let signupHit = false
    await page.route('**/auth/v1/signup**', (route) => {
      signupHit = true
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'newuser@example.com',
          created_at: new Date().toISOString(),
        }),
      })
    })
    await page.goto('/signup')
    await email(page).fill('newuser@example.com')
    await pw(page).fill('Abcdef1!')
    await repeat(page).fill('Abcdef1!')
    await page.locator('#agree-privacy').check()
    await page.locator('#agree-refund').check()
    await submit(page).click()
    // The form must POST to the signup endpoint…
    await expect.poll(() => signupHit, { timeout: 10_000 }).toBe(true)
    // …and route the user onward to the 6-digit verification screen.
    await expect(page).toHaveURL(/\/verify-signup/, { timeout: 10_000 })
  })
})
