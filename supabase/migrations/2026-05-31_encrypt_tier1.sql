-- ============================================================================
-- 2026-05-31 — Tier-1 encryption, step 1 of 2: ADD ciphertext columns.
--
-- Adds AES-256-GCM ciphertext columns (base64 of iv ‖ ciphertext ‖ authTag,
-- encrypted with APP_ENCRYPTION_KEY) alongside the existing plaintext ones,
-- so the app can start writing/reading ciphertext while old rows are
-- backfilled. The plaintext columns are made nullable here and DROPPED in
-- step 2 (2026-05-31_encrypt_tier1_drop_plaintext.sql).
--
-- Encrypted fields:
--   rsvps:              guest_name → guest_name_enc, message → message_enc
--   gift_confirmations: guest_name → guest_name_enc, amount → amount_enc,
--                       message → message_enc   (account_used stays plaintext)
--   attendances:        already uses name_enc / note_enc (Phase 2); the app
--                       now encrypts those writes — no schema change needed.
--
-- RUNBOOK (order matters):
--   1. Apply THIS migration.
--   2. Deploy the Phase 3 app code (writes ciphertext, reads either column).
--   3. Run: node scripts/encrypt-existing-data.mjs   (backfills old rows)
--   4. Verify row counts + spot-check the dashboard tabs.
--   5. Apply 2026-05-31_encrypt_tier1_drop_plaintext.sql.
--
-- Idempotent (IF NOT EXISTS / DROP NOT NULL is a no-op if already nullable).
-- ============================================================================

ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS guest_name_enc text,
  ADD COLUMN IF NOT EXISTS message_enc    text;

-- Plaintext columns become nullable so new inserts can write _enc only.
ALTER TABLE rsvps ALTER COLUMN guest_name DROP NOT NULL;

ALTER TABLE gift_confirmations
  ADD COLUMN IF NOT EXISTS guest_name_enc text,
  ADD COLUMN IF NOT EXISTS amount_enc     text,
  ADD COLUMN IF NOT EXISTS message_enc    text;

ALTER TABLE gift_confirmations ALTER COLUMN guest_name DROP NOT NULL;
