# Guest quota + paid add-on (all templates)

> Date: 2026-06-30
> Status: Approved decisions, ready for plan

## Goal

Cap how many guests ("undangan") a couple can add, sold as quota. Every plan
ships with a base quota included in the plan price; the couple can buy more in
blocks of 50 guests for Rp 10.000/block — both **at initial purchase** (a +/−
stepper on the buy card) and **later from the dashboard Tamu tab**. When the
quota is full, adding/importing guests is **hard-blocked** server-side and the
UI points to "Tambah kuota". Buying or topping up quota must **not** take a live
invitation offline or change its plan/active period.

## Approved decisions

- **Base quota per plan** (included, derived from plan): Basic **200**, Premium **300**.
- **Add-on**: **+50 guests = Rp 10.000**, sold/stepped in 50-guest blocks.
- **Hard cap**: effective quota ≤ **5.000** total (matches the import cap).
- **Enforcement = hard block**: `addGuest` and `importGuests` reject anything
  over the effective quota (import is **not** truncated — the whole over-limit
  import is refused with a "sisa kuota N" message).
- **Quota is split** `effective = base(plan) + extra` — see below.

## Core architecture: quota = base (from plan) + stored add-on

```
effective_quota = base_guest_quota(plan)  +  guest_quota_extra
                  ^ derived from plan         ^ purchased add-on (multiple of 50)
```

- `base_guest_quota` → new column on **`template_plans`** (Basic 200, Premium 300).
  Config-driven; editable in Supabase Studio without a deploy. Fallback 200 when
  null / plan not in `template_plans` (legacy `free`).
- `guest_quota_extra` → new column on **`invitations`** (`int not null default 0`,
  guests, multiple of 50). The **only** quota field mutated by an add-on purchase.

**Why split, not one absolute number:** when a couple upgrades Basic→Premium,
the base lifts 200→300 automatically because it's derived from `plan` —
`applyPaidUpgrade` only swaps `plan`, quota follows for free (a built-in upgrade
incentive of +100 guests). Purchased add-on stays stacked on top. An absolute
`guest_quota` would force a manual +100 bump in every upgrade path — bug-prone.

## Pricing math (one formula, reused by onboarding + webhook)

```
BLOCK_SIZE = 50, BLOCK_PRICE_IDR = 10_000, QUOTA_CAP = 5000
blocks(extra)              = extra / 50
initialPurchaseAmount      = plan.price_idr + blocks(guest_quota_extra) * 10_000
quotaAddonAmount(qtyGuests) = blocks(qtyGuests) * 10_000
```

All quantities are validated multiples of 50; server rejects any qty that would
push `effective_quota` over 5.000.

## Stepper control (`−  [editable number]  +`)

The +/− buttons and a free-typing number input both drive the same value:

- **−/+** step by `BLOCK_SIZE` (50), clamped to `[base, QUOTA_CAP]`.
- The number is **typed freely**, then **snapped to the nearest valid block on
  commit** (blur / Enter), so mid-typing "237" isn't snapped keystroke-by-keystroke.
- Snap rule (pure, unit-tested): `snapQuotaToBlock(value, base, cap)` =
  `clamp(round(value / 50) * 50, base, cap)`. Half rounds up (225 → 250).
  Examples: 237 → 250, 222 → 200, below-base → base, above-cap → cap.

Base (200/300) and cap (5000) are themselves multiples of 50, so every reachable
value is a valid block. Server independently re-validates (multiple of 50 +
within `[base, cap]`) — the snap is UX, never the only guard.

## Data model

1. `template_plans` + column `base_guest_quota int` (backfill Basic=200, Premium=300).
2. `invitations` + column `guest_quota_extra int not null default 0`.
3. New table `quota_addons` (kembaran `plan_upgrades`):

```sql
create table public.quota_addons (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  qty_guests integer not null,             -- multiple of 50
  amount_idr integer not null,
  xendit_invoice_id text,
  xendit_external_id text unique,          -- prefix qta_
  status text not null default 'pending',  -- pending | paid
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint quota_addons_qty_positive check (qty_guests > 0),
  constraint quota_addons_amount_positive check (amount_idr > 0)
);
create index on public.quota_addons (invitation_id);
alter table public.quota_addons enable row level security;  -- service-role only
```

4. Atomic increment RPC `increment_guest_quota_extra(p_invitation_id uuid, p_qty int)`
   — so two add-ons paid concurrently can't lose an update (read-modify-write race).

## Pieces

1. **`lib/payments/template-plans.ts`** — add `base_guest_quota` to `TemplatePlanRow`
   + the select; `mapRow` coerces (fallback 200).
