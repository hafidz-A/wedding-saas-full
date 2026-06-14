#!/usr/bin/env node
/**
 * scripts/verify-encryption-at-rest.mjs — L7 security verification against the
 * LIVE DB (read-only, dummy data only).
 *
 *   1. PII at-rest: a dummy-lovebirds guests/rsvps row's *_enc column is real
 *      AES-256-GCM ciphertext (base64 IV‖ct‖tag) that REVERSES with the domain
 *      key — never plaintext. (We don't print the decrypted value.)
 *   2. RLS: an anonymous client cannot read the PII tables at all.
 *
 * Run: node scripts/verify-encryption-at-rest.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv } from 'node:crypto'

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const guestsKey = Buffer.from(process.env.GUESTS_ENCRYPTION_KEY || '', 'base64')
const appKey = Buffer.from(process.env.APP_ENCRYPTION_KEY || '', 'base64')

if (!url || !serviceKey || !anonKey) {
  console.error('Missing Supabase env (.env.local) — cannot verify.')
  process.exit(2)
}

function decrypt(key, payload) {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(buf.length - 16)
  const ct = buf.subarray(12, buf.length - 16)
  const d = createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}
function looksEncrypted(v) {
  if (typeof v !== 'string' || v.length < 38) return false
  if (!/^[A-Za-z0-9+/]+=*$/.test(v)) return false
  return Buffer.from(v, 'base64').length >= 12 + 1 + 16
}

let failures = 0
const ok = (name, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) failures++ }

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data: inv } = await admin.from('invitations').select('id').eq('slug', 'dummy-lovebirds').maybeSingle()
if (!inv) { console.error('dummy-lovebirds invitation not found — seed it first.'); process.exit(2) }

console.log('PII at-rest (dummy-lovebirds, fake demo data):')
const { data: guests } = await admin.from('guests').select('name_enc, phone_enc').eq('invitation_id', inv.id).limit(1)
if (guests?.length) {
  const g = guests[0]
  ok('guests.name_enc is AES-GCM ciphertext (base64 IV‖ct‖tag)', looksEncrypted(g.name_enc))
  let pt = null
  try { pt = decrypt(guestsKey, g.name_enc) } catch {}
  ok('guests.name_enc REVERSES with GUESTS_ENCRYPTION_KEY', !!pt && pt.length > 0)
  ok('stored value ≠ plaintext (encrypted at rest)', g.name_enc !== pt)
} else {
  console.log('  • no guests rows on dummy-lovebirds (skipped)')
}

const { data: rsvps } = await admin.from('rsvps').select('guest_name_enc').eq('invitation_id', inv.id).limit(1)
if (rsvps?.length) {
  const r = rsvps[0]
  ok('rsvps.guest_name_enc is AES-GCM ciphertext', looksEncrypted(r.guest_name_enc))
  let pt = null
  try { pt = decrypt(appKey, r.guest_name_enc) } catch {}
  ok('rsvps.guest_name_enc REVERSES with APP_ENCRYPTION_KEY', !!pt && pt.length > 0)
} else {
  console.log('  • no rsvps rows on dummy-lovebirds (skipped)')
}

console.log('RLS (anonymous client must read no PII):')
const anon = createClient(url, anonKey, { auth: { persistSession: false } })
for (const tbl of ['guests', 'rsvps', 'gift_confirmations', 'attendances']) {
  const { data, error } = await anon.from(tbl).select('id').limit(5)
  ok(`anon SELECT ${tbl} → 0 rows${error ? ' (blocked)' : ''}`, !data || data.length === 0)
}

console.log(failures === 0 ? '\n✅ ALL AT-REST + RLS CHECKS PASSED' : `\n❌ ${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
