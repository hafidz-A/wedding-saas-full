# Guest Quota + Paid Add-on Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell guest quota per invitation — a plan-derived base (Basic 200 / Premium 300) plus paid add-on blocks (+50 guests = Rp 10.000), bought at onboarding and from the dashboard Tamu tab, hard-enforced server-side, capped at 5.000.

**Architecture:** `effective_quota = base_guest_quota(plan) + guest_quota_extra`. Base is config in `template_plans` (derived from plan, so an upgrade lifts it for free); `guest_quota_extra` is a per-invitation column mutated only by paid add-ons. Add-ons reuse the existing `plan_upgrades` payment pattern: a `quota_addons` table + Xendit invoice keyed `qta_`, verified against the recorded amount. Pure money/snap math lives in a client-safe `lib/payments/quota.ts` shared by the stepper UI and the server.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + service-role admin client), Xendit invoices, Vitest.

## Global Constraints

- Block size **50 guests**; block price **Rp 10.000**; cap **5.000** effective total. Constants live in `lib/payments/quota.ts` (`BLOCK_SIZE`, `BLOCK_PRICE_IDR`, `QUOTA_CAP`).
- Base quota: Basic **200**, Premium **300**. DB source of truth = `template_plans.base_guest_quota`; client-safe fallback constant `DEFAULT_BASE_QUOTA = { basic: 200, premium: 300 }`, ultimate fallback **200**.
- Enforcement is **hard block** server-side — `addGuest` and `importGuests` reject over-quota (import is NOT truncated). UI snap is convenience only; the server re-validates.
- `lib/payments/quota.ts` must NOT import `server-only` (the stepper imports it). `lib/payments/plans.ts` stays `server-only`.
- All money verification compares against a **recorded/derived expected amount**, never a recomputed plan price alone (the add-on changes the total).
- Add-on apply must NOT touch `plan`, `is_paid`, `is_published`, or `expires_at`. Upgrade/renewal must NOT touch `guest_quota_extra`.
- i18n: every new key added to BOTH `id` and `en` dictionaries (the `dict-parity` test enforces this).
- Money amounts are integer IDR. Quota quantities are integer multiples of 50.

---

### Task 1: Pure quota math module

**Files:**
- Create: `src/lib/payments/quota.ts`
- Test: `src/lib/payments/__tests__/quota.test.ts`

**Interfaces:**
- Produces: `BLOCK_SIZE`, `BLOCK_PRICE_IDR`, `QUOTA_CAP: number`; `DEFAULT_BASE_QUOTA: Record<string, number>`; `blocks(n: number): number`; `quotaAddonAmount(qtyGuests: number): number`; `effectiveQuota(base: number, extra: number): number`; `initialPurchaseAmount(planPrice: number, extra: number): number`; `clampQuotaExtra(base: number, extra: number): number`; `snapQuotaToBlock(value: number, min: number, max: number): number`; `formatIDR(amount: number): string` (client-safe; `template-plans.ts` re-exports it for server callers).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/payments/__tests__/quota.test.ts
import { describe, it, expect } from 'vitest'
import {
  BLOCK_SIZE, BLOCK_PRICE_IDR, QUOTA_CAP, DEFAULT_BASE_QUOTA,
  blocks, quotaAddonAmount, effectiveQuota, initialPurchaseAmount,
  clampQuotaExtra, snapQuotaToBlock,
} from '../quota'

describe('quota constants', () => {
  it('are the agreed values', () => {
    expect(BLOCK_SIZE).toBe(50)
    expect(BLOCK_PRICE_IDR).toBe(10_000)
    expect(QUOTA_CAP).toBe(5000)
    expect(DEFAULT_BASE_QUOTA).toEqual({ basic: 200, premium: 300 })
  })
})

describe('blocks / quotaAddonAmount', () => {
  it('counts 50-guest blocks', () => {
    expect(blocks(0)).toBe(0)
    expect(blocks(50)).toBe(1)
    expect(blocks(150)).toBe(3)
  })
  it('prices each block at Rp10k', () => {
    expect(quotaAddonAmount(0)).toBe(0)
    expect(quotaAddonAmount(50)).toBe(10_000)
    expect(quotaAddonAmount(300)).toBe(60_000)
  })
})

describe('effectiveQuota / initialPurchaseAmount', () => {
  it('adds base + extra', () => {
    expect(effectiveQuota(200, 0)).toBe(200)
    expect(effectiveQuota(300, 150)).toBe(450)
  })
  it('adds the add-on price onto the plan price', () => {
    expect(initialPurchaseAmount(149_000, 0)).toBe(149_000)
    expect(initialPurchaseAmount(149_000, 100)).toBe(169_000) // +2 blocks
    expect(initialPurchaseAmount(299_000, 50)).toBe(309_000)
  })
})

describe('clampQuotaExtra', () => {
  it('snaps to 50 and never exceeds cap - base', () => {
    expect(clampQuotaExtra(200, 0)).toBe(0)
    expect(clampQuotaExtra(200, 137)).toBe(150)   // snap 137 -> 150
    expect(clampQuotaExtra(200, 999999)).toBe(4800) // cap 5000 - base 200
    expect(clampQuotaExtra(300, 999999)).toBe(4700)
    expect(clampQuotaExtra(200, -50)).toBe(0)     // never negative
  })
})

