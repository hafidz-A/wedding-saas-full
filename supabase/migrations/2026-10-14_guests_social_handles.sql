-- 2026-10-14 — Optional Instagram / Facebook handle per guest. Idempotent.
--
-- Lets the couple open the guest's Instagram DM (ig.me/m/<user>) or Messenger
-- chat (m.me/<user>) with the invite message already copied, for guests they
-- reach outside WhatsApp. Both are guest PII, so — like name_enc / phone_enc —
-- they are AES-GCM ciphertext under GUESTS_ENCRYPTION_KEY
-- (src/lib/guests/crypto.ts), stored as the normalised handle.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS instagram_enc text,
  ADD COLUMN IF NOT EXISTS facebook_enc  text;
