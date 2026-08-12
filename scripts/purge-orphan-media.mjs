/**
 * purge-orphan-media.mjs — delete objects in the R2 `invitation-media` bucket
 * whose owning invitation row no longer exists, plus objects under a LIVE
 * invitation that its own config does not reference.
 *
 * Keys are `<invitation-id>/<timestamp>-<filename>`, so a prefix whose id is
 * absent from `invitations` is dead weight. Live invitations are never touched —
 * the check runs fresh against the DB, not a hardcoded list. Objects sitting at
 * the bucket root are left alone entirely.
 *
 * The second sweep (unreferenced-under-a-live-invitation) is the compensating
 * control for a gap R2 has and Supabase Storage didn't: no bucket-level size
 * cap. `/api/upload/verify` enforces the real ceiling, but the client calls
 * it, so a skipped `/verify` leaves an arbitrarily large, unreferenced object
 * behind. IMPORTANT: a freshly uploaded photo is unreferenced until the owner
 * saves the section it belongs to — never wire this sweep into an automatic
 * schedule without a grace period. Run it by hand, read the `~` list, and only
 * then `--apply`.
 *
 *   node scripts/purge-orphan-media.mjs            # dry run, lists what would go
 *   node scripts/purge-orphan-media.mjs --apply    # actually delete
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (to see which
 * invitations are alive) and R2_* (to list and delete) from .env.local.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'
import { parseObjectsFromListXml, nextContinuationToken, partitionOrphans } from './lib/orphan-media.mjs'
import { referencedMediaKeys } from './lib/referenced-keys.mjs'

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

const apply = process.argv.includes('--apply')
const need = (n) => {
  const v = process.env[n]
  if (!v) { console.error(`Missing ${n} in .env.local`); process.exit(1) }
  return v
}

const supabase = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})
const r2 = new AwsClient({
  service: 's3', region: 'auto',
  accessKeyId: need('R2_ACCESS_KEY_ID'),
  secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
})
const ENDPOINT = `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
const BUCKET = need('R2_BUCKET')
const objectUrl = (key) => `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`

const { data: live, error: liveErr } = await supabase.from('invitations').select('id, slug, config')
if (liveErr) {
  console.error('Cannot read invitations:', liveErr.message)
  process.exit(1)
}
const liveIds = new Set(live.map((r) => r.id))
console.log(`Live invitations: ${live.length} (${live.map((r) => r.slug).join(', ') || '—'})`)

// Follow the continuation token: a bucket over 1000 objects would otherwise
// look orphan-free past the first page.
const objects = []
let token = null
do {
  const url = new URL(`${ENDPOINT}/${BUCKET}`)
  url.searchParams.set('list-type', '2')
  url.searchParams.set('max-keys', '1000')
  if (token) url.searchParams.set('continuation-token', token)
  const res = await r2.fetch(url.toString(), { method: 'GET' })
  if (!res.ok) {
    console.error(`Cannot list bucket: R2 returned ${res.status}`)
    process.exit(1)
  }
  const xml = await res.text()
  objects.push(...parseObjectsFromListXml(xml))
  token = nextContinuationToken(xml)
} while (token)

const { kept, doomed, doomedBytes } = partitionOrphans(objects, liveIds)

console.log(`\nBucket : ${objects.length} object(s) in R2 "${BUCKET}"`)
console.log(`Keep   : ${kept.length} file(s) belonging to live invitations`)
console.log(`Orphan : ${doomed.length} file(s), ${(doomedBytes / 1024 / 1024).toFixed(1)} MB`)
for (const p of doomed) console.log(`  - ${p}`)

// Second sweep: objects under a LIVE invitation that its own config does not
// reference. R2 has no bucket-level size cap, so an upload whose /verify step
// was skipped survives at any size — and is, by definition, unreferenced. This
// is the compensating control for that gap.
const configByInv = new Map(live.map((r) => [r.id, r.config]))
const referencedByInv = new Map()
for (const [id, cfg] of configByInv) referencedByInv.set(id, referencedMediaKeys(cfg))

const unreferenced = []
let unreferencedBytes = 0
for (const key of kept) {
  const id = key.slice(0, key.indexOf('/'))
  if (!referencedByInv.get(id)?.has(key)) {
    unreferenced.push(key)
    unreferencedBytes += objects.find((o) => o.key === key)?.size ?? 0
  }
}

console.log(`Unref  : ${unreferenced.length} file(s) under live invitations, ${(unreferencedBytes / 1024 / 1024).toFixed(1)} MB`)
for (const p of unreferenced) console.log(`  ~ ${p}`)

const toDelete = [...doomed, ...unreferenced]
if (!toDelete.length) process.exit(0)

if (!apply) {
  console.log('\nDry run. Re-run with --apply to delete.')
  process.exit(0)
}

let removed = 0
for (const key of toDelete) {
  const res = await r2.fetch(objectUrl(key), { method: 'DELETE' })
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    console.error(`Delete failed for ${key}: ${res.status}`)
    process.exit(1)
  }
  removed++
}
console.log(`\nDeleted ${removed} object(s).`)
