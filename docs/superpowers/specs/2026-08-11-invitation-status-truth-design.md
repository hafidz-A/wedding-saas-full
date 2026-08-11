# Invitation status truth — design

> 2026-08-11 · branch `feat/profile-status-truth`
> Problem: the "My invitations" card on `/profile` reports a status that does not
> match what a guest actually sees. Root cause: a shared visibility resolver was
> designed on 2026-07-04 and never built, so the logic was hand-rolled per surface
> and `/profile` got the shortest version of it.

---

## 1. The defect

`activePeriodStatus(inv, now)` ([src/lib/payments/active-period.ts](../../../src/lib/payments/active-period.ts))
reads exactly two columns — `is_paid` and `expires_at` — and returns
`draft | lifetime | active | expired`. `/profile` renders that verdict as the
card's only status chip.

The public page ([src/app/[template]/[slug]/page.tsx:126-170](../../../src/app/[template]/[slug]/page.tsx))
gates a guest on **four** conditions plus a content check:

```
expired (expires_at < now)      → ExpiredInvitationView
suspended_at                    → SuspendedInvitationView
!(is_published && is_paid)      → notFound()
config empty                    → NotReadyInvitationView
otherwise                       → the invitation renders
```

`/profile` checks two of those. The three resulting lies:

| Reality | Column | Guest sees | Chip says |
|---|---|---|---|
| Blocked by admin | `suspended_at` | takedown page | "Aktif seumur hidup" |
| Not published | `is_published = false` | 404 | "Aktif seumur hidup" |
| Config still empty | `config = {}` | "Undangan belum siap" | "Aktif seumur hidup" |

`is_published` is already selected by the profile query
([src/app/profile/page.tsx:39](../../../src/app/profile/page.tsx)) — it is used only
to compute refund eligibility and is never displayed.

### Already honest — not in scope

