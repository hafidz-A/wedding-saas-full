# Single-use RSVP token gate — design

**Date:** 2026-06-14
**Status:** Approved design, pending implementation plan
**Scope:** All templates (lovebirds + solary). Shared public endpoints `/api/rsvp` and `/api/guestbook`, the dashboard Guests tab, and both templates' RSVP + ucapan forms.

---

## Goal

Stop irresponsible third parties from blasting RSVP/ucapan submissions and reduce
error/DDoS surface, by requiring an **invited guest** to enter a **single-use
6-digit token** before any RSVP or ucapan write reaches the database. The token is
delivered to the guest inside the owner's WhatsApp invitation blast. The owner can
**regenerate** a guest's token to recover from a guest error or a lost code.

This closes the current blast surface: today both `/api/rsvp` and `/api/guestbook`
insert for *anyone*, gated only by rate limiting.

---

## Decisions (locked with the user)

1. **Entry model:** manual OTP-style — the guest types the 6 digits from the WA
   message into a field on the form. (Not a magic-link query param.)
2. **Gate scope:** **hard gate, always.** RSVP always requires a valid token. The
   owner must register guests and send tokens first. There is no "open if list is
   empty" fallback.
3. **Surfaces gated:** both **RSVP** and **ucapan** (guestbook note) submission.
   Sections render **fully open / not locked** — content stays visible; the gate is
   only at the **submit** step (must enter a valid token to submit).
4. **Single-use semantics:** **truly single-use.** A token dies on the *first*
   successful action — RSVP **or** ucapan, whichever happens first. A guest who
   leaves an ucapan first is then blocked from RSVP with the same code (and
   vice-versa). The owner **Regenerate** button is the documented escape hatch. On-form
   copy will hint "1 kode = 1 kali kirim."
5. **Backfill:** a one-shot script generates tokens for all pre-existing guests.
6. **Dummy `123456`:** preview-only and **client-side**. Preview/demo submits are
   already simulated (no DB write); `123456` shows as the placeholder and "passes"
   cosmetically. Live published endpoints have **no** `123456` backdoor.

---

## Data model

One token per invited guest (`guests` row = one household/invitation recipient).
New columns on `guests`:

| Column | Type | Purpose |
|---|---|---|
| `rsvp_token_enc` | text (nullable) | AES-GCM ciphertext of the 6 digits, guests-domain key (`GUESTS_ENCRYPTION_KEY`). Lets the **owner** read/copy the code and the WA blast render it. Reversible. |
| `rsvp_token_hash` | text (nullable) | HMAC-SHA256 of `invitation_id + ":" + token` keyed by the guests-domain key. The **indexed lookup + comparison** key — no plaintext token sits queryable. |
| `token_used_at` | timestamptz (nullable) | Set on the first successful action (RSVP or ucapan). Non-null ⇒ token spent. |
| `token_regenerated_at` | timestamptz (nullable) | Audit/ordering for regenerate. |

**Index:** unique on `(invitation_id, rsvp_token_hash)` — guarantees no collision
within one couple's list and gives O(1) validation lookup.

**Why hash + enc (not plaintext, not hash-only):**
- Owner must *read* the code to send it ⇒ need a reversible copy ⇒ `rsvp_token_enc`.
- Don't want raw codes in a queryable column if the DB leaks ⇒ lookup via
  `rsvp_token_hash` (HMAC, not reversible).
- Consistent with the repo's existing encryption posture (all guest PII encrypted at
  rest; reuses `src/lib/guests/crypto.ts`).

---

## Components

### `src/lib/guests/token.ts` (new)
Pure, unit-testable helpers — no DB:
- `generateToken(): string` — 6 random digits (crypto RNG, zero-padded, not sequential).
- `hashToken(invitationId, token): string` — HMAC-SHA256 keyed by guests-domain key.
- `encryptToken(token)` / `decryptToken(enc)` — thin wrappers over guests crypto.
- `formatTokenForDisplay` if any grouping is wanted (likely raw 6 digits).

### `/api/rsvp/route.ts` and `/api/guestbook/route.ts` (edit)
Add an identical validate-and-consume step **before** the existing insert:
1. Resolve slug → invitation (must be live: published AND paid — unchanged).
2. Require `token` in the body (6 digits). Missing/malformed ⇒ 400 generic error.
3. `hashToken(invitation.id, token)` → look up the guest by
   `(invitation_id, rsvp_token_hash)`.
4. **Atomic consume:** conditional `UPDATE guests SET token_used_at = now()
   WHERE id = ? AND token_used_at IS NULL` and check affected rows.
   - 0 rows because not found / already used ⇒ reject with a **generic** message
     ("Kode tidak valid atau sudah dipakai") so an attacker can't distinguish
     wrong-vs-used.
   - 1 row ⇒ proceed to the existing insert.
