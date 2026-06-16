-- ============================================================================
-- 2026-06-16 — attendances.source: add 'unregistered'.
--
-- The Buku Tamu now distinguishes three sources when the couple records who
-- actually arrived (see src/app/[template]/[slug]/dashboard/guestbook/actions.ts):
--   'rsvp'         → the guest filled the RSVP (kept even when the committee
--                    records their arrival manually).
--   'walkin'       → an invited guest (in the guest list) who did NOT RSVP.
--   'unregistered' → someone not in any list ("tak terdaftar").
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent — safe to re-run.
-- ============================================================================

ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_source_check;

ALTER TABLE attendances
  ADD CONSTRAINT attendances_source_check
  CHECK (source IN ('rsvp', 'walkin', 'unregistered'));
