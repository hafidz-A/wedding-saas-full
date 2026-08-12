import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { invitationRoot } from './support/invitation-page'

/**
 * L5 — accessibility scan (axe-core, WCAG 2.0/2.1 A + AA).
 *
 * Simple form pages are held to a strict bar (no critical OR serious). The
 * cinematic/3D invitation pages are gated on `critical` only, since some serious
 * contrast findings on art-directed surfaces are intentional — those are logged
 * (test output) rather than failed.
 */
async function violations(page: Page, url: string, include?: string) {
  await page.goto(url)
  // On a phone UA, invitation pages render inside the same-origin `?embed=1`
  // iframe (PhoneFrameView) — waiting on the top-level body only proves the
  // fixed-position wrapper exists, not that the invitation content mounted.
  // AxeBuilder itself already scans same-origin child frames, but scanning too
  // early (before the frame's content is up) makes the run vacuous.
  const root = await invitationRoot(page)
  await root.locator('body').waitFor()
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (include) builder = builder.include(include)
  const { violations } = await builder.analyze()
  return violations
}
const ids = (vs: { id: string; impact?: string | null }[]) =>
  vs.map((v) => `${v.id}(${v.impact})`).join(', ') || 'none'

test.describe('a11y — form pages (no critical or serious)', () => {
  // Offline/deterministic pages only. The per-slug dashboard login gate is the
  // same form pattern as /login but server-renders after a prod Supabase slug
  // lookup (flaky under load) — its render is covered in dashboard.spec.ts; we
  // keep the a11y suite fully offline here.
  for (const [name, url] of [
    ['login', '/login'],
    ['signup', '/signup'],
    ['forgot-password', '/forgot-password'],
    ['reset-password', '/reset-password?email=x%40example.com'],
    ['verify-signup', '/verify-signup?email=x%40example.com'],
  ] as const) {
    test(`${name}`, async ({ page }) => {
      // Scope to <main> for DETERMINISM. The shared SiteNav's LangToggle uses a
      // motion spring pill — scanning the nav mid-animation can transiently flag
      // the (now-fixed) contrast before the coral pill settles behind the label.
      // The fix itself is guarded deterministically in the LangToggle test below.
      const vs = await violations(page, url, 'main')
      const blocking = vs.filter((v) => v.impact === 'critical' || v.impact === 'serious')
      expect(blocking, `serious/critical a11y on ${name}: ${ids(blocking)}`).toEqual([])
      if (vs.length) console.log(`[a11y] ${name} non-blocking: ${ids(vs)}`)
    })
  }
})

test.describe('a11y — LangToggle contrast fix (regression guard)', () => {
  test('active language pill uses the AA-passing deeper coral', async ({ page }) => {
    await page.goto('/login')
    const label = page.locator('[class*="LangToggle_active"] [class*="LangToggle_btnLabel"]').first()
    await expect(label).toBeVisible()
    // Steady-state colors (deterministic, animation-independent): white #fff text
    // on the #C7402B pill = 5.0:1, clears WCAG AA (≥4.5:1). Regression-guards the
    // BUG-LEDGER fix without scanning the animated component with axe.
    const color = await label.evaluate((el) => getComputedStyle(el).color)
    const pillBg = await page
      .locator('[class*="LangToggle_pill"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)

    // Assert the PROPERTY, not a specific colour. The original guard pinned
    // rgb(199,64,43) and started failing the moment the pill was legitimately
    // moved onto --interactive-primary-hover (#C43F2A) by the design-system
    // work — a change that took contrast from 5.00:1 to 5.13:1. A guard that
    // cries wolf on an improvement teaches people to ignore it; this one only
    // fires when the ratio actually drops below AA.
    const ratio = contrastRatio(pillBg, color)
    expect(ratio, `active pill ${pillBg} on ${color} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
  })
})

/** WCAG 2.x relative luminance / contrast, for `rgb(r, g, b)` strings. */
function contrastRatio(a: string, b: string): number {
  const lum = (rgb: string) => {
    const [r, g, bl] = (rgb.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number)
    const ch = [r, g, bl].map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test.describe('a11y — invitation pages (no critical)', () => {
  for (const [name, url] of [
    ['lovebirds demo', '/lovebirds/demo-e2e'],
    ['solary demo', '/solary/demo-e2e'],
  ] as const) {
    test(`${name}`, async ({ page }) => {
      test.setTimeout(60_000)
      const vs = await violations(page, url)
      const critical = vs.filter((v) => v.impact === 'critical')
      expect(critical, `critical a11y on ${name}: ${ids(critical)}`).toEqual([])
      if (vs.length) console.log(`[a11y] ${name} all: ${ids(vs)}`)
    })
  }
})
