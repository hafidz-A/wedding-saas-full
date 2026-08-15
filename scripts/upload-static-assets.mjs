/**
 * upload-static-assets.mjs — push the site's own committed images to R2.
 *
 * These are NOT customer uploads. They are the demo photos behind the public
 * `demo-*` pages, the dashboard tutorial screenshots, and the landing
 * watermark — files that live in public/ and are therefore served by Vercel,
 * which meters both the bytes and the requests. R2 meters neither, so the same
 * files served from `media.fincards.land` cost nothing per visitor.
 *
 * Keys are written under `static/`, a prefix reserved in
 * scripts/lib/orphan-media.mjs so the media purge never mistakes them for a
 * dead invitation's leftovers.
 *
 * The app only follows these URLs once NEXT_PUBLIC_STATIC_ASSET_HOST is set;
 * until then `staticAsset()` keeps returning the local path, so uploading is
 * safe to do before the switch and the switch is safe to revert.
 *
 *   node scripts/upload-static-assets.mjs --dry     # list what would upload
 *   node scripts/upload-static-assets.mjs           # upload
 *   node scripts/upload-static-assets.mjs --verify  # re-fetch each key publicly
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative, extname } from 'node:path'
import { AwsClient } from 'aws4fetch'

function loadDotEnv(file) {
  try {
    const text = readFileSync(resolve(file), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, k, raw] = m
      if (process.env[k]) continue
      let v = raw.trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      process.env[k] = v
    }
  } catch {
    // optional
  }
}
loadDotEnv('.env.local')

const DRY = process.argv.includes('--dry')
const VERIFY = process.argv.includes('--verify')

const need = (n) => {
  const v = process.env[n]
  if (!v) {
    console.error(`Missing ${n} in .env.local`)
    process.exit(1)
  }
  return v
}

const ACCOUNT = need('R2_ACCOUNT_ID')
const BUCKET = need('R2_BUCKET')
const PUBLIC_HOST = need('R2_PUBLIC_HOST').replace(/\/+$/, '')
const r2 = new AwsClient({
  service: 's3',
  region: 'auto',
  accessKeyId: need('R2_ACCESS_KEY_ID'),
  secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
})

/** Directories under public/ whose contents the app resolves via staticAsset(). */
const DIRS = ['templates', 'tutorial', 'images']

const MIME = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
}

// Mirrors the Vercel-side rule in next.config.js. Deliberately not `immutable`:
// these filenames carry no content hash, so a replaced file reuses its URL.
const CACHE_CONTROL = 'public, max-age=2592000, stale-while-revalidate=604800'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const root = process.cwd()
const files = []
for (const d of DIRS) {
  const abs = join(root, 'public', d)
  try {
    statSync(abs)
  } catch {
    continue
  }
  files.push(...walk(abs))
}

const objectUrl = (key) =>
  `https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}/` +
  key.split('/').map(encodeURIComponent).join('/')

let uploaded = 0
let bytes = 0
let failed = 0

for (const file of files) {
  const rel = relative(join(root, 'public'), file).replace(/\\/g, '/')
  const key = `static/${rel}`
  const ext = extname(file).toLowerCase()
  const type = MIME[ext]

  if (!type) {
    console.log(`skip (unknown type) ${rel}`)
    continue
  }

  const body = readFileSync(file)

  if (DRY) {
    console.log(`would upload ${String((body.length / 1024).toFixed(1)).padStart(8)} KB  ${key}`)
    bytes += body.length
    uploaded++
    continue
  }

  const res = await r2.fetch(objectUrl(key), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': type, 'Cache-Control': CACHE_CONTROL },
  })

  if (!res.ok) {
    console.error(`FAIL ${res.status}  ${key}`)
    failed++
    continue
  }
  uploaded++
  bytes += body.length
  process.stdout.write(`\ruploaded ${uploaded}/${files.length}  `)
}

console.log(
  `\n${DRY ? 'would upload' : 'uploaded'} ${uploaded} file(s), ` +
    `${(bytes / 1048576).toFixed(2)} MB${failed ? `, ${failed} FAILED` : ''}`,
)
if (failed) process.exit(1)

if (VERIFY && !DRY) {
  // Fetch a sample back over the PUBLIC host — credentials prove the write
  // succeeded, but only an anonymous GET proves a guest can actually read it.
  console.log('\nVerifying over the public host…')
  let bad = 0
  const sample = files.filter((_, i) => i % Math.ceil(files.length / 8) === 0)
  for (const file of sample) {
    const rel = relative(join(root, 'public'), file).replace(/\\/g, '/')
    const url = `${PUBLIC_HOST}/static/${rel}`
    const res = await fetch(url, { method: 'HEAD' })
    const len = res.headers.get('content-length')
    const cc = res.headers.get('cache-control')
    const ok = res.ok && Number(len) === statSync(file).size
    if (!ok) bad++
    console.log(`  ${ok ? 'OK  ' : 'BAD '} ${res.status} ${String(len).padStart(8)} B  cc="${cc}"  ${rel}`)
  }
  if (bad) {
    console.error(`\n${bad} sample(s) failed to read back publicly.`)
    process.exit(1)
  }
  console.log('All sampled objects readable over the public host.')
}
