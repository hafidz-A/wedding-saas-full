# Plan upgrade + guestbook lock (all templates)

> Date: 2026-06-02
> Status: Approved decisions, implementing

## Goal

Any invitation on a non-premium plan can **upgrade to Premium** (all templates),
which unlocks the Buku Tamu (guestbook) attendance ledger. The Buku Tamu tab is
shown to everyone but **locked** for non-premium, with an in-dashboard upgrade
CTA that starts a payment. Upgrading must **not** take a live invitation offline.

## Approved decisions

- **Upgrade price = difference**: `premium.price_idr − currentPlan.price_idr`,
  read per-template from `template_plans`. If the current plan isn't in
  `template_plans` (legacy `free`), treat its price as 0 → full premium price.
- **Active period after upgrade = lifetime**: follow premium's `duration_days`
  (NULL) → `expires_at = null`. Keep `is_paid` + `is_published` unchanged.

## Why a new path is needed

`invitation.plan` is chosen at onboarding; `startCheckout` charges the current
plan price; the Xendit webhook **skips already-paid rows** (`if (inv.is_paid)
return`) and verifies `amount === resolvePlan(template, inv.plan)`. None of that
can express "already paid, now pay a delta to change plan". So upgrades get their
own table + checkout action + webhook branch.

## Data model — new table `plan_upgrades`

```sql
create table public.plan_upgrades (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  from_plan text not null,
  to_plan text not null,
  amount_idr integer not null,
  xendit_invoice_id text,
  xendit_external_id text unique,
  status text not null default 'pending',   -- pending | paid
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on public.plan_upgrades (invitation_id);
```

RLS: no anon access (only the service role touches it, like other payment data).

## Pieces

1. **`lib/payments/plans.ts`** — `computeUpgradeAmount(plans, fromPlan, toPlan)`
   pure helper (difference, clamp ≥ 0, missing fromPlan ⇒ 0). Plus
   `resolveUpgrade(template, fromPlan, toPlan)` (DB-backed: returns
   `{ amountIDR, toExpiresAt }`).
2. **`lib/payments/publish.ts`** — `applyPaidUpgrade(admin, upgradeRow)`: set
   `invitations.plan = to_plan`, `expires_at` per `to_plan` duration; mark the
   upgrade row paid. Mirrors `publishPaidInvitation`, but never flips
   is_paid/is_published off.
3. **`app/onboarding/actions.ts`** —
   - `startUpgradeCheckout(invitationId)`: owner check; require `is_paid` and
     `plan !== 'premium'`; amount = `computeUpgradeAmount`; create Xendit invoice
     `external_id = upg_<id>_<ts>`; insert `plan_upgrades` (pending); return
     invoiceUrl.
   - `recheckUpgrade(invitationId)`: manual fallback for a missed webhook —
     re-fetch the latest pending upgrade's invoice, verify paid + amount, apply.
4. **`api/payment/xendit/webhook/route.ts`** — branch when `external_id`
   starts with `upg_`: look up the `plan_upgrades` row, verify Xendit paid +
   `amount === row.amount_idr`, call `applyPaidUpgrade`. Idempotent (skip rows
   already `paid`).
5. **Dashboard UI** —
   - `page.tsx`: when `plan !== 'premium'` and `is_paid`, resolve the upgrade
     amount and pass `upgrade = { amountIDR, toPlanName }` to DashboardClient.
   - `DashboardClient.tsx`: always include the `guestbook` tab; render
     `<GuestbookTab>` when premium, else `<GuestbookLocked>` with the upgrade CTA.
   - New `GuestbookLocked.tsx`: explains the lock, shows the price, button calls
     `startUpgradeCheckout` → redirect to invoiceUrl.
6. **i18n** — `dashboard.tabs.guestbookLocked.*` (id/en, parity-kept): title,
   body, price prefix, CTA, processing.
7. **Tutorial** — reword the guestbook category copy: locked unless Premium;
   unlock via upgrade.

## Testing

- Unit: `computeUpgradeAmount` (difference, free⇒full, premium⇒0/none).
- `dict-parity` covers new i18n keys.
- Manual/browser: flip a dummy invitation to `basic`, confirm Buku Tamu shows the
  locked card + price; flip back. Full Xendit round-trip + the migration must be
  applied on Supabase by the operator (documented; can't be exercised from here).

## Out of scope / operator steps

- Applying the migration to Supabase (`supabase db push` or SQL editor).
- Live Xendit sandbox validation of the upgrade webhook.
- Downgrades; multi-step plan ladders (only basic/free → premium for now).
