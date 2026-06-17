import { test, type Page, type Locator } from '@playwright/test'

/**
 * Tutorial screenshot generator. Logs into the dummy dashboard for each template
 * and re-captures every image referenced by the Tutorial tab into
 * public/tutorial/<template>/<key>.png — with the red annotation callouts
 * re-applied as DOM overlays anchored to the real elements (so they stay aligned
 * even when the layout changes).
 *
 * Run:  npm run capture:tutorial         (both templates)
 * It is NOT part of the normal e2e suite (separate file, run on demand).
 */

const PASS = 'DemoTutorial123!'
const ACCOUNTS = {
  lovebirds: { slug: 'dummy-lovebirds', email: 'dummy+dummy-lovebirds@example.com' },
  solary: { slug: 'dummy-solary', email: 'dummy+dummy-solary@example.com' },
} as const

type Template = keyof typeof ACCOUNTS
type Side = 'top' | 'bottom' | 'left' | 'right'

interface Anno {
  /** A Playwright selector for the element the callout points at. */
  at: string
  label: string
  side?: Side
}

interface Shot {
  key: string
  /** capture height in CSS px from the top of the page (default 280 ≈ header+nav) */
  height?: number
  annos?: Anno[]
}

const VIEWPORT = { width: 1440, height: 1040 }

test.use({ viewport: VIEWPORT, deviceScaleFactor: 1, actionTimeout: 8_000 })
test.describe.configure({ mode: 'serial', retries: 0 })

async function login(page: Page, tpl: Template) {
  const { slug, email } = ACCOUNTS[tpl]
  await page.goto(`/${tpl}/${slug}/dashboard`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASS)
  await page.locator('button[type="submit"]').click()
  // Login form is replaced by the dashboard once the session lands.
  await page.locator('input[type="password"]').waitFor({ state: 'detached', timeout: 40_000 })
  await page.getByRole('heading', { name: slug }).waitFor({ timeout: 20_000 })
}

/** Click a top-level dashboard tab by its visible label. */
async function clickTab(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).first().click()
  await page.waitForTimeout(500)
}

