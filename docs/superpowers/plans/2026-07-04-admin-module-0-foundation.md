# Admin Module 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared substrate every admin module (1–5) depends on — the env-gated + MFA-verified auth gate, the `/admin` shell, the audit-log helper, the transactional-email helper, and the cache-invalidation helper.

**Architecture:** A small set of server-only helpers under `src/lib/admin/` + `src/lib/email/`, one migration (`admin_actions`), and the `/admin` route shell (layout gate + overview). Later modules import these helpers; they never re-implement the gate or logging. The full spec is `docs/superpowers/specs/2026-07-04-admin-foundation-design.md`.

**Tech Stack:** Next.js 14.2 (App Router, RSC + server actions), TypeScript, Supabase (`@supabase/ssr` anon client for the session, service-role admin client for writes), Supabase Auth MFA (TOTP), Resend (via `fetch`), Vitest.

## Global Constraints

- **Admin gate = env `ADMIN_EMAILS`** (comma-separated) checked against the Supabase Auth session email. `requireAdmin()` additionally requires an **MFA-verified session (AAL2)**.
- **Server-only secrets:** `ADMIN_EMAILS`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` are read only in `server-only` modules / server actions — never in a `'use client'` file, never `NEXT_PUBLIC_`.
- **Admin UI is Indonesian-only** — do NOT add admin strings to the id/en i18n dictionaries.
- **No UI library** (no Tailwind/MUI). Reuse existing CSS Modules + tokens (`src/styles/tokens.css`) for any admin chrome.
- **Every mutating admin action re-checks `requireAdmin()`** — the layout gate does not protect action invocations.
- New admin tables have **RLS enabled, service-role only** (no policies).
- Vitest already stubs `server-only` (existing `lib/payments/plans.ts` is `server-only` and unit-tested) — server-only helpers are unit-testable.

## File Structure

- Create `src/lib/admin/is-admin.ts` — `isAdminEmail` (pure) + `requireAdmin` (session + AAL2) + `AdminAuthError`.
- Create `src/lib/admin/log.ts` — `logAdminAction` (service-role insert) + `renderAdminAction` (plain-ID sentence).
- Create `src/lib/email/send.ts` — `sendAdminEmail` (best-effort Resend via `fetch`).
- Create `src/lib/admin/revalidate.ts` — `revalidateInvitation`.
- Create `supabase/migrations/2026-07-04_admin_foundation.sql` — `admin_actions` table.
- Create `src/app/admin/layout.tsx` — the gate + nav shell.
- Create `src/app/admin/page.tsx` — the overview shell.
- Modify `src/app/profile/page.tsx` — an "Admin" link shown only to admins.
- Modify the login form (path confirmed in Task 7) — the TOTP challenge so an admin can reach AAL2.

> **Module-0 boundary (do NOT build here):** the shared `invitationPublicStatus()` resolver and the "needs attention" counts read columns (`suspended_at`, `archived_at`, `pii_erased_at`, refund/deletion request tables) that modules 2/3/5 add. They are **extended in those modules**, not module 0.

---

### Task 1: `isAdminEmail` — the allowlist check

**Files:**
- Create: `src/lib/admin/is-admin.ts`
- Test: `src/lib/admin/__tests__/is-admin.test.ts`

**Interfaces:**
- Produces: `isAdminEmail(email?: string | null): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/__tests__/is-admin.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAdminEmail } from '../is-admin'

