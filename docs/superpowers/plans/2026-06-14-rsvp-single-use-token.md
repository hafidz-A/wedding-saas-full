# Single-use RSVP token gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require an invited guest to enter a single-use 6-digit token before any RSVP or ucapan write reaches the database, delivered via the owner's WhatsApp blast and regenerable by the owner.

**Architecture:** One token per `guests` row, stored as `rsvp_token_enc` (reversible, for owner display + WA blast) + `rsvp_token_hash` (HMAC, indexed lookup) + `token_used_at` (single-use flag). Both public endpoints (`/api/rsvp`, `/api/guestbook`) atomically validate-and-consume the token before insert via a shared helper. Dummy `123456` is preview-only and handled client-side (the form simulates and never calls the API when `?preview=1`).

**Tech Stack:** Next.js 14 App Router, Supabase (service-role admin client), Node `crypto` (AES-256-GCM + HMAC-SHA256), vitest + a scripted Supabase fake, CSS Modules.

---

## Conventions for this repo (read before starting)

- Tests live in a sibling `__tests__/` dir. Run a single file: `npx vitest run <path>`. **Do NOT run `npm run lint`** — it hangs (no eslintrc). Type-check with `npx tsc --noEmit`.
- Guests-domain crypto: `src/lib/guests/crypto.ts` exports `encryptField`, `decryptField`, `loadKey` and reads `GUESTS_ENCRYPTION_KEY`.
- Supabase test fake: `@/__test-stubs__/supabaseFake` → `createFakeSupabase({ tables: { <table>: { select|insert|update: { data } } }, rpc })`. The `.update().eq().is().select().maybeSingle()` chain resolves to the table's `update` result.
- Never `git add -A` — the branch `feat/solary-editor` carries unrelated user WIP. Stage only the files each task names.
- New user-facing copy must be added to BOTH `id` and `en` dictionaries (a dict-parity test enforces equal key sets).

---

## File Structure

| File | Responsibility |
|---|---|
| DB migration (Supabase MCP) | Add `rsvp_token_enc`, `rsvp_token_hash`, `token_used_at`, `token_regenerated_at` + unique index to `guests`. |
| `src/lib/guests/token.ts` (new) | Pure token helpers: generate, HMAC-hash, encrypt/decrypt, batch-unique generation. |
| `src/lib/guests/tokenGate.ts` (new) | `consumeGuestToken(admin, invitationId, token)` — atomic validate+consume against the admin client. |
| `src/lib/guests/whatsapp.ts` (modify) | Add `{{token}}`/`{{kode}}` placeholder + `token` in `TemplateVars`. |
| `src/app/[template]/[slug]/dashboard/guests/types.ts` (modify) | Extend `GuestRow`/`GuestRowDb`/`fromDbRow` with token fields. |
| `src/app/[template]/[slug]/dashboard/guests/actions.ts` (modify) | Generate token on `addGuest`/`importGuests`; add `regenerateGuestToken`. |
| `src/app/api/rsvp/route.ts` (modify) | Consume token before RSVP insert. |
| `src/app/api/guestbook/route.ts` (modify) | Consume token before note insert. |
| `src/all-templates/lovebirds/sections/Rsvp/Rsvp.jsx` (modify) | Token field + preview detect + send `token`. |
| `src/all-templates/solary/sections/RSVPSection.jsx` (modify) | Token field + preview detect. |
| `src/all-templates/solary/services/rsvp.js` (modify) | Forward `token` to `/api/rsvp`. |
| `src/app/[template]/[slug]/dashboard/GuestsTab.tsx` (modify) | Show token + Regenerate button; pass token to WA render. |
| `src/lib/i18n/dictionaries/*` (modify) | New copy keys for token field + dashboard. |
| `scripts/backfill-rsvp-tokens.mjs` (new) | One-shot token generation for existing guests. |

---

## Task 1: DB migration — add token columns to `guests`

**Files:**
- Apply via Supabase MCP `apply_migration` (name: `guests_rsvp_token`).

- [ ] **Step 1: Inspect current `guests` columns**

Use Supabase MCP `list_tables` (schema `public`) and confirm `guests` exists with `invitation_id uuid`. Note that `name_enc`, `phone_enc` already exist (sanity check the table is the right one).

- [ ] **Step 2: Apply the migration**

Use Supabase MCP `apply_migration` with name `guests_rsvp_token` and this SQL:

```sql
alter table public.guests
  add column if not exists rsvp_token_enc text,
  add column if not exists rsvp_token_hash text,
  add column if not exists token_used_at timestamptz,
  add column if not exists token_regenerated_at timestamptz;

-- One token per invitation: the (invitation_id, hash) pair is unique.
-- Partial index (hash not null) so pre-backfill rows with null hash don't collide.
create unique index if not exists guests_invitation_token_hash_uniq
  on public.guests (invitation_id, rsvp_token_hash)
  where rsvp_token_hash is not null;
```

- [ ] **Step 3: Verify**

Run Supabase MCP `execute_sql`:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='guests'
  and column_name in ('rsvp_token_enc','rsvp_token_hash','token_used_at','token_regenerated_at');
