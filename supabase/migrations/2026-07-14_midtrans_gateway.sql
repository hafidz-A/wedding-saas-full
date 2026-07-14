-- supabase/migrations/2026-07-14_midtrans_gateway.sql
-- Xendit → Midtrans migration: gateway-neutral column names + channel capture.
-- No live-money rows exist (Xendit was test-only), so renames are safe.
-- Idempotent: rename guarded by column-existence checks; safe to re-run.

do $$ begin
  -- invitations: xendit_external_id was OUR external id → becomes gateway_order_id
  -- (Midtrans keys status/refund/expire by OUR order_id, so this is the query key).
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='invitations' and column_name='xendit_external_id') then
    alter table public.invitations rename column xendit_external_id to gateway_order_id;
  end if;
  -- xendit_invoice_id was the GATEWAY's id → becomes gateway_txn_id (audit only).
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='invitations' and column_name='xendit_invoice_id') then
    alter table public.invitations rename column xendit_invoice_id to gateway_txn_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='plan_upgrades' and column_name='xendit_external_id') then
    alter table public.plan_upgrades rename column xendit_external_id to gateway_order_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='plan_upgrades' and column_name='xendit_invoice_id') then
    alter table public.plan_upgrades rename column xendit_invoice_id to gateway_txn_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='quota_addons' and column_name='xendit_external_id') then
    alter table public.quota_addons rename column xendit_external_id to gateway_order_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='quota_addons' and column_name='xendit_invoice_id') then
    alter table public.quota_addons rename column xendit_invoice_id to gateway_txn_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='refunds' and column_name='xendit_refund_id') then
    alter table public.refunds rename column xendit_refund_id to gateway_refund_id;
  end if;
end $$;

-- Payment channel captured from the PAID notification (payment_type) — drives
-- channel-aware refund routing (API refund vs manual transfer).
alter table public.invitations   add column if not exists paid_channel text;
alter table public.plan_upgrades add column if not exists paid_channel text;
alter table public.quota_addons  add column if not exists paid_channel text;

-- Merchant-minted idempotency key for the Midtrans Direct Refund API — a retry
-- with the same key (≤7 days) can never double-refund.
alter table public.refunds add column if not exists refund_key text;

-- Provenance values: 'xendit' → 'midtrans' / method 'xendit' → 'gateway'.
-- ORDER MATTERS: drop each check constraint BEFORE rewriting its rows, then
-- re-add the stricter list — otherwise the UPDATE (or the re-add) fails on
-- rows the old/new list doesn't cover.
alter table public.invitations drop constraint if exists invitations_paid_source_check;
update public.invitations set paid_source = 'midtrans' where paid_source = 'xendit';
alter table public.invitations add constraint invitations_paid_source_check
  check (paid_source in ('midtrans','manual','comp'));
alter table public.refunds drop constraint if exists refunds_method_check;
update public.refunds set method = 'gateway' where method = 'xendit';
alter table public.refunds add constraint refunds_method_check
  check (method in ('gateway','manual','chargeback'));

-- Keep the lookup index aligned with the renamed column (old index name kept
-- by the rename; recreate under a neutral name for clarity on fresh DBs).
create index if not exists idx_invitations_gateway_order on public.invitations (gateway_order_id);