describe('snapQuotaToBlock', () => {
  it('rounds to nearest 50, half-up, clamped to [min,max]', () => {
    expect(snapQuotaToBlock(237, 200, 5000)).toBe(250)
    expect(snapQuotaToBlock(222, 200, 5000)).toBe(200)
    expect(snapQuotaToBlock(225, 200, 5000)).toBe(250) // half rounds up
    expect(snapQuotaToBlock(1043, 200, 5000)).toBe(1050)
    expect(snapQuotaToBlock(1111, 200, 5000)).toBe(1100)
    expect(snapQuotaToBlock(2139, 200, 5000)).toBe(2150)
    expect(snapQuotaToBlock(12456, 200, 5000)).toBe(5000) // cap
    expect(snapQuotaToBlock(10, 200, 5000)).toBe(200)     // below min
    expect(snapQuotaToBlock(NaN, 200, 5000)).toBe(200)    // garbage -> min
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payments/__tests__/quota.test.ts`
Expected: FAIL — `Cannot find module '../quota'`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/payments/quota.ts
// Pure quota + add-on money math. CLIENT-SAFE — no 'server-only' (the stepper
// imports this). The server re-validates everything; the snap helper is UX only.

export const BLOCK_SIZE = 50
export const BLOCK_PRICE_IDR = 10_000
export const QUOTA_CAP = 5000

/** Plan-derived base quota included in the plan price. DB (`template_plans`) is
 *  the real source of truth; this is the client-safe fallback. */
export const DEFAULT_BASE_QUOTA: Record<string, number> = { basic: 200, premium: 300 }

/** Number of 50-guest blocks in a guest count (rounded, never negative). */
export function blocks(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n / BLOCK_SIZE)
}

/** Rupiah for buying `qtyGuests` extra (blocks × Rp10k). */
export function quotaAddonAmount(qtyGuests: number): number {
  return blocks(qtyGuests) * BLOCK_PRICE_IDR
}

export function effectiveQuota(base: number, extra: number): number {
  return base + Math.max(0, extra)
}

/** Initial-purchase total: plan price + add-on for the chosen extra. */
export function initialPurchaseAmount(planPrice: number, extra: number): number {
  return planPrice + quotaAddonAmount(Math.max(0, extra))
}

/** Clamp a chosen `extra` to a clean block within [0, QUOTA_CAP - base]. */
export function clampQuotaExtra(base: number, extra: number): number {
  const maxExtra = Math.max(0, QUOTA_CAP - base)
  const snapped = Math.round((Number.isFinite(extra) ? extra : 0) / BLOCK_SIZE) * BLOCK_SIZE
  return Math.min(Math.max(0, snapped), maxExtra)
}

/** Snap a typed value to the nearest 50 (half-up), clamped to [min, max]. */
export function snapQuotaToBlock(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const snapped = Math.round(value / BLOCK_SIZE) * BLOCK_SIZE
  return Math.min(Math.max(snapped, min), max)
}

/** Format an IDR amount as "Rp 149.000". Client-safe (no server-only). */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
```

Add to the test (Step 1): `expect(formatIDR(169000)).toBe('Rp 169.000')` (import `formatIDR`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/payments/__tests__/quota.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/quota.ts src/lib/payments/__tests__/quota.test.ts
git commit -m "feat(quota): pure quota + add-on money math module"
```

---

### Task 2: Database migration (file only; applied to Supabase later)

**Files:**
- Create: `supabase/migrations/2026-06-30_guest_quota.sql`

**Interfaces:**
- Produces (DB): `template_plans.base_guest_quota int`, `invitations.guest_quota_extra int not null default 0`, table `quota_addons`, function `increment_guest_quota_extra(uuid, int)`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/2026-06-30_guest_quota.sql
-- Guest quota: plan-derived base + paid add-on blocks. Idempotent; safe to re-run.
-- Apply in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1. Base quota per plan (config-driven). Backfill existing rows.
alter table public.template_plans
  add column if not exists base_guest_quota integer not null default 200;
update public.template_plans set base_guest_quota = 200 where plan_code = 'basic';
update public.template_plans set base_guest_quota = 300 where plan_code = 'premium';

-- 2. Purchased add-on (guests beyond base), multiple of 50.
alter table public.invitations
  add column if not exists guest_quota_extra integer not null default 0;

-- 3. Add-on purchase ledger (mirrors plan_upgrades). external_id prefix qta_.
create table if not exists public.quota_addons (
  id                 uuid          primary key default gen_random_uuid(),
  invitation_id      uuid          not null references public.invitations(id) on delete cascade,
  qty_guests         integer       not null,
  amount_idr         integer       not null,
  xendit_invoice_id  text,
  xendit_external_id text          unique,
  status             text          not null default 'pending',  -- pending | paid
  created_at         timestamptz   not null default now(),
  paid_at            timestamptz,
  constraint quota_addons_status_valid    check (status in ('pending','paid')),
  constraint quota_addons_qty_positive    check (qty_guests > 0),
  constraint quota_addons_amount_positive check (amount_idr > 0)
);
create index if not exists quota_addons_invitation_idx on public.quota_addons (invitation_id);
alter table public.quota_addons enable row level security;  -- service-role only, no policies

-- 4. Atomic increment so two paid callbacks can't lose an update.
create or replace function public.increment_guest_quota_extra(p_invitation_id uuid, p_qty integer)
returns void language sql security definer as $$
  update public.invitations
     set guest_quota_extra = guest_quota_extra + p_qty
   where id = p_invitation_id;
$$;
```

- [ ] **Step 2: Sanity-check the SQL parses (no DB connection needed)**

Read the file back and confirm: column adds use `if not exists`, the table has the 3 CHECK constraints, RLS is enabled, and the function is `security definer`. (Live apply is an operator step at the end — Task 12.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-06-30_guest_quota.sql
git commit -m "feat(quota): migration — base_guest_quota, guest_quota_extra, quota_addons"
```

---

### Task 3: Plan helpers — base quota from template_plans

**Files:**
- Modify: `src/lib/payments/template-plans.ts` (add `base_guest_quota` to row + select + mapRow)
- Modify: `src/lib/payments/plans.ts` (add `planBaseQuota`)
- Test: `src/lib/payments/__tests__/plans.test.ts` (add a describe block)

**Interfaces:**
- Consumes: `TemplatePlanRow` (Task baseline), `DEFAULT_BASE_QUOTA` (Task 1).
- Produces: `TemplatePlanRow.base_guest_quota: number`; `planBaseQuota(plans: TemplatePlanRow[], planCode: string): number`.

- [ ] **Step 1: Write the failing test (append to plans.test.ts)**

```ts
import { planBaseQuota } from '../plans'

describe('planBaseQuota', () => {
  const withBase = [
    { template_id: 'lovebirds', plan_code: 'basic',   display_name: 'B', price_idr: 149000, duration_days: 365,  features: [], sort_order: 1, base_guest_quota: 200 },
    { template_id: 'lovebirds', plan_code: 'premium', display_name: 'P', price_idr: 299000, duration_days: null, features: [], sort_order: 2, base_guest_quota: 300 },
  ] as any
  it('reads base from the matching plan row', () => {
    expect(planBaseQuota(withBase, 'basic')).toBe(200)
    expect(planBaseQuota(withBase, 'premium')).toBe(300)
  })
  it('falls back to DEFAULT_BASE_QUOTA then 200 for unknown plans', () => {
    expect(planBaseQuota([], 'premium')).toBe(300)
    expect(planBaseQuota([], 'free')).toBe(200)
  })
})
```

Also update the two existing `rows` fixtures at the top of the file to include `base_guest_quota: 200` / `300` (TypeScript will require it once the field is non-optional).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payments/__tests__/plans.test.ts`
Expected: FAIL — `planBaseQuota` is not exported.

- [ ] **Step 3: Implement**

In `template-plans.ts` add `base_guest_quota: number` to the `TemplatePlanRow` interface, add `base_guest_quota` to BOTH `.select(...)` strings, and in `mapRow`:

```ts
base_guest_quota: r.base_guest_quota == null ? 200 : Number(r.base_guest_quota),
```

Also avoid a duplicate `formatIDR`: delete the local `formatIDR` definition in `template-plans.ts` and re-export the client-safe one so existing server callers keep working:

```ts
export { formatIDR } from './quota'
```

In `plans.ts` add (it may import from the client-safe module):

```ts
import { DEFAULT_BASE_QUOTA } from './quota'

/** Base guest quota included in a plan, from template_plans (fallback 200). */
export function planBaseQuota(plans: TemplatePlanRow[], planCode: string): number {
  const row = plans.find((p) => p.plan_code === planCode)
  if (row && typeof row.base_guest_quota === 'number') return row.base_guest_quota
  return DEFAULT_BASE_QUOTA[planCode] ?? 200
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/payments/__tests__/plans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/template-plans.ts src/lib/payments/plans.ts src/lib/payments/__tests__/plans.test.ts
git commit -m "feat(quota): base_guest_quota on template_plans + planBaseQuota helper"
```

---

### Task 4: publish.ts — apply a paid add-on (atomic, no plan touch)

**Files:**
- Modify: `src/lib/payments/publish.ts`
- Test: `src/lib/payments/__tests__/publish.test.ts` (add a describe block)

**Interfaces:**
- Consumes: admin client (`.rpc`, `.from().update().eq()`).
- Produces: `applyPaidQuotaAddon(admin: any, addon: { id: string; invitation_id: string; qty_guests: number }, nowMs?: number): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/payments/__tests__/publish.test.ts
import { applyPaidQuotaAddon } from '../publish'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'

describe('applyPaidQuotaAddon', () => {
  it('calls the atomic increment RPC and marks the addon paid', async () => {
    const fake = createFakeSupabase({ tables: { quota_addons: { update: {} } } })
    await applyPaidQuotaAddon(fake as any, { id: 'a1', invitation_id: 'inv-1', qty_guests: 100 })
    const rpc = fake._calls.find((c) => c.kind === 'rpc')
    expect(rpc?.name).toBe('increment_guest_quota_extra')
    expect(rpc?.args).toEqual({ p_invitation_id: 'inv-1', p_qty: 100 })
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'quota_addons')!
    expect(upd.value.status).toBe('paid')
    expect(upd.value.paid_at).toBeTruthy()
    expect(fake._calls.some((c) => c.kind === 'update' && c.table === 'invitations')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payments/__tests__/publish.test.ts`
Expected: FAIL — `applyPaidQuotaAddon` not exported.

- [ ] **Step 3: Implement (append to publish.ts)**

```ts
export interface PaidQuotaAddon {
  id: string
  invitation_id: string
  qty_guests: number
}

/**
 * Apply a verified, PAID quota add-on: atomically bump the invitation's
 * guest_quota_extra by qty_guests, then mark the addon row paid. Does NOT touch
 * plan / is_paid / is_published / expires_at. CALLER must verify payment first.
 */
export async function applyPaidQuotaAddon(
  admin: any,
  addon: PaidQuotaAddon,
  nowMs: number = Date.now(),
): Promise<void> {
  await admin.rpc('increment_guest_quota_extra', {
    p_invitation_id: addon.invitation_id,
    p_qty: addon.qty_guests,
  })
  await (admin.from('quota_addons') as any)
    .update({ status: 'paid', paid_at: new Date(nowMs).toISOString() })
    .eq('id', addon.id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/payments/__tests__/publish.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/publish.ts src/lib/payments/__tests__/publish.test.ts
git commit -m "feat(quota): applyPaidQuotaAddon — atomic extra bump, no plan touch"
```

---

### Task 5: Webhook — `qta_` branch + initial-purchase amount includes add-on

**Files:**
- Modify: `src/app/api/payment/xendit/webhook/route.ts`
- Test: `src/app/api/payment/xendit/webhook/__tests__/route.test.ts` (add cases)

**Interfaces:**
- Consumes: `applyPaidQuotaAddon` (Task 4), `initialPurchaseAmount` (Task 1), `getXenditInvoice`, `isPaidStatus`.

- [ ] **Step 1: Write the failing tests**

Mirror the existing upgrade tests in the file. Add (a) a `qta_` callback that verifies + applies, and (b) an initial-purchase callback where the row has `guest_quota_extra` so the expected amount = plan price + add-on. Use the file's existing mocking style for `getXenditInvoice`. Key assertions:

```ts
// qta_ paid: looks up quota_addons by external_id, verifies amount, applies
// -> expect an rpc 'increment_guest_quota_extra' call and quota_addons update status:'paid'

// initial purchase with extra=100, plan price 149000 -> expected 169000:
//   snap.amountIDR = 169000 -> publishPaidInvitation called
//   snap.amountIDR = 149000 -> NOT published (verification fails)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/payment/xendit/webhook/__tests__/route.test.ts`
Expected: FAIL (new branch / amount logic not present).

- [ ] **Step 3: Implement**

Add the import:

```ts
import { applyPaidQuotaAddon } from '@/lib/payments/publish'
import { initialPurchaseAmount } from '@/lib/payments/quota'
```

Add a branch in `POST`, next to the `upg_` / `ren_` branches:

```ts
if (body.external_id.startsWith('qta_')) {
  return handleQuotaAddon(admin, body)
}
```

In the initial-purchase path, add `guest_quota_extra` to the invitation select, and change the expected amount:

```ts
const expectedAmount = initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))
// verified = ... && snap.amountIDR === expectedAmount   (was resolved.amountIDR)
// fallback: verified = reported === expectedAmount      (was resolved.amountIDR)
```

Add the handler (mirrors `handleUpgrade`):

```ts
async function handleQuotaAddon(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  body: { id?: string; external_id?: string; amount?: number; paid_amount?: number },
) {
  const { data: addon } = (await admin
    .from('quota_addons')
    .select('id, invitation_id, qty_guests, amount_idr, xendit_invoice_id, status')
    .eq('xendit_external_id', body.external_id as string)
    .maybeSingle()) as {
    data: { id: string; invitation_id: string; qty_guests: number; amount_idr: number; xendit_invoice_id: string | null; status: string } | null
  }
  if (!addon || addon.status === 'paid') return NextResponse.json({ ok: true })

  const expected = Number(addon.amount_idr)
  let verified = false
  try {
    const snap = await getXenditInvoice(addon.xendit_invoice_id ?? body.id ?? '')
    verified = snap.externalId === body.external_id && isPaidStatus(snap.status) && snap.amountIDR === expected
  } catch (e) {
    const reported = body.paid_amount ?? body.amount
    verified = reported === expected
    console.error('[xendit webhook] quota addon re-fetch failed, used body amount', e)
  }
  if (!verified) return NextResponse.json({ ok: true })

  await applyPaidQuotaAddon(admin, { id: addon.id, invitation_id: addon.invitation_id, qty_guests: Number(addon.qty_guests) })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/payment/xendit/webhook/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/xendit/webhook/route.ts src/app/api/payment/xendit/webhook/__tests__/route.test.ts
git commit -m "feat(quota): webhook qta_ branch + initial-purchase amount includes add-on"
```

---

### Task 6: Onboarding actions — store extra, charge add-on, add-on checkout + recheck

**Files:**
- Modify: `src/app/onboarding/actions.ts`
- Test: `src/app/onboarding/__tests__/actions.test.ts` (add cases)

**Interfaces:**
- Consumes: `initialPurchaseAmount`, `clampQuotaExtra`, `quotaAddonAmount`, `QUOTA_CAP`, `effectiveQuota` (Task 1), `planBaseQuota` + `getTemplatePlans` (Task 3), `applyPaidQuotaAddon` (Task 4).
- Produces: `OnboardingInput.guestQuotaExtra?: number`; `startQuotaAddonCheckout(invitationId: string, qtyGuests: number): Promise<CheckoutResult>`; `recheckQuotaAddon(invitationId: string): Promise<RecheckResult>`.

- [ ] **Step 1: Write the failing tests**

Following the existing onboarding test style, add:
- `completeOnboarding` with `guestQuotaExtra: 137` inserts `guest_quota_extra: 150` (clamped/snapped).
- `startCheckout` for a draft with `guest_quota_extra: 100`, plan price 149000 → Xendit invoice created with `amount: 169000` (assert via the mocked `createXenditInvoice`).
- `startQuotaAddonCheckout('inv', 100)` on a paid invitation inserts a `quota_addons` row with `qty_guests: 100`, `amount_idr: 20000`, `status: 'pending'`, external id starting `qta_`.
- `startQuotaAddonCheckout` rejects when it would exceed the cap (effective already 4950, qty 100).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/onboarding/__tests__/actions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Imports:

```ts
import { initialPurchaseAmount, clampQuotaExtra, quotaAddonAmount, effectiveQuota, QUOTA_CAP } from '@/lib/payments/quota'
import { getTemplatePlans } from '@/lib/payments/template-plans'
import { planBaseQuota } from '@/lib/payments/plans'
import { applyPaidQuotaAddon } from '@/lib/payments/publish'
import { DEFAULT_BASE_QUOTA } from '@/lib/payments/quota'
```

`OnboardingInput` + `guestQuotaExtra?: number`. In `completeOnboarding`, before insert:

```ts
const baseForPlan = DEFAULT_BASE_QUOTA[plan] ?? 200
const guestQuotaExtra = clampQuotaExtra(baseForPlan, Number(input.guestQuotaExtra ?? 0))
```

…and add `guest_quota_extra: guestQuotaExtra` to the `.insert({...})`.

In `startCheckout`, add `guest_quota_extra` to the select, and:

```ts
const amountIDR = initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))
// pass amountIDR to createXenditInvoice instead of resolved.amountIDR
```

Add the two new actions (mirror `startUpgradeCheckout` / `recheckUpgrade`):

```ts
/** Buy extra guest quota for an already-paid invitation (blocks of 50). */
export async function startQuotaAddonCheckout(invitationId: string, qtyGuests: number): Promise<CheckoutResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`checkout:${user.id}`, { windowMs: 60_000, max: 6 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, slug, plan, template_id, owner_user_id, email, is_paid, guest_quota_extra')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; slug: string; plan: string; template_id: string; owner_user_id: string; email: string | null; is_paid: boolean; guest_quota_extra: number } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (!inv.is_paid) return { ok: false, error: 'Selesaikan pembayaran awal undangan dulu' }

    const qty = clampQuotaExtra(0, Number(qtyGuests))            // snap to 50, >= 0
    if (qty <= 0) return { ok: false, error: 'Jumlah tambahan minimal 50 tamu' }

    const plans = await getTemplatePlans(inv.template_id)
    const base = planBaseQuota(plans, inv.plan)
    const current = effectiveQuota(base, Number(inv.guest_quota_extra ?? 0))
    if (current + qty > QUOTA_CAP) {
      return { ok: false, error: `Maksimal ${QUOTA_CAP} tamu. Sisa kuota yang bisa ditambah: ${QUOTA_CAP - current}.` }
    }

    const amountIDR = quotaAddonAmount(qty)
    const base_url = siteBaseUrl()
    const externalId = `qta_${inv.id}_${Date.now()}`
    const dash = `${base_url}/${inv.template_id}/${inv.slug}/dashboard`

    const { id: invoiceId, invoiceUrl } = await createXenditInvoice({
      externalId,
      amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      description: `Tambah ${qty} kuota tamu — ${inv.slug}`,
      successUrl: `${dash}?quota=1`,
      failureUrl: `${dash}?quota=failed`,
    })

    await (admin.from('quota_addons') as any).insert({
      invitation_id: inv.id,
      qty_guests: qty,
      amount_idr: amountIDR,
      xendit_invoice_id: invoiceId,
      xendit_external_id: externalId,
      status: 'pending',
    })

    return { ok: true, invoiceUrl }
  } catch (e) {
    console.error('startQuotaAddonCheckout error:', e)
    return { ok: false, error: 'Gagal memulai pembelian kuota. Coba lagi sebentar lagi.' }
  }
}

/** Manual fallback for a missed qta_ webhook. */
export async function recheckQuotaAddon(invitationId: string): Promise<RecheckResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`recheck:${user.id}`, { windowMs: 60_000, max: 12 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, owner_user_id')
      .eq('id', invitationId)
      .maybeSingle()) as { data: { id: string; owner_user_id: string } | null }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }

    const { data: addon } = (await admin
      .from('quota_addons')
      .select('id, invitation_id, qty_guests, amount_idr, xendit_invoice_id, status')
      .eq('invitation_id', inv.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: { id: string; invitation_id: string; qty_guests: number; amount_idr: number; xendit_invoice_id: string | null; status: string } | null
    }
    if (!addon || !addon.xendit_invoice_id) return { ok: false, error: 'Tidak ada pembelian kuota yang menunggu pembayaran' }

    const snap = await getXenditInvoice(addon.xendit_invoice_id)
    if (!isPaidStatus(snap.status) || snap.amountIDR !== Number(addon.amount_idr)) {
      return { ok: true, published: false, status: snap.status }
    }

    await applyPaidQuotaAddon(admin, { id: addon.id, invitation_id: addon.invitation_id, qty_guests: Number(addon.qty_guests) })
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckQuotaAddon error:', e)
    return { ok: false, error: 'Gagal mengecek pembelian kuota. Coba lagi sebentar lagi.' }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/onboarding/__tests__/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/actions.ts src/app/onboarding/__tests__/actions.test.ts
git commit -m "feat(quota): onboarding stores extra, charges add-on, quota add-on checkout + recheck"
```

---

### Task 7: Enforcement — hard block in addGuest + importGuests

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/guests/actions.ts`
- Test: `src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts` (add cases)

**Interfaces:**
- Consumes: `getTemplatePlans` (Task 3), `planBaseQuota` (Task 3), `effectiveQuota` (Task 1).
- Produces: internal `quotaState(admin, invitation_id): Promise<{ used: number; effective: number }>` (not exported — Next 'use server' files only export async fns, and this IS async, so it may be exported, but keep it internal/non-exported to avoid action surface).

- [ ] **Step 1: Write the failing tests (append to the guests actions test)**

```ts
vi.mock('@/lib/payments/template-plans', () => ({
  getTemplatePlans: vi.fn(async () => [
    { template_id: 'lovebirds', plan_code: 'basic', display_name: 'B', price_idr: 149000, duration_days: 365, features: [], sort_order: 1, base_guest_quota: 200 },
  ]),
}))

describe('addGuest — quota enforcement', () => {
  it('throws when the guest list is already at the effective quota', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 0 } } },
        guests: { select: { data: null, count: 200 }, insert: { data: guestRow() } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(addGuest('slug', { name: 'Budi' })).rejects.toThrow(/kuota/i)
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guests')).toBe(false)
  })

  it('allows adding when under quota', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 0 } } },
        guests: { select: { data: null, count: 199 }, insert: { data: guestRow() } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(addGuest('slug', { name: 'Budi' })).resolves.toBeTruthy()
  })
})