/** Inject the red callout overlays anchored to live element boxes, then settle. */
async function annotate(page: Page, annos: Anno[]) {
  const items: { box: { x: number; y: number; width: number; height: number }; label: string; side: Side }[] = []
  for (const a of annos) {
    const loc: Locator = page.locator(a.at).first()
    const box = await loc.boundingBox({ timeout: 2500 }).catch(() => null)
    if (box) items.push({ box, label: a.label, side: a.side ?? 'bottom' })
  }
  const evalP = page.evaluate((data) => {
    document.getElementById('__tut_anno')?.remove()
    const layer = document.createElement('div')
    layer.id = '__tut_anno'
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;'
    const RED = '#E8553E'
    for (const it of data) {
      const { box, label, side } = it
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      const gap = 9
      const pill = document.createElement('div')
      pill.textContent = label
      pill.style.cssText =
        'position:fixed;background:' + RED + ';color:#fff;font-family:system-ui,-apple-system,sans-serif;' +
        'font-size:12px;font-weight:600;letter-spacing:.01em;padding:6px 12px;border-radius:999px;' +
        'box-shadow:0 6px 18px rgba(0,0,0,.28);white-space:nowrap;'
      const tri = document.createElement('div')
      tri.style.cssText = 'position:fixed;width:0;height:0;'
      const T = 6
      if (side === 'bottom') {
        pill.style.left = cx + 'px'; pill.style.top = box.y + box.height + gap + T + 'px'; pill.style.transform = 'translateX(-50%)'
        tri.style.left = cx + 'px'; tri.style.top = box.y + box.height + gap + 'px'; tri.style.transform = 'translateX(-50%)'
        tri.style.borderLeft = T + 'px solid transparent'; tri.style.borderRight = T + 'px solid transparent'
        tri.style.borderBottom = T + 'px solid ' + RED
      } else if (side === 'top') {
        pill.style.left = cx + 'px'; pill.style.top = box.y - gap - T + 'px'; pill.style.transform = 'translate(-50%,-100%)'
        tri.style.left = cx + 'px'; tri.style.top = box.y - gap - T + 'px'; tri.style.transform = 'translateX(-50%)'
        tri.style.borderLeft = T + 'px solid transparent'; tri.style.borderRight = T + 'px solid transparent'
        tri.style.borderTop = T + 'px solid ' + RED
      } else if (side === 'right') {
        pill.style.left = box.x + box.width + gap + T + 'px'; pill.style.top = cy + 'px'; pill.style.transform = 'translateY(-50%)'
        tri.style.left = box.x + box.width + gap + 'px'; tri.style.top = cy + 'px'; tri.style.transform = 'translateY(-50%)'
        tri.style.borderTop = T + 'px solid transparent'; tri.style.borderBottom = T + 'px solid transparent'
        tri.style.borderRight = T + 'px solid ' + RED
      } else {
        pill.style.left = box.x - gap - T + 'px'; pill.style.top = cy + 'px'; pill.style.transform = 'translate(-100%,-50%)'
        tri.style.left = box.x - gap - T + 'px'; tri.style.top = cy + 'px'; tri.style.transform = 'translateY(-50%)'
        tri.style.borderTop = T + 'px solid transparent'; tri.style.borderBottom = T + 'px solid transparent'
        tri.style.borderLeft = T + 'px solid ' + RED
      }
      layer.appendChild(tri)
      layer.appendChild(pill)
    }
    document.body.appendChild(layer)
  }, items)
  await Promise.race([
    evalP,
    new Promise((_, rej) => setTimeout(() => rej(new Error('annotate evaluate timed out (10s)')), 10_000)),
  ])
}

async function clearAnnotations(page: Page) {
  await page.evaluate(() => document.getElementById('__tut_anno')?.remove())
}

async function capture(page: Page, tpl: Template, shot: Shot) {
  if (shot.annos?.length) await annotate(page, shot.annos)
  await page.screenshot({
    path: `public/tutorial/${tpl}/${shot.key}.png`,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: shot.height ?? 280 },
  })
  await clearAnnotations(page)
}

/** Navigate to an editor sub-tab (clicks the Editor top-tab, then the sub-tab).
 *  Editor sub-tabs render as role="tab" (not button). */
async function goEditor(page: Page, subLabel: string) {
  await clickTab(page, 'Editor')
  await page.getByRole('tab', { name: subLabel, exact: true }).first().click()
  await page.waitForTimeout(700)
}

interface ShotDef extends Shot {
  go: (page: Page) => Promise<void>
}

/** Shots that show the dashboard nav/header and so went stale when the nav was
 *  consolidated (Palette/Music/Meta/Ornament moved UNDER Editor). Cropped detail
 *  shots + designed infographics (checklist/quickstart-roadmap, photos-map,
 *  editor-reorder, editor-gallery-rule, billing-*) don't show the nav and are
 *  left untouched. */
const A = {
  publish: { at: ':text-is("Terbit")', label: 'Status Terbit / Draf', side: 'bottom' as Side },
  viewLive: { at: 'a:has-text("Lihat live")', label: 'Cek tampilan tamu', side: 'bottom' as Side },
  csvRsvp: { at: 'button:has-text("Unduh CSV")', label: 'Unduh data RSVP', side: 'bottom' as Side },
  csvGift: { at: 'button:has-text("Unduh CSV")', label: 'Unduh data hadiah', side: 'bottom' as Side },
  csvBook: { at: 'button:has-text("Unduh CSV")', label: 'Ekspor buku tamu', side: 'bottom' as Side },
  paletteSel: { at: 'button[role="radio"][aria-checked="true"]', label: 'Palette terpilih', side: 'right' as Side },
  saveLeft: (label: string): Anno => ({ at: 'button:has-text("Simpan")', label, side: 'left' }),
}

