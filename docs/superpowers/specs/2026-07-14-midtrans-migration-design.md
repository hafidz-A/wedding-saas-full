# Midtrans migration — design

**Date:** 2026-07-14 · **Status:** approved by owner (pending spec review)
**Decision:** migrate ALL money flows from Xendit to **Midtrans Snap (redirect mode)**,
approach A — full swap with **gateway-neutral naming**. No dual-gateway layer.

## Context

- FinCards has **zero live-money transactions** on Xendit (test mode only), so a clean
  hard swap is safe — no legacy-refund path needs to survive.
- Why migrate: Midtrans accepts **individual (perorangan) merchants** with just KTP +
  bank-book photo (1–3 business-day review), vs Xendit's requirement of a legal entity
  (min. usaha perseorangan + NIB).
- Owner has **no Midtrans account yet** — §10 is the from-zero tutorial.
- All Xendit calls already flow through one wrapper (`src/lib/payments/xendit.ts`),
  and all four checkout flows share prefix-keyed external ids (`inv_`/`ren_`/`upg_`/`qta_`),
  which Midtrans preserves as `order_id`.

## 1. Gateway wrapper — `src/lib/payments/gateway.ts`

Replaces `xendit.ts` (deleted). Server-only. Basic auth `base64(SERVER_KEY + ':')` —
same pattern as Xendit. Base URLs switch on `MIDTRANS_IS_PRODUCTION`:

| | Sandbox | Production |
|---|---|---|
| Snap | `https://app.sandbox.midtrans.com` | `https://app.midtrans.com` |
| Core (status/refund/expire) | `https://api.sandbox.midtrans.com` | `https://api.midtrans.com` |

| Function | Endpoint | Notes |
|---|---|---|
| `createSnapTransaction({orderId, amountIDR, payerEmail, description, finishUrl})` | `POST /snap/v1/transactions` | body: `transaction_details {order_id, gross_amount}`, `customer_details {email}`, `item_details`, `callbacks {finish}` → returns `{token, redirectUrl}` |
| `getTransactionStatus(orderId)` | `GET /v2/{order_id}/status` | authoritative re-check; returns snapshot `{orderId, transactionId, status, fraudStatus, grossAmountIDR, paymentType}` |
| `isPaidStatus(status, fraudStatus)` | — | `settlement`, or `capture` && `fraud_status === 'accept'` |
| `expireTransaction(orderId)` | `POST /v2/{order_id}/expire` | best-effort, swallow errors (same contract as `expireXenditInvoice`); if the API rejects expire for the channel, try `POST /v2/{order_id}/cancel` — verify at implementation |
| `createGatewayRefund(orderId, amountIDR, refundKey)` | `POST /v2/{order_id}/refund` | body `{refund_key, amount, reason}`; see §6 |
| `verifySignature(body)` | — | `sha512(order_id + status_code + gross_amount + SERVER_KEY) === body.signature_key` (timing-safe compare) |
| `canApiRefund(paymentType)` | — | pure; true iff channel ∈ {credit_card, gopay, shopeepay, dana, ovo, qris, kredivo, akulaku} |
| `invitationIdFromOrderId` / `renewalIdFromOrderId` | — | same parsing logic as today (underscore split; UUID never contains `_`) |

`gross_amount` arrives as a decimal **string** (`"149000.00"`) in notifications and
status responses — always `Math.round(Number(x))` before comparing to IDR integers.

Fee capture: Midtrans does not return the gateway fee on the status API. `fee_idr`
stays best-effort: store `null` at publish time (ledger already treats null as 0);
net revenue comes from Midtrans settlement reports. No schema change.

## 2. order_id format (fixes a real bug)

Midtrans `order_id` is **max 50 chars**, charset alphanumeric + `- _ ~ .`.
Current format `inv_<uuid36>_<epochMs13>` = 54 chars — **over the limit**.

New format: `inv_<uuid>_<epochMs in base36>` (base36 of Date.now() = 8 chars) →
`4 + 36 + 1 + 8 = 49` chars ✅. Same for `ren_`/`upg_`/`qta_`. Parsers unchanged
(split on `_`, take parts[1]). The timestamp is only a uniqueness salt — nothing
parses it back, so base36 is free.

## 3. DB migration — `2026-07-14_midtrans_gateway.sql` (idempotent)

Renames (no live money ⇒ safe; test rows updated in place):

