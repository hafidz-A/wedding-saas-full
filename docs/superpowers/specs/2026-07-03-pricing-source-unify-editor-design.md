# Pricing source unification + included-quota surfacing + operator price editor

> Date: 2026-07-03
> Status: Approved decisions, ready for plan
> Related: [2026-06-30-guest-quota-pricing-design.md](2026-06-30-guest-quota-pricing-design.md) (the quota engine this builds on)

## Goal

Make the DB table `template_plans` the **single source of truth** for plan
price + included guest quota across every surface (marketing, onboarding,
checkout), surface the included quota in the plan descriptions, add a per-card
guest-quota stepper to the marketing plans, and give the operator an
**env-gated in-app editor** to change price / quota / features / duration
without a code deploy.

## Why (verified current state)

- **Two price sources that diverge.** The marketing plans on
  `VibeExploration.tsx` and the onboarding picker read **static strings** from
  `src/config/templateCatalog.js` (`price: 'Rp 149.000'`), but the amount
  actually charged comes from the DB table `template_plans` via `resolvePlan`
  (`startCheckout` + the Xendit webhook verify against it). Editing a price in
  Supabase Studio changes the charge but **not** the displayed price.
- **Concrete live bug this already causes.** The DB has `Buku tamu` under
  **Premium** (and `planHasGuestbook` gates it to premium), but the static
  catalog lists `Buku tamu` under **Basic** — so the live marketing card
  mis-advertises a Premium feature as included in Basic.
- **`getAllTemplatePlans` exists but is unused** — no marketing surface reads
  DB prices today.
- **The quota engine is already built and live.** Verified against the project
  `hafidz-A's Project` (`uknpuynhixrdqgsgmynl`): the 2026-06-30 migration is
  applied (`invitations.guest_quota_extra`, `template_plans.base_guest_quota`,
  table `quota_addons`, function `increment_guest_quota_extra` all present), and
  `template_plans` is populated for both templates — Basic 149000 / base 200 /
  365 days, Premium 299000 / base 300 / lifetime. The dashboard already lets
  couples add guests with a hard quota block, a quota meter, and a "Tambah
  kuota" Xendit add-on flow.
- **Onboarding already has a quota stepper** but floors on the client constant
  `DEFAULT_BASE_QUOTA` (not the DB base) and does not accept an incoming quota
  choice. `VibeExploration`'s "choose plan" links to
  `/onboarding?template=X&plan=Y` with no quota.
- **Both entry pages are server components** (`src/app/page.tsx`,
  `src/app/onboarding/page.tsx`) — they can fetch DB plans and pass them down;
  no client-side fetch hack needed.

## Approved decisions

- Deliver all four workstreams (below).
- **Admin gate = env `ADMIN_EMAILS` allowlist** checked against the Supabase
  Auth session email. Re-checked inside every mutating action (defense in
  depth), never trusted from the client.
- **Marketing stepper = per-card ("Opsi B")**, buttons-only (`readonly` number)
  so it can't fight the GSAP scroll-pin; it carries the chosen `extra` (blocks
  of 50 beyond base) to onboarding via the query string.
- **Editor edits:** `display_name`, `price_idr`, `base_guest_quota`, `features`,
  `duration_days`.
- **No DB schema change** — all columns already exist. Only a new env var.
- Block price (Rp 10.000 / 50) and the 5.000 cap stay constants in
  `lib/payments/quota.ts`; not editable in v1.

## Architecture

`template_plans` (DB) → `getTemplatePlans` / `getAllTemplatePlans` (cached, tag
`template-plans`) → **one client-safe display shape** → rendered by marketing +
onboarding; **written** by the operator editor, which invalidates the tag so
every surface refreshes at once.

```
                    ┌─────────────── template_plans (DB, source of truth) ───────────────┐
   /admin/pricing ──┤ updatePlan(...) → revalidateTag('template-plans')                   │
   (env-gated)      └───────────────────────────────┬────────────────────────────────────┘
                                                     │ getTemplatePlans / getAllTemplatePlans
             ┌───────────────────────────────────────┼───────────────────────────────────┐
             ▼                                        ▼                                     ▼
   page.tsx → VibeExploration            onboarding/page.tsx → OnboardingForm      startCheckout / webhook
   (price, features, quota,              (base floor, price, running total,        (charge — already DB-backed)
    per-card stepper)                     prefilled from ?extra=)
```

