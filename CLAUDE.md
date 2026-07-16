# FinCards — Claude project context

> Loaded automatically into every Claude Code session. This file describes the
> project **as it actually is today**, so a fresh session can resume without recap.
> When code and this file disagree, the code wins — fix this file.
>
> Deep-dive companions (kept current):
> • [tutorial-multi.md](tutorial-multi.md) — how the multi-template architecture works + recipe to add a template
> • [README.md](README.md) — setup + operator SOP (onboarding, support, monitoring)
> • [docs/PRD-saas-wedding-invitations.md](docs/PRD-saas-wedding-invitations.md) — product requirements
> • [docs/AUTH-SETUP.md](docs/AUTH-SETUP.md) — auth model + env keys
> • Dated design archive under `docs/superpowers/specs|plans/` — point-in-time records, do not rewrite.

---

## Product

**FinCards** (brand in `src/lib/brand.ts`; prod domain `www.fincards.land`) — a multi-tenant SaaS
for premium digital wedding invitations. Many couples, **several cinematic templates**. Each couple =
one row in `invitations` with its own slug, owner account, editor dashboard, RSVP / gift / guest
databases, and buku-tamu (guest-book) ledger.

Business model: **self-serve, one-time payment**. Couple signs up → picks a template → fills basic
data → edits a live preview for free → **pays once (via Midtrans) to publish**. Plans are DB-driven per
template (`basic` / `premium`); Premium unlocks the buku-tamu attendance ledger + QR check-in. Add-ons:
extra guest quota (50-guest blocks), pay-the-difference upgrade to Premium, renewal when the active
period expires. Phase: **go-to-market** (see the marketing assets in `docs/marketing/`).

**Origin:** scaffolded long ago from a Vite + React cinematic template. The **Lovebirds** template has
since diverged substantially (play-once hero, ornament system, folded registry, config migrations) — do
**not** assume byte-identical parity with any upstream Vite project anymore.

---

## Tech stack (decided — do not re-evaluate without asking)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18.3.1, TypeScript |
| Animation | motion 12 + GSAP 3.15 + lenis (smooth scroll); Solary adds three.js |
| Backend | Supabase (Postgres + Storage + RLS) |
| Auth | **Supabase Auth** (email+password accounts, email verify, password reset, optional TOTP MFA) |
| Payments | **Midtrans** Snap (redirect) + notification webhook |
| Forms | react-hook-form 7.55 + zod |
| Drag/drop | @dnd-kit (editor section reorder) |
| Email | Resend (password reset, notifications) |
| Hosting | Vercel |

**Do NOT introduce** Tailwind, shadcn, MUI, or any UI library — everything is hand-styled with CSS
Modules + CSS variables. `import.meta.env` is Vite — use `process.env` in Next.

---

## Routing & multi-tenant model

```
/                                  → marketing landing (Lenis-scrolled)
/templates? (via marketing)        → template gallery / demos
/signup · /login · /verify-signup  → Supabase Auth account
/forgot-password · /reset-password → password recovery
/onboarding                        → pick template + slug + couple data + plan → create draft
/profile                           → account: your invitations, payments, MFA, data export/deletion
/[template]/[slug]                 → PUBLIC invitation (e.g. /lovebirds/adi-rani)
/[template]/[slug]/dashboard       → owner editor + data tabs (auth-gated by ownership)
/[template]/[slug]/checkin         → day-of QR / manual guest check-in (buku tamu)
/admin/**                          → operator console (allowlist-gated, see below)
/api/**                            → route handlers (rsvp, gift, guestbook, checkin, upload, auth, payment webhook, invitation config/publish/meta/music/theme)
```

Key facts:
- **Templates live in `src/all-templates/<id>/`** (currently `lovebirds`, `solary`) — NOT `src/templates/`.
  The master registry is `src/config/templateIndex.js` (server-safe: imports only plain `defaultConfig`
  data). Per-template render *Shells* are client components, dynamic-imported in
  `src/app/[template]/[slug]/InvitationView.tsx`.
- The URL's `[template]` segment is **canonicalised** to the row's real `template_id` (a wrong segment
  redirects). A couple's `template_id` decides what renders.
