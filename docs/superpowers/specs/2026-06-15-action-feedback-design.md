# Dashboard action feedback (toast + cursor) — design

**Date:** 2026-06-15
**Status:** Approved design + scope, pending implementation.
**Scope:** The shared dashboard (`[template]/[slug]/dashboard`) + the editor — both templates (solary + lovebirds) are covered by one mount.

---

## Goal

Every meaningful dashboard action gives immediate, **context-specific** feedback:
a top-center toast pill (✓ green / ✗ red + short text) on all devices, **plus** a
brief cursor swap to ✓/✗ on desktop, and a subtle press feel on every button.
Pills are worded per action ("Tamu ditambahkan", "Kode baru dibuat", …), never a
generic "Berhasil".

---

## Decisions (locked with the user)

1. **Toast pill, top-center, all devices.** ✓ green / ✗ red, icon + short text,
   slides down, auto-dismiss ~2s, fades up. Queued.
2. **Cursor swap on desktop only** (`(pointer: fine)`): cursor becomes a small ✓/✗
   glyph for ~700ms, then reverts. Skipped on touch.
3. **Press feel on every dashboard button**: global `:active { transform: scale(.97) }`.
4. **✓/✗ tied to real action buttons** (the inventory below). Pure toggles / filter
   switches / drag-reorder / refresh get only the press feel — no ✓/✗ (avoid noise).
5. **Context-specific copy**, bilingual EN/ID via the dashboard dict.
6. **Wire ALL inventory points** (user: "di semua titik").

---

## Architecture

`src/components/dashboard/FeedbackProvider.tsx` (+ `.module.css`), mounted once in
`DashboardClient` **inside** `DashboardI18nProvider` and `DialogProvider`, wrapping
all tab content + `EditorRoot`. Exposes:

```ts
const fb = useFeedback()
fb.ok(message?: string)    // ✓ toast (+ desktop cursor) ; default = generic success
fb.fail(message?: string)  // ✗ toast (+ desktop cursor) ; default = generic failure
```

On each call:
1. **Toast** — push `{ id, kind, message }` onto a queue (cap ~3, FIFO). Each toast
   auto-dismisses after ~2000ms. `role="status"`/`aria-live="polite"` for ✓,
   `role="alert"` for ✗. `prefers-reduced-motion` → fade only (no slide).
2. **Cursor** — if `window.matchMedia('(pointer: fine)').matches`, add
   `fbCursorOk`/`fbCursorFail` class to `document.documentElement` for 700ms; a
   global CSS rule sets an inline-SVG data-URI cursor (`html.fbCursorOk, html.fbCursorOk * { cursor: url(...) , auto !important }`). Timer cleared/reset on rapid calls.

**Units (each independently testable):**
- `toastQueueReducer` (pure): `add` / `dismiss` / cap → unit-tested.
- `prefersFinePointer()` / `prefersReducedMotion()` (pure wrappers over matchMedia,
  SSR-safe) → unit-tested.
- `FeedbackProvider` (React) wires those to the toast DOM + cursor classes.

The SVG cursors live as two constants (green ✓ circle, red ✗ circle, ~24px, hotspot
centered) — small, no asset files.

---

## Copy (dict)

New dict block `dashboard.<lang>.feedback`:
- generic: `ok` ("Berhasil" / "Saved"), `fail` ("Gagal, coba lagi" / "Something went wrong, try again").
- per-action keys (see inventory). Reuse existing keys where they already fit
  (e.g. `tabs.guests.savedMsg`, `saveError`). dict-parity test must stay green
  (every key in both `id` and `en`).

---

## Action inventory (wire `fb.ok`/`fb.fail` at each)

Legend: **A** = async (real failure path) · **I** = instant/local (✓ only).

### Guests — `GuestsTab.tsx`, `GuestEditModal.tsx`, `GuestImportModal.tsx`
- Add guest (A) → ✓ "Tamu ditambahkan"/"Guest added" · ✗ "Gagal menambah tamu"/"Couldn't add guest"
- Send WA / markGuestSent (A) → ✓ "WhatsApp dibuka"/"Opened in WhatsApp" · ✗ "Gagal menandai terkirim"/"Couldn't mark as sent"
- Regenerate code (A) → ✓ "Kode baru dibuat"/"New code generated" · ✗ "Gagal membuat kode"/"Couldn't generate code"
- Save WA message / Confirm change (A) → ✓ "Pesan tersimpan"/"Message saved" · ✗ reuse `saveError`
- Delete guest (A) → ✓ "Tamu dihapus"/"Guest deleted" · ✗ "Gagal menghapus"/"Couldn't delete"
- Unmark sent (A) → ✓ "Ditandai belum kirim"/"Marked as not sent" · ✗ "Gagal memperbarui"/"Couldn't update"
- Edit guest (A) → ✓ "Tamu diperbarui"/"Guest updated" · ✗ "Gagal menyimpan"/"Couldn't save"
- Import guests (A) → ✓ "{n} tamu diimpor"/"{n} guests imported" · ✗ "Gagal impor"/"Import failed"