### Workstream 1 — Unify the price source (DB → everywhere)

- **Client-safe display shape + mapper.** Add a `PlanDisplay` type +
  `toPlanDisplay(row)` mapper (client-safe, no `server-only`):
  `{ id, name, price /* formatIDR string */, amountIDR, features, baseQuota, durationDays }`.
  Lives next to the client-safe money math (`lib/payments/quota.ts` already
  holds `formatIDR`), e.g. `lib/payments/plan-display.ts`.
- **`page.tsx`** `await getAllTemplatePlans()`, map to
  `Record<templateId, PlanDisplay[]>`, pass as a `plans` prop to
  `VibeExploration`.
- **`VibeExploration.tsx`** renders the plans panel from the `plans` prop
  instead of `getCatalogEntry(...).plans`. `templateCatalog` is still used for
  non-price metadata (accent, tags, thumbnail, description, demoSlug). If the DB
  map has no entry for a template (env missing / empty table), fall back to the
  catalog's `plans` mapped into `PlanDisplay` shape so the page never renders
  empty.
- **`templateCatalog.js`** — `plans` becomes fallback-only; update the stale
  "Payment/DB wiring is intentionally not connected yet" comment and correct the
  fallback features so they don't contradict the DB (Basic without `Buku tamu`).

### Workstream 2 — Included quota in the plan description

- `PlanDisplay.baseQuota` renders as a prominent line on each plan card
  ("{n} tamu undangan") on both the marketing card and the onboarding summary.
  The dashboard already shows the live meter.
- **i18n:** add `landing.vibeExploration.guestQuota` (with a `{n}` token) to
  both `id` and `en` (dict-parity test enforces this). Onboarding reuses its
  existing `onboarding.quota.includedPrefix`.

### Workstream 3 — Operator price/quota editor (env-gated)

- **`lib/admin/is-admin.ts`** (`server-only`):
  - `isAdminEmail(email?: string): boolean` — parses `process.env.ADMIN_EMAILS`
    (comma-separated), trims + lowercases both sides, returns membership.
  - `requireAdmin(): Promise<{ email: string }>` — reads the Supabase Auth
    session; throws (page) / returns a rejection the action can surface when the
    session email isn't allowlisted.