const SHOTS: Record<Template, ShotDef[]> = {
  lovebirds: [
    { key: 'start-header', height: 175, go: (p) => clickTab(p, 'RSVP'), annos: [A.publish, A.viewLive] },
    { key: 'rsvps-table', height: 603, go: (p) => clickTab(p, 'RSVP'), annos: [A.csvRsvp] },
    { key: 'gifts-table', height: 597, go: (p) => clickTab(p, 'Hadiah'), annos: [A.csvGift] },
    { key: 'guests-share', height: 994, go: (p) => clickTab(p, 'Tamu'), annos: [{ at: 'button:has-text("Impor"), button:has-text("Import")', label: 'Impor daftar tamu', side: 'bottom' }] },
    { key: 'guestbook-ledger', height: 826, go: (p) => clickTab(p, 'Buku Tamu'), annos: [A.csvBook] },
    { key: 'editor-list', height: 760, go: (p) => goEditor(p, 'Bagian'), annos: [A.saveLeft('Simpan setelah mengatur bagian')] },
    { key: 'editor-save', height: 520, go: (p) => goEditor(p, 'Bagian'), annos: [A.saveLeft('Klik Simpan setiap selesai')] },
    { key: 'palette-grid', height: 780, go: (p) => goEditor(p, 'Palette'), annos: [A.paletteSel, A.saveLeft('Simpan pilihan')] },
    { key: 'music-upload', height: 780, go: (p) => goEditor(p, 'Musik'), annos: [A.saveLeft('Simpan musik')] },
    { key: 'ornament-pick', height: 760, go: (p) => goEditor(p, 'Ornamen'), annos: [A.saveLeft('Simpan ornamen')] },
  ],
  solary: [
    { key: 'start-header', height: 175, go: (p) => clickTab(p, 'RSVP'), annos: [A.publish, A.viewLive] },
    { key: 'rsvps-table', height: 603, go: (p) => clickTab(p, 'RSVP'), annos: [A.csvRsvp] },
    { key: 'gifts-table', height: 597, go: (p) => clickTab(p, 'Hadiah'), annos: [A.csvGift] },
    { key: 'guests-share', height: 914, go: (p) => clickTab(p, 'Tamu'), annos: [{ at: 'button:has-text("Impor"), button:has-text("Import")', label: 'Impor daftar tamu', side: 'bottom' }] },
    { key: 'guestbook-ledger', height: 826, go: (p) => clickTab(p, 'Buku Tamu'), annos: [A.csvBook] },
    { key: 'editor-list', height: 760, go: (p) => goEditor(p, 'Bagian'), annos: [A.saveLeft('Simpan setelah mengatur bagian')] },
    { key: 'editor-save', height: 520, go: (p) => goEditor(p, 'Bagian'), annos: [A.saveLeft('Klik Simpan setiap selesai')] },
    { key: 'palette-grid', height: 780, go: (p) => goEditor(p, 'Palette'), annos: [A.paletteSel, A.saveLeft('Simpan pilihan')] },
    { key: 'music-upload', height: 780, go: (p) => goEditor(p, 'Musik'), annos: [A.saveLeft('Simpan musik')] },
  ],
}

for (const tpl of ['lovebirds', 'solary'] as Template[]) {
  test(`capture ${tpl}`, async ({ page }) => {
    // On-demand only: the normal e2e suite must not log in / overwrite assets.
    test.skip(process.env.CAPTURE !== '1', 'Run via: npm run capture:tutorial')
    test.setTimeout(300_000)
    await login(page, tpl)
    for (const shot of SHOTS[tpl]) {
      await shot.go(page)
      await page.waitForTimeout(400)
      await capture(page, tpl, shot)
      console.log(`[capture] ${tpl}/${shot.key}.png`)
    }
  })
}
