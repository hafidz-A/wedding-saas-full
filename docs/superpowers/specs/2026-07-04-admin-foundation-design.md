# Admin module 0 — Foundation (shared wiring)

> Date: 2026-07-04
> Status: Approved decisions, ready for plan
> Program: memory `admin-console-program`. Built FIRST; modules 1–5 depend on it.
> Related: [pricing](2026-07-03-pricing-source-unify-editor-design.md),
> [invitations](2026-07-03-admin-invitations-control-center-design.md),
> [payments](2026-07-03-admin-payments-revenue-design.md).

## Goal

The shared substrate every admin module builds on — extracted so the wiring is
defined **once** instead of being re-invented (or forgotten) across modules 1–5:
the auth gate, the `/admin` layout / nav / overview / entry link, audit logging +
a plain-language activity view, a transactional-email helper, cache-invalidation
conventions, migration / RLS / backfill ordering, the owner-app integration
points that must honor admin actions, the privacy invariant, and the admin UI
language. Module 1 previously said it "establishes the `/admin` gate + shell" —
that responsibility now lives here.

## Context (verified)

- **No admin/role system exists** — only per-couple owner auth (Supabase session
  `user.id` === `invitations.owner_user_id`).
- Only **auth emails** exist today (Supabase `signUp` / `resetPasswordForEmail`);
  `diag-resend.mjs` shows Resend is available but not used for app emails.
- `template_plans` reads are cached under tag `template-plans` (module 1).
- Guest PII (`guests`, `rsvps`, `gift_confirmations`, `guestbook_notes`) is
  **encrypted at rest**; couple names live in `config` JSONB (plaintext).
- Invitation gating precedent exists (PaymentGate for draft/expired).

## Approved decisions

- **Env `ADMIN_EMAILS` allowlist** is the only trust anchor (flat, single-operator).
- **Module 0 is built first**; 1 → 2 → 3 → 4 → 5 follow.
- **Admin UI is Indonesian-only** (operator tool) — not wired into the id/en dict
  system, no dict-parity burden. Revisit only if staff/roles are added.
- **Privacy invariant:** admin views show **counts**, never decrypt guest PII.

## The wiring

### 1. Auth gate (single source)
- `lib/admin/is-admin.ts`: `isAdminEmail(email?)` (parses `ADMIN_EMAILS`, trims +
  lowercases) and `requireAdmin()` (reads the Supabase session; the admin is a
  normal authenticated user whose email is allowlisted).
- `app/admin/layout.tsx` calls `requireAdmin()` **once** → gates every `/admin/*`
  page; on failure `redirect('/')`. **Every mutating server action re-checks
  `requireAdmin()`** (the layout gate does not protect action invocations).

### 2. Layout / nav / overview / entry
- `app/admin/layout.tsx`: nav (Overview · Pricing · Templates · Invitations ·
  Payments · Users), admin identity, logout.
- `app/admin/page.tsx`: overview KPIs (invitations, paid vs drafts, revenue this
  month, **pending refund requests**) + quick links.
- **Entry point:** an "Admin" link rendered **only when `isAdminEmail(session)`**
  (in the profile page and/or site nav). Non-admins never see it; the route is
  gated regardless. (Today there is no path to `/admin` at all.)

### 3. Audit — `logAdminAction` (shared) + activity view
- `admin_actions` table is created here (module 2 referenced it; it belongs to the
  foundation). Columns per the module-2 spec.
- `logAdminAction(admin, { action, targetType, targetId, meta? })` — called by
  **every** admin mutation in all modules (price edits, comp, plan change, suspend,
  publish, delete, add-quota, refund approve/reject, create-for-client). `meta`
  jsonb carries before/after context for reversibility.
- `renderAdminAction(row): string` — maps an action code to a plain-language
  Indonesian sentence.
- **Activity view** (`app/admin/activity`, plus a strip on the overview): renders
  `admin_actions` as sentences ("Kamu menyetujui refund Rani & Adi · 2 jam lalu")
  so the operator never reads cmd logs or raw request traces.

