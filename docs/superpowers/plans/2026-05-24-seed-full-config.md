# seed-full-config Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/seed-full-config.mjs` — a CLI that seeds the full 14-section template config into an existing invitation row, with all placeholder names/dates/venue replaced by the couple's real data and all sections enabled.

**Architecture:** The script deep-clones `src/config/pageConfig.js` via `import()`, runs targeted field-by-field replacements using pure helper functions, enables all sections, then calls Supabase `.update()` on the existing slug row. Pure transformation logic is extracted into a separate helper file so it can be unit-tested without Supabase.

**Tech Stack:** Node.js 24 (ESM), `@supabase/supabase-js`, `node:test` (built-in), `pageConfig.js` as template source.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/lib/config-transform.mjs` | Create | Pure functions: `deriveNames()`, `replaceSections()`, `enableAll()` |
| `scripts/lib/config-transform.test.mjs` | Create | Unit tests for the above using `node:test` |
| `scripts/seed-full-config.mjs` | Create | CLI entry point: arg parse → transform → Supabase update |

---

## Task 1: Pure transformation helpers + unit tests

**Files:**
- Create: `scripts/lib/config-transform.mjs`
- Create: `scripts/lib/config-transform.test.mjs`

- [ ] **Step 1.1: Create the helpers file (empty shell first)**

Create `scripts/lib/config-transform.mjs`:

```js
// scripts/lib/config-transform.mjs

/** Extract first name from a full name string. */
export function firstName(fullName) {
  return fullName.trim().split(/\s+/)[0]
}

/**
 * Derive all computed couple strings from raw inputs.
 * Returns: { coupleName, monogram, hashtag, formattedDate }
 */
export function deriveNames({ brideName, groomName, weddingDate }) {
  const bride = firstName(brideName)
  const groom = firstName(groomName)
  return {
    coupleName:    `${bride} & ${groom}`,
    monogram:      `${bride[0]} & ${groom[0]}`,
    hashtag:       `#${bride}And${groom}`,
    formattedDate: new Date(weddingDate).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
  }
}

/**
 * Apply couple-specific replacements to a deep-cloned config object.
 * Mutates and returns the config.
 */
export function replaceSections(config, { brideName, groomName, weddingDate, venue }) {
  const { coupleName, monogram, hashtag, formattedDate } = deriveNames({
    brideName, groomName, weddingDate,
  })

  for (const section of config.sections) {
    const p = section.props
    if (!p) continue

    switch (section.type) {
      case 'hero':
        p.coupleName  = coupleName
        p.brideName   = firstName(brideName)
        p.groomName   = firstName(groomName)
        p.weddingDate = weddingDate
        break

      case 'countdown':
        p.weddingDate = weddingDate
        break

      case 'ourStory': {
        // Only replace the last card's date (The Wedding Day).
        // Preceding story cards are creative placeholders — leave them.
        const stories = p.stories ?? p.cards ?? []
        if (stories.length > 0) {
          const last = stories[stories.length - 1]
          last.date = formattedDate
        }
        break
      }

      case 'eventDetails':
        if (Array.isArray(p.events)) {
          for (const ev of p.events) {
            if (ev.id === 'ceremony' || ev.id === 'reception') {
              ev.date     = formattedDate
              ev.location = venue || ev.location
            }
          }
        }
        break

      case 'brideGroom':
        if (Array.isArray(p.people)) {
          for (const person of p.people) {
            if (person.role === 'Bride') {
              person.name    = brideName
              person.parents = `Daughter of Mr. & Mrs. ${firstName(brideName)}`
            }
            if (person.role === 'Groom') {
              person.name    = groomName
              person.parents = `Son of Mr. & Mrs. ${firstName(groomName)}`
            }
          }
        }
        break

      case 'weddingGift':
        if (Array.isArray(p.accounts) && p.accounts.length > 0) {
          p.accounts[0].accountHolder = brideName
        }
        break

      case 'footer':
        p.coupleName = coupleName
        p.monogram   = monogram
        p.hashtag    = hashtag
        break
    }
  }

  // Update top-level meta
  config.meta = {
    title:       `${coupleName} — Our Wedding`,
    description: 'Cinematic wedding invitation experience',
  }

  return config
}

/**
 * Set enabled: true on every section in the config.
 * Mutates and returns the config.
 */
export function enableAll(config) {
  for (const section of config.sections) {
    section.enabled = true
  }
  return config
}
```

- [ ] **Step 1.2: Write failing unit tests**

Create `scripts/lib/config-transform.test.mjs`:

```js
// scripts/lib/config-transform.test.mjs
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { firstName, deriveNames, replaceSections, enableAll } from './config-transform.mjs'