2. **`lib/payments/quota.ts`** (NEW, pure, **client-safe** — no `server-only`) —
   constants `BLOCK_SIZE`, `BLOCK_PRICE_IDR`, `QUOTA_CAP` + pure helpers:
   `blocks(n)`, `effectiveQuota(base, extra)`, `quotaAddonAmount(qty)`,
   `initialPurchaseAmount(planPrice, extra)`, `clampQuotaExtra(base, extra)` (≤ 5000−base),
   `snapQuotaToBlock(value, base, cap)`. Imported by both the client stepper and
   the server (`plans.ts` / actions / webhook). `plans.ts` stays server-only and
   re-exports the DB-backed `planBaseQuota(plans, planCode)` (fallback 200).
3. **`lib/payments/publish.ts`** — `applyPaidQuotaAddon(admin, addonRow)`: call the
   increment RPC, mark the addon row `paid`. Never touches plan/is_paid/expires_at.
   `applyPaidUpgrade` + `extendActivePeriod` stay untouched (must not reset extra).
4. **`api/payment/xendit/webhook/route.ts`**
   - New `qta_` branch → `handleQuotaAddon`: look up `quota_addons` by
     `xendit_external_id`, verify Xendit paid + `amount === row.amount_idr`,
     `applyPaidQuotaAddon`. Idempotent (skip `paid`). Always ACK 200.
   - **Initial-purchase branch changed**: select `guest_quota_extra`; expected
     amount = `initialPurchaseAmount(resolved.amountIDR, inv.guest_quota_extra)`,
     not `resolved.amountIDR` alone. (This is the verification gotcha — fixes the
     "pays Rp159k but webhook expects Rp149k" reject.)
5. **`app/onboarding/actions.ts`**
   - `OnboardingInput` + `guestQuotaExtra` (validated multiple of 50, clamped).
     `completeOnboarding` stores it on the draft.
   - `startCheckout` charges `initialPurchaseAmount(...)`.
   - `startQuotaAddonCheckout(invitationId, qtyGuests)`: owner + `is_paid` check;
     validate qty (multiple of 50, effective+qty ≤ 5000); create Xendit invoice
     `external_id = qta_<id>_<ts>`; insert `quota_addons` pending; return invoiceUrl.
   - `recheckQuotaAddon(invitationId)`: manual fallback for a missed `qta_` webhook.
6. **`app/[template]/[slug]/dashboard/guests/actions.ts`** — enforcement.
   `authorizeOwnership` (or a new `getQuotaState`) also returns `plan` +
   `guest_quota_extra`; resolve `base_guest_quota` via template_plans.
   - `addGuest`: count guests; reject when `count >= effective`.
   - `importGuests`: reject when `count + rows.length > effective` (no truncation),
     message states remaining quota.
7. **Dashboard UI**
   - `page.tsx`: pass `effectiveQuota` + current guest `count` to `GuestsTab`.
   - `GuestsTab.tsx`: header meter "X / {effective} terpakai"; "Tambah kuota"
     button → modal with the `− [editable number] +` control (step 50,
     snap-on-blur, max = 5000 − effective) → `startQuotaAddonCheckout` → redirect
     to invoiceUrl; on return `?quota=1` run `recheckQuotaAddon`. Add-form/import
     surface the full-quota error.
   - `OnboardingForm.tsx`: the `− [editable number] +` control on the buy card,
     floor = selected plan's base (200/300), step 50, snap-on-blur, max = 5000−base;
     live total = base price + blocks×10k. Both surfaces share one
     `<QuotaStepper>` component backed by `snapQuotaToBlock`.
8. **i18n** — `dashboard.tabs.guests.quota.*` (meter, full warning, add button,
   modal copy, price) + `onboarding.quota.*` (stepper label, included, +Rp10k/50
   hint). id/en parity kept (covered by dict-parity test).

## Testing

- Unit: price helpers (`quotaAddonAmount`, `initialPurchaseAmount`,
  `effectiveQuota`, `clampQuotaExtra` cap), `snapQuotaToBlock` (237→250, 222→200,
  225→250 half-up, below-base→base, above-cap→cap), enforcement boundary
  (count == quota blocks add; import of remaining+1 rejected; import of
  exactly-remaining passes).
- `dict-parity` covers the new i18n keys.
- Manual/browser: build a basic + a premium invitation, confirm meter + hard
  block + stepper math; full Xendit round-trip for the `qta_` invoice.

## Out of scope / operator steps

- Applying the migration + the increment RPC to Supabase (SQL editor / `db push`).
- Live Xendit sandbox validation of the `qta_` webhook.
- Editing the chosen `guest_quota_extra` on an **unpaid** draft before payment
  (buy more after paying instead; or delete + redo onboarding).
- Reducing quota / refunds for unused quota; downgrade premium→basic (no such flow).
- Whether Buku Tamu **walk-in** check-ins consume quota — they do **not** (quota
  is the WhatsApp invite list; walk-ins are a separate attendance concept).
