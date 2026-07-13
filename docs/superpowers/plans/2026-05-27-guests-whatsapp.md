# Guests Tab + WhatsApp Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Guests tab to the per-couple dashboard so the couple can manage their invitation list, generate a WhatsApp send link per guest (using the guest's phone if known, otherwise WhatsApp's contact picker), and see which guests have been sent.

**Architecture:** Hybrid WhatsApp scheme — one new `guests` table with **app-level AES-256-GCM encryption** for personally-identifying fields. Plaintext `name`, `phone_e164`, and `notes` never touch Postgres — only base64-encoded `iv || ciphertext || authTag` blobs go in. Encryption happens in `src/lib/guests/crypto.ts` (Node `crypto` module, key from `GUESTS_ENCRYPTION_KEY` env var, 32-byte base64). Server actions encrypt on write and decrypt on read; the client always sees plaintext. When the decrypted phone is present, the WA button generates `https://wa.me/<phone>?text=<message>`; when null, it generates `https://wa.me/?text=<message>` and WhatsApp shows the contact picker. Four small **pure** helpers (`normalizePhone`, `parseGuestImport`, `buildWhatsAppUrl`, `encryptField`/`decryptField`) live in `src/lib/guests/` and carry the only non-trivial logic — they are unit-tested in isolation so the UI can stay thin. All mutations are auth-gated server actions scoped per slug, identical to the existing pattern in `NotesTab`. Status tracking is **optimistic** — the "Kirim WA" button stamps `sent_at = now()` server-side before opening the URL; we cannot detect a successful WhatsApp send, so this is the best we can do.

**Security trade-offs (read before approving):**
- ✅ Plaintext PII (guest names, phone numbers, private notes) never lives in Postgres at rest. A leaked DB dump or rogue Supabase admin sees only ciphertext.
- ✅ Per-row random IV (12 bytes) — identical plaintexts produce different ciphertexts. Ciphertext doesn't leak frequency analysis.
- ✅ AES-GCM `authTag` (16 bytes) detects any tampering — a row that's been altered in-DB throws on decrypt instead of returning silent garbage.
- ⚠️ **No SQL-side search/filter on encrypted columns.** The dashboard fetches all rows for the slug, then filters in JS memory. Fine for 0–500 guests; if a couple ever has >5000 guests, revisit.
- ⚠️ **No DB-level uniqueness constraint on phone.** Dedup, if added later, must run app-side (compare decrypted values).
- ⚠️ **Key loss = data loss.** `GUESTS_ENCRYPTION_KEY` must be backed up out-of-band (1Password / encrypted secrets manager). Rotation requires a re-encrypt pass over every row.
- ⚠️ The key lives in the running Next.js server's env. A server compromise still exposes the data — encryption protects against *DB-only* threats, not full server takeover.

**Tech Stack:** Next.js 14 App Router (server actions), Supabase Postgres + RLS, bcryptjs (existing per-slug session cookie), Vitest (new — `node:test` would work but Vitest's `describe`/`it`/`expect` matches the Indonesian-dev mental model better), React Hook Form (only inside `GuestImportModal`), CSS Modules + CSS variables (per project convention — no Tailwind).

---

## File Structure

**Create:**
- `supabase/migrations/2026-05-27-guests.sql` — local copy of the migration script (the canonical schema lives in `../Wedding Website Design new/supabase/migrations/` — copy there once approved)
- `src/lib/guests/phone.ts` — `normalizePhone()` + `formatPhoneDisplay()`
- `src/lib/guests/parse-import.ts` — `parseGuestImport()` (tab-separated parser)
- `src/lib/guests/whatsapp.ts` — `buildWhatsAppUrl()` + message template renderer
- `src/lib/guests/crypto.ts` — `encryptField()` / `decryptField()` (AES-256-GCM)
- `src/lib/guests/__tests__/phone.test.ts`
- `src/lib/guests/__tests__/parse-import.test.ts`
- `src/lib/guests/__tests__/whatsapp.test.ts`
- `src/lib/guests/__tests__/crypto.test.ts`
- `src/app/[slug]/dashboard/guests/actions.ts` — server actions
- `src/app/[slug]/dashboard/GuestsTab.tsx` — list view (mirrors `RsvpsTab.tsx` structure)
- `src/app/[slug]/dashboard/GuestImportModal.tsx` — paste + preview + commit
- `vitest.config.ts` — test runner config

**Modify:**
- `package.json` — add `vitest` dev dep + `test` script
- `src/app/[slug]/dashboard/DashboardClient.tsx` — add `'guests'` tab + render `<GuestsTab>`
- `src/app/[slug]/dashboard/page.tsx` — load `guests` rows server-side, decrypt, pass to client
- `src/lib/supabase/server.ts` — (only if needed) export a helper for guests fetch
- `src/config/pageConfig.js` — add `inviteMessageTemplate` to the default config so message has a sane default
- `.env.local` — add `GUESTS_ENCRYPTION_KEY=<32-byte-base64>` (see Task 4)
- `.env.example` (create if missing) — document the env var without leaking the real key

---

## Pre-flight Confirmation

**Database migration required.** Before reaching the implementation phase, the engineer MUST:

1. Complete Task 4 first (encryption helper + env var) — the migration in Task 5 creates encrypted columns whose contract is defined in Task 4
2. Show the user the SQL in Task 5 and confirm they want to apply it to Supabase
3. Run the SQL in the Supabase SQL Editor (production project) — this is destructive in the sense that rolling back means dropping the table
4. Verify the table appears with: `select * from guests limit 1;` returning empty rowset
5. Only then proceed to Task 6 onward

Reason: per project convention (`feedback_confirm_structural_changes`), DB migrations always pause + confirm regardless of how confident the dev is in the schema. The encryption-first ordering is deliberate: writing the migration AFTER the encryption helper means the column types/names can reflect the actual on-disk format.

---

## Task 1: Install Vitest

**Files:**
- Modify: `c:\Users\arifi\Downloads\wedding-saas-next\package.json`
- Create: `c:\Users\arifi\Downloads\wedding-saas-next\vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run:
```powershell
cd c:\Users\arifi\Downloads\wedding-saas-next
npm install --save-dev vitest@^1.6.0 @vitest/ui@^1.6.0
```
Expected: 0 vulnerabilities, ~2 min install.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    globals: false,
  },
})
```

- [ ] **Step 3: Add `test` script to `package.json`**

In `package.json` `scripts` block, after `"build": "next build"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Sanity-check Vitest runs**

Create a throwaway test `src/lib/__tests__/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('sanity', () => { it('runs', () => expect(1 + 1).toBe(2)) })
```
Run: `npm test`
Expected: `1 passed`. Then **delete the file**.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest for unit tests"
```

---

## Task 2: Phone Normalization Helper

**Files:**
- Create: `src/lib/guests/phone.ts`
- Test: `src/lib/guests/__tests__/phone.test.ts`

Phone normalizer converts any user-typed Indonesian number to E.164 format (`62XXXXXXXXX`, no `+`, no spaces, no dashes — that is the exact shape `wa.me/<phone>` expects).

- [ ] **Step 1: Write failing test**

Create `src/lib/guests/__tests__/phone.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizePhone, formatPhoneDisplay } from '../phone'

describe('normalizePhone', () => {
  it('strips non-digits and converts leading 0 to 62', () => {
    expect(normalizePhone('081234567890')).toBe('6281234567890')
  })
  it('handles dashes and spaces', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone('0812 3456 7890')).toBe('6281234567890')
  })
  it('handles +62 prefix', () => {
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890')
  })
  it('handles bare 62 prefix', () => {
    expect(normalizePhone('6281234567890')).toBe('6281234567890')
  })
  it('returns null for too-short numbers (< 9 digits after norm)', () => {
    expect(normalizePhone('0812345')).toBeNull()
  })
  it('returns null for non-Indonesia country codes', () => {
    // Foreign numbers — out of MVP scope. Return null so the UI falls back
    // to the contact-picker URL instead of generating a broken link.
    expect(normalizePhone('+1 555 123 4567')).toBeNull()
  })
  it('returns null for empty / whitespace', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('   ')).toBeNull()
  })
})

describe('formatPhoneDisplay', () => {
  it('formats E.164 as 0812-3456-7890 for display', () => {
    expect(formatPhoneDisplay('6281234567890')).toBe('0812-3456-7890')
  })
  it('returns empty string for null input', () => {
    expect(formatPhoneDisplay(null)).toBe('')
  })
})
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `npm test -- phone`
Expected: `Cannot find module '../phone'`.

- [ ] **Step 3: Implement**

Create `src/lib/guests/phone.ts`:
```ts
/**
 * normalizePhone — convert any user-typed Indonesian phone number to E.164
 * (the shape `wa.me/<phone>` expects: `62XXXXXXXXX`, no plus, no spaces).
 *
 * Rules:
 *   1. Strip every non-digit character.
 *   2. If the digit string begins with `0`, replace that single `0` with `62`.
 *   3. Reject if it doesn't start with `62` after step 2 (foreign numbers).
 *   4. Reject if total length < 11 (62 + 9 digits — shortest valid ID number).
 *   5. Reject if total length > 15 (E.164 max).
 *
 * Returns `null` for any rejected input so the UI can fall back to the
 * WhatsApp contact-picker URL rather than producing a broken `wa.me/...` link.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D+/g, '')
  if (!digits) return null

  let e164: string
  if (digits.startsWith('0')) {
    e164 = '62' + digits.slice(1)
  } else if (digits.startsWith('62')) {
    e164 = digits
  } else {
    // Foreign country code — out of MVP scope.
    return null
  }

  if (e164.length < 11 || e164.length > 15) return null
  return e164
}

/**
 * formatPhoneDisplay — render an E.164 phone as the familiar 0812-3456-7890
 * format for the dashboard table. Source of truth in DB is still E.164.
 */
export function formatPhoneDisplay(e164: string | null | undefined): string {
  if (!e164) return ''
  const local = '0' + e164.slice(2) // strip "62", prepend "0"
  // Group as 4-4-4 (or 4-4-rest) — close enough for ID mobile numbers.
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3')
}
```

- [ ] **Step 4: Run test (expect PASS)**

Run: `npm test -- phone`
Expected: `8 passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/guests/phone.ts src/lib/guests/__tests__/phone.test.ts
git commit -m "feat(guests): add phone E.164 normalizer for Indonesian numbers"
```

---

## Task 3: Guest Import Parser

**Files:**
- Create: `src/lib/guests/parse-import.ts`
- Test: `src/lib/guests/__tests__/parse-import.test.ts`

Parser accepts a multi-line tab-separated paste from the import modal. Tab-separated chosen over comma because Indonesian guest names commonly contain commas ("Bapak Hendra, S.E.", "Keluarga H. Ahmad, Jakarta") — splitting on the first comma would misclassify the title as a phone number. Tab is the natural copy-out format from Excel/Google Sheets.

- [ ] **Step 1: Write failing test**

Create `src/lib/guests/__tests__/parse-import.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseGuestImport } from '../parse-import'

