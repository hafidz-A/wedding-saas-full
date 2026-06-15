#!/usr/bin/env node
/**
 * scripts/backfill-rsvp-tokens.mjs
 *
 * Generate a single-use RSVP token for every guest missing one. Idempotent:
 * skips rows that already have rsvp_token_hash. Run AFTER the
 * guests_rsvp_token migration is applied.
 *
 * Usage:
 *   node scripts/backfill-rsvp-tokens.mjs          # live run
 *   node scripts/backfill-rsvp-tokens.mjs --dry    # dry run (no DB writes)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY +
 * GUESTS_ENCRYPTION_KEY from .env.local.
 *
 * Crypto here MUST match src/lib/guests/token.ts (see backfill-parity.test.ts).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHmac, randomInt, createCipheriv, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

/* ────────────────────────── env loader (mirrors seed-dummy.mjs) ────────────────────────── */

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
    // optional — file may not exist in CI
  }
}

loadDotEnv('.env.local')

/* ────────────────────────── validate env ────────────────────────── */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEY_B64 = process.env.GUESTS_ENCRYPTION_KEY

if (!URL || !SERVICE || !KEY_B64) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GUESTS_ENCRYPTION_KEY')
  process.exit(1)
}

const KEY = Buffer.from(KEY_B64, 'base64')
if (KEY.length !== 32) {
  console.error('GUESTS_ENCRYPTION_KEY must decode to 32 bytes (got ' + KEY.length + ')')
  process.exit(1)
}

const DRY = process.argv.includes('--dry')

/* ────────────────────────── crypto (MUST match src/lib/guests/token.ts) ────────────────────────── */
// See backfill-parity.test.ts — these functions are the scriptHash/scriptEnc mirrors
// that are verified byte-identical to the runtime module.

const gen = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

// Derive HMAC sub-key exactly as hashToken() does in token.ts:
//   createHmac('sha256', masterKey).update('rsvp-token-hmac-v1').digest()
// Cache it: the master key is fixed for this run, so the sub-key never changes.
const hmacSub = createHmac('sha256', KEY).update('rsvp-token-hmac-v1').digest()

const hash = (invId, tok) =>
  createHmac('sha256', hmacSub).update(`${invId}:${tok}`).digest('hex')

// AES-256-GCM, on-disk format: base64(IV(12) ‖ ciphertext ‖ authTag(16))
// Matches encryptField / encryptWithKey in crypto.ts.
const enc = (tok) => {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([c.update(tok, 'utf8'), c.final()])
  return Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64')
}

/* ────────────────────────── main ────────────────────────── */

const db = createClient(URL, SERVICE, { auth: { persistSession: false } })

const { data: guests, error } = await db
  .from('guests')
  .select('id, invitation_id, rsvp_token_hash')
  .is('rsvp_token_hash', null)
  // Lift PostgREST's default ~1000-row cap so one run covers realistic guest
  // counts. (Re-running is safe/idempotent if a deployment ever exceeds this.)
  .limit(50_000)

if (error) {
  console.error('Failed to fetch guests:', error.message)
  process.exit(1)
}

console.log(`Guests needing a token: ${guests.length}${DRY ? ' (dry run)' : ''}`)

// Track hashes generated within this run to avoid intra-batch collisions.
// (Cross-run collisions are already prevented by the .is('rsvp_token_hash', null) filter
//  plus the conditional update .is('rsvp_token_hash', null) guard below.)
const seen = new Map() // invitation_id -> Set<hash>

let done = 0
let errs = 0
for (const g of guests) {
  const set = seen.get(g.invitation_id) ?? new Set()

  // Generate a token that doesn't collide within this run's batch.
  let tok = gen()
  let h = hash(g.invitation_id, tok)
  while (set.has(h)) {
    tok = gen()
    h = hash(g.invitation_id, tok)
  }
  set.add(h)
  seen.set(g.invitation_id, set)

  if (!DRY) {
    const { error: upErr } = await db
      .from('guests')
      .update({ rsvp_token_enc: enc(tok), rsvp_token_hash: h })
      .eq('id', g.id)
      // Idempotency guard: only write if still null (concurrent run protection)
      .is('rsvp_token_hash', null)

    if (upErr) {
      console.error(`Failed for guest ${g.id}:`, upErr.message)
      errs++
      continue
    }
  }

  done++
}

console.log(`${DRY ? 'Would update' : 'Updated'} ${done} guests.${errs ? ` ${errs} failed.` : ''}`)
// Non-zero exit on partial failure so an operator (or CI) notices.
process.exit(errs > 0 ? 1 : 0)
