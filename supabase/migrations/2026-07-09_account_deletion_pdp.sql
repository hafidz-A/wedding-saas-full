-- supabase/migrations/2026-07-09_account_deletion_pdp.sql
-- Module 5 (PDP): request-based account deletion + a marker for a paid invitation
-- whose personal data was erased but kept as an anonymized financial record. Idempotent.
create table if not exists public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  email         text,
  reason        text,
  status        text not null default 'pending' check (status in ('pending','cancelled','processed','rejected')),
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null,             -- requested_at + 7-day grace
  processed_by  text,
  processed_at  timestamptz,
  note          text
);
alter table public.account_deletion_requests enable row level security; -- server-side only

-- One open (pending) request per user.
create unique index if not exists adr_one_pending_per_user
  on public.account_deletion_requests (user_id) where status = 'pending';

-- null = intact; set when an account deletion anonymized a PAID invitation
-- (personal data removed, kept as a financial record).
alter table public.invitations add column if not exists pii_erased_at timestamptz;
