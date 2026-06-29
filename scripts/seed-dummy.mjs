#!/usr/bin/env node
/**
 * scripts/seed-dummy.mjs
 *
 * One-shot dummy invitation for testing. Combines create-invitation +
 * mark-paid + sample data across every dashboard tab, so after one command
 * the dashboard (RSVP, Hadiah, Tamu, Buku Tamu, Ucapan) all have content.
 *
 * Adaptive to migration state — never crashes on a half-applied DB:
 *   - rsvps / gift_confirmations: writes _enc columns when they exist AND
 *     APP_ENCRYPTION_KEY is set; otherwise writes plaintext columns.
 *   - attendances (Buku Tamu): seeded only if the table exists; encrypted when
 *     APP_ENCRYPTION_KEY is set, plaintext otherwise.
 *   - guests: seeded only if GUESTS_ENCRYPTION_KEY is set (table is always
 *     encrypted). Walk-in attendances need guests, so they follow the same gate.
 *
 * Re-running is idempotent: existing rsvps/gifts/guests/attendances/notes for
 * the dummy invitation are wiped before re-seeding.
 *
 * Usage:
 *   node scripts/seed-dummy.mjs
 *   node scripts/seed-dummy.mjs --template=lovebirds
 *   node scripts/seed-dummy.mjs my-test MyTest123! --template=solary --lifetime
 *   node scripts/seed-dummy.mjs --no-seed            # empty invitation only
 *   node scripts/seed-dummy.mjs --draft              # unpaid gate state
 *   node scripts/seed-dummy.mjs --days=-1            # expired state
 *   node scripts/seed-dummy.mjs --plan=basic         # no Buku Tamu tab
 *
 * Flags:
 *   --template=solary|lovebirds   (default solary)
 *   --plan=basic|premium          (default premium → Buku Tamu tab shows)
 *   --lifetime | --draft | --days=N   payment state (default: paid, +365d)
 *   --no-seed                     create the invitation only, no sample data
 *   --slug=, --password=, --email=   override defaults
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (required) and
 * APP_ENCRYPTION_KEY + GUESTS_ENCRYPTION_KEY (optional) from .env.local.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createCipheriv, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { assertPasswordValid } from './lib/password-policy.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const VALID_TEMPLATES = ['lovebirds', 'solary']
const template = VALID_TEMPLATES.includes(flags.template) ? flags.template : 'solary'
const plan = flags.plan === 'basic' ? 'basic' : 'premium'
const slug = positional[0] || flags.slug || `dummy-${template}`
// Compliant by default (uppercase + number + symbol, min 8) — the password
// policy applies to dummy accounts too, no exceptions.
const password = positional[1] || flags.password || 'DemoTutorial123!'
const email = flags.email || `dummy+${slug}@example.com`
const seedData = flags.seed !== 'false' && flags['no-seed'] !== 'true'

// Reject a custom --password that doesn't meet the policy.
assertPasswordValid(password)

/* payment state — mirrors mark-paid.mjs */
let payState
if (flags.draft) payState = { is_paid: false, expires_at: null }
else if (flags.lifetime) payState = { is_paid: true, expires_at: null }
else {
  const days = Number(flags.days ?? 365)
  payState = { is_paid: true, expires_at: new Date(Date.now() + days * 86_400_000).toISOString() }
}

/* ────────────────────────── crypto (AES-256-GCM, mirrors app) ────── */

function makeEncryptor(b64, name) {
  if (!b64) return null
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) {
    console.warn(`⚠ ${name} is set but not 32 bytes — ignoring (will write plaintext where possible).`)
    return null
  }
  return (plaintext) => {
    if (plaintext === null || plaintext === undefined) return null
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
    return Buffer.concat([iv, ct, cipher.getAuthTag()]).toString('base64')
  }
}

