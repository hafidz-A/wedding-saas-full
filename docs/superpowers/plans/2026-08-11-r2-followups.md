# R2 Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every loose end the R2 media migration left behind — the caching gap on new uploads, the missing size ceiling, the dead Supabase upload route, the e2e suite's mobile blind spot, and the temporary render-time rewrite that must not become permanent.

**Architecture:** Two phases. **Phase 1** is safe today and independent of the migration's rollback window. **Phase 2 must not start until the owner declares the watch period over**, because it removes the rollback: it rewrites the media URLs stored in `invitations.config`, deletes the render-time rewrite that currently makes them work, and erases the Supabase originals. Doing Phase 2 early trades a one-env-var rollback for a database restore.

**Tech Stack:** Next.js 14 App Router, TypeScript, vitest, Playwright, `aws4fetch`, Cloudflare R2, Supabase.

## Global Constraints

- **Branch:** `chore/post-r2-followups`. Do **not** commit to `main`.
- **Do not run `git push`.** Commit only; the owner pushes.
- **No new dependencies.** `aws4fetch` and `@supabase/supabase-js` are already present.
- **Never seed dummy data into the production database.** The go-live wipe removed those fixtures deliberately.
- **Never print decrypted PII**, including in test output.
- User-facing strings in Bahasa Indonesia; code and comments in English.
- `npm run typecheck` and `npm run test` must pass at the end of every task.
- The working tree may be shared with another session. **Stage only the exact paths listed in each task — never `git add -A`.**
- Current production facts, verified 2026-08-11: R2 account `19ec83013da849144e1f80d398ab010b`, bucket `invitation-media`, host `https://media.fincards.land`, 7 objects. Live invitation ids holding media: `abbebec4-6645-4707-aa42-f955ca3a6021` and `f72bfa21-1ea8-4d97-b37a-65d9a47c4f56`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/editor/lib/uploadFile.ts` | **Modify.** Send `Cache-Control` on the browser PUT. | 1 |
| `src/app/api/upload/route.ts` | **Delete.** The dead Supabase proxy. | 2 |
| `src/app/api/upload/__tests__/route.test.ts` | **Delete.** Its test. | 2 |
| `src/lib/upload/media.ts` | **Modify.** Drop the now-unused `BUCKET`. | 2 |
| `scripts/lib/referenced-keys.mjs` | **Create.** Pure: which R2 keys a config actually references. | 3 |
| `scripts/lib/__tests__/referenced-keys.test.mjs` | **Create.** Tests for the above. | 3 |
| `scripts/purge-orphan-media.mjs` | **Modify.** Also sweep unreferenced objects inside LIVE invitations. | 3 |
| `e2e/support/invitation-page.ts` | **Create.** One helper that resolves the invitation root, frame or not. | 4 |
| `e2e/{perf,perf-mobile,invitation,a11y,smoke}.spec.ts` | **Modify.** Use the helper. | 4 |
| `e2e/support/fixtures.ts` | **Create.** Skip-with-reason when the dummy fixtures are absent. | 5 |
| `e2e/{dashboard,security,capture-tutorial,perf-mobile}.spec.ts` | **Modify.** Guard on the fixture. | 5 |
| `scripts/rewrite-config-media-urls.mjs` | **Create.** One-off: point stored URLs at R2. | 6 |
| `src/lib/config/mediaHost.ts` + its test | **Delete.** After Task 6 makes it a no-op. | 7 |
| `src/app/[template]/[slug]/page.tsx` | **Modify.** Drop the rewrite call. | 7 |
| `scripts/migrate-media-to-r2.mjs` | **Delete.** One-off, completed. | 8 |

---

# PHASE 1 — safe to do now

### Task 1: Cache-Control on new uploads

**Files:**
- Modify: `src/editor/lib/uploadFile.ts` (the step-2 `fetch(presignedUrl, …)` call)

**Interfaces:** none changed.

Objects uploaded after the cutover are served with `max-age=14400` (4 hours — Cloudflare's default), while the five carried over by the migration script have `public, max-age=31536000, immutable`. Verified in production on 2026-08-11: two photos uploaded that morning came back with the 4-hour header. Every 4 hours a guest re-opening the invitation pulls the photo from R2 again instead of the edge, which is precisely the per-view cost the migration existed to remove.

**This was attempted once and reverted.** Adding the header is one line, but the browser PUT then carries a non-simple header, so the CORS preflight asks permission for it — and the bucket policy allows only `Content-Type`. Measured against the live bucket:

```
Access-Control-Request-Headers: content-type                 → 204, allowed
Access-Control-Request-Headers: content-type,cache-control   → 403, no allow-origin
```

Shipping the code first breaks **every** browser upload. The CORS policy must be widened first.

- [ ] **Step 1: OWNER-PERFORMED — widen the bucket CORS policy**

Cloudflare → R2 → `invitation-media` → Settings → CORS Policy. Replace with:

```json
[
  {
    "AllowedOrigins": [
      "https://www.fincards.land",
      "https://fincards.land",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Only `AllowedHeaders` changes. **An agent cannot do this** — it needs a Cloudflare login. Stop here and hand back.

- [ ] **Step 2: Verify the preflight now allows the header**

```bash
node -e "fetch('https://19ec83013da849144e1f80d398ab010b.r2.cloudflarestorage.com/invitation-media/probe.webp',{method:'OPTIONS',headers:{Origin:'https://www.fincards.land','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type,cache-control'}}).then(r=>console.log(r.status,'| allow-origin:',r.headers.get('access-control-allow-origin'),'| allow-headers:',r.headers.get('access-control-allow-headers')))"
```
Expected: `204 | allow-origin: https://www.fincards.land | allow-headers: content-type,cache-control`

**If this still prints 403, STOP.** The code change below would break every upload. Do not proceed until it returns 204.

- [ ] **Step 3: Send the header**

In `src/editor/lib/uploadFile.ts`, replace the step-2 block:

```ts
  // 2. PUT the bytes DIRECTLY to R2 (no size cap from Vercel). Content-Type is
  //    recorded by R2 but is NOT part of the presigned signature (see
  //    lib/upload/r2.ts), so this cannot fail on a header mismatch.
  const putRes = await fetch(presignedUrl, {
    method: 'PUT',
    body: uploadable,
    headers: { 'Content-Type': contentType },
  })
```

with:

```ts
  // 2. PUT the bytes DIRECTLY to R2 (no size cap from Vercel). Neither header
  //    is part of the presigned signature (see lib/upload/r2.ts — only `host`
  //    is signed), so this cannot fail on a signature mismatch. R2 records both
  //    anyway: SigV4 validates the signed headers and passes the rest through.
  //
  //    Cache-Control is about cost, not correctness. Keys are timestamped and
  //    never rewritten, so a year of immutable caching is safe, and it is what
  //    makes a guest re-opening the invitation free. Without it R2 serves these
  //    with a 4-hour TTL, making NEW photos more expensive than the ones the
  //    migration script carried over with the same value set server-side.
  //
  //    REQUIRES "Cache-Control" in the bucket's CORS AllowedHeaders. Without it
  //    the preflight 403s and every upload fails — see this task's Step 1.
  const putRes = await fetch(presignedUrl, {
    method: 'PUT',
    body: uploadable,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
```

- [ ] **Step 4: Prove it end-to-end against the real bucket**

Save this as `scripts/tmp-cc-check.mjs`, run it, then delete the file:

```js
import { readFileSync } from 'node:fs'
import { AwsClient } from 'aws4fetch'
const t = readFileSync('.env.local', 'utf8')
for (const l of t.split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const r2 = new AwsClient({ service: 's3', region: 'auto', accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY })
const EP = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, B = process.env.R2_BUCKET, KEY = 'zz-cc-check.webp'
const url = new URL(`${EP}/${B}/${KEY}`); url.searchParams.set('X-Amz-Expires', '300')
const signed = await r2.sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': 'image/webp' } }), { aws: { signQuery: true } })
const bytes = new Uint8Array(64); 'RIFF'.split('').forEach((c, i) => bytes[i] = c.charCodeAt(0)); 'WEBP'.split('').forEach((c, i) => bytes[8 + i] = c.charCodeAt(0))
const put = await fetch(signed.url, { method: 'PUT', body: bytes, headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } })
console.log('PUT', put.status)
const got = await fetch(`${process.env.R2_PUBLIC_HOST}/${KEY}`)
console.log('stored cache-control:', got.headers.get('cache-control'))
await r2.fetch(`${EP}/${B}/${KEY}`, { method: 'DELETE' })
console.log('cleaned up')
```

Expected: `PUT 200`, then `stored cache-control: public, max-age=31536000, immutable`.

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck` → no output. Run: `npm run test` → all pass.

```bash
rm -f scripts/tmp-cc-check.mjs
git add src/editor/lib/uploadFile.ts
git commit -m "perf(media): cache new uploads for a year, like the migrated ones"
```

---

### Task 2: Delete the dead Supabase upload proxy

**Files:**
- Delete: `src/app/api/upload/route.ts`
- Delete: `src/app/api/upload/__tests__/route.test.ts`
- Modify: `src/lib/upload/media.ts` (remove `BUCKET`)

**Interfaces:**
- Removes: the `POST /api/upload` route and the `BUCKET` export. Nothing consumes either — verified by grep: the only references to `/api/upload` are inside its own test file and a historical comment in `uploadFile.ts`, and `BUCKET` is imported only by the route being deleted.

After the migration this route is the single remaining code path that would write media to Supabase Storage. Nothing calls it, so it is dead — but dead code that writes to the retired store is a split-brain waiting for someone to wire it back up.

- [ ] **Step 1: Re-confirm it is unreferenced**

```bash
grep -rn "'/api/upload'" src/ e2e/ scripts/ ; grep -rn "\bBUCKET\b" src/ --include=*.ts --include=*.tsx | grep -v "MEDIA_BUCKET\|R2_BUCKET"
```
Expected: the only hits are inside `src/app/api/upload/route.ts`, its test, and the `export const BUCKET` line in `media.ts`. **If anything else appears, stop and report** — the premise is wrong.

- [ ] **Step 2: Delete both files**

```bash
git rm src/app/api/upload/route.ts "src/app/api/upload/__tests__/route.test.ts"
```

- [ ] **Step 3: Drop the dead constant**

In `src/lib/upload/media.ts`, remove:

```ts
export const BUCKET = 'invitation-media'
```

and update the module header, which currently lists the deleted route as a consumer. Replace the bullet list at the top:

```
 *   • the legacy server-proxy route        (src/app/api/upload/route.ts)
 *   • the signed-URL authorize step         (src/app/api/upload/sign/route.ts)
```

with:

```
 *   • the signed-URL authorize step         (src/app/api/upload/sign/route.ts)
```

- [ ] **Step 4: Fix the stale comment in uploadFile.ts**

In `src/editor/lib/uploadFile.ts` the doc comment says "the old server-proxy route (/api/upload) hit". Change that phrase to "the old server-proxy route hit" — the route no longer exists to name.

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all pass, one test file fewer.

```bash
git add src/lib/upload/media.ts src/editor/lib/uploadFile.ts "src/app/api/upload/route.ts" "src/app/api/upload/__tests__/route.test.ts"
git commit -m "chore(media): delete the dead Supabase upload proxy"
```

---

### Task 3: Compensating control for the missing size ceiling

**Files:**
- Create: `scripts/lib/referenced-keys.mjs`
- Create: `scripts/lib/__tests__/referenced-keys.test.mjs`
- Modify: `scripts/purge-orphan-media.mjs`

**Interfaces:**
- Produces: `referencedMediaKeys(config)` → `Set<string>` — every `<invitation-id>/<file>` key a config points at, from either host.

The helper lives in `scripts/lib/` and **nowhere else**. Only the purge script consumes it, `vitest.config.ts` already includes `scripts/**/__tests__/**/*.test.mjs`, and `scripts/lib/orphan-media.mjs` is the established precedent. A second copy under `src/` would be duplicated logic with no consumer.

Supabase's bucket had `file_size_limit = 12582912`, an un-bypassable 12 MB ceiling (migration `2026-07-22`). **R2 has no per-bucket equivalent.** `/sign` only sees a client-DECLARED size, the presigned PUT caps nothing, and `/verify` — which does check the real bytes — is called by the client, so an owner who simply never calls it leaves an arbitrarily large object behind.

A Worker in front of the bucket would be a true cap, but that is new infrastructure for a threat that requires an authenticated paying customer. The proportionate control is detection: extend the purge script so it also removes objects that no live invitation's config references. An oversized object left by a skipped `/verify` is by definition unreferenced.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/__tests__/referenced-keys.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { referencedMediaKeys } from '../referenced-keys.mjs'

const R2 = 'https://media.fincards.land'
const SB = 'https://uknpuynhixrdqgsgmynl.supabase.co/storage/v1/object/public/invitation-media'

describe('referencedMediaKeys', () => {
  it('collects keys from both hosts, nested anywhere', () => {
    const config = {
      sections: [
        { type: 'hero', props: { image: `${R2}/inv-1/hero.webp` } },
        { type: 'gallery', props: { images: [`${SB}/inv-1/g1.webp`, 'https://picsum.photos/1'] } },
      ],
      music: { url: `${R2}/inv-1/lagu.mp3` },
    }
    expect(referencedMediaKeys(config)).toEqual(
      new Set(['inv-1/hero.webp', 'inv-1/g1.webp', 'inv-1/lagu.mp3']),
    )
  })

  it('ignores foreign hosts and non-strings', () => {
    const config = { a: 'https://images.unsplash.com/photo-1', b: 42, c: null, d: '/local/x.jpg' }
    expect(referencedMediaKeys(config)).toEqual(new Set())
  })

  it('strips a query string — the stored URL may carry one, the key never does', () => {
    expect(referencedMediaKeys({ a: `${R2}/inv-1/hero.webp?v=2` })).toEqual(new Set(['inv-1/hero.webp']))
  })

  it('handles null and empty configs', () => {
    expect(referencedMediaKeys(null)).toEqual(new Set())
    expect(referencedMediaKeys({})).toEqual(new Set())
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run scripts/lib/__tests__/referenced-keys.test.mjs`
Expected: FAIL — `Failed to resolve import "../referenced-keys.mjs"`.

- [ ] **Step 3: Implement**

Create `scripts/lib/referenced-keys.mjs`:

```js
/**
 * Which media objects a stored config actually points at.
 *
 * Used by the orphan purge as the compensating control for something R2 cannot
 * do: cap object size at the bucket. `/api/upload/verify` enforces the ceiling
 * on the real stored bytes, but the client calls it — an uploader who skips
 * that step leaves the object behind. Such an object is never referenced by any
 * config, which is exactly what makes it findable here.
 *
 * Matches BOTH hosts on purpose: configs written before the migration still
 * carry Supabase URLs, and both forms name the same key.
 */
const MEDIA_URL =
  /^https:\/\/(?:media\.fincards\.land|[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media)\/(.+)$/

export function referencedMediaKeys(config) {
  const keys = new Set()

  const walk = (value) => {
    if (typeof value === 'string') {
      const key = MEDIA_URL.exec(value)?.[1]
      if (key) keys.add(key.split('?')[0])
      return
    }
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(walk)
    }
  }

  walk(config)
  return keys
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run scripts/lib/__tests__/referenced-keys.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Teach the purge script about unreferenced objects**

`scripts/purge-orphan-media.mjs` currently dooms only objects whose invitation row is gone. Extend it: also doom objects under a LIVE invitation that its config does not reference.

Change the invitation query from `select('id, slug')` to `select('id, slug, config')`, and after the existing `partitionOrphans` call add:

```js
// Second sweep: objects under a LIVE invitation that its own config does not
// reference. R2 has no bucket-level size cap, so an upload whose /verify step
// was skipped survives at any size — and is, by definition, unreferenced. This
// is the compensating control for that gap.
const configByInv = new Map(live.map((r) => [r.id, r.config]))
const referencedByInv = new Map()
for (const [id, cfg] of configByInv) referencedByInv.set(id, referencedMediaKeys(cfg))

const unreferenced = []
let unreferencedBytes = 0
for (const key of kept) {
  const id = key.slice(0, key.indexOf('/'))
  if (!referencedByInv.get(id)?.has(key)) {
    unreferenced.push(key)
    unreferencedBytes += objects.find((o) => o.key === key)?.size ?? 0
  }
}

console.log(`Unref  : ${unreferenced.length} file(s) under live invitations, ${(unreferencedBytes / 1024 / 1024).toFixed(1)} MB`)
for (const p of unreferenced) console.log(`  ~ ${p}`)
```

Import it alongside the existing helper at the top of the script:

```js
import { referencedMediaKeys } from './lib/referenced-keys.mjs'
```

Then extend the delete loop to cover both lists:

```js
const toDelete = [...doomed, ...unreferenced]
if (!toDelete.length) process.exit(0)
```

and use `toDelete` in place of `doomed` in the `--apply` loop.

> ⚠️ **A freshly uploaded photo is unreferenced until the owner saves the section.** Never wire this sweep into an automatic schedule without a grace period — run it by hand, read the `~` list, and only then `--apply`. State this in the script header.

- [ ] **Step 6: Dry-run against the live bucket**

Run: `node scripts/purge-orphan-media.mjs`
Expected: `Orphan : 0`, and an `Unref` list. Two objects uploaded on 2026-08-11 may appear there if they were never saved into a section — **read the list before deleting anything.**

**Do not pass `--apply` in this task.**

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck` → no output. Run: `npm run test` → all pass.

```bash
git add scripts/lib/referenced-keys.mjs "scripts/lib/__tests__/referenced-keys.test.mjs" scripts/purge-orphan-media.mjs
git commit -m "feat(media): sweep unreferenced objects, the R2 stand-in for a size cap"
```

---

### Task 4: Restore mobile e2e coverage

**Files:**
- Create: `e2e/support/invitation-page.ts`
- Modify: `e2e/perf.spec.ts`, `e2e/perf-mobile.spec.ts`, `e2e/invitation.spec.ts`, `e2e/a11y.spec.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `invitationRoot(page)` → a `Locator`-compatible root that resolves to the iframe's content when phone-frame is active, and to the page otherwise.

On a phone UA, `src/app/[template]/[slug]/page.tsx` renders the invitation inside a same-origin `?embed=1` iframe (PhoneFrameView) so the mobile URL bar cannot churn mid-scroll. **No e2e spec accounts for this** — `grep -rn "noframe\|embed=1\|frameLocator" e2e/` returns nothing. Every spec queries the top-level document, which under a phone UA holds only the wrapper.

Verified consequences, 15 of 33 failures in a full run:
- `perf-mobile.spec.ts:93` — 9 failures (3 tests × 3 projects). This spec sets a Pixel 5 UA itself, so it hits phone-frame in **every** project. `page.locator(sel).first().waitFor({timeout: 90_000})` times out.
- `perf.spec.ts:32` (mobile) — `expect(page.locator('canvas').first()).toBeVisible()` → "element(s) not found".
- `perf.spec.ts:41` (mobile) — `page.locator('h1, h2').first().waitFor()` → 60s timeout.
- `invitation.spec.ts:20`, `:67` (mobile), `a11y.spec.ts:71` (mobile) — same shape.

This predates the R2 work; it broke when phone-frame shipped and went unnoticed because the full suite was not re-run.

- [ ] **Step 1: Write the helper**

Create `e2e/support/invitation-page.ts`:

```ts
import type { Page, FrameLocator } from '@playwright/test'

/**
 * The root to query invitation content from.
 *
 * Phones get the invitation inside a fullscreen same-origin `?embed=1` iframe
 * (PhoneFrameView) so the mobile URL bar never moves mid-scroll. Specs that
 * query the top-level document therefore find only the wrapper on a phone UA.
 *
 * Returning a FrameLocator when the frame exists — rather than appending
 * `?noframe=1` everywhere — keeps the wrapper itself under test. It is
 * load-bearing (see the phone-frame and no-overscroll design notes), and a spec
 * that opts out of it would go green even if the wrapper stopped rendering.
 */
export async function invitationRoot(page: Page): Promise<Page | FrameLocator> {
  const frame = page.locator('iframe[src*="embed=1"]')
  if ((await frame.count()) > 0) {
    await frame.first().waitFor({ state: 'attached', timeout: 30_000 })
    return page.frameLocator('iframe[src*="embed=1"]')
  }
  return page
}
```

- [ ] **Step 2: Use it where content is asserted**

In `e2e/perf.spec.ts`, replace the two page-level locators:

```ts
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
```
with
```ts
  const root = await invitationRoot(page)
  await expect(root.locator('canvas').first()).toBeVisible({ timeout: 25_000 })
```

and
```ts
  await page.locator('h1, h2').first().waitFor()
```
with
```ts
  const root = await invitationRoot(page)
  await root.locator('h1, h2').first().waitFor()
```

Add `import { invitationRoot } from './support/invitation-page'` to each modified spec.

Apply the same substitution in `e2e/perf-mobile.spec.ts` (its `page.locator(sel).first().waitFor(...)` at line 99), `e2e/invitation.spec.ts` (the RSVP section and render assertions), `e2e/a11y.spec.ts` (the invitation-page describe block), and `e2e/smoke.spec.ts` wherever an invitation's *content* is asserted.

**Leave the FPS measurement in `perf.spec.ts` / `perf-mobile.spec.ts` reading from `page`, not the frame.** `measureFps` evaluates `requestAnimationFrame` in the document it is given; measuring the wrapper document would report the wrapper's frame rate, not the invitation's. Where a spec needs FPS *inside* the frame, navigate directly to `<url>?noframe=1` for that test only and say why in a comment.

- [ ] **Step 3: Verify per project**

```bash
npx playwright test e2e/perf.spec.ts e2e/invitation.spec.ts e2e/a11y.spec.ts --project=mobile --reporter=list
```
Expected: the phone-frame failures are gone. Some timing-sensitive cases may still be flaky under load — run on an otherwise idle machine before judging.

```bash
npx playwright test e2e/perf.spec.ts e2e/invitation.spec.ts e2e/a11y.spec.ts --project=desktop --reporter=list
```
Expected: still green — on desktop `invitationRoot` returns the page unchanged.

- [ ] **Step 4: Prove the wrapper is actually under test**

Temporarily change `page.locator('iframe[src*="embed=1"]')` in the helper to `iframe[src*="never-matches"]`, re-run one mobile spec, and confirm it FAILS. Revert immediately. A helper that silently falls back to the page would make every mobile assertion vacuous — the exact bug being fixed.

- [ ] **Step 5: Commit**

```bash
git add e2e/support/invitation-page.ts e2e/perf.spec.ts e2e/perf-mobile.spec.ts e2e/invitation.spec.ts e2e/a11y.spec.ts e2e/smoke.spec.ts
git commit -m "test(e2e): assert invitation content through the phone-frame iframe"
```

---

### Task 5: Make fixture-dependent specs skip, not fail

**Files:**
- Create: `e2e/support/fixtures.ts`
- Modify: `e2e/dashboard.spec.ts`, `e2e/security.spec.ts`, `e2e/capture-tutorial.spec.ts`, `e2e/perf-mobile.spec.ts`

**Interfaces:**
- Produces: `requireFixture(page, slugPath)` — skips the test with a reason when the fixture invitation is absent.

12 failures come from specs needing `dummy-lovebirds` / `dummy-solary` and the account `dummy+dummy-lovebirds@example.com`, all removed by the go-live DB wipe on 2026-07-21. The symptom is `waiting for locator('input[type="email"]')`: the login gate never renders because the invitation does not exist.

A suite with 12 permanent reds is not a release gate — people stop reading it. A suite reporting "12 skipped, reason: fixture absent" is honest and still usable. **This restores signal, not coverage** — the coverage gap is real and belongs in a follow-up that gives the tests their own database.

- [ ] **Step 1: Write the guard**

Create `e2e/support/fixtures.ts`:

```ts
import { test, type Page } from '@playwright/test'

/**
 * Skip — loudly and with a reason — when a fixture invitation is missing.
 *
 * The dummy-* invitations these specs need were purged in the go-live database
 * wipe (2026-07-21) and must NOT be re-seeded: this suite runs against the
 * production database, and fake rows there are worse than missing coverage.
 *
 * Skipping is deliberately not the end state. It converts 12 permanent reds
 * into visible, explained gaps so the suite is usable as a release gate again;
 * the coverage itself only comes back with a dedicated test database.
 */
export async function requireFixture(page: Page, path: string): Promise<void> {
  const res = await page.goto(path)
  const missing = !res || res.status() >= 400
  test.skip(missing, `fixture missing: ${path} (purged in the 2026-07-21 go-live wipe; needs a test database)`)
}
```

- [ ] **Step 2: Guard each fixture-dependent test**

In `e2e/dashboard.spec.ts`, `e2e/security.spec.ts` and `e2e/capture-tutorial.spec.ts`, replace the first `await page.goto(DASH)` (or equivalent) in each test with:

```ts
  await requireFixture(page, DASH)
```

and import it: `import { requireFixture } from './support/fixtures'`.

In `e2e/perf-mobile.spec.ts`, guard only the cases whose URL names a `dummy-*` slug; its demo-slug cases must keep running.

- [ ] **Step 3: Verify the suite reports skips, not failures**

```bash
npx playwright test e2e/dashboard.spec.ts e2e/security.spec.ts --reporter=list
```
Expected: every test **skipped** with the reason printed — zero failures.

- [ ] **Step 4: Commit**

```bash
git add e2e/support/fixtures.ts e2e/dashboard.spec.ts e2e/security.spec.ts e2e/capture-tutorial.spec.ts e2e/perf-mobile.spec.ts
git commit -m "test(e2e): skip fixture-dependent specs with a reason instead of failing"
```

---

### Task 6 (Phase 1 tail): record the run

**Files:** Modify `TEST-REPORT.md`.

- [ ] **Step 1: Run the full contract on an idle machine**

```bash
npm run typecheck && npm run test && npm run check:tokens && npm run verify:security && npx playwright test --reporter=list
```

Capture the real counts. **Do not pipe Playwright through `tail`** — that reports `tail`'s exit code, not the suite's, which is how an earlier run was mistaken for a pass.

- [ ] **Step 2: Append a dated section**

State counts, what was skipped and why, and anything still failing. A report that omits a gap is worse than no report.

- [ ] **Step 3: Commit**

```bash
git add TEST-REPORT.md
git commit -m "docs(test): record the R2 follow-ups run"
```

---

# PHASE 2 — only after the owner declares the watch period over

> 🛑 **Do not start Phase 2 on your own initiative.** Until the owner says the migration has been quiet for several days, `MEDIA_REWRITE_LEGACY` plus the Supabase originals are the rollback. Phase 2 removes both, trading a one-env-var recovery for a database restore.

### Task 7: Rewrite stored media URLs to R2

**Files:**
- Create: `scripts/rewrite-config-media-urls.mjs`

**Interfaces:**
- Consumes: nothing. Produces: `invitations.config` rows whose media URLs name `media.fincards.land` directly.

Today the stored URLs still point at Supabase and `rewriteConfigMediaHosts` swaps the host on every render. That was the right call for the cutover — one env var to undo it — but as a permanent arrangement it is a trap: the flag is named `MEDIA_REWRITE_LEGACY`, so whoever tidies environment variables later reads it as leftover, unsets it, and **every pre-migration photo 404s at once**. It also deep-clones every config on every render, forever, for a migration that finished.

- [ ] **Step 1: Write the script**

Create `scripts/rewrite-config-media-urls.mjs`:

```js
/**
 * One-off: rewrite Supabase media URLs stored in invitations.config so they
 * name media.fincards.land directly, retiring the render-time host swap.
 *
 * Run ONLY after the R2 migration has been quiet for several days — this is the
 * step that makes the rewrite permanent. Idempotent: rows already pointing at
 * R2 are left alone and reported as skipped.
 *
 *   node scripts/rewrite-config-media-urls.mjs [--apply]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadDotEnv(file) {
  try {
    for (const line of readFileSync(resolve(file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, k, raw] = m
      if (process.env[k]) continue
      let v = raw.trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[k] = v
    }
  } catch {}
}
loadDotEnv('.env.local')

const APPLY = process.argv.includes('--apply')
const need = (n) => { const v = process.env[n]; if (!v) { console.error(`Missing ${n}`); process.exit(1) } return v }
const HOST = need('R2_PUBLIC_HOST').replace(/\/+$/, '')
const PREFIX = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media\//

const db = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const walk = (v) => {
  if (typeof v === 'string') {
    const m = PREFIX.exec(v)
    if (!m) return v
    const key = v.slice(m[0].length)
    return key ? `${HOST}/${key}` : v
  }
  if (Array.isArray(v)) return v.map(walk)
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(v)) out[k] = walk(val)
    return out
  }
  return v
}

const { data: rows, error } = await db.from('invitations').select('id, slug, config')
if (error) { console.error(error.message); process.exit(1) }

let changed = 0, skipped = 0
for (const row of rows) {
  const before = JSON.stringify(row.config ?? {})
  if (!PREFIX.test(before) && !before.includes('supabase.co/storage/v1/object/public/invitation-media')) { skipped++; continue }
  const next = walk(row.config)
  const after = JSON.stringify(next)
  if (after === before) { skipped++; continue }
  const hits = (before.match(/supabase\.co\/storage\/v1\/object\/public\/invitation-media/g) || []).length
  console.log(`${APPLY ? 'rewrite' : '[dry]  '} ${row.slug} — ${hits} URL(s)`)
  if (APPLY) {
    const { error: upErr } = await db.from('invitations').update({ config: next }).eq('id', row.id)
    if (upErr) { console.error(`  FAIL ${row.slug}: ${upErr.message}`); process.exit(1) }
  }
  changed++
}
console.log(`\n${APPLY ? 'Rewrote' : 'Would rewrite'} ${changed} row(s), skipped ${skipped}.`)
```

- [ ] **Step 2: Back up first**

Take a Supabase snapshot (or `select id, config` dumped to a file). This edits customer content in place; the render-time rewrite will be gone, so there is no env-var undo after Task 8.

- [ ] **Step 3: Dry-run, then apply**

```bash
node scripts/rewrite-config-media-urls.mjs
node scripts/rewrite-config-media-urls.mjs --apply
```

- [ ] **Step 4: Verify with the switch OFF**

Unset `MEDIA_REWRITE_LEGACY` locally, load a pre-migration invitation, and confirm its photos still render from `media.fincards.land`. **That is the whole point** — the config now carries the right URLs on its own. If anything still resolves to `supabase.co`, stop and re-run the script.

- [ ] **Step 5: Commit**

```bash
git add scripts/rewrite-config-media-urls.mjs
git commit -m "chore(media): one-off rewrite of stored media URLs to R2"
```

---

### Task 8: Delete the render-time rewrite

**Files:**
- Delete: `src/lib/config/mediaHost.ts`, `src/lib/config/__tests__/mediaHost.test.ts`
- Modify: `src/app/[template]/[slug]/page.tsx`

**Interfaces:** removes `rewriteMediaHost` / `rewriteConfigMediaHosts`. Only `page.tsx` imports them.

- [ ] **Step 1: Drop the call**

In `src/app/[template]/[slug]/page.tsx`, remove the import and the block:

```ts
  config = rewriteConfigMediaHosts(
    config,
    process.env.MEDIA_REWRITE_LEGACY === '1' ? process.env.R2_PUBLIC_HOST : null,
  )
```

- [ ] **Step 2: Delete the module and its test**

```bash
git rm src/lib/config/mediaHost.ts "src/lib/config/__tests__/mediaHost.test.ts"
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` → no output. Run: `npm run test` → all pass, one file fewer.
Load a pre-migration invitation locally and confirm the photos still render.

- [ ] **Step 4: Remove the env var**

Delete `MEDIA_REWRITE_LEGACY` from `.env.local` and from the Vercel production environment. `R2_PUBLIC_HOST` **stays** — `publicUrl()` in `src/lib/upload/r2.ts` needs it for every new upload.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/page.tsx" src/lib/config/mediaHost.ts "src/lib/config/__tests__/mediaHost.test.ts"
git commit -m "chore(media): retire the render-time host rewrite"
```

---

### Task 9: Retire the Supabase originals and the one-off script

**Files:**
- Delete: `scripts/migrate-media-to-r2.mjs`

- [ ] **Step 1: Confirm every R2 object is readable**

```bash
node scripts/purge-orphan-media.mjs
```
Read the listing. Every key a live config references must exist in R2 before anything is deleted from Supabase.

- [ ] **Step 2: OWNER-PERFORMED — delete the Supabase bucket contents**

Supabase dashboard → Storage → `invitation-media` → delete the objects. Keep the bucket itself; migration `2026-07-22` set a `file_size_limit` on it and an empty bucket costs nothing.

- [ ] **Step 3: Verify production still renders**

Open a real published invitation as a logged-out visitor. Photos must load from `media.fincards.land`. **There is no rollback past this point** — that is why Tasks 7 and 8 come first.

- [ ] **Step 4: Delete the completed one-off**

```bash
git rm scripts/migrate-media-to-r2.mjs
git commit -m "chore(media): drop the completed Supabase-to-R2 copy script"
```

---

## Out of scope

- **A dedicated test database.** Task 5 restores signal by skipping; it does not restore coverage. Giving the e2e suite its own Supabase project (seed script, `.env.test`, Playwright config) is a separate project and needs an infrastructure decision from the owner.
- **A Cloudflare Worker enforcing a hard upload size cap.** Task 3 is detection, not prevention. A true ceiling means putting a Worker in front of the bucket — new infrastructure, worth revisiting only if the sweep ever finds real abuse.
- **Auditing the other 82 commits** in the R2 release. Their tests pass and production is healthy; behavioural review of manual-payment, refund and marketing-copy changes is its own exercise.
- **The `2026-07-22` Supabase bucket size limit migration.** It now guards a store nothing writes to. Harmless; left in place as the historical record.