describe('parseGuestImport', () => {
  it('parses name only (no tab)', () => {
    const out = parseGuestImport('Agus Salim')
    expect(out).toEqual([{ name: 'Agus Salim', phoneE164: null, lineNo: 1 }])
  })

  it('parses name + phone (tab-separated)', () => {
    const out = parseGuestImport('Agus Salim\t081234567890')
    expect(out).toEqual([{ name: 'Agus Salim', phoneE164: '6281234567890', lineNo: 1 }])
  })

  it('keeps comma-bearing names intact', () => {
    const out = parseGuestImport('Bapak Hendra, S.E.\t081234567890')
    expect(out).toEqual([{ name: 'Bapak Hendra, S.E.', phoneE164: '6281234567890', lineNo: 1 }])
  })

  it('parses multiple lines, mixing phone-present and phone-absent rows', () => {
    const input = [
      'Agus Salim\t081234567890',
      'Budi Santoso',
      'Keluarga Pak Hendra\t087654321098',
    ].join('\n')
    const out = parseGuestImport(input)
    expect(out).toHaveLength(3)
    expect(out[1]).toEqual({ name: 'Budi Santoso', phoneE164: null, lineNo: 2 })
    expect(out[2].phoneE164).toBe('6287654321098')
  })

  it('skips blank lines and CRLF line endings', () => {
    const input = 'Agus\r\n\r\nBudi\n'
    const out = parseGuestImport(input)
    expect(out).toEqual([
      { name: 'Agus', phoneE164: null, lineNo: 1 },
      { name: 'Budi', phoneE164: null, lineNo: 3 },
    ])
  })

  it('trims surrounding whitespace from name and phone column', () => {
    const out = parseGuestImport('   Agus Salim   \t  081234567890  ')
    expect(out[0]).toEqual({ name: 'Agus Salim', phoneE164: '6281234567890', lineNo: 1 })
  })

  it('rejects rows with empty name', () => {
    const out = parseGuestImport('\t081234567890\nAgus')
    expect(out).toEqual([{ name: 'Agus', phoneE164: null, lineNo: 2 }])
  })

  it('passes through malformed phone as null and keeps the name', () => {
    // The user mistyped the phone — don't drop the row, just import the name.
    // The dashboard then shows a "no phone" badge so they can edit later.
    const out = parseGuestImport('Agus\tabc-not-a-phone')
    expect(out[0]).toEqual({ name: 'Agus', phoneE164: null, lineNo: 1 })
  })
})
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `npm test -- parse-import`
Expected: `Cannot find module '../parse-import'`.

- [ ] **Step 3: Implement**

Create `src/lib/guests/parse-import.ts`:
```ts
import { normalizePhone } from './phone'

export interface ParsedGuestRow {
  name: string
  phoneE164: string | null
  /** 1-based original line number — used by the UI to highlight bad rows. */
  lineNo: number
}

/**
 * parseGuestImport — convert a tab-separated paste into structured rows.
 *
 * Format per line: `<name>\t<phone>?`
 *   - blank lines skipped
 *   - name with no tab → treated as name-only (phone = null)
 *   - phone column normalized via normalizePhone; if rejected → phone = null
 *     but the row is still imported (name is the only required field)
 *   - rows with empty name (e.g. `\t08123...`) are dropped silently
 */
export function parseGuestImport(text: string): ParsedGuestRow[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const rows: ParsedGuestRow[] = []
  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    if (!line.trim()) return
    const [rawName, rawPhone] = line.split('\t', 2)
    const name = (rawName ?? '').trim()
    if (!name) return
    const phoneE164 = rawPhone ? normalizePhone(rawPhone.trim()) : null
    rows.push({ name, phoneE164, lineNo })
  })
  return rows
}
```