describe('isAdminEmail', () => {
  const prev = process.env.ADMIN_EMAILS
  beforeEach(() => { process.env.ADMIN_EMAILS = 'a@x.com, Boss@Y.com' })
  afterEach(() => { process.env.ADMIN_EMAILS = prev })

  it('matches allowlisted emails, case + space insensitive', () => {
    expect(isAdminEmail('a@x.com')).toBe(true)
    expect(isAdminEmail('  BOSS@y.com ')).toBe(true)
  })
  it('rejects non-listed / empty / nullish', () => {
    expect(isAdminEmail('nope@x.com')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })
  it('empty ADMIN_EMAILS means nobody is admin', () => {
    process.env.ADMIN_EMAILS = ''
    expect(isAdminEmail('a@x.com')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/admin/__tests__/is-admin.test.ts`
Expected: FAIL — `Cannot find module '../is-admin'`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/admin/is-admin.ts
import 'server-only'

/** True when `email` is in the ADMIN_EMAILS allowlist (comma-separated,
 *  case- + whitespace-insensitive). Empty/unset env ⇒ nobody is admin. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.trim().toLowerCase())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/admin/__tests__/is-admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/is-admin.ts src/lib/admin/__tests__/is-admin.test.ts
git commit -m "feat(admin): isAdminEmail allowlist check"
```

---

### Task 2: `requireAdmin` — session + MFA (AAL2) gate

**Files:**
- Modify: `src/lib/admin/is-admin.ts`
- Test: `src/lib/admin/__tests__/require-admin.test.ts`

**Interfaces:**
- Consumes: `isAdminEmail` (Task 1); `createSupabaseServerClient` (`@/lib/supabase/server`).
- Produces: `requireAdmin(): Promise<{ email: string }>`; `class AdminAuthError extends Error` with `reason: 'not-admin' | 'mfa-required'`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/__tests__/require-admin.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const getUser = vi.fn()
const getAAL = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser, mfa: { getAuthenticatorAssuranceLevel: getAAL } },
  }),
}))

import { requireAdmin, AdminAuthError } from '../is-admin'

describe('requireAdmin', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'boss@x.com'
    getUser.mockReset(); getAAL.mockReset()
  })
  it('returns the email for an allowlisted, AAL2 session', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'boss@x.com' } } })
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal2' } })
    await expect(requireAdmin()).resolves.toEqual({ email: 'boss@x.com' })
  })
  it('throws not-admin for a non-allowlisted email', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'x@y.com' } } })
    await expect(requireAdmin()).rejects.toMatchObject({ reason: 'not-admin' })
  })
  it('throws mfa-required when the session is only AAL1', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'boss@x.com' } } })
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal1' } })
    await expect(requireAdmin()).rejects.toMatchObject({ reason: 'mfa-required' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/admin/__tests__/require-admin.test.ts`
Expected: FAIL — `requireAdmin` / `AdminAuthError` not exported.

- [ ] **Step 3: Append to `is-admin.ts`**

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server'

export class AdminAuthError extends Error {
  constructor(public reason: 'not-admin' | 'mfa-required') {
    super(reason)
    this.name = 'AdminAuthError'
  }
}

/** Require an MFA-verified (AAL2) allowlisted admin session. Throws
 *  AdminAuthError otherwise. Call at the top of every admin page + action. */
export async function requireAdmin(): Promise<{ email: string }> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !isAdminEmail(user.email)) throw new AdminAuthError('not-admin')
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (data?.currentLevel !== 'aal2') throw new AdminAuthError('mfa-required')
  return { email: user.email }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/admin/__tests__/require-admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/is-admin.ts src/lib/admin/__tests__/require-admin.test.ts
git commit -m "feat(admin): requireAdmin — session + AAL2 MFA gate"
```

---

### Task 3: `admin_actions` audit — migration + `logAdminAction` + `renderAdminAction`

**Files:**
- Create: `supabase/migrations/2026-07-04_admin_foundation.sql`
- Create: `src/lib/admin/log.ts`
- Test: `src/lib/admin/__tests__/log.test.ts`

**Interfaces:**
- Consumes: `createSupabaseAdminClient` (`@/lib/supabase/admin`).
- Produces: `logAdminAction(adminEmail: string, a: { action: string; targetType?: string; targetId?: string; meta?: Record<string, unknown> }): Promise<void>`; `renderAdminAction(row: { action: string; target_id?: string | null }): string`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/2026-07-04_admin_foundation.sql
-- Admin console foundation. Idempotent; safe to re-run.
create table if not exists public.admin_actions (
  id          uuid        primary key default gen_random_uuid(),
  admin_email text        not null,
  action      text        not null,
  target_type text,
  target_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security; -- service-role only, no policies
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/admin/__tests__/log.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderAdminAction, logAdminAction } from '../log'

const insert = vi.fn(() => Promise.resolve({ error: null }))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: () => ({ insert }) }),
}))

