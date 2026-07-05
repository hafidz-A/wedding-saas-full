-- supabase/migrations/2026-07-04_admin_foundation.sql
-- Admin console foundation. Idempotent; safe to re-run.
create table if not exists public.admin_actions (
  id          uuid        primary key default gen_random_uuid(),
  admin_email text        not null,
  action      text        not null,
  target_type text,
  target_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security; -- service-role only, no policies
