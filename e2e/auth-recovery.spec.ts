import { test, expect, type Page } from '@playwright/test'

/**
 * L3 E2E — password-recovery & email-verification pages. Backend INTERCEPTED.
 */
const submit = (p: Page) => p.locator('button[type="submit"]')

test.describe('forgot-password', () => {
  test('renders the email form', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Lupa password?' })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('on success shows the "enter token" continuation (intercepted)', async ({ page }) => {
    await page.route('**/auth/v1/recover**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/forgot-password')
    await page.locator('input[type="email"]').fill('someone@example.com')
    await submit(page).click()
    await expect(page.getByRole('link', { name: /masukkan token/i })).toBeVisible()
  })
})

test.describe('verify-signup', () => {
  test('prefills the email from the query string', async ({ page }) => {
    await page.goto('/verify-signup?email=prefill%40example.com')
    await expect(page.locator('input[type="email"]')).toHaveValue('prefill@example.com')
  })

  test('the code field strips non-digits and caps at 6', async ({ page }) => {
    await page.goto('/verify-signup?email=x%40example.com')
    const code = page.locator('input[maxlength="6"]')
    await code.type('a1b2c3') // letters stripped → only the 3 digits remain
    await expect(code).toHaveValue('123')
    await code.fill('')
    await code.type('123456789') // maxLength caps the field at 6
    await expect(code).toHaveValue('123456')
  })

  test('shows an error for a wrong/expired code (intercepted 403)', async ({ page }) => {
    await page.route('**/auth/v1/verify**', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }),
      }),
    )
    await page.goto('/verify-signup?email=x%40example.com')
    await page.locator('input[maxlength="6"]').fill('000000')
    await submit(page).click()
    await expect(
      page.getByText(/expired|invalid/i).or(page.getByText('Kode salah atau sudah kadaluarsa')),
    ).toBeVisible()
  })
})

test.describe('reset-password', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/range/**', (route) => route.fulfill({ status: 200, body: '' }))
  })

  test('renders email + token + password fields', async ({ page }) => {
    await page.goto('/reset-password?email=x%40example.com')
    await expect(page.getByRole('heading', { name: 'Masukkan token' })).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(2) // new + confirm
  })

  test('live password checklist reacts to the new password', async ({ page }) => {
    await page.goto('/reset-password?email=x%40example.com')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('weak')
    await expect(page.locator('form ul li').filter({ hasText: 'Minimal 8 karakter' })).toContainText('○')
    await pw.fill('Abcdef1!')
    await expect(page.locator('form ul li').filter({ hasText: 'Minimal 8 karakter' })).toContainText('✓')
    await expect(page.locator('form ul li').filter({ hasText: 'simbol' })).toContainText('✓')
  })
})