- [ ] **Step 4: Run test (expect PASS)**

Run: `npm test -- parse-import`
Expected: `8 passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/guests/parse-import.ts src/lib/guests/__tests__/parse-import.test.ts
git commit -m "feat(guests): add tab-separated import parser"
```

---

## Task 4: Encryption Helper (AES-256-GCM)

**Files:**
- Create: `src/lib/guests/crypto.ts`
- Test: `src/lib/guests/__tests__/crypto.test.ts`
- Modify: `.env.local`
- Create (if missing): `.env.example`

Symmetric encryption for PII columns. The key lives ONLY in `process.env.GUESTS_ENCRYPTION_KEY` — never committed, never in the database. Format on disk = base64(`iv` ‖ `ciphertext` ‖ `authTag`). AES-GCM gives us authenticated encryption — if a row is tampered in-DB, decrypt throws instead of returning silent garbage.

- [ ] **Step 1: Generate a key and add to `.env.local`**

Run (PowerShell):
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copy the output (44 chars ending in `=`) and paste into `.env.local`:
```
GUESTS_ENCRYPTION_KEY=<paste-the-44-char-base64-string-here>
```

**Back this up out-of-band immediately** (1Password / GitHub Actions secrets / wherever you keep other prod secrets). Losing this key means every encrypted guest row becomes permanently unrecoverable.

- [ ] **Step 2: Document in `.env.example`**

Create (or append to) `.env.example` at the project root:
```
# AES-256 key for the guests table PII encryption.
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Length: 32 bytes (44 base64 chars). NEVER commit a real key.
GUESTS_ENCRYPTION_KEY=
```

Verify `.env.local` is gitignored: `grep -E "^\.env\.local$" .gitignore` should return a match. If not, add it.

- [ ] **Step 3: Write failing tests**

Create `src/lib/guests/__tests__/crypto.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encryptField, decryptField } from '../crypto'

beforeAll(() => {
  // Set a deterministic test key so the tests don't depend on .env.local
  process.env.GUESTS_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('encryptField / decryptField', () => {
  it('round-trips ASCII plaintext', () => {
    const ct = encryptField('Agus Salim')
    expect(ct).not.toBe('Agus Salim')
    expect(decryptField(ct)).toBe('Agus Salim')
  })

  it('round-trips Indonesian names with diacritics + commas', () => {
    const name = 'Bapak Hendra, S.E. — café au lait 🎉'
    expect(decryptField(encryptField(name))).toBe(name)
  })

  it('round-trips E.164 phone numbers', () => {
    expect(decryptField(encryptField('6281234567890'))).toBe('6281234567890')
  })

  it('produces different ciphertexts for identical plaintexts (random IV)', () => {
    const a = encryptField('same')
    const b = encryptField('same')
    expect(a).not.toBe(b)
    expect(decryptField(a)).toBe('same')
    expect(decryptField(b)).toBe('same')
  })

  it('returns null for null input on both directions', () => {
    expect(encryptField(null)).toBeNull()
    expect(decryptField(null)).toBeNull()
  })

  it('throws on tampered ciphertext (authTag detects mutation)', () => {
    const ct = encryptField('Agus')!
    // Flip a byte in the middle of the base64 payload
    const buf = Buffer.from(ct, 'base64')
    buf[buf.length - 5] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decryptField(tampered)).toThrow()
  })

  it('throws if env key is missing', () => {
    const saved = process.env.GUESTS_ENCRYPTION_KEY
    delete process.env.GUESTS_ENCRYPTION_KEY
    try {
      expect(() => encryptField('x')).toThrow(/GUESTS_ENCRYPTION_KEY/)
    } finally {
      process.env.GUESTS_ENCRYPTION_KEY = saved
    }
  })

  it('throws if env key is wrong length', () => {
    const saved = process.env.GUESTS_ENCRYPTION_KEY
    process.env.GUESTS_ENCRYPTION_KEY = Buffer.from('short').toString('base64')
    try {
      expect(() => encryptField('x')).toThrow(/32 bytes/)
    } finally {
      process.env.GUESTS_ENCRYPTION_KEY = saved
    }
  })
})
```

- [ ] **Step 4: Run test (expect FAIL)**

Run: `npm test -- crypto`
Expected: `Cannot find module '../crypto'`.

- [ ] **Step 5: Implement**

Create `src/lib/guests/crypto.ts`:
```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * App-level AES-256-GCM encryption for guest PII (name, phone, notes).
 *
 * Why GCM:
 *   - Authenticated: the 16-byte authTag detects tampering. If anyone
 *     modifies a row in Postgres directly, decryptField throws instead
 *     of returning corrupted-but-plausible text.
 *   - Per-row IV: each call generates a fresh 12-byte IV, so identical
 *     plaintexts produce different ciphertexts (no frequency analysis
 *     attack across the DB).
 *
 * On-disk format: base64(IV ‖ ciphertext ‖ authTag).
 *   - IV is 12 bytes (GCM standard)
 *   - authTag is 16 bytes (GCM default)
 *   - ciphertext is variable length (utf8 byte length of plaintext)
 *
 * Key source: process.env.GUESTS_ENCRYPTION_KEY (32 raw bytes, base64-encoded
 * → 44 chars). Generated with `crypto.randomBytes(32).toString('base64')`
 * and stored in .env.local (never committed). See Task 4 Step 1.
 */

const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

function getKey(): Buffer {
  const b64 = process.env.GUESTS_ENCRYPTION_KEY
  if (!b64) {
    throw new Error(
      'GUESTS_ENCRYPTION_KEY env var is required. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    )
  }
  const key = Buffer.from(b64, 'base64')
  if (key.length !== KEY_LEN) {
    throw new Error(`GUESTS_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length})`)
  }
  return key
}

/** Encrypt a string field. Returns null for null input. */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, ct, tag]).toString('base64')
}

/** Decrypt a base64 payload produced by encryptField. Throws on tampering. */
export function decryptField(payload: string | null | undefined): string | null {
  if (payload === null || payload === undefined) return null
  const key = getKey()
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Encrypted payload is too short to be valid')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(buf.length - TAG_LEN)
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 6: Run test (expect PASS)**

Run: `npm test -- crypto`
Expected: `8 passed`.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/guests/crypto.ts src/lib/guests/__tests__/crypto.test.ts .env.example
git commit -m "feat(guests): add AES-256-GCM field encryption helper"
```

(Note: `.env.local` is intentionally NOT committed.)

---

## Task 5: Database Migration

**Files:**
- Create: `supabase/migrations/2026-05-27-guests.sql`

**Pre-flight:** Before running the SQL in Supabase, **show this task to the user and confirm** they want to apply it. Per `feedback_confirm_structural_changes`, never run a migration unprompted.

