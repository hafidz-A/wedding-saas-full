-- ============================================================================
-- 2026-06-30 — Guest quota: plan-derived base + paid add-on blocks.
--
--   effective_quota = base_guest_quota(plan) + guest_quota_extra
--
-- Base is config on template_plans (Basic 200 / Premium 300), so a Basic→Premium
-- upgrade lifts the base for free. guest_quota_extra is the purchased add-on
-- (multiple of 50), bumped only by a verified PAID quota_addons row.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent (IF NOT EXISTS), safe to re-run.
-- ============================================================================

-- 1. Base quota per plan (config-driven). Backfill existing rows.
ALTER TABLE public.template_plans
  ADD COLUMN IF NOT EXISTS base_guest_quota integer NOT NULL DEFAULT 200;
UPDATE public.template_plans SET base_guest_quota = 200 WHERE plan_code = 'basic';
UPDATE public.template_plans SET base_guest_quota = 300 WHERE plan_code = 'premium';

-- 2. Purchased add-on (guests beyond base), multiple of 50.
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS guest_quota_extra integer NOT NULL DEFAULT 0;

-- 3. Add-on purchase ledger (mirrors plan_upgrades). external_id prefix qta_.
CREATE TABLE IF NOT EXISTS public.quota_addons (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id      uuid          NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  qty_guests         integer       NOT NULL,
  amount_idr         integer       NOT NULL,
  xendit_invoice_id  text,
  xendit_external_id text          UNIQUE,
  status             text          NOT NULL DEFAULT 'pending',  -- pending | paid
  created_at         timestamptz   NOT NULL DEFAULT now(),
  paid_at            timestamptz,
  CONSTRAINT quota_addons_status_valid    CHECK (status IN ('pending', 'paid')),
  CONSTRAINT quota_addons_qty_positive    CHECK (qty_guests > 0),
  CONSTRAINT quota_addons_amount_positive CHECK (amount_idr > 0)
);

CREATE INDEX IF NOT EXISTS quota_addons_invitation_idx
  ON public.quota_addons (invitation_id);

-- RLS: payment data is service-role only. No anon/authenticated policies, so
-- with RLS enabled the table is invisible to client keys; the webhook, checkout
-- action, and recheck all use the service-role admin client.
ALTER TABLE public.quota_addons ENABLE ROW LEVEL SECURITY;

-- 4. Atomic increment so two paid callbacks can't lose an update (read-modify-write
--    race). The webhook calls this rather than fetching-then-updating.
CREATE OR REPLACE FUNCTION public.increment_guest_quota_extra(p_invitation_id uuid, p_qty integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.invitations
     SET guest_quota_extra = guest_quota_extra + p_qty
   WHERE id = p_invitation_id;
$$;