### 4. Transactional email helper (Resend)
- `lib/email/send.ts` — one branded sender used by: create-for-client invite
  (module 2), **notify operator on a new refund request** (module 3), **notify the
  couple on a refund decision** (module 3). Net-new (only auth emails exist).
  Templates centralized here.
- Env: `RESEND_API_KEY` + a from-address; absent ⇒ email is skipped/logged, never
  crashes the action.

### 5. Cache-invalidation map + helper
- `revalidateInvitation(templateId, slug)` fires the standard set:
  `revalidatePath('/[template]/[slug]', 'page')` + `.../dashboard` + `/profile`.
- Map: **plan/price/quota/template-metadata edits →** `revalidateTag` (the
  `template-plans` tag, plus a `templates` tag for module 4). **Invitation-state
  actions** (comp, plan, suspend, publish, delete, add-quota, refund-approve) **→**
  `revalidateInvitation(...)`. Modules call the helper instead of guessing paths.

### 6. Migration / RLS / backfill ordering
- New admin tables = **RLS enabled, service-role only** (owner-read only where a
  spec says so, e.g. `refund_requests`).
- **Order:** Module 1 (`compare_at_price_idr`) → Module 2 (`paid_source`,
  `suspended_at`, `admin_actions`) → Module 3 (`paid_amount_idr`, `refunds`,
  `refund_requests` — depend on `admin_actions` + `paid_source`).
- **Shared function change done ONCE:** `publishPaidInvitation` / the webhook set
  `paid_source='xendit'` **and** `paid_amount_idr` — serving modules 2 **and** 3.
- **Backfills:** `paid_source='xendit'` where `is_paid`; `paid_amount_idr` via
  `initialPurchaseAmount`.
- **DB-level guards:** unique partial index — one `status='succeeded'` refund per
  `(source_type, source_id)` (so "refund once" isn't app-logic only).

### 7. Owner-app integration (honor admin actions) — easy to forget
- `suspended_at` is checked in **`[template]/[slug]/page.tsx`** (public render →
  taken-down state), **`/api/invitation/[slug]/publish`** (couple can't re-publish
  a suspended invitation), and a **dashboard banner** ("undangan disuspend /
  direfund — hubungi admin").
- Refund-approved → unpublish; the couple's dashboard reflects it.
- These changes land in the **existing** couple-facing app, not just new admin
  pages.

### 8. Privacy in admin
- Admin lists/snapshots use `count` (guests / rsvps / attendances); **never**
  decrypt `*_enc` fields. Couple names come from `config`. Raw-PII export is a
  module-5, audited, break-glass feature.

### 9. Concurrency / idempotency conventions
- Money mutations (comp, refund apply, upgrade/renewal webhook) are **idempotent**
  and guarded (can't double-apply / double-refund). Non-money state = last-write-
  wins, with `admin_actions` recording every write.

## Interfaces

- `isAdminEmail(email?: string): boolean`; `requireAdmin(): Promise<{ email: string }>`.
- `logAdminAction(admin, { action: string; targetType: string; targetId: string; meta?: object }): Promise<void>`.
- `renderAdminAction(row): string`.
- `sendAdminEmail({ to, template, data }): Promise<void>`.
- `revalidateInvitation(templateId: string, slug: string): void`.

## Testing

- `isAdminEmail` allowlist parsing; `requireAdmin` redirects/rejects a non-admin;
  the `/admin` layout gate + per-action re-check; `logAdminAction` writes one row;
  `renderAdminAction` produces the right sentence; `revalidateInvitation` fires the
  three paths; `sendAdminEmail` is called with the right template and never throws
  when the key is absent; the `suspended_at` gate blocks both public render and the
  couple's re-publish.

## Out of scope

- Roles beyond a flat email allowlist; per-action granular permissions.
- Multi-language admin UI.
- Dashboard impersonation + raw-PII export (module 5).

## Operator steps

- Set `ADMIN_EMAILS` (comma-separated) and `RESEND_API_KEY` + a from-address in
  `.env.local` and Vercel.
