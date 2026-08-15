/**
 * measure-egress.mjs — what one cold visitor actually costs on Vercel.
 *
 * Vercel's Hobby plan meters BOTH bytes (100 GB Fast Data Transfer) and hits
 * (1M Edge Requests). On this project the requests run out roughly three times
 * sooner than the bytes, which is the opposite of the usual assumption — so a
 * change that only shrinks file sizes can look like a win and move the real
 * ceiling barely at all. This script reports both, split by host, so the
 * question is settled with numbers instead of intuition.
 *
 * Every URL gets a FRESH browser context, so nothing is served from cache and
 * the figures always describe a first-time visitor: the expensive case.
 *
 *   node scripts/measure-egress.mjs https://www.fincards.land/
 *   node scripts/measure-egress.mjs http://localhost:3000/ http://localhost:3000/lovebirds/demo-lovebirds
 *
 * Assets served from R2 (media.fincards.land) appear under their own host and
 * are NOT counted in the Vercel total — R2 bills neither egress nor requests.
 */
import { chromium } from '@playwright/test'

const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!targets.length) {
  console.error('usage: node scripts/measure-egress.mjs <url> [url...]')
  process.exit(1)
}

const VERCEL_HOBBY_REQUESTS = 1_000_000
const VERCEL_HOBBY_BYTES = 100 * 1024 ** 3

const browser = await chromium.launch()

for (const url of targets) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  const appHost = new URL(url).host
  const hosts = new Map()
  const bump = (key, bytes) => {
    const e = hosts.get(key) || { req: 0, bytes: 0 }
    e.req += 1
    e.bytes += bytes
    hosts.set(key, e)
  }

  page.on('response', async (res) => {
    if (res.url().startsWith('data:')) return
    let host
    try {
      host = new URL(res.url()).host
    } catch {
      return
    }
    let bytes = 0
    try {
      const s = await res.request().sizes()
      bytes = s.responseBodySize + s.responseHeadersSize
    } catch {
      // redirect or aborted request — no body to account for
    }
    const type = res.request().resourceType()
    let key
    if (host !== appHost) key = host
    else if (res.url().includes('/_next/')) key = 'VERCEL app code + fonts'
    else if (type === 'image' || type === 'media') key = 'VERCEL images (public/)'
    else key = 'VERCEL html/other'
    bump(key, bytes)
  })

  await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 })

  // Open the invitation gate, if this page has one.
  for (const label of [/buka undangan/i, /open invitation/i]) {
    const btn = page.getByRole('button', { name: label }).first()
    if (await btn.count().catch(() => 0)) {
      await btn.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(2500)
      break
    }
  }

  // Scroll in small steps so lazy images and ScrollTrigger sections all fire.
  // A single jump to the bottom skips most of them and under-reports badly.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.5)
    let y = 0
    for (let i = 0; i < 200; i++) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 350))
      if (y >= document.body.scrollHeight) break
      y += step
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 4000))
  })
  await page.waitForTimeout(2000)

  const imgs = await page.evaluate(() => {
    const all = [...document.querySelectorAll('img')]
    return { total: all.length, loaded: all.filter((i) => i.complete && i.naturalWidth > 0).length }
  })

  const rows = [...hosts.entries()].sort((a, b) => b[1].bytes - a[1].bytes)
  const vercel = rows
    .filter(([k]) => k.startsWith('VERCEL'))
    .reduce((a, [, v]) => ({ req: a.req + v.req, bytes: a.bytes + v.bytes }), { req: 0, bytes: 0 })

  console.log(`\n${'='.repeat(70)}\n${url}`)
  console.log(`images in DOM: ${imgs.total} | actually loaded: ${imgs.loaded}`)
  console.log('-'.repeat(70))
  for (const [k, v] of rows) {
    console.log(`${String(v.req).padStart(4)} req  ${(v.bytes / 1024).toFixed(1).padStart(9)} KB  ${k}`)
  }
  console.log('-'.repeat(70))
  console.log(
    `${String(vercel.req).padStart(4)} req  ${(vercel.bytes / 1024).toFixed(1).padStart(9)} KB  ` +
      `<-- METERED BY VERCEL`,
  )
  if (vercel.req && vercel.bytes) {
    const byReq = Math.floor(VERCEL_HOBBY_REQUESTS / vercel.req)
    const byBytes = Math.floor(VERCEL_HOBBY_BYTES / vercel.bytes)
    const binds = byReq < byBytes ? 'Edge Requests' : 'Fast Data Transfer'
    console.log(
      `Hobby headroom: ${byReq.toLocaleString()} visits (requests) · ` +
        `${byBytes.toLocaleString()} visits (bytes) — ${binds} binds first`,
    )
  }

  await ctx.close()
}

await browser.close()
