# Midtrans Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Xendit with Midtrans (Snap redirect) across every money flow — checkout ×4, webhook, rechecks, refunds, reconcile, ledger — with gateway-neutral naming.

**Architecture:** One server-only wrapper (`src/lib/payments/gateway.ts`) replaces `xendit.ts`; a single notification webhook route replaces the Xendit one; DB columns are renamed `xendit_*` → `gateway_*`; refunds become channel-aware (`paid_channel` captured at PAID time decides API-refund vs manual-transfer route).

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres), raw `fetch` against Midtrans Snap + Core API v2 (NO midtrans-client npm package — keep the hand-rolled fetch style of `xendit.ts`), vitest.

**Spec:** `docs/superpowers/specs/2026-07-14-midtrans-migration-design.md`

## Global Constraints

- **No new npm dependencies.** Use Node built-ins (`crypto`) + `fetch`.
- **Server-only secrets:** `MIDTRANS_SERVER_KEY` may be referenced ONLY in `src/lib/payments/gateway.ts` — never in a `'use client'` file. (Same discipline as `SUPABASE_SERVICE_ROLE_KEY`.)
- **Env:** `MIDTRANS_SERVER_KEY` (secret), `MIDTRANS_IS_PRODUCTION` (`'true'`/anything else). `XENDIT_SECRET_KEY` + `XENDIT_CALLBACK_TOKEN` are removed at Task 7.
- **Base URLs:** Snap `https://app.sandbox.midtrans.com` / `https://app.midtrans.com`; Core `https://api.sandbox.midtrans.com` / `https://api.midtrans.com` — switch on `MIDTRANS_IS_PRODUCTION === 'true'`.
- **order_id:** max 50 chars, charset `[A-Za-z0-9._~-]`. Format: `<prefix>_<uuid>_<epochMs base36>` (49 chars). Prefixes stay `inv_` / `ren_` / `upg_` / `qta_`.
- **Paid means:** `transaction_status === 'settlement'`, OR `'capture'` with `fraud_status` absent-or-`'accept'`.
- **`gross_amount` is a decimal STRING** (`"149000.00"`) — always normalize via `parseGrossAmount` before comparing.
- **API-refundable channels (exact list):** `credit_card, gopay, shopeepay, dana, ovo, qris, kredivo, akulaku`. Everything else (notably `bank_transfer`, `echannel`, `cstore`) is manual-only.
- **User-facing copy:** Bahasa Indonesia casual (match existing strings). Code comments: English.
- **Keep `xendit.ts` and its tests alive until Task 6** (they're deleted only after every importer is swapped) so `npm run test` + `npm run typecheck` stay green after every task.
- **paid_source value:** `'midtrans'` replaces `'xendit'` (alongside `'manual'`, `'comp'`).

---

### Task 1: Gateway wrapper — `gateway.ts` + client-safe `refund-channels.ts`

**Files:**
- Create: `src/lib/payments/refund-channels.ts`
- Create: `src/lib/payments/gateway.ts`
- Test: `src/lib/payments/__tests__/gateway.test.ts`

**Interfaces:**
- Consumes: `timingSafeStrEqual(a: string, b: string): boolean` from `@/lib/security/timing`.
- Produces (later tasks import EXACTLY these):
  - `mintOrderId(prefix: 'inv'|'ren'|'upg'|'qta', invitationId: string, nowMs?: number): string`
  - `invitationIdFromOrderId(orderId: string | undefined | null): string | null`
  - `renewalIdFromOrderId(orderId: string | undefined | null): string | null`
  - `parseGrossAmount(x: unknown): number`
  - `isPaidStatus(status: string, fraudStatus?: string | null): boolean`
  - `verifySignature(b: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }): boolean`
  - `createSnapTransaction(a: SnapTransactionArgs): Promise<{ token: string; redirectUrl: string }>`
  - `getTransactionStatus(orderId: string): Promise<GatewayTxnSnapshot>`
  - `expireTransaction(orderId: string): Promise<void>`
  - `createGatewayRefund(orderId: string, amountIDR: number, refundKey: string, reason?: string): Promise<GatewayRefundResult>`
  - `canApiRefund(paymentType: string | null | undefined): boolean` (re-export from refund-channels)
  - Types: `SnapTransactionArgs`, `GatewayTxnSnapshot`, `GatewayRefundResult`

- [ ] **Step 1: Write the failing test**

`src/lib/payments/__tests__/gateway.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import {
  mintOrderId, invitationIdFromOrderId, renewalIdFromOrderId,
  parseGrossAmount, isPaidStatus, verifySignature,
} from '../gateway'
import { canApiRefund } from '../refund-channels'

const UUID = '123e4567-e89b-12d3-a456-426614174000' // 36 chars

describe('mintOrderId', () => {
  it('stays within Midtrans 50-char limit for every prefix', () => {
    for (const p of ['inv', 'ren', 'upg', 'qta'] as const) {
      const id = mintOrderId(p, UUID, 1752480000000)
      expect(id.length).toBeLessThanOrEqual(50)
      expect(id.startsWith(`${p}_${UUID}_`)).toBe(true)
      expect(id).toMatch(/^[A-Za-z0-9._~-]+$/) // allowed charset only
    }
  })
})

describe('order-id parsers', () => {
  it('extracts the invitation id from an inv_ order id', () => {
    expect(invitationIdFromOrderId(mintOrderId('inv', UUID))).toBe(UUID)
  })
  it('extracts the invitation id from a ren_ order id', () => {
    expect(renewalIdFromOrderId(mintOrderId('ren', UUID))).toBe(UUID)
  })
  it('returns null for other prefixes / malformed input', () => {
    expect(invitationIdFromOrderId(mintOrderId('upg', UUID))).toBeNull()
    expect(invitationIdFromOrderId('inv_x')).toBeNull()
    expect(invitationIdFromOrderId(null)).toBeNull()
    expect(renewalIdFromOrderId(mintOrderId('inv', UUID))).toBeNull()
  })
})

describe('parseGrossAmount', () => {
  it('normalizes Midtrans decimal strings to integer IDR', () => {
    expect(parseGrossAmount('149000.00')).toBe(149000)
    expect(parseGrossAmount(149000)).toBe(149000)
  })
  it('returns NaN for junk', () => {
    expect(Number.isNaN(parseGrossAmount('abc'))).toBe(true)
    expect(Number.isNaN(parseGrossAmount(undefined))).toBe(true)
  })
})

describe('isPaidStatus', () => {
  it('settlement is paid', () => expect(isPaidStatus('settlement')).toBe(true))
  it('capture+accept is paid', () => expect(isPaidStatus('capture', 'accept')).toBe(true))
  it('capture without fraud_status is paid', () => expect(isPaidStatus('capture', null)).toBe(true))
  it('capture+challenge is NOT paid', () => expect(isPaidStatus('capture', 'challenge')).toBe(false))
  it('pending/deny/expire/cancel are NOT paid', () => {
    for (const s of ['pending', 'deny', 'expire', 'cancel', 'refund']) expect(isPaidStatus(s)).toBe(false)
  })
})

describe('verifySignature', () => {
  beforeEach(() => { process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-TEST' })
  const sig = (orderId: string, code: string, gross: string) =>
    createHash('sha512').update(`${orderId}${code}${gross}SB-Mid-server-TEST`).digest('hex')

  it('accepts a genuine notification', () => {
    expect(verifySignature({
      order_id: 'inv_abc_123', status_code: '200', gross_amount: '149000.00',
      signature_key: sig('inv_abc_123', '200', '149000.00'),
    })).toBe(true)
  })
  it('rejects a tampered amount', () => {
    expect(verifySignature({
      order_id: 'inv_abc_123', status_code: '200', gross_amount: '1.00',
      signature_key: sig('inv_abc_123', '200', '149000.00'),
    })).toBe(false)
  })
  it('rejects missing fields', () => {
    expect(verifySignature({})).toBe(false)
    expect(verifySignature({ order_id: 'x', status_code: '200', gross_amount: '1.00' })).toBe(false)
  })
})

describe('canApiRefund', () => {
  it('accepts every documented API-refundable channel', () => {
    for (const c of ['credit_card', 'gopay', 'shopeepay', 'dana', 'ovo', 'qris', 'kredivo', 'akulaku'])
      expect(canApiRefund(c)).toBe(true)
  })
  it('rejects VA/bank transfer, unknown, and missing channels', () => {
    expect(canApiRefund('bank_transfer')).toBe(false)
    expect(canApiRefund('echannel')).toBe(false)
    expect(canApiRefund(null)).toBe(false)
    expect(canApiRefund(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payments/__tests__/gateway.test.ts`
Expected: FAIL — `Cannot find module '../gateway'`

- [ ] **Step 3: Write the implementation**

`src/lib/payments/refund-channels.ts` (client-safe — no secrets, importable from `'use client'` files):

```ts
/**
 * Which Midtrans payment channels support the direct Refund API.
 * Everything else (notably bank_transfer/VA, echannel, cstore) can only be
 * refunded by a manual bank transfer recorded in the admin console.
 * Client-safe: no secrets — the dashboard RefundRequestButton imports this.
 * Source: docs.midtrans.com "Refund transaction is supported only for …".
 */
export const API_REFUNDABLE_CHANNELS = [
  'credit_card', 'gopay', 'shopeepay', 'dana', 'ovo', 'qris', 'kredivo', 'akulaku',
] as const

export function canApiRefund(paymentType: string | null | undefined): boolean {
  return !!paymentType && (API_REFUNDABLE_CHANNELS as readonly string[]).includes(paymentType)
}
```

`src/lib/payments/gateway.ts`:

```ts
/**
 * Midtrans gateway wrapper (Snap redirect + Core API v2) + webhook signature
 * verification. SERVER ONLY — never import from a 'use client' file (uses the
 * server key). Client-safe channel helpers live in ./refund-channels.ts.
 *
 * Replaces the former Xendit wrapper. Key differences from Xendit:
 *  - everything is keyed by OUR order_id (not the gateway's invoice id);
 *  - webhook auth = sha512 signature_key (no callback-token header);
 *  - gross_amount arrives as a decimal string ("149000.00").
 */
import { createHash } from 'crypto'
import { timingSafeStrEqual } from '@/lib/security/timing'

export { canApiRefund, API_REFUNDABLE_CHANNELS } from './refund-channels'

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key) throw new Error('MIDTRANS_SERVER_KEY is not set')
  return key
}
const authHeader = () => `Basic ${Buffer.from(`${serverKey()}:`).toString('base64')}`
const isProd = () => process.env.MIDTRANS_IS_PRODUCTION === 'true'
const snapBase = () => (isProd() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com')
const coreBase = () => (isProd() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com')

/**
 * Mint an order id: `<prefix>_<uuid>_<epochMs base36>` = 49 chars, inside
 * Midtrans's 50-char limit and its [A-Za-z0-9._~-] charset. The timestamp is
 * only a uniqueness salt (never parsed back), so base36 is free. The UUID
 * contains hyphens but never underscores, so splitting on `_` is unambiguous.
 */
export function mintOrderId(
  prefix: 'inv' | 'ren' | 'upg' | 'qta',
  invitationId: string,
  nowMs: number = Date.now(),
): string {
  return `${prefix}_${invitationId}_${nowMs.toString(36)}`
}

/** Invitation id embedded in an `inv_` order id; null for any other shape. */
export function invitationIdFromOrderId(orderId: string | undefined | null): string | null {
  if (!orderId || !orderId.startsWith('inv_')) return null
  const parts = orderId.split('_') // ['inv', '<uuid>', '<salt>']
  if (parts.length < 3) return null
  return parts[1] && parts[1].length > 0 ? parts[1] : null
}

/** Invitation id embedded in a `ren_` (renewal) order id; null otherwise. */
export function renewalIdFromOrderId(orderId: string | undefined | null): string | null {
  if (!orderId || !orderId.startsWith('ren_')) return null
  const parts = orderId.split('_')
  if (parts.length < 3) return null
  return parts[1] && parts[1].length > 0 ? parts[1] : null
}

/** Midtrans reports money as decimal strings ("149000.00") — normalize to int IDR. */
export function parseGrossAmount(x: unknown): number {
  const n = Number(x)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

/**
 * Whether a Midtrans transaction_status counts as successfully paid.
 * `settlement` = money received. `capture` (cards) = paid, but only when
 * fraud_status is absent or 'accept' — 'challenge' must NOT publish.
 */
export function isPaidStatus(status: string, fraudStatus?: string | null): boolean {
  if (status === 'settlement') return true
  return status === 'capture' && (fraudStatus == null || fraudStatus === 'accept')
}

/**
 * Verify a webhook notification's signature_key:
 * sha512(order_id + status_code + gross_amount + SERVER_KEY).
 * This is the ONLY authentication Midtrans notifications carry.
 */
export function verifySignature(b: {
  order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string
}): boolean {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key || !b.order_id || !b.status_code || !b.gross_amount || !b.signature_key) return false
  const expected = createHash('sha512')
    .update(`${b.order_id}${b.status_code}${b.gross_amount}${key}`)
    .digest('hex')
  return timingSafeStrEqual(expected, b.signature_key)
}

export interface SnapTransactionArgs {
  orderId: string
  amountIDR: number
  payerEmail?: string
  /** Shown on the Snap page + Midtrans dashboard (≤50 chars enforced here). */
  itemName: string
  /** Where Snap redirects after a FINISHED payment (success path). */
  finishUrl: string
}

/**
 * Create a Snap transaction and return the hosted-payment redirect URL —
 * the drop-in replacement for the old hosted Xendit invoice URL.
 */
export async function createSnapTransaction(
  a: SnapTransactionArgs,
): Promise<{ token: string; redirectUrl: string }> {
  const res = await fetch(`${snapBase()}/snap/v1/transactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: authHeader() },
    body: JSON.stringify({
      transaction_details: { order_id: a.orderId, gross_amount: a.amountIDR },
      item_details: [{ id: a.orderId.slice(0, 8), price: a.amountIDR, quantity: 1, name: a.itemName.slice(0, 50) }],
      ...(a.payerEmail ? { customer_details: { email: a.payerEmail } } : {}),
      callbacks: { finish: a.finishUrl },
    }),
  })
  if (!res.ok) throw new Error(`Midtrans snap failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as { token: string; redirect_url: string }
  return { token: j.token, redirectUrl: j.redirect_url }
}

export interface GatewayTxnSnapshot {
  orderId: string
  /** Midtrans's own transaction id — stored for audit as gateway_txn_id. */
  transactionId: string | null
  status: string // settlement | capture | pending | deny | cancel | expire | refund | partial_refund | …
  fraudStatus: string | null
  grossAmountIDR: number
  /** Payment channel (bank_transfer | qris | gopay | credit_card | …) — drives refund routing. */
  paymentType: string | null
}

/**
 * Fetch a transaction from Midtrans by OUR order_id. The authoritative source
 * of truth when verifying a webhook, and for the "saya sudah bayar — cek
 * ulang" manual fallback.
 */
export async function getTransactionStatus(orderId: string): Promise<GatewayTxnSnapshot> {
  if (!orderId) throw new Error('getTransactionStatus: empty orderId')
  const res = await fetch(`${coreBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { accept: 'application/json', authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`Midtrans get status failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as Record<string, unknown>
  // Midtrans can return HTTP 200 with an error status_code in the body (e.g. 404).
  if (j.status_code && Number(j.status_code) >= 400) {
    throw new Error(`Midtrans status ${j.status_code}: ${String(j.status_message ?? '')}`)
  }
  return {
    orderId: String(j.order_id ?? orderId),
    transactionId: j.transaction_id != null ? String(j.transaction_id) : null,
    status: String(j.transaction_status ?? ''),
    fraudStatus: j.fraud_status != null ? String(j.fraud_status) : null,
    grossAmountIDR: parseGrossAmount(j.gross_amount),
    paymentType: j.payment_type != null ? String(j.payment_type) : null,
  }
}

/**
 * Best-effort expire an outstanding (pending) transaction. Called before
 * creating a replacement order for the same invitation so an abandoned-but-
 * still-payable order can't be paid later. Swallows errors — a failed expire
 * must never block a fresh checkout; an already-paid/expired order 4xx is fine.
 */
export async function expireTransaction(orderId: string): Promise<void> {
  if (!orderId) return
  try {
    if (!process.env.MIDTRANS_SERVER_KEY) return
    await fetch(`${coreBase()}/v2/${encodeURIComponent(orderId)}/expire`, {
      method: 'POST',
      headers: { accept: 'application/json', authorization: authHeader() },
    })
  } catch (e) {
    console.error('[midtrans expire] failed (ignored):', e)
  }
}

export interface GatewayRefundResult {
  /** Midtrans refund_chargeback_id when returned; stored as gateway_refund_id. */
  refundId: string | null
  status: string
}

/**
 * Refund a paid transaction via the Midtrans Direct Refund API. Only the
 * channels in API_REFUNDABLE_CHANNELS support this — bank_transfer/VA money
 * must go through the manual-transfer route in the admin console.
 * `refundKey` is OUR idempotency key: retrying with the same key within 7 days
 * can never double-refund. Money returns to the original payment method only.
 */
export async function createGatewayRefund(
  orderId: string,
  amountIDR: number,
  refundKey: string,
  reason = 'Permintaan refund pelanggan',
): Promise<GatewayRefundResult> {
  if (!orderId) throw new Error('createGatewayRefund: empty orderId')
  const res = await fetch(`${coreBase()}/v2/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: authHeader() },
    body: JSON.stringify({ refund_key: refundKey, amount: amountIDR, reason: reason.slice(0, 255) }),
  })
  if (!res.ok) throw new Error(`Midtrans refund failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as Record<string, unknown>
  if (j.status_code && Number(j.status_code) >= 400) {
    throw new Error(`Midtrans refund ${j.status_code}: ${String(j.status_message ?? '')}`)
  }
  return {
    refundId: j.refund_chargeback_id != null ? String(j.refund_chargeback_id) : null,
    status: String(j.transaction_status ?? 'refund'),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/payments/__tests__/gateway.test.ts`
Expected: PASS (all describe blocks)

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` → expected clean.

```bash
git add src/lib/payments/gateway.ts src/lib/payments/refund-channels.ts src/lib/payments/__tests__/gateway.test.ts
git commit -m "feat(payments): Midtrans gateway wrapper (Snap redirect + Core v2) with signature verify"
```

---

### Task 2: DB migration — gateway-neutral columns

**Files:**
- Create: `supabase/migrations/2026-07-14_midtrans_gateway.sql`

**Interfaces:**
- Produces columns later tasks read/write: `invitations.gateway_order_id`, `invitations.gateway_txn_id`, `invitations.paid_channel`, same trio on `plan_upgrades` + `quota_addons`, `refunds.gateway_refund_id`, `refunds.refund_key`, `refunds.method ∈ ('gateway','manual','chargeback')`, `paid_source='midtrans'`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/2026-07-14_midtrans_gateway.sql`:

```sql
-- supabase/migrations/2026-07-14_midtrans_gateway.sql
-- Xendit → Midtrans migration: gateway-neutral column names + channel capture.
-- No live-money rows exist (Xendit was test-only), so renames are safe.
-- Idempotent: rename guarded by column-existence checks; safe to re-run.

do $$ begin
  -- invitations: xendit_external_id was OUR external id → becomes gateway_order_id
  -- (Midtrans keys status/refund/expire by OUR order_id, so this is the query key).
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='invitations' and column_name='xendit_external_id') then
    alter table public.invitations rename column xendit_external_id to gateway_order_id;
  end if;
  -- xendit_invoice_id was the GATEWAY's id → becomes gateway_txn_id (audit only).
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='invitations' and column_name='xendit_invoice_id') then
    alter table public.invitations rename column xendit_invoice_id to gateway_txn_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='plan_upgrades' and column_name='xendit_external_id') then
    alter table public.plan_upgrades rename column xendit_external_id to gateway_order_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='plan_upgrades' and column_name='xendit_invoice_id') then
    alter table public.plan_upgrades rename column xendit_invoice_id to gateway_txn_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='quota_addons' and column_name='xendit_external_id') then
    alter table public.quota_addons rename column xendit_external_id to gateway_order_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='quota_addons' and column_name='xendit_invoice_id') then
    alter table public.quota_addons rename column xendit_invoice_id to gateway_txn_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='refunds' and column_name='xendit_refund_id') then
    alter table public.refunds rename column xendit_refund_id to gateway_refund_id;
  end if;
end $$;

-- Payment channel captured from the PAID notification (payment_type) — drives
-- channel-aware refund routing (API refund vs manual transfer).
alter table public.invitations   add column if not exists paid_channel text;
alter table public.plan_upgrades add column if not exists paid_channel text;
alter table public.quota_addons  add column if not exists paid_channel text;

-- Merchant-minted idempotency key for the Midtrans Direct Refund API — a retry
-- with the same key (≤7 days) can never double-refund.
alter table public.refunds add column if not exists refund_key text;

-- Provenance values: 'xendit' → 'midtrans' / method 'xendit' → 'gateway'.
-- ORDER MATTERS: rewrite legacy rows BEFORE re-adding the stricter constraint,
-- otherwise the new check fails on existing 'xendit' rows.
update public.invitations set paid_source = 'midtrans' where paid_source = 'xendit';
alter table public.refunds drop constraint if exists refunds_method_check;
update public.refunds set method = 'gateway' where method = 'xendit';
alter table public.refunds add constraint refunds_method_check
  check (method in ('gateway','manual','chargeback'));

-- Keep the lookup index aligned with the renamed column (old index name kept
-- by the rename; recreate under a neutral name for clarity on fresh DBs).
create index if not exists idx_invitations_gateway_order on public.invitations (gateway_order_id);
```

- [ ] **Step 2: Apply + verify**

Apply the migration to the dev Supabase project (SQL editor or `psql`), then verify:

```sql
select column_name from information_schema.columns
 where table_name='invitations' and column_name like 'gateway%';
-- expect: gateway_order_id, gateway_txn_id
select column_name from information_schema.columns
 where table_name='refunds' and column_name in ('gateway_refund_id','refund_key');
-- expect: both rows
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-07-14_midtrans_gateway.sql
git commit -m "feat(db): rename xendit_* columns to gateway_*, add paid_channel + refund_key"
```

> ⚠️ From this commit until Task 6 lands, the DB has the NEW column names while
> some not-yet-swapped code still queries old ones. That's fine for tests
> (mocked), but don't manually exercise checkout flows against the dev DB
> until Task 3–4 are in.

---

### Task 3: Checkout + recheck server actions (4 flows) + `publish.ts` channel capture

**Files:**
- Modify: `src/lib/payments/publish.ts:97-116` (publishPaidInvitation opts)
- Modify: `src/app/onboarding/actions.ts` (all 8 payment functions + `requestRefund` select)
- Test: `src/app/onboarding/__tests__/actions.test.ts` (re-point mocks)

**Interfaces:**
- Consumes from Task 1: `createSnapTransaction`, `getTransactionStatus`, `isPaidStatus`, `expireTransaction`, `mintOrderId`.
- Produces: `publishPaidInvitation(admin, inv, nowMs, opts)` gains `opts.paidChannel?: string | null` and `opts.gatewayTxnId?: string | null`; DB writes use `gateway_order_id` / `gateway_txn_id`.

- [ ] **Step 1: Extend `publishPaidInvitation` opts**

In `src/lib/payments/publish.ts`, change the signature + patch block:

```ts
export async function publishPaidInvitation(
  admin: any,
  inv: PublishableInvitation,
  nowMs: number = Date.now(),
  opts: {
    paidAmountIDR?: number | null; feeIDR?: number | null; paidSource?: string
    paidChannel?: string | null; gatewayTxnId?: string | null
  } = {},
): Promise<void> {
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  const patch: Record<string, unknown> = {
    is_paid: true,
    is_published: true,
    paid_at: new Date(nowMs).toISOString(),
    expires_at: resolved ? resolved.expiresAt(nowMs) : null,
  }
  if (opts.paidAmountIDR != null) patch.paid_amount_idr = opts.paidAmountIDR
  if (opts.feeIDR != null) patch.fee_idr = opts.feeIDR
  if (opts.paidSource) patch.paid_source = opts.paidSource
  // Channel + gateway txn id captured at paid time — refund routing (canApiRefund)
  // depends on paid_channel being recorded here.
  if (opts.paidChannel != null) patch.paid_channel = opts.paidChannel
  if (opts.gatewayTxnId != null) patch.gateway_txn_id = opts.gatewayTxnId
  await (admin.from('invitations') as any).update(patch).eq('id', inv.id)
}
```

Also update the stale comment above it: `Shared by the Xendit webhook` → `Shared by the payment webhook`.

- [ ] **Step 2: Swap the import in `onboarding/actions.ts`**

Replace line 14:

```ts
import { createSnapTransaction, getTransactionStatus, isPaidStatus, expireTransaction, mintOrderId } from '@/lib/payments/gateway'
```

- [ ] **Step 3: Swap `startCheckout` (initial purchase)**

Within `startCheckout`, apply exactly these changes:
- select: `xendit_invoice_id` → `gateway_order_id` (and the row type field rename)
- expire: `if (inv.gateway_order_id) await expireTransaction(inv.gateway_order_id)`
- mint + create:

```ts
    const base = siteBaseUrl()
    const orderId = mintOrderId('inv', inv.id)
    const dash = `${base}/${inv.template_id}/${inv.slug}/dashboard`

    const { redirectUrl } = await createSnapTransaction({
      orderId,
      amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      itemName: `Undangan ${inv.slug} — plan ${inv.plan}`,
      finishUrl: `${dash}?paid=1`,
    })

    // Lock the amount we're charging so the webhook verifies against IT (not a
    // recomputed price) — a price/promo change mid-checkout can't break payment.
    // gateway_txn_id is filled later by the webhook (Midtrans mints it at pay time).
    await (admin.from('invitations') as any)
      .update({ gateway_order_id: orderId, gateway_txn_id: null, expected_amount_idr: amountIDR })
      .eq('id', inv.id)

    return { ok: true, invoiceUrl: redirectUrl }
```

(Keep the `CheckoutResult.invoiceUrl` field name — every button already reads it; renaming it buys nothing.)

- [ ] **Step 4: Swap `recheckPayment`**

- select: `xendit_invoice_id` → `gateway_order_id`
- guard: `if (!inv.gateway_order_id) return { ok: false, error: 'Belum ada transaksi pembayaran untuk undangan ini' }`
- verify block:

```ts
    const expected = inv.expected_amount_idr ?? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))
    const snap = await getTransactionStatus(inv.gateway_order_id)
    if (!isPaidStatus(snap.status, snap.fraudStatus) || snap.grossAmountIDR !== expected) {
      return { ok: true, published: false, status: snap.status }
    }

    await publishPaidInvitation(admin, inv, Date.now(), {
      paidAmountIDR: expected, paidSource: 'midtrans', feeIDR: null,
      paidChannel: snap.paymentType, gatewayTxnId: snap.transactionId,
    })
```

(`snap.feeIDR` no longer exists — Midtrans doesn't return fees on status; pass `feeIDR: null`.)

- [ ] **Step 5: Swap `startRenewal` + `recheckRenewal`**

`startRenewal`: same mechanical changes as `startCheckout` but prefix `'ren'`, select/update `gateway_order_id`, `itemName: `Perpanjang undangan ${inv.slug} — plan ${inv.plan}``, `finishUrl: `${dash}?renewed=1``.

`recheckRenewal`:
- select: `xendit_invoice_id, xendit_external_id` → `gateway_order_id` only (the order id IS the external id now — one column does both jobs)
- guard: `if (!inv.gateway_order_id?.startsWith('ren_')) return { ok: false, error: 'Belum ada transaksi perpanjangan untuk undangan ini' }`
- verify: `const snap = await getTransactionStatus(inv.gateway_order_id)` then `if (!isPaidStatus(snap.status, snap.fraudStatus) || snap.grossAmountIDR !== resolved.amountIDR)`

- [ ] **Step 6: Swap `startUpgradeCheckout` + `recheckUpgrade`, `startQuotaAddonCheckout` + `recheckQuotaAddon`**

Same pattern. Insert rows now write the neutral columns:

```ts
    await (admin.from('plan_upgrades') as any).insert({
      invitation_id: inv.id,
      from_plan: inv.plan,
      to_plan: UPGRADE_TARGET_PLAN,
      amount_idr: resolved.amountIDR,
      gateway_txn_id: null,
      gateway_order_id: orderId,
      status: 'pending',
    })
```

(quota_addons mirror: `qty_guests`, `amount_idr`, `gateway_txn_id: null`, `gateway_order_id: orderId`.)
Rechecks select `gateway_order_id` instead of `xendit_invoice_id`, verify via `getTransactionStatus(row.gateway_order_id)` with `isPaidStatus(snap.status, snap.fraudStatus)` + `snap.grossAmountIDR !== Number(row.amount_idr)`.

- [ ] **Step 7: `requestRefund` — channel-aware destination requirement**

In `requestRefund`, change the invitation select to include the channel:

```ts
    const { data: inv } = (await admin.from('invitations')
      .select('id, owner_user_id, is_paid, paid_source, paid_channel, paid_at, is_published, updated_at, used_at, published_at')
      .eq('id', invitationId).maybeSingle()) as { data: any | null }
```

and after the comp guard, add the destination requirement (import `canApiRefund` from `@/lib/payments/refund-channels`):

```ts
    // A destination account is REQUIRED whenever the money can't go back
    // automatically: manual/offline payments, and Midtrans channels without
    // API refund (bank transfer / VA). Collecting it now avoids a second
    // round-trip with the customer at decision time.
    const needsDestination = inv.paid_source === 'manual' ||
      (inv.paid_source === 'midtrans' && !canApiRefund(inv.paid_channel))
    const d = input.destination
    if (needsDestination && !(d?.bank?.trim() && d?.account_no?.trim() && d?.holder?.trim())) {
      return { ok: false, error: 'Isi bank, nomor rekening, dan nama pemilik untuk tujuan pengembalian dana.' }
    }
```

(The existing `encryptField` destination-into-`usage_snapshot` block stays exactly as is — it already encrypts at rest. **Spec deviation note:** spec §3's `refund_requests.destination_enc` column is unnecessary — the encrypted-destination mechanism already exists inside `usage_snapshot`; reuse it.)

- [ ] **Step 8: Update the mocks/tests in `src/app/onboarding/__tests__/actions.test.ts`**

Replace the `vi.mock('@/lib/payments/xendit', …)` block with:

```ts
vi.mock('@/lib/payments/gateway', () => ({
  createSnapTransaction: vi.fn(),
  getTransactionStatus: vi.fn(),
  isPaidStatus: vi.fn(),
  expireTransaction: vi.fn(),
  mintOrderId: (p: string, id: string, now = Date.now()) => `${p}_${id}_${now.toString(36)}`,
  canApiRefund: (c: string | null | undefined) => !!c && ['credit_card','gopay','shopeepay','dana','ovo','qris','kredivo','akulaku'].includes(c),
}))
```

then re-point the named imports (`createSnapTransaction` etc.), and update mocked return shapes: `mockCreateInvoice.mockResolvedValue({ token: 't', redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/xyz' })` and status snapshots `{ orderId, transactionId: 'mid-1', status: 'settlement', fraudStatus: null, grossAmountIDR: 149000, paymentType: 'qris' }`. Where tests asserted DB writes of `xendit_external_id`/`xendit_invoice_id`, assert `gateway_order_id` (and `gateway_txn_id: null`).

- [ ] **Step 9: Run tests + typecheck**

Run: `npx vitest run src/app/onboarding && npm run typecheck`
Expected: PASS / clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/payments/publish.ts src/app/onboarding/actions.ts src/app/onboarding/__tests__/actions.test.ts
git commit -m "feat(payments): checkout+recheck flows on Midtrans Snap; channel-aware refund request"
```

---

### Task 4: Webhook route

**Files:**
- Create: `src/app/api/payment/midtrans/webhook/route.ts`
- Delete: `src/app/api/payment/xendit/webhook/route.ts` + `src/app/api/payment/xendit/webhook/__tests__/route.test.ts`
- Test: `src/app/api/payment/midtrans/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 1 wrapper; `publishPaidInvitation` (+ new opts), `applyPaidUpgrade`, `extendActivePeriod`, `applyPaidQuotaAddon` from `@/lib/payments/publish`; `settleRefund`, `sourceHasOpenRefund` from `@/lib/payments/refunds`; `logAdminAction`.
- Produces: `POST /api/payment/midtrans/webhook` — the URL registered in the Midtrans dashboard (Task 8 tutorial).

- [ ] **Step 1: Port the old route test file to the new envelope**

Copy the old Xendit route test as the starting point, then rewrite. The new test file must cover AT MINIMUM these cases (signature helper included):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'

// mock the DB + publish/refund helpers exactly like the old xendit route test did,
// re-pointed at '@/lib/payments/gateway' for getTransactionStatus.

const KEY = 'SB-Mid-server-TEST'
function withSig(b: Record<string, unknown>) {
  return {
    ...b,
    signature_key: createHash('sha512')
      .update(`${b.order_id}${b.status_code}${b.gross_amount}${KEY}`)
      .digest('hex'),
  }
}
const post = (body: unknown) =>
  POST(new Request('http://x/api/payment/midtrans/webhook', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => { process.env.MIDTRANS_SERVER_KEY = KEY })

it('401s a notification with a bad signature', async () => {
  const res = await post({ order_id: 'inv_a_1', status_code: '200', gross_amount: '149000.00', signature_key: 'forged' })
  expect(res.status).toBe(401)
})

it('publishes an initial purchase on settlement with matching amount', async () => { /* settlement envelope, verify publishPaidInvitation called with paidSource 'midtrans' + paidChannel */ })
it('does NOT publish on capture+challenge', async () => { /* fraud_status: 'challenge' → publish not called, 200 ack */ })
it('does NOT publish when re-fetched amount mismatches', async () => { /* getTransactionStatus returns wrong gross → no publish */ })
it('extends the active period for a ren_ settlement', async () => { /* extendActivePeriod called */ })
it('applies a paid upgrade for an upg_ settlement', async () => { /* plan_upgrades row looked up by gateway_order_id */ })
it('applies a quota addon for a qta_ settlement', async () => { /* quota_addons path */ })
it('settles the pending refund row on a refund notification', async () => { /* transaction_status 'refund' → settleRefund */ })
it('records + settles a chargeback exactly once', async () => { /* 'chargeback' → refunds insert method 'chargeback' unless sourceHasOpenRefund */ })
it('acks pending/expire without side effects', async () => { /* status 'pending' → 200, nothing called */ })
```

(Flesh each `it` out with the same mock-Supabase chain style used by the old
`src/app/api/payment/xendit/webhook/__tests__/route.test.ts` — copy its `admin`
mock builder verbatim, only the column names change to `gateway_order_id`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/payment/midtrans`
Expected: FAIL — route module doesn't exist yet.

- [ ] **Step 3: Write the route**

`src/app/api/payment/midtrans/webhook/route.ts` — full structure (bodies of the four paid handlers are ports of the Xendit versions with the renames applied; the file is self-contained below at the level every handler needs):

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  verifySignature, getTransactionStatus, isPaidStatus, parseGrossAmount,
  invitationIdFromOrderId, renewalIdFromOrderId,
} from '@/lib/payments/gateway'
import { resolvePlan } from '@/lib/payments/plans'
import { initialPurchaseAmount } from '@/lib/payments/quota'
import { publishPaidInvitation, applyPaidUpgrade, extendActivePeriod, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { settleRefund, sourceHasOpenRefund, type RefundSourceType } from '@/lib/payments/refunds'
import { logAdminAction } from '@/lib/admin/log'

/**
 * Midtrans payment-notification webhook (ALL lifecycle events arrive here:
 * payments, refunds, chargebacks). Authenticated by the sha512 signature_key.
 * On a paid event it re-fetches the transaction from Midtrans and confirms the
 * amount equals the locked/expected price, then applies the matching flow by
 * order_id prefix (inv_ publish · ren_ extend · upg_ upgrade · qta_ quota).
 * Idempotent — already-applied rows are left untouched. Always ACKs 200 for
 * authenticated-but-unappliable events so Midtrans doesn't retry forever; the
 * owner can self-serve via the "cek ulang" actions.
 */
interface MidtransNotification {
  order_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
  transaction_status?: string
  fraud_status?: string
  transaction_id?: string
  payment_type?: string
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as MidtransNotification
  if (!verifySignature(body)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const orderId = body.order_id ?? ''
  const status = body.transaction_status ?? ''

  if (status === 'refund' || status === 'partial_refund') return handleRefundEvent(admin, orderId)
  if (status === 'chargeback') return handleChargeback(admin, orderId)
  if (!isPaidStatus(status, body.fraud_status)) return NextResponse.json({ ok: true }) // pending/deny/cancel/expire

  if (orderId.startsWith('upg_')) return handleUpgrade(admin, body)
  if (orderId.startsWith('ren_')) return handleRenewal(admin, body)
  if (orderId.startsWith('qta_')) return handleQuotaAddon(admin, body)
  return handleInitial(admin, body)
}
```

`handleInitial` (port of the old inline initial path):

```ts
async function handleInitial(admin: ReturnType<typeof createSupabaseAdminClient>, body: MidtransNotification) {
  const invId = invitationIdFromOrderId(body.order_id)
  if (!invId) {
    console.error('[midtrans webhook] unparseable order_id', body.order_id)
    return NextResponse.json({ ok: true })
  }
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, is_paid, gateway_order_id, guest_quota_extra, expected_amount_idr')
    .eq('id', invId)
    .maybeSingle()) as { data: {
      id: string; plan: string; template_id: string; is_paid: boolean
      gateway_order_id: string | null; guest_quota_extra: number | null; expected_amount_idr: number | null
    } | null }
  if (!inv || inv.is_paid) return NextResponse.json({ ok: true }) // unknown or already processed

  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) {
    console.error('[midtrans webhook] unknown plan', inv.template_id, inv.plan)
    return NextResponse.json({ ok: true })
  }
  const expected = inv.expected_amount_idr ?? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))

  // Authoritative verification: re-fetch THE ORDER THAT FIRED THIS WEBHOOK
  // (body.order_id — the customer may have re-opened checkout, so it can
  // differ from the row's stored gateway_order_id). Falls back to the
  // signature-authenticated body amount if the re-fetch fails.
  let verified = false
  let channel: string | null = body.payment_type ?? null
  let txnId: string | null = body.transaction_id ?? null
  try {
    const snap = await getTransactionStatus(body.order_id ?? '')
    verified = snap.orderId === body.order_id && isPaidStatus(snap.status, snap.fraudStatus) && snap.grossAmountIDR === expected
    channel = snap.paymentType ?? channel
    txnId = snap.transactionId ?? txnId
    if (!verified) console.error('[midtrans webhook] verification failed', { order_id: body.order_id, snapStatus: snap.status, snapAmount: snap.grossAmountIDR, expected })
  } catch (e) {
    verified = parseGrossAmount(body.gross_amount) === expected
    console.error('[midtrans webhook] re-fetch failed, used body amount', e)
  }
  if (!verified) return NextResponse.json({ ok: true }) // ack, but do not publish

  await publishPaidInvitation(admin, inv, Date.now(), {
    paidAmountIDR: expected, paidSource: 'midtrans', feeIDR: null,
    paidChannel: channel, gatewayTxnId: txnId,
  })
  // Keep the row's order id pointing at the order that actually got paid.
  await (admin.from('invitations') as any).update({ gateway_order_id: body.order_id }).eq('id', inv.id)
  return NextResponse.json({ ok: true })
}
```

`handleUpgrade` / `handleQuotaAddon` — ports of the Xendit versions with:
- lookup `.eq('gateway_order_id', body.order_id as string)` (select `gateway_order_id` instead of the two xendit columns)
- verify via `getTransactionStatus(body.order_id ?? '')`, `isPaidStatus(snap.status, snap.fraudStatus)`, `snap.grossAmountIDR === expected`; catch-fallback `parseGrossAmount(body.gross_amount) === expected`
- after `applyPaidUpgrade` / `applyPaidQuotaAddon`, persist channel:

```ts
  await (admin.from('plan_upgrades') as any)
    .update({ paid_channel: body.payment_type ?? null, gateway_txn_id: body.transaction_id ?? null })
    .eq('id', upg.id)
```

(and the `quota_addons` mirror on `addon.id`).

`handleRenewal` — port with `renewalIdFromOrderId(body.order_id)`, select `gateway_order_id`, same verify pattern, `extendActivePeriod(admin, inv)` unchanged.

`handleRefundEvent` — resolves the refunded source from the order-id prefix, settles the matching pending row, and (defensive) records a dashboard-initiated refund we didn't start:

```ts
/** Resolve which refundable source an order id belongs to. */
async function sourceFromOrderId(admin: any, orderId: string):
  Promise<{ sourceType: RefundSourceType; sourceId: string; invitationId: string } | null> {
  const invId = invitationIdFromOrderId(orderId) ?? renewalIdFromOrderId(orderId)
  if (invId) return { sourceType: 'initial', sourceId: invId, invitationId: invId }
  const table = orderId.startsWith('upg_') ? 'plan_upgrades' : orderId.startsWith('qta_') ? 'quota_addons' : null
  if (!table) return null
  const { data } = await admin.from(table).select('id, invitation_id').eq('gateway_order_id', orderId).maybeSingle()
  if (!data) return null
  return { sourceType: table === 'plan_upgrades' ? 'upgrade' : 'addon', sourceId: data.id, invitationId: data.invitation_id }
}

async function handleRefundEvent(admin: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  const src = await sourceFromOrderId(admin, orderId)
  if (!src) return NextResponse.json({ ok: true })
  // Settle the pending refund row we created when the admin fired the refund.
  const { data: rows } = await (admin.from('refunds') as any)
    .select('id, status').eq('source_type', src.sourceType).eq('source_id', src.sourceId)
    .neq('status', 'failed').order('created_at', { ascending: false }).limit(1)
  const row = rows?.[0]
  if (row) {
    if (row.status !== 'succeeded') await settleRefund(admin, row.id)
    return NextResponse.json({ ok: true })
  }
  // No row → the refund was fired from the Midtrans dashboard directly.
  // Record it so money and entitlement can't drift apart.
  const { data: inv } = await admin.from('invitations').select('paid_amount_idr').eq('id', src.invitationId).maybeSingle()
  const { data: inserted } = await (admin.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: src.sourceType, source_id: src.sourceId,
    amount_idr: Number((inv as any)?.paid_amount_idr ?? 0), method: 'gateway', status: 'pending',
    reason: 'Refund dari dashboard Midtrans',
  }).select('id').single()
  if (inserted) await settleRefund(admin, (inserted as { id: string }).id)
  await logAdminAction('system (midtrans)', { action: 'refund.gateway_initiated', targetType: 'invitation', targetId: src.invitationId })
  return NextResponse.json({ ok: true })
}
```

`handleChargeback` — port of the old dispute branch keyed by the new resolver:

```ts
async function handleChargeback(admin: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  const src = await sourceFromOrderId(admin, orderId)
  if (!src) return NextResponse.json({ ok: true })
  if (await sourceHasOpenRefund(admin, src.sourceType, src.sourceId)) return NextResponse.json({ ok: true })
  const { data: inv } = await admin.from('invitations').select('paid_amount_idr').eq('id', src.invitationId).maybeSingle()
  const { data: row } = await (admin.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: src.sourceType, source_id: src.sourceId,
    amount_idr: Number((inv as any)?.paid_amount_idr ?? 0), method: 'chargeback', status: 'pending',
    reason: 'Chargeback / dispute bank',
  }).select('id').single()
  if (row) await settleRefund(admin, (row as { id: string }).id)
  await logAdminAction('system (midtrans)', { action: 'payment.chargeback', targetType: 'invitation', targetId: src.invitationId })
  return NextResponse.json({ ok: true })
}
```

Then delete the old route + its test directory:

```bash
git rm -r src/app/api/payment/xendit
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/app/api/payment/midtrans && npm run typecheck`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/api/payment
git commit -m "feat(payments): Midtrans notification webhook (signature-verified, 4 flows + refund + chargeback)"
```

