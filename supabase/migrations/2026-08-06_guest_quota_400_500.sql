-- ============================================================================
-- 2026-08-06 — Guest quota re-pricing.
--
--   Base quota:  Basic 200 → 400   ·   Premium 300 → 500
--
-- The add-on block stays at 50 guests / Rp 10.000 — a 100-guest block was
-- considered alongside this change and dropped. Block size lives in code
-- (BLOCK_SIZE in src/lib/payments/quota.ts), not here, so nothing in this
-- file touches it. Both new base values are multiples of 50, so the existing
-- block size and the quota validator keep working unchanged.
--
-- Plan prices are NOT touched. Existing `guest_quota_extra` values are left
-- as-is: a couple who already bought a 50-guest block keeps those 50 extra on
-- top of the new, larger base, so nobody loses quota.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent, safe to re-run.
-- ============================================================================

-- 1. New base quota per plan.
UPDATE public.template_plans SET base_guest_quota = 400 WHERE plan_code = 'basic';
UPDATE public.template_plans SET base_guest_quota = 500 WHERE plan_code = 'premium';

-- 2. Column default follows Basic (a new plan row inherits the Basic base).
ALTER TABLE public.template_plans ALTER COLUMN base_guest_quota SET DEFAULT 400;

-- 3. Customer-facing feature bullets mention the quota — keep them in sync.
--    (These strings render as-is on the marketing landing via VibePlanCard.)
UPDATE public.template_plans
   SET features = (
         SELECT jsonb_agg(
                  CASE WHEN f::text LIKE '%Kuota tamu 200 orang%' THEN '"Kuota tamu 400 orang"'::jsonb
                       ELSE f END)
           FROM jsonb_array_elements(features) AS f)
 WHERE plan_code = 'basic'
   AND features::text LIKE '%Kuota tamu 200 orang%';

UPDATE public.template_plans
   SET features = (
         SELECT jsonb_agg(
                  CASE WHEN f::text LIKE '%Kuota tamu 300 orang%' THEN '"Kuota tamu 500 orang"'::jsonb
                       ELSE f END)
           FROM jsonb_array_elements(features) AS f)
 WHERE plan_code = 'premium'
   AND features::text LIKE '%Kuota tamu 300 orang%';
