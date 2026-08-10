# R2 Media Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve invitation media (photos + background audio) from Cloudflare R2 instead of Supabase Storage, so delivery cost stops scaling with guest count.

**Architecture:** The three-step upload flow keeps its exact shape — authorize/sign → browser PUTs bytes direct → server verifies real bytes. Only the destination changes: an S3 presigned PUT to R2 replaces Supabase's signed upload URL. Reads switch by rewriting the media host **at render time**, so URLs stored in `invitations.config` are never touched and the rollback is one env var.

**Tech Stack:** Next.js 14 App Router (Node runtime), TypeScript, vitest, `aws4fetch` 1.0.20 (S3 SigV4 signer, zero deps, 6.4 kB), Cloudflare R2.

**Spec:** [2026-08-02-r2-media-migration-design.md](../specs/2026-08-02-r2-media-migration-design.md)

## Global Constraints

- **The owner is on the FREE tier of both Vercel and Supabase.** No paid-plan features exist. Exceeding a quota causes service restriction, not a bill.
- **`aws4fetch` is the ONLY new dependency permitted.** No other package may be added.
- Secrets (`R2_*`) may appear only in `src/app/api/**`, server actions, and `src/lib/upload/r2.ts`. **Never** in a `'use client'` file.
- User-facing strings in Bahasa Indonesia; code comments in English.
- `npm run typecheck` and `npm run test` must pass at the end of every code task.
- **Do not run `git push`.** Commit only; the owner pushes.
- The working tree is shared with another active session. Stage only the exact paths listed in each task — never `git add -A`.

## Env vars introduced

| Var | Used by | Purpose |
|---|---|---|
| `R2_ACCOUNT_ID` | `r2.ts` | S3 endpoint hostname |
| `R2_ACCESS_KEY_ID` | `r2.ts` | credentials |
| `R2_SECRET_ACCESS_KEY` | `r2.ts` | credentials |
| `R2_BUCKET` | `r2.ts` | bucket name |
| `R2_PUBLIC_HOST` | `verify` route, render rewrite | e.g. `https://media.fincards.land` — builds public URLs |
| `MEDIA_REWRITE_LEGACY` | `page.tsx` | `"1"` enables rewriting legacy Supabase URLs. **This is the kill switch.** |

> Refinement over the spec: the spec named a single `MEDIA_PUBLIC_HOST`. It is split into `R2_PUBLIC_HOST` (where R2 objects live — required for R2 to work at all) and `MEDIA_REWRITE_LEGACY` (whether to rewrite *legacy* Supabase URLs — the reversible switch). One variable could not do both jobs: unsetting it to roll back the rewrite would also break new uploads.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/lib/config/mediaHost.ts` | **Create.** Pure URL/config rewriting. No I/O, no env reads. | 3 |
| `src/lib/config/__tests__/mediaHost.test.ts` | **Create.** Unit tests for the above. | 3 |
| `src/lib/upload/r2.ts` | **Create.** Everything that talks to R2: presign, head-bytes, delete, prefix size. Server-only. | 4 |
| `src/lib/upload/__tests__/r2.test.ts` | **Create.** Tests for presign URL construction + XML size parsing. | 4 |
| `src/app/[template]/[slug]/page.tsx` | **Modify** line 203 area — apply the rewrite after `fillEmptyImages`. | 3 |
| `src/app/api/upload/sign/route.ts` | **Modify.** Presign against R2; quota via R2 prefix listing. | 5 |
| `src/app/api/upload/verify/route.ts` | **Modify.** Range-GET + delete against R2; return the R2 public URL. | 5 |
| `src/editor/lib/uploadFile.ts` | **Modify.** Plain `fetch` PUT to the presigned URL. | 5 |
| `scripts/migrate-media-to-r2.mjs` | **Create.** One-off copy of existing objects. Self-contained. | 6 |

---

### Task 1: DNS to Cloudflare — **owner-performed, no code**

> 📖 **Show the owner [2026-08-02-r2-owner-runbook.md](2026-08-02-r2-owner-runbook.md) instead of this task.** It carries the same steps written for a non-expert, in Bahasa, with the live DNS values and the copy-paste verification commands. This task is the engineering-side record; the runbook is what the human actually follows.

**Files:** none.

**Interfaces:**
- Produces: `fincards.land` resolving via Cloudflare nameservers, with the site and email unchanged. Task 2 depends on the zone existing.

This task has no code and cannot be done by an agent — it requires logging into Cloudflare and the domain registrar. An agent executing this plan must **stop here and hand back to the owner**, then verify the result with the commands below.

- [ ] **Step 1: Record the current DNS state before touching anything**

Run these and save the output — this is the rollback reference:

```bash
node -e "['NS','A','TXT','MX'].forEach(t=>fetch('https://dns.google/resolve?name=fincards.land&type='+t).then(r=>r.json()).then(j=>console.log(t, JSON.stringify(j.Answer||j.Authority||[]))))"
```

Expected today: NS = `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.

