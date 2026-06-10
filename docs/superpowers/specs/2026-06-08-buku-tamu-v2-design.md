# Buku Tamu v2 — Design Spec

**Date:** 2026-06-08
**Status:** Approved design, pending spec review → implementation plan
**Scope:** A-1 + A-2 + A-3 + A-4 (A-5 / QR deferred)

---

## 1. Context & goal

The premium **Buku Tamu** (attendance ledger) is a single shared feature used by
**both** templates (lovebirds & solary). Today it only records who *intends* to
come — an RSVP with `attending=true` auto-creates an `attendances` row
(`source='rsvp'`, `arrived_at=null`, see `src/app/api/rsvp/route.ts`) — plus
manual walk-ins added by the couple (`source='walkin'`, `arrived_at=now()`).

Gaps this spec closes:

- **A-1** No day-of **check-in** for RSVP guests (`arrived_at` stays null forever).
- **A-2** Stats are thin (total entries / total guests / walk-ins) and conflate
  "promised to come" with "actually arrived".
- **A-3** No **export / print** for the reception desk.
- **A-4** No **souvenir / table-number** tracking (a classic Indonesian buku-tamu need).

All work lands in the **shared** dashboard code, so it benefits both templates at
once. Everything stays premium-only (inherits the existing `GuestbookLocked` gate).

## 2. Non-goals (explicit)

- **A-5 QR / usher self check-in** — separate project; A-1 is its foundation.
- **Public wishes wall** — decided not needed; lovebirds' dormant `Guestbook.jsx`
  is left untouched for now (separate cleanup decision).
- **Panitia-without-owner-login** — checking in via the dashboard currently means
  staff use the owner login. The correct fix (a scoped "check-in link") belongs to
  the A-5 project. Acknowledged as a *known limitation*, not solved here.
- **Realtime sync** — an auto-refresh poll is the chosen interim (see §6).

## 3. Architecture overview

```
RSVP (lovebirds Rsvp.jsx / solary RSVPPlanet.jsx)
   └─ POST /api/rsvp ──► attendances row (source=rsvp, arrived_at=null)   [unchanged]

Dashboard ▸ Buku Tamu tab  (GuestbookTab.tsx — shared, premium)
   ├─ A-1 check-in        ─► setArrived()            ─► attendances.arrived_at
   ├─ A-2 stats           ─► computeStats(rows)      [pure, client]
   ├─ A-3 export/print    ─► downloadCsv() + print view
   └─ A-4 souvenir/table  ─► setSouvenirTracking()   ─► invitations.guestbook_souvenir_enabled
                              updateAttendanceMeta()  ─► attendances.souvenir_taken / table_no
```

## 4. Data model

| Feature | Change | Migration |
|---|---|---|
| A-1 | reuse existing `attendances.arrived_at` | none |
| A-2 / A-3 | pure compute / client serialise | none |
| A-4 | `attendances.souvenir_taken bool`, `attendances.table_no text`, `invitations.guestbook_souvenir_enabled bool` | one |

**Migration** `supabase/migrations/2026-06-08_guestbook_v2.sql` (idempotent):

```sql
ALTER TABLE attendances  ADD COLUMN IF NOT EXISTS souvenir_taken boolean NOT NULL DEFAULT false;
ALTER TABLE attendances  ADD COLUMN IF NOT EXISTS table_no       text;
ALTER TABLE invitations  ADD COLUMN IF NOT EXISTS guestbook_souvenir_enabled boolean NOT NULL DEFAULT false;
```

- New columns inherit the existing **server-only RLS** on `attendances` (no anon
  policies) — no new policy needed.
- **Encryption decision:** `souvenir_taken` (bool) and `table_no` (a label like
  "Meja 12", not PII) are stored **plaintext**. `name_enc` / `note_enc` stay
  encrypted as today.
- **Graceful degradation:** reads of the new columns are defensive
  (`?? false` / `?? null`) so the app keeps working if the migration has not been
  applied yet (matches the repo's existing "degrades gracefully" pattern for the
  attendances table itself).

## 5. Server actions — `dashboard/guestbook/actions.ts`

All go through the existing `authorizeOwnership(slug)`, return flat result shapes
(matching the existing convention), `console.error` on failure, never throw to the
client, and `revalidatePath('/[template]/[slug]/dashboard', 'page')` on success.

- `setArrived(slug, id, arrived: boolean)` → `arrived_at = arrived ? now() : null`.
- `updateAttendanceMeta(slug, id, { souvenirTaken?, tableNo? })` → updates
  `souvenir_taken` / `table_no`; `tableNo` trimmed, capped (≤ 24 chars), empty → null.
