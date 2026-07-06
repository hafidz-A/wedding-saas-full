-- supabase/migrations/2026-07-06_payments_revenue.sql
-- Module 3 — Payments & revenue foundation. Idempotent; safe to re-run.

-- invitations: lock the expected charge at checkout-START (so a price/promo change
-- mid-checkout can't reject a legit payment) + capture the gateway fee for NET revenue.
-- (paid_amount_idr already added in 2026-07-04_invitation_admin_fields.sql.)
alter table public.invitations add column if not exists expected_amount_idr integer;
alter table public.invitations add column if not exists fee_idr integer;

-- upgrades / addons already store amount_idr — add the gateway fee too.
alter table public.plan_upgrades add column if not exists fee_idr integer;
alter table public.quota_addons  add column if not exists fee_idr integer;

-- refunds ledger. One row per refunded source; FULL refunds only. A source is
-- "refunded" iff a row here with status='succeeded' references it.
create table if not exists public.refunds (
  id             uuid primary key default gen_random_uuid(),
  invitation_id  uuid references public.invitations(id) on delete set null,
  source_type    text not null check (source_type in ('initial','upgrade','addon')),
  source_id      text,
  amount_idr     integer not null,          -- always the stored paid amount, never user-supplied
  method         text not null check (method in ('xendit','manual')),
  status         text not null default 'pending' check (status in ('pending','succeeded','failed')),
  xendit_refund_id text,
  destination    jsonb,                      -- manual path: bank/account_no/holder; xendit: null (original source)
  reason         text,
  admin_email    text,
  created_at     timestamptz not null default now(),
  confirmed_at   timestamptz
);
alter table public.refunds enable row level security; -- service-role only (no policies)

-- Money safety: a source can have at most ONE succeeded refund (refunds once).
create unique index if not exists refunds_one_succeeded_per_source
  on public.refunds (source_type, source_id) where status = 'succeeded';

-- user-facing refund requests (operator reviews + decides — never instant self-service).
create table if not exists public.refund_requests (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid references public.invitations(id) on delete cascade,
  requested_by    uuid,
  source_type     text not null default 'initial',
  source_id       text,
  reason_category text check (reason_category in ('duplicate_payment','system_failure','inaccessible','other')),
  reason_text     text,
  usage_snapshot  jsonb,                     -- is_published, guest_count, rsvp_count, config_edited, days_since_paid
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by      text,
  decision_note   text,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);
alter table public.refund_requests enable row level security; -- reads go through server admin client + ownership check

-- One open (pending) request per invitation — blocks duplicate-spam.
create unique index if not exists refund_requests_one_pending_per_invitation
  on public.refund_requests (invitation_id) where status = 'pending';
