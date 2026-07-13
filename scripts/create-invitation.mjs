#!/usr/bin/env node
/**
 * scripts/create-invitation.mjs
 *
 * Onboard a new couple. Creates a Supabase Auth user (email + password)
 * via the admin API, then inserts the invitations row linking to that
 * user via owner_user_id. Replaces the old bcrypt+cookie auth model.
 *
 * Usage:
 *   node scripts/create-invitation.mjs <slug> <password> --bride="X" --groom="Y" \
 *     --date=2026-11-15T16:00 --venue="The Grand Ballroom" \
 *     --email=couple@gmail.com [--plan=premium] \
 *     [--template=lovebirds|solary] [--full]
 *
 * Example:
 *   node scripts/create-invitation.mjs adi-rani demo1234 \
 *     --bride="Rani Sastrawijaya" \
 *     --groom="Adi Pratama" \
 *     --date=2026-11-15T16:00 \
 *     --venue="The Grand Ballroom, Jakarta" \
 *     --email=adi@gmail.com \
 *     --plan=premium \
 *     --template=lovebirds --full
 *
 * Flags:
 *   --template=lovebirds|solary  pick the visual template (default: lovebirds)
 *   --full                       (lovebirds) seed the full 14-section template
 *                                instead of the 6-section starter
 *
 * After running, share with the couple (URLs are /<template>/<slug>):
 *   • Public URL:   /<template>/<slug>          (e.g. /lovebirds/adi-rani)
 *   • Dashboard:    /<template>/<slug>/dashboard
 *   • Login with:   their email + the password you set
 *   • Forgot pwd:   /forgot-password   (Supabase Auth handles the reset email)
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from .env.local.
 *
 * Prereqs:
 *   - schema.sql has been applied
 *   - supabase/migration-auth.sql has been applied (adds owner_user_id column)
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
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

/* ────────────────────────── arg parsing ─────────────────────────
   Two positional args (slug, password) followed by --key=value flags. */

const argv = process.argv.slice(2)
const positional = argv.filter((a) => !a.startsWith('--'))
const flags = Object.fromEntries(
  argv
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const eq = a.indexOf('=')
      if (eq === -1) return [a.slice(2), 'true']
      return [a.slice(2, eq), a.slice(eq + 1)]
    }),
)

const slug = positional[0]
const password = positional[1]
const brideName = flags.bride
const groomName = flags.groom
const weddingDate = flags.date
const venue = flags.venue || ''
const email = flags.email
const plan = flags.plan || 'free'
const VALID_TEMPLATES = ['lovebirds', 'solary']
const template = VALID_TEMPLATES.includes(flags.template) ? flags.template : 'lovebirds'
// --full       → seed the full 14-section cinematic template
// --starter    → use the minimal 6-section starter (default)
// --no-full    → same as --starter
const useFullConfig = flags.full === 'true' || (flags.full && flags.full !== 'false')
const wantStarter = flags.starter === 'true' || flags['no-full'] === 'true'
const seedFull = useFullConfig && !wantStarter

const required = { slug, password, brideName, groomName, weddingDate, email }
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k)
if (missing.length) {
  console.error(`Missing required: ${missing.join(', ')}\n`)
  console.error('Usage:')
  console.error('  node scripts/create-invitation.mjs <slug> <password> \\')
  console.error('    --bride="Bride Full Name" \\')
  console.error('    --groom="Groom Full Name" \\')
  console.error('    --date=2026-11-15T16:00 \\')
  console.error('    --venue="Venue name & address" \\')
  console.error('    --email=couple@gmail.com \\')
  console.error('    [--plan=free|basic|premium] \\')
  console.error('    [--template=lovebirds|solary]  # default = lovebirds')
  console.error('    [--full]              # (lovebirds) seed full 14-section template (default = 6-section starter)')
  process.exit(1)
}

// Enforce the account password policy (uppercase + number + symbol, min 8).
// admin.createUser bypasses Supabase's own policy, so this is the only guard.
assertPasswordValid(password)

/* ────────────────────────── supabase ────────────────────────── */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

/* ────────────────────────── 1. Create or find Supabase Auth user ──────
   admin.createUser is idempotent only by failure — if the email already
   has a user, we fetch and re-use that user id. */

