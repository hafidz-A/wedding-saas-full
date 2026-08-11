/**
 * purge-orphan-media.mjs — delete files in the `invitation-media` bucket whose
 * owning invitation row no longer exists.
 *
 * Files are stored as `<invitation-id>/<timestamp>-<filename>`, so a folder
 * whose id is absent from `invitations` is dead weight. Live invitations are
 * never touched — the check is done fresh against the DB, not a hardcoded list.
 *
 *   node purge-orphan-media.mjs            # dry run, lists what would go
 *   node purge-orphan-media.mjs --apply    # actually delete
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const BUCKET = 'invitation-media'
const apply = process.argv.includes('--apply')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: live, error: liveErr } = await supabase.from('invitations').select('id, slug')
if (liveErr) {
  console.error('Cannot read invitations:', liveErr.message)
  process.exit(1)
}
const liveIds = new Set(live.map((r) => r.id))
console.log(`Live invitations: ${live.length} (${live.map((r) => r.slug).join(', ') || '—'})`)

const { data: folders, error: rootErr } = await supabase.storage
  .from(BUCKET)
  .list('', { limit: 1000 })
if (rootErr) {
  console.error('Cannot list bucket:', rootErr.message)
  process.exit(1)
}

const doomed = []
const kept = []
let doomedBytes = 0

for (const folder of folders) {
  if (folder.id !== null) continue // a file at bucket root, not a folder
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder.name, { limit: 1000 })
  if (error) {
    console.error(`  ! list ${folder.name}: ${error.message}`)
    continue
  }
  const target = liveIds.has(folder.name) ? kept : doomed
  for (const f of files) {
    target.push(`${folder.name}/${f.name}`)
    if (target === doomed) doomedBytes += f.metadata?.size ?? 0
  }
}

console.log(`\nKeep   : ${kept.length} file(s) belonging to live invitations`)
console.log(`Orphan : ${doomed.length} file(s), ${(doomedBytes / 1024 / 1024).toFixed(1)} MB`)
for (const p of doomed) console.log(`  - ${p}`)

if (!doomed.length) process.exit(0)

if (!apply) {
  console.log('\nDry run. Re-run with --apply to delete.')
  process.exit(0)
}

// remove() caps at 1000 paths per call
let removed = 0
for (let i = 0; i < doomed.length; i += 500) {
  const chunk = doomed.slice(i, i + 500)
  const { data, error } = await supabase.storage.from(BUCKET).remove(chunk)
  if (error) {
    console.error('Delete failed:', error.message)
    process.exit(1)
  }
  removed += data?.length ?? 0
}
console.log(`\nDeleted ${removed} file(s).`)
