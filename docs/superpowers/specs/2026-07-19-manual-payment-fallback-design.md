# Manual-payment fallback + admin payment-mode switch

> Date: 2026-07-19 (redesigned same day after image-driven clarification)
> Status: Approved decisions, ready for plan
> Related: [2026-07-14-midtrans-migration-design.md](2026-07-14-midtrans-migration-design.md)
> (the gateway path this branches around); [2026-07-08-beli-undangan-plans-popup-design.md](2026-07-08-beli-undangan-plans-popup-design.md)
> (the marketing PlansModal / VibePlanCard "Choose this plan" this reroutes);
> [2026-07-03-pricing-source-unify-editor-design.md](2026-07-03-pricing-source-unify-editor-design.md)
> (the `template_plans` DB→display + admin-editor + `revalidateTag` pattern this clones for `app_settings`).

## Goal

Add a **global payment-mode switch** the operator flips in `/admin`:

- **`gateway`** (default) — today's behaviour: every "pay/checkout" action goes through Midtrans Snap. Zero change.
- **`manual`** — a **screenshot-and-transfer** fallback for the worst case where Midtrans never approves the business account. Buying no longer touches the gateway; instead the buyer's order (plan + all their invitation details) is sent to the operator over **WhatsApp or Email**, and the operator processes it by hand: enter the data in the admin console, ask for a bank transfer, activate on proof of payment.

Flipping back to `gateway` is one click in `/admin` — **no code change, no redeploy** — and the current Midtrans flow resumes untouched.

## Why (verified current state, 2026-07-19)

- **No global-settings mechanism exists.** grep for `app_settings`/`site_settings`/`admin_settings` → none; confirmed against the graphify graph. The switch needs a new store.
- **The gateway is the ONLY pay path today.** Four server actions in `src/app/onboarding/actions.ts` each mint a Midtrans Snap transaction and return `{ ok, invoiceUrl }`:
  `startCheckout` (L202), `startRenewal` (L339), `startUpgradeCheckout` (L451), `startQuotaAddonCheckout` (L573).
- **The buyer's data-entry form already exists** — `src/app/onboarding/OnboardingForm.tsx`. The operator's screenshot of the desired popup **is that exact form**: dashboard-language toggle, bride's name, groom's name, event date & time (`datetime-local`), location/venue, invitation URL (`weddingsite/<slug>` with a live availability hint), and the guest-count `QuotaStepper` ("Includes 300"). Its current submit = `completeOnboarding` (requires auth, inserts a draft) → `startCheckout` (Midtrans). The manual popup reuses these fields but swaps the submit.
- **Checkout call sites (the complete reroute set):**
  | # | File | Trigger | Today |
  |---|---|---|---|
  | A | `src/components/marketing/VibePlanCard.tsx` (via `PlansModal`) | "Choose this plan" | link → `/onboarding?...` |
  | B | `src/app/onboarding/OnboardingForm.tsx:106` | end of onboarding | `completeOnboarding`+`startCheckout` |
  | C | `src/app/[template]/[slug]/dashboard/PaymentGate.tsx:49` | "Bayar Dulu" / "Perpanjang" | `startCheckout` / `startRenewal` |
  | D | `src/app/[template]/[slug]/dashboard/DashboardClient.tsx:71` | unpaid banner | `startCheckout` |
  | E | `src/app/[template]/[slug]/dashboard/GuestbookLocked.tsx:35` | upgrade to Premium | `startUpgradeCheckout` |
  | F | `src/app/[template]/[slug]/dashboard/GuestsTab.tsx:79` | add guest-quota block | `startQuotaAddonCheckout` |
  | G | `src/app/profile/RenewButton.tsx:42` | renew / pay from profile | `startRenewal` / `startCheckout` |
- **Reusable assets already in the repo (do NOT rewrite):**
  - `buildWhatsAppUrl({ phoneE164, message })` — `src/lib/guests/whatsapp.ts`, tested. `wa.me/<phone>?text=` (direct chat) or `wa.me/?text=` (picker). Reuse verbatim.
  - `safeExternalUrl(raw)` — `src/lib/safeUrl.ts`, tested. Allowlists `http(s)`/`mailto:`/`tel:`/`wa.me`. Wrap every outbound link.
  - `template-plans.ts` — the exact `unstable_cache` + `TAG` + admin-write + `revalidateTag` pattern to clone for settings.
  - `QuotaStepper`, `quota.ts` (`quotaAddonAmount`, `formatIDR`, `QUOTA_CAP`, `clampQuotaExtra`, `DEFAULT_BASE_QUOTA`) — client-safe; reuse for the popup's guest field + price math.
  - Admin plumbing: `requireAdmin` (`src/lib/admin/is-admin.ts`), `logAdminAction` (`src/lib/admin/log.ts`), `AdminDialogProvider` + `FeedbackProvider` (already in `src/app/admin/layout.tsx`).
