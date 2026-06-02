-- ============================================================================
-- 2026-06-02 — plan_upgrades: pay-the-difference plan upgrades (e.g. Basic →
-- Premium) for an already-paid, live invitation.
--
-- The initial-purchase flow stores the plan on the invitation row and the
-- Xendit webhook skips already-paid rows, so it can't express "already paid,
-- now pay a delta to change plan". Each upgrade attempt is its own row here,
-- correlated to a Xendit invoice via xendit_external_id (prefix `upg_`).
--
-- On a verified PAID upgrade the webhook sets invitations.plan = to_plan and
-- recomputes expires_at from the target plan's duration (Premium = lifetime =
-- NULL), WITHOUT touching is_paid / is_published — the live site stays up.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent (IF NOT EXISTS), safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_upgrades (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id       uuid          NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  from_plan           text          NOT NULL,
  to_plan             text          NOT NULL,
  amount_idr          numeric(14,0) NOT NULL,
  xendit_invoice_id   text,
  xendit_external_id  text          UNIQUE,
  status              text          NOT NULL DEFAULT 'pending',  -- pending | paid
  created_at          timestamptz   NOT NULL DEFAULT now(),
  paid_at             timestamptz,
  CONSTRAINT plan_upgrades_status_valid CHECK (status IN ('pending', 'paid')),
  CONSTRAINT plan_upgrades_amount_positive CHECK (amount_idr > 0)
);

CREATE INDEX IF NOT EXISTS plan_upgrades_invitation_idx
  ON plan_upgrades (invitation_id);

-- RLS: payment data is service-role only. No anon/authenticated policies, so
-- with RLS enabled the table is invisible to client keys; the webhook, checkout
-- action, and recheck all use the service-role admin client.
ALTER TABLE plan_upgrades ENABLE ROW LEVEL SECURITY;