- One account may own **multiple** invitations (capped at 10 unpaid drafts, anti-abuse). Ownership is
  `invitations.owner_user_id → auth.users(id)`; the dashboard checks the signed-in user owns the slug.
- **Phone/touch devices** get the invitation inside a fullscreen same-origin `?embed=1` iframe
  (`PhoneFrameView`) so the mobile URL bar never churns mid-scroll. `?noframe=1` opts out. iPadOS (which
  lies in its UA) is upgraded client-side via `TabletFrameUpgrade`.

---

## Visibility & payment lifecycle

- A guest sees a public invitation only when it is **`is_published` AND `is_paid`** and not expired /
  suspended. The signed-in **owner can preview** their own unpublished/unpaid invitation.
- Onboarding inserts an **unpaid draft** (`is_paid=false`). `startCheckout` creates a Midtrans Snap
  transaction; the **notification webhook** (`/api/payment/midtrans/webhook`) publishes on settlement.
  A manual "saya sudah bayar — cek ulang" fallback (`recheckPayment`) re-queries Midtrans if the
  webhook is missed.
- Dashboard is behind a **PaymentGate**: `draft`/`expired` shows a pay/renew screen instead of the editor.
- Active period: `template_plans.duration_days` (NULL = lifetime). Renewal (`ren_`), Premium upgrade
  (`upg_`, pay-the-difference), and guest-quota add-on (`qta_`) each have their own checkout + recheck.
- **Admin suspend** (`suspended_at`) is a hard takedown that hides the page from everyone incl. the owner.

Pricing is **DB-driven**, not hardcoded: `src/lib/payments/` reads the `template_plans` table
(`resolvePlan`, `computeUpgradeAmount`, `planBaseQuota`, `effectiveQuota`, quota cap). The `/admin`
Plans editor is the source of truth for prices — do not hardcode rupiah amounts in components.

---

## Editor (dashboard)

`src/editor/` — a schema-driven block editor. Dashboard tabs (`DashboardClient.tsx`):
**RSVP · Gifts · Guests · Buku Tamu · Editor · Tutorial** (Buku Tamu is Premium-gated).

- `EditorRoot` = section list (drag-reorder via @dnd-kit) + schema-driven `FieldEditor` + live
  `PreviewPane` iframe. Field types in `src/editor/fields/` (text, textarea, image, image-array,
  object-array, boolean, datetime, select, audio, locked-couple).
- Section schemas in `src/editor/schemas/` (hero, countdown, ourStory, eventDetails, brideGroom,
  weddingParty, gallery{Masonry,SpringCoil,Helix}, schedule, rsvp, weddingGift, accommodations, faq,
  guestbook, quote, footer, …). `templatePolicy.ts` constrains which sections/actions a template allows
  (e.g. Lovebirds keeps exactly one gallery; couple name is a single locked source).
- Editor-adjacent tabs/panels: Palette, Ornament, Music, Meta (title/description/OG). Saves go through
  `/api/invitation/[slug]/config` (+ `publish`, `meta`, `music`, `theme`). Concurrency is
  **content-aware** (sections-hash, not `updated_at`); conflicts show a gentle reload banner.

---

## Guests & Buku Tamu (guest-book)

- **Guests** tab: import (CSV/paste, `src/lib/guests/parse-import.ts`), per-guest **single-use RSVP
  token** links, and WhatsApp share text. Guest rows are **encrypted at rest** (`GUESTS_ENCRYPTION_KEY`).
- **Buku Tamu v2** (Premium): `attendances` table, walk-in add, stats, printable/CSV ledger, and
  **QR check-in** at `/[template]/[slug]/checkin` (token-gated search + confirm via `/api/checkin/*`).

---

## Admin operator console (`/admin`)

Env-gated by `ADMIN_EMAILS` allowlist (`src/lib/admin/is-admin.ts` + `require-admin`). Modules:
- **Invitations** control center (list, create comp invitations, suspend/period actions).
- **Payments & revenue** (transactions, reconcile, refund-requests panel).
- **Templates** catalog + **Plans/pricing editor** (writes `template_plans`).
- **Testimonials** moderation (publish a review to the marketing landing).
- **Users & PDP** (account data export + deletion requests — Indonesian PDP compliance).
- **Activity** log. See the `docs/superpowers/specs/2026-07-*-admin-*` design docs for module details.