describe('importGuests — quota enforcement', () => {
  it('rejects an import that would exceed the effective quota (no truncation)', async () => {
    const fake = createFakeSupabase({
      tables: {
        invitations: { select: { data: { plan: 'basic', template_id: 'lovebirds', guest_quota_extra: 0 } } },
        guests: { select: { data: [], count: 199 }, insert: { data: null, count: 2 } },
      },
    })
    mockAdmin.mockReturnValue(fake as any)
    await expect(importGuests('slug', 'Budi\nSari')).rejects.toThrow(/kuota/i) // 199 + 2 > 200
    expect(fake._calls.some((c) => c.kind === 'insert' && c.table === 'guests')).toBe(false)
  })
})
```

> Note: the fake returns the SAME scripted `guests.select` result for every select on that table. `addGuest`/`importGuests` use a `head:true` count select; the existing import-token flow also selects `guests`. Scripting `count` + `data` on `guests.select` covers both. If a test needs different successive results, pass an ARRAY (the stub consumes in order).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts"`
Expected: FAIL — no quota check yet (insert happens / no throw).

- [ ] **Step 3: Implement**

Add imports at the top of `guests/actions.ts`:

```ts
import { getTemplatePlans } from '@/lib/payments/template-plans'
import { planBaseQuota } from '@/lib/payments/plans'
import { effectiveQuota } from '@/lib/payments/quota'
```