Refunded (`refunds` succeeded on `source_type='initial'` → profile shows "Sudah
direfund"), expired, hard-deleted unpaid drafts (row is gone), and PDP-anonymized
invitations (`owner_user_id` nulled, so they leave the owner's list) all report
correctly today.

### Deliberately excluded

- **Pending payment.** `gateway_order_id` is set when checkout starts
  ([onboarding/actions.ts:249](../../../src/app/onboarding/actions.ts)) and is never
  cleared. `!is_paid && gateway_order_id` therefore matches an abandoned checkout
  from weeks ago just as well as a live VA awaiting transfer. Displaying "menunggu
  pembayaran" from that column would replace one lie with another. Left as `unpaid`.
- **Manual-mode "already transferred, awaiting operator".** No column records it.
  Making this honest needs new state, not a new resolver.
- **`archived_at`.** Despite the 2026-07-04 spec listing it, archive does **not**
  affect public visibility — the public page never selects it, and the admin confirm
  copy describes it as list-hiding plus bookkeeping retention. Including it in the
  resolver would make the resolver wrong. Documented in the resolver as the one place
  to add it if archive ever becomes a takedown.
- **`pii_erased_at`.** Always written together with `is_published = false`
  ([lib/admin/pdp.ts:21-32](../../../src/lib/admin/pdp.ts)), so `unpublished` already
  covers it, and `owner_user_id` is nulled so no owner ever sees the row.

---

## 2. Architecture

### 2.1 The resolver

New pure module `src/lib/invitations/public-status.ts`. No I/O, no `server-only` —
it must be callable from a client component and unit-testable in isolation.

```ts
export type PublicStatus =
  | 'live' | 'refunded' | 'suspended' | 'expired'
  | 'unpaid' | 'unpublished' | 'not_ready'

export function invitationPublicStatus(
  inv: {
    is_paid?: boolean
    is_published?: boolean
    expires_at?: string | null
    suspended_at?: string | null
    config?: unknown
  },
  nowMs: number,
  opts?: { isRefunded?: boolean },
): PublicStatus
```

`isRefunded` is passed in rather than queried, because the refund verdict lives in
the `refunds` ledger and callers already batch-fetch it (`fetchRefundedMap` on
`/profile`, `fetchRefundedAt` on the dashboard).

**Precedence**, mirroring the public page's own gate order so the resolver answers
"what does a guest see right now":

1. `refunded` — beats `suspended` because `reverseEntitlement` sets `suspended_at`
   on every refund; the dashboard already applies this same precedence
   ([dashboard/page.tsx:107-119](../../../src/app/[template]/[slug]/dashboard/page.tsx)).
2. `expired` — the public page checks expiry before suspension.
3. `suspended`
4. `unpaid` — the public gate is `is_published && is_paid`; unpaid is listed first
   because it is the more actionable of the two.
5. `unpublished`
6. `not_ready` — `config` null or an object with zero keys.
7. `live`

The resolver deliberately does **not** replace `activePeriodStatus`. The two answer
different questions and both remain: `activePeriodStatus` is the billing period,
`invitationPublicStatus` is guest visibility.

### 2.2 What changes on `/profile`

One query change: add `suspended_at` to the select at
[src/app/profile/page.tsx:39](../../../src/app/profile/page.tsx). `config`,
`is_published`, `is_paid` and `expires_at` are already fetched, and `refundedMap` is
already computed — so the resolver costs zero extra round-trips.

Display rules ("Opsi C" — the period chip keeps carrying billing truth; a visibility
chip and an explanation row are added only where they say something new):

| verdict | period chip | visibility chip | explanation row |
|---|---|---|---|
| `live` | unchanged | "Tayang" (success tone) | — |
| `unpublished` | unchanged | — | warning: not published, guests cannot open it |
| `not_ready` | unchanged | — | warning: content still empty, guests see "belum siap" |
| `expired` | "Kadaluarsa" | — | warning: period ended, renew to bring it back |
| `unpaid` | "Draf — belum dibayar" | — | — (the Bayar button already carries it) |
| `suspended` | **suppressed** | "Diblokir" (danger tone) | danger: blocked by admin, contact support |
| `refunded` | **suppressed** | "Sudah direfund" (existing badge) | danger: refunded, permanently closed |

Rationale for suppressing the period chip on the two terminal states: billing period
is moot once the invitation is permanently down, and "Aktif seumur hidup" sitting
next to "Diblokir" is precisely the contradiction this change exists to remove. For
`expired` and `unpaid` the period chip is *already* the visibility truth, so a second
chip would be redundant — those get an explanation row only.

### 2.3 Dead-end buttons

For `suspended` and `refunded` the "Lihat undangan" action opens a takedown page.
`InvitationActions` gains a `publicStatus` prop and hides that button for those two
verdicts. "Buka dashboard" stays — the dashboard renders the honest
`SuspendedNotice` / `RefundedNotice`, which is where the owner learns what happened.
`isRefunded` (currently a separate boolean) is subsumed by `publicStatus`.

### 2.4 Copy

New keys under `common.invitationStatus` in both `id` and `en`
([src/lib/i18n/dictionaries/common.ts](../../../src/lib/i18n/dictionaries/common.ts)):
a short chip label plus a full explanation sentence per non-live verdict. The
existing `dict-parity.test.ts` enforces id/en parity.

Copy follows the marketing voice rule already in force: no first-person pronouns,
address the reader as "kamu". Each explanation names the consequence to guests, not
the internal state — "tamu belum bisa membuka undangan ini", not "is_published false".

### 2.5 Out of scope (deliberately)

The public page, the metadata builder, the dashboard gate and the admin list all
hand-roll this logic today and all four are **behaviourally correct**. Switching them
onto the resolver is a follow-up: it touches the public render path and deserves its
own testing pass. This change builds the resolver and converts the one surface that
is actually wrong.

---

## 3. Testing

`src/lib/invitations/__tests__/public-status.test.ts` — pure unit tests:

- one case per verdict
- precedence pairs: refunded+suspended → `refunded`; expired+suspended → `expired`;
  unpaid+unpublished → `unpaid`; suspended+unpublished → `suspended`
- `not_ready` for both `config: null` and `config: {}`, and **not** for a populated config
- `live` only when paid, published, unexpired, unsuspended, non-empty config
- boundary: `expires_at` exactly equal to `nowMs` is not yet expired (matches the
  existing `<` comparison in `activePeriodStatus`)

Existing suites that must stay green: `active-period.test.ts` (untouched module),
`dict-parity.test.ts` (new i18n keys), `npm run typecheck`, `npm run check:tokens`
(new chip/row styles must use `--status-*` tokens, not raw hex).

---

## 4. Follow-ups this surfaces (not built here)

1. Convert the four remaining hand-rolled call sites onto the resolver.
2. `/profile` does not select `archived_at`. Harmless today because archive is not a
   takedown — but if that ever changes, the resolver is the single place to fix it.
3. The publish API ([api/invitation/[slug]/publish/route.ts](../../../src/app/api/invitation/[slug]/publish/route.ts))
   does not check `is_paid`, so an unpaid row could in principle be flipped to
   `is_published = true`. No leak results (the public gate still requires `is_paid`),
   and `PaymentGate` keeps the toggle unreachable — noted, not fixed.
4. Upgrade and quota add-ons in `pending` state are invisible on `/profile`.