```sql
-- invitations
alter table public.invitations rename column xendit_external_id to gateway_order_id;
alter table public.invitations rename column xendit_invoice_id  to gateway_txn_id;
-- plan_upgrades / quota_addons: same two renames each
-- refunds
alter table public.refunds rename column xendit_refund_id to gateway_refund_id;
alter table public.refunds add column if not exists refund_key text;      -- §6 idempotency
-- channel capture (§6): payment_type from the PAID notification
alter table public.invitations   add column if not exists paid_channel text;
alter table public.plan_upgrades add column if not exists paid_channel text;
alter table public.quota_addons  add column if not exists paid_channel text;
-- provenance values
update public.invitations set paid_source = 'midtrans' where paid_source = 'xendit';
alter table public.refunds drop constraint if exists refunds_method_check;
alter table public.refunds add constraint refunds_method_check
  check (method in ('gateway','manual','chargeback'));
update public.refunds set method = 'gateway' where method = 'xendit';
-- refund_requests: encrypted destination collected at request time (§6)
alter table public.refund_requests add column if not exists destination_enc text;
```

Semantic shift to note in code comments: with Xendit the row stored **their** invoice
id as the query key; with Midtrans the query key is **our** `gateway_order_id`
(status/refund/expire are all keyed by order_id). `gateway_txn_id` (Midtrans
`transaction_id`) is stored from the notification for audit only.

`refunds.destination` (jsonb, currently plaintext bank details) is superseded by
`destination_enc` (AES-GCM via `APP_ENCRYPTION_KEY`, consistent with the project's
bank-leaf encryption). Migration keeps the old column (historical test rows only);
new writes use `destination_enc` exclusively.

## 4. Checkout server actions — `src/app/onboarding/actions.ts`

All four flows (`startCheckout`, `startRenewal`, `startUpgrade`,
`startQuotaAddonCheckout`) change mechanically:

- `createXenditInvoice(...)` → `createSnapTransaction(...)`; store
  `gateway_order_id` (ours) — `gateway_txn_id` is filled later by the webhook.
- Success redirect: Snap `callbacks.finish` = current success URL
  (`/{template}/{slug}/dashboard?paid=1` etc. via `site-url.ts`). Failure/unfinished
  redirect is configured **in the Midtrans dashboard** (Snap settings), not per
  transaction — tutorial §10 covers it. The existing "saya sudah bayar — cek ulang"
  buttons already cover any redirect gap.