- [ ] **Step 2: Owner copies the full record list out of Vercel**

In the Vercel dashboard → the project → Settings → Domains → `fincards.land` → view DNS records. **Screenshot or copy every row.** Known so far: `www` → A records, and `send.fincards.land` → TXT `v=spf1 include:amazonses.com ~all`. There may be DKIM records for Resend under `send.` or `resend._domainkey.*` — copy whatever is actually listed, do not assume this list is complete.

- [ ] **Step 3: Owner adds the domain in Cloudflare (Free plan)**

Cloudflare will auto-scan and import records. **Its docs state the scan "is not guaranteed to find all" records.** Compare the imported list against Step 2 row by row and add anything missing by hand.

- [ ] **Step 4: Set every Vercel-facing record to "DNS only" (grey cloud)**

`@` and `www` must NOT be proxied. Vercel's own KB advises against proxying its sites through Cloudflare — it breaks traffic visibility and bot detection. Only `media.*` (added in Task 2) is proxied.

- [ ] **Step 5: Set SSL/TLS mode to Full (strict)**

Zone-wide setting on the Free plan. Doing this before proxying anything avoids the classic Flexible-mode redirect loop.

- [ ] **Step 6: Owner switches nameservers at the registrar**

Do **not** delete the Vercel DNS zone. It is the rollback: point the nameservers back to `ns1/ns2.vercel-dns.com`.

- [ ] **Step 7: Verify — site**

```bash
curl -sS -o /dev/null -w "%{http_code} %{url_effective}\n" -L https://www.fincards.land/
```
Expected: `200`.

- [ ] **Step 8: Verify — the email record, which fails silently if lost**

```bash
node -e "fetch('https://dns.google/resolve?name=send.fincards.land&type=TXT').then(r=>r.json()).then(j=>console.log(JSON.stringify(j.Answer||[],null,1)))"
```
Expected: the SPF string `v=spf1 include:amazonses.com ~all` is present. **If it is absent, stop and add it in Cloudflare before continuing** — password-reset and payment-notification emails depend on it and their failure is silent.

- [ ] **Step 9: Verify — send a real email end-to-end**

Trigger a password reset from `/forgot-password` for an account you control and confirm the email arrives. DNS lookups can look right while delivery is broken; only a real send proves it.

---

### Task 2: R2 bucket + custom domain — **owner-performed, no code**

**Files:** none.

**Interfaces:**
- Produces: a bucket reachable at `https://media.fincards.land/<key>`, plus the four `R2_*` credentials Task 4 consumes.

- [ ] **Step 1: Create the bucket**

Cloudflare dashboard → R2 → Create bucket → name it `invitation-media` (same name as the Supabase bucket, so keys stay identical and the migration script is a straight copy).

- [ ] **Step 2: Attach the custom domain**

Bucket → Settings → Custom Domains → add `media.fincards.land`. Cloudflare creates the proxied DNS record automatically. Public `r2.dev` access does **not** need enabling — Cloudflare's docs state custom domains are independent of it.

- [ ] **Step 3: Set the CORS policy**

Bucket → Settings → CORS Policy. Without this, every browser upload fails.

```json
[
  {
    "AllowedOrigins": [
      "https://www.fincards.land",
      "https://fincards.land",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`localhost:3000` is included so the editor can be tested locally. Remove it later if you prefer.

- [ ] **Step 4: Create an API token**

R2 → Manage R2 API Tokens → Create token, permission **Object Read & Write**, scoped to this bucket only. Save the Access Key ID and Secret Access Key — the secret is shown once.

- [ ] **Step 5: Put the values in `.env.local`**

```bash
R2_ACCOUNT_ID=<from the R2 dashboard URL or overview page>
R2_ACCESS_KEY_ID=<step 4>
R2_SECRET_ACCESS_KEY=<step 4>
R2_BUCKET=invitation-media
R2_PUBLIC_HOST=https://media.fincards.land
```

Do **not** set `MEDIA_REWRITE_LEGACY` yet — that is the cutover switch in Task 7.

- [ ] **Step 6: Prove the custom domain serves an object**

Upload any small file through the R2 dashboard UI as `smoke-test.txt`, then:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://media.fincards.land/smoke-test.txt
```
Expected: `200`. Delete the test file afterwards. If this returns 404 or 522, the custom domain is not wired — fix before writing any code.

---

### Task 3: Render-time host rewrite (pure, TDD)

**Files:**
- Create: `src/lib/config/mediaHost.ts`
- Create: `src/lib/config/__tests__/mediaHost.test.ts`
- Modify: `src/app/[template]/[slug]/page.tsx` (the `fillEmptyImages` call, currently line 203)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `rewriteMediaHost(url: unknown, host?: string | null): unknown` and `rewriteConfigMediaHosts<T>(config: T, host?: string | null): T`. Task 7 flips this on via env.