const encApp = makeEncryptor(process.env.APP_ENCRYPTION_KEY, 'APP_ENCRYPTION_KEY')
const encGuests = makeEncryptor(process.env.GUESTS_ENCRYPTION_KEY, 'GUESTS_ENCRYPTION_KEY')

/* ────────────────────────── supabase ────────────────────────── */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

/** True if `column` exists on `table` (probes via a cheap select). */
async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)
  if (!error) return true
  if (error.code === '42703' || /column .* does not exist/i.test(error.message)) return false
  return true // other errors (RLS etc.) — assume present, let the insert surface it
}

/** True if `table` exists (probes via a cheap select). */
async function tableExists(table) {
  const { error } = await supabase.from(table).select('*').limit(1)
  if (!error) return true
  if (error.code === '42P01' || /relation .* does not exist|could not find the table/i.test(error.message)) {
    return false
  }
  return true
}

/* ────────────────────────── 1. auth user ────────────────────────── */

console.log(`→ Auth user for ${email}…`)
let userId
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { slug },
})
if (createErr) {
  if (/already.*registered|already.*exists|duplicate/i.test(createErr.message)) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!existing) {
      console.error(`  could not locate existing user ${email}`)
      process.exit(1)
    }
    userId = existing.id
    await supabase.auth.admin.updateUserById(existing.id, { password })
    console.log('  reusing existing user (password reset)')
  } else {
    console.error('Auth user create failed:', createErr.message)
    process.exit(1)
  }
} else {
  userId = created.user.id
  console.log(`  created (${userId})`)
}

/* ────────────────────────── 2. config ────────────────────────── */

async function loadTemplateConfig() {
  try {
    if (template === 'solary') {
      const mod = await import(
        pathToFileURL(resolve(__dirname, '../src/all-templates/solary/config/pageConfig.js')).href
      )
      return JSON.parse(JSON.stringify(mod.pageConfig || mod.default))
    }
    const mod = await import(
      pathToFileURL(resolve(__dirname, '../src/all-templates/lovebirds/defaultConfig.js')).href
    )
    return JSON.parse(JSON.stringify(mod.defaultConfig || mod.default))
  } catch (e) {
    console.warn('  could not load template default config, using minimal:', e.message)
    return { meta: { title: `${slug} — Dummy`, slug }, sections: [] }
  }
}

console.log(`→ Building ${template} config…`)
const config = await loadTemplateConfig()

/* ────────────────────────── 3. invitation row ────────────────────────── */

console.log('→ Upserting invitation…')
const { data: inv, error: invErr } = await supabase
  .from('invitations')
  .upsert(
    {
      slug,
      password_hash: 'supabase-auth-migrated',
      owner_user_id: userId,
      email,
      plan,
      template_id: template,
      is_published: true,
      config,
      ...payState,
    },
    { onConflict: 'slug' },
  )
  .select('id, slug, template_id, plan, is_paid, expires_at')
  .single()

if (invErr) {
  console.error('Upsert failed:', invErr.message)
  process.exit(1)
}
const invitationId = inv.id

/* ────────────────────────── 4. sample data ────────────────────────── */

const summary = { guests: 0, rsvps: 0, gifts: 0, attendances: 0, notes: 0 }

