#!/usr/bin/env node
/**
 * scripts/backfill-owner-user-id.mjs
 *
 * Fills owner_user_id on legacy invitations rows that pre-date the auth
 * migration but still have a recognizable `email`. Matches each row's
 * email against Supabase Auth's users list and links them. Safe to run
 * repeatedly — only updates rows where owner_user_id is currently NULL.
 *
 * Without this, the public route's owner-preview bypass cannot find an
 * owner for those rows, so the couple's own /<template>/<slug> URL
 * returns 404 even after they sign in.
 *
 * Usage:
 *   node scripts/backfill-owner-user-id.mjs
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
  } catch {}
}

loadDotEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: rows, error: fetchErr } = await supabase
  .from('invitations')
  .select('slug, email')
  .is('owner_user_id', null)

if (fetchErr) {
  console.error('Fetch failed:', fetchErr.message)
  process.exit(1)
}

if (!rows || rows.length === 0) {
  console.log('No rows to backfill — every invitation already has an owner_user_id.')
  process.exit(0)
}

const usersResp = await supabase.auth.admin.listUsers()
const byEmail = Object.fromEntries((usersResp.data?.users ?? []).map((u) => [u.email, u.id]))

let linked = 0
let skipped = 0
for (const r of rows) {
  const uid = r.email ? byEmail[r.email] : null
  if (!uid) {
    console.log(`  skip (no user)  ${r.slug}  email=${r.email ?? '(null)'}`)
    skipped += 1
    continue
  }
  const { error } = await supabase
    .from('invitations')
    .update({ owner_user_id: uid })
    .eq('slug', r.slug)
  if (error) {
    console.log(`  FAIL            ${r.slug}  ${error.message}`)
  } else {
    console.log(`  ✓               ${r.slug} → ${uid}`)
    linked += 1
  }
}

console.log('')
console.log(`Done. Linked ${linked}, skipped ${skipped} of ${rows.length} candidate rows.`)