console.log(`→ Creating Supabase Auth user for ${email}…`)

let userId
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,           // skip the confirmation email — operator already vetted
  user_metadata: { slug, brideName, groomName },
})

if (createErr) {
  // If user already exists, try to look it up and re-use the id.
  if (/already.*registered|already.*exists|duplicate/i.test(createErr.message)) {
    console.log('  (user already exists, looking up id…)')
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!existing) {
      console.error(`  could not locate existing user ${email}`)
      process.exit(1)
    }
    userId = existing.id
    // Optionally reset their password to match what was supplied.
    const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, { password })
    if (updErr) console.warn('  warning: could not update password:', updErr.message)
    else console.log('  password updated for existing user')
  } else {
    console.error('Auth user create failed:', createErr.message)
    process.exit(1)
  }
} else {
  userId = created.user.id
  console.log(`  user created (id: ${userId})`)
}

/* ────────────────────────── 2. Build config ──────────────────────
   Two flavors:
     --full      → load the cinematic 14-section template from
                    src/config/pageConfig.js, then replace
                    bride/groom/date/venue placeholders with the
                    couple's data (uses scripts/lib/config-transform.mjs)
     (default)   → minimal 6-section starter built inline below
*/

const coupleName = `${brideName} & ${groomName}`
const monogram = `${brideName.trim()[0]} & ${groomName.trim()[0]}`
// Canonical couple (single source of truth) uses FIRST names, matching the
// browser onboarding (seed-config.ts) and config-transform.mjs. The renderer
// injects these into Hero/Footer/OpeningGate + navbar + SEO title.
const firstNameOf = (s) => s.trim().split(/\s+/)[0]
const couple = { name1: firstNameOf(brideName), name2: firstNameOf(groomName) }

let config

if (template === 'solary') {
  console.log('→ Loading Solary (galactic) template config…')
  try {
    const cfgPath = resolve(__dirname, '../src/all-templates/solary/config/pageConfig.js')
    const mod = await import(pathToFileURL(cfgPath).href)
    config = JSON.parse(JSON.stringify(mod.pageConfig || mod.default))
    // Override the template's demo couple with this couple; SEO title derives
    // from couple + titleSuffix (no denormalized meta.title).
    config.couple = couple
    config.meta = { ...(config.meta || {}), titleSuffix: 'Our Wedding', slug }
    delete config.meta.title
    console.log(`  loaded ${config.sections.length} planet sections`)
  } catch (e) {
    console.error('Failed to load Solary config:', e.message)
    process.exit(1)
  }
}

if (!config && seedFull) {
  console.log('→ Loading full 14-section template…')
  try {
    const { replaceSections, enableAll } = await import(
      pathToFileURL(resolve(__dirname, 'lib/config-transform.mjs')).href
    )
    const configPath = resolve(__dirname, '../src/all-templates/lovebirds/defaultConfig.js')
    const { defaultConfig: pageConfig } = await import(pathToFileURL(configPath).href)
    config = JSON.parse(JSON.stringify(pageConfig))
    replaceSections(config, { brideName, groomName, weddingDate, venue })
    enableAll(config)
    console.log(`  loaded ${config.sections.length} sections`)
  } catch (e) {
    console.error('Failed to load full template:', e.message)
    console.error('Falling back to starter config…')
  }
}