- **Business contacts already in the codebase** (found, not asked): WhatsApp **`0851-1055-3938`** (`TermsContent.tsx` = "the live FinCards business line"), Email **`fincardsland@gmail.com`** (Terms/Refund/Privacy). International WA = **`6285110553938`**.

## Approved decisions

1. **Store = new DB table `app_settings` (approach A).** Key/value, cached like `template_plans`. In-app toggle, instant effect, no redeploy.
2. **Manual-mode "Choose this plan" = a data-entry popup, same for everyone (logged in or not).** Clicking a plan opens a modal with the onboarding fields. The buyer fills them, then a **Lanjutkan / Continue** button (NOT "Bayar/Pay" — no payment happens here) hands off to **WhatsApp or Email** carrying a message that includes **every field they typed** plus the chosen plan + price.
3. **The popup creates NO draft and requires NO login.** The typed data travels only inside the WA/email message; the operator re-enters it manually in `/admin/invitations/new`. (This is what keeps the flow login-free and simple.)
4. **Payment instruction (bank transfer) is handled by the operator in chat** — v1 adds **no** bank-account field. The message contains the order details only; the operator replies with the rekening, receives proof, and activates the invitation manually.
5. **Channels = WhatsApp + Email, buyer picks.** Email also gets a **"Salin" (copy) fallback** (address + message text) so it works even if the device has no `mailto:` handler.
6. **Scope = ALL pay touchpoints (A–G).** Two shapes:
   - **New purchase (A, B)** — buyer has no invitation yet → the **data-entry popup** (reused onboarding fields) → WA/email with the full order.
   - **Existing invitation (C–G)** — a logged-in owner whose data + slug already exist → a **simple contact modal** (no form) → WA/email with `slug` + transaction kind. The operator finds the row and marks it paid / renews / upgrades / adds quota.
7. **Switch is global** (whole site, all templates); Midtrans approval is account-wide.
8. **Seed `payment_mode='gateway'`** + seed the real WA/email so nothing changes until the operator flips, and the panel is pre-filled.

## Architecture

```
   /admin/payments ── PaymentModeCard ── updatePaymentSettings()
                                            │ upsert app_settings · logAdminAction · revalidateTag
                                            ▼
                        app_settings ── getPaymentSettings()  (unstable_cache 60s, tagged)
                                            │  { mode, whatsapp, email }
        ┌───────────────────────────────────┴───────────────────────────────────┐
        ▼ mode === 'manual'                                                       ▼ mode === 'gateway'
  NEW PURCHASE (A marketing, B onboarding)          EXISTING INV (C–G)      unchanged: startCheckout/…
    open <ManualOrderModal>                            open <ManualPayModal>  → Midtrans Snap
      = <InvitationDetailsForm> (reused onboarding       = WA/Email buttons,
        fields, NO draft, NO auth)                         message from slug + kind
      → Lanjutkan → WA/Email with FULL order
                        │
                        ▼
        buildManualMessage(ctx, settings, dict) → buildWhatsAppUrl + mailto (+ copy),
        all via safeExternalUrl · encodeURIComponent
```

The gateway branch is **purely additive**: each call site becomes `if (mode === 'manual') openModal() else <existing checkout>`. Flipping back to `gateway` restores today's code path exactly.

## Data model

**Migration** `supabase/migrations/2026-07-19_app_settings.sql`:

```sql
create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app_settings (key, value) values
  ('payment', jsonb_build_object(
     'mode', 'gateway',
     'whatsapp', '6285110553938',
     'email', 'fincardsland@gmail.com'
  ))
on conflict (key) do nothing;
```

No anon access; read/write only via the service-role admin client. Update the "base + migrations" note in the schema gotcha.

## Pieces

1. **NEW `src/lib/payments/payment-settings.ts`** (`server-only`) — `PaymentSettings` `{ mode: 'gateway' | 'manual'; whatsapp: string; email: string }`; `PAYMENT_SETTINGS_TAG = 'payment-settings'`; `getPaymentSettings()` in `unstable_cache` (60s, tagged), safe `gateway` default if the row/keys are missing. Mirrors `template-plans.ts`.