This task is safe to land alone: with `MEDIA_REWRITE_LEGACY` unset, the rewrite is an identity function and nothing changes.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/config/__tests__/mediaHost.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rewriteMediaHost, rewriteConfigMediaHosts } from '../mediaHost'

const HOST = 'https://media.fincards.land'
const SB = 'https://uknpuynhixrdqgsgmynl.supabase.co/storage/v1/object/public/invitation-media'

describe('rewriteMediaHost', () => {
  it('rewrites a Supabase public media URL onto the new host', () => {
    expect(rewriteMediaHost(`${SB}/inv-1/123-foto.webp`, HOST)).toBe(`${HOST}/inv-1/123-foto.webp`)
  })

  it('is an identity when no host is supplied — this is the kill switch', () => {
    const u = `${SB}/inv-1/123-foto.webp`
    expect(rewriteMediaHost(u, null)).toBe(u)
    expect(rewriteMediaHost(u, undefined)).toBe(u)
    expect(rewriteMediaHost(u, '')).toBe(u)
  })

  it('leaves foreign hosts alone', () => {
    for (const u of [
      'https://images.unsplash.com/photo-123',
      'https://picsum.photos/800',
      '/templates/lovebirds/demo/hero.jpg',
      'https://uknpuynhixrdqgsgmynl.supabase.co/storage/v1/object/public/other-bucket/x.png',
    ]) {
      expect(rewriteMediaHost(u, HOST)).toBe(u)
    }
  })

  it('tolerates non-strings and empty values', () => {
    expect(rewriteMediaHost(null, HOST)).toBe(null)
    expect(rewriteMediaHost(undefined, HOST)).toBe(undefined)
    expect(rewriteMediaHost(42, HOST)).toBe(42)
    expect(rewriteMediaHost('', HOST)).toBe('')
  })

  it('does not produce a double slash when the host has a trailing slash', () => {
    expect(rewriteMediaHost(`${SB}/inv-1/a.webp`, `${HOST}/`)).toBe(`${HOST}/inv-1/a.webp`)
  })

  it('leaves a bare bucket URL with no key alone', () => {
    expect(rewriteMediaHost(`${SB}/`, HOST)).toBe(`${SB}/`)
  })
})

