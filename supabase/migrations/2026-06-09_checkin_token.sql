-- 2026-06-09 — Self check-in: one shared secret token per invitation. Idempotent.
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS checkin_token text;