```

Expected: 4 rows.

- [ ] **Step 4: Record in repo migrations folder (if one exists)**

Check for a SQL migrations dir (`grep -ril "create table" supabase ../"Wedding Website Design new"/supabase 2>/dev/null`). If a tracked schema file exists, append the same `alter table` block so the schema-of-record stays current. Commit:

```bash
git add <schema-file-if-any>
git commit -m "feat(db): add single-use RSVP token columns to guests"
```

If no tracked schema file applies, skip the commit (migration lives only in Supabase) and note it in the PR description.

---

## Task 2: Pure token helpers — `src/lib/guests/token.ts`

**Files:**
- Create: `src/lib/guests/token.ts`
- Test: `src/lib/guests/__tests__/token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { generateToken, hashToken, encryptToken, decryptToken, generateUniqueTokens } from '../token'

beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('generateToken', () => {
  it('returns exactly 6 digits, zero-padded', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateToken()).toMatch(/^\d{6}$/)
    }
  })
})

describe('hashToken', () => {
  it('is deterministic for the same invitation + token', () => {
    expect(hashToken('inv-1', '123456')).toBe(hashToken('inv-1', '123456'))
  })
  it('differs across invitations (HMAC binds invitation_id)', () => {
    expect(hashToken('inv-1', '123456')).not.toBe(hashToken('inv-2', '123456'))
  })
  it('differs across tokens', () => {
    expect(hashToken('inv-1', '123456')).not.toBe(hashToken('inv-1', '654321'))
  })
})

describe('encryptToken / decryptToken', () => {
  it('round-trips', () => {
    const enc = encryptToken('428913')
    expect(enc).not.toBe('428913')
    expect(decryptToken(enc)).toBe('428913')
  })
})

describe('generateUniqueTokens', () => {
  it('returns the requested count of distinct codes', () => {
    const list = generateUniqueTokens(2000)
    expect(list).toHaveLength(2000)
    expect(new Set(list).size).toBe(2000)
    list.forEach((t) => expect(t).toMatch(/^\d{6}$/))
  })
})
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run src/lib/guests/__tests__/token.test.ts`
Expected: FAIL — `Cannot find module '../token'`.

- [ ] **Step 3: Implement `token.ts`**

```ts
import { createHmac, randomInt } from 'node:crypto'
import { loadKey, encryptField, decryptField } from './crypto'

/** A fresh random 6-digit code, zero-padded (e.g. "042913"). Never sequential. */
export function generateToken(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * HMAC-SHA256 of `invitationId:token`, keyed by the guests-domain key. This is
 * the indexed lookup/compare value stored in guests.rsvp_token_hash — no raw
 * token is ever queryable. Binds the token to one invitation so the same 6
 * digits in two couples' lists hash differently.
 */
export function hashToken(invitationId: string, token: string): string {
  const key = loadKey(process.env.GUESTS_ENCRYPTION_KEY, 'GUESTS_ENCRYPTION_KEY')
  return createHmac('sha256', key).update(`${invitationId}:${token}`).digest('hex')
}

/** Reversible ciphertext of the code, so the owner can read/copy + WA-blast it. */
export function encryptToken(token: string): string {
  return encryptField(token) as string
}

export function decryptToken(enc: string | null | undefined): string | null {
  return decryptField(enc)
}

/**
 * `count` distinct 6-digit codes. Used by bulk import so a single batch never
 * collides with itself. Throws if asked for more than the space allows.
 */
export function generateUniqueTokens(count: number): string[] {
  if (count > 900_000) throw new Error('Terlalu banyak kode unik diminta')
  const set = new Set<string>()
  while (set.size < count) set.add(generateToken())
  return [...set]
}
```

- [ ] **Step 4: Run it — expect pass**

Run: `npx vitest run src/lib/guests/__tests__/token.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guests/token.ts src/lib/guests/__tests__/token.test.ts
git commit -m "feat(guests): pure single-use token helpers (generate/hash/encrypt)"
```

---

## Task 3: Atomic consume helper — `src/lib/guests/tokenGate.ts`

**Files:**
- Create: `src/lib/guests/tokenGate.ts`
- Test: `src/lib/guests/__tests__/tokenGate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { hashToken } from '../token'
import { consumeGuestToken } from '../tokenGate'

beforeAll(() => {
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('consumeGuestToken', () => {
  it('returns false for a malformed token without touching the DB', async () => {
    const fake = createFakeSupabase()
    expect(await consumeGuestToken(fake, 'inv-1', 'abc')).toBe(false)
    expect(fake.lastCall('update')).toBeUndefined()
  })

  it('consumes and returns true when an unused matching row exists', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: { id: 'g1' } } } } })
    expect(await consumeGuestToken(fake, 'inv-1', '123456')).toBe(true)
    // filters by invitation_id + hash, and writes token_used_at
    const upd = fake.lastCall('update')
    expect(upd?.value).toHaveProperty('token_used_at')
    const filters = fake._calls.filter((c) => c.kind === 'filter')
    expect(filters.some((f) => f.column === 'invitation_id' && f.value === 'inv-1')).toBe(true)
    expect(filters.some((f) => f.column === 'rsvp_token_hash' && f.value === hashToken('inv-1', '123456'))).toBe(true)
  })

  it('returns false when no unused row matched (wrong or already-used)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null } } } })
    expect(await consumeGuestToken(fake, 'inv-1', '999999')).toBe(false)
  })

  it('throws when the DB errors', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { error: { message: 'boom' } } } } })
    await expect(consumeGuestToken(fake, 'inv-1', '123456')).rejects.toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run src/lib/guests/__tests__/tokenGate.test.ts`
Expected: FAIL — `Cannot find module '../tokenGate'`.

- [ ] **Step 3: Implement `tokenGate.ts`**

```ts
import { hashToken } from './token'