describe('renderAdminAction', () => {
  it('renders a plain Indonesian sentence per known action', () => {
    expect(renderAdminAction({ action: 'refund.approve', target_id: 'inv-1' }))
      .toContain('Menyetujui refund')
    expect(renderAdminAction({ action: 'unknown.thing', target_id: null }))
      .toContain('unknown.thing')
  })
})

describe('logAdminAction', () => {
  it('inserts one admin_actions row', async () => {
    await logAdminAction('boss@x.com', { action: 'invitation.comp', targetId: 'inv-1' })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      admin_email: 'boss@x.com', action: 'invitation.comp', target_id: 'inv-1',
    }))
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/admin/__tests__/log.test.ts`
Expected: FAIL — `Cannot find module '../log'`.

- [ ] **Step 4: Write `log.ts`**

```ts
// src/lib/admin/log.ts
import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AdminActionInput {
  action: string
  targetType?: string
  targetId?: string
  meta?: Record<string, unknown>
}

/** Append one row to the admin_actions audit log (service-role, append-only). */
export async function logAdminAction(adminEmail: string, a: AdminActionInput): Promise<void> {
  const admin = createSupabaseAdminClient()
  await (admin.from('admin_actions') as any).insert({
    admin_email: adminEmail,
    action: a.action,
    target_type: a.targetType ?? null,
    target_id: a.targetId ?? null,
    meta: a.meta ?? null,
  })
}

/** Plain Indonesian one-liner for the Aktivitas view. Later modules add cases. */
export function renderAdminAction(row: { action: string; target_id?: string | null }): string {
  const id = row.target_id ?? ''
  const map: Record<string, string> = {
    'refund.approve': `Menyetujui refund ${id}`,
    'refund.reject': `Menolak refund ${id}`,
    'invitation.comp': `Comp undangan ${id}`,
    'invitation.suspend': `Suspend undangan ${id}`,
    'plan.update': `Ubah harga/paket ${id}`,
    'account.delete': `Hapus akun ${id}`,
  }
  return (map[row.action] ?? `${row.action} ${id}`).trim()
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/admin/__tests__/log.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/2026-07-04_admin_foundation.sql src/lib/admin/log.ts src/lib/admin/__tests__/log.test.ts
git commit -m "feat(admin): admin_actions migration + logAdminAction/renderAdminAction"
```

---

### Task 4: `sendAdminEmail` — best-effort Resend via fetch

**Files:**
- Create: `src/lib/email/send.ts`
- Test: `src/lib/email/__tests__/send.test.ts`

**Interfaces:**
- Produces: `sendAdminEmail(email: { to: string; subject: string; html: string }): Promise<boolean>` — returns `false` (never throws) when unconfigured or on error.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/email/__tests__/send.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sendAdminEmail } from '../send'

describe('sendAdminEmail', () => {
  beforeEach(() => { vi.restoreAllMocks(); process.env.RESEND_API_KEY = 'k'; process.env.RESEND_FROM = 'x@fincards.land' })

  it('POSTs to Resend and returns true on ok', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const ok = await sendAdminEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object))
  })
  it('returns false (no throw) when RESEND is not configured', async () => {
    process.env.RESEND_API_KEY = ''
    await expect(sendAdminEmail({ to: 'a@b.com', subject: 'x', html: 'x' })).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/email/__tests__/send.test.ts`
Expected: FAIL — `Cannot find module '../send'`.

- [ ] **Step 3: Write `send.ts`**

```ts
// src/lib/email/send.ts
import 'server-only'

export interface AdminEmail { to: string; subject: string; html: string }

/** Send a branded email via Resend (fetch, no SDK). BEST-EFFORT: returns false
 *  and never throws when unconfigured or on failure, so a failed send never
 *  rolls back the action that triggered it. */
export async function sendAdminEmail(email: AdminEmail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!key || !from) {
    console.warn('[sendAdminEmail] RESEND not configured — skipped')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html }),
    })
    if (!res.ok) {
      console.error('[sendAdminEmail] failed', res.status, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error('[sendAdminEmail] error', e)
    return false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/email/__tests__/send.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/send.ts src/lib/email/__tests__/send.test.ts
git commit -m "feat(admin): sendAdminEmail — best-effort Resend helper"
```

---

### Task 5: `revalidateInvitation` — the cache-map helper

**Files:**
- Create: `src/lib/admin/revalidate.ts`
- Test: `src/lib/admin/__tests__/revalidate.test.ts`

**Interfaces:**
- Produces: `revalidateInvitation(): void` — fires the standard public + dashboard + profile revalidations that every invitation-state admin action needs.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/__tests__/revalidate.test.ts
import { describe, it, expect, vi } from 'vitest'
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath }))
import { revalidateInvitation } from '../revalidate'

