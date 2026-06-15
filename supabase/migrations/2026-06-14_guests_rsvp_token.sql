-- 2026-06-14 — Single-use RSVP token per invited guest. Idempotent.
--
-- Each guests row gets a 6-digit code the owner sends via WhatsApp. The public
-- RSVP and ucapan endpoints require a valid, unused code before any write
-- (anti-blast / anti-DDoS). Columns:
--   rsvp_token_enc       AES-256-GCM ciphertext of the code (owner can read/blast it).
--   rsvp_token_hash      HMAC-SHA256 lookup key (no raw code is queryable).
--   token_used_at        set on first successful RSVP or ucapan -> single-use.
--   token_regenerated_at audit stamp when the owner regenerates a code.
-- See src/lib/guests/token.ts (hashing/encryption) and src/lib/guests/tokenGate.ts
-- (atomic consume). Backfill existing guests with scripts/backfill-rsvp-tokens.mjs.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS rsvp_token_enc       text,
  ADD COLUMN IF NOT EXISTS rsvp_token_hash      text,
  ADD COLUMN IF NOT EXISTS token_used_at        timestamptz,
  ADD COLUMN IF NOT EXISTS token_regenerated_at timestamptz;

-- One code per invitation: the (invitation_id, hash) pair is unique. Partial
-- index (hash not null) so pre-backfill rows with a null hash don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS guests_invitation_token_hash_uniq
  ON public.guests (invitation_id, rsvp_token_hash)
  WHERE rsvp_token_hash IS NOT NULL;