/**
 * Atomically validate + consume a guest's single-use token for an invitation.
 *
 * Returns true ONLY if a matching, not-yet-used token row was flipped to used.
 * The `where token_used_at is null` clause makes this race-safe: two concurrent
 * submits with the same code → exactly one update matches a row, the other
 * matches zero. Caller maps `false` to a single generic error (no wrong-vs-used
 * oracle). Truly single-use: any successful RSVP OR ucapan consumes the code.
 *
 * `admin` is a service-role Supabase client (RLS bypass is intentional here).
 */
export async function consumeGuestToken(
  admin: any,
  invitationId: string,
  token: string,
): Promise<boolean> {
  if (!/^\d{6}$/.test(token || '')) return false
  const tokenHash = hashToken(invitationId, token)
  const { data, error } = await (admin.from('guests') as any)
    .update({ token_used_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('rsvp_token_hash', tokenHash)
    .is('token_used_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw error
  return !!data
}
```

- [ ] **Step 4: Run it — expect pass**

Run: `npx vitest run src/lib/guests/__tests__/tokenGate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guests/tokenGate.ts src/lib/guests/__tests__/tokenGate.test.ts
git commit -m "feat(guests): atomic single-use token consume helper"
```

---

## Task 4: WhatsApp template `{{token}}` / `{{kode}}`

**Files:**
- Modify: `src/lib/guests/whatsapp.ts`
- Test: `src/lib/guests/__tests__/whatsapp.test.ts` (create if absent)

- [ ] **Step 1: Write/extend the failing test**

Create `src/lib/guests/__tests__/whatsapp.test.ts` (or append if it exists):

```ts
import { describe, it, expect } from 'vitest'
import { renderMessageTemplate, buildWhatsAppUrl } from '../whatsapp'

const vars = { name: 'Budi', url: 'https://x.test/a', token: '428913' }

describe('renderMessageTemplate token', () => {
  it('replaces {{token}} and {{kode}} (case-insensitive)', () => {
    expect(renderMessageTemplate('Hi {{name}}, kode {{token}}', vars)).toBe('Hi Budi, kode 428913')
    expect(renderMessageTemplate('Kode: {{ KODE }}', vars)).toBe('Kode: 428913')
  })
  it('still replaces name and url', () => {
    expect(renderMessageTemplate('{{nama}} {{link}} {{kode}}', vars)).toBe('Budi https://x.test/a 428913')
  })
})

describe('buildWhatsAppUrl', () => {
  it('uses wa.me/<phone> when phone present', () => {
    expect(buildWhatsAppUrl({ phoneE164: '628123', message: 'hi' })).toBe('https://wa.me/628123?text=hi')
  })
})
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run src/lib/guests/__tests__/whatsapp.test.ts`
Expected: FAIL — token replacement missing / `TemplateVars` has no `token`.

- [ ] **Step 3: Implement**

In `src/lib/guests/whatsapp.ts`, change `TemplateVars` and `renderMessageTemplate`:

```ts
export interface TemplateVars {
  name: string
  url: string
  token: string
}

export function renderMessageTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{\s*(name|nama)\s*\}\}/gi, vars.name)
    .replace(/\{\{\s*(url|link)\s*\}\}/gi, vars.url)
    .replace(/\{\{\s*(token|kode)\s*\}\}/gi, vars.token)
}
```

- [ ] **Step 4: Run it — expect pass**

Run: `npx vitest run src/lib/guests/__tests__/whatsapp.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check (callers of renderMessageTemplate now need `token`)**

Run: `npx tsc --noEmit`
Expected: an error in `GuestsTab.tsx` (the existing `renderMessageTemplate({ name, url })` call lacks `token`). That is fixed in Task 9 — note it and proceed. If you prefer a green tree per-commit, do Task 9's `handleSend` edit now; otherwise commit and continue.

- [ ] **Step 6: Commit**

```bash
git add src/lib/guests/whatsapp.ts src/lib/guests/__tests__/whatsapp.test.ts
git commit -m "feat(guests): {{token}}/{{kode}} placeholder in WA invite template"
```

---

## Task 5: Extend `GuestRow` types with token fields

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/guests/types.ts`

- [ ] **Step 1: Edit `types.ts`**

Add fields to both interfaces and decrypt in `fromDbRow`:

```ts
// In GuestRow (app-shape, plaintext):
  rsvpToken: string | null
  tokenUsedAt: string | null

// In GuestRowDb (raw DB):
  rsvp_token_enc: string | null
  token_used_at: string | null

// In fromDbRow(), add to the returned object:
    rsvpToken: decryptField(row.rsvp_token_enc),
    tokenUsedAt: row.token_used_at,
```

(`decryptField` is already imported at the top of `types.ts`.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no NEW errors from this file. (The `GuestsTab.tsx` token error from Task 4 may still show until Task 9.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/guests/types.ts"
git commit -m "feat(guests): expose rsvpToken + tokenUsedAt on GuestRow"
```