describe('rewriteConfigMediaHosts', () => {
  it('rewrites strings nested in objects and arrays', () => {
    const config = {
      sections: [
        { type: 'hero', props: { image: `${SB}/inv-1/hero.webp`, title: 'Adi & Rani' } },
        { type: 'gallery', props: { images: [`${SB}/inv-1/g1.webp`, 'https://picsum.photos/1'] } },
      ],
      music: { url: `${SB}/inv-1/lagu.mp3` },
    }
    const out: any = rewriteConfigMediaHosts(config, HOST)
    expect(out.sections[0].props.image).toBe(`${HOST}/inv-1/hero.webp`)
    expect(out.sections[0].props.title).toBe('Adi & Rani')
    expect(out.sections[1].props.images[0]).toBe(`${HOST}/inv-1/g1.webp`)
    expect(out.sections[1].props.images[1]).toBe('https://picsum.photos/1')
    expect(out.music.url).toBe(`${HOST}/inv-1/lagu.mp3`)
  })

  it('returns the config untouched when no host is supplied', () => {
    const config = { a: `${SB}/inv-1/x.webp` }
    expect(rewriteConfigMediaHosts(config, null)).toBe(config)
  })

  it('handles null config', () => {
    expect(rewriteConfigMediaHosts(null, HOST)).toBe(null)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/config/__tests__/mediaHost.test.ts`
Expected: FAIL — `Failed to resolve import "../mediaHost"`.

- [ ] **Step 3: Implement**

Create `src/lib/config/mediaHost.ts`:

```ts
/**
 * Render-time media host rewriting.
 *
 * Media files moved to Cloudflare R2, but the URLs already stored in
 * `invitations.config` still point at Supabase Storage. Rather than rewriting
 * thousands of stored strings — a migration that would have to be reversed by
 * hand if anything went wrong — the swap happens on the way out, every render.
 *
 * That makes the rollback a single env var: stop passing a host and every URL
 * resolves to Supabase again, where the original objects are deliberately kept.
 *
 * PURE by design: the host is a parameter, never read from process.env here.
 * `R2_PUBLIC_HOST` is server-only (no NEXT_PUBLIC_ prefix), so reading it inside
 * a module the client bundle can reach would silently evaluate to undefined
 * instead of failing loudly.
 */

/** Supabase Storage public URL for OUR media bucket, capturing everything up to the key. */
const SUPABASE_MEDIA_PREFIX =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/invitation-media\//

export function rewriteMediaHost(url: unknown, host?: string | null): unknown {
  if (typeof url !== 'string' || !host) return url
  const match = SUPABASE_MEDIA_PREFIX.exec(url)
  if (!match) return url
  const key = url.slice(match[0].length)
  if (!key) return url // bucket root, nothing to address
  return `${host.replace(/\/+$/, '')}/${key}`
}

/** Deep-copy `config`, rewriting every media URL string it contains. */
export function rewriteConfigMediaHosts<T>(config: T, host?: string | null): T {
  if (!host || config == null) return config

  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return rewriteMediaHost(value, host)
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = walk(v)
      return out
    }
    return value
  }

  return walk(config) as T
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/config/__tests__/mediaHost.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Wire it into the render path**

In `src/app/[template]/[slug]/page.tsx`, add the import alongside the existing `fillEmptyImages` import:

```ts
import { rewriteConfigMediaHosts } from '@/lib/config/mediaHost'
```

Then find the existing line (currently 203):

```ts
  config = fillEmptyImages(config)
```

and replace it with:

```ts
  config = fillEmptyImages(config)
  // Media moved to R2; stored URLs still point at Supabase. Rewriting here
  // instead of in the database keeps the rollback to one env var — unset
  // MEDIA_REWRITE_LEGACY and every legacy URL resolves to Supabase again.
  config = rewriteConfigMediaHosts(
    config,
    process.env.MEDIA_REWRITE_LEGACY === '1' ? process.env.R2_PUBLIC_HOST : null,
  )
```

- [ ] **Step 6: Verify the whole suite and types**

Run: `npm run typecheck`
Expected: no output.

Run: `npm run test`
Expected: every test file passes. The suite was 110 files / 801 tests before this task; this adds one file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/config/mediaHost.ts src/lib/config/__tests__/mediaHost.test.ts "src/app/[template]/[slug]/page.tsx"
git commit -m "feat(media): add render-time media host rewrite, inactive by default"
```

---

### Task 4: R2 client module (TDD where testable)

**Files:**
- Create: `src/lib/upload/r2.ts`
- Create: `src/lib/upload/__tests__/r2.test.ts`
- Modify: `package.json` (add `aws4fetch`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, all consumed by Task 5:
  - `presignPut(key: string, contentType: string, expiresSeconds?: number): Promise<string>`
  - `getObjectHead(key: string, n?: number): Promise<{ bytes: Uint8Array; size: number } | null>`
  - `deleteObject(key: string): Promise<void>`
  - `sumPrefixBytes(prefix: string): Promise<number>`
  - `publicUrl(key: string): string`
  - `parseSizesFromListXml(xml: string): number` (exported for testing)

- [ ] **Step 1: Install the dependency**

```bash
npm install aws4fetch@1.0.20
```

Expected: one package added, zero transitive dependencies.

- [ ] **Step 2: Write the failing tests**

Only the pure parts are unit-tested. Signing hits WebCrypto and is exercised for real in Task 7's manual upload — do not fake a crypto assertion that proves nothing.

Create `src/lib/upload/__tests__/r2.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  process.env.R2_ACCOUNT_ID = 'acc123'
  process.env.R2_BUCKET = 'invitation-media'
  process.env.R2_ACCESS_KEY_ID = 'ak'
  // Long and distinctive on purpose: the "secret must not leak into the URL"
  // assertion below would be flaky against a short value, since a 2-char string
  // can appear by chance inside a base64 signature.
  process.env.R2_SECRET_ACCESS_KEY = 'do-not-leak-this-secret-value'
  process.env.R2_PUBLIC_HOST = 'https://media.fincards.land'
})

describe('publicUrl', () => {
  it('builds a URL on the configured public host', async () => {
    const { publicUrl } = await import('../r2')
    expect(publicUrl('inv-1/123-foto.webp')).toBe('https://media.fincards.land/inv-1/123-foto.webp')
  })

  it('does not double the slash when the host has a trailing one', async () => {
    process.env.R2_PUBLIC_HOST = 'https://media.fincards.land/'
    const { publicUrl } = await import('../r2')
    expect(publicUrl('inv-1/a.webp')).toBe('https://media.fincards.land/inv-1/a.webp')
  })
})

describe('parseSizesFromListXml', () => {
  it('sums every Size element', async () => {
    const { parseSizesFromListXml } = await import('../r2')
    const xml = `<?xml version="1.0"?><ListBucketResult>
      <Contents><Key>inv-1/a.webp</Key><Size>1000</Size></Contents>
      <Contents><Key>inv-1/b.mp3</Key><Size>2500</Size></Contents>
    </ListBucketResult>`
    expect(parseSizesFromListXml(xml)).toBe(3500)
  })

  it('returns 0 for an empty listing', async () => {
    const { parseSizesFromListXml } = await import('../r2')
    expect(parseSizesFromListXml('<?xml version="1.0"?><ListBucketResult></ListBucketResult>')).toBe(0)
  })
})

describe('presignPut', () => {
  it('produces a signed query URL for the right bucket and key, with an expiry', async () => {
    const { presignPut } = await import('../r2')
    const url = await presignPut('inv-1/123-foto.webp', 'image/webp', 300)
    expect(url).toContain('https://acc123.r2.cloudflarestorage.com/invitation-media/inv-1/123-foto.webp')
    expect(url).toContain('X-Amz-Expires=300')
    expect(url).toContain('X-Amz-Signature=')
    // Content-Type is signed, so the browser MUST send the identical value.
    expect(url).toContain('content-type')
    // The secret itself must never appear in the URL.
    expect(url).not.toContain('do-not-leak-this-secret-value')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/upload/__tests__/r2.test.ts`
Expected: FAIL — `Failed to resolve import "../r2"`.

- [ ] **Step 4: Implement**

Create `src/lib/upload/r2.ts`:

```ts
import 'server-only'
import { AwsClient } from 'aws4fetch'

/**
 * Everything that talks to Cloudflare R2, over its S3-compatible API.
 *
 * R2 replaced Supabase Storage for media because R2 does not bill egress at any
 * volume — a wedding invitation is downloaded once per guest, so per-byte
 * delivery pricing scaled with guest count and was the binding hosting cost.
 *
 * Server-only: these credentials must never reach the client bundle.
 */

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

let client: AwsClient | null = null
function r2(): AwsClient {
  if (!client) {
    client = new AwsClient({
      service: 's3',
      region: 'auto', // R2 requires the literal string "auto"
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    })
  }
  return client
}

function endpoint(): string {
  return `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
}

/** Object URL on the S3 API endpoint. Each path segment is encoded separately so
 *  the "/" separators in our `<invitation_id>/<file>` keys survive. */
function objectUrl(key: string): URL {
  const encoded = key.split('/').map(encodeURIComponent).join('/')
  return new URL(`${endpoint()}/${env('R2_BUCKET')}/${encoded}`)
}

/** Public URL a browser fetches, via the bucket's custom domain. */
export function publicUrl(key: string): string {
  return `${env('R2_PUBLIC_HOST').replace(/\/+$/, '')}/${key}`
}

/**
 * Presigned PUT URL for a direct browser upload.
 *
 * Content-Type is signed deliberately. Cloudflare's documented pattern signs it,
 * which means the browser's PUT must send a byte-identical Content-Type or R2
 * rejects the signature with 403. Callers must pass the browser the same string.
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresSeconds = 300,
): Promise<string> {
  const url = objectUrl(key)
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds))
  const signed = await r2().sign(
    new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
    { aws: { signQuery: true } },
  )
  return signed.url
}

/**
 * First `n` bytes of an object plus its full size, via a Range request — so the
 * magic-byte check does not download the whole file the way the Supabase
 * implementation did.
 */
export async function getObjectHead(
  key: string,
  n = 32,
): Promise<{ bytes: Uint8Array; size: number } | null> {
  const res = await r2().fetch(objectUrl(key).toString(), {
    method: 'GET',
    headers: { Range: `bytes=0-${n - 1}` },
  })
  if (res.status === 404) return null
  if (!res.ok && res.status !== 206) return null

  const bytes = new Uint8Array(await res.arrayBuffer())
  // 206 carries "bytes 0-31/12345"; a small object may answer 200 with the lot.
  const contentRange = res.headers.get('content-range')
  const total = contentRange
    ? Number(contentRange.split('/')[1])
    : Number(res.headers.get('content-length') ?? bytes.length)
  return { bytes, size: Number.isFinite(total) ? total : bytes.length }
}

export async function deleteObject(key: string): Promise<void> {
  const res = await r2().fetch(objectUrl(key).toString(), { method: 'DELETE' })
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`R2 delete failed: ${res.status}`)
  }
}

/** Sum of `<Size>` across a ListObjectsV2 response. Exported for unit testing. */
export function parseSizesFromListXml(xml: string): number {
  let total = 0
  for (const m of xml.matchAll(/<Size>(\d+)<\/Size>/g)) total += Number(m[1])
  return total
}

/** Total bytes stored under a key prefix — used for the per-invitation quota. */
export async function sumPrefixBytes(prefix: string): Promise<number> {
  const url = new URL(`${endpoint()}/${env('R2_BUCKET')}`)
  url.searchParams.set('list-type', '2')
  url.searchParams.set('prefix', prefix)
  url.searchParams.set('max-keys', '1000')
  const res = await r2().fetch(url.toString(), { method: 'GET' })
  if (!res.ok) throw new Error(`R2 list failed: ${res.status}`)
  return parseSizesFromListXml(await res.text())
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/upload/__tests__/r2.test.ts`
Expected: PASS. If `presignPut` throws about WebCrypto, stop — that would mean the Node runtime lacks `crypto.subtle`, which Node 24 has; report rather than working around it.

- [ ] **Step 6: Verify the whole suite and types**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all files pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/upload/r2.ts src/lib/upload/__tests__/r2.test.ts package.json package-lock.json
git commit -m "feat(media): add Cloudflare R2 client for the upload pipeline"
```

---

### Task 5: Switch the upload pipeline to R2 (atomic)

**Files:**
- Modify: `src/app/api/upload/sign/route.ts`
- Modify: `src/app/api/upload/verify/route.ts`
- Modify: `src/editor/lib/uploadFile.ts`
- Modify: `src/app/api/upload/sign/__tests__/route.test.ts`
- Modify: `src/app/api/upload/verify/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `presignPut`, `getObjectHead`, `deleteObject`, `sumPrefixBytes`, `publicUrl` from `@/lib/upload/r2` (Task 4).
- Produces: `/api/upload/sign` now responds `{ ok: true, path: string, url: string }` — `url` replaces the old `token`. `uploadFile` PUTs to it.

These three files must change together. `/sign` returning `url` instead of `token` breaks the client the moment it lands, so splitting them would leave a broken commit.

- [ ] **Step 1: Update the sign route**

In `src/app/api/upload/sign/route.ts`, replace the import of Supabase admin and the two Supabase-specific blocks.

Change the imports at the top to:

```ts
import { NextResponse } from 'next/server'
import { verifyOwnership } from '@/editor/lib/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { ALLOWED_MIMES, MAX_TOTAL_BYTES, maxBytesFor, safeStoragePath } from '@/lib/upload/media'
import { presignPut, sumPrefixBytes } from '@/lib/upload/r2'
```

Replace the quota block (currently the `const supabase = createSupabaseAdminClient()` line through the end of its `try`/`catch`) with:

```ts
  // --- per-invitation storage quota (best-effort, fails OPEN like the original) ---
  try {
    const usedBytes = await sumPrefixBytes(`${owner.id}/`)
    if (usedBytes + size > MAX_TOTAL_BYTES) {
      const maxMb = Math.round(MAX_TOTAL_BYTES / 1024 / 1024)
      return NextResponse.json(
        { error: `Kuota penyimpanan undangan penuh (maks ${maxMb} MB). Hapus media lama dulu.` },
        { status: 413 },
      )
    }
  } catch (e) {
    console.error('[upload/sign quota] R2 list failed (allowing):', e)
  }
```

Replace the signing block at the end with:

```ts
  // --- issue a presigned PUT scoped to this invitation's folder ---
  const path = safeStoragePath(owner.id, filename)
  try {
    // Content-Type is signed into the URL, so the browser must PUT the exact
    // same value or R2 rejects the signature with 403.
    const url = await presignPut(path, contentType, 300)
    return NextResponse.json({ ok: true, path, url })
  } catch (e: any) {
    console.error('[upload/sign]', e)
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }
```

- [ ] **Step 2: Update the verify route**

In `src/app/api/upload/verify/route.ts`, change the imports to:

```ts
import { NextResponse } from 'next/server'
import { verifyOwnership } from '@/editor/lib/auth'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { sniffMediaKind, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '@/lib/upload/media'
import { getObjectHead, deleteObject, publicUrl } from '@/lib/upload/r2'
```

Replace everything from `const supabase = createSupabaseAdminClient()` to the end of the function with:

```ts
  // Pull only the head bytes — a Range request, not the whole object.
  const head = await getObjectHead(path, 32)
  if (!head) {
    return NextResponse.json({ error: 'Uploaded file not found' }, { status: 404 })
  }

  // Trust the actual bytes, not the client-declared content-type.
  const kind = sniffMediaKind(head.bytes)
  if (!kind) {
    await deleteObject(path)
    return NextResponse.json(
      { error: 'File content does not look like a valid image or audio file' },
      { status: 400 },
    )
  }

  // Authoritative size enforcement on the REAL stored bytes. /sign only saw a
  // client-DECLARED size and the presigned URL does not cap the payload, so this
  // is where the 12 MB audio / 5 MB image ceiling is actually enforced.
  const maxBytes = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
  if (head.size > maxBytes) {
    await deleteObject(path)
    const maxMb = Math.round(maxBytes / 1024 / 1024)
    return NextResponse.json(
      { error: `File terlalu besar (maks ${maxMb} MB) — upload dibatalkan.` },
      { status: 413 },
    )
  }

  return NextResponse.json({ ok: true, url: publicUrl(path), path })
```

Leave the ownership check and the IDOR guard (`path.startsWith(owner.id + '/')`, no `..`) exactly as they are — they are load-bearing.

- [ ] **Step 3: Update the browser upload helper**

In `src/editor/lib/uploadFile.ts`, remove the `createSupabaseBrowserClient` and `BUCKET` imports (no longer used) and replace step 2. The imports become:

```ts
import { ALLOWED_MIMES, maxBytesFor } from '@/lib/upload/media'
import { compressImageForUpload, isAudioMime, MAX_RAW_INPUT_BYTES } from '@/lib/upload/compress'
```

Replace the destructure of the sign response and the upload block with:

```ts
  const { path, url } = await signRes.json()

  // 2. PUT the bytes DIRECTLY to R2 (no size cap from Vercel).
  //    Content-Type must match what /sign signed into the URL byte-for-byte,
  //    or R2 rejects the signature with 403.
  const putRes = await fetch(url, {
    method: 'PUT',
    body: uploadable,
    headers: { 'Content-Type': contentType },
  })
  if (!putRes.ok) {
    throw new Error(`Upload ke penyimpanan gagal (${putRes.status})`)
  }
```

Also update the flow comment at the top of the function: step 2 now says R2, not Supabase.

- [ ] **Step 4: Update the route tests**

Both existing test files mock `@/lib/supabase/admin`. Replace those mocks with a mock of `@/lib/upload/r2`. In `src/app/api/upload/sign/__tests__/route.test.ts`, change the mock block to:

```ts
vi.mock('@/lib/upload/r2', () => ({
  presignPut: vi.fn(async (key: string) => `https://acc.r2.cloudflarestorage.com/b/${key}?X-Amz-Signature=x`),
  sumPrefixBytes: vi.fn(async () => 0),
}))
vi.mock('@/editor/lib/auth', () => ({ verifyOwnership: vi.fn() }))
import { presignPut, sumPrefixBytes } from '@/lib/upload/r2'
import { verifyOwnership } from '@/editor/lib/auth'
```

Keep every existing assertion about rejected mimes, oversize files, unauthorized callers and quota. Add one:

```ts
it('returns a presigned url instead of a token', async () => {
  const res = await POST(signReq(ok))
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.url).toContain('X-Amz-Signature=')
  expect(body.token).toBeUndefined()
})
```

And one proving the quota still fails open:

```ts
it('allows the upload when the quota lookup fails', async () => {
  vi.mocked(sumPrefixBytes).mockRejectedValueOnce(new Error('r2 down'))
  const res = await POST(signReq(ok))
  expect(res.status).toBe(200)
})
```

In `src/app/api/upload/verify/__tests__/route.test.ts`, mock the same module:

```ts
vi.mock('@/lib/upload/r2', () => ({
  getObjectHead: vi.fn(),
  deleteObject: vi.fn(async () => {}),
  publicUrl: vi.fn((k: string) => `https://media.fincards.land/${k}`),
}))
```

Preserve the existing cases for a bad signature (must delete + 400), an oversize object (must delete + 413), a missing object (404), and the IDOR guard (a path outside the owner's folder must be rejected **without** any delete call).

- [ ] **Step 5: Run the upload tests**

Run: `npx vitest run src/app/api/upload src/editor`
Expected: PASS.

- [ ] **Step 6: Verify the whole suite and types**

Run: `npm run typecheck` → no output.
Run: `npm run test` → all files pass.

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/upload/sign/route.ts" "src/app/api/upload/verify/route.ts" src/editor/lib/uploadFile.ts "src/app/api/upload/sign/__tests__/route.test.ts" "src/app/api/upload/verify/__tests__/route.test.ts"
git commit -m "feat(media): upload direct to R2 instead of Supabase Storage"
```

---

### Task 6: Copy the existing objects to R2

**Files:**
- Create: `scripts/migrate-media-to-r2.mjs`

**Interfaces:**
- Consumes: the `R2_*` env vars from Task 2.
- Produces: every object currently in the Supabase `invitation-media` bucket, present in R2 under the identical key.

Self-contained by design — `src/lib/upload/r2.ts` imports `server-only`, which does not load in a plain Node script, so the script builds its own client. Repo convention already keeps `scripts/*.mjs` standalone.

- [ ] **Step 1: Write the script**

Create `scripts/migrate-media-to-r2.mjs`:

```js
/**
 * One-off: copy every object in the Supabase `invitation-media` bucket into the
 * R2 bucket under the same key. Idempotent — re-running overwrites with identical
 * bytes. Deliberately does NOT delete from Supabase: those originals are the
 * rollback for the render-time host rewrite.
 *
 * Usage:  node scripts/migrate-media-to-r2.mjs [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'

const DRY = process.argv.includes('--dry')
const need = (n) => { const v = process.env[n]; if (!v) throw new Error(`Missing ${n}`); return v }

const supabase = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'))
const r2 = new AwsClient({
  service: 's3', region: 'auto',
  accessKeyId: need('R2_ACCESS_KEY_ID'),
  secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
})
const ENDPOINT = `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
const BUCKET = need('R2_BUCKET')
const SRC = 'invitation-media'

const objectUrl = (key) =>
  `${ENDPOINT}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`

/** Supabase list() is one level deep, so walk folders explicitly. */
async function listAll(prefix = '') {
  const { data, error } = await supabase.storage.from(SRC).list(prefix, { limit: 1000 })
  if (error) throw error
  const out = []
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id === null) out.push(...(await listAll(path))) // folder
    else out.push({ path, size: entry.metadata?.size ?? 0 })
  }
  return out
}

