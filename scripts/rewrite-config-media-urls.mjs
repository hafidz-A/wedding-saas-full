/**
 * One-off: rewrite Supabase media URLs stored in invitations.config so they
 * name the R2 public host directly, retiring the render-time host swap.
 *
 * Run ONLY after the R2 migration has been quiet long enough — this is the step
 * that makes the rewrite permanent. Idempotent: rows already pointing at R2 are
 * left alone and reported as skipped.
 *
 *   node scripts/rewrite-config-media-urls.mjs           # dry run
 *   node scripts/rewrite-config-media-urls.mjs --apply   # write
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadDotEnv(file) {
  try {
    for (const line of readFileSync(resolve(file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, k, raw] = m
      if (process.env[k]) continue
      let v = raw.trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[k] = v
    }
  } catch {}
}
loadDotEnv('.env.local')

const APPLY = process.argv.includes('--apply')
const need = (n) => { const v = process.env[n]; if (!v) { console.error(`Missing ${n} in .env.local`); process.exit(1) } return v }
const HOST = need('R2_PUBLIC_HOST').replace(/\/+$/, '')
const PREFIX = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media\//

const db = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})

/** Same shape as rewriteConfigMediaHosts, but writing the result back instead
 *  of applying it per render. */
const walk = (v) => {
  if (typeof v === 'string') {
    const m = PREFIX.exec(v)
    if (!m) return v
    const key = v.slice(m[0].length)
    return key ? `${HOST}/${key}` : v // a bare bucket URL addresses nothing
  }
  if (Array.isArray(v)) return v.map(walk)
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(v)) out[k] = walk(val)
    return out
  }
  return v
}

const { data: rows, error } = await db.from('invitations').select('id, slug, config')
if (error) { console.error(error.message); process.exit(1) }

let changed = 0
let skipped = 0
for (const row of rows) {
  const before = JSON.stringify(row.config ?? {})
  if (!before.includes('supabase.co/storage/v1/object/public/invitation-media')) { skipped++; continue }

  const next = walk(row.config)
  const after = JSON.stringify(next)
  if (after === before) { skipped++; continue }

  const hits = (before.match(/supabase\.co\/storage\/v1\/object\/public\/invitation-media/g) || []).length
  console.log(`${APPLY ? 'tulis ' : '[dry] '} ${row.slug} — ${hits} URL`)
  if (APPLY) {
    const { error: upErr } = await db.from('invitations').update({ config: next }).eq('id', row.id)
    if (upErr) { console.error(`  GAGAL ${row.slug}: ${upErr.message}`); process.exit(1) }
  }
  changed++
}

console.log(`\n${APPLY ? 'Ditulis' : 'Akan ditulis'} ${changed} baris, dilewati ${skipped}.`)
