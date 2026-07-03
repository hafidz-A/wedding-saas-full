# Admin module 2 — Invitations control center

> Date: 2026-07-03
> Status: Approved decisions, ready for plan
> Related: [pricing/quota/editor spec](2026-07-03-pricing-source-unify-editor-design.md)
> (establishes the `/admin` env gate + shell this builds on). Program: memory
> `admin-console-program`.

## Goal

A cross-tenant operator screen at `/admin/invitations` to see and manage every
invitation: comp / mark-paid, set active period, publish / unpublish, **suspend**
(hard takedown), change plan, add quota, **create an invitation for a client**
(incl. their account), and delete — each admin-gated, audited, and
cache-revalidating. Replaces the `scripts/` CLIs (`mark-paid`,
`create-invitation`, and the single-invitation part of `delete-account`) with a
UI. There is **no cross-tenant view today** — profile is per-user, everything
else is per-slug.

## Context (verified against the live DB + code)

- `invitations` columns: `id`, `slug` (citext), `plan` (default `'free'`),
  `template_id` (default `'classic'`), `is_paid`, `is_published`, `paid_at`,
  `expires_at`, `owner_user_id` (nullable, `ON DELETE CASCADE` from auth.users),
  `email` (authoritative — `owner_email` is legacy), `config` jsonb,
  `guest_quota_extra`, `xendit_invoice_id/…_external_id`, `checkin_token`,
  `guestbook_souvenir_enabled`.
- **Delete cascade:** child rows (`rsvps`, `gift_confirmations`, `guests`,
  `attendances`, `guestbook_notes`) cascade off `invitation_id`; invitations
  cascade off the auth user. **Storage `invitation-media/<id>/` does NOT
  cascade** — it must be removed explicitly (proven by `delete-account.mjs`).
- Reusable server helpers: `publishPaidInvitation`, `extendActivePeriod`,
  `applyPaidQuotaAddon` (atomic increment RPC), `resolvePlan`,
  `activePeriodStatus` (draft/lifetime/active/expired), `buildSeedConfig`
  (lovebirds) / `getDefaultConfig` (other templates).
- Admin gate `lib/admin/is-admin.ts` + `requireAdmin()` come from module 1.
- Guestbook is premium-only (`planHasGuestbook`) — follows `plan` automatically.

## Approved decisions

- **Create-for-client = full account provisioning.** The admin "Buat undangan"
  form has a **template dropdown** (Lovebirds / Solary, same list as onboarding)
  + plan + quota + couple details (bride/groom/date/venue) + slug + **client
  email**. On submit: if the email has no account → create a Supabase auth user
  and send a set-password/invite email; if it exists → link to it (no duplicate).
  Payment path is a choice at creation: **"mark paid now"** (offline/comp) or
  **"leave as draft"** (client pays Xendit later via the invite).
- **`paid_source` (3-way): `xendit | manual | comp`.** xendit = online payment;
  manual = real money received offline (reseller / transfer — counts as revenue,
  flagged); comp = free (Rp 0). Module 3 sums revenue by source so comps/testing
  don't inflate it.
- **Suspend lock (hard takedown).** `suspended_at` hides the public page AND
  blocks the couple from re-publishing — unlike a soft unpublish they could undo.
- **Minimal audit log now.** `admin_actions` records every admin mutation.

## Data model (module-2 migration)

- `invitations` + `paid_source text` (nullable; `check (paid_source in
  ('xendit','manual','comp'))`). Backfill: set `'xendit'` where `is_paid = true`
  (existing paid rows came through Xendit).
- `invitations` + `suspended_at timestamptz` (null = not suspended).
- `admin_actions` table: `id uuid pk`, `admin_email text not null`, `action text
  not null`, `target_type text`, `target_id text`, `meta jsonb`, `created_at
  timestamptz default now()`. RLS enabled, service-role only (no policies).

## Architecture

- **`/admin/invitations/page.tsx`** (server, `requireAdmin()` → redirect on
  fail) — server-fetch invitations (paginated + searchable by slug / email /
  plan / template / status), compute status via `activePeriodStatus`, render the
  table + a "Buat undangan" action. Uses the service-role admin client
  (bypasses RLS), server-side only.
- **Client table component** — filter controls + per-row action menu + confirm
  dialogs (reuse `DialogProvider` / `FeedbackProvider`).
