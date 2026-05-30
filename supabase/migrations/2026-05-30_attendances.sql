-- ============================================================================
-- 2026-05-30 — attendances: the "Buku Tamu" (guest attendance ledger).
--
-- One row per guest who attended the wedding. Two sources:
--   source='rsvp'   → auto-created when a guest submits an RSVP with
--                     attending=true (see src/app/api/rsvp/route.ts).
--   source='walkin' → added by the couple from the dashboard, matched
--                     against an existing guests row (typeahead search).
--
-- Gated to plan='premium' in the dashboard — basic plan does not get the tab.
--
-- Encrypted columns (base64 of AES-256-GCM iv ‖ ciphertext ‖ authTag):
--   name_enc — guest's display name. PLAINTEXT for now; Phase 3 switches
--              writes/reads to ciphertext + backfills. Named _enc so the
--              column survives that change without a rename.
--   note_enc — optional couple-only note / the RSVP message, nullable.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent (IF NOT EXISTS), safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  -- guest_id / rsvp_id use ON DELETE SET NULL so the attendance ledger
  -- survives deletion of the source RSVP or guest row (attendance is a
  -- historical fact — we keep name_enc even if the source goes away).
  guest_id      uuid REFERENCES guests(id) ON DELETE SET NULL,   -- null for RSVP-only entries
  rsvp_id       uuid REFERENCES rsvps(id)  ON DELETE SET NULL,   -- null for pure walk-ins
  name_enc      text NOT NULL,
  guest_count   int  NOT NULL DEFAULT 1 CHECK (guest_count BETWEEN 1 AND 20),
  source        text NOT NULL CHECK (source IN ('rsvp', 'walkin')),
  note_enc      text,
  arrived_at    timestamptz,                                     -- set on check-in (walk-ins: now())
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendances_invitation
  ON attendances(invitation_id, created_at DESC);

-- An RSVP creates exactly one attendance row (the auto-create insert relies
-- on this to stay duplicate-free across retries).
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_rsvp_unique
  ON attendances(rsvp_id) WHERE rsvp_id IS NOT NULL;

-- A walk-in for a given invited guest can only be added once (idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_guest_unique
  ON attendances(invitation_id, guest_id) WHERE guest_id IS NOT NULL;

-- RLS — server-only access via service_role (matches the guests table
-- convention). The dashboard reads/writes through server actions + the
-- RSVP API route, both of which validate ownership before touching the
-- table. No anon policies: anon cannot select/insert/update/delete.
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