- `setSouvenirTracking(slug, enabled: boolean)` → updates
  `invitations.guestbook_souvenir_enabled`.

## 6. UI — `GuestbookTab.tsx` (+ extracted pieces)

**File split (best practice):** `GuestbookTab.tsx` is already ~400 lines with inline
styles + an inline dialog. As part of this work, extract focused units and keep
`GuestbookTab` as the orchestrator:

- `guestbook/LedgerTable.tsx` — the table + rows (incl. check-in / souvenir / table cells)
- `guestbook/StatsRow.tsx` — the stat cards
- `guestbook/WalkInDialog.tsx` — move the existing inline dialog out
- `guestbook/lib/stats.ts` — `computeStats(rows)` (pure, tested)
- `guestbook/lib/exportRows.ts` — `toCsvRows(rows, { souvenirEnabled, t })` (pure, tested)

**A-1 — check-in**
- Per-row **`Hadir ✓`** toggle button: `aria-pressed`, large tap target (venue use
  on a phone, one-handed). Arrived → shows a check + arrival time; click again undoes.
- Optimistic local update, then `setArrived()`; revert on failure (existing pattern).
- New **status filter** alongside the source filter: `Semua / Belum hadir / Sudah hadir`.

**A-2 — stats** (defined precisely to avoid ambiguity)
- `Total entri` = rows.length
- `Sudah hadir` = rows with `arrived_at != null` → shown as `X / total`
- `Tamu hadir riil` = Σ `guest_count` where `arrived_at != null`
- `Belum hadir` = total − arrived
- `Walk-in` = rows with `source='walkin'` (retained)

**A-3 — export / print**
- **`Export CSV`** → reuse `lib/csv.ts downloadCsv` (already does escaping + UTF-8
  BOM for Excel); on empty, themed `tc.nothingToExport` alert. Columns follow the
  souvenir toggle (souvenir/table included only when enabled).
- **`Cetak`** → a print-only view: print CSS hides the dashboard chrome and renders
  the ledger table cleanly, then `window.print()`.

**A-4 — souvenir / table toggle**
- Header **switch** `Lacak souvenir & meja` → `setSouvenirTracking()`.
- When ON: two extra columns — souvenir **checkbox** + table-number **input**,
  edited inline via `updateAttendanceMeta()` (table-number debounced).
- When OFF: columns hidden; stored data is retained (just not shown).
- The tab receives `souvenirEnabled` from `page.tsx`
  (`invitation.guestbook_souvenir_enabled ?? false`).

**Auto-refresh (multi-device)**
- While the tab is mounted **and** `document.visibilityState === 'visible'`,
  `setInterval(() => router.refresh(), 15000)`. Pause on `visibilitychange` when
  hidden; clear on unmount. The manual Refresh button stays.

## 7. Shared CSV hardening — `lib/csv.ts`

Add **CSV-injection** protection to `downloadCsv` `escape()`: if a stringified cell
begins with `=`, `+`, `-`, `@`, tab, or CR, prefix a single quote `'` before
quoting, so Excel/Sheets does not execute it as a formula. This also hardens the
existing RSVP & Gift exports. Add a unit test for the escape rule.

## 8. i18n — `lib/i18n/dictionaries/dashboard.ts` (both `id` + `en`)

New keys under `tabs.guestbook` (id + en, kept in lockstep — guarded by the existing
**dict-parity** test): `checkInBtn`, `checkedInAt`, `undoCheckIn`, `filterArrived`,
`filterNotArrived`, `statArrived`, `statAttendeesArrived`, `statNotArrived`,
`colSouvenir`, `colTable`, `souvenirToggle`, `tablePlaceholder`, `printBtn`. Reuse
`tabs.common.downloadCsv` / `tabs.common.nothingToExport` where they already exist.

## 9. Testing

- **Unit (pure):** `computeStats`, `toCsvRows` (shape + conditional columns),
  `downloadCsv` injection-escape.
- **Parity:** existing dict-parity test stays green after the new keys.
- **Manual smoke:** RSVP submit → row appears → check-in → stats update → toggle
  souvenir on → fill souvenir/table → Export CSV (open in Excel: BOM ok, no formula
  execution) → Cetak → open dashboard on a 2nd device, check-in there, confirm the
  first device auto-refreshes within ~15s.

## 10. Rollout

Apply `2026-06-08_guestbook_v2.sql` in the Supabase SQL editor (manual, per repo
convention) with the deploy. Code degrades gracefully if the migration is applied
slightly after the code ships.
