# Admin module 5 — Users & data (PDP)

> Date: 2026-07-04
> Status: Approved decisions, ready for plan
> Depends on: [admin foundation](2026-07-04-admin-foundation-design.md) +
> [payments/refunds](2026-07-03-admin-payments-revenue-design.md) (financial
> records) + [invitations](2026-07-03-admin-invitations-control-center-design.md)
> (`archived_at`). Program: memory `admin-console-program`. Built last.

## Goal

Personal-data tools for UU PDP compliance: **find a user**, process **account-
deletion requests** (erase personal data, keep anonymized financial records), and
**export a user's decrypted data**. Replaces the `delete-account.mjs` +
`export-decrypted.mjs` CLIs with an admin UI plus a self-service request/download
for the couple.

## Why / context (verified)

- **Deletion mechanics** (`delete-account.mjs`): deleting the auth user cascades
  their invitations + child rows (`owner_user_id ON DELETE CASCADE`); storage
  `invitation-media/<id>/` is removed manually (no cascade).
- **Export mechanics** (`export-decrypted.mjs`): two keys —
  `GUESTS_ENCRYPTION_KEY` (guests name/phone/notes) and `APP_ENCRYPTION_KEY`
  (rsvps, attendances, gift_confirmations, guestbook_notes, playlist, and the
  `{ enc }` leaves inside `invitations.config`). Read-only decrypt to JSON per
  table; `password_hash` is bcrypt (one-way) and never exported.
- **Money-integrity decision (already made):** paid invitations are archived, not
  deleted — financial records (`plan_upgrades`, `quota_addons`, `refunds`,
  `invitations.paid_amount_idr/paid_source`) must survive.

## Approved decisions

- **Account deletion = erase PII, retain anonymized financial records.** Personal
  data (names, photos, guest list, email, config personal fields) is erased; the
  payment record is kept **without identity** (amount / date / plan only).
- **Deletion is request-based** — the user submits a request, the **operator
  processes** it (mirrors the refund flow) — safer + lets the operator handle the
  paid-record nuance.
- **Scope = find + delete + export.** Reset-password (self-service forgot-password
  already exists), change-email, and transfer-ownership are **out of scope** (later).
- **Export = self-service + operator, audited.** A "Unduh data saya" button in the
  couple's profile (their own data only) + an operator export; every export/deletion
  is logged via `logAdminAction`.

## Data model (module-5 migration)

- `account_deletion_requests` table: `id uuid pk`, `user_id uuid`, `email text`,
  `reason text`, `status text` (`pending | cancelled | processed | rejected`),
  `requested_at`, `scheduled_for timestamptz` (= `requested_at` + **7-day grace**),
  `processed_by text`, `processed_at`, `note text`. RLS: owner reads own; only the
  service role writes decisions.
- `invitations` + `pii_erased_at timestamptz` (null = intact; set when an account
  deletion anonymized a **paid** invitation — marks "personal data removed, kept as
  a financial record").

## Architecture

### User self-service (profile)
- `exportMyData()` (owner-gated): decrypt **this user's** invitations + child rows
  → a downloadable JSON bundle. Audited. Never touches another user's data;
  `password_hash` excluded.
- `requestAccountDeletion(reason?)`: insert an `account_deletion_requests` row
  (pending, `scheduled_for` = now + 7 days) behind a strong confirm dialog. The user
  can **cancel within the 7-day grace** (`cancelAccountDeletion()`); the operator
  only processes on/after `scheduled_for`.

### Operator (`/admin/users`)
- **Find user by email** → account info + their invitations (statuses + paid counts
  from module 2/3).
- **Pending deletion requests** list.
- `adminProcessDeletion(requestId)` — the deletion routine:
  1. For each of the user's invitations: **unpaid draft →** hard-delete (row +
     children + storage). **Paid →** **anonymize in place**: delete the PII child
     rows (guests, rsvps, attendances, gift_confirmations, guestbook_notes,
     playlist), remove storage, scrub `config` personal fields, null
     `email`/`owner_email`, set `owner_user_id = null`, set `archived_at` +
     `pii_erased_at` — **keep** the invitation row + `paid_amount_idr/paid_source`
     and its financial child rows (`plan_upgrades`, `quota_addons`, `refunds`).
  3. Delete the **auth user** (their login). Mark the request `processed`;
     `logAdminAction`. Idempotent.
- `adminRejectDeletion(requestId, note)`.
- `adminExportUserData(userId)` — the same decrypt/export, operator-triggered +
  audited.

Reuses module 0 (`requireAdmin`, `logAdminAction`, cache), the crypto lib
(`GUESTS/APP` keys), Supabase auth admin (`deleteUser`), and storage cleanup.

## Interfaces

- `exportMyData(): Promise<Blob | { url }>`; `requestAccountDeletion(reason?: string): Promise<Result>`.
- `adminProcessDeletion(requestId: string): Promise<Result>`; `adminRejectDeletion(requestId: string, note: string): Promise<Result>`.
- `adminExportUserData(userId: string): Promise<Blob | { url }>`.

## Red-team / edge cases

- **PDP vs tax:** paid invitations are **anonymized** (PII erased) not deleted, so
  financial/tax records survive; unpaid drafts are hard-deleted. Both rights met.
- **Export is the only decrypt path** — owner-gated (own data only) or operator
  (audited); never exposes another user's data; `password_hash` never leaves.
- **Storage doesn't cascade** — deletion/anonymization removes
  `invitation-media/<id>/` explicitly.
- **Deletion is request → operator-processed** (not instant self-delete) — prevents
  accidental/angry erasure and lets the operator apply the paid nuance.
- **7-day grace before permanent:** the request is cancellable by the user for 7
  days; `adminProcessDeletion` runs only on/after `scheduled_for` — a safety net for
  regret / mis-click.
- **Idempotent** — reprocessing a request is safe; an anonymized invitation
  (`pii_erased_at` set, `owner_user_id` null) renders as taken-down (not public).
- **Detached invitations:** a paid+anonymized invitation has no owner — it exists
  only as a financial record; it must not appear in anyone's dashboard/profile.
- Export of a large guest list should stream/paginate (perf).

## Testing

- **Unit:** `requestAccountDeletion` inserts pending; `adminProcessDeletion`
  anonymizes paid (PII gone, money + financial rows kept, `pii_erased_at`/
  `owner_user_id`=null set), hard-deletes unpaid drafts, removes storage, deletes
  the auth user, and is idempotent; `exportMyData` / `adminExportUserData` decrypt
  only that user's rows and audit-log; a non-owner cannot export another's data;
  `adminRejectDeletion` records a note.
- **Manual:** submit a deletion request for an account with one paid + one draft
  invitation → confirm the draft is gone, the paid one is anonymized (no names, no
  guests, but amount/date/plan intact), storage emptied, login removed; download a
  data export and check it's complete + decrypted.

## Out of scope

- Reset password (self-service forgot-password exists), change email, transfer
  ownership.
- Scheduled/automatic deletion; selective/partial export.

## Operator steps

- Apply the module-5 migration (`account_deletion_requests`,
  `invitations.pii_erased_at`).