2. **NEW `src/lib/payments/manual-pay.ts`** (client-safe) —
   - `ManualPayContext` = `{ kind: 'new' | 'pay-draft' | 'renew' | 'upgrade' | 'quota'; templateLabel: string; planName: string; priceLabel: string; guestTotal?: number; bride?: string; groom?: string; dateLabel?: string; venue?: string; slug?: string; lang?: 'id' | 'en' }`.
   - `buildManualMessage(ctx, dict)` → `{ plain, emailSubject }` — pure assembly from the i18n `manualPay` slice. `kind:'new'` renders the full multi-line order (all typed fields); `kind:'pay-draft'|'renew'|'upgrade'|'quota'` renders slug + kind + plan.
   - `buildManualLinks(settings, ctx, dict)` → `{ waUrl, mailtoUrl, emailAddress, copyText }` — WA via `buildWhatsAppUrl({ phoneE164: settings.whatsapp || null, message: plain })`; `mailtoUrl` = `mailto:<email>?subject=…&body=…` (encoded); `copyText` = plain (for the email "Salin" fallback). Every URL through `safeExternalUrl`.

3. **NEW `src/components/onboarding/InvitationDetailsForm.tsx`** (`'use client'`) — **extracted** from `OnboardingForm` (the field UI + state: language toggle, bride, groom, date, venue, slug + advisory availability hint, `QuotaStepper`, live price). Props: `{ dict, lang, plan, planPrice, planBase, lockedTemplate?, templateLabel, footer, onValuesChange? }`. Renders the fields + a caller-supplied `footer`. **`OnboardingForm` is refactored to consume it** with its existing Midtrans submit as the footer — behaviour unchanged in gateway mode. (If `checkSlugAvailable` needs auth, the hint is simply skipped in the anon popup; slug uniqueness is re-validated at manual admin creation anyway.)

4. **NEW `src/components/payments/ManualOrderModal.tsx`** (`'use client'`) — the **new-purchase** popup (call sites A, B in manual mode). Portal + `role="dialog"` + Esc/backdrop/focus/scroll-lock (Lenis `stop()` + `data-lenis-prevent` on marketing), modeled on `LegalModal`. Header = plan + price summary; body = `<InvitationDetailsForm lockedTemplate=…>`; footer = **Lanjutkan ke WhatsApp** / **Lanjutkan ke Email** (id) · **Continue on WhatsApp** / **Continue via Email** (en) — disabled until required fields valid — + the email "Salin" fallback. On click → `buildManualLinks` → open `waUrl` / `mailtoUrl` (`_blank`), then show a short "kami akan menghubungimu" confirmation.

5. **NEW `src/components/payments/ManualPayModal.tsx`** (`'use client'`) — the **existing-invitation** contact modal (call sites C–G in manual mode). No form: title + one-line note + WhatsApp / Email buttons (+ copy) built from `slug` + `kind`. Same shell primitives as #4.

6. **EDIT the 7 call sites** — each server page passes `paymentMode` (+ `manualContact` settings, + template/plan/slug context). Branch:
   - **A `VibePlanCard`** — manual: "Choose this plan" opens `ManualOrderModal` (plan+guests from the card); gateway: unchanged link.
   - **B `OnboardingForm`** — manual: its footer submit calls `buildManualLinks` (no `completeOnboarding`, no `startCheckout`); gateway: unchanged.
   - **C–G** — manual: open `ManualPayModal` with the matching `kind` (+ slug); gateway: existing `startX` runs unchanged.

7. **EDIT server pages to read + pass settings:** `src/app/page.tsx` (marketing — add `getPaymentSettings()` to the existing `Promise.all`; pass `paymentMode` + `manualContact` through `VibeExploration` → `PlansModal` → `VibePlanCard`), `src/app/onboarding/page.tsx`, `src/app/[template]/[slug]/dashboard/page.tsx` (→ PaymentGate/DashboardClient/GuestbookLocked/GuestsTab), `src/app/profile/page.tsx` (→ RenewButton).

8. **NEW admin `PaymentModeCard` + `updatePaymentSettings()`:**
   - `src/app/admin/payments/page.tsx` renders `PaymentModeCard` (reads `getPaymentSettings()`) above the transactions/refunds UI.
   - `PaymentModeCard.tsx` (`'use client'`) — segmented `[ Gateway (Midtrans) | Manual (WA/Email) ]` + WhatsApp + Email inputs (required when `manual`); Save via server action; `FeedbackProvider` toast. Uses `src/components/ui/` controls.
   - `updatePaymentSettings()` in `src/app/admin/payments/actions.ts` — `requireAdmin` → validate (mode enum; whatsapp digits, normalize `0…`→`62…`; email format) → upsert `app_settings('payment')` → `logAdminAction('payment_settings.update', …)` → `revalidateTag(PAYMENT_SETTINGS_TAG)` + `revalidatePath('/')`.

