import { test, expect } from '@playwright/test'

/**
 * Fase 0 smoke — membuktikan harness E2E benar-benar hidup:
 * browser launch → dev server up → landing me-render konten nyata.
 * Assertion bersifat falsifiable (bukan tautologi): kalau landing 500 / kosong,
 * test ini HARUS merah.
 */
test('landing page renders with real content', async ({ page }) => {
  const response = await page.goto('/')
  expect(response, 'navigation harus dapat response').not.toBeNull()
  expect(response!.status(), 'landing tidak boleh 4xx/5xx').toBeLessThan(400)

  // <title> harus terisi (bukan string kosong)
  await expect(page).toHaveTitle(/.+/)

  // body terlihat dan punya teks nyata
  const body = page.locator('body')
  await expect(body).toBeVisible()
  const text = (await body.innerText()).trim()
  expect(text.length, 'body harus punya teks').toBeGreaterThan(0)
})

test('unknown slug returns not-found (tidak 500)', async ({ page }) => {
  const response = await page.goto('/lovebirds/__definitely-not-a-real-slug__')
  // boleh 404 atau halaman not-found yang di-render — yang penting BUKAN 5xx
  expect(response!.status(), 'slug tak dikenal tak boleh 5xx').toBeLessThan(500)
})
