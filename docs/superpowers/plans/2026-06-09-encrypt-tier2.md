# Encrypt Tier-2 (guestbook_notes + playlist_songs) — Plan

**Date:** 2026-06-09
**Goal:** Close the encryption consistency gap — no plaintext guest names anywhere. Mirror the `gift_confirmations` (tier-1) pattern.

**Scope decided:**
- `guestbook_notes` (8 rows, has API + read path): full treatment — add `_enc`, backfill, switch code to read/write `_enc`, drop plaintext.
- `playlist_songs` (0 rows, NO code path anywhere — confirmed by grep): schema-only consistency — add `suggested_by_enc`, drop `suggested_by`. No backfill, no code change.
- Domain key: **APP_ENCRYPTION_KEY** (guest-submitted content, same as rsvps/gift/attendances).

**NOT in git:** `scripts/export-decrypted.mjs` (legal decrypt tool) stays untracked/secret per user.

## Sequence (order matters — avoid breaking the running app)
1. **Phase-1 migration** `2026-06-09_encrypt_tier2.sql` (add `_enc` cols) → apply via MCP.
2. **Backfill** — add `backfillGuestbookNotes()` to `scripts/encrypt-existing-data.mjs`; run it (encrypts the 8 rows). playlist: 0 rows → nothing.
3. **Code** — `/api/guestbook/route.ts` writes+reads `_enc` (encryptField/decryptField from `@/lib/crypto/app`); `page.tsx injectGuestbookNotes` reads `_enc` + decrypts.
4. **Verify** — `tsc` clean; `execute_sql` confirms all 8 rows have `guest_name_enc IS NOT NULL`; export tool spot-check (no PII printed).
5. **Phase-2 migration** — drop plaintext `guest_name`/`message` (guestbook_notes) + `suggested_by` (playlist_songs) → apply via MCP.
6. **Commit** code + migration files (explicit paths; never the export tool).

## Migration SQL
Phase 1:
```sql
ALTER TABLE guestbook_notes ADD COLUMN IF NOT EXISTS guest_name_enc text;
ALTER TABLE guestbook_notes ADD COLUMN IF NOT EXISTS message_enc text;
ALTER TABLE playlist_songs  ADD COLUMN IF NOT EXISTS suggested_by_enc text;
```
Phase 2 (after backfill + code):
```sql
ALTER TABLE guestbook_notes DROP COLUMN IF EXISTS guest_name;
ALTER TABLE guestbook_notes DROP COLUMN IF EXISTS message;
ALTER TABLE playlist_songs  DROP COLUMN IF EXISTS suggested_by;
```
