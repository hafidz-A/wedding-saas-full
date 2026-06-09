#!/usr/bin/env node
/**
 * scripts/encrypt-existing-data.mjs
 *
 * Tier-1 encryption backfill. Encrypts existing plaintext data under
 * APP_ENCRYPTION_KEY for the rows/columns added by
 * supabase/migrations/2026-05-31_encrypt_tier1.sql:
 *
 *   rsvps:              guest_name → guest_name_enc, message → message_enc
 *   gift_confirmations: guest_name → guest_name_enc, amount → amount_enc,
 *                       message → message_enc
 *   attendances:        re-encrypts any plaintext name_enc / note_enc written
 *                       in the Phase 2 → 3 window (detected, not assumed)
 *   invitations.config: re-saves each config through encryptConfig (wraps
 *                       sensitive leaves as { enc } — idempotent)
 *
 * Idempotent + safe to re-run: rows already encrypted are skipped (rsvps/gifts
 * by NULL _enc check; attendances + config by an isEncrypted/isEncNode probe).
 *
 * Usage:
 *   node scripts/encrypt-existing-data.mjs            # apply
 *   node scripts/encrypt-existing-data.mjs --dry-run  # report only, no writes
 *
 * Runbook position: apply migration step 1 → deploy code → RUN THIS → verify
 * → apply migration step 2 (drop plaintext). See the migration file header.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + APP_ENCRYPTION_KEY
 * from .env.local.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

/* ────────────────────────── env loader ────────────────────────── */

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

const DRY_RUN = process.argv.includes('--dry-run')

/* ────────────────────────── crypto (mirrors src/lib/crypto/app.ts) ────── */

const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

function loadKey(b64, name) {
  if (!b64) {
    console.error(`Missing ${name} in .env.local`)
    process.exit(1)
  }
  const key = Buffer.from(b64, 'base64')
  if (key.length !== KEY_LEN) {
    console.error(`${name} must decode to ${KEY_LEN} bytes (got ${key.length})`)
    process.exit(1)
  }
  return key
}

const APP_KEY = loadKey(process.env.APP_ENCRYPTION_KEY, 'APP_ENCRYPTION_KEY')

function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) return null
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, APP_KEY, iv)
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, ct, tag]).toString('base64')
}

/** Probe whether a string is already valid app-key ciphertext (no throw). */
function isEncrypted(payload) {
  if (payload === null || payload === undefined) return false
  try {
    const buf = Buffer.from(payload, 'base64')
    if (buf.length < IV_LEN + TAG_LEN) return false
    const iv = buf.subarray(0, IV_LEN)
    const tag = buf.subarray(buf.length - TAG_LEN)
    const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN)
    const d = createDecipheriv(ALG, APP_KEY, iv)
    d.setAuthTag(tag)
    Buffer.concat([d.update(ct), d.final()])
    return true
  } catch {
    return false
  }
}

/* ────────────────────────── config walker (mirrors src/lib/crypto/config.ts) ─ */

const GLOBAL_SENSITIVE_KEYS = new Set(['whatsappNumber', 'email'])

function accountSensitiveKeys(acc) {
  if ('accountNumber' in acc) return new Set(['accountNumber', 'accountHolder'])
  if ('number' in acc || 'bank' in acc) return new Set(['number', 'name'])
  return new Set(['accountNumber', 'accountHolder', 'number'])
}

function isEncNode(v) {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof v.enc === 'string' &&
    Object.keys(v).length === 1
  )
}

function encLeaf(v) {
  if (isEncNode(v)) return v
  if (typeof v === 'string' && v.length > 0) return { enc: encryptField(v) }
  return v
}

function shouldTransform(v) {
  return typeof v === 'string' || isEncNode(v)
}

function transformAccount(acc) {
  if (acc === null || typeof acc !== 'object' || Array.isArray(acc)) return walk(acc)
  const sensitive = accountSensitiveKeys(acc)
  const out = {}
  for (const [k, v] of Object.entries(acc)) {
    out[k] = sensitive.has(k) && shouldTransform(v) ? encLeaf(v) : walk(v)
  }
  return out
}

function walk(node) {
  if (Array.isArray(node)) return node.map(walk)
  if (node !== null && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      if (k === 'accounts' && Array.isArray(v)) out[k] = v.map(transformAccount)
      else if (GLOBAL_SENSITIVE_KEYS.has(k) && shouldTransform(v)) out[k] = encLeaf(v)
      else out[k] = walk(v)
    }
    return out
  }
  return node
}

function encryptConfig(config) {
  if (config === null || typeof config !== 'object') return config
  return walk(config)
}

/* ────────────────────────── supabase ────────────────────────── */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

console.log(DRY_RUN ? '— DRY RUN (no writes) —\n' : '— APPLYING —\n')

/* ────────────────────────── 1. rsvps ────────────────────────── */

async function backfillRsvps() {
  const { data, error } = await supabase.from('rsvps').select('*')
  if (error) {
    console.error('rsvps select failed (did you apply 2026-05-31_encrypt_tier1.sql?):', error.message)
    return
  }
  let n = 0
  for (const r of data || []) {
    if (r.guest_name_enc != null) continue // already encrypted
    if (r.guest_name == null && r.message == null) continue
    const patch = {
      guest_name_enc: encryptField(r.guest_name),
      message_enc: encryptField(r.message),
    }
    n++
    if (!DRY_RUN) {
      const { error: upErr } = await supabase.from('rsvps').update(patch).eq('id', r.id)
      if (upErr) console.error(`  rsvp ${r.id} update failed:`, upErr.message)
    }
  }
  console.log(`rsvps:              ${n} row(s) ${DRY_RUN ? 'would be' : ''} encrypted`)
}

