/**
 * One-off: copy every object in the Supabase `invitation-media` bucket into the
 * R2 bucket under the same key. Idempotent — re-running overwrites with identical
 * bytes. Deliberately does NOT delete from Supabase: those originals are the
 * rollback for the render-time host rewrite.
 *
 * Usage:  node scripts/migrate-media-to-r2.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'

/** Same tiny .env.local reader every other script in this folder uses. */
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
  } catch {}
}

loadDotEnv('.env.local')

const DRY = process.argv.includes('--dry')
const need = (n) => {
  const v = process.env[n]
  if (!v) { console.error(`Missing ${n} in .env.local`); process.exit(1) }
  return v
}

const supabase = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'))
const SRC = 'invitation-media'

// The R2 side is resolved lazily so `--dry` works BEFORE the bucket exists —
// the whole point of the preview is to see what would be copied while the
// Cloudflare setup is still in progress.
let r2, ENDPOINT, BUCKET
function initR2() {
  r2 = new AwsClient({
    service: 's3', region: 'auto',
    accessKeyId: need('R2_ACCESS_KEY_ID'),
    secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
  })
  ENDPOINT = `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
  BUCKET = need('R2_BUCKET')
}

const objectUrl = (key) =>
  `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`

/** Supabase list() is one level deep, so walk folders explicitly. */
async function listAll(prefix = '') {
  const { data, error } = await supabase.storage.from(SRC).list(prefix, { limit: 1000 })
  if (error) throw error
  const out = []
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id === null) out.push(...(await listAll(path))) // folder
    else out.push({ path, size: entry.metadata?.size ?? 0 })
  }
  return out
}

if (!DRY) initR2()

const files = await listAll()
const totalBytes = files.reduce((n, f) => n + f.size, 0)
console.log(
  `Found ${files.length} object(s) in Supabase bucket "${SRC}"` +
    ` (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`,
)

let copied = 0, failed = 0
for (const f of files) {
  if (DRY) { console.log(`  [dry] ${f.path} (${f.size} B)`); continue }
  try {
    const { data, error } = await supabase.storage.from(SRC).download(f.path)
    if (error || !data) throw error ?? new Error('download returned no data')
    const body = new Uint8Array(await data.arrayBuffer())
    const res = await r2.fetch(objectUrl(f.path), {
      method: 'PUT',
      body,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        // Keys are timestamped and never rewritten, so an immutable one-year TTL
        // is safe — and it is what makes repeat guest views cost nothing.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
    if (!res.ok) throw new Error(`R2 PUT ${res.status}`)
    console.log(`  ok  ${f.path} (${body.length} B)`)
    copied++
  } catch (e) {
    console.error(`  FAIL ${f.path}: ${e.message}`)
    failed++
  }
}
console.log(`\nCopied ${copied}, failed ${failed}, total ${files.length}`)
if (failed) process.exit(1)