- [ ] **Step 1: Create migration SQL file**

Create `supabase/migrations/2026-05-27-guests.sql`:
```sql
-- 2026-05-27 — Guests list per invitation, with PII encrypted at rest.
-- One row per invited guest.
--
-- Encrypted columns (base64 of AES-256-GCM IV ‖ ciphertext ‖ authTag):
--   name_enc       — guest's display name (always present)
--   phone_enc      — E.164 phone, nullable. When null, the WA button
--                    falls back to the WhatsApp contact picker URL.
--   notes_enc      — couple-only freeform notes, nullable.
--
-- Plaintext columns (intentional — low-sensitivity, useful for SQL filters):
--   group_label    — "Keluarga", "Kantor" — bucket label only.
--   sent_at        — optimistic timestamp when the WA button was clicked.
--
-- The encryption key lives in process.env.GUESTS_ENCRYPTION_KEY on the
-- Next.js server, never in this database. A DB dump leaks ciphertext only.

create table if not exists guests (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references invitations(id) on delete cascade,
  name_enc        text not null,
  phone_enc       text,
  group_label     text,
  notes_enc       text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists guests_invitation_id_idx on guests(invitation_id);
create index if not exists guests_sent_at_idx on guests(invitation_id, sent_at);

-- updated_at touch trigger (uses the same function as other tables — assumed
-- to exist from the initial schema. If not, define it once at the project
-- level and reference it here.)
create trigger guests_set_updated_at
  before update on guests
  for each row execute function set_updated_at();

-- RLS — server-only access via service_role. The dashboard reads/writes
-- through server actions that validate the per-slug session cookie before
-- touching the table, so anon should never see this table.
alter table guests enable row level security;

-- (No anon policies — deliberate. service_role bypasses RLS so server
-- actions work; anon cannot select/insert/update/delete.)
```

- [ ] **Step 2: Confirm with user, then apply via Supabase SQL Editor**

Paste the SQL into the Supabase dashboard → SQL Editor → Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify the table**

In SQL Editor run:
```sql
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'guests'
 order by ordinal_position;
```
Expected: 9 rows — `id`, `invitation_id`, `name_enc`, `phone_enc`, `group_label`, `notes_enc`, `sent_at`, `created_at`, `updated_at`.

- [ ] **Step 4: Sync to upstream supabase folder**

Copy the same SQL to `../Wedding Website Design new/supabase/migrations/2026-05-27-guests.sql` so the canonical schema location stays in sync. Edit `../Wedding Website Design new/supabase/schema.sql` to append the same `create table` + indexes + RLS block.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations/2026-05-27-guests.sql
git commit -m "feat(db): add guests table with encrypted PII columns"
```

---

## Task 6: WhatsApp URL Builder

**Files:**
- Create: `src/lib/guests/whatsapp.ts`
- Test: `src/lib/guests/__tests__/whatsapp.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/guests/__tests__/whatsapp.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl, renderMessageTemplate } from '../whatsapp'

describe('buildWhatsAppUrl', () => {
  it('builds direct chat URL when phone is provided', () => {
    const url = buildWhatsAppUrl({ phoneE164: '6281234567890', message: 'Halo Agus' })
    expect(url).toBe('https://wa.me/6281234567890?text=Halo%20Agus')
  })

  it('builds share-picker URL when phone is null', () => {
    const url = buildWhatsAppUrl({ phoneE164: null, message: 'Halo Agus' })
    expect(url).toBe('https://wa.me/?text=Halo%20Agus')
  })

  it('encodes newlines and special chars in the message', () => {
    const url = buildWhatsAppUrl({ phoneE164: null, message: 'Halo!\nLink: https://x.com' })
    expect(url).toContain('Halo!%0ALink')
    expect(url).toContain('https%3A%2F%2Fx.com')
  })
})

describe('renderMessageTemplate', () => {
  it('replaces {{name}} placeholder', () => {
    expect(renderMessageTemplate('Halo {{name}}', { name: 'Agus', url: '' }))
      .toBe('Halo Agus')
  })
  it('replaces {{url}} placeholder', () => {
    expect(renderMessageTemplate('Buka {{url}}', { name: '', url: 'https://w.id/agus' }))
      .toBe('Buka https://w.id/agus')
  })
  it('leaves unknown placeholders intact', () => {
    expect(renderMessageTemplate('Halo {{nickname}}', { name: 'A', url: '' }))
      .toBe('Halo {{nickname}}')
  })
})
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `npm test -- whatsapp`

- [ ] **Step 3: Implement**

Create `src/lib/guests/whatsapp.ts`:
```ts
export interface BuildWhatsAppArgs {
  phoneE164: string | null
  message: string
}

/**
 * buildWhatsAppUrl — produce a `wa.me` URL using the hybrid scheme:
 *   - phoneE164 present → wa.me/<phone>?text=...  (opens direct chat)
 *   - phoneE164 null    → wa.me/?text=...         (opens contact picker)
 *
 * The message is encoded via encodeURIComponent (handles newlines as %0A,
 * Unicode, URLs in the body).
 */
export function buildWhatsAppUrl({ phoneE164, message }: BuildWhatsAppArgs): string {
  const text = encodeURIComponent(message)
  const base = phoneE164 ? `https://wa.me/${phoneE164}` : 'https://wa.me/'
  return `${base}?text=${text}`
}

export interface TemplateVars {
  name: string
  url: string
}

/**
 * renderMessageTemplate — replace `{{name}}` and `{{url}}` placeholders in
 * the couple's saved template. Unknown placeholders are left in place so
 * a typo doesn't silently swallow part of the message.
 */
export function renderMessageTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{url\}\}/g, vars.url)
}
```

- [ ] **Step 4: Run test (expect PASS)**

Run: `npm test -- whatsapp`
Expected: `6 passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/guests/whatsapp.ts src/lib/guests/__tests__/whatsapp.test.ts
git commit -m "feat(guests): add WhatsApp URL builder with template rendering"
```

---

## Task 7: Server Actions — CRUD + Bulk Import + Mark Sent (with encryption)

**Files:**
- Create: `src/app/[slug]/dashboard/guests/actions.ts`

Every action re-verifies the per-slug session cookie via the existing helper in `src/lib/auth.ts` (look for how `NotesTab` does it — copy that pattern verbatim, don't roll your own). All mutations are server actions (`'use server'`), not API routes — server actions are simpler for auth-gated dashboard mutations per `CLAUDE.md`.

**Encryption boundary:** every write goes through `encryptField()` before hitting Supabase; every read goes through `decryptField()` before returning. The exported `GuestRow` type holds plaintext — the client never sees ciphertext. Two helper functions (`toDbRow`, `fromDbRow`) centralize the boundary so individual actions stay short.

- [ ] **Step 1: Look up the existing auth helper**

Read `src/app/[slug]/dashboard/NotesTab.tsx` (or its actions file if separate) and locate the pattern that:
1. Reads the `wedding_session_<slug>` cookie
2. Compares it to the invitation's bcrypt-hash prefix
3. Throws / returns error on mismatch

Note the helper's exact import path. You will reuse this verbatim — do not invent a new auth pattern.

- [ ] **Step 2: Write the actions file**

Create `src/app/[slug]/dashboard/guests/actions.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireSlugSession } from '@/lib/auth' // ← use the EXACT helper NotesTab uses
import { parseGuestImport } from '@/lib/guests/parse-import'
import { normalizePhone } from '@/lib/guests/phone'
import { encryptField, decryptField } from '@/lib/guests/crypto'

