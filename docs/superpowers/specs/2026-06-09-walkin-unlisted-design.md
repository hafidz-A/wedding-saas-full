# Walk-in Tak Terdaftar — Design Spec

**Date:** 2026-06-09
**Status:** Approved design → plan → implementation
**Scope:** Sub-proyek A (owner-side walk-in for guests not on the invitation list)

---

## 1. Context & goal

The Buku Tamu walk-in flow (`addWalkInAttendance` + `WalkInDialog`) currently only
lets the couple add a guest who is **already in the imported `guests` list**. A
real stranger who shows up at the venue cannot be recorded. This sub-project lets
panitia add an **unlisted guest** ("tamu tak terdaftar") to the ledger, gated by a
**strong confirmation**, with a permanent **badge** and a **filter** for audit.

Shared dashboard code → applies to both lovebirds & solary. Premium-only (inherits
`GuestbookLocked`).

## 2. Non-goals

- **Sub-proyek B** (public RSVP verification/moderation) — separate, later, and the
  user wants it kept simple (no heavy moderation queue).
- **No migration.** `attendances.guest_id` is already nullable; an unlisted entry is
  `source='walkin'` with `guest_id=null`.

## 3. Data model

No schema change. The three ledger buckets are derived, not stored:

| Bucket | Condition |
|---|---|
| `rsvp` | `source = 'rsvp'` |
| `walkin` (listed) | `source = 'walkin'` AND `guest_id` IS NOT NULL |
| `unlisted` | `source = 'walkin'` AND `guest_id` IS NULL |

A single pure helper `attendanceCategory(row)` is the **one source of truth** for
this classification, used by both the badge (LedgerTable) and the filter (GuestbookTab)
so they can never drift.

## 4. Server action — `addUnlistedAttendance(slug, { name, count, note })`

In `dashboard/guestbook/actions.ts`. Mirrors `addWalkInAttendance` but takes a raw
typed `name` instead of a `guestId`:
- `authorizeOwnership(slug)`; validate `name` (1–120 chars, required) + `count` (1–20).
- Insert `attendances`: `source='walkin'`, `guest_id=null`, `rsvp_id=null`,
  `name_enc=encryptField(name)`, `note_enc=encryptField(note)`, `arrived_at=now()`,
  `guest_count`.
- No unique-index conflict (the guest-unique index only applies where `guest_id` IS NOT NULL).
- Returns the existing `AddWalkInResult` shape via `fromDbRow`.
- Name is **encrypted** like every other attendance name; `guest_count` plaintext.

## 5. UX — `WalkInDialog.tsx`

A third dialog mode (alongside search + picked):
- **Affordance:** in the no-results state (and as a secondary action below the results
  list when results exist), show **"Tambah '[query]' sebagai tamu tak terdaftar"**.
- **Manual-entry panel** (`manualMode`): editable **name** (prefilled from the query) +
  **jumlah tamu** + **catatan** (reuse the existing `dialogCountLabel` / `dialogNoteLabel`
  fields) + **Tambah** / **Batal**.
- **Strong confirmation:** clicking Tambah opens the existing `useConfirm` dialog with
  tone `danger`: *"Tamu ini TIDAK ada di daftar undangan. Tambah '[name]' sebagai tamu
  tak terdaftar?"* → only on confirm does it call `addUnlistedAttendance`.

## 6. Display & filter

- **Badge:** new amber `badgeUnlisted` style + `sourceUnlisted` label, shown when
  `attendanceCategory(row) === 'unlisted'`. LedgerTable's source cell switches on the
  category (unlisted / walkin / rsvp).
- **Filter:** the source-filter chips become **Semua / RSVP / Walk-in / Tak terdaftar**.
  The predicate uses `attendanceCategory(row)`; each row falls in exactly one bucket
  (the "Walk-in" chip now means *listed* walk-ins only).

## 7. Stats

Unlisted entries stay folded into the existing **walk-in** count and the arrived/total
stats (they did attend). No separate stat number — the badge + filter cover audit.

## 8. i18n (id + en, dict-parity guarded)

New `tabs.guestbook` keys: `sourceUnlisted`, `filterUnlisted`, `addUnlistedBtn`
(uses `{q}`), `unlistedNameLabel`, `unlistedConfirm` (uses `{name}`), `unlistedNameRequired`.

## 9. Testing

- **Unit (pure):** `attendanceCategory` (rsvp / listed walk-in / unlisted).
- **Manual smoke:** open "+ Tamu Datang" → search a name not in the list → "Tambah … tak
  terdaftar" → confirm dialog → row appears with the **Tak terdaftar** badge and a
  check-in time → the **Tak terdaftar** filter isolates it → delete works. Repeat on the
  other template.
- No automated test for the DB action (repo has no server-action harness) — tsc + smoke.
