-- supabase/migrations/2026-07-06_invitation_suspend.sql
-- Suspend lock (hard takedown). `suspended_at` hides the public page AND blocks
-- the couple from re-publishing — unlike a soft unpublish they could undo.
-- Idempotent; safe to re-run.
alter table public.invitations add column if not exists suspended_at timestamptz;