Add the helper (after `authorizeOwnership`):

```ts
/** Current guest count + the invitation's effective quota (base + extra). */
async function quotaState(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invitation_id: string,
): Promise<{ used: number; effective: number }> {
  const { data: inv } = (await admin
    .from('invitations')
    .select('plan, template_id, guest_quota_extra')
    .eq('id', invitation_id)
    .maybeSingle()) as { data: { plan: string; template_id: string; guest_quota_extra: number | null } | null }
  const plans = await getTemplatePlans(inv?.template_id ?? '')
  const base = planBaseQuota(plans, inv?.plan ?? 'basic')
  const { count } = await (admin.from('guests') as any)
    .select('id', { count: 'exact', head: true })
    .eq('invitation_id', invitation_id)
  return { used: count ?? 0, effective: effectiveQuota(base, Number(inv?.guest_quota_extra ?? 0)) }
}
```

In `addGuest`, after `authorizeOwnership` + name validation, before the insert:

```ts
const { used, effective } = await quotaState(admin, invitation_id)
if (used >= effective) {
  throw new Error(`Kuota tamu penuh (${used}/${effective}). Tambah kuota dulu untuk menambah tamu.`)
}
```

(Move the `const admin = createSupabaseAdminClient()` above this check.)

In `importGuests`, after `parseGuestImport` + the row-count guards, before building `insertRows`:

