# Manual-payment fallback + admin payment-mode switch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global `gateway`|`manual` payment-mode switch in `/admin`; in `manual` mode every buy CTA hands off to WhatsApp/Email (a data-entry popup for new purchases, a slug-only contact modal for existing invitations) instead of Midtrans, with the gateway path left byte-for-byte unchanged for one-click flip-back.

**Architecture:** A new `app_settings` DB row (`payment`) is read server-side via a cached `getPaymentSettings()` (clone of `template-plans.ts`) and written by an admin action. Each of the 7 checkout call sites and their server pages gain a `paymentMode` prop and branch: `manual` opens a shared client-side modal that builds a `wa.me`/`mailto:` link (reusing `buildWhatsAppUrl` + `safeExternalUrl`); `gateway` runs the existing `startX` server action untouched.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase (Postgres), CSS Modules + CSS variables, vitest, i18n id/en dictionaries. Full context: [../specs/2026-07-19-manual-payment-fallback-design.md](../specs/2026-07-19-manual-payment-fallback-design.md).

## Global Constraints

- **No new UI libs.** CSS Modules + CSS variables only. No Tailwind/shadcn/MUI/styled-components.
- **`'use client'`** on every component/hook file; server components only for `page.tsx`/`layout.tsx`/`route.ts`; `'use server'` for actions. Use `process.env`, never `import.meta.env`.
- **Design tokens:** snap radii/heights to `src/styles/tokens.css` scales (`--radius-*`, control heights `--ctl-h*`). New buttons/inputs/dialogs MUST use `src/components/ui/` (`<Button>`, `<ButtonLink>`, `controls.module.css`) — do not hand-roll inline-styled controls. `npm run check:tokens` must pass.
- **i18n parity:** every new key exists in BOTH `id` and `en`; `npm run test` includes a dict-parity test.
- **Secrets discipline:** never reference `SUPABASE_SERVICE_ROLE_KEY`/encryption keys from a `'use client'` file. `getPaymentSettings` (server-only) uses the admin client; the client modal receives only `{ whatsapp, email }` (public business contacts).
- **Reuse, do not rewrite:** `buildWhatsAppUrl` (`src/lib/guests/whatsapp.ts`), `safeExternalUrl` (`src/lib/safeUrl.ts`), `template-plans.ts` cache pattern, `QuotaStepper` + `src/lib/payments/quota.ts` helpers, admin `requireAdmin`/`logAdminAction`.
- **Gateway path is untouchable:** do NOT edit `startCheckout`/`startRenewal`/`startUpgradeCheckout`/`startQuotaAddonCheckout` bodies, `gateway.ts`, the Midtrans webhook, `plans.ts`, `quota.ts`, `publish.ts`, or `completeOnboarding`.
- **Business contacts (seed values):** WhatsApp `6285110553938`, Email `fincardsland@gmail.com`.
- **Every task:** consult the graphify graph first (`graphify query "<question>"` from the repo root) to locate files before reading them; then read only what it points to.

---

### Task 1: `app_settings` migration + seed