describe('firstName', () => {
  it('extracts first word', () => {
    assert.equal(firstName('Nanda Putri Sari'), 'Nanda')
  })
  it('handles single name', () => {
    assert.equal(firstName('Nanda'), 'Nanda')
  })
  it('trims leading whitespace', () => {
    assert.equal(firstName('  Made Wirawan'), 'Made')
  })
})

describe('deriveNames', () => {
  const input = { brideName: 'Nanda Putri', groomName: 'Made Wirawan', weddingDate: '2026-11-15T16:00' }
  const result = deriveNames(input)

  it('coupleName is bride & groom first names', () => {
    assert.equal(result.coupleName, 'Nanda & Made')
  })
  it('monogram uses initials', () => {
    assert.equal(result.monogram, 'N & M')
  })
  it('hashtag combines first names', () => {
    assert.equal(result.hashtag, '#NandaAndMade')
  })
  it('formattedDate is a non-empty string', () => {
    assert.ok(result.formattedDate.length > 0)
    assert.match(result.formattedDate, /2026/)
  })
})

describe('replaceSections', () => {
  function makeConfig() {
    return {
      meta: {},
      sections: [
        { type: 'hero',      props: { coupleName: 'OLD', brideName: 'OLD', groomName: 'OLD', weddingDate: 'OLD' }, enabled: true },
        { type: 'countdown', props: { weddingDate: 'OLD' }, enabled: true },
        { type: 'ourStory',  props: { stories: [{ date: 'OLD', title: 'First' }, { date: 'OLD', title: 'Wedding Day' }] }, enabled: true },
        { type: 'eventDetails', props: { events: [{ id: 'ceremony', date: 'OLD', location: 'OLD' }, { id: 'dress-code', date: 'OLD', location: 'OLD' }] }, enabled: true },
        { type: 'brideGroom', props: { people: [{ role: 'Bride', name: 'OLD', parents: 'OLD' }, { role: 'Groom', name: 'OLD', parents: 'OLD' }] }, enabled: true },
        { type: 'weddingGift', props: { accounts: [{ accountHolder: 'OLD' }] }, enabled: true },
        { type: 'footer',    props: { coupleName: 'OLD', monogram: 'OLD', hashtag: 'OLD' }, enabled: true },
        { type: 'schedule',  props: { events: [] }, enabled: true },
      ],
    }
  }

  const args = { brideName: 'Nanda Putri', groomName: 'Made Wirawan', weddingDate: '2026-11-15T16:00', venue: 'Grand Ballroom' }
  const config = replaceSections(makeConfig(), args)

  it('replaces hero coupleName', () => assert.equal(config.sections[0].props.coupleName, 'Nanda & Made'))
  it('replaces hero brideName with first name only', () => assert.equal(config.sections[0].props.brideName, 'Nanda'))
  it('replaces countdown weddingDate', () => assert.equal(config.sections[1].props.weddingDate, '2026-11-15T16:00'))
  it('replaces only last ourStory card date', () => {
    assert.equal(config.sections[2].props.stories[0].date, 'OLD')   // unchanged
    assert.match(config.sections[2].props.stories[1].date, /2026/)  // replaced
  })
  it('replaces ceremony event location', () => assert.equal(config.sections[3].props.events[0].location, 'Grand Ballroom'))
  it('does not replace dress-code event location', () => assert.equal(config.sections[3].props.events[1].location, 'OLD'))
  it('replaces bride name in brideGroom', () => assert.equal(config.sections[4].props.people[0].name, 'Nanda Putri'))
  it('replaces first gift account holder', () => assert.equal(config.sections[5].props.accounts[0].accountHolder, 'Nanda Putri'))
  it('replaces footer hashtag', () => assert.equal(config.sections[6].props.hashtag, '#NandaAndMade'))
  it('does not crash on schedule (no special handling)', () => assert.ok(config.sections[7]))
  it('updates meta title', () => assert.equal(config.meta.title, 'Nanda & Made — Our Wedding'))
})

describe('enableAll', () => {
  it('sets enabled: true on all sections', () => {
    const config = { sections: [{ type: 'hero', enabled: false }, { type: 'gallery', enabled: false }] }
    enableAll(config)
    assert.ok(config.sections.every(s => s.enabled === true))
  })
})
```

- [ ] **Step 1.3: Run tests — expect them to PASS (helpers are already written)**

```powershell
node --test scripts/lib/config-transform.test.mjs
```

Expected: all tests pass (`✓` markers, `pass: 18`).

- [ ] **Step 1.4: Commit**

```powershell
git add scripts/lib/config-transform.mjs scripts/lib/config-transform.test.mjs
git commit -m "feat: add config-transform helpers for seed-full-config"
```

---

## Task 2: CLI entry point

**Files:**
- Create: `scripts/seed-full-config.mjs`

- [ ] **Step 2.1: Create the CLI script**

Create `scripts/seed-full-config.mjs`:

```js
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
import { fileURLToPath } from 'node:url'
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