```ts
const { used, effective } = await quotaState(admin, invitation_id)
if (used + rows.length > effective) {
  throw new Error(`Melebihi kuota tamu. Sisa kuota: ${Math.max(0, effective - used)} dari ${rows.length} yang diimpor. Tambah kuota atau kurangi daftar.`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts"`
Expected: PASS (existing tests still green — they script `invitations.select` implicitly via `default`; if any pre-existing addGuest test now hits the quota path with no scripted invitation, give it `default: { data: { plan:'basic', template_id:'lovebirds', guest_quota_extra: 0 } }` or a high count. Adjust those tests to script `guests.select.count` low.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/guests/actions.ts" "src/app/[template]/[slug]/dashboard/guests/__tests__/actions.test.ts"
git commit -m "feat(quota): hard-block addGuest + importGuests over effective quota"
```

---

### Task 8: i18n keys (id + en)

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (under `tabs.guests` add `quota`)
- Modify: `src/lib/i18n/dictionaries/onboarding.ts` (add `quota`)
- Test: existing `dict-parity` test (run it — it enforces id/en parity)

**Interfaces:**
- Produces: `dashboard.tabs.guests.quota.{meterPrefix, full, addBtn, modalTitle, modalHint, typableHint, perBlock, totalPrefix, confirm, processing, cancel}`; `onboarding.quota.{label, includedPrefix, typableHint, addonHintPrefix}`.

- [ ] **Step 1: Add keys to BOTH languages**

In `dashboard.ts`, locate `tabs.guests` for `id` and `en`; append a `quota` object. Example (id):

```ts
quota: {
  meterPrefix: 'Kuota tamu',          // "Kuota tamu 37 / 200"
  full: 'Kuota tamu penuh — tambah kuota untuk menambah tamu.',
  addBtn: 'Tambah kuota',
  modalTitle: 'Tambah kuota tamu',
  modalHint: 'Tambahan dijual per 50 tamu (Rp 10.000 / 50).',
  typableHint: 'Bisa ketik jumlah langsung — otomatis dibulatkan ke kelipatan 50.',
  perBlock: 'Rp 10.000 / 50 tamu',
  totalPrefix: 'Total',
  confirm: 'Bayar & tambah kuota',
  processing: 'Memproses…',
  cancel: 'Batal',
},
```

en mirror:

```ts
quota: {
  meterPrefix: 'Guest quota',
  full: 'Guest quota is full — add quota to add more guests.',
  addBtn: 'Add quota',
  modalTitle: 'Add guest quota',
  modalHint: 'Sold in blocks of 50 guests (Rp 10,000 / 50).',
  typableHint: 'Type the number directly — it snaps to the nearest 50.',
  perBlock: 'Rp 10,000 / 50 guests',
  totalPrefix: 'Total',
  confirm: 'Pay & add quota',
  processing: 'Processing…',
  cancel: 'Cancel',
},
```

In `onboarding.ts`, add to both `id` and `en`:

```ts
// id
quota: {
  label: 'Jumlah tamu',
  includedPrefix: 'Termasuk',            // "Termasuk 200"
  typableHint: 'Bisa ketik angka — dibulatkan ke kelipatan 50.',
  addonHintPrefix: 'Tambahan',           // "Tambahan 100 tamu · +Rp 20.000"
},
// en
quota: {
  label: 'Number of guests',
  includedPrefix: 'Includes',
  typableHint: 'Type a number — snaps to the nearest 50.',
  addonHintPrefix: 'Extra',
},
```

- [ ] **Step 2: Run the parity test**

Run: `npx vitest run -t "parity"` (or the dict parity test path, e.g. `src/lib/i18n/__tests__/`)
Expected: PASS (id and en have identical key shapes).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts src/lib/i18n/dictionaries/onboarding.ts
git commit -m "feat(quota): i18n keys for quota meter + add-on + onboarding stepper"
```

---

### Task 9: `QuotaStepper` shared component

**Files:**
- Create: `src/components/dashboard/QuotaStepper.tsx`

**Interfaces:**
- Consumes: `snapQuotaToBlock`, `BLOCK_SIZE` (Task 1).
- Produces: `export default function QuotaStepper(props: { value: number; min: number; max: number; onChange: (v: number) => void; typableHint?: string })`.

- [ ] **Step 1: Implement the control (no separate unit test — logic is in Task 1's `snapQuotaToBlock`, already tested; this is a thin view)**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { snapQuotaToBlock, BLOCK_SIZE } from '@/lib/payments/quota'

/** "− [editable number] +" control. Buttons step by 50; free-typed values snap
 *  to the nearest 50 on blur. Always emits a clamped, valid value. */
export default function QuotaStepper({
  value, min, max, onChange, typableHint,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void; typableHint?: string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])

  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/[^\d]/g, ''), 10)
    const snapped = snapQuotaToBlock(Number.isNaN(n) ? min : n, min, max)
    onChange(snapped)
    setText(String(snapped))
  }
  const step = (delta: number) => onChange(snapQuotaToBlock(value + delta, min, max))

  return (
    <div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button type="button" aria-label="Kurangi" onClick={() => step(-BLOCK_SIZE)}
          disabled={value <= min}
          style={btn}>−</button>
        <input
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(text) } }}
          style={numInput}
          aria-label="Jumlah tamu"
        />
        <button type="button" aria-label="Tambah" onClick={() => step(BLOCK_SIZE)}
          disabled={value >= max}
          style={btn}>+</button>
      </div>
      {typableHint && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{typableHint}</p>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
  background: 'var(--surface-warm)', fontSize: 20, lineHeight: 1, cursor: 'pointer',
}
const numInput: React.CSSProperties = {
  width: 88, height: 36, textAlign: 'center', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)', fontSize: 16, fontFamily: 'inherit',
  boxSizing: 'border-box',
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/QuotaStepper.tsx
git commit -m "feat(quota): QuotaStepper component (- editable number +, snap-on-blur)"
```

---

### Task 10: Onboarding form — quota stepper wiring

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx`

