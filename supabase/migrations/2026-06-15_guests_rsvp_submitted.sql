-- 2026-06-15 — Permanent "this guest completed an RSVP" marker. Idempotent.
--
-- Separate from token_used_at (which a regenerate resets). Set ONLY after a
-- successful RSVP insert; never cleared by regenerate. Blocks duplicate RSVPs
-- when an owner regenerates a guest's code after they already RSVP'd. A failed
-- RSVP insert leaves it null so regenerate can still recover the guest.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS rsvp_submitted_at timestamptz;