---

## Security & privacy

- **Encryption at rest (AES-GCM), decrypted server-side only:**
  - `APP_ENCRYPTION_KEY` → sensitive config leaves (bank account no./name, whatsapp, email, phone) +
    RSVP/gift PII (`*_enc` columns). `src/lib/crypto/{app,config}.ts`.
  - `GUESTS_ENCRYPTION_KEY` → guests table fields + RSVP token material. `src/lib/guests/crypto.ts`.
  - Verify with `npm run verify:security` (`scripts/verify-encryption-at-rest.mjs`).
- **Secrets discipline:** `SUPABASE_SERVICE_ROLE_KEY` and encryption keys live only in
  `src/lib/supabase/admin.ts`, `src/lib/crypto/*`, `src/lib/guests/*`, and `src/app/api/**` / server
  actions. Never reference them from a `'use client'` file.
- Rate limiting (`src/lib/security/rate-limit.ts`), timing-safe compares, RLS + security-hardening
  migrations (anon SELECT on `invitations` is restricted; public reads go through the admin client).

---

## Design tokens & styling conventions

- **CSS Modules + CSS variables** everywhere. No Tailwind/styled-components.
- **Design tokens (unified 2026-06-28, project-wide).** Two canonical scales in `src/styles/tokens.css`;
  snap to them, no off-scale literals:
  - **Radius:** `--radius-xs 4 · --radius-sm 8 · --radius-md 16 (the card/panel radius) · --radius-lg 24
    · --radius-pill 999 · --radius-round 50%`. (`--radius-xl 32 / --radius-device 36 / --radius-screen 28`
    are phone-mockup bezels only.) Solary's `--r-1/2/3/4` are thin aliases of this scale. Responsive
    `clamp()` radii and multi-value decorative shapes (polaroid frames, blobs) are the only allowed
    non-token forms.
  - **Control heights:** `--ctl-h-sm 36 · --ctl-h 44 (DEFAULT for every button/CTA/input; = --tap-target)
    · --ctl-h-lg 52 (hero/gate CTA)`. Public surfaces default 44; dense admin (dashboard/editor tables,
    icon buttons) use 36.
  - **Status colors:** `--status-danger` scale (`tokens.css`) replaces hardcoded reds in dashboard/admin
    danger buttons and controls — don't reintroduce a raw `#`-red.
  - **Guardrail:** `npm run check:tokens` fails on the dead `--border-radius-*` namespace, raw `999px`,
    single-px radius literals, or an off-scale height on a button selector. Run it after touching
    control/token CSS.
- **Shared controls:** `src/components/ui/` — `<Button variant size>`, unified `DialogProvider`
  (confirm/alert/form + Escape), `useEscapeToClose`, `controls.module.css` (.input/.iconBtn).
  New buttons/dialogs MUST use these; do not hand-roll inline-styled controls.
- `npm run check:tokens` now also scans **inline styles in .tsx/.jsx** (999 radius, off-scale
  control heights on btn/input-named consts) — "clean" covers admin/profile inline styles too.
- **`'use client'`** on all section/component/hook files. Server components are `src/app/**/page.tsx`,
  `layout.tsx`, and `src/app/api/**/route.ts`; server actions are `'use server'` files (`actions.ts`).