9. **EDIT i18n** `src/lib/i18n/dictionaries/` — new `manualPay` slice (id + en, parity-tested): modal titles/notes, `waButton`, `emailButton`, `copyButton`, confirmation text, and the message templates (`new` = full order with `{{plan}}/{{price}}/{{template}}/{{bride}}/{{groom}}/{{date}}/{{venue}}/{{slug}}/{{guests}}/{{lang}}`; `pay-draft`/`renew`/`upgrade`/`quota` = `{{slug}}/{{plan}}` variants) + `emailSubject` per kind.

## Message templates (v1, bilingual)

- **`new` (marketing/onboarding popup):**
  ```
  Halo FinCards, saya mau beli undangan:
  • Paket: {{plan}} ({{price}})
  • Template: {{template}}
  • Mempelai: {{bride}} & {{groom}}
  • Tanggal: {{date}}
  • Lokasi: {{venue}}
  • URL: weddingsite/{{slug}}
  • Jumlah tamu: {{guests}}
  • Bahasa dashboard: {{lang}}
  ```
- **`pay-draft`:** "Halo FinCards, saya mau menyelesaikan pembayaran undangan {{slug}} (paket {{plan}})."
- **`renew` / `upgrade` / `quota`:** same opener, swap the action ("perpanjang" / "upgrade ke Premium" / "tambah kuota tamu untuk") + `{{slug}}`.

Email uses the same body + a per-kind `emailSubject`.

## Safety invariants

- **Gateway path untouched.** `startCheckout`/`startRenewal`/`startUpgradeCheckout`/`startQuotaAddonCheckout`, `gateway.ts`, the Midtrans webhook, `plans.ts`, `quota.ts`, `publish.ts`, `completeOnboarding` — **zero edits**. Manual mode never fabricates a paid state; activation stays a deliberate operator action.
- **Popup is anon + read-only server-side.** It writes nothing to the DB; it only reads public plan/template display data already on the marketing page and assembles a client-side link. No new anon write surface, no draft-spam vector.
- **No secrets client-side.** `manual-pay.ts` is pure; WA/email are public business contacts.
- **Link hardening.** Every href through `safeExternalUrl`; WA text + mailto fields `encodeURIComponent`-escaped (newlines → `%0A`).
- **Minimal footprint.** Only what the buyer typed + the public slug enter a link; no account PII is auto-attached.
- **Admin write** = `requireAdmin` + validation + `logAdminAction`.
- **Default-safe.** Seed `gateway`; a missing/corrupt settings row falls back to `gateway`, never to a silent free-publish.

## Testing

- **Unit:** `buildManualMessage` (`new` full-order + each existing-invitation kind, id/en), `buildManualLinks` (WA hybrid, mailto, copyText, `safeExternalUrl`), `updatePaymentSettings` validator (mode enum, phone normalize `0851…`→`6285…`, email), `getPaymentSettings` mapping + default fallback.
- **Integration:** `updatePaymentSettings` upserts + `revalidateTag` + `logAdminAction` (supabaseFake).
- **i18n:** dict-parity covers the `manualPay` slice.
- **Manual / browser:** flip to `manual` → "Choose this plan" opens the data popup, filling all fields then Lanjutkan/Continue builds a WA/email message containing every field; C–G open the slug-only modal; email "Salin" copies. Flip back to `gateway` → onboarding→Midtrans and all of A–G behave exactly as before. Both languages; Lenis scroll-lock on marketing; `OnboardingForm` gateway path unchanged after the `InvitationDetailsForm` extraction.
- **Gates:** `npm run typecheck`, `npm run test`, `npm run check:tokens`, dict-parity.

## Out of scope (v1)

- Auto-creating a draft from the popup (decided: message-only, manual admin entry).
- A bank-account/rekening field or an in-app payment-proof upload / status tracker (operator handles transfer + proof in chat).
- Admin-editable free-text message templates (hardcoded bilingual strings suffice).
- Any change to onboarding draft creation for the gateway path, the quota/plan math, or the Midtrans webhook.
- A dedicated `/admin/settings` module (the card lives on `/admin/payments`; extract later if more settings appear).

## Operator steps

1. Apply `2026-07-19_app_settings.sql` (seeds `gateway` + real WA/email).
2. Activate the fallback: `/admin/payments` → **Mode Pembayaran** → **Manual** → confirm WA/email → Save. Immediate.
3. Per sale: read the WhatsApp/email order → create the invitation in `/admin/invitations/new` → reply with rekening → on proof, activate.
4. When Midtrans is approved: switch back to **Gateway**. Done.
