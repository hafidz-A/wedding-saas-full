# Admin module 3 — Payments & revenue

> Date: 2026-07-03
> Status: Approved decisions, ready for plan
> Related: [invitations control center](2026-07-03-admin-invitations-control-center-design.md)
> (paid_source + admin_actions), [pricing spec](2026-07-03-pricing-source-unify-editor-design.md).
> Program: memory `admin-console-program`.

## Goal

`/admin/payments` — accurate revenue reporting + a full transaction ledger +
reconciliation of stuck payments + trend charts + a draft→paid conversion view +
**CSV export** + **refund tracking**. Fixes the fact that the initial-purchase
amount is never stored, which makes any recomputed revenue drift.

## Why (verified)

- **Amounts:** `plan_upgrades.amount_idr` ✓, `quota_addons.amount_idr` ✓, but the
  **initial purchase has no amount column on `invitations`** ✗. The webhook
  (`publishPaidInvitation`) records `is_paid/paid_at/expires_at` only; the amount
  is computed at verification (`initialPurchaseAmount(planPrice, extra)`) and
  discarded. Recomputing revenue later from the *current* plan price drifts the
  moment a price is edited (module 1) or a promo discounts the charge (module 1
  Phase 2).
- **`paid_source`** (xendit/manual/comp) comes from module 2.
- Owner-scoped `recheckPayment/recheckUpgrade/recheckQuotaAddon` exist; the
  operator needs **admin-gated** versions that work on any invitation.
- Row counts today: invitations 14, plan_upgrades 7, quota_addons 0.

## Approved decisions

- **Depth = full:** transactions ledger + revenue summary + reconcile + trend
  chart + draft→paid conversion + CSV export.
- **Refunds tracked now** — a refund marks a transaction excluded from revenue.
- **Store `paid_amount_idr`** at payment time (design necessity, not optional).

## Data model (module-3 migration)

- `invitations` + `paid_amount_idr integer` (nullable). Set by
  `publishPaidInvitation` (webhook) and the module-2 comp/manual action. Backfill
  existing `is_paid` rows to `initialPurchaseAmount(currentPlanPrice,
  guest_quota_extra)` (best-effort; may differ slightly if a price changed since
  purchase).
- `refunds` table: `id uuid pk`, `invitation_id uuid`, `source_type text`
  (`initial | upgrade | addon`), `source_id text` (the invitation / upgrade /
  addon id), `amount_idr integer`, `reason text`, `admin_email text`, `created_at
  timestamptz default now()`. RLS enabled, service-role only. A source row is
  "refunded" iff a `refunds` row references it. (Full refunds only — partial
  refunds out of scope.)

## Architecture

- **Unified `Transaction` shape** built server-side by UNION-ing three sources:
  - `initial` — `invitations` where `is_paid`: amount `paid_amount_idr`, source
    `paid_source`, date `paid_at`.
  - `upgrade` — `plan_upgrades` where `status='paid'`: `amount_idr`, `paid_at`.
  - `addon` — `quota_addons` where `status='paid'`: `amount_idr`, `paid_at`.
  Each carries `{ invitation_id, slug, couple, type, amount_idr, source, status:
  'paid'|'refunded', date }`; `refunded` when a `refunds` row references it.
- **`/admin/payments/page.tsx`** (server, `requireAdmin()`):
  - **Revenue summary** — net total, this month, **by source** (xendit + manual
    count; comp always Rp 0), by plan, by template. Net = Σ paid (source ∈
    {xendit, manual}) − Σ refunds. Comp + refunded excluded.
  - **Trend chart** — revenue per month (last ~12), **dependency-free** (hand-
    rolled CSS/SVG bars using tokens — the project ships no chart lib and adds no
    UI library).
  - **Conversion** — drafts (`is_paid=false`) vs paid, conversion %, and stale
    drafts (old unpaid) for follow-up.
  - **Transactions table** — filter by type / source / status / date range,
    search by slug / couple; each row links to the invitation in module 2.
  - **CSV export** — `adminExportTransactionsCsv(filter)` returns the filtered
    ledger as CSV (financial fields only — NEVER guest PII).
  - **Reconcile** — a "cek ulang" action per pending/stuck payment.
- **Actions** (`app/admin/payments/actions.ts`, each `requireAdmin()` +
  `admin_actions` log + revalidate):
  - `adminRecheckPayment(invitationId)` / `adminRecheckUpgrade(invitationId)` /
    `adminRecheckQuotaAddon(invitationId)` — admin-gated mirrors of the owner
    `recheck*` (verify against Xendit + apply), not owner-scoped.
  - `adminRefund(sourceType, sourceId, reason)` — insert a `refunds` row; refund
    is **money-only** (does NOT auto-unpublish — the operator can `adminSuspend`
    separately in module 2).
  - `adminExportTransactionsCsv(filter)`.

## Cross-module wiring (small changes elsewhere)

- **Webhook** `publishPaidInvitation` sets `paid_amount_idr = expectedAmount` and
  `paid_source = 'xendit'`.
- **Module-2 comp/manual action** sets `paid_amount_idr`: **comp → 0**; **manual
  → an operator-entered amount** (default the current plan price) so offline
  revenue is captured, not lost.

## Red-team / edge cases (baked in)

- Initial-purchase amount is stored, never recomputed — the correctness backbone.
- Comp = Rp 0; manual = the real offline amount (operator enters it) — so
  reseller revenue counts but free comps don't inflate.
- Revenue nets out **both** comp (source) and refunded (refunds table).
- Charts/exports are **dependency-free**; CSV contains only transaction/financial
  fields — encrypted guest PII never leaves the DB here.
- Backfill of the 14 existing rows is best-effort from current prices; flag rows
  where `paid_at` predates a known price change if it ever matters.
- Admin reconcile still verifies against Xendit (never trusts a flag).

## Testing

- **Unit:** transaction union mapping (3 sources → one shape); revenue nets out
  comp + refunds; `adminRefund` inserts a refunds row and drops the amount from
  the summary; CSV formatting (escaping, headers); backfill computes
  `initialPurchaseAmount`; `adminRecheck*` verify + apply and are rejected for
  non-admins.
- **Manual / browser:** seed a paid (xendit) + a comp + a manual + a refund →
  confirm the summary and by-source split; export CSV; reconcile a deliberately
  stuck payment.

## Out of scope

- Partial refunds (full only).
- Calling the Xendit refund API (operator refunds in the Xendit dashboard, then
  records it here).
- Tax / e-faktur / invoice-document generation.

## Operator steps

- Apply the module-3 migration (`invitations.paid_amount_idr`, `refunds` table).
- Run the `paid_amount_idr` backfill for existing paid invitations.