### Guestbook — `GuestbookTab.tsx`, `guestbook/CheckinQrCard.tsx`, `guestbook/WalkInDialog.tsx`
- Check-in / setArrived (A) → ✓ "Kehadiran diperbarui"/"Check-in updated" · ✗ "Gagal memperbarui"
- Delete attendance (A) → ✓ "Entri dihapus"/"Entry removed" · ✗ "Gagal menghapus"
- Souvenir taken (A) → ✓ "Souvenir diperbarui"/"Souvenir updated" · ✗ "Gagal memperbarui"
- Save table number (A) → ✓ "Nomor meja disimpan"/"Table number saved" · ✗ "Gagal menyimpan"
- Toggle souvenir tracking (A) → ✓ "Pelacakan souvenir diperbarui"/"Souvenir tracking updated" · ✗ "Gagal memperbarui"
- Reset check-in QR token (A) → ✓ "Token check-in dibuat ulang"/"Check-in token reset" · ✗ "Gagal"
- Add walk-in (A) → ✓ "Tamu walk-in ditambahkan"/"Walk-in added" · ✗ "Gagal menambah"
- Add unlisted (A) → ✓ "Tamu ditambahkan"/"Guest added" · ✗ "Gagal menambah"

### Editor — `editor/SaveBar.tsx`, `editor/EditorProvider.tsx`, `editor/fields/ImageField.tsx`, `ImageArrayField.tsx`, `AudioField.tsx`, `editor/AddSectionMenu.tsx`, `editor/SectionRow.tsx`
- Save config (A) → ✓ "Perubahan disimpan"/"Changes saved" · ✗ "Gagal menyimpan"/"Couldn't save"
- Publish toggle (A) → ✓ "Undangan dipublikasikan"/"Invitation published" OR "Disetel ke draft"/"Set to draft" · ✗ "Gagal"
- Image upload (A) → ✓ "Gambar diunggah"/"Image uploaded" · ✗ "Gagal mengunggah"/"Upload failed"
- Audio upload (A) → ✓ "Audio diunggah"/"Audio uploaded" · ✗ "Gagal mengunggah"
- Add section (I) → ✓ "Section ditambahkan"/"Section added"
- Remove section (I) → ✓ "Section dihapus"/"Section removed"

### Display tabs — `MusicTab.tsx`, `PaletteTab.tsx`, `OrnamentTab.tsx`, `MetaTab.tsx`
- Music upload (A) → ✓ "Musik diunggah"/"Music uploaded" · ✗ "Gagal mengunggah"
- Music save (A) → ✓ "Musik disimpan"/"Music saved" · ✗ "Gagal menyimpan"
- Music remove (A) → ✓ "Musik dihapus"/"Music removed" · ✗ "Gagal menghapus"
- Palette save (A) → ✓ "Palet disimpan"/"Palette saved" · ✗ "Gagal menyimpan"
- Ornament save (A, lovebirds) → ✓ "Ornamen disimpan"/"Ornament saved" · ✗ "Gagal menyimpan"
- Meta image upload (A) → ✓ "Gambar diunggah"/"Image uploaded" · ✗ "Gagal mengunggah"
- Meta save (A) → ✓ "Info disimpan"/"Details saved" · ✗ "Gagal menyimpan"

### Data & billing — `GiftsTab.tsx`, `RsvpsTab.tsx`, `PaymentGate.tsx`
- Gifts export CSV (I) → ✓ "CSV diunduh"/"CSV downloaded" (failure already alerts "nothing to export")
- RSVP export CSV (I) → ✓ "CSV diunduh"/"CSV downloaded"
- Upgrade / startCheckout (A) → ✗ only "Gagal memulai pembayaran"/"Couldn't start checkout" (success redirects away)

---

## Error handling

- Every wired handler already has try/catch (or returns `{ ok, error }`); add
  `fb.ok(msg)` on the success branch and `fb.fail(msg)` on the failure branch.
- `fb.fail` complements (does not replace) any existing inline error text already
  shown — but where an inline error duplicates the toast, prefer the toast and keep
  the inline only where it adds detail.
- The cursor swap never blocks; the timer is best-effort and reset-safe.

## Testing

- `toastQueueReducer` unit tests: add appends; dismiss removes by id; cap drops
  oldest; ✓/✗ kind preserved.
- `prefersFinePointer` / `prefersReducedMotion`: SSR returns false; reads matchMedia.
- dict-parity stays green (new `feedback` block + per-action keys in both langs).
- Visual: `npx tsc --noEmit` + dashboard smoke on both templates. Full vitest green.

## Out of scope (YAGNI)

- Feedback on the public invitation card (dashboard-only).
- ✓/✗ for non-async toggles / filters / drag-reorder / refresh (press feel only).
- Sound; per-toast manual dismiss button (auto-dismiss is enough at this length).
- Undo actions inside the toast.
