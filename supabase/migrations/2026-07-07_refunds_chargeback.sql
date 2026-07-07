-- supabase/migrations/2026-07-07_refunds_chargeback.sql
-- Allow refunds.method = 'chargeback' (a bank dispute pulled the money back —
-- recorded + netted out of revenue like a refund, and flagged). Idempotent.
alter table public.refunds drop constraint if exists refunds_method_check;
alter table public.refunds add constraint refunds_method_check
  check (method in ('xendit','manual','chargeback'));
