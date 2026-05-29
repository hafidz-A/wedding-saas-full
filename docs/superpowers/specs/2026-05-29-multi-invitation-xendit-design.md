# Multi-Invitation + Xendit Payment — Design

**Date:** 2026-05-29
**Status:** Approved (proceeding to plan + build)
**Covers roadmap:** W6 (many invitations per account + My Template) and W7 (Xendit purchase, draft-first).

---

## Decisions (confirmed)

- **Draft-first:** onboarding creates the invitation as an unpaid draft; payment publishes it.
- **Pay right after onboarding:** on submit → create draft → redirect to the Xendit invoice → webhook publishes → land on dashboard.
- **Plans (placeholder, editable):** Basic `Rp 149.000`, Premium `Rp 299.000`. Each template carries its own plans in `templateCatalog.js`.
- **Expiry:** Basic → `expires_at = paid_at + 1 year`. Premium → lifetime (`expires_at = null`).
- **Many invitations per account:** remove the 1-user-1-invitation rule.
- **Xendit test mode:** `XENDIT_SECRET_KEY` (test) + `XENDIT_CALLBACK_TOKEN` supplied via `.env.local`.
- **Masa aktif shown** on the profile (My Template) list and on the dashboard.

---

## Data model — migration `supabase/migrations/2026-05-29_payments.sql`

Add to `public.invitations`:
- `is_paid boolean not null default false`
- `xendit_invoice_id text` — Xendit's invoice id (from create response)
- `xendit_external_id text` — our reference; webhook looks the row up by this
- `paid_at timestamptz`
- (`expires_at`, `plan`, `is_published` already exist.)

Add `create index if not exists idx_invitations_xendit_external on public.invitations (xendit_external_id);`

No constraint to drop for multi-invitation — `owner_user_id` is not unique, so the DB already allows N rows per user. The 1:1 limit is purely application logic.

The migration is applied by the user in the Supabase SQL editor (remote DB; not runnable from the repo). Code referencing new columns is unaffected at typecheck time because Supabase queries are cast to `any` in this codebase.

---

## Plan resolution — `src/lib/payments/plans.ts` (pure, tested)

`templateCatalog.js` plans gain `amountIDR` (basic 149000, premium 299000) and a display `price`.

```ts
export interface ResolvedPlan { planId: string; amountIDR: number; expiresAt: (paidAtMs: number) => string | null }
export function resolvePlan(templateId: string, planId: string): ResolvedPlan | null
```
- Looks up the plan on the catalog entry.
- `expiresAt`: basic → ISO string of `paidAt + 365 days`; premium → `null` (lifetime).
- Returns `null` for unknown template/plan (caller rejects).

## Active-period display — `src/lib/payments/active-period.ts` (pure, tested)

```ts
type Status = 'draft' | 'lifetime' | 'active' | 'expired'
export function activePeriodStatus(inv: { is_paid?: boolean; expires_at?: string | null }, nowMs: number): { status: Status; expiresAt: string | null }
```
Used by both profile and dashboard. The component formats the label from `status` + localized strings (e.g. ID: "Draf — belum dibayar", "Aktif sampai 15 Nov 2027", "Aktif seumur hidup", "Kadaluarsa").

---

## Flow

1. Flip card "Pilih plan" → `/onboarding?template=<id>&plan=<planId>`.
2. `OnboardingForm` reads `plan` (default `basic` if missing/invalid), passes it to `completeOnboarding`.
3. `completeOnboarding` (in `actions.ts`):
   - **Remove** the "already owns an invitation → return it" short-circuit.
   - Validate `plan` against the chosen template's catalog plans.
   - Insert DRAFT: `is_paid=false, is_published=false, plan=<planId>`, plus the seeded config (unchanged).
   - Return `{ ok, invitationId, slug, template }`.
4. On success the client calls server action `startCheckout(invitationId)`:
   - Loads the invitation (verify caller owns it via session).
   - `resolvePlan` → amount. Build `externalId = inv_<id>_<timestamp>`.
   - `createXenditInvoice(...)` (raw fetch). Save `xendit_invoice_id`, `xendit_external_id` on the row.
   - Return `{ invoiceUrl }`. Client `window.location.href = invoiceUrl`.
5. **Webhook** `POST /api/payment/xendit/webhook`:
   - Verify header `x-callback-token === XENDIT_CALLBACK_TOKEN` (constant-time compare). Reject 401 otherwise.
   - On body `status === 'PAID'`: find row by `xendit_external_id`; set `is_paid=true, is_published=true, paid_at=now, expires_at=resolvePlan(...).expiresAt(now)`. Idempotent (ignore if already paid).
6. Xendit `success_redirect_url = <SITE_URL>/<template>/<slug>/dashboard?paid=1`; `failure_redirect_url = <SITE_URL>/<template>/<slug>/dashboard?payment=failed`.

`onboarding/page.tsx`: remove the redirect-to-existing-owner so a logged-in user can create another invitation.

## Xendit integration — `src/lib/payments/xendit.ts`

- `createInvoice({ externalId, amountIDR, payerEmail, description, successUrl, failureUrl })` → POST `https://api.xendit.co/v2/invoices` with `Authorization: Basic base64(SECRET_KEY + ':')`. Returns `{ id, invoice_url }`.
- `isValidCallbackToken(received)` pure helper (tested) comparing against `XENDIT_CALLBACK_TOKEN`.
- Env: `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`, reuse `NEXT_PUBLIC_SITE_URL` for redirect URLs.

## Gating + display

- **Public page** already hides drafts (`!is_published → notFound`). Add: if `expires_at` is set and in the past → treat as not published (notFound / expired). 
- **Dashboard** (`DashboardClient`): when `!is_paid`, show a banner "Belum dibayar — Bayar sekarang" whose button calls `startCheckout` and redirects to Xendit (covers abandoned payment / retry). Also show masa-aktif label.
- **Profile / My Template**: each invitation row shows a status chip (Draft / Aktif sampai <date> / Seumur hidup / Kadaluarsa).

## Local test-mode caveat

Invoice creation + redirect to Xendit's test invoice page work locally (outbound). The **inbound webhook can't reach `localhost`**. To test the full PAID transition locally:
- (a) Tunnel: run cloudflared/ngrok, set the webhook URL in the Xendit dashboard → real webhook fires; OR
- (b) Simulate: `curl -X POST localhost:3000/api/payment/xendit/webhook -H "x-callback-token: <TOKEN>" -H "content-type: application/json" -d '{"status":"PAID","external_id":"<the externalId>"}'`.

The plan includes the exact curl.

## Testing

- Unit: `resolvePlan` (amounts, expiry per plan, unknown → null), `activePeriodStatus` (draft/active/lifetime/expired), `isValidCallbackToken`.
- Manual/integration: invoice creation (needs test key), webhook PAID transition (tunnel or curl), multi-invitation creation, gating.

## Out of scope (later)

Custom-domain plan tier, refunds/cancellations, plan upgrades, email receipts, real prices/feature-gating beyond publish, dunning for expired invitations.

## Risks

- **Webhook reachability locally** — mitigated by the curl simulation.
- **Redirect vs webhook race** — `?paid=1` redirect may arrive before the webhook; dashboard reads live `is_paid`, so it self-corrects on next load. Don't trust the query param as proof of payment.
- **Secret hygiene** — `XENDIT_SECRET_KEY` only in server (`xendit.ts` / route / action), never in a client file.