---

### Task 5: Channel-aware refunds (lib + admin actions + panels + owner button)

**Files:**
- Modify: `src/lib/payments/refunds.ts:8-36` (RefundSource)
- Modify: `src/app/admin/payments/actions.ts` (recheck ×3, reconcile, adminRefund, adminRefundViaXendit→Gateway, approve)
- Modify: `src/app/admin/payments/PaymentsClient.tsx:64-81,110`
- Modify: `src/app/admin/payments/RefundRequestsPanel.tsx:33-46`
- Modify: `src/app/admin/payments/data.ts:93` (+ paidChannel into the request rows the panel reads)
- Modify: `src/app/[template]/[slug]/dashboard/RefundRequestButton.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/page.tsx` (pass `paidChannel` prop where `<RefundRequestButton` is rendered; add `paid_channel` to that page's invitation select)
- Modify: `src/lib/admin/log.ts:38`
- Test: `src/lib/payments/__tests__/refunds.test.ts` (loadRefundSource field renames)

**Interfaces:**
- Produces: `RefundSource { invitationId; amountIDR; paidSource: 'midtrans'|'manual'|'comp'; gatewayOrderId: string | null; paidChannel: string | null }`; server action renamed `adminRefundViaGateway(sourceType, sourceId, reason?)`; `adminApproveRefund(requestId, { method: 'manual' | 'gateway'; note? })`.

- [ ] **Step 1: Rework `loadRefundSource`**

```ts
export interface RefundSource {
  invitationId: string
  amountIDR: number          // the STORED paid amount — never user-supplied
  paidSource: 'midtrans' | 'manual' | 'comp'
  gatewayOrderId: string | null
  /** Payment channel captured at PAID time — decides API refund vs manual. */
  paidChannel: string | null
}

export async function loadRefundSource(db: any, sourceType: RefundSourceType, sourceId: string): Promise<RefundSource | null> {
  if (sourceType === 'initial') {
    const { data } = await db.from('invitations')
      .select('id, paid_amount_idr, paid_source, gateway_order_id, paid_channel, is_paid').eq('id', sourceId).maybeSingle()
    if (!data || !data.is_paid) return null
    return {
      invitationId: data.id, amountIDR: Number(data.paid_amount_idr ?? 0),
      paidSource: (data.paid_source as any) || 'midtrans',
      gatewayOrderId: data.gateway_order_id ?? null, paidChannel: data.paid_channel ?? null,
    }
  }
  const table = sourceType === 'upgrade' ? 'plan_upgrades' : 'quota_addons'
  const { data } = await db.from(table)
    .select('id, invitation_id, amount_idr, gateway_order_id, paid_channel, status').eq('id', sourceId).maybeSingle()
  if (!data || data.status !== 'paid') return null
  return {
    invitationId: data.invitation_id, amountIDR: Number(data.amount_idr ?? 0),
    paidSource: 'midtrans', // upgrades/add-ons are always gateway-paid
    gatewayOrderId: data.gateway_order_id ?? null, paidChannel: data.paid_channel ?? null,
  }
}
```

Update `src/lib/payments/__tests__/refunds.test.ts` mocks/assertions to the new field names (`gatewayOrderId`, `paidChannel`, `paidSource: 'midtrans'`).

- [ ] **Step 2: Rewrite `adminRefundViaXendit` → `adminRefundViaGateway`**

In `src/app/admin/payments/actions.ts`, replace the import line 10 with:

```ts
import { getTransactionStatus, isPaidStatus, createGatewayRefund, canApiRefund } from '@/lib/payments/gateway'
```

and replace the whole `adminRefundViaXendit` with:

```ts
/**
 * GATEWAY refund: calls the Midtrans Direct Refund API (returns to the original
 * payment method — can't be diverted). Only channels in API_REFUNDABLE_CHANNELS
 * support it; bank_transfer/VA money must use adminRefund (manual transfer).
 * Records a PENDING row + our refund_key idempotency key first, then fires the
 * API; the `refund` notification flips it to succeeded + reverses entitlement.
 */
export async function adminRefundViaGateway(sourceType: RefundSourceType, sourceId: string, reason?: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const src = await loadRefundSource(db, sourceType, sourceId)
  if (!src) return { ok: false, error: 'Sumber tidak ditemukan / belum dibayar' }
  if (src.paidSource !== 'midtrans') return { ok: false, error: 'Refund otomatis hanya untuk pembayaran Midtrans. Untuk manual/offline: transfer balik lalu "Tandai refund".' }
  if (!canApiRefund(src.paidChannel)) return { ok: false, error: `Channel "${src.paidChannel ?? '?'}" (VA/transfer bank) tidak mendukung refund otomatis — transfer balik manual lalu "Tandai refund".` }
  if (src.amountIDR <= 0) return { ok: false, error: 'Nominal pembayaran belum tercatat — klik "Isi angka lama" di halaman Pembayaran dulu.' }
  if (!src.gatewayOrderId) return { ok: false, error: 'Order Midtrans tidak ditemukan untuk sumber ini' }
  if (await sourceHasOpenRefund(db, sourceType, sourceId)) return { ok: false, error: 'Sumber ini sudah punya refund' }
  const { data: inserted, error } = await (db.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: sourceType, source_id: sourceId,
    amount_idr: src.amountIDR, method: 'gateway', status: 'pending', reason: reason ?? null, admin_email: admin.email,
  }).select('id').single()
  if (error || !inserted) return { ok: false, error: 'Gagal mencatat refund' }
  const refundRowId = (inserted as { id: string }).id
  // Idempotency: the refund_key is derived from OUR row id — a retry after a
  // network blip reuses it, so Midtrans can never execute the refund twice.
  const refundKey = `rfd-${refundRowId}`
  await (db.from('refunds') as any).update({ refund_key: refundKey }).eq('id', refundRowId)
  let refund
  try {
    refund = await createGatewayRefund(src.gatewayOrderId, src.amountIDR, refundKey, reason)
  } catch (e) {
    // Graceful failure (spec §6f, simplified): record the failed attempt with the
    // gateway error; the admin re-runs the MANUAL route, which inserts a fresh
    // row (sourceHasOpenRefund ignores failed rows) and settles immediately.
    await (db.from('refunds') as any).update({ status: 'failed', reason: `${reason ?? ''} [gagal: ${String(e).slice(0, 160)}]` }).eq('id', refundRowId)
    return { ok: false, error: 'Refund Midtrans gagal (saldo Midtrans kurang atau channel menolak). Transfer balik manual lalu "Tandai refund".' }
  }
  await (db.from('refunds') as any).update({ gateway_refund_id: refund.refundId }).eq('id', refundRowId)
  // Direct Refund usually confirms synchronously; the webhook settles otherwise.
  if (refund.status === 'refund' || refund.status === 'partial_refund') await settleRefund(db, refundRowId)
  await logAdminAction(admin.email, { action: 'refund.gateway', targetType: 'invitation', targetId: src.invitationId, meta: { sourceType, amount: src.amountIDR, gatewayRefundId: refund.refundId, status: refund.status } })
  revalidateInvitation()
  return { ok: true }
}
```

- [ ] **Step 3: `adminRefund` (manual) — encrypt the destination + confirm-name contract**

In `adminRefund`, add the import `import { encryptField } from '@/lib/crypto/app'` and change the insert's destination line to encrypt at rest (consistency with the request-side encryption):

```ts
  const destEnc = destination
    ? { bank: encryptField(destination.bank ?? ''), account_no: encryptField(destination.account_no ?? ''), holder: encryptField(destination.holder ?? '') }
    : null
  const { data: inserted, error } = await (db.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: sourceType, source_id: sourceId,
    amount_idr: src.amountIDR, method: 'manual', status: 'pending',
    destination: destEnc, reason: reason ?? null, admin_email: admin.email,
  }).select('id').single()
```

Also update `adminApproveRefund`'s signature + dispatch:

```ts
export async function adminApproveRefund(requestId: string, opts: { method: 'manual' | 'gateway'; note?: string }): Promise<Result> {
  …
  const refundRes = opts.method === 'gateway'
    ? await adminRefundViaGateway(sourceType, sourceId, 'Disetujui dari permintaan refund')
    : await adminRefund(sourceType, sourceId, 'Disetujui dari permintaan refund', destination)
  …
  `<p>Halo,</p><p>… Dana dikembalikan ${opts.method === 'gateway' ? 'ke metode pembayaranmu (otomatis via Midtrans)' : 'ke rekening yang kamu berikan (transfer manual)'} …</p>`
```

> Note: `destination` passed from `usage_snapshot.destination` is ALREADY
> encrypted (requestRefund encrypts before storing) — `adminRefund` would then
> double-encrypt it. Guard: in `adminApproveRefund`, pass the snapshot values
> through as-is by inserting them directly instead of routing through
> `adminRefund`'s encrypt step — simplest correct fix: add an internal flag
> `destinationAlreadyEncrypted` param to `adminRefund` (default false) and pass
> `true` from `adminApproveRefund`. Implement exactly that:

```ts
export async function adminRefund(
  sourceType: RefundSourceType, sourceId: string, reason?: string,
  destination?: { bank?: string; account_no?: string; holder?: string },
  destinationAlreadyEncrypted = false,
): Promise<Result> {
  …
  const destEnc = destination
    ? (destinationAlreadyEncrypted
        ? destination
        : { bank: encryptField(destination.bank ?? ''), account_no: encryptField(destination.account_no ?? ''), holder: encryptField(destination.holder ?? '') })
    : null
```

and in `adminApproveRefund`: `await adminRefund(sourceType, sourceId, 'Disetujui dari permintaan refund', destination, true)`.

- [ ] **Step 4: Recheck ×3 + reconcile in the same file**

Mechanical renames in `adminRecheckPayment`, `adminRecheckUpgrade`, `adminRecheckQuotaAddon`, `adminReconcileXendit`:
- selects: `xendit_invoice_id` → `gateway_order_id`
- `getXenditInvoice(x)` → `getTransactionStatus(row.gateway_order_id)`
- `isPaidStatus(snap.status)` → `isPaidStatus(snap.status, snap.fraudStatus)`
- `snap.amountIDR` → `snap.grossAmountIDR`
- `paidSource: 'xendit'` → `paidSource: 'midtrans'`, plus pass `paidChannel: snap.paymentType, gatewayTxnId: snap.transactionId` into `publishPaidInvitation`
- `feeIDR: snap.feeIDR || null` → `feeIDR: null`
- rename `adminReconcileXendit` → `adminReconcileGateway`; user-facing strings "Xendit" → "Midtrans" (e.g. `'Midtrans LUNAS tapi belum diterapkan'`, `'Kita catat LUNAS tapi Midtrans "${snap.status}" — cek manual'`); `.eq('paid_source', 'xendit')` → `.eq('paid_source', 'midtrans')`; `not('xendit_invoice_id', 'is', null)` → `not('gateway_order_id', 'is', null)`.

- [ ] **Step 5: Panels + owner button**

- `PaymentsClient.tsx`: import `adminRefundViaGateway`; `t.source === 'xendit'` → `'midtrans'`; select options `['xendit','Xendit']` → `['midtrans','Midtrans']`; dialog copy "Via Xendit" → "Via Midtrans"; method values `'xendit'` → `'gateway'`. The refund dialog for the API route needs NO destination; the manual dialog keeps its fields **plus a required confirmation checkbox** (AdminDialogProvider `type:'select'` is not a checkbox — use a select with options `[{value:'no',label:'Belum saya cek'},{value:'yes',label:'Nama pemilik rekening SUDAH saya cocokkan'}]` defaulting to `'no'`, and refuse submit unless `'yes'`; this is the spec §6d anti-hijack gate).
- `RefundRequestsPanel.tsx`: `r.paidSource === 'xendit'` → `'midtrans'`; additionally read `r.paidChannel` (added in `data.ts` — include `paid_channel` in the invitations select feeding the requests rows) and offer the gateway option ONLY when `canApiRefund(r.paidChannel)` (import from `@/lib/payments/refund-channels`); otherwise show only manual with the decrypted destination visible. Method values `'xendit'` → `'gateway'`.
- `data.ts:93`: default `paidSource: inv?.paid_source ?? 'midtrans'`; add `paidChannel: inv?.paid_channel ?? null` to the row shape (and `paid_channel` to its select).
- `RefundRequestButton.tsx`: new prop `paidChannel: string | null`; `const needsDestination = paidSource === 'manual' || (paidSource === 'midtrans' && !canApiRefund(paidChannel))` (import from `@/lib/payments/refund-channels` — client-safe); update the helper copy to `Karena kamu bayar via transfer bank/VA (atau manual), isi rekening tujuan pengembalian:`. In `dashboard/page.tsx`, add `paid_channel` to the invitation select and pass `paidChannel={invitation.paid_channel ?? null}`.
- `log.ts:38`: `'refund.xendit': …` → `'refund.gateway': `Refund via Midtrans ${ref}`` and add `'refund.gateway_initiated': `Refund dari dashboard Midtrans ${ref}``.

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/lib/payments src/app/admin && npm run typecheck`
Expected: PASS / clean. (`transactions.test.ts` still passes — it's touched in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add -A src/lib/payments src/app/admin/payments "src/app/[template]/[slug]/dashboard" src/lib/admin/log.ts
git commit -m "feat(refunds): channel-aware routing — Midtrans API refund vs manual VA transfer, encrypted destinations"
```

---

### Task 6: Ledger sweep + delete `xendit.ts`

**Files:**
- Modify: `src/lib/payments/transactions.ts:13,51,59`
- Modify: `src/lib/payments/__tests__/transactions.test.ts`
- Modify: `src/app/admin/payments/page.tsx:41,47`
- Modify: `src/app/admin/payments/ReconcilePanel.tsx:6,18,30,37,39`
- Modify: `src/app/admin/invitations/new/CreateInvitationForm.tsx:144`
- Modify: `src/lib/site-url.ts:6,14` (comment), `src/app/[template]/[slug]/dashboard/GuestsTab.tsx:64` (comment), `src/app/admin/invitations/actions.ts:27` (comment), `src/lib/payments/publish.ts:92` (comment, if not already done in Task 3)
- Delete: `src/lib/payments/xendit.ts`, `src/lib/payments/__tests__/xendit-token.test.ts`, `src/lib/payments/__tests__/xendit-extid.test.ts`

- [ ] **Step 1: `transactions.ts`**

```ts
export type TxnSource = 'midtrans' | 'manual' | 'comp'
```

`mapInitial`: `inv.paid_source === 'manual' ? 'manual' : inv.paid_source === 'comp' ? 'comp' : 'midtrans'`.
Comment line 59: `/** Upgrades + add-ons are always gateway-paid (there is no offline path for them). */`
In `transactions.test.ts`: replace every `'xendit'` literal with `'midtrans'` (init factory `paid_source`, the two `.source` expectations, `s.bySource.midtrans`). Check `summarize`'s `bySource` keys in `transactions.ts` — if it hardcodes a `xendit` key, rename it to `midtrans`.

- [ ] **Step 2: UI labels**

- `page.tsx:41`: `'fee Xendit belum tercatat (≈ kotor)'` → `'fee Midtrans belum tercatat (≈ kotor)'`
- `page.tsx:47`: `label="Xendit"` → `label="Midtrans"` + `summary.bySource.xendit` → `summary.bySource.midtrans`
- `ReconcilePanel.tsx`: import + call `adminReconcileGateway`; headings/copy "Xendit" → "Midtrans"
- `CreateInvitationForm.tsx:144`: `(klien bayar sendiri via Xendit)` → `(klien bayar sendiri via Midtrans)`
- Comment-only touches in `site-url.ts`, `GuestsTab.tsx`, `admin/invitations/actions.ts`.

- [ ] **Step 3: Delete the Xendit wrapper + its tests**

```bash
git rm src/lib/payments/xendit.ts src/lib/payments/__tests__/xendit-token.test.ts src/lib/payments/__tests__/xendit-extid.test.ts
```

- [ ] **Step 4: Prove nothing references Xendit anymore**

Run: `npx vitest run && npm run typecheck`
Expected: PASS / clean.
Run: `grep -ri "xendit" src/ --include="*.ts" --include="*.tsx" -l`
Expected: **no results** (docs/scripts/env handled in Task 7).

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(payments): ledger + admin UI on Midtrans; remove Xendit wrapper"
```

---

### Task 7: Env, scripts, docs, legal

**Files:**
- Modify: `.env.example` (+ `.env.local.example` if it lists XENDIT keys)
- Create: `scripts/diag-midtrans.mjs` · Delete: `scripts/diag-xendit.mjs`
- Modify: `scripts/mark-paid.mjs`, `scripts/diag-db.mjs` (column renames: `xendit_invoice_id`→`gateway_txn_id`, `xendit_external_id`→`gateway_order_id`, `paid_source` literal)
- Modify: `src/components/legal/TermsContent.tsx:82,265` ("**Xendit**" → "**Midtrans**", ID + EN)
- Modify: `CLAUDE.md` (tech-stack row, payment-lifecycle §, env list, webhook path), `README.md` (operator SOP mentions), `docs/DEPLOYMENT-CHECKLIST.md` (webhook + keys steps), `docs/AUTH-SETUP.md` (env keys list if present)

- [ ] **Step 1: Env examples**

In `.env.example`, replace the Xendit block (lines ~45-48):

```bash
# Midtrans (payments). Server Key from Dashboard → Settings → Access Keys.
# Sandbox keys start with SB-Mid-server-, production with Mid-server-.
MIDTRANS_SERVER_KEY=
# 'true' switches to the production API base URLs. Anything else = sandbox.
MIDTRANS_IS_PRODUCTION=false
```

- [ ] **Step 2: Diag script**

`scripts/diag-midtrans.mjs` — mirror `diag-xendit.mjs`'s structure: read `MIDTRANS_SERVER_KEY` + `MIDTRANS_IS_PRODUCTION` from `.env.local`, then `GET {coreBase}/v2/ping_test_order/status` and print the response (a 404 body with `status_code: '404'` proves the key + base URL are valid; a 401 means a bad key). Delete `diag-xendit.mjs` in the same commit.

- [ ] **Step 3: Legal + docs sweep**

- `TermsContent.tsx`: both payment clauses — ID: `…termasuk namun tidak terbatas pada <strong>Midtrans</strong>.` EN: `…including but not limited to <strong>Midtrans</strong>.` Update the file's doc comment too.
- `CLAUDE.md`: payments row → `**Midtrans** Snap (redirect) + notification webhook`; lifecycle § — `startCheckout` creates a Snap transaction; webhook path `/api/payment/midtrans/webhook`; env list swap.
- `README.md` + `docs/DEPLOYMENT-CHECKLIST.md`: webhook URL step becomes "Midtrans Dashboard → Settings → Configuration → Payment Notification URL = `https://www.fincards.land/api/payment/midtrans/webhook`"; key setup step points at Access Keys; smoke-test wording unchanged.

- [ ] **Step 4: Verify + commit**

Run: `npx vitest run && npm run typecheck && npm run verify:security`
Expected: all pass (`verify:security` confirms no plaintext secrets/PII regressions).

```bash
git add -A
git commit -m "chore(payments): Midtrans env keys, diag script, legal + ops docs"
```

---

### Task 8: Full verification + sandbox E2E

**Files:** none created — verification only. Needs `MIDTRANS_SERVER_KEY` (sandbox) in `.env.local` from the owner.

- [ ] **Step 1: Full local suite**

Run: `npm run test:all` (typecheck + vitest + Playwright) — expected: green. If Playwright specs stub payment flows, update any that asserted Xendit URLs (`grep -ri xendit e2e/ tests/` to find them).

- [ ] **Step 2: Key sanity**

Run: `node scripts/diag-midtrans.mjs`
Expected: prints a valid JSON response (404-shaped body for the dummy order proves auth works).

- [ ] **Step 3: Sandbox checkout E2E (manual, with the owner)**

1. Deploy the branch to a Vercel preview (webhooks can't reach localhost) and set the preview's env: `MIDTRANS_SERVER_KEY` (sandbox), `MIDTRANS_IS_PRODUCTION=false`.
2. In the Midtrans **Sandbox** dashboard → Settings → Configuration → Payment Notification URL = `https://<preview>/api/payment/midtrans/webhook`.
3. Run onboarding → checkout → pay with the sandbox simulator, twice:
   - **QRIS** (API-refundable channel) → invitation publishes via webhook; `/admin/payments` shows the txn with source `midtrans`, channel `qris`.
   - **Bank transfer VA** (manual-refund channel) → publishes; `paid_channel='bank_transfer'`.
4. Refund drill: on the QRIS txn → "Refund via Midtrans" → row settles (webhook or sync) + invitation unpublishes. On the VA txn → owner files a refund request → form REQUIRES bank/rekening/nama → admin panel shows only the manual route + destination → approve → invitation unpublishes.
5. "Saya sudah bayar — cek ulang": pay a fresh order, then hit recheck BEFORE the webhook lands (or with the notification URL temporarily unset) → publishes.

- [ ] **Step 4: Update TEST-REPORT.md with the run results, commit**

```bash
git add TEST-REPORT.md
git commit -m "test: Midtrans migration verification run"
```

---

## Deviations from the spec (documented, intentional)

1. **§3 `refund_requests.destination_enc` column dropped** — discovery: `requestRefund` already stores the destination AES-GCM-encrypted inside `usage_snapshot.destination`. Reused as-is; only the *requirement condition* became channel-aware.
2. **§6f "flip the row to manual" simplified** — a failed gateway refund marks the row `failed` (with the gateway error in `reason`) and the admin re-runs the existing manual route, which inserts a fresh row and settles. Same net behavior, zero new machinery; `sourceHasOpenRefund` already ignores `failed` rows.
3. **`CheckoutResult.invoiceUrl` field name kept** — it now carries the Snap redirect URL; renaming it would touch 6 UI files for zero behavior change.