**Files:**
- Create: `supabase/migrations/2026-07-19_app_settings.sql`
- Modify: `CLAUDE.md` (known-gotcha #1 list of migration-added tables — append `app_settings`)

**Interfaces:**
- Produces: table `app_settings(key text pk, value jsonb, updated_at timestamptz)`, seeded row `key='payment'`, `value={mode:'gateway', whatsapp:'6285110553938', email:'fincardsland@gmail.com'}`.

- [ ] **Step 1: Write the migration**

```sql
-- 2026-07-19_app_settings.sql — global operator settings (key/value).
create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Payment mode switch: 'gateway' (Midtrans) | 'manual' (WhatsApp/Email hand-off).
-- Seeded 'gateway' so behaviour is unchanged until an operator flips it.
insert into app_settings (key, value) values
  ('payment', jsonb_build_object(
     'mode', 'gateway',
     'whatsapp', '6285110553938',
     'email', 'fincardsland@gmail.com'
  ))
on conflict (key) do nothing;

-- No anon access; reads/writes go through the service-role admin client only.
alter table app_settings enable row level security;
```

- [ ] **Step 2: Apply it to the dev Supabase** (operator runs it; agent notes it in the task output — cannot run remote SQL). Verify the row exists: `select * from app_settings where key='payment';`

- [ ] **Step 3: Update `CLAUDE.md`** known-gotcha #1 to mention `app_settings` among migration-added tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-19_app_settings.sql CLAUDE.md
git commit -m "feat(payments): app_settings table + payment-mode seed"
```

---

### Task 2: `getPaymentSettings()` server reader (+ pure parser test)

**Files:**
- Create: `src/lib/payments/payment-settings.ts`
- Create: `src/lib/payments/__tests__/payment-settings.test.ts`

**Interfaces:**
- Produces:
  - `type PaymentMode = 'gateway' | 'manual'`
  - `interface PaymentSettings { mode: PaymentMode; whatsapp: string; email: string }`
  - `const PAYMENT_SETTINGS_TAG = 'payment-settings'`
  - `function parsePaymentSettings(raw: unknown): PaymentSettings` — pure; defaults to `{ mode:'gateway', whatsapp:'', email:'' }` on any missing/invalid field. Exported for testing.
  - `getPaymentSettings(): Promise<PaymentSettings>` — `unstable_cache`, `revalidate: 60`, `tags:[PAYMENT_SETTINGS_TAG]`, reads `app_settings` row `key='payment'` via `createSupabaseAdminClient`, returns `parsePaymentSettings(row?.value)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { parsePaymentSettings } from '../payment-settings'

describe('parsePaymentSettings', () => {
  it('reads a valid manual row', () => {
    expect(parsePaymentSettings({ mode: 'manual', whatsapp: '628', email: 'a@b.com' }))
      .toEqual({ mode: 'manual', whatsapp: '628', email: 'a@b.com' })
  })
  it('defaults to gateway when missing/invalid', () => {
    expect(parsePaymentSettings(null)).toEqual({ mode: 'gateway', whatsapp: '', email: '' })
    expect(parsePaymentSettings({ mode: 'nonsense' }))
      .toEqual({ mode: 'gateway', whatsapp: '', email: '' })
  })
})
```

- [ ] **Step 2: Run test → FAIL** (`npx vitest run src/lib/payments/__tests__/payment-settings.test.ts`)

- [ ] **Step 3: Implement `payment-settings.ts`** — `'server-only'` import, `parsePaymentSettings` pure guard (coerce strings, whitelist `mode`), and the `unstable_cache` reader modeled exactly on `getTemplatePlans` in `template-plans.ts`.

- [ ] **Step 4: Run test → PASS.**

- [ ] **Step 5: Commit** (`feat(payments): getPaymentSettings reader + tag`).

---

### Task 3: `manual-pay.ts` client-safe link/message builder (+ tests)

**Files:**
- Create: `src/lib/payments/manual-pay.ts`
- Create: `src/lib/payments/__tests__/manual-pay.test.ts`

**Interfaces:**
- Consumes: `buildWhatsAppUrl` from `@/lib/guests/whatsapp`; `safeExternalUrl` from `@/lib/safeUrl`; the `manualPay` dict slice type (Task 4) — for decoupling, accept a minimal `ManualPayDict` shape defined in this file and re-used by the dict.
- Produces:
  - `type ManualPayKind = 'new' | 'pay-draft' | 'renew' | 'upgrade' | 'quota'`
  - `interface ManualPayContext { kind: ManualPayKind; templateLabel: string; planName: string; priceLabel: string; guestTotal?: number; bride?: string; groom?: string; dateLabel?: string; venue?: string; slug?: string; lang?: 'id'|'en' }`
  - `interface ManualContact { whatsapp: string; email: string }`
  - `function buildManualMessage(ctx: ManualPayContext, dict: ManualPayDict): { plain: string; emailSubject: string }`
  - `function buildManualLinks(contact: ManualContact, ctx: ManualPayContext, dict: ManualPayDict): { waUrl: string; mailtoUrl: string; emailAddress: string; copyText: string }`
- `ManualPayDict` shape: `{ order: { intro:string; plan:string; template:string; couple:string; date:string; venue:string; url:string; guests:string; lang:string }, existing: Record<'pay-draft'|'renew'|'upgrade'|'quota', string>, subject: Record<ManualPayKind, string> }` (values are label strings; `existing`/`subject` templates use `{{slug}}`/`{{plan}}`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildManualMessage, buildManualLinks, type ManualPayContext } from '../manual-pay'

const dict = {
  order: { intro: 'Halo FinCards, saya mau beli undangan:', plan: 'Paket', template: 'Template',
    couple: 'Mempelai', date: 'Tanggal', venue: 'Lokasi', url: 'URL', guests: 'Jumlah tamu', lang: 'Bahasa' },
  existing: { 'pay-draft': 'Halo FinCards, saya mau menyelesaikan pembayaran undangan {{slug}} (paket {{plan}}).',
    renew: 'perpanjang {{slug}}', upgrade: 'upgrade {{slug}}', quota: 'kuota {{slug}}' },
  subject: { new: 'Pesanan undangan', 'pay-draft': 'Pembayaran {{slug}}', renew: 'Perpanjang {{slug}}',
    upgrade: 'Upgrade {{slug}}', quota: 'Kuota {{slug}}' },
}

const newCtx: ManualPayContext = { kind: 'new', templateLabel: 'Lovebirds', planName: 'Premium',
  priceLabel: 'Rp299.000', guestTotal: 300, bride: 'Apan', groom: 'Apin', dateLabel: '12/08/2026 16:00',
  venue: 'Mason Pine', slug: 'apan-apin', lang: 'en' }

describe('buildManualMessage', () => {
  it('new order includes every typed field', () => {
    const { plain } = buildManualMessage(newCtx, dict as any)
    for (const s of ['Premium', 'Rp299.000', 'Lovebirds', 'Apan', 'Apin', 'Mason Pine', 'apan-apin', '300'])
      expect(plain).toContain(s)
  })
  it('existing-invitation kind fills slug + plan', () => {
    const { plain } = buildManualMessage({ kind: 'pay-draft', templateLabel: '', planName: 'Basic',
      priceLabel: '', slug: 'adi-rani' }, dict as any)
    expect(plain).toContain('adi-rani'); expect(plain).toContain('Basic')
  })
})

describe('buildManualLinks', () => {
  it('builds a safe wa.me url and a mailto', () => {
    const { waUrl, mailtoUrl, emailAddress } = buildManualLinks(
      { whatsapp: '6285110553938', email: 'fincardsland@gmail.com' }, newCtx, dict as any)
    expect(waUrl.startsWith('https://wa.me/6285110553938?text=')).toBe(true)
    expect(mailtoUrl.startsWith('mailto:fincardsland@gmail.com?')).toBe(true)
    expect(emailAddress).toBe('fincardsland@gmail.com')
  })
  it('empty whatsapp → wa.me contact picker', () => {
    const { waUrl } = buildManualLinks({ whatsapp: '', email: 'x@y.com' }, newCtx, dict as any)
    expect(waUrl.startsWith('https://wa.me/?text=')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test → FAIL.**
- [ ] **Step 3: Implement `manual-pay.ts`** — assemble the multi-line `plain` for `new` from `dict.order` + ctx fields (omit blank optional lines); for existing kinds interpolate `{{slug}}`/`{{plan}}` into `dict.existing[kind]`. `buildManualLinks`: `waUrl = safeExternalUrl(buildWhatsAppUrl({ phoneE164: contact.whatsapp || null, message: plain }))`; `mailtoUrl = safeExternalUrl(\`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}\`)`; `copyText = plain`.
- [ ] **Step 4: Run test → PASS.**
- [ ] **Step 5: Commit** (`feat(payments): manual-pay message + link builder`).

---

### Task 4: `manualPay` i18n slice (id + en)

**Files:**
- Create: `src/lib/i18n/dictionaries/manualPay.ts`
- Modify: `src/lib/i18n/index.ts` (register the slice under `id` and `en`)

**Interfaces:**
- Consumes: the `ManualPayDict`-compatible shape from Task 3 plus UI labels.
- Produces: `dict.manualPay` on `Dict`, shape: `{ orderModalTitle, contactModalTitle, note, waButton, emailButton, copyButton, copied, confirm, order:{…}, existing:{…}, subject:{…} }`. Button copy: `waButton` id `'Lanjutkan ke WhatsApp'` / en `'Continue on WhatsApp'`; `emailButton` id `'Lanjutkan ke Email'` / en `'Continue via Email'`; `copyButton` id `'Salin pesan'` / en `'Copy message'`.

- [ ] **Step 1:** Create `manualPay.ts` exporting `{ id: {...}, en: {...} }` with identical key shape in both languages (mirror `onboarding.ts` structure). Fill `order`/`existing`/`subject` with the strings from the spec's "Message templates" section.
- [ ] **Step 2:** Register in `index.ts`: add `manualPay: manualPay.id` and `manualPay: manualPay.en` to the respective blocks; add the import.
- [ ] **Step 3: Run the dict-parity + typecheck**

Run: `npm run test -- i18n` (or the parity test file) and `npm run typecheck`
Expected: PASS (id/en shapes match).

- [ ] **Step 4: Commit** (`feat(i18n): manualPay dictionary slice`).

---

### Task 5: Extract `InvitationDetailsForm` from `OnboardingForm` (gateway behaviour unchanged)

**Files:**
- Create: `src/components/onboarding/InvitationDetailsForm.tsx`
- Modify: `src/app/onboarding/OnboardingForm.tsx` (consume the extracted component; move `searchParams` reading up to the page/this wrapper and pass `template`/`plan`/`extra` as explicit props)

**Interfaces:**
- Produces: `InvitationDetailsForm` props `{ dict: Dict['onboarding']; lang: Lang; plan: string; planBase: number; planPrice: number; templateOptions?: {id,label,accent?,tags?}[]; template: string; onTemplateChange?: (id:string)=>void; lockTemplate?: boolean; extra?: number; onValidChange?: (v: InvitationValues | null)=>void; footer: React.ReactNode }` where `InvitationValues = { template:string; plan:string; slug:string; bride:string; groom:string; date:string; venue:string; guestTotal:number; guestExtra:number; valid:boolean }`. It renders the language toggle, template picker (hidden when `lockTemplate`), bride/groom/date/venue inputs, slug input + advisory availability hint (via `checkSlugAvailable`), `QuotaStepper` + live price, and the caller's `footer`.
- Consumes: `QuotaStepper`, `quota.ts` helpers, `checkSlugAvailable` from onboarding actions, `LangToggle`.

- [ ] **Step 1:** Cut the field JSX + field state (bride/groom/date/venue/slug/slugStatus/guestTotal + the two effects) out of `OnboardingForm` into `InvitationDetailsForm`, driven by props instead of `useSearchParams`. Surface current values via `onValidChange`.
- [ ] **Step 2:** Rewrite `OnboardingForm` to: read `template`/`plan`/`extra` from `useSearchParams` (as today), render `<InvitationDetailsForm …>` with a `footer` = the existing submit `<Button>` calling `completeOnboarding` + `startCheckout` (**gateway behaviour identical**). Keep the `done` panel.
- [ ] **Step 3: Verify gateway onboarding still works** — `npm run typecheck`; start dev server (Browser pane) → `/onboarding?template=lovebirds&plan=premium` → confirm the form renders identically (fields, slug hint, stepper, submit). No behaviour change.
- [ ] **Step 4: Commit** (`refactor(onboarding): extract InvitationDetailsForm`).

---

### Task 6: `ManualOrderModal` — new-purchase popup

**Files:**
- Create: `src/components/payments/ManualOrderModal.tsx`
- Create: `src/components/payments/ManualPay.module.css` (shared by Tasks 6 & 7)

**Interfaces:**
- Consumes: `InvitationDetailsForm` (Task 5), `buildManualLinks`/`ManualPayContext` (Task 3), `dict.manualPay` (Task 4), `ManualContact`.
- Produces: `ManualOrderModal` props `{ contact: ManualContact; dict: Dict['manualPay']; onbDict: Dict['onboarding']; lang: Lang; template: string; templateLabel: string; plan: string; planName: string; planBase: number; planPrice: number; extra?: number; onClose: ()=>void }`.

- [ ] **Step 1:** Build the modal shell modeled on `src/components/legal/LegalModal.tsx` (portal to `document.body`, `role="dialog"`, `aria-modal`, Esc/backdrop close, focus-trap + restore, body-scroll lock; on marketing also `window.__lenis?.stop()` + `data-lenis-prevent`, mirroring the PlansModal approach). Header = `planName` + formatted total price. Body = `<InvitationDetailsForm lockTemplate template={template} …>`. Footer = two `<Button>`s **Lanjutkan ke WhatsApp** / **Lanjutkan ke Email** (disabled until `InvitationValues.valid`) + a `Salin pesan` text button.
- [ ] **Step 2:** On a footer click, assemble `ManualPayContext` (`kind:'new'`, fields from the current `InvitationValues`, `priceLabel` from `formatIDR(planPrice + quotaAddonAmount(extra))`), call `buildManualLinks`, `window.open(waUrl|mailtoUrl, '_blank')`, then show the `dict.confirm` note. Copy button writes `copyText` via `navigator.clipboard` and shows `dict.copied`.
- [ ] **Step 3: Verify** — `npm run typecheck`; `npm run check:tokens` (CSS on-scale). Browser smoke deferred to Task 10 wiring.
- [ ] **Step 4: Commit** (`feat(payments): ManualOrderModal new-purchase popup`).

---

### Task 7: `ManualPayModal` — existing-invitation contact modal

**Files:**
- Create: `src/components/payments/ManualPayModal.tsx` (reuses `ManualPay.module.css`)

**Interfaces:**
- Consumes: `buildManualLinks`/`ManualPayContext` (Task 3), `dict.manualPay` (Task 4).
- Produces: `ManualPayModal` props `{ contact: ManualContact; dict: Dict['manualPay']; kind: 'pay-draft'|'renew'|'upgrade'|'quota'; slug: string; planName: string; guestTotal?: number; onClose: ()=>void }`.

- [ ] **Step 1:** Build the no-form modal (same shell primitives as Task 6): title `dict.contactModalTitle`, `dict.note`, WhatsApp/Email buttons + copy, built from a `ManualPayContext` with the given `kind` + `slug` + `planName`.
- [ ] **Step 2: Verify** `npm run typecheck` + `npm run check:tokens`.
- [ ] **Step 3: Commit** (`feat(payments): ManualPayModal existing-invitation modal`).

---

### Task 8: `updatePaymentSettings` admin action (+ validator test)

**Files:**
- Modify: `src/app/admin/payments/actions.ts` (add the action + an exported pure `validatePaymentPatch`)
- Create/append: `src/app/admin/payments/__tests__/actions.test.ts` (validator cases)

**Interfaces:**
- Produces:
  - `function validatePaymentPatch(input: unknown): { ok: true; value: PaymentSettings } | { ok: false; error: string }` — pure; `mode ∈ {gateway,manual}`; when `manual`, `whatsapp` non-empty digits (normalize leading `0`→`62`, strip non-digits) and `email` matches a basic email regex; `gateway` allows blank contacts.
  - `async function updatePaymentSettings(input): Promise<{ ok: boolean; error?: string }>` — `requireAdmin` → `validatePaymentPatch` → upsert `app_settings('payment', value)` → `logAdminAction('payment_settings.update', { mode })` → `revalidateTag(PAYMENT_SETTINGS_TAG)` + `revalidatePath('/')`.

- [ ] **Step 1: Write the failing validator test**

```ts
import { describe, it, expect } from 'vitest'
import { validatePaymentPatch } from '../actions'

describe('validatePaymentPatch', () => {
  it('normalizes a leading-zero phone to 62', () => {
    const r = validatePaymentPatch({ mode: 'manual', whatsapp: '0851-1055-3938', email: 'a@b.com' })
    expect(r.ok && r.value.whatsapp).toBe('6285110553938')
  })
  it('rejects manual mode with a bad email', () => {
    expect(validatePaymentPatch({ mode: 'manual', whatsapp: '628', email: 'nope' }).ok).toBe(false)
  })
  it('allows gateway with blank contacts', () => {
    expect(validatePaymentPatch({ mode: 'gateway', whatsapp: '', email: '' }).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run test → FAIL.**
- [ ] **Step 3: Implement** `validatePaymentPatch` + `updatePaymentSettings` (mirror the shape of the existing admin actions in this file; import `PAYMENT_SETTINGS_TAG`).
- [ ] **Step 4: Run test → PASS** + `npm run typecheck`.
- [ ] **Step 5: Commit** (`feat(admin): updatePaymentSettings action + validator`).

---

### Task 9: `PaymentModeCard` in `/admin/payments`

**Files:**
- Create: `src/app/admin/payments/PaymentModeCard.tsx`
- Modify: `src/app/admin/payments/page.tsx` (render the card above existing content, passing `getPaymentSettings()`)

**Interfaces:**
- Consumes: `getPaymentSettings` (Task 2), `updatePaymentSettings` (Task 8), `src/components/ui/` controls, `FeedbackProvider` (already in admin layout).
- Produces: an admin UI card — segmented `[ Gateway (Midtrans) | Manual (WA/Email) ]` toggle + WhatsApp + Email inputs (required + shown when `manual`); Save calls `updatePaymentSettings`, toasts success/error.

- [ ] **Step 1:** `page.tsx` reads `const settings = await getPaymentSettings()` and renders `<PaymentModeCard initial={settings} />` above the transactions section.
- [ ] **Step 2:** `PaymentModeCard.tsx` (`'use client'`) — segmented control + inputs from `controls.module.css`, `<Button>` save via `useTransition`, `useFeedback()` toast. On-token styling.
- [ ] **Step 3: Verify** — `npm run typecheck` + `npm run check:tokens`; Browser: `/admin/payments` → toggle to Manual, edit WA/email, Save → toast; refetch shows persisted values; toggle back to Gateway → Save.
- [ ] **Step 4: Commit** (`feat(admin): payment-mode card on /admin/payments`).

---

### Task 10: Wire marketing "Choose this plan" → `ManualOrderModal`

**Files:**
- Modify: `src/app/page.tsx` (add `getPaymentSettings()` to the `Promise.all`; pass `paymentMode` + `manualContact` to `VibeExploration`)
- Modify: `src/components/marketing/VibeExploration.tsx` (thread props to `PlansModal`)
- Modify: `src/components/marketing/PlansModal.tsx` (thread props to `VibePlanCard`)
- Modify: `src/components/marketing/VibePlanCard.tsx` (manual → open `ManualOrderModal`; gateway → existing link)

**Interfaces:**
- Consumes: `getPaymentSettings` (Task 2), `ManualOrderModal` (Task 6), `dict.manualPay` + `dict.onboarding`.

- [ ] **Step 1:** `page.tsx` — add settings to the existing `Promise.all([getAllTemplatePlans(), getTemplates()])`; pass `paymentMode={settings.mode}` and `manualContact={{ whatsapp, email }}` into `<VibeExploration>`. Thread through `VibeExploration` → `PlansModal` → `VibePlanCard` (add props, no logic change when `gateway`).
- [ ] **Step 2:** In `VibePlanCard`, when `paymentMode==='manual'`, render the "Choose this plan" CTA as a `<button>` that sets local `orderOpen` state and renders `<ManualOrderModal template={…} templateLabel={…} plan={plan.id} planName={plan.displayName} planBase={plan.baseQuota} planPrice={plan.amountIDR} extra={chosenExtra} contact={manualContact} … />`. When `gateway`, keep today's `/onboarding?...` link exactly.
- [ ] **Step 3: Verify (browser)** — dev server: home → open plans (Lovebirds & Solary). Gateway mode: CTA still links to `/onboarding`. Flip to Manual in `/admin/payments`, reload home: CTA opens the popup; fill fields → Lanjutkan ke WhatsApp opens `wa.me/6285110553938?text=…` with all fields; Email opens mailto; Salin copies. Lenis scroll stays locked while open.
- [ ] **Step 4: Commit** (`feat(marketing): manual-mode plan CTA opens order popup`).

---

### Task 11: Wire onboarding page manual branch

**Files:**
- Modify: `src/app/onboarding/page.tsx` (read + pass `paymentMode` + `manualContact` + `manualPay`/labels)
- Modify: `src/app/onboarding/OnboardingForm.tsx` (in manual mode, footer becomes the WhatsApp/Email hand-off instead of `completeOnboarding`+`startCheckout`)

**Interfaces:**
- Consumes: `getPaymentSettings`, `buildManualLinks` (Task 3), `dict.manualPay`.

- [ ] **Step 1:** `page.tsx` — `const settings = await getPaymentSettings()`; pass `paymentMode` + `manualContact` + `t.manualPay` to `OnboardingForm`.
- [ ] **Step 2:** `OnboardingForm` — when `paymentMode==='manual'`, the footer renders **Lanjutkan ke WhatsApp / Email** buttons (disabled until valid) that build a `kind:'new'` `ManualPayContext` from the current `InvitationValues` and open the link (no DB write). When `gateway`, unchanged.
- [ ] **Step 3: Verify** — `npm run typecheck`; browser `/onboarding?...`: gateway → Midtrans submit unchanged; manual → hand-off buttons produce the full-order message.
- [ ] **Step 4: Commit** (`feat(onboarding): manual-mode WhatsApp/Email hand-off`).

---

### Task 12: Wire existing-invitation flows (dashboard + profile) → `ManualPayModal`

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/page.tsx` (read settings; pass `paymentMode` + `manualContact` + `t.manualPay` to the four dashboard consumers)
- Modify: `PaymentGate.tsx` (C), `DashboardClient.tsx` (D), `GuestbookLocked.tsx` (E), `GuestsTab.tsx` (F)
- Modify: `src/app/profile/page.tsx` + `src/app/profile/RenewButton.tsx` (G)

**Interfaces:**
- Consumes: `getPaymentSettings`, `ManualPayModal` (Task 7), the row's `slug` + plan (already in scope on these pages).

- [ ] **Step 1:** In each consumer, add `paymentMode` + `manualContact` props. When `manual`, the pay/renew/upgrade/quota button opens `<ManualPayModal kind=… slug=… planName=… />` instead of calling `startX`. When `gateway`, the existing `startX` transition runs unchanged. `kind` mapping: PaymentGate draft=`pay-draft`/expired=`renew`; DashboardClient banner=`pay-draft`; GuestbookLocked=`upgrade`; GuestsTab=`quota`; RenewButton=`renew`(paid/expired) / `pay-draft`(unpaid).
- [ ] **Step 2:** `dashboard/page.tsx` + `profile/page.tsx` read `getPaymentSettings()` and pass the props down.
- [ ] **Step 3: Verify** — `npm run typecheck`; browser: a draft invitation dashboard in gateway → "Bayar Dulu" hits Midtrans; flip to manual → it opens the slug modal. Spot-check upgrade (GuestbookLocked) + quota (GuestsTab).
- [ ] **Step 4: Commit** (`feat(dashboard): manual-mode contact modal for existing invitations`).

---

### Task 13: Full gates + fixups + push

- [ ] **Step 1:** `npm run typecheck` — fix any type errors.
- [ ] **Step 2:** `npm run test` — all unit + dict-parity green.
- [ ] **Step 3:** `npm run check:tokens` — no off-token radii/heights introduced.
- [ ] **Step 4:** Browser end-to-end sanity: with mode=Manual, walk one new-purchase (marketing popup → WhatsApp message contains every field) and one existing-invitation (dashboard → slug modal); flip to Gateway → confirm Midtrans checkout still starts. Capture a screenshot of the popup + the admin card.
- [ ] **Step 5:** Commit any fixups, then push the branch.

```bash
git push -u origin feat/manual-payment-fallback
```

---

## Self-Review

- **Spec coverage:** app_settings (T1) · getPaymentSettings (T2) · manual-pay builder (T3) · i18n (T4) · InvitationDetailsForm extraction (T5) · ManualOrderModal new-purchase popup (T6) · ManualPayModal existing (T7) · updatePaymentSettings (T8) · PaymentModeCard (T9) · all 7 call sites wired A/B in T10-11, C-G in T12 · gates in T13. Every spec Piece maps to a task.
- **Placeholders:** none — pure modules carry full code; UI tasks carry interfaces + exact files + verification steps.
- **Type consistency:** `PaymentSettings`/`PaymentMode`/`PAYMENT_SETTINGS_TAG` (T2) reused in T8/T9/T10-12; `ManualPayContext`/`ManualPayKind`/`buildManualLinks`/`buildManualMessage` (T3) reused in T6/T7/T10-12; `ManualPayDict` shape (T3) matches `dict.manualPay` (T4); `InvitationValues`/`InvitationDetailsForm` (T5) consumed by T6/T11.
- **Dependency order for execution:** T1→T2; T3+T4 parallel; T5 independent; then T6 (needs T3/T4/T5), T7 (needs T3/T4), T8 (needs T2); then T9 (needs T8), T10 (needs T2/T6), T11 (needs T5/T3/T4), T12 (needs T2/T7); finally T13.