**Interfaces:**
- Consumes: `QuotaStepper` (Task 9), `DEFAULT_BASE_QUOTA`, `quotaAddonAmount`, `QUOTA_CAP` (Task 1), `formatIDR` (`@/lib/payments/template-plans`), `OnboardingInput.guestQuotaExtra` (Task 6).

- [ ] **Step 1: Wire the stepper**

Add imports + state:

```ts
import QuotaStepper from '@/components/dashboard/QuotaStepper'
import { DEFAULT_BASE_QUOTA, quotaAddonAmount, QUOTA_CAP, formatIDR } from '@/lib/payments/quota'
// ...
const base = DEFAULT_BASE_QUOTA[plan] ?? 200
const [guestTotal, setGuestTotal] = useState(base)          // effective (base..5000)
useEffect(() => { setGuestTotal(DEFAULT_BASE_QUOTA[plan] ?? 200) }, [plan])
const extra = Math.max(0, guestTotal - base)
```

Render a field block (place it just before the submit button):

```tsx
<div style={field}>
  <span style={lbl}>{dict.quota.label}</span>
  <QuotaStepper value={guestTotal} min={base} max={QUOTA_CAP}
    onChange={setGuestTotal} typableHint={dict.quota.typableHint} />
  <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
    {dict.quota.includedPrefix} {base}
    {extra > 0 && ` · ${dict.quota.addonHintPrefix} ${extra} · +${formatIDR(quotaAddonAmount(extra))}`}
  </span>
</div>
```