---

## Task 6: Generate tokens on create/import + `regenerateGuestToken`

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/guests/actions.ts`
- Test: `src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts`

- [ ] **Step 1: Write failing tests** (append to the existing actions test file)

```ts
import { regenerateGuestToken } from '../actions'
import { hashToken } from '@/lib/guests/token'

describe('addGuest token', () => {
  it('writes an encrypted token + hash on insert', async () => {
    const fake = createFakeSupabase({ tables: { guests: { insert: { data: guestRow() } } } })
    mockAdmin.mockReturnValue(fake as any)
    await addGuest('slug', { name: 'Budi' })
    const ins = fake.lastCall('insert')
    expect(ins?.value.rsvp_token_enc).toBeTruthy()
    expect(ins?.value.rsvp_token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(ins?.value.rsvp_token_enc).not.toMatch(/^\d{6}$/) // not plaintext
  })
})

describe('regenerateGuestToken', () => {
  it('resets used + writes a new hash scoped by invitation_id (IDOR-safe)', async () => {
    const fake = createFakeSupabase({ tables: { guests: { update: { data: null } } } })
    mockAdmin.mockReturnValue(fake as any)
    const { token } = await regenerateGuestToken('slug', 'g1')
    expect(token).toMatch(/^\d{6}$/)
    const upd = fake.lastCall('update')
    expect(upd?.value.token_used_at).toBeNull()
    expect(upd?.value.rsvp_token_hash).toBe(hashToken('inv-1', token))
    const filters = fake._calls.filter((c) => c.kind === 'filter')
    expect(filters.some((f) => f.column === 'invitation_id' && f.value === 'inv-1')).toBe(true)
    expect(filters.some((f) => f.column === 'id' && f.value === 'g1')).toBe(true)
  })

  it('throws when not the owner', async () => {
    mockOwner.mockResolvedValue(null)
    await expect(regenerateGuestToken('slug', 'g1')).rejects.toThrow(/Forbidden/)
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run "src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts"`
Expected: FAIL — `regenerateGuestToken` not exported; insert lacks token fields.

- [ ] **Step 3: Implement in `actions.ts`**

Add the import near the other guests imports:

```ts
import { generateToken, hashToken, encryptToken, generateUniqueTokens } from '@/lib/guests/token'
```

In `addGuest`, change the insert object to include the token (generate before insert):

```ts
  const token = generateToken()
  const { data, error } = (await admin
    .from('guests')
    .insert({
      invitation_id,
      name_enc: encryptField(name),
      phone_enc: encryptField(phoneE164),
      group_label: input.groupLabel?.trim() || null,
      rsvp_token_enc: encryptToken(token),
      rsvp_token_hash: hashToken(invitation_id, token),
    } as any)
    .select()
    .single()) as { data: GuestRowDb | null; error: { message: string } | null }
```

In `importGuests`, generate one distinct token per row, excluding any token already present for this invitation, then build the insert rows:

```ts
  const admin = createSupabaseAdminClient()

  // Existing hashes for this invitation → guarantee the batch never collides
  // with codes already issued (the unique index would otherwise reject the
  // whole insert).
  const { data: existing } = (await admin
    .from('guests')
    .select('rsvp_token_hash')
    .eq('invitation_id', invitation_id)) as { data: { rsvp_token_hash: string | null }[] | null }
  const usedHashes = new Set((existing || []).map((r) => r.rsvp_token_hash).filter(Boolean) as string[])

  const insertRows = rows.map((r) => {
    let token = generateToken()
    let h = hashToken(invitation_id, token)
    while (usedHashes.has(h)) {
      token = generateToken()
      h = hashToken(invitation_id, token)
    }
    usedHashes.add(h)
    return {
      invitation_id,
      name_enc: encryptField(r.name),
      phone_enc: encryptField(r.phoneE164),
      rsvp_token_enc: encryptToken(token),
      rsvp_token_hash: h,
    }
  })

  const { error, count } = await admin
    .from('guests')
    .insert(insertRows as any, { count: 'exact' })
```

(Remove the old `rows.map(...)` inline insert it replaces. `generateUniqueTokens` is imported for symmetry/future use; the exclude-existing loop above is the import path.)

Add the new server action at the end of the file:

```ts
/**
 * Regenerate a guest's single-use RSVP token (owner error-recovery). Writes a
 * fresh enc + hash, clears token_used_at so the new code works, and stamps
 * token_regenerated_at. Scoped by invitation_id so an owner can never touch
 * another couple's guest (IDOR). Returns the new plaintext code for display.
 */
export async function regenerateGuestToken(
  slug: string,
  id: string,
): Promise<{ token: string }> {
  const invitation_id = await authorizeOwnership(slug)
  const admin = createSupabaseAdminClient()
  const token = generateToken()
  const { error } = await (admin.from('guests') as any)
    .update({
      rsvp_token_enc: encryptToken(token),
      rsvp_token_hash: hashToken(invitation_id, token),
      token_used_at: null,
      token_regenerated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('invitation_id', invitation_id)
  if (error) throw new Error(error.message)
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  return { token }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run "src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/guests/actions.ts" "src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts"
git commit -m "feat(guests): issue token on create/import + regenerateGuestToken action"
```

---

## Task 7: Gate `/api/rsvp` — consume token before insert

**Files:**
- Modify: `src/app/api/rsvp/route.ts`
- Test: `src/app/api/rsvp/__tests__/route.test.ts` (existing)

- [ ] **Step 1: Write failing tests** (append to the existing rsvp route test)

Note: the existing `liveFake()` helper must also script the `guests` update. Add a local helper in the new `describe`:

```ts
import { consumeGuestToken } from '@/lib/guests/tokenGate'

// liveFake() + a consumable token row
function liveTokenFake(tokenRow: any = { id: 'g1' }) {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: LIVE } },
      guests: { update: { data: tokenRow } },
      rsvps: { insert: { data: { id: 'rsvp-1' } } },
      attendances: { insert: { data: { id: 'att-1' } } },
    },
  })
}

describe('POST /api/rsvp token gate', () => {
  beforeAll(() => { process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64') })

  it('rejects with 403 when the token is missing', async () => {
    mockAdmin.mockReturnValue(liveTokenFake() as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true }))
    expect(res.status).toBe(403)
  })

  it('rejects with 403 when the token does not match an unused row', async () => {
    mockAdmin.mockReturnValue(liveTokenFake(null) as any) // update matched 0 rows
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true, token: '000000' }))
    expect(res.status).toBe(403)
    // and no rsvp insert happened
  })

  it('records the RSVP when a valid token is consumed', async () => {
    const fake = liveTokenFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(post({ slug: 'x', guest_name: 'A', attending: true, token: '123456' }))
    expect(res.status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'rsvps')).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/app/api/rsvp/__tests__/route.test.ts`
Expected: FAIL — token currently ignored, all three return 200 / insert always runs.

- [ ] **Step 3: Implement in `route.ts`**

Add the import:

```ts
import { consumeGuestToken } from '@/lib/guests/tokenGate'
```

Pull `token` from the body destructure (line ~26):

```ts
  const { slug, guest_name, attending, guest_count, meal_choice, message, token } = body || {}
```

After the `is_published`/`is_paid` check (the block ending with `return ... 'Invitation not published'`), and BEFORE the `cleanName` computation, insert:

```ts
  // Single-use token gate: only an invited guest holding a valid, unused code
  // may submit. Consume atomically before any write. Generic error — no
  // wrong-vs-used oracle. Preview/demo never reaches here (the form simulates).
  let tokenOk: boolean
  try {
    tokenOk = await consumeGuestToken(supabase, invitation.id, String(token || ''))
  } catch (e) {
    console.error('[rsvp token]', e)
    return NextResponse.json({ error: 'Gagal memvalidasi kode. Coba lagi.' }, { status: 500 })
  }
  if (!tokenOk) {
    return NextResponse.json({ error: 'Kode tidak valid atau sudah dipakai' }, { status: 403 })
  }
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run src/app/api/rsvp/__tests__/route.test.ts`
Expected: PASS (all existing tests too — they don't assert token, but note: pre-existing happy-path tests that omit `token` will now 403). **Update those pre-existing happy-path tests** to use `liveTokenFake()` and include `token: '123456'` in the body so they still exercise the insert path. Re-run until green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/rsvp/route.ts src/app/api/rsvp/__tests__/route.test.ts
git commit -m "feat(rsvp): require single-use token before recording RSVP"
```

---

## Task 8: Gate `/api/guestbook` — consume token before insert

**Files:**
- Modify: `src/app/api/guestbook/route.ts`
- Test: `src/app/api/guestbook/__tests__/route.test.ts` (existing)

- [ ] **Step 1: Write failing tests** (append to the existing guestbook route test)

```ts
import { consumeGuestToken } from '@/lib/guests/tokenGate'

function liveNoteFake(tokenRow: any = { id: 'g1' }) {
  return createFakeSupabase({
    rpc: { rl_hit: { data: true } },
    tables: {
      invitations: { select: { data: { id: 'inv-1', is_published: true, is_paid: true } } },
      guests: { update: { data: tokenRow } },
      guestbook_notes: { insert: { data: { id: 'n1', guest_name_enc: 'x', message_enc: 'y', color: 'gold', created_at: 't' } } },
    },
  })
}

describe('POST /api/guestbook token gate', () => {
  beforeAll(() => { process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64') })

  it('rejects with 403 when token missing', async () => {
    mockAdmin.mockReturnValue(liveNoteFake() as any)
    const res = await POST(gbPost({ slug: 'x', name: 'A', message: 'hai' }))
    expect(res.status).toBe(403)
  })

  it('inserts the note when a valid token is consumed', async () => {
    const fake = liveNoteFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await POST(gbPost({ slug: 'x', name: 'A', message: 'hai', token: '123456' }))
    expect(res.status).toBe(200)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guestbook_notes')).toBe(true)
  })
})
```

(Reuse the existing test file's request helper; if it is named differently than `gbPost`, match the existing name. `randomBytes` import is already present in the rsvp test pattern — add it to this file's imports if missing.)

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/app/api/guestbook/__tests__/route.test.ts`
Expected: FAIL — token ignored.

- [ ] **Step 3: Implement in `route.ts`**

Add import:

```ts
import { consumeGuestToken } from '@/lib/guests/tokenGate'
```

Parse `token` alongside the other fields (after the `color` line):

```ts
  const token = String(body?.token || '').trim()
```

After the invitation resolve + live check (the block returning `'Undangan tidak ditemukan'`), and BEFORE the `guestbook_notes` insert, add:

```ts
  // Single-use token gate (truly single-use: an ucapan consumes the same code
  // an RSVP would). Generic error, atomic consume, preview never reaches here.
  let tokenOk: boolean
  try {
    tokenOk = await consumeGuestToken(supabase, invitation.id, token)
  } catch (e) {
    console.error('[guestbook token]', e)
    return NextResponse.json({ error: 'Gagal memvalidasi kode. Coba lagi.' }, { status: 500 })
  }
  if (!tokenOk) {
    return NextResponse.json({ error: 'Kode tidak valid atau sudah dipakai' }, { status: 403 })
  }
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run src/app/api/guestbook/__tests__/route.test.ts`
Expected: PASS. **Update any pre-existing happy-path tests** in this file to script `guests.update` and include `token: '123456'` so they still reach the insert.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/guestbook/route.ts src/app/api/guestbook/__tests__/route.test.ts
git commit -m "feat(guestbook): require single-use token before recording ucapan"
```

---

## Task 9: Lovebirds RSVP form — token field + preview + send token

**Files:**
- Modify: `src/all-templates/lovebirds/sections/Rsvp/Rsvp.jsx`
- Modify: `src/app/[template]/[slug]/dashboard/GuestsTab.tsx` (pass token to WA render — closes the Task 4 tsc error)

- [ ] **Step 1: Add preview detection + token field state in `Rsvp.jsx`**

Near the top of the component body (after `const attending = watch('attending')`), add a preview flag and register a `token` field default. First extend `defaultValues` (line ~39) with `token: ''`. Then add the preview helper:

```js
  // Preview iframe loads /<template>/<slug>?preview=1 — in preview we never hit
  // the live API; we simulate so the owner can test the form. 123456 is the
  // demo code (cosmetic only; the live endpoint has no 123456 backdoor).
  const isPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === '1'
```

- [ ] **Step 2: Add the token input to the form**

Inside the `<form>`, immediately after the "Your name" `.row` block (the one closing at line ~112), add:

```jsx
              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>Kode undangan (6 angka)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className={styles.input}
                    placeholder={isPreview ? '123456' : '••••••'}
                    aria-invalid={errors.token ? 'true' : 'false'}
                    {...register('token', {
                      required: 'Masukkan kode undangan dari WhatsApp',
                      pattern: { value: /^\d{6}$/, message: 'Kode harus 6 angka' },
                    })}
                  />
                  <span className={styles.hint}>1 kode = 1 kali kirim. Hubungi pemilik jika kode gagal.</span>
                  {errors.token && <span className={styles.error}>{errors.token.message}</span>}
                </label>
              </div>
```

(If `styles.hint` does not exist in `Rsvp.module.css`, add a small muted style: `.hint { display:block; font-size:.8rem; opacity:.65; margin-top:4px; }`.)

- [ ] **Step 3: Send the token; simulate in preview**

In `onSubmit`, change the standalone/preview short-circuit and the fetch body:

```js
  const onSubmit = async (data) => {
    setSubmitError(null)
    // Standalone (no slug) OR preview — simulate success, never call the API.
    if (!slug || isPreview) {
      await new Promise((r) => setTimeout(r, 900))
      setSubmitted(true)
      return
    }
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          guest_name: data.name,
          attending: data.attending === 'yes',
          guest_count: data.guestCount,
          meal_choice: data.meal || null,
          message: data.message || null,
          token: data.token,
        }),
      })
```

(Leave the rest of the `try/catch` unchanged.)

- [ ] **Step 4: Pass token to WA render in `GuestsTab.tsx`**

At the `renderMessageTemplate(source, { name: g.name, url: publicUrl })` call (line ~92), add the token:

```ts
    const message = renderMessageTemplate(source, {
      name: g.name,
      url: publicUrl,
      token: g.rsvpToken || '',
    })
```

Also update the `tempRow` object (line ~119) so the optimistic add row satisfies `GuestRow`:

```ts
      rsvpToken: null,
      tokenUsedAt: null,
```

- [ ] **Step 5: Type-check + smoke**

Run: `npx tsc --noEmit`
Expected: clean (the Task 4 token error is now resolved).

Manual smoke (do once at the end in Task 12 too): `npm run dev`, open the lovebirds dummy dashboard preview, confirm the RSVP form shows the code field and a preview submit with `123456` succeeds.

- [ ] **Step 6: Commit**

```bash
git add "src/all-templates/lovebirds/sections/Rsvp/Rsvp.jsx" "src/all-templates/lovebirds/sections/Rsvp/Rsvp.module.css" "src/app/[template]/[slug]/dashboard/GuestsTab.tsx"
git commit -m "feat(lovebirds): RSVP token field + preview simulate + WA token render"
```

---

## Task 10: Solary RSVP form — token field + preview + send token

**Files:**
- Modify: `src/all-templates/solary/sections/RSVPSection.jsx`
- Modify: `src/all-templates/solary/services/rsvp.js`

- [ ] **Step 1: Forward `token` in the service**

In `services/rsvp.js`, accept and forward `token`, and treat preview/demo as simulate. Change the signature + body:

```js
export async function submitRSVP({ slug = "demo", guest_name, attending, guest_count, meal_choice, message, token }) {
  if (!isRealSlug(slug)) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, simulated: true };
  }

  const res = await fetch("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      guest_name,
      attending: !!attending,
      guest_count,
      meal_choice: meal_choice || null,
      message: message || null,
      token: token || "",
    }),
  });
```

- [ ] **Step 2: Add the token field + preview to `RSVPSection.jsx`**

Open `RSVPSection.jsx`, locate the form state and the submit handler that calls `submitRSVP(...)`. Add:

```js
  // Preview iframe (?preview=1) simulates; 123456 is cosmetic demo only.
  const isPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === '1'
```

Add a controlled `token` field to the form's state (match the file's existing pattern — if it uses `useState` per field, add `const [token, setToken] = useState('')`; if it uses react-hook-form, register `token` like the other fields). Render an input near the name field:

```jsx
        <label className="...matching existing field classes...">
          <span>Kode undangan (6 angka)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={isPreview ? '123456' : '••••••'}
            required
          />
          <small style={{ opacity: 0.7 }}>1 kode = 1 kali kirim.</small>
        </label>
```

In the submit handler, validate 6 digits client-side, simulate in preview, and pass the token:

```js
    if (!/^\d{6}$/.test(token)) {
      setError?.('Masukkan kode undangan 6 angka dari WhatsApp')
      return
    }
    if (isPreview) {
      // simulate success without hitting the API
      setSubmitted?.(true)
      return
    }
    await submitRSVP({ slug, guest_name, attending, guest_count, meal_choice, message, token })
```

(Match the actual variable/setter names in the file — `setError`/`setSubmitted` are illustrative of the existing success/error state setters.)

- [ ] **Step 3: Type-check + smoke**

Run: `npx tsc --noEmit`
Expected: clean.

Smoke: open a solary preview, confirm the code field renders and a `123456` preview submit succeeds.

- [ ] **Step 4: Commit**

```bash
git add "src/all-templates/solary/sections/RSVPSection.jsx" "src/all-templates/solary/services/rsvp.js"
git commit -m "feat(solary): RSVP token field + preview simulate + forward token"
```

---

## Task 11: Dashboard GuestsTab — show token + Regenerate button + default WA copy

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/GuestsTab.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/GuestsTab.module.css` (small additions)
- Modify: `src/lib/i18n/dictionaries/*` (dashboard copy keys, if dashboard dict is used here — otherwise inline ID strings consistent with the file)

- [ ] **Step 1: Wire the regenerate action + token display**

Add the import:

```ts
import { regenerateGuestToken } from './guests/actions'
```

Add a handler inside the component:

```ts
  const handleRegenerate = (g: GuestRow) => {
    if (isPending) return
    startTransition(async () => {
      try {
        const { token } = await regenerateGuestToken(slug, g.id)
        setLocalGuests((prev) =>
          prev.map((x) => (x.id === g.id ? { ...x, rsvpToken: token, tokenUsedAt: null } : x)),
        )
      } catch {
        // surface via the existing error UI pattern in this file
      }
    })
  }
```

In the per-guest row (the `filtered.map((g) => ...)` at line ~257), render the code and a regenerate button near the existing row actions:

```jsx
                <span className={styles.token}>
                  Kode: <code>{g.rsvpToken || '—'}</code>
                  {g.tokenUsedAt && <em className={styles.tokenUsed}> (terpakai)</em>}
                </span>
                <button
                  type="button"
                  className={styles.regenBtn}
                  onClick={() => handleRegenerate(g)}
                  disabled={isPending}
                  title="Buat kode baru (kode lama langsung tidak berlaku)"
                >
                  Buat ulang kode
                </button>
```

Add minimal styles in `GuestsTab.module.css`:

```css
.token { font-size: .85rem; opacity: .85; }
.token code { letter-spacing: .12em; font-weight: 600; }
.tokenUsed { color: #b45309; font-style: normal; }
.regenBtn { font-size: .8rem; }
```

- [ ] **Step 2: Add `{{kode}}` to the default WA invite message**

Find the default invite-message constant in this file (the fallback used when `config.inviteMessageTemplate` is empty — search for the existing default that contains `{{name}}` and `{{url}}`). Append a code line so a fresh couple's blast carries the token by default:

```
\n\nKode RSVP kamu: {{kode}} (sekali pakai)
```

If the default lives elsewhere (e.g. a constants module), edit it there and `git add` that file too.

- [ ] **Step 3: Type-check + smoke**

Run: `npx tsc --noEmit`
Expected: clean.

Smoke: open the dummy dashboard Guests tab → each guest shows a 6-digit code; "Buat ulang kode" changes it; the WhatsApp button's message includes the code.

- [ ] **Step 4: dict-parity (if any dictionary keys were added)**

Run: `npx vitest run` and confirm the dict-parity test passes. If you added keys to one language only, add the mirror key.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/GuestsTab.tsx" "src/app/[template]/[slug]/dashboard/GuestsTab.module.css"
git commit -m "feat(dashboard): show RSVP token + regenerate + default WA code line"
```

---

## Task 12: Backfill script for existing guests

**Files:**
- Create: `scripts/backfill-rsvp-tokens.mjs`

- [ ] **Step 1: Inspect an existing script for the env/client pattern**

Read one existing `scripts/*.mjs` that talks to Supabase (e.g. `scripts/encrypt-existing-data.mjs` referenced in project memory, or `scripts/seed-dummy*`) to copy how it loads `.env.local`, builds the service-role client, and reads `GUESTS_ENCRYPTION_KEY`.

- [ ] **Step 2: Implement the script**

```js
// scripts/backfill-rsvp-tokens.mjs
// Generate a single-use RSVP token for every guest missing one. Idempotent:
// skips rows that already have rsvp_token_hash. Run AFTER the guests_rsvp_token
// migration. Usage: node scripts/backfill-rsvp-tokens.mjs [--dry]
import { createClient } from '@supabase/supabase-js'
import { createHmac, randomInt, createCipheriv, randomBytes } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEY_B64 = process.env.GUESTS_ENCRYPTION_KEY
if (!URL || !SERVICE || !KEY_B64) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GUESTS_ENCRYPTION_KEY')
  process.exit(1)
}
const KEY = Buffer.from(KEY_B64, 'base64')
if (KEY.length !== 32) { console.error('GUESTS_ENCRYPTION_KEY must decode to 32 bytes'); process.exit(1) }
const DRY = process.argv.includes('--dry')

const gen = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
const hash = (invId, tok) => createHmac('sha256', KEY).update(`${invId}:${tok}`).digest('hex')
const enc = (tok) => {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([c.update(tok, 'utf8'), c.final()])
  return Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64')
}

const db = createClient(URL, SERVICE, { auth: { persistSession: false } })

const { data: guests, error } = await db
  .from('guests')
  .select('id, invitation_id, rsvp_token_hash')
  .is('rsvp_token_hash', null)
if (error) { console.error(error); process.exit(1) }

console.log(`Guests needing a token: ${guests.length}${DRY ? ' (dry run)' : ''}`)

// Track per-invitation hashes within this run to avoid intra-run collisions.
const seen = new Map() // invitation_id -> Set(hash)
let done = 0
for (const g of guests) {
  const set = seen.get(g.invitation_id) ?? new Set()
  let tok = gen(), h = hash(g.invitation_id, tok)
  while (set.has(h)) { tok = gen(); h = hash(g.invitation_id, tok) }
  set.add(h); seen.set(g.invitation_id, set)
  if (!DRY) {
    const { error: upErr } = await db
      .from('guests')
      .update({ rsvp_token_enc: enc(tok), rsvp_token_hash: h })
      .eq('id', g.id)
      .is('rsvp_token_hash', null)
    if (upErr) { console.error(`Failed for ${g.id}:`, upErr.message); continue }
  }
  done++
}
console.log(`${DRY ? 'Would update' : 'Updated'} ${done} guests.`)
process.exit(0)
```

- [ ] **Step 3: Dry-run, then run for real**

```bash
node scripts/backfill-rsvp-tokens.mjs --dry
node scripts/backfill-rsvp-tokens.mjs
```

Expected: the dry run reports a count; the real run updates that many. Re-running reports `0` (idempotent).

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-rsvp-tokens.mjs
git commit -m "chore(guests): one-shot backfill of single-use RSVP tokens"
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: all green, including dict-parity. Fix any pre-existing rsvp/guestbook happy-path tests that now need a token (see Tasks 7/8 Step 4).

- [ ] **Step 3: Manual end-to-end smoke (dev server)**

Run `npm run dev`, then:
1. Dummy dashboard Guests tab → confirm each guest has a code; "Buat ulang kode" rotates it; WA button message contains the code.
2. Preview iframe (Guests/editor preview) → RSVP form shows the code field; submitting with `123456` succeeds (simulated, no DB write).
3. (If feasible against a live published dummy) submit a real RSVP with a valid code → success; submit again with the same code → "Kode tidak valid atau sudah dipakai"; the same code on the ucapan form → also rejected (truly single-use).

- [ ] **Step 4: Note the rollout caveat in the PR/handoff**

Hard-gate means any already-live invitation with an **empty guest list** will have RSVP/ucapan blocked once deployed. Before deploy, decide per the spec's "Rollout notes": either accept (couples must add guests + send codes) or seed/grace existing live invitations. Surface this explicitly to the user.

---

## Self-review notes (author)

- **Spec coverage:** data model (Task 1, 5), token lib hash+enc (Task 2), atomic single-use consume (Task 3), hard-gate on RSVP (Task 7) + ucapan (Task 8), manual OTP field both templates (Tasks 9, 10), preview-only client-side `123456` (Tasks 9, 10), owner display + regenerate + `{{kode}}` WA (Tasks 4, 6, 11), backfill (Task 12). All spec sections map to a task.
- **Truly single-use** is honored by a single `token_used_at` consumed by either endpoint via the shared `consumeGuestToken`.
- **Type consistency:** `consumeGuestToken(admin, invitationId, token)`, `regenerateGuestToken(slug, id) → { token }`, `GuestRow.rsvpToken/tokenUsedAt`, `TemplateVars.token`, DB columns `rsvp_token_enc/rsvp_token_hash/token_used_at/token_regenerated_at` — used identically across tasks.
- **Known pre-existing-test impact:** Tasks 7 & 8 break the existing happy-path rsvp/guestbook tests (they omit a token) — each task's Step 4 explicitly fixes them.