if (!config) config = {
  couple,
  meta: {
    titleSuffix: 'Our Wedding',
    description: 'Cinematic wedding invitation',
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      theme: 'darkLuxury',
      props: {
        // Favicon initials shown in browser tab — couple can edit
        // this from the Hero section in the editor.
        monogram,
        coupleName,
        brideName,
        groomName,
        weddingDate,
        venue,
        welcomeText: 'Welcome, our dear guest',
        scrollHint: 'Scroll to enter',
        countdownEnabled: true,
        gateImage:
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80',
        blastPhotos: [
          'https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=500&q=80',
        ],
      },
    },
    {
      id: 'countdown',
      type: 'countdown',
      enabled: true,
      theme: 'warmCream',
      navLabel: 'Countdown',
      props: {
        weddingDate,
        eyebrow: 'Save the date',
        title: 'Menuju Hari Bahagia',
        subtitle: 'Hitung mundur sampai janji suci diucapkan',
        messageDuring: 'Hari ini, kami menikah! 💍',
        messageAfter: 'Terima kasih telah menjadi bagian dari kisah kami.',
        labels: { days: 'Hari', hours: 'Jam', minutes: 'Menit', seconds: 'Detik' },
        style: 'card',
      },
    },
    {
      id: 'eventDetails',
      type: 'eventDetails',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Event Details',
        subtitle: 'Join us as we celebrate the beginning of forever',
        events: [
          {
            id: 'ceremony',
            label: 'Ceremony',
            icon: 'rings',
            date: new Date(weddingDate).toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            time: '16:00 — 17:30',
            location: venue,
            accent: 'coral',
          },
          {
            id: 'reception',
            label: 'Reception',
            icon: 'champagne',
            date: new Date(weddingDate).toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            time: '19:00 — 23:00',
            location: venue,
            accent: 'emerald',
          },
        ],
        mapEmbed: '',
      },
    },
    {
      id: 'rsvp',
      type: 'rsvp',
      enabled: true,
      theme: 'warmCream',
      props: {
        title: 'Will You Join Us?',
        subtitle: 'Kindly respond by 1 month before the date',
        maxGuests: 5,
      },
    },
    {
      id: 'weddingGift',
      type: 'weddingGift',
      enabled: true,
      theme: 'warmCream',
      navLabel: 'Gift',
      props: {
        title: 'Wedding Gift',
        subtitle: 'Tanda kasih untuk perjalanan kami berikutnya',
        intro:
          'Kehadiran Anda adalah hadiah terbesar bagi kami. Namun bila Anda berkenan memberikan tanda kasih, kami menyediakan beberapa opsi berikut.',
        confirmationEnabled: true,
        accounts: [
          {
            id: 'bank-1',
            type: 'bank',
            name: 'Bank Name',
            accountNumber: '0000000000',
            accountHolder: brideName,
            accent: 'coral',
          },
        ],
        giftAddress: '',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      enabled: true,
      theme: 'warmCream',
      props: {
        monogram,
        hashtag: `#${brideName.trim().split(/\s+/)[0]}And${groomName.trim().split(/\s+/)[0]}`,
        message: 'Thank you for being part of our story.',
        coupleName,
        socials: [],
      },
    },
  ],
}

/* ────────────────────────── 3. Upsert invitation row ──────────────────
   password_hash is left as a placeholder during the bcrypt → Supabase Auth
   transition. Drop the column from schema after all rows are migrated. */

console.log('→ Upserting invitations row…')

const { data, error } = await supabase
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
    },
    { onConflict: 'slug' },
  )
  .select()
  .single()

if (error) {
  console.error('Insert failed:', error.message)
  if (error.message.includes('owner_user_id')) {
    console.error('\nHint: run supabase/migration-auth.sql first to add the owner_user_id column.')
  }
  process.exit(1)
}

console.log('\n✓ Invitation created/updated\n')
console.log('  slug:       ', data.slug)
console.log('  couple:     ', coupleName)
console.log('  date:       ', weddingDate)
console.log('  venue:      ', venue || '(not set)')
console.log('  email:      ', email)
console.log('  plan:       ', data.plan)
console.log('  template:   ', template)
console.log('  published:  ', data.is_published)
console.log('  sections:   ', `${config.sections.length}${seedFull ? ' (full template)' : ' (starter — add more via editor or run seed-full-config.mjs)'}`)
console.log('  user id:    ', userId)
console.log('  public URL: ', `/${template}/${data.slug}`)
console.log('  dashboard:  ', `/${template}/${data.slug}/dashboard`)
console.log('  login with: ', `${email} / ${password}`)
console.log('')

if (!seedFull) {
  console.log('TIP: re-run with --full to seed the cinematic 14-section template')
  console.log('     in one shot. Or do it separately:')
  console.log(`     node scripts/seed-full-config.mjs ${slug} --bride=... --groom=... --date=... --venue=...`)
  console.log('')
}
