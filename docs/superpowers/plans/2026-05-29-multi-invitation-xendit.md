# Multi-Invitation + Xendit Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use `- [ ]` checkboxes.

**Goal:** Draft-first purchase flow — onboarding creates an unpaid draft, redirect to a Xendit (test-mode) invoice, webhook publishes it; one account may own many invitations; masa aktif shown on profile + dashboard.

**Architecture:** Pure helpers (`resolvePlan`, `activePeriodStatus`, `isValidCallbackToken`) are unit-tested. Server actions create the draft + Xendit invoice; a webhook route flips the row to paid/published. UI gates on `is_paid`/`is_published`/`expires_at`.

**Spec:** `docs/superpowers/specs/2026-05-29-multi-invitation-xendit-design.md`

**Prereq the user runs:** the SQL migration in Supabase, and `.env.local` keys `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`.

---

## Task 1: DB migration file

- [ ] Create `supabase/migrations/2026-05-29_payments.sql`:

```sql
alter table public.invitations add column if not exists is_paid boolean not null default false;
alter table public.invitations add column if not exists xendit_invoice_id text;
alter table public.invitations add column if not exists xendit_external_id text;
alter table public.invitations add column if not exists paid_at timestamptz;
create index if not exists idx_invitations_xendit_external on public.invitations (xendit_external_id);
```

- [ ] Commit. (User applies it in the Supabase SQL editor — note in the final report.)

## Task 2: Plan amounts + `resolvePlan` (TDD)

- [ ] Add `amountIDR` to each plan in `src/config/templateCatalog.js` (basic 149000 `'Rp 149.000'`, premium 299000 `'Rp 299.000'`, both templates).
- [ ] Write `src/lib/payments/__tests__/plans.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolvePlan } from '../plans'

describe('resolvePlan', () => {
  const paidAt = Date.UTC(2026, 0, 1)
  it('resolves basic with +1 year expiry', () => {
    const r = resolvePlan('lovebirds', 'basic')!
    expect(r.amountIDR).toBe(149000)
    expect(r.expiresAt(paidAt)).toBe(new Date(Date.UTC(2027, 0, 1)).toISOString())
  })
  it('resolves premium as lifetime (null expiry)', () => {
    const r = resolvePlan('lovebirds', 'premium')!
    expect(r.amountIDR).toBe(299000)
    expect(r.expiresAt(paidAt)).toBeNull()
  })
  it('returns null for unknown template or plan', () => {
    expect(resolvePlan('nope', 'basic')).toBeNull()
    expect(resolvePlan('lovebirds', 'nope')).toBeNull()
  })
})
```

- [ ] Implement `src/lib/payments/plans.ts`:

```ts
import { templateCatalog } from '@/config/templateCatalog'

export interface ResolvedPlan {
  planId: string
  amountIDR: number
  expiresAt: (paidAtMs: number) => string | null
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

export function resolvePlan(templateId: string, planId: string): ResolvedPlan | null {
  const entry = (templateCatalog as any[]).find((t) => t.id === templateId)
  const plan = entry?.plans?.find((p: any) => p.id === planId)
  if (!plan || typeof plan.amountIDR !== 'number') return null
  return {
    planId,
    amountIDR: plan.amountIDR,
    expiresAt: (paidAtMs: number) =>
      planId === 'premium' ? null : new Date(paidAtMs + YEAR_MS).toISOString(),
  }
}
```

- [ ] Run: `npx vitest run src/lib/payments/__tests__/plans.test.ts` → PASS. Commit.

## Task 3: `activePeriodStatus` helper (TDD) + i18n

- [ ] Write `src/lib/payments/__tests__/active-period.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { activePeriodStatus } from '../active-period'

const now = Date.UTC(2026, 5, 1)

describe('activePeriodStatus', () => {
  it('draft when not paid', () => {
    expect(activePeriodStatus({ is_paid: false }, now).status).toBe('draft')
  })
  it('lifetime when paid and no expiry', () => {
    expect(activePeriodStatus({ is_paid: true, expires_at: null }, now).status).toBe('lifetime')
  })
  it('active when paid and expiry in the future', () => {
    expect(activePeriodStatus({ is_paid: true, expires_at: new Date(Date.UTC(2027, 0, 1)).toISOString() }, now).status).toBe('active')
  })
  it('expired when paid and expiry in the past', () => {
    expect(activePeriodStatus({ is_paid: true, expires_at: new Date(Date.UTC(2026, 0, 1)).toISOString() }, now).status).toBe('expired')
  })
})
```

