-- ============================================================================
-- 2026-06-08 — Buku Tamu v2: souvenir / table tracking (A-4).
-- Idempotent, safe to re-run. Apply in Supabase SQL editor with the deploy.
-- New columns inherit the existing server-only RLS on attendances (no anon).
-- souvenir_taken / table_no are non-PII → stored plaintext (name_enc/note_enc
-- stay encrypted). guestbook_souvenir_enabled is a per-invitation UI toggle.
-- ============================================================================

ALTER TABLE attendances ADD COLUMN IF NOT EXISTS souvenir_taken boolean NOT NULL DEFAULT false;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS table_no       text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS guestbook_souvenir_enabled boolean NOT NULL DEFAULT false;