- **i18n:** ID + EN dictionaries in `src/lib/i18n/dictionaries/`; keep dict parity (there's a test).
- **User language:** the user (`arifinhafidz68@gmail.com`) writes Bahasa Indonesia, casual register.
  Reply in Bahasa for explanation, English for code/comments. Pair jargon with a plain-language line.

---

## File map (high level)

```
src/
├── app/
│   ├── page.tsx · layout.tsx · template.tsx      ← marketing landing + shell
│   ├── signup · login · verify-signup · forgot-password · reset-password
│   ├── onboarding · profile · terms · privacy · refund
│   ├── [template]/[slug]/                         ← PUBLIC invitation + phone-frame
│   │   ├── page.tsx · InvitationView.tsx · layout.tsx · icon/route.ts
│   │   ├── checkin/                               ← QR / manual check-in
│   │   └── dashboard/                             ← editor + tabs + PaymentGate + guests/guestbook actions
│   ├── admin/                                     ← operator console (invitations, payments, templates, testimonials, users, activity)
│   └── api/                                       ← rsvp, gift, guestbook, checkin, upload, auth/*, payment/midtrans/webhook, invitation/[slug]/{config,publish,meta,music,theme}
├── all-templates/<id>/                            ← lovebirds, solary (sections, config, renderers, styles, Shell)
├── config/                                        ← templateIndex.js, templateCatalog.js, categories.js
├── editor/                                        ← block editor (schemas, fields, EditorRoot, templatePolicy)
├── lib/                                           ← supabase, auth, crypto, guests, guestbook, payments, admin, i18n, email, security, testimonials, meta, music …
├── components/ · hooks/ · styles/ · utils/
scripts/                                           ← create-invitation, seed-full-config, capture, diag-*, encryption + backfill migrations
supabase/                                          ← schema.sql (base) + migrations/ (30+ dated .sql)
```

---

## Known gotchas

1. **`supabase/schema.sql` is the ORIGINAL bcrypt-era base** and is out of date on its own (still shows
   `password_hash not null`, `template_id default 'classic'`, old RLS). The real schema = base **plus**
   every file in `supabase/migrations/` (owner_user_id, is_paid, gateway_* payment columns (renamed
   from xendit_* by `2026-07-14_midtrans_gateway.sql`), guest_quota_extra, `*_enc`
   columns, guests, attendances, refund_requests, plan_upgrades, quota_addons, template_plans, admin
   tables, testimonials, …). Apply base then all migrations in date order.
2. **Empty-config behaviour:** a real invitation with empty `config` renders a "belum siap" notice (does
   NOT leak the demo couple). Only **demo slugs** (`demo-*`, legacy `adi-rani`) fall back to the
   template's bundled `defaultConfig`. `fillEmptyImages` supplies placeholder photos at render time only.
3. **Lovebirds config migration:** `migrateLovebirdsConfig` folds registry→weddingGift and strips dropped
   sections at render time, so old/unsaved configs stay consistent. Don't reintroduce a standalone
   `registry` section for Lovebirds.
4. **GSAP `registerPlugin(ScrollTrigger)` at module top** (client-only via `'use client'`). Don't move it
   inside a component. Hero is **play-once** (100svh timeline, no scroll lock) — see the hero-playonce
   design doc; older scroll-scrub history is superseded.
5. **BotanicalBorder** is a heavy global decorative layer that remounts at section boundaries; thrash was
   fixed (read/write split). Be careful adding per-section sketch work.
6. Demo Lovebirds previews render BOTH gallery styles back-to-back for comparison — real configs keep
   exactly one gallery (editor policy).

---

## Running & testing

```powershell
npm install
# Fill .env.local (see .env.local.example): Supabase x3, NEXT_PUBLIC_SITE_URL,
# APP_ENCRYPTION_KEY, GUESTS_ENCRYPTION_KEY, MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION,
# ADMIN_EMAILS, RESEND_API_KEY/FROM. Apply supabase/schema.sql + all migrations first.
npm run dev
```

- Marketing: http://localhost:3000 · Demo invitation: http://localhost:3000/lovebirds/demo-lovebirds (or /solary/demo-solary)
- Onboarding path (real): /signup → /onboarding → pay (Midtrans) → /[template]/[slug]/dashboard
- Comp/admin bootstrap without payment: `node scripts/create-invitation.mjs …` or `/admin/invitations/new`

**Tests:** `npm run typecheck` · `npm run test` (vitest) · `npm run test:e2e` (Playwright) ·
`npm run test:all` · `npm run check:tokens` · `npm run verify:security`. Coverage contract in
[TEST-MATRIX.md](TEST-MATRIX.md); latest run in [TEST-REPORT.md](TEST-REPORT.md); real product bugs in
[BUG-LEDGER.md](BUG-LEDGER.md).