- **`app/admin/invitations/actions.ts`** (`'use server'`; **every** action:
  `requireAdmin()` re-check → mutate → insert an `admin_actions` row →
  `revalidatePath`):
  - `adminCompInvitation(id, { source: 'manual'|'comp', period })` — set
    `is_paid`, `is_published` (unless suspended), `paid_at`, `expires_at` (from
    plan or `period` override: lifetime | N days), `paid_source`. Mirrors
    `publishPaidInvitation` plus the source tag.
  - `adminSetActivePeriod(id, period)` — `expires_at` only (comp a renewal / fix
    expiry).
  - `adminSetPublished(id, published)` — refuses to publish when `suspended_at`
    is set.
  - `adminSuspend(id, on, reason?)` — set/clear `suspended_at`; suspending also
    sets `is_published = false`.
  - `adminChangePlan(id, plan)` — `plan` only; does NOT recompute expiry (avoid
    clobbering a lifetime). Guestbook access follows the new plan automatically.
  - `adminAddQuota(id, qtyGuests)` — `increment_guest_quota_extra` (comp quota).
  - `adminDeleteInvitation(id, confirmSlug)` — require `confirmSlug === slug`;
    remove `invitation-media/<id>/` files first, then delete the invitation row
    (children cascade). **Never** deletes the auth user.
  - `adminCreateInvitationForClient(input)` — lookup/create the auth user by
    email; build `config` (buildSeedConfig / getDefaultConfig); insert the
    invitation (owner_user_id, email, plan, template, quota); if "mark paid now",
    also apply the comp/manual paid transition.
- **Public render** (`[template]/[slug]/page.tsx`) and the **publish API**
  (`/api/invitation/[slug]/publish`) must both check `suspended_at`.
- **Webhook** `publishPaidInvitation` path sets `paid_source = 'xendit'` (small
  cross-module tweak so online payments are tagged).

## Interfaces

- `adminCompInvitation(id: string, opts: { source: 'manual' | 'comp'; period: { kind: 'lifetime' } | { kind: 'days'; days: number } }): Promise<ActionResult>`
- `adminSetActivePeriod(id: string, period): Promise<ActionResult>`
- `adminSetPublished(id: string, published: boolean): Promise<ActionResult>`
- `adminSuspend(id: string, on: boolean, reason?: string): Promise<ActionResult>`
- `adminChangePlan(id: string, plan: string): Promise<ActionResult>`
- `adminAddQuota(id: string, qtyGuests: number): Promise<ActionResult>`
- `adminDeleteInvitation(id: string, confirmSlug: string): Promise<ActionResult>`
- `adminCreateInvitationForClient(input: { template: string; plan: string; guestQuotaExtra?: number; brideName: string; groomName: string; weddingDate: string; venue: string; slug: string; clientEmail: string; markPaid?: { source: 'manual' | 'comp'; period } }): Promise<{ ok: boolean; invitationId?: string; created_user?: boolean; error?: string }>`
- `logAdminAction(admin, action, target, meta?)` — internal, called by all of the above.

## Red-team / edge cases (baked into the design)

- Delete removes **storage first** (no cascade), then the row (children cascade);
  **never** the auth user (owner may have other invitations) — account deletion
  is module 5.
- **Type-to-confirm the slug** on delete (irreversible + encrypted guest PII).
- **Suspend beats publish:** the couple's own publish path must check
  `suspended_at`, or a takedown is toothless.
- **Change plan must not reset a lifetime expiry** to 365 days.
- **Create-for-client with an existing email** links, never duplicates the user;
  surface a clear "linked to existing account" vs "new account created" result.
- **Comp / manual paid must set `paid_source`** so revenue isn't inflated.
- **Two email columns** — read/write `email`, ignore `owner_email`.
- **Concurrency:** two admins acting on the same row — last-write-wins is
  acceptable; the audit log records both.

## Testing

- **Unit:** `adminCompInvitation` sets the right fields + `paid_source`;
  `adminSetPublished` refuses when suspended; `adminSuspend` clears
  `is_published`; `adminChangePlan` preserves `expires_at`;
  `adminDeleteInvitation` requires matching slug + calls storage `remove` before
  the row delete; `adminCreateInvitationForClient` links an existing user vs
  creates a new one; every action writes exactly one `admin_actions` row;
  non-admin callers are rejected.
- **Manual / browser:** full round-trip on a test invitation — comp it, suspend
  it (confirm the public page + the couple's re-publish are both blocked), change
  plan, add quota, create one for a client (both "mark paid" and "draft" paths),
  delete it (confirm storage is emptied).

## Out of scope (→ module 5 / later)

- Account-level ops: delete account, reset password, change email, transfer
  ownership (module 5 — Users & data / PDP).
- Full dashboard impersonation (support "view as couple"). MVP: open the public
  page / preview + read `config`; no session impersonation.

## Operator steps

- Apply the module-2 migration (`paid_source`, `suspended_at`, `admin_actions`)
  via the Supabase MCP `apply_migration` or SQL editor.
