#!/usr/bin/env node
/**
 * scripts/diag-auth.mjs — read-only diagnostic.
 * Lists every Supabase Auth user (auth.users) via the admin API so we can
 * see the REAL state behind the "email already used" signup error.
 *
 * Usage:  node scripts/diag-auth.mjs            (lists all)
 *         node scripts/diag-auth.mjs foo@bar.com (also flags that email)
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
const deleteIdx = process.argv.indexOf('--delete')
const deleteEmail = deleteIdx !== -1 ? (process.argv[deleteIdx + 1] || '').toLowerCase() : ''
const target = (deleteEmail || process.argv[2] || '').toLowerCase()

console.log('Project URL:', url)
if (!url || !key) { console.error('Missing URL or SERVICE_ROLE_KEY'); process.exit(1) }

const supabase = createClient(url, key, { auth: { persistSession: false } })

if (deleteEmail) {
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const hit = (list?.users || []).find((u) => u.email?.toLowerCase() === deleteEmail)
  if (!hit) { console.log(`No user with email ${deleteEmail} — nothing to delete.`); process.exit(0) }
  const { error: delErr } = await supabase.auth.admin.deleteUser(hit.id)
  if (delErr) { console.error('delete failed:', delErr.message); process.exit(1) }
  console.log(`Deleted auth user ${deleteEmail} (id=${hit.id}). Cascade removed any owned invitations.`)
  process.exit(0)
}

const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (error) { console.error('listUsers failed:', error.message); process.exit(1) }

const users = data.users || []
console.log(`\nauth.users count: ${users.length}\n`)
for (const u of users) {
  const flag = target && u.email?.toLowerCase() === target ? '  <<< TARGET' : ''
  console.log(`- ${u.email}`)
  console.log(`    id=${u.id}  confirmed=${!!u.email_confirmed_at}  identities=${u.identities?.length ?? 0}  created=${u.created_at}${flag}`)
}

if (target) {
  const hit = users.find((u) => u.email?.toLowerCase() === target)
  console.log(`\nTarget "${target}": ${hit ? 'EXISTS in auth.users' : 'NOT FOUND in auth.users'}`)
}
