#!/usr/bin/env node
/**
 * scripts/delete-account.mjs — delete an account end-to-end.
 *
 * Counterpart of seed-dummy.mjs: removes the auth user, every invitation they
 * own (rsvps / gifts / guests / attendances / notes cascade in the DB), and
 * the uploaded files under invitation-media/<invitation_id>/.
 *
 * DRY-RUN BY DEFAULT — prints what would be deleted. Add --yes to execute.
 *
 * Usage:
 *   node scripts/delete-account.mjs dummy+dummy-solary@example.com        # dry-run
 *   node scripts/delete-account.mjs dummy+dummy-solary@example.com --yes  # delete
 *   node scripts/delete-account.mjs --slug=dummy-solary --yes             # by slug
 *   node scripts/delete-account.mjs --slug=old-slug --yes --keep-storage  # skip files
 *
 * Targeting:
 *   <email> | --email=   delete the auth user + ALL invitations they own
 *   --slug=              resolve the invitation's owner, then same as above;
 *                        if the invitation is orphaned (no owner), deletes
 *                        just that invitation row (+ cascade + storage)
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

/* ────────────────────────── args ────────────────────────── */

const argv = process.argv.slice(2)
const positional = argv.filter((a) => !a.startsWith('--'))
const flags = Object.fromEntries(
  argv
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, '').split('=')
      return [k, rest.length ? rest.join('=') : 'true']
    }),
)

const email = (flags.email || (positional[0]?.includes('@') ? positional[0] : '')).toLowerCase()
const slug = flags.slug || (positional[0] && !positional[0].includes('@') ? positional[0] : '')
const execute = flags.yes === 'true'
const keepStorage = flags['keep-storage'] === 'true'

if (!email && !slug) {
  console.error('Usage: node scripts/delete-account.mjs <email> [--yes]')
  console.error('       node scripts/delete-account.mjs --slug=<slug> [--yes]')
  process.exit(1)
}
if (email && slug) {
  console.error('Give either an email or --slug, not both.')
  process.exit(1)
}

/* ────────────────────────── supabase ────────────────────────── */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const BUCKET = 'invitation-media'

/* ────────────────────────── resolve target ────────────────────────── */

async function findUserByEmail(target) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    console.error('listUsers failed:', error.message)
    process.exit(1)
  }
  return (data.users || []).find((u) => u.email?.toLowerCase() === target) || null
}

let user = null
let invitations = []

if (email) {
  user = await findUserByEmail(email)
  if (!user) {
    console.log(`No auth user with email ${email} — nothing to delete.`)
    process.exit(0)
  }
  const { data, error } = await supabase
    .from('invitations')
    .select('id, slug, template_id, plan, is_paid, owner_user_id')
    .eq('owner_user_id', user.id)
  if (error) {
    console.error('invitations lookup failed:', error.message)
    process.exit(1)
  }
  invitations = data || []
} else {
  const { data: inv, error } = await supabase
    .from('invitations')
    .select('id, slug, template_id, plan, is_paid, owner_user_id, email')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('invitation lookup failed:', error.message)
    process.exit(1)
  }
  if (!inv) {
    console.log(`No invitation with slug "${slug}" — nothing to delete.`)
    process.exit(0)
  }
  if (inv.owner_user_id) {
    const { data: byId, error: uErr } = await supabase.auth.admin.getUserById(inv.owner_user_id)
    if (uErr) {
      console.error('owner lookup failed:', uErr.message)
      process.exit(1)
    }
    user = byId.user
    // The owner may have more invitations than this slug — they all go.
    const { data: all } = await supabase
      .from('invitations')
      .select('id, slug, template_id, plan, is_paid, owner_user_id')
      .eq('owner_user_id', user.id)
    invitations = all || []
  } else {
    console.log(`Invitation "${slug}" has no owner (orphan) — will delete the row only.`)
    invitations = [inv]
  }
}

/* ────────────────────────── inventory ────────────────────────── */

async function countRows(table, invitationId) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('invitation_id', invitationId)
  if (error) return null // table may not exist on this DB — fine
  return count ?? 0
}

console.log('')
console.log(execute ? '⚠ DELETE MODE' : 'DRY RUN (add --yes to actually delete)')
console.log('')
if (user) {
  console.log(`Auth user : ${user.email}`)
  console.log(`            id=${user.id}  created=${user.created_at}`)
}
console.log(`Invitations owned: ${invitations.length}`)

const CHILD_TABLES = ['rsvps', 'gift_confirmations', 'guests', 'attendances', 'guestbook_notes']

for (const inv of invitations) {
  console.log(`\n  /${inv.template_id}/${inv.slug}  (plan=${inv.plan}, paid=${inv.is_paid})`)
  const parts = []
  for (const table of CHILD_TABLES) {
    const n = await countRows(table, inv.id)
    if (n !== null && n > 0) parts.push(`${n} ${table}`)
  }
  console.log(`    data    : ${parts.length ? parts.join(' · ') : '(none)'} — cascades with the invitation`)

  const { data: files } = await supabase.storage.from(BUCKET).list(inv.id, { limit: 1000 })
  const fileCount = files?.length ?? 0
  inv._files = (files || []).map((f) => `${inv.id}/${f.name}`)
  console.log(`    storage : ${fileCount} file(s) in ${BUCKET}/${inv.id}/${keepStorage ? ' — kept (--keep-storage)' : ''}`)
}

if (!execute) {
  console.log('\nNothing deleted. Re-run with --yes to execute.\n')
  process.exit(0)
}

/* ────────────────────────── delete ────────────────────────── */

console.log('\n→ Deleting…')

// 1. Storage first — files don't cascade and would be orphaned afterwards.
if (!keepStorage) {
  for (const inv of invitations) {
    if (!inv._files.length) continue
    const { error } = await supabase.storage.from(BUCKET).remove(inv._files)
    if (error) console.warn(`  storage cleanup failed for ${inv.slug}:`, error.message)
    else console.log(`  removed ${inv._files.length} file(s) for ${inv.slug}`)
  }
}

// 2. The auth user — owner_user_id is ON DELETE CASCADE, so every owned
//    invitation and all its child rows go with it (proven by diag-cascade.mjs).
if (user) {
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('  auth user delete failed:', error.message)
    process.exit(1)
  }
  console.log(`  deleted auth user ${user.email} (+ ${invitations.length} invitation(s) via cascade)`)
} else {
  // Orphan invitation — no user to cascade from, delete the row directly.
  for (const inv of invitations) {
    const { error } = await supabase.from('invitations').delete().eq('id', inv.id)
    if (error) {
      console.error(`  invitation delete failed for ${inv.slug}:`, error.message)
      process.exit(1)
    }
    console.log(`  deleted orphan invitation ${inv.slug}`)
  }
}

// 3. Verify nothing is left behind.
let leftovers = 0
for (const inv of invitations) {
  const { data } = await supabase.from('invitations').select('id').eq('id', inv.id).maybeSingle()
  if (data) {
    leftovers++
    console.warn(`  ⚠ invitation ${inv.slug} still exists — cascade migration may be missing`)
  }
}

if (leftovers) {
  console.error('\n✗ Some rows survived. Apply migrations/2026-06-03_owner_cascade.sql and re-run.')
  process.exit(1)
}

console.log('\n✓ Account deleted clean.\n')