- [ ] Implement `src/lib/payments/active-period.ts`:

```ts
export type ActiveStatus = 'draft' | 'lifetime' | 'active' | 'expired'

export function activePeriodStatus(
  inv: { is_paid?: boolean; expires_at?: string | null },
  nowMs: number,
): { status: ActiveStatus; expiresAt: string | null } {
  if (!inv.is_paid) return { status: 'draft', expiresAt: null }
  if (!inv.expires_at) return { status: 'lifetime', expiresAt: null }
  const exp = Date.parse(inv.expires_at)
  return { status: exp < nowMs ? 'expired' : 'active', expiresAt: inv.expires_at }
}
```

- [ ] Add i18n to `src/lib/i18n/dictionaries/common.ts` under a new `activePeriod` block (id + en): `draft`, `lifetime`, `expired`, and `activeUntilPrefix` (e.g. ID `'Aktif sampai'` / EN `'Active until'`), plus `payNow` (ID `'Bayar sekarang'` / EN `'Pay now'`) and `unpaidBanner` (ID `'Undangan belum dibayar.'` / EN `'This invitation is not paid yet.'`).
- [ ] Run both payment tests + dict-parity → PASS. Commit.

## Task 4: Onboarding — draft + remove 1:1 + read plan

- [ ] `src/app/onboarding/actions.ts`:
  - Extend `OnboardingInput` with `plan: string`.
  - In `completeOnboarding`: **delete** the "already owns an invitation → return it" block (the `alreadyOwned` short-circuit). Validate `plan` via `resolvePlan(template, plan)`; default to `'basic'` if invalid. Insert with `plan`, `is_paid: false`, `is_published: false` (was `is_published: true`, `plan: 'premium'`). Return `invitationId` (the inserted row id) in the result.
  - Add server action `startCheckout(invitationId: string)` — see Task 5.
- [ ] `src/app/onboarding/page.tsx`: remove the `existing?.slug` redirect block (lines ~59-73) so owners can create more than one. (Keep the no-session guard.)
- [ ] `src/app/onboarding/OnboardingForm.tsx`: read `plan` from `useSearchParams()` (default `'basic'`); pass to `completeOnboarding`. On success, call `startCheckout(result.invitationId)` and `window.location.href = invoiceUrl` (instead of showing the `done` panel). Keep the `done` panel as a fallback if checkout returns no URL.
- [ ] Typecheck. Commit.

## Task 5: Xendit invoice + webhook + token check (TDD for token)

- [ ] Write `src/lib/payments/__tests__/xendit-token.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { isValidCallbackToken } from '../xendit'

describe('isValidCallbackToken', () => {
  beforeEach(() => { process.env.XENDIT_CALLBACK_TOKEN = 'secret-token' })
  it('accepts the exact token', () => { expect(isValidCallbackToken('secret-token')).toBe(true) })
  it('rejects a wrong token', () => { expect(isValidCallbackToken('nope')).toBe(false) })
  it('rejects null/empty', () => { expect(isValidCallbackToken(null)).toBe(false); expect(isValidCallbackToken('')).toBe(false) })
})
```

- [ ] Implement `src/lib/payments/xendit.ts`:

