# Post-R2 Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four loose ends left by the R2 migration release — an unrunnable security check, a purge script pointed at the wrong storage backend, untested security groundwork, and scratch artifacts in the repo root.

**Architecture:** No product behaviour changes. Three of the four tasks extract the pure, decidable part of a one-off script into `scripts/lib/` (the repo's existing convention alongside `config-transform.mjs` and `token-rules.mjs`), unit-test it, then rewire the script around it. The fourth is a file move.

**Tech Stack:** Node 24 ESM (`scripts/**.mjs`), vitest, `aws4fetch` (already a dependency), Supabase JS client.

## Global Constraints

- **Work directly on `main`.** No feature branch — this is the owner's explicit instruction.
- **No new dependencies.** `aws4fetch` and `@supabase/supabase-js` are already present; nothing else may be added.
- **Never seed dummy data into the production database.** The go-live wipe on 2026-07-21 removed `dummy-lovebirds` deliberately. Fix the script, not the data.
- **Never print decrypted PII**, not even in test output. The existing script's discipline of asserting on shape and reversibility without echoing plaintext is load-bearing.
- User-facing strings in Bahasa Indonesia; code and comments in English.
- `npm run typecheck` and `npm run test` must pass at the end of every task.
- Commit after each task. **Push only when the owner asks** — pushing `main` deploys to production.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `scripts/lib/encryption-shape.mjs` | **Create.** Pure predicate: does a stored string have the shape of AES-GCM ciphertext? | 1 |
| `scripts/lib/__tests__/encryption-shape.test.mjs` | **Create.** Tests for the above, including its documented false-positive. | 1 |
| `scripts/verify-encryption-at-rest.mjs` | **Modify.** Make the RLS half unconditional; skip the at-rest half gracefully. | 1 |
| `scripts/lib/orphan-media.mjs` | **Create.** Pure: parse an S3 listing, partition keys into kept/orphaned. | 2 |
| `scripts/lib/__tests__/orphan-media.test.mjs` | **Create.** Tests for the above. | 2 |
| `scripts/purge-orphan-media.mjs` | **Modify.** Read and delete against R2 instead of Supabase Storage. | 2 |
| `src/lib/legal/__tests__/sanitize.test.ts` | **Create.** Pin `sanitizeLegalHtml` behaviour before anything depends on it. | 3 |
| `docs/design/*.html` | **Move.** Four scratch artifacts out of the repo root. | 4 |

---

## Prerequisite: move onto `main`

The working tree is currently on `feat/live-preview-discoverability-part-2`, and local `main` is 93 commits behind `origin/main`. The tree is clean, and `origin/main` already contains every commit on the branch, so this is a fast-forward with nothing at risk.

- [ ] **Step 1: Switch and fast-forward**

```bash
git checkout main && git merge --ff-only origin/main && git log --oneline -1
```
Expected: `7d8a7cf docs(design): add the palette audit, cheatsheet and pricing comparison artifacts`

---

### Task 1: Make the security verification runnable

**Files:**
- Create: `scripts/lib/encryption-shape.mjs`
- Create: `scripts/lib/__tests__/encryption-shape.test.mjs`
- Modify: `scripts/verify-encryption-at-rest.mjs` (lines 53–57, 64–65, and the closing summary at 98–99)

**Interfaces:**
- Produces: `looksEncrypted(value: unknown): boolean`, imported by `verify-encryption-at-rest.mjs`. Nothing else consumes it.

**The defect being fixed.** `scripts/verify-encryption-at-rest.mjs:64-65` calls `process.exit(2)` when the `dummy-lovebirds` invitation is absent. That happens *before* the RLS section at lines 91–96 — which needs no seed data at all and is the more security-critical half, since it proves an anonymous client cannot read customer PII. One missing demo row therefore disables the entire check. The script already skips missing `guests` and `rsvps` rows gracefully (lines 76, 87); only the invitation lookup is treated as fatal, which is inconsistent with its own design.

A second, smaller defect: calling `process.exit()` while the Supabase client still holds open sockets triggers a libuv assertion on Windows (`!(handle->flags & UV_HANDLE_CLOSING)`). Setting `process.exitCode` and letting the event loop drain avoids it.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/__tests__/encryption-shape.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { looksEncrypted } from '../encryption-shape.mjs'

/** 12-byte IV + 5-byte ciphertext + 16-byte tag = 33 bytes, the smallest
 *  realistic AES-GCM payload this codebase produces. */
const CIPHERTEXT_SHAPED = Buffer.alloc(33, 1).toString('base64')

describe('looksEncrypted', () => {
  it('accepts a base64 payload long enough to hold IV + ciphertext + tag', () => {
    expect(looksEncrypted(CIPHERTEXT_SHAPED)).toBe(true)
  })

  it('rejects ordinary plaintext', () => {
    expect(looksEncrypted('Budi Santoso')).toBe(false)
    expect(looksEncrypted('+6281234567890')).toBe(false)
    expect(looksEncrypted('budi@example.com')).toBe(false)
  })

  it('rejects anything too short to be IV + tag', () => {
    expect(looksEncrypted(Buffer.alloc(20, 1).toString('base64'))).toBe(false)
    expect(looksEncrypted('SGVsbG8=')).toBe(false)
  })

  it('rejects non-strings and empties', () => {
    expect(looksEncrypted(null)).toBe(false)
    expect(looksEncrypted(undefined)).toBe(false)
    expect(looksEncrypted(42)).toBe(false)
    expect(looksEncrypted('')).toBe(false)
  })

  it('DOCUMENTED LIMIT: long letters-only plaintext passes the shape test', () => {
    // This is why the caller must ALSO prove the value decrypts with the real
    // key. Shape alone is necessary, never sufficient — a name with no spaces
    // or punctuation is itself valid base64.
    expect(looksEncrypted('NamaPanjangTanpaSpasiSamaSekaliYangLolosSaring')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/__tests__/encryption-shape.test.mjs`
Expected: FAIL — `Failed to resolve import "../encryption-shape.mjs"`.

- [ ] **Step 3: Implement the predicate**

Create `scripts/lib/encryption-shape.mjs`:

```js
/**
 * Shape test for a value stored in a `*_enc` column: base64 of at least
 * IV(12) + 1 byte of ciphertext + GCM tag(16).
 *
 * NECESSARY, NOT SUFFICIENT. Letters-only plaintext of the right length is
 * itself valid base64 and passes. Callers must also prove the value reverses
 * with the domain key — that decryption step is the real gate; this one only
 * catches obviously-plaintext values early and cheaply.
 */
export function looksEncrypted(value) {
  if (typeof value !== 'string' || value.length < 38) return false
  if (!/^[A-Za-z0-9+/]+=*$/.test(value)) return false
  return Buffer.from(value, 'base64').length >= 12 + 1 + 16
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/__tests__/encryption-shape.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Rewire the verification script**

In `scripts/verify-encryption-at-rest.mjs`, add the import next to the existing ones at the top:

```js
import { looksEncrypted } from './lib/encryption-shape.mjs'
```

Delete the local `looksEncrypted` definition (lines 53–57 of the current file):

```js
function looksEncrypted(v) {
  if (typeof v !== 'string' || v.length < 38) return false
  if (!/^[A-Za-z0-9+/]+=*$/.test(v)) return false
  return Buffer.from(v, 'base64').length >= 12 + 1 + 16
}
```

Replace the fatal lookup (lines 64–65):

```js
const { data: inv } = await admin.from('invitations').select('id').eq('slug', 'dummy-lovebirds').maybeSingle()
if (!inv) { console.error('dummy-lovebirds invitation not found — seed it first.'); process.exit(2) }
```

with a graceful skip that lets the rest of the file run:

```js
const { data: inv } = await admin
  .from('invitations')
  .select('id')
  .eq('slug', 'dummy-lovebirds')
  .maybeSingle()

// The at-rest half needs seeded demo rows; the RLS half below needs nothing.
// Missing demo data must NOT disable the RLS check — that check is what proves
// an anonymous visitor cannot read customer PII, and it is the reason this
// script exists. Seeding fake rows into the production DB to turn this green
// would be the wrong trade.
let atRestChecked = false
```

Then wrap the two at-rest blocks so they only run when `inv` exists. The `guests` block becomes:

```js
if (inv) {
  atRestChecked = true
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
} else {
  console.log('PII at-rest: SKIPPED — no dummy-lovebirds invitation in this database.')
  console.log('  (Seed one in a NON-production database to exercise it. Do not seed production.)')
}
```

Finally replace the summary (lines 98–99) so a pass can never overstate what ran:

```js
if (failures > 0) {
  console.log(`\n❌ ${failures} CHECK(S) FAILED`)
  process.exitCode = 1
} else if (atRestChecked) {
  console.log('\n✅ ALL AT-REST + RLS CHECKS PASSED')
} else {
  console.log('\n✅ RLS CHECKS PASSED — at-rest NOT verified (no demo data present)')
}
```

Note `process.exitCode` rather than `process.exit()`: the latter tears the process down while the Supabase client still holds sockets, which trips a libuv assertion on Windows.

- [ ] **Step 6: Run the script against the real database**

Run: `npm run verify:security`
Expected: the `PII at-rest: SKIPPED` line, then four `✓ anon SELECT … → 0 rows` lines, then `✅ RLS CHECKS PASSED — at-rest NOT verified`. Exit code 0, and **no libuv assertion**.

If any `anon SELECT` line shows `✗`, stop — that is a live RLS hole exposing customer PII, and it outranks everything else in this plan.

- [ ] **Step 7: Verify the whole suite and types**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all files pass (this adds one file).

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/encryption-shape.mjs scripts/lib/__tests__/encryption-shape.test.mjs scripts/verify-encryption-at-rest.mjs
git commit -m "fix(security): run the RLS checks even without demo data"
```

---

### Task 2: Point the orphan-media purge at R2

**Files:**
- Create: `scripts/lib/orphan-media.mjs`
- Create: `scripts/lib/__tests__/orphan-media.test.mjs`
- Modify: `scripts/purge-orphan-media.mjs` (whole body below the dotenv loader)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces, all consumed by `purge-orphan-media.mjs`:
  - `parseObjectsFromListXml(xml: string): Array<{ key: string, size: number }>`
  - `nextContinuationToken(xml: string): string | null`
  - `partitionOrphans(objects: Array<{key,size}>, liveIds: Set<string>): { kept: string[], doomed: string[], doomedBytes: number }`

The script currently lists and deletes through `supabase.storage`. Media now lands in R2, so as written it cleans the old store only. The DB half is unchanged — `invitations` still lives in Postgres, and the live-id check stays exactly as it is.

Two behaviours the Supabase version got for free and the S3 API does not:
- **Pagination.** `ListObjectsV2` caps at 1000 keys and signals more via `IsTruncated` + `NextContinuationToken`. Without following it, a bucket over 1000 objects would silently look like it has no orphans past the first page — the dangerous direction is the opposite, so this must be handled before any `--apply` run.
- **Batch delete.** There is no `remove([...])`; each key is its own `DELETE`.

Object keys are `<invitation-id>/<timestamp>-<safe-name>` and `safeStoragePath` in `src/lib/upload/media.ts` strips filenames to `[a-zA-Z0-9._-]`, so no key can contain XML-escaped characters. Parsing with a regex is safe here and needs no XML library.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/__tests__/orphan-media.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { parseObjectsFromListXml, nextContinuationToken, partitionOrphans } from '../orphan-media.mjs'

const LIVE = 'aaaaaaaa-1111-2222-3333-444444444444'
const DEAD = 'bbbbbbbb-5555-6666-7777-888888888888'

const XML = `<?xml version="1.0"?><ListBucketResult>
  <Contents><Key>${LIVE}/1784-track1.mp3</Key><Size>1000</Size></Contents>
  <Contents><Key>${DEAD}/1785-foto.webp</Key><Size>2500</Size></Contents>
  <Contents><Key>smoke-test.txt</Key><Size>7</Size></Contents>
</ListBucketResult>`

describe('parseObjectsFromListXml', () => {
  it('reads every key and size', () => {
    expect(parseObjectsFromListXml(XML)).toEqual([
      { key: `${LIVE}/1784-track1.mp3`, size: 1000 },
      { key: `${DEAD}/1785-foto.webp`, size: 2500 },
      { key: 'smoke-test.txt', size: 7 },
    ])
  })

  it('returns an empty array for an empty listing', () => {
    expect(parseObjectsFromListXml('<?xml version="1.0"?><ListBucketResult></ListBucketResult>')).toEqual([])
  })
})

describe('nextContinuationToken', () => {
  it('returns the token when the listing is truncated', () => {
    const xml = '<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>abc123</NextContinuationToken></ListBucketResult>'
    expect(nextContinuationToken(xml)).toBe('abc123')
  })

  it('returns null when the listing is complete', () => {
    expect(nextContinuationToken('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>')).toBe(null)
    expect(nextContinuationToken('<ListBucketResult></ListBucketResult>')).toBe(null)
  })
})

describe('partitionOrphans', () => {
  const objects = parseObjectsFromListXml(XML)

  it('keeps folders whose invitation still exists and dooms the rest', () => {
    const { kept, doomed, doomedBytes } = partitionOrphans(objects, new Set([LIVE]))
    expect(kept).toEqual([`${LIVE}/1784-track1.mp3`])
    expect(doomed).toEqual([`${DEAD}/1785-foto.webp`])
    expect(doomedBytes).toBe(2500)
  })

  it('NEVER dooms a key at the bucket root — it has no invitation id to judge by', () => {
    const { kept, doomed } = partitionOrphans(objects, new Set())
    expect(doomed).not.toContain('smoke-test.txt')
    expect(kept).not.toContain('smoke-test.txt')
  })

  it('dooms everything when no invitations are live', () => {
    const { doomed, doomedBytes } = partitionOrphans(objects, new Set())
    expect(doomed).toEqual([`${LIVE}/1784-track1.mp3`, `${DEAD}/1785-foto.webp`])
    expect(doomedBytes).toBe(3500)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/__tests__/orphan-media.test.mjs`
Expected: FAIL — `Failed to resolve import "../orphan-media.mjs"`.

- [ ] **Step 3: Implement the helpers**

Create `scripts/lib/orphan-media.mjs`:

```js
/**
 * Pure helpers for the orphan-media purge. Kept separate from the script so the
 * "which files die" decision is unit-tested — it is a destructive call, and the
 * S3 listing shape is the only thing standing between a live invitation's photos
 * and a delete loop.
 */

/** Every <Contents> entry of a ListObjectsV2 response, in listing order. */
export function parseObjectsFromListXml(xml) {
  const out = []
  for (const block of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(block[1])?.[1]
    const size = Number(/<Size>(\d+)<\/Size>/.exec(block[1])?.[1] ?? 0)
    if (key) out.push({ key, size })
  }
  return out
}

/** Continuation token when the listing is truncated, else null. */
export function nextContinuationToken(xml) {
  if (!/<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml)) return null
  return /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null
}

/**
 * Split objects by whether their `<invitation-id>/` prefix is still a live row.
 *
 * A key with no "/" sits at the bucket root and carries no invitation id, so it
 * is neither kept nor doomed — there is nothing to judge it by, and guessing
 * wrong deletes something a human put there on purpose.
 */
export function partitionOrphans(objects, liveIds) {
  const kept = []
  const doomed = []
  let doomedBytes = 0
  for (const o of objects) {
    const slash = o.key.indexOf('/')
    if (slash <= 0) continue
    if (liveIds.has(o.key.slice(0, slash))) {
      kept.push(o.key)
    } else {
      doomed.push(o.key)
      doomedBytes += o.size
    }
  }
  return { kept, doomed, doomedBytes }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/__tests__/orphan-media.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Rewrite the script against R2**

Replace everything in `scripts/purge-orphan-media.mjs` from the header comment down, keeping the `loadDotEnv` function exactly as it is:

```js
/**
 * purge-orphan-media.mjs — delete objects in the R2 `invitation-media` bucket
 * whose owning invitation row no longer exists.
 *
 * Keys are `<invitation-id>/<timestamp>-<filename>`, so a prefix whose id is
 * absent from `invitations` is dead weight. Live invitations are never touched —
 * the check runs fresh against the DB, not a hardcoded list. Objects sitting at
 * the bucket root are left alone entirely.
 *
 *   node scripts/purge-orphan-media.mjs            # dry run, lists what would go
 *   node scripts/purge-orphan-media.mjs --apply    # actually delete
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (to see which
 * invitations are alive) and R2_* (to list and delete) from .env.local.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'
import { parseObjectsFromListXml, nextContinuationToken, partitionOrphans } from './lib/orphan-media.mjs'
```

Keep `loadDotEnv` and its `loadDotEnv('.env.local')` call unchanged, then replace the body below it with:

```js
const apply = process.argv.includes('--apply')
const need = (n) => {
  const v = process.env[n]
  if (!v) { console.error(`Missing ${n} in .env.local`); process.exit(1) }
  return v
}

const supabase = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})
const r2 = new AwsClient({
  service: 's3', region: 'auto',
  accessKeyId: need('R2_ACCESS_KEY_ID'),
  secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
})
const ENDPOINT = `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
const BUCKET = need('R2_BUCKET')
const objectUrl = (key) => `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`

const { data: live, error: liveErr } = await supabase.from('invitations').select('id, slug')
if (liveErr) {
  console.error('Cannot read invitations:', liveErr.message)
  process.exit(1)
}
const liveIds = new Set(live.map((r) => r.id))
console.log(`Live invitations: ${live.length} (${live.map((r) => r.slug).join(', ') || '—'})`)

// Follow the continuation token: a bucket over 1000 objects would otherwise
// look orphan-free past the first page.
const objects = []
let token = null
do {
  const url = new URL(`${ENDPOINT}/${BUCKET}`)
  url.searchParams.set('list-type', '2')
  url.searchParams.set('max-keys', '1000')
  if (token) url.searchParams.set('continuation-token', token)
  const res = await r2.fetch(url.toString(), { method: 'GET' })
  if (!res.ok) {
    console.error(`Cannot list bucket: R2 returned ${res.status}`)
    process.exit(1)
  }
  const xml = await res.text()
  objects.push(...parseObjectsFromListXml(xml))
  token = nextContinuationToken(xml)
} while (token)

const { kept, doomed, doomedBytes } = partitionOrphans(objects, liveIds)

console.log(`\nBucket : ${objects.length} object(s) in R2 "${BUCKET}"`)
console.log(`Keep   : ${kept.length} file(s) belonging to live invitations`)
console.log(`Orphan : ${doomed.length} file(s), ${(doomedBytes / 1024 / 1024).toFixed(1)} MB`)
for (const p of doomed) console.log(`  - ${p}`)

if (!doomed.length) process.exit(0)

if (!apply) {
  console.log('\nDry run. Re-run with --apply to delete.')
  process.exit(0)
}

let removed = 0
for (const key of doomed) {
  const res = await r2.fetch(objectUrl(key), { method: 'DELETE' })
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    console.error(`Delete failed for ${key}: ${res.status}`)
    process.exit(1)
  }
  removed++
}
console.log(`\nDeleted ${removed} object(s).`)
```

- [ ] **Step 6: Dry-run it against the real bucket**

Run: `node scripts/purge-orphan-media.mjs`
Expected: `Live invitations: 7 (...)`, then `Bucket : 5 object(s)`. The two invitation ids currently holding media (`abbebec4-…` and `f72bfa21-…`) belong to live rows, so expect `Orphan : 0 file(s)` and an immediate exit.

**Do not pass `--apply` in this task.** A zero-orphan dry run is the correct outcome and proves the wiring; there is nothing to delete.

- [ ] **Step 7: Verify the whole suite and types**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all files pass.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/orphan-media.mjs scripts/lib/__tests__/orphan-media.test.mjs scripts/purge-orphan-media.mjs
git commit -m "fix(media): purge orphans from R2, not the retired Supabase bucket"
```

---

### Task 3: Pin the legal-HTML sanitiser's behaviour

**Files:**
- Create: `src/lib/legal/__tests__/sanitize.test.ts`

**Interfaces:**
- Consumes: `sanitizeLegalHtml(input: string): string` from `src/lib/legal/sanitize.ts`.
- Produces: nothing. This task adds tests only.

`sanitizeLegalHtml` shipped with the R2 release but nothing imports it — the admin legal-docs editor it belongs to is only specified, not built. It stays in the tree because its design is reviewed and its spec exists; what it lacks is any test, so whoever wires it up later has no way to know they broke it. Testing it now converts dead code into pinned groundwork.

- [ ] **Step 1: Write the tests**

Create `src/lib/legal/__tests__/sanitize.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sanitizeLegalHtml } from '../sanitize'

describe('sanitizeLegalHtml — dangerous containers', () => {
  it('drops a script tag together with its content', () => {
    expect(sanitizeLegalHtml('<script>alert(1)</script>Sisa teks')).toBe('Sisa teks')
  })

  it('drops an UNCLOSED script and everything after it', () => {
    // Losing trailing content is the deliberate trade: better to drop than leak.
    expect(sanitizeLegalHtml('Aman<script>alert(1)')).toBe('Aman')
  })

  it('drops iframe, object, embed, svg and style with their content', () => {
    expect(sanitizeLegalHtml('<iframe src="x"></iframe>A')).toBe('A')
    expect(sanitizeLegalHtml('<style>p{color:red}</style>B')).toBe('B')
    expect(sanitizeLegalHtml('<svg onload="alert(1)"></svg>C')).toBe('C')
  })

  it('removes comments, including conditional ones', () => {
    expect(sanitizeLegalHtml('<!-- rahasia -->Halo')).toBe('Halo')
  })
})

describe('sanitizeLegalHtml — tags and attributes', () => {
  it('keeps allowed tags but strips every attribute', () => {
    expect(sanitizeLegalHtml('<p onclick="steal()">Halo</p>')).toBe('<p>Halo</p>')
    expect(sanitizeLegalHtml('<h2 id="x" class="y">Judul</h2>')).toBe('<h2>Judul</h2>')
  })

  it('drops a disallowed tag but keeps the text inside it', () => {
    expect(sanitizeLegalHtml('<div>teks</div>')).toBe('teks')
    expect(sanitizeLegalHtml('<form><input></form>isi')).toBe('isi')
  })

  it('self-closes br and hr', () => {
    expect(sanitizeLegalHtml('a<br>b')).toBe('a<br />b')
    expect(sanitizeLegalHtml('<hr>')).toBe('<hr />')
  })

  it('normalises tag case', () => {
    expect(sanitizeLegalHtml('<P>Halo</P>')).toBe('<p>Halo</p>')
  })
})

describe('sanitizeLegalHtml — href is the only surviving attribute', () => {
  it('keeps http, https, protocol-relative, site-relative, fragment and mailto', () => {
    expect(sanitizeLegalHtml('<a href="https://fincards.land">x</a>')).toBe('<a href="https://fincards.land">x</a>')
    expect(sanitizeLegalHtml('<a href="/privacy">x</a>')).toBe('<a href="/privacy">x</a>')
    expect(sanitizeLegalHtml('<a href="#bagian-2">x</a>')).toBe('<a href="#bagian-2">x</a>')
    expect(sanitizeLegalHtml('<a href="mailto:halo@fincards.land">x</a>')).toBe('<a href="mailto:halo@fincards.land">x</a>')
  })

  it('SECURITY: strips javascript:, data: and vbscript: hrefs, keeping the link text', () => {
    expect(sanitizeLegalHtml('<a href="javascript:alert(1)">klik</a>')).toBe('<a>klik</a>')
    expect(sanitizeLegalHtml('<a href="data:text/html,<script>">klik</a>')).toBe('<a>klik</a>')
    expect(sanitizeLegalHtml('<a href="vbscript:msgbox">klik</a>')).toBe('<a>klik</a>')
  })

  it('escapes quotes and angle brackets inside a surviving href', () => {
    expect(sanitizeLegalHtml('<a href="/a&b">x</a>')).toBe('<a href="/a&amp;b">x</a>')
  })
})

describe('sanitizeLegalHtml — stray markup', () => {
  it('escapes a < that never formed a tag', () => {
    expect(sanitizeLegalHtml('5 < 3 itu salah')).toBe('5 &lt; 3 itu salah')
  })

  it('returns an empty string for empty input', () => {
    expect(sanitizeLegalHtml('')).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/lib/legal/__tests__/sanitize.test.ts`
Expected: PASS. If any case fails, that is a real finding in the sanitiser — **fix `sanitize.ts`, not the test**, and say so in the commit message. The tests above encode the behaviour the module's own header claims.

- [ ] **Step 3: Verify the whole suite and types**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all files pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/legal/__tests__/sanitize.test.ts
git commit -m "test(legal): pin the HTML sanitiser before anything depends on it"
```

---

### Task 4: Move the scratch artifacts out of the repo root

**Files:**
- Move: `AUDIT-COLOR-FONT-PALETTE.html`, `PALETTE-CHEATSHEET.html`, `pricing-comparison.html`, `table.html` → `docs/design/`

`DESIGN.md` **stays at the root**: it is a top-level design-system document in the same class as `README.md`, `CLAUDE.md` and `TEST-MATRIX.md`, all of which live there. The four HTML files are one-off audit and comparison pages — reference material, not project documents — and the root is where they are hardest to find and easiest to mistake for something the build uses.

- [ ] **Step 1: Move them with git so history follows**

```bash
mkdir -p docs/design
git mv AUDIT-COLOR-FONT-PALETTE.html PALETTE-CHEATSHEET.html pricing-comparison.html table.html docs/design/
```

- [ ] **Step 2: Confirm nothing referenced them by path**

Run: `grep -rn "AUDIT-COLOR-FONT-PALETTE\|PALETTE-CHEATSHEET\|pricing-comparison\.html\|table\.html" --include=* . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs`
Expected: no output. If a doc links to one of them, update that link in the same commit.

- [ ] **Step 3: Verify the build is unaffected**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all files pass.

These are standalone HTML files outside `src/`, so neither tool reads them; the runs confirm the move touched nothing else.

- [ ] **Step 4: Commit**

```bash
git add -A docs/design AUDIT-COLOR-FONT-PALETTE.html PALETTE-CHEATSHEET.html pricing-comparison.html table.html
git commit -m "docs(design): move the one-off audit artifacts out of the repo root"
```

---

### Task 5: Full-contract verification before anything is pushed

**Files:** none.

The R2 release was pushed after unit tests, typecheck and the token guard — but **not** after `test:e2e`, which `CLAUDE.md` names as part of the contract (`test:all`). This task closes that gap for the current tree and establishes the result the owner needs before pushing `main`.

- [ ] **Step 1: Run the full contract**

```bash
npm run typecheck && npm run test && npm run check:tokens && npm run test:e2e
```

The Playwright suite starts its own dev server and takes several minutes. Expected: every project (`desktop`, `tablet`, `mobile`) green, including the 9 visual-regression cases.

- [ ] **Step 2: Run the security verification**

Run: `npm run verify:security`
Expected: `✅ RLS CHECKS PASSED — at-rest NOT verified (no demo data present)`, exit 0.

- [ ] **Step 3: Record the result**

Append a dated section to [TEST-REPORT.md](../../../TEST-REPORT.md) stating what was run, the counts, and — explicitly — that at-rest encryption was **not** exercised because production holds no demo rows. A report that omits the gap is worse than no report.

- [ ] **Step 4: Commit**

```bash
git add TEST-REPORT.md
git commit -m "docs(test): record the post-R2 full-contract run"
```

- [ ] **Step 5: Hand back to the owner**

Do **not** push. Report the results and let the owner decide — pushing `main` deploys to production.

---

## Out of scope

- **Wiring `sanitizeLegalHtml` into a real code path.** The admin legal-docs editor is specified in `docs/superpowers/specs/2026-07-15-admin-legal-docs-design.md` but not built; building it is its own project.
- **Restoring an un-bypassable upload size cap.** R2 has no per-bucket equivalent of the Supabase `file_size_limit`, so an owner who skips `/api/upload/verify` can leave one oversized object per invitation. Tracked separately — it needs its own design, not a patch.
- **Deleting the Supabase `invitation-media` originals.** They are the R2 rollback and stay until the migration has been quiet for several days.
- **Auditing the other 82 commits in the release.** Their tests pass and production is healthy; behavioural review of manual-payment, refund and marketing-copy changes is a separate exercise.
