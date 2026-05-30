#!/usr/bin/env node
/**
 * scripts/mark-paid.mjs
 *
 * Flip an invitation's payment status for testing without going through
 * Xendit. Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 * from .env.local.
 *
 * Usage:
 *   node scripts/mark-paid.mjs <slug>              # is_paid=true, expires in 365 days
 *   node scripts/mark-paid.mjs <slug> --lifetime   # is_paid=true, expires_at=null
 *   node scripts/mark-paid.mjs <slug> --days=30    # is_paid=true, expires in 30 days
 *   node scripts/mark-paid.mjs <slug> --days=-1    # is_paid=true, expired yesterday
 *   node scripts/mark-paid.mjs <slug> --draft      # is_paid=false (unpaid gate)
 *
 * After running:
 *   /<template>/<slug>/dashboard               → editor (or PaymentGate for draft/expired)
 *   /<template>/<slug>                         → public view (or expired screen)
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
  } catch {}
}

loadDotEnv('.env.local')

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

const slug = positional[0]
if (!slug) {
  console.error('Usage: node scripts/mark-paid.mjs <slug> [--lifetime|--days=N|--draft]')
  process.exit(1)
}

let nextValues
if (flags.draft) {
  nextValues = { is_paid: false, expires_at: null }
} else if (flags.lifetime) {
  nextValues = { is_paid: true, expires_at: null }
} else {
  const days = Number(flags.days ?? 365)
  if (!Number.isFinite(days)) {
    console.error(`Invalid --days=${flags.days}`)
    process.exit(1)
  }
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString()
  nextValues = { is_paid: true, expires_at: expiresAt }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await supabase
  .from('invitations')
  .update(nextValues)
  .eq('slug', slug)
  .select('slug, template_id, is_paid, expires_at, is_published')
  .maybeSingle()

if (error) {
  console.error('Update failed:', error.message)
  process.exit(1)
}
if (!data) {
  console.error(`No invitation found with slug="${slug}"`)
  process.exit(1)
}

console.log('✓ Updated invitation')
console.log(`  slug          : ${data.slug}`)
console.log(`  template      : ${data.template_id}`)
console.log(`  is_paid       : ${data.is_paid}`)
console.log(`  expires_at    : ${data.expires_at ?? '(none — lifetime)'}`)
console.log(`  is_published  : ${data.is_published}`)
console.log('')
console.log(`Dashboard: /${data.template_id}/${data.slug}/dashboard`)
console.log(`Public   : /${data.template_id}/${data.slug}`)