- **`app/admin/pricing/page.tsx`** (server) — `requireAdmin()`; on failure
  `redirect('/')` (or a 404-style not-found so the route isn't discoverable).
  Fetches `getAllTemplatePlans()` and renders the editor.
- **`app/admin/pricing/PricingEditor.tsx`** (client) — per template → per plan
  form: `display_name`, `price_idr` (integer IDR), `base_guest_quota` (stepper /
  numeric, multiple of 50), `duration_days` (integer or "lifetime" = null),
  `features` (add/remove list). Calls `updatePlan`; shows saved / error via the
  existing feedback pattern.
- **`app/admin/pricing/actions.ts`** (`'use server'`):
  - `updatePlan(templateId, planCode, patch)` — **re-verify `requireAdmin()`**;
    validate: `price_idr` integer ≥ 0; `base_guest_quota` a multiple of
    `BLOCK_SIZE` within `[BLOCK_SIZE, QUOTA_CAP]`; `duration_days` null or
    integer > 0; `features` an array of non-empty strings; `display_name`
    non-empty. Update `template_plans` (scoped by `template_id` + `plan_code`)
    via the service-role admin client, then `revalidateTag(TEMPLATE_PLANS_TAG)`
    so all cached reads refresh within the request, not after the 60s TTL.
- **Discoverability:** an "Admin" link rendered only when `isAdminEmail(session)`
  (e.g. in the profile page); otherwise the route is reached by direct URL. No
  link is shown to non-admins.
- **Security:** service-role stays server-only (page + action). The env
  allowlist is the only trust anchor; the client never decides admin-ness.

### Workstream 4 — Per-card marketing stepper + onboarding wiring

- **Marketing stepper (per card).** A compact, palette-aware stepper inside each
  plan card in `VibeExploration`: `−  [readonly number]  +`, `min = baseQuota`,
  `step = BLOCK_SIZE`, `max = QUOTA_CAP`, driven by `snapQuotaToBlock`
  (buttons-only — no free typing — so it never grabs focus mid-scroll while the
  section is pinned). Live total = `amountIDR + quotaAddonAmount(value − baseQuota)`
  rendered with `formatIDR`. Colors come from the active `palette` (not the
  dashboard `QuotaStepper`'s fixed styles), so it's a small bespoke control, not
  a reuse of `QuotaStepper`.
- **Carry to onboarding.** "Choose this plan" href becomes
  `/onboarding?template=X&plan=Y&extra=E` where `E = value − baseQuota`.
- **Pin height.** Changing the quota changes card height, so add the per-card
  quota values to the `ScrollTrigger.refresh()` dependency effect (which already
  refreshes on `plansOpen` / palette / template changes).
- **`onboarding/page.tsx`** fetches plans (`getAllTemplatePlans` or
  `getTemplatePlans(template)`) and passes the chosen plan's `baseQuota` +
  `amountIDR` (a `plans` prop) to `OnboardingForm`.
- **`OnboardingForm.tsx`**: floor the stepper on the **DB base** (prop) instead
  of `DEFAULT_BASE_QUOTA`; read `extra` from the query param →
  `guestTotal = base + clampQuotaExtra(base, extra)`; show a running total (plan
  price + add-on) so the buyer sees the full amount before Xendit.
  `completeOnboarding` already accepts `guestQuotaExtra` — unchanged.

## Data model

- **No schema change.** `template_plans.{display_name, price_idr, features,
  base_guest_quota, duration_days}` already exist and are populated.
- **New env var `ADMIN_EMAILS`** (comma-separated). Add to `.env.example`; set in
  `.env.local` and Vercel. Absent ⇒ nobody is admin (editor inaccessible), which
  is the safe default.

## Key interfaces

- `toPlanDisplay(row: TemplatePlanRow): PlanDisplay` (client-safe).
- `isAdminEmail(email?: string): boolean`; `requireAdmin(): Promise<{ email }>`.
- `updatePlan(templateId: string, planCode: string, patch: Partial<{ display_name: string; price_idr: number; base_guest_quota: number; duration_days: number | null; features: string[] }>): Promise<{ ok: boolean; error?: string }>`.
- Marketing card href: `/onboarding?template={id}&plan={code}&extra={blocks*50}`.

## Testing

- **Unit:** `isAdminEmail` (comma / spaces / case / empty env / undefined
  email); `updatePlan` validation (reject non-integer price, non-multiple-of-50
  quota, over-cap quota, bad duration, empty features/name; accept a valid
  patch); `toPlanDisplay` (DB row → shape; catalog fallback shape).
- **i18n:** `dict-parity` covers the new `guestQuota` key.
- **Manual / browser:** edit a price + base quota in `/admin/pricing` → the
  marketing card, onboarding summary, and the Xendit amount all reflect it after
  the action (tag revalidation), no deploy. Basic no longer shows `Buku tamu`.
  Per-card stepper shows a correct live total and carries `extra` into
  onboarding (floor = DB base). A signed-in non-admin hitting `/admin/pricing` is
  redirected.

## Out of scope (v1)

- Editing the add-on block price (Rp 10.000 / 50) or the 5.000 cap from the UI.
- Quota reduction / refunds; premium→basic downgrade.
- Multi-admin roles / an `is_admin` DB column (env allowlist is enough for a
  solo operator).
- A standalone public `/templates` page (the landing `VibeExploration` is the
  buying surface).

## Operator steps

- Set `ADMIN_EMAILS=arifinhafidz68@gmail.com` in `.env.local` and Vercel.
- Migration + `template_plans` seeding: **already done** (verified on
  `uknpuynhixrdqgsgmynl`). No action needed.