describe('revalidateInvitation', () => {
  it('revalidates the public page, dashboard, and profile', () => {
    revalidateInvitation()
    expect(revalidatePath).toHaveBeenCalledWith('/[template]/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/[template]/[slug]/dashboard', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/profile', 'page')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/admin/__tests__/revalidate.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write `revalidate.ts`**

```ts
// src/lib/admin/revalidate.ts
import 'server-only'
import { revalidatePath } from 'next/cache'

/** Fire the standard revalidations after any admin action that changes an
 *  invitation's state (comp / plan / suspend / publish / quota / refund). */
export function revalidateInvitation(): void {
  revalidatePath('/[template]/[slug]', 'page')
  revalidatePath('/[template]/[slug]/dashboard', 'page')
  revalidatePath('/profile', 'page')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/admin/__tests__/revalidate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/revalidate.ts src/lib/admin/__tests__/revalidate.test.ts
git commit -m "feat(admin): revalidateInvitation cache-map helper"
```

---

### Task 6: `/admin` shell — layout gate + overview + profile entry link

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Modify: `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `AdminAuthError`, `isAdminEmail` (Tasks 1–2).

- [ ] **Step 1: Create the gated layout**

```tsx
// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin, AdminAuthError } from '@/lib/admin/is-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AdminAuthError && e.reason === 'mfa-required') {
      redirect('/login?mfa=1&next=%2Fadmin')
    }
    redirect('/') // not an admin — hide the console
  }
  const nav = [
    ['/admin', 'Ringkasan'],
    ['/admin/templates', 'Template & Harga'],
    ['/admin/invitations', 'Undangan'],
    ['/admin/payments', 'Pembayaran'],
    ['/admin/users', 'Akun & Data'],
  ] as const
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>
      <nav style={{ borderRight: '0.5px solid var(--border-default)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ marginBottom: 8 }}>Admin</strong>
        {nav.map(([href, label]) => (
          <Link key={href} href={href} style={{ fontSize: 14 }}>{label}</Link>
        ))}
      </nav>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create the overview page**

```tsx
// src/app/admin/page.tsx
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AdminOverview() {
  const admin = createSupabaseAdminClient()
  const { count: invitations } = await (admin.from('invitations') as any)
    .select('id', { count: 'exact', head: true })
  const { count: paid } = await (admin.from('invitations') as any)
    .select('id', { count: 'exact', head: true }).eq('is_paid', true)
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Ringkasan</h1>
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <Metric label="Undangan" value={invitations ?? 0} />
        <Metric label="Sudah bayar" value={paid ?? 0} />
        <Metric label="Draft" value={(invitations ?? 0) - (paid ?? 0)} />
      </div>
      {/* Revenue + "needs attention" counts are wired as modules 3/5 land. */}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: 16, minWidth: 120 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
```

- [ ] **Step 3: Add the admin link to the profile page (admins only)**

In `src/app/profile/page.tsx`, near the top of the authenticated render, add (after the existing user/session is resolved — reuse the page's existing `user`):

```tsx
import { isAdminEmail } from '@/lib/admin/is-admin'
// ...inside the component, where `user` (with `.email`) is available:
{isAdminEmail(user.email) && (
  <a href="/admin" style={{ fontSize: 14, textDecoration: 'underline' }}>Buka panel admin →</a>
)}
```

- [ ] **Step 4: Type-check + manual smoke**

Run: `npx tsc --noEmit` → no new errors.
Manual (after enrolling MFA in Task 7): visiting `/admin` as a non-admin redirects to `/`; as an allowlisted admin with AAL2 it shows the overview; the profile page shows the admin link only for admins.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx src/app/profile/page.tsx
git commit -m "feat(admin): /admin gated shell + overview + profile entry link"
```

---

### Task 7: TOTP MFA challenge at login (so an admin can reach AAL2)

**Files:**
- Modify: the existing login form (find it: `git grep -l "signInWithPassword" src/app`).

**Interfaces:**
- Consumes: the Supabase browser client's `auth.mfa.listFactors()`, `auth.mfa.challenge()`, `auth.mfa.verify()`.

- [ ] **Step 1: Read the existing login form first**

Run: `git grep -ln "signInWithPassword" src/app` and read that file so the change follows its existing state/UI pattern (do not restructure it).

- [ ] **Step 2: After a successful password sign-in, branch on MFA**

Add this after `signInWithPassword` succeeds, before redirecting. It shows a 6-digit code field when the account has a TOTP factor and the session is still AAL1:

```ts
const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
if (aal?.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = factors?.totp?.[0]
  if (totp) {
    setMfaFactorId(totp.id)   // show the 6-digit code input
    return
  }
}
// else: proceed with the normal post-login redirect
```

And the verify handler for the code input:

```ts
async function verifyMfa(code: string) {
  const { data: ch } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
  const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch!.id, code })
  if (error) { setMfaError('Kode salah, coba lagi.'); return }
  window.location.href = new URLSearchParams(location.search).get('next') || '/'
}
```

- [ ] **Step 3: Manual verification (no unit test — this is a Supabase-auth UI flow)**

- In Supabase Studio (or a one-off script), enrol a TOTP factor on `fincardsland@gmail.com` (scan the QR with Google Authenticator/Authy).
- Log in: after the password, the 6-digit code prompt appears; entering the current code reaches AAL2 and lands on `/admin`.
- Confirm a wrong code shows the error and does not proceed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(admin): TOTP MFA challenge at login (AAL2 for admin)"
```

---

### Task 8: Full suite + operator apply

- [ ] **Step 1:** Run the whole suite + type-check + token guard.

Run: `npx vitest run` · `npx tsc --noEmit` · `npm run check:tokens`
Expected: all green.

- [ ] **Step 2 (operator):** Apply `supabase/migrations/2026-07-04_admin_foundation.sql` to Supabase (SQL editor / `db push` / Supabase MCP `apply_migration`).

- [ ] **Step 3 (operator):** Set `ADMIN_EMAILS=fincardsland@gmail.com` in `.env.local` (+ Vercel later), and enrol TOTP MFA on that account. Confirm `/admin` loads.

---

## Self-Review

- **Spec coverage:** gate (Task 1–2) · MFA/AAL2 (Task 2, 7) · admin_actions + logAdminAction + renderAdminAction (Task 3) · email helper (Task 4) · revalidate map (Task 5) · layout/nav/overview/entry link (Task 6). The visibility resolver + needs-attention counts are explicitly deferred to modules 2/3/5 (they need columns those modules add) — noted at the top.
- **Placeholder scan:** none — every code/test/command is concrete.
- **Type consistency:** `requireAdmin` returns `{ email }` (used by later modules); `AdminAuthError.reason` is `'not-admin' | 'mfa-required'` (used by the layout); `logAdminAction(adminEmail, {action,targetType?,targetId?,meta?})` and `renderAdminAction({action,target_id})` names match Task 3 and the spec interfaces.