if (seedData) {
  console.log('→ Seeding sample data…')

  const hasGuests = !!encGuests && (await tableExists('guests'))
  const hasAttendances = await tableExists('attendances')
  const rsvpEnc = !!encApp && (await columnExists('rsvps', 'guest_name_enc'))
  const giftEnc = !!encApp && (await columnExists('gift_confirmations', 'guest_name_enc'))

  // Wipe existing rows for this invitation so re-seeding is clean.
  for (const table of ['attendances', 'rsvps', 'gift_confirmations', 'guestbook_notes', 'guests']) {
    if (table === 'guests' && !hasGuests) continue
    if (table === 'attendances' && !hasAttendances) continue
    await supabase.from(table).delete().eq('invitation_id', invitationId)
  }

  const NAMES = [
    { name: 'Budi Santoso', phone: '6281234500001', group: 'Keluarga' },
    { name: 'Siti Rahayu', phone: '6281234500002', group: 'Keluarga' },
    { name: 'Agus Wijaya', phone: '6281234500003', group: 'Kantor' },
    { name: 'Dewi Lestari', phone: '6281234500004', group: 'Kantor' },
    { name: 'Eko Prasetyo', phone: '6281234500005', group: 'Teman' },
    { name: 'Putri Handayani', phone: '6281234500006', group: 'Teman' },
  ]

  // ── guests ──
  const guestIdByName = {}
  if (hasGuests) {
    const rows = NAMES.map((g) => ({
      invitation_id: invitationId,
      name_enc: encGuests(g.name),
      phone_enc: encGuests(g.phone),
      group_label: g.group,
    }))
    const { data, error } = await supabase.from('guests').insert(rows).select('id, name_enc')
    if (error) console.warn('  guests insert failed:', error.message)
    else {
      summary.guests = data.length
      // map decrypted name → id isn't needed; pair by index since order is preserved
      data.forEach((row, i) => { guestIdByName[NAMES[i].name] = row.id })
    }
  } else {
    console.log('  (guests skipped — set GUESTS_ENCRYPTION_KEY + apply 20260527_guests.sql)')
  }

  // ── rsvps (first 4 attending, last 1 not) ──
  const rsvpPlan = [
    { name: 'Budi Santoso', attending: true, count: 2, msg: 'Selamat menempuh hidup baru!' },
    { name: 'Siti Rahayu', attending: true, count: 1, msg: 'Bahagia selalu ya 🤍' },
    { name: 'Agus Wijaya', attending: true, count: 3, msg: null },
    { name: 'Dewi Lestari', attending: true, count: 1, msg: 'Sampai ketemu di hari H!' },
    { name: 'Eko Prasetyo', attending: false, count: 1, msg: 'Maaf belum bisa hadir 🙏' },
  ]
  const rsvpIdByName = {}
  const rsvpRows = rsvpPlan.map((r) =>
    rsvpEnc
      ? {
          invitation_id: invitationId,
          guest_name_enc: encApp(r.name),
          attending: r.attending,
          guest_count: r.count,
          message_enc: encApp(r.msg),
        }
      : {
          invitation_id: invitationId,
          guest_name: r.name,
          attending: r.attending,
          guest_count: r.count,
          message: r.msg,
        },
  )
  {
    const { data, error } = await supabase.from('rsvps').insert(rsvpRows).select('id')
    if (error) console.warn('  rsvps insert failed:', error.message)
    else {
      summary.rsvps = data.length
      data.forEach((row, i) => { rsvpIdByName[rsvpPlan[i].name] = row.id })
    }
  }

  // ── gift_confirmations ──
  const giftPlan = [
    { name: 'Budi Santoso', account: 'BCA', amount: 500000, msg: 'Sedikit tanda kasih 🤍' },
    { name: 'Agus Wijaya', account: 'Mandiri', amount: 1000000, msg: null },
    { name: 'Dewi Lestari', account: 'BCA', amount: 250000, msg: 'Semoga langgeng!' },
  ]
  const giftRows = giftPlan.map((g) =>
    giftEnc
      ? {
          invitation_id: invitationId,
          guest_name_enc: encApp(g.name),
          account_used: g.account,
          amount_enc: encApp(String(g.amount)),
          currency: 'IDR',
          message_enc: encApp(g.msg),
        }
      : {
          invitation_id: invitationId,
          guest_name: g.name,
          account_used: g.account,
          amount: g.amount,
          currency: 'IDR',
          message: g.msg,
        },
  )
  {
    const { error } = await supabase.from('gift_confirmations').insert(giftRows)
    if (error) console.warn('  gifts insert failed:', error.message)
    else summary.gifts = giftRows.length
  }

  // ── attendances (Buku Tamu): one per attending RSVP + 2 walk-ins ──
  if (hasAttendances) {
    const encName = encApp ? (v) => encApp(v) : (v) => v // plaintext fallback (Phase 2 style)
    const attRows = []
    for (const r of rsvpPlan.filter((x) => x.attending)) {
      attRows.push({
        invitation_id: invitationId,
        rsvp_id: rsvpIdByName[r.name] ?? null,
        guest_id: null,
        name_enc: encName(r.name),
        guest_count: r.count,
        source: 'rsvp',
        note_enc: encName(r.msg),
        arrived_at: null,
      })
    }
    // Walk-ins: guests with no attending-RSVP row (Putri never RSVP'd; Eko
    // declined but showed up) — avoids a confusing duplicate in the ledger.
    for (const g of NAMES.filter((x) => x.name === 'Putri Handayani' || x.name === 'Eko Prasetyo')) {
      if (!guestIdByName[g.name]) continue
      attRows.push({
        invitation_id: invitationId,
        rsvp_id: null,
        guest_id: guestIdByName[g.name],
        name_enc: encName(g.name),
        guest_count: 1,
        source: 'walkin',
        note_enc: null,
        arrived_at: new Date().toISOString(),
      })
    }
    const { error } = await supabase.from('attendances').insert(attRows)
    if (error) console.warn('  attendances insert failed:', error.message)
    else summary.attendances = attRows.length
  } else {
    console.log('  (Buku Tamu skipped — apply supabase/migrations/2026-05-30_attendances.sql)')
  }

  // ── guestbook_notes (Ucapan) — encrypted since tier-2 (2026-06-09);
  //    plaintext fallback for DBs where the migration isn't applied yet ──
  const noteEnc = !!encApp && (await columnExists('guestbook_notes', 'guest_name_enc'))
  const notePlan = [
    { name: 'Budi Santoso', message: 'Bahagia selalu untuk kalian berdua!', color: 'gold' },
    { name: 'Siti Rahayu', message: 'Semoga menjadi keluarga sakinah 🤍', color: 'coral' },
    { name: 'Agus Wijaya', message: 'Barakallahu lakuma!', color: 'sky' },
    { name: 'Dewi Lestari', message: 'Selamat menempuh hidup baru!', color: 'emerald' },
  ]
  const noteRows = notePlan.map((n) =>
    noteEnc
      ? {
          invitation_id: invitationId,
          guest_name_enc: encApp(n.name),
          message_enc: encApp(n.message),
          color: n.color,
          is_approved: true,
        }
      : {
          invitation_id: invitationId,
          guest_name: n.name,
          message: n.message,
          color: n.color,
          is_approved: true,
        },
  )
  {
    const { error } = await supabase.from('guestbook_notes').insert(noteRows)
    if (error) console.warn('  notes insert failed:', error.message)
    else summary.notes = noteRows.length
  }
}

/* ────────────────────────── done ────────────────────────── */

console.log('\n✓ Dummy invitation ready\n')
console.log(`  slug        : ${inv.slug}`)
console.log(`  template    : ${inv.template_id}`)
console.log(`  plan        : ${inv.plan}${plan === 'premium' ? ' (Buku Tamu tab visible)' : ''}`)
console.log(`  is_paid     : ${inv.is_paid}`)
console.log(`  expires_at  : ${inv.expires_at ?? '(none — lifetime)'}`)
if (seedData) {
  console.log(`  seeded      : ${summary.rsvps} rsvps · ${summary.gifts} gifts · ${summary.guests} guests · ${summary.attendances} attendances · ${summary.notes} notes`)
}
console.log('')
console.log(`  Public      : /${inv.template_id}/${inv.slug}`)
console.log(`  Dashboard   : /${inv.template_id}/${inv.slug}/dashboard`)
console.log(`  Login       : ${email} / ${password}`)
console.log('')