/* ────────────────────────── 2. gift_confirmations ───────────── */

async function backfillGifts() {
  const { data, error } = await supabase.from('gift_confirmations').select('*')
  if (error) {
    console.error('gift_confirmations select failed:', error.message)
    return
  }
  let n = 0
  for (const g of data || []) {
    if (g.guest_name_enc != null) continue
    if (g.guest_name == null && g.amount == null && g.message == null) continue
    const patch = {
      guest_name_enc: encryptField(g.guest_name),
      amount_enc: encryptField(g.amount != null ? String(g.amount) : null),
      message_enc: encryptField(g.message),
    }
    n++
    if (!DRY_RUN) {
      const { error: upErr } = await supabase.from('gift_confirmations').update(patch).eq('id', g.id)
      if (upErr) console.error(`  gift ${g.id} update failed:`, upErr.message)
    }
  }
  console.log(`gift_confirmations: ${n} row(s) ${DRY_RUN ? 'would be' : ''} encrypted`)
}

/* ────────────────────────── 3. attendances ──────────────────── */

async function backfillAttendances() {
  const { data, error } = await supabase.from('attendances').select('id, name_enc, note_enc')
  if (error) {
    if (/does not exist|relation/i.test(error.message)) {
      console.log('attendances:        table not present — skipped')
      return
    }
    console.error('attendances select failed:', error.message)
    return
  }
  let n = 0
  for (const a of data || []) {
    const nameEnc = isEncrypted(a.name_enc)
    const noteEnc = a.note_enc == null ? true : isEncrypted(a.note_enc)
    if (nameEnc && noteEnc) continue // already ciphertext
    const patch = {}
    if (!nameEnc) patch.name_enc = encryptField(a.name_enc)
    if (!noteEnc) patch.note_enc = encryptField(a.note_enc)
    n++
    if (!DRY_RUN) {
      const { error: upErr } = await supabase.from('attendances').update(patch).eq('id', a.id)
      if (upErr) console.error(`  attendance ${a.id} update failed:`, upErr.message)
    }
  }
  console.log(`attendances:        ${n} row(s) ${DRY_RUN ? 'would be' : ''} re-encrypted`)
}

/* ────────────────────────── 4. invitations.config ───────────── */

async function backfillConfigs() {
  const { data, error } = await supabase.from('invitations').select('id, slug, config')
  if (error) {
    console.error('invitations select failed:', error.message)
    return
  }
  let n = 0
  for (const inv of data || []) {
    if (!inv.config || typeof inv.config !== 'object') continue
    const encrypted = encryptConfig(inv.config)
    if (JSON.stringify(encrypted) === JSON.stringify(inv.config)) continue // already encrypted / nothing sensitive
    n++
    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from('invitations')
        .update({ config: encrypted })
        .eq('id', inv.id)
      if (upErr) console.error(`  invitation ${inv.slug} update failed:`, upErr.message)
    }
  }
  console.log(`invitations.config: ${n} row(s) ${DRY_RUN ? 'would be' : ''} encrypted`)
}

/* ────────────────────────── 5. guestbook_notes (tier-2) ─────── */

async function backfillGuestbookNotes() {
  const { data, error } = await supabase.from('guestbook_notes').select('*')
  if (error) {
    if (/does not exist|relation|column/i.test(error.message)) {
      console.log('guestbook_notes:    columns not present — skipped')
      return
    }
    console.error('guestbook_notes select failed:', error.message)
    return
  }
  let n = 0
  for (const g of data || []) {
    if (g.guest_name_enc != null) continue // already encrypted
    if (g.guest_name == null && g.message == null) continue
    const patch = {
      guest_name_enc: encryptField(g.guest_name),
      message_enc: encryptField(g.message),
    }
    n++
    if (!DRY_RUN) {
      const { error: upErr } = await supabase.from('guestbook_notes').update(patch).eq('id', g.id)
      if (upErr) console.error(`  note ${g.id} update failed:`, upErr.message)
    }
  }
  console.log(`guestbook_notes:    ${n} row(s) ${DRY_RUN ? 'would be' : ''} encrypted`)
}

/* ────────────────────────── 6. playlist_songs (tier-2) ───────── */

async function backfillPlaylist() {
  const { data, error } = await supabase.from('playlist_songs').select('*')
  if (error) {
    if (/does not exist|relation|column/i.test(error.message)) {
      console.log('playlist_songs:     columns not present — skipped')
      return
    }
    console.error('playlist_songs select failed:', error.message)
    return
  }
  let n = 0
  for (const p of data || []) {
    if (p.suggested_by_enc != null) continue
    if (p.suggested_by == null) continue
    n++
    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from('playlist_songs')
        .update({ suggested_by_enc: encryptField(p.suggested_by) })
        .eq('id', p.id)
      if (upErr) console.error(`  song ${p.id} update failed:`, upErr.message)
    }
  }
  console.log(`playlist_songs:     ${n} row(s) ${DRY_RUN ? 'would be' : ''} encrypted`)
}

/* ────────────────────────── run ─────────────────────────────── */

await backfillRsvps()
await backfillGifts()
await backfillAttendances()
await backfillConfigs()
await backfillGuestbookNotes()
await backfillPlaylist()

console.log(`\n✓ ${DRY_RUN ? 'Dry run complete — re-run without --dry-run to apply.' : 'Backfill complete.'}`)