```ts
export function isValidCallbackToken(received: string | null): boolean {
  const expected = process.env.XENDIT_CALLBACK_TOKEN
  return !!expected && !!received && received === expected
}

interface CreateInvoiceArgs {
  externalId: string
  amountIDR: number
  payerEmail?: string
  description: string
  successUrl: string
  failureUrl: string
}

export async function createXenditInvoice(a: CreateInvoiceArgs): Promise<{ id: string; invoiceUrl: string }> {
  const key = process.env.XENDIT_SECRET_KEY
  if (!key) throw new Error('XENDIT_SECRET_KEY is not set')
  const res = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    },
    body: JSON.stringify({
      external_id: a.externalId,
      amount: a.amountIDR,
      payer_email: a.payerEmail,
      description: a.description,
      currency: 'IDR',
      success_redirect_url: a.successUrl,
      failure_redirect_url: a.failureUrl,
    }),
  })
  if (!res.ok) throw new Error(`Xendit invoice failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { id: string; invoice_url: string }
  return { id: json.id, invoiceUrl: json.invoice_url }
}
```

- [ ] Add `startCheckout` to `src/app/onboarding/actions.ts`:
  - Verify session; load invitation by id; confirm `owner_user_id === user.id`.
  - `resolvePlan(invitation.template_id, invitation.plan)` → amount (reject if null).
  - `externalId = inv_${invitationId}_${Date.now()}`. `base = process.env.NEXT_PUBLIC_SITE_URL`.
  - `createXenditInvoice(...)`; update row `xendit_invoice_id`, `xendit_external_id`. Return `{ ok, invoiceUrl }`.
- [ ] Create `src/app/api/payment/xendit/webhook/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidCallbackToken } from '@/lib/payments/xendit'
import { resolvePlan } from '@/lib/payments/plans'

export async function POST(req: Request) {
  if (!isValidCallbackToken(req.headers.get('x-callback-token'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const body = (await req.json()) as { status?: string; external_id?: string }
  if (body.status !== 'PAID' || !body.external_id) return NextResponse.json({ ok: true })

  const admin = createSupabaseAdminClient()
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, is_paid')
    .eq('xendit_external_id', body.external_id)
    .maybeSingle()) as { data: { id: string; plan: string; template_id: string; is_paid: boolean } | null }
  if (!inv || inv.is_paid) return NextResponse.json({ ok: true }) // unknown or idempotent

  const now = Date.now()
  const resolved = resolvePlan(inv.template_id, inv.plan)
  await (admin.from('invitations') as any)
    .update({
      is_paid: true,
      is_published: true,
      paid_at: new Date(now).toISOString(),
      expires_at: resolved ? resolved.expiresAt(now) : null,
    })
    .eq('id', inv.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] Run token test. Typecheck. Commit.

## Task 6: Gating + masa aktif display

- [ ] `src/app/[template]/[slug]/page.tsx`: in the fetch, also select `expires_at`; treat a past `expires_at` like unpublished (demo slugs still fall back). Add to the `!data || !data.is_published` guard: `|| (data.expires_at && Date.parse(data.expires_at) < Date.now())`.
- [ ] `src/app/[template]/[slug]/dashboard/page.tsx`: ensure `is_paid` + `expires_at` are selected and passed into `DashboardClient` (via the `invitation` prop — confirm the select includes `*` or add the columns).
- [ ] `DashboardClient.tsx`: near the status chip, render masa-aktif using `activePeriodStatus(invitation, Date.now())` + i18n labels. When `status === 'draft'`, render an unpaid banner with a "Bayar sekarang" button that calls `startCheckout(invitation.id)` and redirects to `invoiceUrl`.
- [ ] `src/app/profile/page.tsx`: select `is_paid, expires_at` too; for each invitation render a status chip from `activePeriodStatus`.
- [ ] Typecheck. Commit.

## Task 7: Env docs + final verification

- [ ] Append to `.env.local` (commented template) the two keys: `XENDIT_SECRET_KEY=`, `XENDIT_CALLBACK_TOKEN=`. (Do not commit real values; `.env.local` is gitignored.)
- [ ] `npm test` → all pass. `npx tsc --noEmit` → clean. `npm run build` → clean.
- [ ] Report to user: run the migration SQL in Supabase, add the two env keys, and (for local webhook) use a tunnel or the simulate curl:

```bash
curl -X POST http://localhost:3000/api/payment/xendit/webhook \
  -H "x-callback-token: <TOKEN>" -H "content-type: application/json" \
  -d '{"status":"PAID","external_id":"<externalId-from-the-row>"}'
```

---

## Self-Review notes
- Pure helpers (`resolvePlan`, `activePeriodStatus`, `isValidCallbackToken`) are TDD'd; Xendit HTTP + DB are manual.
- Webhook is idempotent (skips already-paid) and auth'd by `x-callback-token`.
- `is_published=false` for drafts → public page already hides them; expiry adds past-due hiding.
- Secret key only in server modules (`xendit.ts`, action, route).
- Redirect `?paid=1` is cosmetic; dashboard reads live `is_paid`.
