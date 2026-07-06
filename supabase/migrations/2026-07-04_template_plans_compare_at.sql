-- supabase/migrations/2026-07-04_template_plans_compare_at.sql
-- Optional "compare-at" (strikethrough) price for a plan. Display-only; the
-- charge stays price_idr. Idempotent; safe to re-run.
alter table public.template_plans
  add column if not exists compare_at_price_idr integer;