/** App-shape row — what the client sees. Always plaintext. */
export interface GuestRow {
  id: string
  invitation_id: string
  name: string
  phone_e164: string | null
  group_label: string | null
  notes: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

/** Raw DB row — encrypted columns are base64 strings. */
interface GuestRowDb {
  id: string
  invitation_id: string
  name_enc: string
  phone_enc: string | null
  group_label: string | null
  notes_enc: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

/** Decrypt a DB row into the app-shape GuestRow. */
export function fromDbRow(row: GuestRowDb): GuestRow {
  return {
    id: row.id,
    invitation_id: row.invitation_id,
    name: decryptField(row.name_enc) ?? '',
    phone_e164: decryptField(row.phone_enc),
    group_label: row.group_label,
    notes: decryptField(row.notes_enc),
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function getInvitationId(slug: string): Promise<string> {
  await requireSlugSession(slug)
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('id')
    .eq('slug', slug)
    .single()
  if (error || !data) throw new Error('Invitation not found')
  return data.id
}

export async function addGuest(slug: string, input: {
  name: string
  phoneRaw?: string
  groupLabel?: string
}): Promise<GuestRow> {
  const invitation_id = await getInvitationId(slug)
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  const phoneE164 = input.phoneRaw ? normalizePhone(input.phoneRaw) : null
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('guests')
    .insert({
      invitation_id,
      name_enc: encryptField(name),
      phone_enc: encryptField(phoneE164),
      group_label: input.groupLabel?.trim() || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(`/${slug}/dashboard`)
  return fromDbRow(data as GuestRowDb)
}

export async function updateGuest(slug: string, id: string, patch: {
  name?: string
  phoneRaw?: string | null
  groupLabel?: string | null
  notes?: string | null
}): Promise<void> {
  await getInvitationId(slug) // auth + ownership
  const supabase = createSupabaseAdminClient()
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name_enc = encryptField(patch.name.trim())
  if (patch.phoneRaw !== undefined) {
    const e164 = patch.phoneRaw === null ? null : normalizePhone(patch.phoneRaw)
    update.phone_enc = encryptField(e164)
  }
  if (patch.groupLabel !== undefined) update.group_label = patch.groupLabel?.trim() || null
  if (patch.notes !== undefined) update.notes_enc = encryptField(patch.notes?.trim() || null)
  const { error } = await supabase.from('guests').update(update).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/${slug}/dashboard`)
}

export async function deleteGuest(slug: string, id: string): Promise<void> {
  await getInvitationId(slug)
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('guests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/${slug}/dashboard`)
}

export async function importGuests(slug: string, text: string): Promise<{
  inserted: number
}> {
  const invitation_id = await getInvitationId(slug)
  const rows = parseGuestImport(text)
  if (rows.length === 0) return { inserted: 0 }
  const supabase = createSupabaseAdminClient()
  const { error, count } = await supabase
    .from('guests')
    .insert(rows.map((r) => ({
      invitation_id,
      name_enc: encryptField(r.name),
      phone_enc: encryptField(r.phoneE164),
    })), { count: 'exact' })
  if (error) throw new Error(error.message)
  revalidatePath(`/${slug}/dashboard`)
  return { inserted: count ?? rows.length }
}

export async function markGuestSent(slug: string, id: string): Promise<void> {
  await getInvitationId(slug)
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('guests')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/${slug}/dashboard`)
}

export async function unmarkGuestSent(slug: string, id: string): Promise<void> {
  await getInvitationId(slug)
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('guests')
    .update({ sent_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/${slug}/dashboard`)
}
```

- [ ] **Step 3: Smoke test the encryption boundary**

In the Supabase SQL Editor (paste a real ciphertext to verify the column accepts it):
```sql
-- Insert a known-ciphertext row to confirm the encrypted columns work end-to-end.
-- Generate ciphertext via the npm test of crypto.ts or a quick Node REPL:
--   node -e "process.env.GUESTS_ENCRYPTION_KEY='<your-key>'; \
--            const {encryptField}=require('./src/lib/guests/crypto'); \
--            console.log(encryptField('Test Tamu'))"
insert into guests (invitation_id, name_enc, phone_enc)
values (
  (select id from invitations where slug = 'adi-rani'),
  '<paste-base64-ciphertext-here>',
  '<paste-or-NULL>'
);

-- Confirm the row is unreadable in raw SQL:
select id, name_enc, phone_enc from guests
 where invitation_id = (select id from invitations where slug = 'adi-rani');
-- Expected: name_enc and phone_enc are base64 gibberish, not "Test Tamu".

-- Clean up:
delete from guests where name_enc = '<the-same-ciphertext>';
```
Expected: row inserts cleanly, `select` shows ciphertext only (proves encryption works at the storage layer), delete succeeds.

- [ ] **Step 4: Commit**

```powershell
git add src/app/[slug]/dashboard/guests/actions.ts
git commit -m "feat(guests): add server actions with encrypted PII handling"
```

---

## Task 8: Server-side fetch + decrypt of guest rows

**Files:**
- Modify: `src/app/[slug]/dashboard/page.tsx`

The dashboard server page already fetches `rsvps`, `gifts`, `notes`. Add a parallel fetch for `guests`, then map the raw DB rows through `fromDbRow` so the client receives plaintext.

- [ ] **Step 1: Read the existing fetch block**

Open `src/app/[slug]/dashboard/page.tsx`. Locate the section where it calls Supabase for `rsvps`, `gifts`, and `notes` in parallel (likely via `Promise.all`). Copy that exact pattern.

- [ ] **Step 2: Add the guests fetch and decrypt mapping**

At the top of `page.tsx`, add:
```ts
import { fromDbRow } from './guests/actions'
```

In the `Promise.all`, add a fourth fetch:
```ts
supabase.from('guests')
  .select('*')
  .eq('invitation_id', invitation.id)
  .order('created_at', { ascending: true }),
```

After the destructure, decrypt before passing to the client:
```ts
const guests = (guestsRaw?.data ?? []).map(fromDbRow)
// ... then
<DashboardClient slug={slug} invitation={invitation} rsvps={rsvps} gifts={gifts} notes={notes} guests={guests} />
```

(Adjust the destructure name to match the actual pattern used for `rsvpsRaw` / `giftsRaw` / `notesRaw` — copy that style verbatim.)

- [ ] **Step 3: Update DashboardClient props**

In `src/app/[slug]/dashboard/DashboardClient.tsx`:
- Add `guests?: GuestRow[]` to the props type (import `GuestRow` from `./guests/actions`)
- Default to `[]` in the destructure: `guests = []`

- [ ] **Step 4: Verify the page still loads**

```powershell
npm run dev
```
Visit `http://localhost:3000/adi-rani/dashboard`. Log in.
Expected: Dashboard renders without error. `guests` is empty `[]` so nothing visible yet — that's correct. If the smoke-test ciphertext row from Task 7 Step 3 was left in the DB, it should now appear decrypted in the React tree (visible once Task 11 wires up the tab).

**Important:** if you see an error like `GUESTS_ENCRYPTION_KEY env var is required`, the dev server picked up the codebase before the `.env.local` change. Restart `npm run dev`.

- [ ] **Step 5: Commit**

```powershell
git add src/app/[slug]/dashboard/page.tsx src/app/[slug]/dashboard/DashboardClient.tsx
git commit -m "feat(guests): fetch + decrypt guests rows in dashboard page"
```

---

## Task 9: GuestsTab Component

**Files:**
- Create: `src/app/[slug]/dashboard/GuestsTab.tsx`

Mirrors `RsvpsTab.tsx`'s structure: header with count + filters, table of rows, optimistic actions via `useTransition`. Uses inline styles for consistency with the rest of the dashboard.

- [ ] **Step 1: Create the component**

Create `src/app/[slug]/dashboard/GuestsTab.tsx`:
```tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buildWhatsAppUrl, renderMessageTemplate } from '@/lib/guests/whatsapp'
import { formatPhoneDisplay } from '@/lib/guests/phone'
import {
  addGuest,
  deleteGuest,
  markGuestSent,
  unmarkGuestSent,
  type GuestRow,
} from './guests/actions'
import GuestImportModal from './GuestImportModal'

const DEFAULT_TEMPLATE =
  'Halo {{name}}, dengan hormat kami mengundang Anda ke acara pernikahan kami. ' +
  'Detail lengkap di sini: {{url}}'

interface Props {
  slug: string
  guests: GuestRow[]
  publicUrl: string
  messageTemplate?: string
}

export default function GuestsTab({ slug, guests, publicUrl, messageTemplate }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending'>('all')
  const [showImport, setShowImport] = useState(false)
  const [pending, startTransition] = useTransition()

  const template = messageTemplate || DEFAULT_TEMPLATE

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return guests.filter((g) => {
      if (filter === 'sent' && !g.sent_at) return false
      if (filter === 'pending' && g.sent_at) return false
      if (!q) return true
      return g.name.toLowerCase().includes(q) ||
             (g.phone_e164 || '').includes(q) ||
             (g.group_label || '').toLowerCase().includes(q)
    })
  }, [guests, query, filter])

  const sentCount = guests.filter((g) => g.sent_at).length
  const pendingCount = guests.length - sentCount

  const handleSend = (g: GuestRow) => {
    const message = renderMessageTemplate(template, { name: g.name, url: publicUrl })
    const url = buildWhatsAppUrl({ phoneE164: g.phone_e164, message })
    // Stamp sent_at BEFORE opening (so the row updates even if user navigates away)
    startTransition(async () => {
      try { await markGuestSent(slug, g.id) } catch (e) { console.error(e) }
      window.open(url, '_blank', 'noopener,noreferrer')
      router.refresh()
    })
  }

  const handleAdd = (form: FormData) => {
    const name = String(form.get('name') || '')
    const phoneRaw = String(form.get('phone') || '')
    if (!name.trim()) return
    startTransition(async () => {
      await addGuest(slug, { name, phoneRaw })
      router.refresh()
    })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Tamu Undangan</h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#5C4A3A' }}>
            {guests.length} tamu · {sentCount} sudah dikirim · {pendingCount} pending
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setShowImport(true)} style={ghostBtn}>+ Import</button>
        </div>
      </header>

      <form action={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input name="name" placeholder="Nama tamu" required style={input} />
        <input name="phone" placeholder="08123456789 (opsional)" style={input} />
        <button type="submit" disabled={pending} style={primaryBtn}>Tambah</button>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, nomor, grup…"
          style={{ ...input, flex: 1, minWidth: 200 }}
        />
        {(['all', 'pending', 'sent'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              ...ghostBtn,
              background: filter === f ? '#2A2118' : 'transparent',
              color: filter === f ? '#fff' : '#2A2118',
            }}
          >
            {f === 'all' ? 'Semua' : f === 'pending' ? 'Belum kirim' : 'Sudah'}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(42,33,24,0.08)' }}>
              <th style={th}>Nama</th>
              <th style={th}>Nomor</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#5C4A3A' }}>
                Belum ada tamu. Klik <b>+ Import</b> untuk paste dari spreadsheet.
              </td></tr>
            )}
            {filtered.map((g) => (
              <tr key={g.id} style={{ borderBottom: '1px solid rgba(42,33,24,0.04)' }}>
                <td style={td}>{g.name}{g.group_label && <span style={badge}>{g.group_label}</span>}</td>
                <td style={td}>{formatPhoneDisplay(g.phone_e164) || <span style={{ color: '#aaa' }}>—</span>}</td>
                <td style={td}>
                  {g.sent_at
                    ? <span style={{ ...badge, background: 'rgba(45,140,78,0.15)', color: '#2D8C4E' }}>
                        Terkirim {new Date(g.sent_at).toLocaleDateString('id-ID')}
                      </span>
                    : <span style={{ ...badge, background: 'rgba(232,85,62,0.12)', color: '#E8553E' }}>Pending</span>}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button type="button" onClick={() => handleSend(g)} disabled={pending} style={primaryBtn}>
                    {g.phone_e164 ? 'Kirim WA' : 'Pilih kontak'}
                  </button>
                  {g.sent_at && (
                    <button type="button" onClick={() => startTransition(async () => {
                      await unmarkGuestSent(slug, g.id); router.refresh()
                    })} style={{ ...ghostBtn, marginLeft: 6 }}>↶</button>
                  )}
                  <button type="button" onClick={() => {
                    if (!confirm(`Hapus ${g.name}?`)) return
                    startTransition(async () => { await deleteGuest(slug, g.id); router.refresh() })
                  }} style={{ ...ghostBtn, marginLeft: 6, color: '#E8553E' }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <GuestImportModal
          slug={slug}
          onClose={() => { setShowImport(false); router.refresh() }}
        />
      )}
    </div>
  )
}

const input: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid rgba(42,33,24,0.16)', borderRadius: 8, fontSize: 14,
}
const primaryBtn: React.CSSProperties = {
  padding: '8px 14px', background: '#E8553E', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontSize: 13,
}
const ghostBtn: React.CSSProperties = {
  padding: '8px 12px', background: 'transparent', color: '#2A2118', border: '1px solid rgba(42,33,24,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13,
}
const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5C4A3A' }
const td: React.CSSProperties = { padding: '12px 8px', verticalAlign: 'middle' }
const badge: React.CSSProperties = { display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(42,33,24,0.06)' }
```

- [ ] **Step 2: Commit (still incomplete — GuestImportModal next)**

```powershell
git add src/app/[slug]/dashboard/GuestsTab.tsx
git commit -m "feat(guests): add GuestsTab list view + per-row WhatsApp send"
```

---

## Task 10: GuestImportModal Component

**Files:**
- Create: `src/app/[slug]/dashboard/GuestImportModal.tsx`

A simple controlled modal: textarea, live preview of parsed rows, "Import N tamu" button that calls the server action.

- [ ] **Step 1: Create the component**

Create `src/app/[slug]/dashboard/GuestImportModal.tsx`:
```tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { parseGuestImport } from '@/lib/guests/parse-import'
import { formatPhoneDisplay } from '@/lib/guests/phone'
import { importGuests } from './guests/actions'

export default function GuestImportModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => parseGuestImport(text), [text])

  const handleImport = () => {
    if (preview.length === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await importGuests(slug, text)
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import gagal')
      }
    })
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <h3 style={{ margin: 0 }}>Import Daftar Tamu</h3>
          <button type="button" onClick={onClose} style={closeBtn}>×</button>
        </header>

        <p style={hint}>
          <b>Format:</b> satu tamu per baris. Pisahkan nama dan nomor dengan <b>TAB</b>
          (copy dari Excel/Google Sheets langsung jadi). Nomor opsional.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Agus Salim\t081234567890\nBudi Santoso\nBapak Hendra, S.E.\t087654321098'}
          rows={10}
          style={textarea}
        />

        <div style={{ marginTop: 14, fontSize: 13 }}>
          <b>{preview.length}</b> tamu siap di-import.
          {preview.length > 0 && (
            <div style={previewBox}>
              {preview.slice(0, 5).map((r) => (
                <div key={r.lineNo} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{r.name}</span>
                  <span style={{ color: r.phoneE164 ? '#2D8C4E' : '#aaa' }}>
                    {r.phoneE164 ? formatPhoneDisplay(r.phoneE164) : '(tanpa nomor)'}
                  </span>
                </div>
              ))}
              {preview.length > 5 && <div style={{ color: '#5C4A3A', marginTop: 4 }}>…dan {preview.length - 5} lagi</div>}
            </div>
          )}
        </div>

        {error && <p style={{ color: '#E8553E', fontSize: 13 }}>{error}</p>}

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={ghostBtn}>Batal</button>
          <button type="button" onClick={handleImport} disabled={pending || preview.length === 0} style={primaryBtn}>
            {pending ? 'Mengimpor…' : `Import ${preview.length} tamu`}
          </button>
        </footer>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
}
const dialog: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto',
}
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }
const closeBtn: React.CSSProperties = { width: 32, height: 32, fontSize: 22, lineHeight: 1, border: 0, background: 'transparent', cursor: 'pointer' }
const hint: React.CSSProperties = { fontSize: 13, color: '#5C4A3A', margin: '8px 0 12px' }
const textarea: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'ui-monospace, monospace', fontSize: 13, padding: 12, borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', resize: 'vertical', minHeight: 200,
}
const previewBox: React.CSSProperties = { marginTop: 8, padding: '10px 12px', background: 'rgba(42,33,24,0.04)', borderRadius: 10, fontSize: 13 }
const primaryBtn: React.CSSProperties = { padding: '10px 18px', background: '#E8553E', color: '#fff', border: 0, borderRadius: 10, cursor: 'pointer', fontSize: 14 }
const ghostBtn: React.CSSProperties = { padding: '10px 14px', background: 'transparent', color: '#2A2118', border: '1px solid rgba(42,33,24,0.2)', borderRadius: 10, cursor: 'pointer', fontSize: 14 }
```

- [ ] **Step 2: Commit**

```powershell
git add src/app/[slug]/dashboard/GuestImportModal.tsx
git commit -m "feat(guests): add import modal with live tab-separated preview"
```

---

## Task 11: Wire GuestsTab into DashboardClient

**Files:**
- Modify: `src/app/[slug]/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add the tab type**

In `DashboardClient.tsx`, line ~60, expand the `setState` literal:

Before:
```ts
const [tab, setTab] = useState<'overview' | 'rsvps' | 'gifts' | 'editor' | 'music' | 'background' | 'notes'>('overview')
```

After:
```ts
const [tab, setTab] = useState<'overview' | 'rsvps' | 'gifts' | 'guests' | 'editor' | 'music' | 'background' | 'notes'>('overview')
```

- [ ] **Step 2: Add the tab button**

Locate the array of tab buttons (around line 130, where `tab === t` styling is computed). Add `'guests'` between `'gifts'` and `'editor'` with label "Tamu".

- [ ] **Step 3: Add the tab body**

After the existing `{tab === 'gifts' && ...}` block, insert:
```tsx
{tab === 'guests' && (
  <GuestsTab
    slug={slug}
    guests={guests}
    publicUrl={typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`}
    messageTemplate={invitation?.config?.inviteMessageTemplate}
  />
)}
```

And add the import at the top: `import GuestsTab from './GuestsTab'`.

- [ ] **Step 4: Visual smoke test**

```powershell
npm run dev
```
Visit dashboard, click "Tamu" tab.
Expected: Empty state "Belum ada tamu. Klik + Import…" visible.

- [ ] **Step 5: End-to-end smoke test**

1. Click "+ Import" → modal opens
2. Paste:
   ```
   Agus Salim	081234567890
   Budi Santoso
   Bapak Hendra, S.E.	087654321098
   ```
   (Use real TAB characters — copy from the test file or a spreadsheet.)
3. Preview shows 3 rows with green phone for rows 1 & 3, "(tanpa nomor)" for row 2.
4. Click "Import 3 tamu" → modal closes, table shows 3 rows.
5. Click "Kirim WA" on row 1 → new tab opens with `https://wa.me/6281234567890?text=Halo%20Agus...`. Row 1 now shows "Terkirim {today's date}".
6. Click "Kirim WA" on row 2 (no phone) → new tab opens with `https://wa.me/?text=...` (contact picker mode).
7. Click "×" on any row → confirm dialog → row deleted.

- [ ] **Step 6: Commit**

```powershell
git add src/app/[slug]/dashboard/DashboardClient.tsx
git commit -m "feat(guests): wire GuestsTab into dashboard with Tamu tab"
```

---

## Task 12: Add `inviteMessageTemplate` to invitation config

**Files:**
- Modify: `src/config/pageConfig.js`
- Modify: `scripts/create-invitation.mjs` (so newly-bootstrapped couples get a sane default)

- [ ] **Step 1: Update default config**

In `src/config/pageConfig.js`, add a top-level field (next to existing top-level fields like `theme`):
```js
inviteMessageTemplate:
  'Halo {{name}},\n\nDengan hormat kami mengundang Anda untuk hadir di acara pernikahan kami. ' +
  'Detail lengkap & RSVP di tautan berikut:\n\n{{url}}\n\nTerima kasih 🙏',
```

- [ ] **Step 2: Update bootstrap script**

In `scripts/create-invitation.mjs`, locate the `config` object that gets inserted. Add the same `inviteMessageTemplate` field there so every new couple starts with it.

- [ ] **Step 3: Backfill existing couples**

Run in Supabase SQL Editor:
```sql
update invitations
   set config = jsonb_set(
     config,
     '{inviteMessageTemplate}',
     '"Halo {{name}},\n\nDengan hormat kami mengundang Anda untuk hadir di acara pernikahan kami. Detail lengkap & RSVP di tautan berikut:\n\n{{url}}\n\nTerima kasih 🙏"'::jsonb,
     true
   )
 where config -> 'inviteMessageTemplate' is null;
```
Expected: N rows updated (one per existing couple).

- [ ] **Step 4: Commit**

```powershell
git add src/config/pageConfig.js scripts/create-invitation.mjs
git commit -m "feat(guests): add default invite-message template to config"
```

---

## Task 13: Manual QA + ship

**Files:** none — verification only

- [ ] **Step 1: Final responsive check**

Open `/adi-rani/dashboard` at 320px, 768px, 1024px viewport widths. Verify:
- "Tamu" tab button is reachable (in mobile, it should be in the same row as other tabs — overflow-scroll the tab bar if it already wraps that way)
- Add-guest form wraps cleanly at 320px (the recent responsive refactor already covers `flex-wrap: wrap`)
- Import modal stays within viewport at 320px (`maxHeight: '90vh'` + `overflowY: 'auto'` already in place)
- Table scrolls horizontally on narrow screens via the wrapper `overflowX: 'auto'`

- [ ] **Step 2: Test the WA URL on a real phone**

1. From the desktop dashboard, click "Kirim WA" on a guest with a real (your own) phone number.
2. The new tab opens `https://wa.me/<phone>?text=...`. WhatsApp Web should open the chat.
3. On a phone: copy the same URL, open it. WhatsApp app should open with the pre-filled message.
4. For the "no phone" row, copy `https://wa.me/?text=...` to your phone — WhatsApp should show the contact picker.

- [ ] **Step 3: Verify `sent_at` survives refresh**

Click "Kirim WA" → close the WA tab → refresh dashboard → row still shows "Terkirim {date}". Click "↶" → status returns to Pending. Refresh again → still Pending.

- [ ] **Step 4: Verify auth scoping**

In a private window, try `POST` to the dashboard's server action endpoint as a different slug. Expected: `requireSlugSession` throws. (Or: log in as `adi-rani`, then in DevTools change the URL hash to another slug's dashboard — the cookie should not grant access.)

- [ ] **Step 5: Verify the encryption boundary at rest**

In the Supabase SQL Editor, peek at the raw rows after a real guest has been imported via the dashboard:
```sql
select id, name_enc, phone_enc, group_label, sent_at
  from guests
 where invitation_id = (select id from invitations where slug = 'adi-rani')
 limit 5;
```
Expected:
- `name_enc` and `phone_enc` look like random base64 (`AB12cd34...==`), **never** plaintext like "Agus Salim".
- `group_label` and `sent_at` are plaintext (intentional — low-sensitivity bucket + a timestamp).
- Two rows with the same plaintext name should have **different** `name_enc` values (random IV per row — confirms per-row IV).

Optional: rotate the env key to verify decrypt-throws behavior:
1. Temporarily set `GUESTS_ENCRYPTION_KEY` in `.env.local` to a **different** valid 32-byte base64 key.
2. Restart `npm run dev`.
3. Reload the dashboard. Expected: server log shows an `Unsupported state or unable to authenticate data` error (GCM authTag fails). Page may render with an empty guest list or an error — this is correct, it proves the key actually gates access.
4. **Restore the original key** and restart. Guests should reappear.

- [ ] **Step 6: Run full test suite**

```powershell
npm test
```
Expected: All ~30 tests (8 phone + 8 parse-import + 6 whatsapp + 8 crypto) pass.

- [ ] **Step 7: Final commit**

If any small fixes were made during QA:
```powershell
git add -A
git commit -m "fix(guests): minor polish from manual QA"
```

---

## Self-Review

**Spec coverage:**
- ✅ Hybrid wa.me scheme (phone present → direct, phone null → picker) — Task 6 (`buildWhatsAppUrl`) + Task 9 (`handleSend`)
- ✅ Schema with encrypted PII columns (`name_enc`, `phone_enc`, `notes_enc`) — Task 5
- ✅ AES-256-GCM encryption helper with per-row random IV + authTag — Task 4
- ✅ Env-var-based key with documentation + back-up reminder — Task 4 Step 1+2
- ✅ Server-side encrypt-on-write / decrypt-on-read boundary (`fromDbRow`) — Task 7 + Task 8
- ✅ Tab-separated import with comma-safe names — Task 3 (`parseGuestImport`) + Task 10 (preview)
- ✅ Phone normalization for 081…, +62…, dashes, spaces — Task 2
- ✅ Per-row optimistic `sent_at` — Task 7 (`markGuestSent`) + Task 9 (call before opening URL)
- ✅ Auth scoping per slug — Task 7 (`requireSlugSession` reused)
- ✅ Default message template per couple — Task 12
- ✅ Encryption verified at-rest by SQL peek in Task 13 Step 5

**Placeholder scan:**
- No "TBD" / "TODO" / "implement later" patterns.
- Every code step shows complete code, no "similar to Task N".
- The auth helper import path in Task 7 is referenced as "the EXACT helper NotesTab uses" — engineer must look it up. This is intentional: if I guessed the path and got it wrong, the plan would be self-contradictory. The instruction is to copy the established pattern.
- Task 7 Step 3 (smoke test SQL) requires the engineer to paste a real ciphertext generated from the helper. This is necessary — we cannot hardcode a ciphertext because each run produces a different IV.

**Type consistency:**
- `GuestRow` (plaintext shape, exported) defined in Task 7, imported in Tasks 8, 9, 10 with the same shape.
- `GuestRowDb` (ciphertext shape, internal) defined in Task 7 — never escapes the server actions file.
- `ParsedGuestRow.phoneE164` (Task 3) → `encryptField()` (Task 4) → `phone_enc` column (Task 5) → `decryptField()` (Task 7 + Task 8) → `GuestRow.phone_e164` (Tasks 9, 10) — consistent camelCase-in-JS / snake_case-in-DB boundary with the encryption layer transparent to the client.
- `normalizePhone` returns `string | null` in Task 2; consumers in Tasks 3, 7, 9 all handle the `null` branch.
- `encryptField` / `decryptField` both accept and return `string | null` — null pass-through means callers don't need to guard against optional fields.

**Open items deferred (out of MVP):**
- Bulk "Kirim semua yang pending" button — easy follow-up, not in MVP.
- Per-guest custom message override — covered by editing the guest's `notes` field manually for now.
- Foreign country codes — `normalizePhone` rejects them; the row still imports as name-only and falls back to the picker. Good enough for v1.
- CSV export of guests — `downloadCsv` already exists, easy follow-up. Export will need to decrypt server-side before generating the CSV (don't expose ciphertext).
- **Key rotation** — if `GUESTS_ENCRYPTION_KEY` ever needs to change (e.g. suspected leak), we need a one-off script that: (1) reads with the old key, (2) re-encrypts with the new key, (3) writes back. Not implemented in MVP, but the on-disk format includes only `iv ‖ ciphertext ‖ authTag` (no key-id), so adding a key-id prefix would be the first step. Document this as a known v2 follow-up.
- **Searchable encryption** — if the dashboard ever needs to filter by name/phone at the SQL layer (e.g. 10k+ guests), look into deterministic encryption (`AES-SIV`) for searchable columns, accepting the security trade-off.