- Before minting a replacement order: `expireTransaction(oldOrderId)` (same
  can't-pay-an-abandoned-invoice defence as today).
- All four `recheck*` actions: `getXenditInvoice` → `getTransactionStatus(orderId)`
  with the same verified-amount rule (§5).

## 5. Webhook — `src/app/api/payment/midtrans/webhook/route.ts`

Old Xendit route **deleted**. Midtrans sends ALL lifecycle events (payment, refund,
chargeback) to one **Payment Notification URL** — a single route keeps the current
4-branch structure:

1. **Authenticate**: `verifySignature(body)` (replaces the `x-callback-token` check).
   401 on mismatch.
2. **Re-verify (defence in depth, kept from today)**: on a paid-looking notification,
   re-fetch `GET /v2/{order_id}/status` and require
   `isPaidStatus && grossAmount === expected` (locked `expected_amount_idr` first,
   plan+quota recompute as fallback). If the re-fetch fails, fall back to the
   signature-authenticated body amount — same contract as today.
3. **Route by `transaction_status`**:
   - `settlement` / `capture+accept` → branch on order_id prefix:
     `inv_` publish · `ren_` extend period · `upg_` apply upgrade · `qta_` apply quota.
     Also persist `gateway_txn_id` + `paid_channel` (= body `payment_type`) on the
     source row — §6 depends on the channel being captured here.
   - `refund` / `partial_refund` → match `refunds` row by `gateway_refund_id`
     (or by order_id → source), `settleRefund` (idempotent CAS, unchanged).
   - `chargeback` (dispute) → existing chargeback branch: insert `method='chargeback'`
     refund + `settleRefund` + admin log. Never double-nets (`sourceHasOpenRefund`).
   - `pending` / `deny` / `cancel` / `expire` → ACK only.
4. Always ACK 200 for authenticated-but-unappliable events (owner self-serves via
   recheck) — unchanged.

## 6. Refunds — channel-aware best practice (owner-requested)

**Constraint:** Midtrans API refunds work ONLY for credit_card, gopay, shopeepay,
dana, ovo, qris, kredivo, akulaku. **Bank transfer / VA has NO API refund.**
E-wallet/QRIS refunds also draw from the merchant's **available Midtrans balance**
and can fail when it's short. The design makes the unavailable path a first-class
flow, not an error:

**(a) Know the channel upfront.** `paid_channel` is captured at PAID-webhook time
(§5). `canApiRefund(paid_channel)` decides the route — the admin is never shown a
button that is guaranteed to fail.

**(b) Two explicit admin routes** (`/admin/payments` refund action):
- API-refundable → **"Refund via Midtrans"**: insert `refunds` row
  (`method='gateway'`, `status='pending'`, fresh `refund_key`) → `createGatewayRefund`
  → confirmation arrives via the `refund` notification → `settleRefund`.
- VA / unknown channel → the SAME action renders as **"Refund manual (transfer)"**:
  `method='manual'`, requires a destination account, admin transfers from their own
  bank, records the transfer reference, marks done → `settleRefund`.

**(c) Collect the destination at request time, not later.** The customer-facing
refund request (`RefundRequestButton`) checks the invitation's `paid_channel`; for
non-API-refundable channels the form additionally requires **bank name + account
number + holder name**, stored AES-GCM-encrypted (`refund_requests.destination_enc`,
`APP_ENCRYPTION_KEY`). Decrypted server-side only, shown to the admin at decision
time. No second round-trip chatting with the customer for bank details.

**(d) Refund-hijack guard (SOP + soft check).** Manual-refund panel displays the
destination holder name next to the payer's account name; the admin dialog requires
an explicit "nama pemilik rekening cocok" confirmation checkbox before enabling the
transfer-done button. (Name matching is human-verified — no fuzzy auto-match.)

**(e) Idempotent retries.** `refund_key` (merchant-minted, stored on the refunds row)
lets a network-failed `createGatewayRefund` be retried for up to 7 days without any
risk of double-refunding. Retry reuses the stored key; a NEW refund attempt after a
`failed` row mints a new key.

**(f) Graceful API-refund failure.** If `createGatewayRefund` rejects (insufficient
balance, channel edge case), the refunds row flips to `method='manual'` +
`status='pending'` with the gateway error recorded in `reason`, and the admin UI
shows the manual route with a plain-language hint ("saldo Midtrans kurang / channel
menolak — lanjutkan via transfer manual"). Money-state invariants are untouched:
entitlement reversal still happens exactly once, at `settleRefund`.

**(g) Unchanged invariants:** one succeeded refund per source (partial unique
index), full refunds only, `settleRefund` CAS guards double-reversal, refund
reverses BOTH money and entitlement (unpublish / plan revert / quota decrement).

## 7. Admin console & ledger sweep

- `transactions.ts`: `TxnSource 'xendit'` → `'midtrans'` (mapping reads
  `paid_source`; `'manual'`/`'comp'` unchanged). UI labels + filter chips follow.
- `ReconcilePanel` / `adminRecheckPayment`: re-query by `gateway_order_id` via
  `getTransactionStatus`.
- `RefundRequestsPanel`: shows `paid_channel` badge + decrypted destination for
  manual-route requests (§6c/d).
- `logAdminAction` actor string `'system (xendit)'` → `'system (midtrans)'`.

## 8. Env, config, scripts, legal, docs

```bash
# removed                    # added
XENDIT_SECRET_KEY=           MIDTRANS_SERVER_KEY=          # server-only (admin.ts discipline)
XENDIT_CALLBACK_TOKEN=       MIDTRANS_IS_PRODUCTION=false  # true at go-live
```
No client key needed (redirect mode has no frontend SDK). Callback-token env dies —
signature verification replaces it.

- `scripts/diag-xendit.mjs` → `scripts/diag-midtrans.mjs` (ping status API with a
  known order id; verify keys). `scripts/mark-paid.mjs`: set `paid_source='manual'`
  logic unchanged; touch only column renames.
- Legal: `TermsContent.tsx` (ID+EN) "**Xendit**" → "**Midtrans**" (§6 Pemesanan;
  Midtrans/GoTo Financial is BI-licensed, statement stays valid).
  `docs/legal/*.md` drafts are superseded — untouched.
- Docs sweep: CLAUDE.md (tech-stack table + payment lifecycle), README operator SOP,
  DEPLOYMENT-CHECKLIST (webhook URL step → Midtrans notification URL), .env.example,
  AUTH-SETUP if it mentions Xendit keys.

## 9. Testing

- **Unit (vitest):** rewrite `xendit-token.test.ts` → `signature.test.ts` (sha512
  vectors, tampered-amount rejection); `xendit-extid.test.ts` → order-id tests
  (**assert ≤ 50 chars** for all four prefixes); webhook route tests re-pointed at
  the new envelope (settlement, capture+accept, capture+challenge NOT paid, refund,
  chargeback, bad signature 401); `canApiRefund` matrix; refund routing (API fail →
  manual flip §6f); onboarding actions tests re-mock `gateway.ts`.
- **E2E happy path (sandbox):** real Snap sandbox checkout with the payment
  simulator — QRIS + VA each: pay → webhook fires (via a tunnel or deployed preview)
  → invitation publishes. VA refund request → manual flow end-to-end.
- **Contract checks at implementation time** (flagged, not assumed): exact
  expire-vs-cancel behaviour per channel; refund notification field shapes
  (`refund_key` echo vs `refund_chargeback_id`); Snap `callbacks.finish` behaviour
  on failed payments.
- Full suite: `npm run test` + `typecheck` + `verify:security` (destination_enc must
  never appear plaintext) + `check:tokens` untouched-CSS sanity.

## 10. Tutorial — Midtrans account + API keys (owner has none yet)

**A. Register (5 min):**
1. Go to **https://dashboard.midtrans.com/register** → sign up with the FinCards
   email → verify email. Business type: **Perorangan / Individual**; business name
   "FinCards"; website `https://www.fincards.land`; category digital goods/services.
2. Registration alone unlocks the **Sandbox** environment immediately — no review
   needed to start integrating.

**B. Get SANDBOX keys (build against these):**
1. Dashboard top-left environment switcher → **Sandbox**.
2. **Settings → Access Keys** → copy **Server Key** (`SB-Mid-server-…`).
   (Client Key exists too — not needed in redirect mode.)
3. `.env.local`: `MIDTRANS_SERVER_KEY=SB-Mid-server-…`, `MIDTRANS_IS_PRODUCTION=false`.

**C. Set the webhook + redirects (sandbox):**
1. **Settings → Configuration** → **Payment Notification URL**:
   `https://<deployed-domain>/api/payment/midtrans/webhook`
   (webhooks can't reach localhost — use the Vercel preview URL or a tunnel for
   local testing).
2. Same page → **Finish/Unfinish/Error Redirect URL**: `https://www.fincards.land`
   (per-transaction `callbacks.finish` overrides Finish per checkout).

**D. Test in sandbox:** run a checkout → Snap page opens → pay with the sandbox
**payment simulator** (test cards / VA / QRIS listed at
https://docs.midtrans.com/docs/testing-payment-on-sandbox) → webhook publishes the
invitation → ledger shows the transaction.

**E. Go LIVE (when ready to take real money):**
1. Dashboard → environment **Production** → complete **activation**: upload KTP +
   first page of the bank book (same name as KTP) + business profile questionnaire.
   Review ≈ **1–3 business days**.
2. After approval: **Settings → Access Keys (Production)** → `Mid-server-…` key →
   set Vercel env `MIDTRANS_SERVER_KEY` (production) + `MIDTRANS_IS_PRODUCTION=true`.
3. Repeat step C's URLs in the **Production** dashboard (sandbox + production have
   separate settings).
4. Smoke-test with one small real payment (DEPLOYMENT-CHECKLIST §8 already requires
   this) and one manual-route refund drill.

## 11. Execution order

1. Owner registers Midtrans + drops sandbox Server Key into `.env.local` (§10 A–B).
2. Code migration lands module-by-module against sandbox (wrapper → DB migration →
   checkout actions → webhook → refunds → admin sweep → docs), tests green per module.
3. End-to-end sandbox verification (§9 E2E) — one module-wide test pass at the end.
4. Production activation + cutover is a 2-env-var flip (§10 E) at go-live; no code.

## Out of scope

- Partial refunds (ledger is full-refund only today — unchanged).
- Snap popup/embedded mode, Core API custom payment UI.
- Payout/disbursement products (gift envelope stays display-only).
- Recurring/auto-renew (product has none).
