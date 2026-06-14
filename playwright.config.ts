import { defineConfig, devices } from '@playwright/test'

/**
 * E2E / visual / a11y harness for wedding-saas-next.
 *
 * GOTCHA (project): hanya SATU `next dev` boleh hidup — dua dev server merusak
 * `.next` (clientModules corruption). `reuseExistingServer: true` memastikan
 * Playwright TIDAK menjalankan server kedua kalau user sudah punya satu di :3000.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  // SERIAL (workers: 1). Wajib di sini: satu `next dev` melayani semua test, dan
  // route berat (shell sinematik lovebirds + scene 3D solary) cold-compile mahal.
  // Dua worker paralel membuat dev server choke → cascade timeout. Beberapa test
  // juga login ke Supabase prod (akun dummy) — serial menghindari rate-limit auth.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    // Pakai full chromium build (new headless) — hindari dependensi
    // chrome-headless-shell terpisah yang gagal di-download.
    channel: 'chromium',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // disk hemat — trace+screenshot sudah cukup untuk debug
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    // Cold `next dev` boot (terutama setelah `.next` dihapus) bisa lambat —
    // beri ruang. Lebih baik lagi: pre-warm server lalu reuse.
    timeout: 240_000,
  },
})
