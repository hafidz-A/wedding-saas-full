# Self Check-in QR — Design Spec

**Date:** 2026-06-09
**Status:** Approved design → plan → implementation
**Scope:** A-5 (one venue QR → guest self-checks-in by name). Manual check-in stays the primary, always-available path.

---

## 1. Context & goal

Add an **optional** self check-in lane: the couple prints ONE QR for the reception
desk; an arriving guest scans it, types their name, picks themselves from the
invited / RSVP'd names, and is marked **Hadir**. Strangers and non-digital guests
are still handled by panitia via the existing dashboard manual tools (mark "Hadir ✓",
add walk-in, add unlisted). The QR is additive — never the only way in.

## 2. Non-goals / decisions

- **No per-guest QR / no camera scanner** — one shared venue QR per invitation.
- **No per-template styling** — the check-in page is a clean, neutral, mobile-first page.
- **No custom active-time window** — check-in follows the invitation's existing plan /
  active-period gating, i.e. the SAME `is_published && is_paid` rule the public
  invitation page and RSVP/guestbook endpoints use. When the invitation is no longer
  live (unpaid / unpublished / plan lapsed), check-in stops too — exactly like the rest
  of the public site. Token-gating (QR only exists at the venue) is the additional gate.
- **No third-party service.** Token = `crypto.randomBytes(16).toString('hex')` (Node, zero deps). QR rendered locally with the offline `qrcode` npm library (no network/account/API key).
- Check-in page copy is **Indonesian only** (venue tool for local guests); the dashboard QR card is bilingual (dict-parity).

## 3. Data model

One new column — **1 migration**:
```sql
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS checkin_token text;
```
One shared secret per invitation. No per-guest token, no new table. Self check-ins
write to the existing `attendances` ledger (`arrived_at`).

## 4. Security & privacy

- Every check-in endpoint requires `?k=<token>` to equal `invitations.checkin_token`
  for a **published + paid** invitation. Wrong/missing token → no data, ever (the
  encrypted guest list can't be browsed without the venue QR).
- Both public endpoints are IP **rate-limited** via the existing `enforceRateLimit`.
- Search returns **display names only** (no phone/group). Min query length 3 (enforced
  server-side too).
- The confirm endpoint **never trusts the client's name** — it re-derives the name from
  the verified `guests`/`rsvps` row (whose `invitation_id` must match the slug).

## 5. Components & flow

**A. Token (owner, dashboard)** — server actions in `guestbook/actions.ts`:
- `ensureCheckinToken(slug)` → generates + stores a token if none, returns it.
- `regenerateCheckinToken(slug)` → new token (invalidates the old QR).

**B. Dashboard "QR Check-in" card** (in the Buku Tamu tab) — calls `ensureCheckinToken`,
renders the QR for `<origin>/<template>/<slug>/checkin?k=<token>` via `qrcode`
(`toDataURL` → `<img>`), with **Print** + **Ganti token** (confirm-gated). Bilingual.

**C. Public page** `src/app/[template]/[slug]/checkin/page.tsx` (server component):
validates `searchParams.k` vs the token + invitation live; on failure renders a neutral
"Link tidak valid" notice; on success renders the client `CheckinForm`.

**D. Public API** (rate-limited route handlers):
- `POST /api/checkin/search` — `{ slug, token, q }` → validates token, decrypts
  `guests.name_enc` (guests key) + `rsvps.guest_name_enc` (app key), runs the pure
  `matchCheckinNames` (filter ≥3 chars, dedupe by normalized name, cap 5) →
  returns `[{ kind: 'guest'|'rsvp', id, name }]`.
- `POST /api/checkin/confirm` — `{ slug, token, kind, id }` → validates token, verifies
  the picked row belongs to the invitation, **idempotently** sets `arrived_at`:
  - `rsvp`: update the attendance with that `rsvp_id`, else insert one (source `rsvp`).
  - `guest`: update the attendance with that `guest_id`, else insert one (source `walkin`,
    `guest_id` set). The unique `(invitation_id, guest_id)` index prevents duplicates.
  Returns `{ ok, name }` for the welcome message.

**E. Pure helper** `src/lib/checkin/match.ts` — `matchCheckinNames(query, candidates)`:
normalize (lowercase, collapse spaces), require ≥3 chars, substring-filter, dedupe by
normalized name (prefer `rsvp`), cap 5. Unit-tested.

## 6. Idempotency with manual check-in

Both QR and manual paths set `arrived_at` on the SAME per-guest attendance row (matched
by `rsvp_id`/`guest_id`), so scanning then a manual tap (or vice-versa) never
double-counts. Self check-ins keep their natural `source` (rsvp/walkin) — no new badge.

## 7. Testing

- **Unit:** `matchCheckinNames` (min length, substring, dedupe, cap).
- **Manual smoke:** dashboard → generate QR → open `/checkin?k=<token>` → type a name →
  pick → "Hadir" → appears checked-in in the ledger; wrong/no token → blocked; manual
  "Hadir ✓" + walk-in + unlisted still work; scan-then-manual doesn't duplicate.
- No automated test for the route handlers / actions (no harness) — tsc + smoke.
