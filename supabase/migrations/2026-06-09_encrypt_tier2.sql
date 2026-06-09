-- ============================================================================
-- 2026-06-09 — Tier-2 field encryption: guestbook_notes + playlist_songs.
-- Closes the consistency gap (no plaintext guest names at rest). Mirrors the
-- tier-1 pattern. Encrypted under APP_ENCRYPTION_KEY (guest-submitted content).
--
-- Two-phase, idempotent. Runbook:
--   Phase 1 (this file, top) → run scripts/encrypt-existing-data.mjs → deploy
--   code that reads/writes _enc → Phase 2 (drop plaintext, bottom block).
-- ============================================================================

-- ── Phase 1: add encrypted columns ─────────────────────────────────────────
ALTER TABLE guestbook_notes ADD COLUMN IF NOT EXISTS guest_name_enc text;
ALTER TABLE guestbook_notes ADD COLUMN IF NOT EXISTS message_enc    text;
ALTER TABLE playlist_songs  ADD COLUMN IF NOT EXISTS suggested_by_enc text;

-- ── Phase 2: drop plaintext (run ONLY after backfill + code deploy) ─────────
-- ALTER TABLE guestbook_notes DROP COLUMN IF EXISTS guest_name;
-- ALTER TABLE guestbook_notes DROP COLUMN IF EXISTS message;
-- ALTER TABLE playlist_songs  DROP COLUMN IF EXISTS suggested_by;