Pass `guestQuotaExtra: extra` in the `completeOnboarding({...})` call.

- [ ] **Step 2: Type-check + manual smoke**

Run: `npx tsc --noEmit` → no new errors.
Manual (after `npm run dev`): on `/onboarding`, the stepper shows floor 200 (basic) / 300 (premium via `?plan=premium`), typing 237 snaps to 250 on blur, the "+Rp" line updates.

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx
git commit -m "feat(quota): onboarding buy card guest stepper + live add-on price"
```

---

### Task 11: Dashboard Tamu tab — meter + add-on modal + page wiring

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/page.tsx` (compute + pass `quota`)
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` (thread `quota` to GuestsTab)
- Modify: `src/app/[template]/[slug]/dashboard/GuestsTab.tsx` (meter + Tambah kuota modal)

**Interfaces:**
- Consumes: `getTemplatePlans`, `planBaseQuota`, `effectiveQuota` (server, in page.tsx); `startQuotaAddonCheckout`, `recheckQuotaAddon` (`@/app/onboarding/actions`); `quotaAddonAmount`, `QUOTA_CAP`, `formatIDR` (client, from `@/lib/payments/quota`); `QuotaStepper`.
- Produces: `GuestsTab` prop `quota: { used: number; effective: number; invitationId: string }`.

- [ ] **Step 1: page.tsx — compute effective quota**

After `guests` is built (it has `.length`), add:

```ts
import { getTemplatePlans } from '@/lib/payments/template-plans'
import { planBaseQuota } from '@/lib/payments/plans'
import { effectiveQuota } from '@/lib/payments/quota'
// ...
const plans = await getTemplatePlans(invitation.template_id ?? template)
const quota = {
  used: guests.length,
  effective: effectiveQuota(planBaseQuota(plans, invitation.plan), Number(invitation.guest_quota_extra ?? 0)),
  invitationId: invitation.id,
}
```

Pass `quota={quota}` to `<DashboardClient>`.

- [ ] **Step 2: DashboardClient.tsx — thread the prop**

Add `quota` to the destructured props + its type `{ used: number; effective: number; invitationId: string }`, and pass it into `<GuestsTab ... quota={quota} />`.

- [ ] **Step 3: GuestsTab.tsx — meter + modal**

Add to the header `<p>` a quota line: `{t.quota.meterPrefix} {quota.used} / {quota.effective}`. When `quota.used >= quota.effective`, show `t.quota.full` and disable the add form's submit (the server still blocks). Add a "Tambah kuota" button (`t.quota.addBtn`) that opens a modal containing `QuotaStepper` (min 50, max `QUOTA_CAP - quota.effective`, value defaults 50), a live `t.quota.totalPrefix {formatIDR(quotaAddonAmount(qty))}`, and a confirm button that calls:

```ts
const res = await startQuotaAddonCheckout(quota.invitationId, qty)
if (res.ok && res.invoiceUrl) window.location.href = res.invoiceUrl
else fb.fail(res.error || '...')
```

On mount, if `new URLSearchParams(location.search).get('quota') === '1'`, call `recheckQuotaAddon(quota.invitationId)` then `router.refresh()` (mirrors how the upgrade flow rechecks on return). Surface server "Kuota tamu penuh" errors from `addGuest`/`importGuests` via the existing `fb.fail(...)` path (they already catch and show `fm.guestAddFail`; replace with the thrown error message when present).

- [ ] **Step 4: Type-check + manual smoke**

Run: `npx tsc --noEmit` → no new errors.
Manual: dashboard Tamu tab shows "Kuota tamu N / 200"; at full, add is blocked with the message; "Tambah kuota" opens the stepper and (with a live Xendit sandbox) redirects to the invoice; returning with `?quota=1` rechecks.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/page.tsx" "src/app/[template]/[slug]/dashboard/DashboardClient.tsx" "src/app/[template]/[slug]/dashboard/GuestsTab.tsx"
git commit -m "feat(quota): Tamu tab quota meter + Tambah kuota add-on modal"
```

