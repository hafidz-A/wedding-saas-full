#!/usr/bin/env node
/**
 * scripts/seed-full-config.mjs
 *
 * Seeds the full cinematic template config into an existing invitation row,
 * replacing all placeholder names/dates/venue with the couple's real data.
 * All sections are set to enabled: true.
 *
 * Requires: the slug row must already exist (created via create-invitation.mjs).
 *
 * Usage:
 *   node scripts/seed-full-config.mjs <slug> \
 *     --bride="Nanda Putri Sari" \
 *     --groom="Made Wirawan" \
 *     --date=2026-11-15T16:00 \
 *     --venue="The Grand Ballroom, Jakarta"
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { replaceSections, enableAll, deriveNames } from './lib/config-transform.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ── env loader (same pattern as create-invitation.mjs) ── */
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
  } catch { /* optional */ }
}

loadDotEnv('.env.local')

/* ── arg parsing ── */
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

const slug        = positional[0]
const brideName   = flags.bride
const groomName   = flags.groom
const weddingDate = flags.date
const venue       = flags.venue || ''

const required = { slug, brideName, groomName, weddingDate }
const missing  = Object.entries(required).filter(([, v]) => !v).map(([k]) => k)
if (missing.length) {
  console.error(`Missing required: ${missing.join(', ')}\n`)
  console.error('Usage:')
  console.error('  node scripts/seed-full-config.mjs <slug> \\')
  console.error('    --bride="Bride Full Name" \\')
  console.error('    --groom="Groom Full Name" \\')
  console.error('    --date=2026-11-15T16:00 \\')
  console.error('    --venue="Venue name & address"')
  process.exit(1)
}

if (isNaN(new Date(weddingDate).getTime())) {
  console.error('Invalid --date value. Use ISO format: 2026-11-15T16:00')
  process.exit(1)
}

/* ── Supabase ── */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

/* ── Load full template config ── */
let config
try {
  const configPath = resolve(__dirname, '../src/all-templates/lovebirds/defaultConfig.js')
  const configUrl = pathToFileURL(configPath).href
  const { defaultConfig: pageConfig } = await import(configUrl)
  // Deep-clone so the imported module cache is never mutated.
  config = JSON.parse(JSON.stringify(pageConfig))
} catch (e) {
  console.error('Failed to load pageConfig:', e.message)
  process.exit(1)
}

/* ── Transform ── */
replaceSections(config, { brideName, groomName, weddingDate, venue })
enableAll(config)

/* ── Update Supabase ── */
const result = await supabase
  .from('invitations')
  .update({ config, template_id: 'lovebirds' })
  .eq('slug', slug)
  .select('slug, is_published, plan')
  .single()
const { data, error } = result

if (error) {
  // .single() returns PGRST116 when 0 rows matched — slug doesn't exist yet.
  if (error.code === 'PGRST116') {
    console.error(`\nSlug "${slug}" not found. Run create-invitation.mjs first.\n`)
  } else {
    console.error('Update failed:', error.message)
  }
  process.exit(1)
}

/* ── Success output ── */
const { coupleName, formattedDate } = deriveNames({ brideName, groomName, weddingDate })
const sectionCount = config.sections.length

console.log(`\n✓ Full config seeded for ${data.slug}\n`)
console.log('  bride:    ', brideName)
console.log('  groom:    ', groomName)
console.log('  couple:   ', coupleName)
console.log('  date:     ', formattedDate)
console.log('  venue:    ', venue || '(not set)')
console.log('  sections: ', `${sectionCount} (all enabled)`)
console.log('  plan:     ', data.plan)
console.log()
console.log('  public URL: ', `/lovebirds/${data.slug}`)
console.log('  dashboard:  ', `/lovebirds/${data.slug}/dashboard`)
console.log()

process.exit(0)
