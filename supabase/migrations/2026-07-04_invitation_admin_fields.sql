-- supabase/migrations/2026-07-04_invitation_admin_fields.sql
-- Admin invitation fields. Idempotent; safe to re-run.
alter table public.invitations add column if not exists paid_source text
  check (paid_source in ('xendit','manual','comp'));
alter table public.invitations add column if not exists paid_amount_idr integer;
alter table public.invitations add column if not exists archived_at timestamptz;

-- Backfill existing paid rows: they came through Xendit.
update public.invitations set paid_source = 'xendit' where is_paid = true and paid_source is null;