---

### Task 12: Full suite + apply migration (operator step)

**Files:** none (verification + ops)

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: all green (new + existing). Fix any regression before proceeding.

- [ ] **Step 2: Type-check + token guard**

Run: `npx tsc --noEmit` and `npm run check:tokens`
Expected: both pass.

- [ ] **Step 3: Apply the migration to Supabase (operator / MCP)**

Apply `supabase/migrations/2026-06-30_guest_quota.sql` to the live project (Supabase SQL Editor, `supabase db push`, or the Supabase MCP `apply_migration`). Confirm: `template_plans.base_guest_quota` populated (200/300), `invitations.guest_quota_extra` exists (default 0), `quota_addons` table + RLS present, `increment_guest_quota_extra` function callable. **This must be done before the feature works against the live DB.**

- [ ] **Step 4: Live smoke (sandbox)**

With Xendit sandbox: buy an invitation with +100 quota at onboarding (pay 169k-equivalent), confirm `guest_quota_extra=100`; buy a +50 add-on from the Tamu tab, confirm the meter rises by 50 after the webhook. Confirm add/import is blocked at the cap.

---

## Out of scope (recorded in the spec)

- Editing `guest_quota_extra` on an unpaid draft before payment.
- Quota reduction / refunds; premium→basic downgrade.
- Walk-in Buku Tamu check-ins consuming quota (they do not).
- New Vercel env vars or Xendit dashboard config (none needed — same invoice API + webhook endpoint).
