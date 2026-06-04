#!/usr/bin/env node
/**
 * scripts/migrate-to-auth.mjs
 *
 * One-shot migration from the old bcrypt + per-slug cookie auth to
 * Supabase Auth. For each existing invitation row:
 *
 *   1. If owner_user_id already set → skip
 *   2. If no email → skip with warning (auth needs an email)
 *   3. Generate a random temporary password
 *   4. Call supabase.auth.admin.createUser({ email, password, email_confirm: true })
 *   5. Update invitations.owner_user_id with the new user.id
 *   6. Print a credentials summary the operator can hand to the couple
 *
 * Run AFTER:
 *   - schema.sql applied
 *   - migration-auth.sql applied
 *
 * Usage:
 *   node scripts/migrate-to-auth.mjs              # dry-run, prints actions
 *   node scripts/migrate-to-auth.mjs --apply      # actually do it
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
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

const apply = process.argv.includes('--apply')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

console.log(`Mode: ${apply ? 'APPLY (writing changes)' : 'DRY-RUN (no changes)'}\n`)

// Fetch all invitations
const { data: invitations, error } = await supabase
  .from('invitations')
  .select('id, slug, email, owner_user_id, password_hash')

if (error) {
  console.error('Fetch failed:', error.message)
  process.exit(1)
}

if (!invitations.length) {
  console.log('No invitations found. Nothing to migrate.')
  process.exit(0)
}

console.log(`Found ${invitations.length} invitation(s):\n`)

const results = []

for (const inv of invitations) {
  const tag = `[${inv.slug}]`

  if (inv.owner_user_id) {
    console.log(`${tag} ✓ already has owner_user_id (${inv.owner_user_id}) — skip`)
    continue
  }

  if (!inv.email) {
    console.log(`${tag} ✗ no email — skip (couple won't be able to log in until you set one)`)
    results.push({ slug: inv.slug, status: 'no-email' })
    continue
  }

  const tempPassword = generateTempPassword()

  if (!apply) {
    console.log(`${tag} → would create user for ${inv.email}, temp password: ${tempPassword}`)
    results.push({ slug: inv.slug, email: inv.email, tempPassword, status: 'would-migrate' })
    continue
  }

  // 1. Create the auth user
  console.log(`${tag} → creating Supabase Auth user…`)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: inv.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { slug: inv.slug, migrated: true },
  })

  let userId
  if (createErr) {
    if (/already.*registered|already.*exists|duplicate/i.test(createErr.message)) {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = list?.users?.find(
        (u) => u.email?.toLowerCase() === inv.email.toLowerCase(),
      )
      if (existing) {
        userId = existing.id
        console.log(`${tag}   user already exists — re-using ${userId}`)
        const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
        })
        if (updErr) console.warn(`${tag}   warning: could not reset password:`, updErr.message)
      } else {
        console.error(`${tag}   ✗ could not locate existing user`)
        results.push({ slug: inv.slug, status: 'lookup-failed' })
        continue
      }
    } else {
      console.error(`${tag}   ✗ create failed:`, createErr.message)
      results.push({ slug: inv.slug, status: 'create-failed' })
      continue
    }
  } else {
    userId = created.user.id
    console.log(`${tag}   user created: ${userId}`)
  }

  // 2. Update the invitation row
  const { error: updErr } = await supabase
    .from('invitations')
    .update({ owner_user_id: userId })
    .eq('id', inv.id)

  if (updErr) {
    console.error(`${tag}   ✗ update failed:`, updErr.message)
    results.push({ slug: inv.slug, status: 'update-failed', email: inv.email })
    continue
  }

  console.log(`${tag}   ✓ migrated`)
  results.push({ slug: inv.slug, email: inv.email, tempPassword, status: 'migrated' })
}

/* ────────────── summary ────────────── */

console.log('\n' + '═'.repeat(70))
console.log('SUMMARY')
console.log('═'.repeat(70))

const migrated = results.filter((r) => r.status === 'migrated')
const wouldMigrate = results.filter((r) => r.status === 'would-migrate')
const skipped = results.filter((r) => !['migrated', 'would-migrate'].includes(r.status))

if (wouldMigrate.length) {
  console.log(`\nDry-run — ${wouldMigrate.length} row(s) WOULD be migrated.`)
  console.log('Run again with --apply to actually do it.')
}

if (migrated.length) {
  console.log(`\n✓ ${migrated.length} couple(s) migrated. Credentials to share:\n`)
  for (const r of migrated) {
    console.log(`  ${r.slug}`)
    console.log(`    email:    ${r.email}`)
    console.log(`    password: ${r.tempPassword}`)
    console.log(`    login:    /${r.slug}/dashboard`)
    console.log('')
  }
  console.log('TIP: tell couples to change the password via /forgot-password after first login.')
}

if (skipped.length) {
  console.log(`\n⚠  ${skipped.length} row(s) skipped:`)
  for (const r of skipped) {
    console.log(`  ${r.slug} — ${r.status}`)
  }
}

console.log('')

function generateTempPassword() {
  // 12 hex chars = 48 bits, plenty for a temp credential the user resets later.
  // Affixes keep it policy-compliant (uppercase + number + symbol, min 8):
  // the hex supplies lowercase/digits, 'Tmp_' adds an uppercase + symbol, and
  // '#9' guarantees a symbol + digit even if the hex happens to be all letters.
  return 'Tmp_' + randomBytes(6).toString('hex') + '#9'
}
