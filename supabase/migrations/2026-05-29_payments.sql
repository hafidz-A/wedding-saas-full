-- Payments / multi-invitation support.
-- Apply in the Supabase SQL editor. owner_user_id is intentionally NOT unique,
-- so one account can own many invitations.

alter table public.invitations add column if not exists is_paid boolean not null default false;
alter table public.invitations add column if not exists xendit_invoice_id text;
alter table public.invitations add column if not exists xendit_external_id text;
alter table public.invitations add column if not exists paid_at timestamptz;

create index if not exists idx_invitations_xendit_external on public.invitations (xendit_external_id);
