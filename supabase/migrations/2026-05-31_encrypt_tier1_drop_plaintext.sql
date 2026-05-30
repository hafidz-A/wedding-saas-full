-- ============================================================================
-- 2026-05-31 — Tier-1 encryption, step 2 of 2: DROP plaintext columns.
--
-- ⚠️  DESTRUCTIVE. Run ONLY after:
--   - 2026-05-31_encrypt_tier1.sql has been applied, AND
--   - node scripts/encrypt-existing-data.mjs has populated the _enc columns
--     for every existing row, AND
--   - you've verified the dashboard RSVP/Gifts tabs still show plaintext.
--
-- Sanity check before running (every row must have ciphertext):
--   SELECT count(*) FROM rsvps              WHERE guest_name_enc IS NULL;
--   SELECT count(*) FROM gift_confirmations WHERE guest_name_enc IS NULL;
-- Both must return 0. If not, re-run the backfill first.
-- ============================================================================

ALTER TABLE rsvps ALTER COLUMN guest_name_enc SET NOT NULL;
ALTER TABLE rsvps DROP COLUMN IF EXISTS guest_name;
ALTER TABLE rsvps DROP COLUMN IF EXISTS message;

ALTER TABLE gift_confirmations ALTER COLUMN guest_name_enc SET NOT NULL;
ALTER TABLE gift_confirmations DROP COLUMN IF EXISTS guest_name;
ALTER TABLE gift_confirmations DROP COLUMN IF EXISTS amount;
ALTER TABLE gift_confirmations DROP COLUMN IF EXISTS message;