const files = await listAll()
console.log(`Found ${files.length} object(s) in Supabase bucket "${SRC}"`)

let copied = 0, failed = 0
for (const f of files) {
  if (DRY) { console.log(`  [dry] ${f.path} (${f.size} B)`); continue }
  try {
    const { data, error } = await supabase.storage.from(SRC).download(f.path)
    if (error || !data) throw error ?? new Error('download returned no data')
    const body = new Uint8Array(await data.arrayBuffer())
    const res = await r2.fetch(objectUrl(f.path), {
      method: 'PUT',
      body,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
    if (!res.ok) throw new Error(`R2 PUT ${res.status}`)
    console.log(`  ok  ${f.path} (${body.length} B)`)
    copied++
  } catch (e) {
    console.error(`  FAIL ${f.path}: ${e.message}`)
    failed++
  }
}
console.log(`\nCopied ${copied}, failed ${failed}, total ${files.length}`)
if (failed) process.exit(1)
```

Keys are timestamped and never rewritten, so `immutable` with a one-year TTL is safe and is what makes repeat guest views free.

- [ ] **Step 2: Dry-run it**

```bash
node scripts/migrate-media-to-r2.mjs --dry
```
Expected: lists 5 objects (7.76 MB total as of 2026-08-02) and copies nothing.

- [ ] **Step 3: Run it for real**

```bash
node scripts/migrate-media-to-r2.mjs
```
Expected: `Copied 5, failed 0, total 5`.

- [ ] **Step 4: Verify one object is publicly readable on the new host**

Take any key printed above and:

```bash
curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" "https://media.fincards.land/<key>"
```
Expected: `200`, the right content type, non-zero size.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-media-to-r2.mjs
git commit -m "chore(media): add one-off Supabase-to-R2 copy script"
```

---

### Task 7: Cutover and verification

**Files:** none — configuration and manual verification.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Deploy the branch to a Vercel preview and set the env vars there**

Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_HOST` on the preview environment. Leave `MEDIA_REWRITE_LEGACY` unset for now.

- [ ] **Step 2: Upload a photo end-to-end on the preview**

Open the editor for an invitation you own, upload a photo. In DevTools → Network confirm:
- `POST /api/upload/sign` → 200, response contains `url`, not `token`
- `PUT https://<account>.r2.cloudflarestorage.com/...` → 200 or 204
- `POST /api/upload/verify` → 200 with a `media.fincards.land` URL

A **403 on the PUT** means the Content-Type sent does not match the signed one — check that `uploadFile.ts` sends the same `contentType` it passed to `/sign`.
A **CORS error** means Task 2 Step 3 was skipped or the preview origin is not in the allowed list.

- [ ] **Step 3: Upload an MP3 on the preview**

Music tab → upload audio. Confirm it stores and plays. Audio must pass through uncompressed and land in R2 like any other object.

- [ ] **Step 4: Turn the legacy rewrite on in the preview**

Set `MEDIA_REWRITE_LEGACY=1`, redeploy, open an invitation whose photos predate the migration. Confirm the images render and that their URLs in DevTools now read `media.fincards.land`.

- [ ] **Step 5: Prove the kill switch**

Unset `MEDIA_REWRITE_LEGACY`, redeploy, reload the same invitation. Photos must still render — now from `supabase.co`. **If they do not, stop: the rollback path is broken and must be fixed before production.**

- [ ] **Step 6: Merge and set the production env vars**

Same five vars, plus `MEDIA_REWRITE_LEGACY=1`.

- [ ] **Step 7: Verify production**

Open a real published invitation as a logged-out visitor. Photos render, URLs point at `media.fincards.land`, no console errors. Upload one new photo through the editor and confirm the whole chain works in production.

- [ ] **Step 8: Watch, then clean up — not before**

Leave the Supabase originals in place. After several days with no image problems reported, delete the Supabase `invitation-media` objects. Until then they are the rollback.

---

## Deliberate deferral: `Cache-Control` on new uploads

The spec suggested folding a long `Cache-Control` into the upload "if free". It is not free here, so it is deferred on purpose rather than dropped silently.

Setting it on a presigned PUT means signing a second header, and the browser would then have to send that header byte-identically too — doubling the surface for the 403-on-signature-mismatch failure that is already the riskiest part of Task 5. The migration script (Task 6) *does* set `public, max-age=31536000, immutable` because it PUTs server-side where no signature matching is involved.

Objects uploaded after cutover therefore fall back to Cloudflare's default edge TTL (120 minutes for a 200/206). That is already far better than Supabase's 1-hour default and costs nothing extra, since R2 egress is unbilled either way. Revisit once the pipeline has been stable for a while, as its own small change.

## Out of scope

- Responsive / multi-size images (`srcset`). Dropped by the owner; current compression judged sufficient. Solary's three.js photo textures cannot use `srcset` and that complication is deferred with it.
- Migrating anything other than the media bucket. Postgres, Auth, RSVP, guests and payments stay on Supabase.
- The legacy `/api/upload` proxy route — tracked separately; note it still writes to Supabase Storage and after this change is the only path that does.
- Making the marketing/legal pages static (`getLang()` reads `cookies()`), tracked in the 2026-08-01 hosting-cost plan.
