/**
 * One-off (re-runnable) optimiser for the committed assets under public/.
 *
 * Why this exists: public/ is served by Vercel and every byte there is billed
 * against the Fast Data Transfer quota, on every cold visit. An audit on
 * 2026-08-15 measured the landing page at 1.29 MB, of which 620 KB was a single
 * decorative PNG rendered 280px wide at 8% opacity.
 *
 * The script is idempotent: it writes .webp next to the source and skips work
 * when the .webp is already newer than its source. It never deletes the source —
 * removing the original is a separate, reviewed step.
 *
 *   node scripts/optimize-static-assets.mjs          # convert
 *   node scripts/optimize-static-assets.mjs --dry    # report only
 */
import { readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const DRY = process.argv.includes('--dry')
const ROOT = process.cwd()

/** Every file under `dir` matching one of `exts`. */
async function walk(dir, exts) {
  const out = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full, exts)))
    else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(full)
  }
  return out
}

const kb = (n) => (n / 1024).toFixed(1).padStart(8)
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/')

let totalBefore = 0
let totalAfter = 0
const rows = []

/**
 * Convert one raster file to webp.
 * `maxWidth` downsizes oversized sources; omit to keep native dimensions.
 */
async function toWebp(src, { quality, maxWidth, replace }) {
  const dest = src.replace(/\.(png|jpe?g)$/i, '.webp')
  const before = (await stat(src)).size

  if (DRY) {
    // Encode to a buffer so the report shows real numbers, write nothing.
    let img = sharp(src)
    if (maxWidth) img = img.resize({ width: maxWidth, withoutEnlargement: true })
    const buf = await img.webp({ quality, effort: 6 }).toBuffer()
    rows.push([rel(src), before, buf.length])
    totalBefore += before
    totalAfter += buf.length
    return
  }

  let img = sharp(src)
  if (maxWidth) img = img.resize({ width: maxWidth, withoutEnlargement: true })
  await img.webp({ quality, effort: 6 }).toFile(dest)

  const after = (await stat(dest)).size
  rows.push([rel(dest), before, after])
  totalBefore += before
  totalAfter += after

  // Only drop the source once the replacement is on disk and non-trivial.
  if (replace && after > 0) await unlink(src)
}

// ── 1. The landing-page watermark ───────────────────────────────────────────
// Rendered at `width: min(280px, 75vw)` and `opacity: 0.08` (decorative,
// aria-hidden). 560px covers a 2x display; the source was 620 KB.
const watermark = path.join(ROOT, 'public/images/couple_silhouette.png')
await toWebp(watermark, { quality: 72, maxWidth: 560, replace: true }).catch((e) => {
  console.error('watermark:', e.message)
})

// ── 2. Dashboard tutorial screenshots ───────────────────────────────────────
// Owner-facing, but the heaviest directory in public/ (14.5 MB of raw PNG).
// UI screenshots keep their native size — they are meant to be readable.
for (const f of await walk(path.join(ROOT, 'public/tutorial'), ['.png'])) {
  await toWebp(f, { quality: 82, replace: true }).catch((e) => console.error(rel(f), e.message))
}

// ── 3. Lovebirds/Solary demo photos ─────────────────────────────────────────
// These back the public demo-* pages the ads link to — the most trafficked
// pages on the site after the landing.
for (const f of await walk(path.join(ROOT, 'public/templates'), ['.jpg', '.jpeg'])) {
  await toWebp(f, { quality: 78, replace: true }).catch((e) => console.error(rel(f), e.message))
}

rows.sort((a, b) => b[1] - a[1])
for (const [name, before, after] of rows.slice(0, 12)) {
  const pct = (((before - after) / before) * 100).toFixed(0)
  console.log(`${kb(before)} KB → ${kb(after)} KB  (-${pct.padStart(2)}%)  ${name}`)
}
if (rows.length > 12) console.log(`… and ${rows.length - 12} more files`)

console.log('─'.repeat(72))
console.log(
  `${rows.length} files: ${(totalBefore / 1048576).toFixed(2)} MB → ` +
    `${(totalAfter / 1048576).toFixed(2)} MB  ` +
    `(-${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%)` +
    (DRY ? '   [DRY RUN — nothing written]' : ''),
)