5. Consume-first ordering is deliberate (anti-double-spend under concurrency). If the
   subsequent insert 500s, the token is burned — rare; owner regenerate recovers.
6. Keep generic errors + the existing per-IP rate limits, tightened on wrong-token,
   as the brute-force backstop (6 digits = 1e6 space; ~hundreds valid per invite ⇒
   negligible guess odds).

### `src/lib/guests/whatsapp.ts` (edit)
- `TemplateVars` gains `token: string`.
- `renderMessageTemplate` supports `{{token}}` / `{{kode}}`.
- Default blast message updated to include the code line.

### Dashboard Guests tab — `actions.ts` / `types.ts` / UI (edit)
- `GuestRow` gains `rsvpToken: string | null` and `tokenUsedAt: string | null`
  (decrypted server-side for owner display).
- Guest creation auto-generates a token (enc + hash + clears used).
- New server action `regenerateGuestToken(guestId)` — re-verifies the slug/session,
  writes a fresh enc+hash, clears `token_used_at`, stamps `token_regenerated_at`.
- UI: show the 6-digit code per row (with a "terpakai" badge when spent), a
  **Regenerate** button, and the updated WA-blast default message.

### Public forms (edit, both templates)
- Lovebirds `sections/Rsvp/Rsvp.jsx`: add a 6-digit token field; pass `token` in the
  `/api/rsvp` fetch.
- Solary `sections/RSVPSection.jsx` + `services/rsvp.js`: same field + pass `token`.
- Ucapan form(s) in both templates: same field; pass `token` to `/api/guestbook`.
  (Exact ucapan submit client to be located during plan — `/api/guestbook` caller was
  not found via static grep; likely builds the URL dynamically.)
- Preview/demo path keeps the existing simulated-success branch; `123456` is the
  field placeholder and is accepted only on that simulated path.

### Backfill — `scripts/backfill-rsvp-tokens.mjs` (new)
After the migration, generate enc+hash for every existing guest with a null
`rsvp_token_hash`. Idempotent (skips guests that already have one). Mirrors the
crypto used by the app helper.

---

## Data flow (live RSVP)

```
Guest types name + 6-digit code → POST /api/rsvp { slug, guest_name, attending, ..., token }
  → resolve slug → invitation (published+paid)
  → hashToken(invitation.id, token)
  → UPDATE guests SET token_used_at=now() WHERE invitation_id=? AND rsvp_token_hash=? AND token_used_at IS NULL
      0 rows → 4xx "Kode tidak valid atau sudah dipakai"
      1 row  → INSERT rsvps (+ attendances) as today → 200
```

Ucapan flow is identical against `/api/guestbook` → `guestbook_notes`.

---

## Error handling

- Missing/malformed token → 400, generic.
- Not found / already used → 4xx, single generic message (no oracle).
- Rate-limit hit → existing 429 path, unchanged.
- Insert failure after consume → 500; token already burned (acceptable, regenerate).
- Preview/demo → never reaches server validation; simulated success.

---

## Testing

- `token.ts` unit tests: generation shape/randomness, hash determinism + key
  dependence, enc round-trip.
- `/api/rsvp` + `/api/guestbook` route tests: valid token consumes + inserts; reused
  token rejected; wrong token rejected; missing token rejected; concurrent
  double-submit consumes once.
- Guests `actions` smoke (tsc + fake supabase): create generates token; regenerate
  resets used + changes hash.
- `whatsapp.ts`: `{{token}}`/`{{kode}}` render.
- dict-parity for any new ID/EN copy keys (token field label, errors, hint).
- Verify with `npx tsc --noEmit` + `npx vitest run` (repo lint hangs — do not use).

---

## Out of scope / non-goals

- Magic-link auto-fill via URL (explicitly chose manual entry).
- "Open RSVP when guest list empty" fallback (explicitly chose hard gate).
- Per-action dual-slot reuse (explicitly chose truly single-use).
- Changing walk-in / owner-side unlisted attendance (owner-authenticated, unaffected).
- Token expiry/TTL (not requested; regenerate covers recovery).

---

## Rollout notes

- Migration applied to prod via Supabase MCP (existing flow), then run the backfill
  script.
- Branch hygiene: current branch `feat/solary-editor` has unrelated user WIP — never
  `git add -A`; stage only this feature's files.
- Hard-gate means any couple already live with an empty guest list would have RSVP
  break. Confirm at rollout whether to seed/grace existing live invitations, or treat
  the gate as effective only once they add guests. (Flagged for plan.)
