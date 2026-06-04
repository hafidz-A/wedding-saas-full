#!/usr/bin/env node
/**
 * scripts/diag-db.mjs — read-only schema check.
 * Verifies the live DB has every column/table the code inserts into, so we
 * catch "column does not exist" before the app does.
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[k] = v
    }
  } catch {}
}
loadDotEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, key, { auth: { persistSession: false } })

// Columns the onboarding insert writes — every one must exist.
const REQUIRED = {
  invitations: ['id', 'slug', 'owner_user_id', 'email', 'password_hash', 'plan',
                'template_id', 'is_paid', 'is_published', 'config', 'xendit_invoice_id', 'xendit_external_id'],
  rsvps: ['id', 'invitation_id'],
  gift_confirmations: ['id', 'invitation_id'],
  guestbook_notes: ['id', 'invitation_id'],
  playlist_songs: ['id', 'invitation_id'],
  guests: ['id', 'invitation_id'],
  attendances: ['id', 'invitation_id'],
  template_plans: ['id'],
  plan_upgrades: ['id', 'invitation_id'],
  password_reset_tokens: ['id', 'invitation_id'],
  rate_limits: [],
}

let problems = 0
for (const [table, cols] of Object.entries(REQUIRED)) {
  const sel = cols.length ? cols.join(',') : '*'
  const { error } = await supabase.from(table).select(sel).limit(1)
  if (error) {
    problems++
    console.log(`✗ ${table}: ${error.message}`)
  } else {
    console.log(`✓ ${table} (${cols.length ? cols.join(', ') : 'exists'})`)
  }
}

const { count } = await supabase.from('invitations').select('*', { count: 'exact', head: true })
console.log(`\ninvitations row count: ${count ?? '?'}`)
console.log(problems ? `\n⚠  ${problems} table(s)/column(s) MISSING — DB not fully migrated.` : `\n✓ All required tables/columns present.`)