const slug       = positional[0]
const brideName  = flags.bride
const groomName  = flags.groom
const weddingDate = flags.date
const venue      = flags.venue || ''

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

/* ── Supabase ── */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

/* ── Load full template config ── */
const { pageConfig } = await import(
  resolve(__dirname, '../src/config/pageConfig.js')
)
// Deep-clone so the imported module cache is never mutated.
const config = JSON.parse(JSON.stringify(pageConfig))

/* ── Transform ── */
replaceSections(config, { brideName, groomName, weddingDate, venue })
enableAll(config)

/* ── Upsert to Supabase ── */
const { data, error } = await supabase
  .from('invitations')
  .update({ config })
  .eq('slug', slug)
  .select('slug, is_published, plan')
  .single()

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
console.log('  public URL: ', `/${data.slug}`)
console.log('  dashboard:  ', `/${data.slug}/dashboard`)
console.log()
```

- [ ] **Step 2.2: Verify the script runs against a real slug**

First make sure you have a slug ready (create one if needed):

```powershell
node scripts/create-invitation.mjs made-nanda rahasia123 `
  --bride="Nanda Putri Sari" `
  --groom="Made Wirawan" `
  --date=2026-11-15T16:00 `
  --venue="The Grand Ballroom, Jakarta" `
  --email=made.nanda@gmail.com `
  --plan=premium
```

Then seed the full config:

```powershell
node scripts/seed-full-config.mjs made-nanda `
  --bride="Nanda Putri Sari" `
  --groom="Made Wirawan" `
  --date=2026-11-15T16:00 `
  --venue="The Grand Ballroom, Jakarta"
```

Expected output:
```
✓ Full config seeded for made-nanda

  bride:     Nanda Putri Sari
  groom:     Made Wirawan
  couple:    Nanda & Made
  date:      Sunday, 15 November 2026
  venue:     The Grand Ballroom, Jakarta
  sections:  14 (all enabled)
  plan:      premium

  public URL:  /made-nanda
  dashboard:   /made-nanda/dashboard
```

- [ ] **Step 2.3: Verify the invitation renders correctly in the browser**

```powershell
npm run dev
```

Open `http://localhost:3000/made-nanda`. Verify:
- Couple name shows "Nanda & Made" (not "Adi & Rani")
- Countdown target matches 2026-11-15
- All sections are visible (ourStory, brideGroom, gallery, accommodations, faq, playlist, etc.)
- No crashes or missing-section errors in the console

- [ ] **Step 2.4: Test error path — missing slug**

```powershell
node scripts/seed-full-config.mjs nonexistent-slug `
  --bride="X" --groom="Y" --date=2026-01-01
```

Expected: prints `Slug "nonexistent-slug" not found. Run create-invitation.mjs first.` and exits with code 1.

- [ ] **Step 2.5: Test error path — missing args**

```powershell
node scripts/seed-full-config.mjs
```

Expected: prints `Missing required: slug, brideName, groomName, weddingDate` and usage, exits 1.

- [ ] **Step 2.6: Commit**

```powershell
git add scripts/seed-full-config.mjs
git commit -m "feat: add seed-full-config script for full cinematic template"
```

---

## Task 3: Update CLAUDE.md to reflect new script

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 3.1: Update the How to test section in CLAUDE.md**

In `CLAUDE.md`, find the `## How to test the current scaffold` section and add the seed step:

```markdown
## How to test the current scaffold

\```powershell
cd c:\Users\arifi\Downloads\wedding-saas-next
npm install                                  # one-time, ~3 min
# Edit .env.local with Supabase URL + 2 keys
# Run supabase/schema.sql in Supabase SQL Editor first
node scripts/create-invitation.mjs adi-rani demo1234 \
  --bride="Rani Sastrawijaya" \
  --groom="Adi Pratama" \
  --date=2025-11-15T16:00 \
  --venue="The Grand Ballroom, Jakarta" \
  --email=demo@example.com \
  --plan=premium
node scripts/seed-full-config.mjs adi-rani \
  --bride="Rani Sastrawijaya" \
  --groom="Adi Pratama" \
  --date=2025-11-15T16:00 \
  --venue="The Grand Ballroom, Jakarta"
npm run dev
\```
```

- [ ] **Step 3.2: Commit**

```powershell
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with seed-full-config usage"
```

---

## Self-Review Notes

- **Spec coverage:** All requirements covered — arg parsing ✓, deep-clone ✓, targeted field replacements ✓, all sections enabled ✓, `.update()` (not upsert) ✓, clear error on missing slug ✓, success output ✓.
- **No placeholders:** All code blocks are complete and runnable.
- **Type consistency:** `replaceSections`, `enableAll`, `deriveNames` are defined in Task 1 and imported in Task 2 — names match exactly.
- **Test coverage:** Unit tests cover all exported functions including edge cases (single name, leading whitespace, last-card-only for ourStory, non-ceremony events untouched).
