# Testing-Feedback Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 14 fixes from the `panduan-uji-coba` test run, grouped into 6 phases, implemented safest → riskiest, each phase verified before the next.

**Architecture:** Mostly surgical edits to existing components + server actions; two DB-touching changes (renewal webhook routing, attendances `source` enum). Spec: `docs/superpowers/specs/2026-06-16-testing-feedback-revisions-design.md`.

**Tech Stack:** Next.js 14 App Router, React 18, motion 12, Supabase (service-role server actions), Xendit, vitest, CSS Modules + inline styles.

**Conventions:** new UI strings go in `src/lib/i18n/dictionaries/*` with BOTH `id` + `en` (dict-parity test enforces it). Commit after each task. Run `npx vitest run <file>` for touched suites.

---

## Phase A — Public invitation (guest-facing)

### Task A1: RSVP post-submit message — drop WhatsApp CTA, warm thank-you
**Files:** Modify `src/all-templates/solary/sections/RSVPPlanet.jsx:98-115`

- [ ] Remove the post-submit `whatsappNumber` `<a>` button (lines ~105-114). Keep the ✦ icon + "Terima kasih" `<h3>`. Replace the body `<p>` with a warmer, humanized line; address the guest by name when `useGuest().name` exists (e.g. `Terima kasih, ${name} — kehadiranmu sudah kami catat...`). Pure JSX/copy change; no new deps.
- [ ] Manual check: submit RSVP in preview (`?preview=1`) → thank-you shows, no WhatsApp button.
- [ ] Commit: `fix(solary): warm RSVP thank-you, remove post-submit WhatsApp CTA (D2)`

### Task A2: RSVP always shows the form on open
**Files:** Modify `src/all-templates/solary/sections/RSVPPlanet.jsx:22,44-50,77-81`

- [ ] Delete the load-time effect that reads `localStorage.getItem(sentKey(slug))` and calls `setSent(true)` (lines 44-50). Keep `sent` as in-session state only (set after a successful submit). Remove the now-unused `sentKey` write at 77-81 and the `sentKey`/`isRealSlug` helpers if no longer referenced (verify before deleting `isRealSlug` — it's also used at 77).
- [ ] Manual check: submit in preview, reload → the **form** renders again (server still rejects a reused token live).
- [ ] Commit: `fix(solary): RSVP re-open shows the form again, not the thank-you (D4)`

### Task A3: Regenerate-code button looks clickable
**Files:** Modify `src/app/[template]/[slug]/dashboard/GuestsTab.module.css:251`; optionally `GuestsTab.tsx:421-430`

- [ ] Replace `.regenBtn { font-size: .8rem; }` with a real ghost-pill: padding, `border: 1px solid rgba(42,33,24,0.25)`, `border-radius: 999px`, `background:#fff`, pointer cursor, small font, `:hover` darken. Keep it compact so the actions cell still fits.
- [ ] In `GuestsTab.tsx`, prefix the label with a `↻` glyph if `t.regenerateBtn` doesn't already imply an icon (keep dict text; prepend glyph in JSX).
- [ ] Manual check: Guests tab → regenerate reads as a button.
- [ ] Commit: `fix(dashboard): make regenerate-code button visibly clickable (D7)`

**Phase A verify:** re-run D2, D4, D7 manually. No test suites touched.

---

## Phase B — Dashboard editor UX

### Task B1: Palette tab inline preview
**Files:** Modify `src/app/[template]/[slug]/dashboard/PaletteTab.tsx`; dict `src/lib/i18n/dictionaries/dashboard.ts` (`tabs.palette.previewLabel`)

- [ ] Add a `PREVIEW_COLORS: Record<string,{bg:string;fg:string;accent:string}>` map keyed by palette `key` (use the swatch hex already in `SOLARY_*`/`LOVEBIRDS_*` as `accent`; pick a sensible `bg`/`fg` per dark vs light group — dark groups get a dark bg + light fg, light groups the reverse).
- [ ] Render a mock card above the footer that uses the **currently selected** `palette`'s colors: a sample heading, a line of body text, and a pill "button" using `accent`. Updates instantly on swatch click (already in `palette` state).
- [ ] Add `previewLabel` to dict (`id`+`en`).
- [ ] Manual check: switching swatches changes the preview card.
- [ ] Commit: `feat(dashboard): live palette preview card in Palette tab (G1)`

### Task B2: Save bar at top AND bottom (editor) + top save on appearance tabs
**Files:** Modify `src/editor/EditorProvider.tsx` (lift `isPublished`), `src/editor/SaveBar.tsx`, `src/editor/EditorRoot.tsx`, `src/editor/EditorRoot.module.css`; `PaletteTab/MusicTab/MetaTab.tsx`

- [ ] Move `isPublished` + `togglePublish` state into `EditorProvider` (add `isPublished`, `publishBusy`, `publishError`, `togglePublish` to the context value; seed from a new `initialIsPublished` prop passed through `EditorRoot`). `SaveBar` reads them from `useEditor()` instead of local `useState`, so multiple bars stay in sync.
- [ ] In `EditorRoot`, render a second `<SaveBar>` in a sticky bottom container (`position: sticky; bottom: 0`) inside `.wrap`, right-aligned. Add `.bottomBar` style to the CSS module.
- [ ] Appearance tabs: add a compact top-right save button that calls the same `save()` the footer uses (reuse handler/state; don't duplicate logic).
- [ ] Run: `npx vitest run src/editor/__tests__/editor-reducer.test.ts` (should still pass — no reducer change). Manual: edit, scroll, both bars reflect dirty/saving; publish toggle agrees in both.
- [ ] Commit: `feat(editor): duplicate save bar top+bottom with shared state (revisi)`

### Task B3: Stale-save 409 → reload popup
**Files:** Modify `src/editor/EditorProvider.tsx:355-378`, `src/editor/SaveBar.tsx`; dict `dashboard.ts` (`editor.conflict*`); optionally `src/app/api/invitation/[slug]/config/route.ts:64`

- [ ] In `save()`, detect `res.status === 409`. Instead of only setting `saveError`, expose a `conflict: boolean` flag (or call a callback) the SaveBar can use to open a dialog via `useConfirm()`.
- [ ] SaveBar: when conflict fires, `await confirmDialog({ message: t.editor.conflictBody, confirmLabel: t.editor.conflictReload, tone:'danger' })` → on confirm `window.location.reload()`. Message text: explains another tab/device changed it + "muat ulang halaman, atau tutup tab dashboard lain yang terbuka."
- [ ] Add `editor.conflictBody`, `conflictReload` to dict (`id`+`en`). Optionally tweak the 409 server message to match.
- [ ] Manual check (FC1): open 2 tabs, edit+save both → 2nd shows the reload dialog.
- [ ] Commit: `fix(editor): stale-save conflict shows reload dialog with guidance (FC1)`

### Task B4: Section editor opens as a popup on mobile
**Files:** Create `src/editor/FieldEditorSheet.tsx`; Modify `src/editor/EditorRoot.tsx`, `src/editor/EditorRoot.module.css`; dict (`editor.editSection`/`close`)

- [ ] Add a `useIsMobile()` check (matchMedia `(max-width: 767.98px)`), or render both and toggle via CSS. On mobile, when `selectedSectionId` is set by tapping a row, show `FieldEditor` inside an overlay sheet (reuse the `overlay`/`modal` style pattern from `guestbook/styles.ts` or `GuestEditModal`) with a header + close `×`. Desktop keeps the inline `.fieldPane`.
- [ ] Ensure selecting a section on mobile opens the sheet; closing it deselects or just hides (keep selection).
- [ ] Manual check on a ≤767px viewport: tap a section → editor pops up.
- [ ] Commit: `feat(editor): section editor opens as bottom-sheet popup on mobile (revisi)`

### Task B5: Refresh tutorial for current tabs + previews + save placement + music
**Files:** Modify `src/app/[template]/[slug]/dashboard/tutorial/content.ts`, `TutorialTab.tsx` if needed; dict

- [ ] Update tutorial copy (both templates, `id`+`en`) to describe: the appearance tabs (Palette w/ preview, Music w/ new sources, Judul & Deskripsi w/ preview), save buttons at top+bottom, and the mobile section popup. Do this AFTER C lands so music copy is accurate — **defer the music paragraph to end of Phase C.**
- [ ] Commit: `docs(tutorial): refresh for previews, save bar, music sources (revisi)`

**Phase B verify:** `npx vitest run src/editor` ; manual G1/FC1/editor-on-mobile.

---

## Phase D — CSV export drops id + created_at
**Files:** Modify `src/app/[template]/[slug]/dashboard/RsvpsTab.tsx:69`, `src/app/[template]/[slug]/dashboard/GiftsTab.tsx`; Test `src/app/[template]/[slug]/dashboard/lib/__tests__/csvExport.test.ts` (new, optional helper)

- [ ] Create a tiny pure helper `toRsvpExport(rows)` / `toGiftExport(rows)` (or inline `.map`) that returns objects WITHOUT `id`/`created_at`, with ordered human columns. Put shared `omit` in `lib/csv.ts` or inline.
- [ ] Write a test asserting the exported row keys exclude `id` and `created_at` and include name/attending/etc. Run it → fail → implement → pass.
- [ ] Wire RsvpsTab + GiftsTab `downloadCsv(..., toExport(rows))`.
- [ ] Manual check (E2): download RSVP + gift CSV → no id/created_at columns.
- [ ] Commit: `fix(dashboard): CSV export omits id and created_at columns (E2)`

**Phase D verify:** `npx vitest run` the new test; manual E2.

---

## Phase C — Music: YouTube + direct URL + library (keep upload)

### Task C1: URL parse helper + tests
**Files:** Create `src/lib/music/source.ts`, `src/lib/music/__tests__/source.test.ts`

- [ ] `parseYouTubeId(url): string | null` (handles `watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`). `resolveMusicSource(music)` → `{kind:'youtube'|'audio', src}` defaulting legacy `{url}` to audio. Tests for each URL shape + junk → null.
- [ ] Run tests → fail → implement → pass.
- [ ] Commit: `feat(music): youtube/url source parser with tests`

### Task C2: MusicTab — source picker UI
**Files:** Modify `src/app/[template]/[slug]/dashboard/MusicTab.tsx`; dict `dashboard.ts` (`tabs.music.*`)

- [ ] Add `source: 'upload'|'url'|'youtube'|'library'` to `MusicSettings`/DEFAULTS (default-resolve legacy configs to `url`/`upload`). Segmented control to choose; render the matching input: Upload (existing), URL text (validate via `safeUrl`), YouTube text (show thumbnail from parsed id), Library (radio list of bundled tracks with inline `<audio>`).
- [ ] Persist `source` + `url`/`youtubeId`. Add caveat helper text for YouTube (`id`+`en`).
- [ ] Manual: each source saves & reloads correctly.
- [ ] Commit: `feat(dashboard): music source picker — upload/url/youtube/library (G2)`

### Task C3: Music endpoint validation
**Files:** Modify `src/app/api/invitation/[slug]/music/route.ts`; Test `src/app/api/invitation/[slug]/music/__tests__/route.test.ts`

- [ ] Widen the PUT schema: accept `source`, `youtubeId`/`url`, enforce length + url-shape (`safeUrl`), reject unknown `source`. Update/add tests for youtube + url payloads + a rejected bad url.
- [ ] Run: `npx vitest run src/app/api/invitation/[slug]/music` → pass.
- [ ] Commit: `feat(api): music endpoint accepts youtube/url/library sources`

### Task C4: Public playback — solary + lovebirds
**Files:** Modify `src/all-templates/solary/contexts/AudioContext.jsx`, `src/all-templates/solary/components/MusicPopup.jsx`, `src/all-templates/lovebirds/sections/MusicPopup/MusicPopup.jsx`; bundled tracks under `public/music/`

- [ ] Use `resolveMusicSource(config.music)`. `audio` kind → existing `<audio>`. `youtube` kind → hidden YouTube IFrame Player created on the existing "Putar" gesture; wire loop (loop+playlist param) and the mute button to the iframe API. Keep the popup UX identical.
- [ ] Add 2-3 royalty-free tracks to `public/music/` + reference them in the library list.
- [ ] Manual: upload, url, youtube, library each play on tap; mute works; loop works.
- [ ] Commit: `feat(music): public playback supports youtube + url + library`

### Task C5: Tutorial music paragraph (completes B5)
- [ ] Add the music-sources paragraph to the tutorial (both templates, `id`+`en`). Commit: `docs(tutorial): document music source options`

**Phase C verify:** `npx vitest run src/lib/music src/app/api/invitation/[slug]/music`; manual G2 with all 4 sources.

---

## Phase E — Renewal (expired → pay → extend), same plan

### Task E1: `extendActivePeriod` publish helper + test
**Files:** Modify `src/lib/payments/publish.ts`; Test `src/lib/payments/__tests__/publish.test.ts` (new)

- [ ] Add `extendActivePeriod(admin, inv, nowMs?)`: resolves the **current** plan, sets `expires_at = resolved.expiresAt(now)` and `is_published = true`; does NOT touch `is_paid`/data. Test with a fake admin asserting the update payload (mirror existing publish style).
- [ ] Run test → pass. Commit: `feat(payments): extendActivePeriod for renewals + test`

### Task E2: `renewalIdFromExternalId` parser
**Files:** Modify `src/lib/payments/xendit.ts:123`; Test `src/lib/payments/__tests__/xendit-extid.test.ts` (new or extend)

- [ ] Generalize: add `renewalIdFromExternalId(ext)` for `ren_<uuid>_<ts>` (or refactor `invitationIdFromExternalId` to take a prefix). Keep the existing `inv_` function working. Tests for `ren_`, `inv_`, junk.
- [ ] Run → pass. Commit: `feat(payments): parse ren_ external ids`

### Task E3: `startRenewal` server action
**Files:** Modify `src/app/onboarding/actions.ts`

- [ ] Add `startRenewal(invitationId)`: owner check, `checkout:` rate-limit, load row, require `is_paid && expired` (compute via `activePeriodStatus`), `resolvePlan(template_id, plan)`, expire prior invoice, `createXenditInvoice({ externalId: 'ren_'+id+'_'+Date.now(), amountIDR: resolved.amountIDR, successUrl: dash+'?renewed=1', failureUrl: dash+'?renewal=failed', ... })`, persist `xendit_invoice_id`/`xendit_external_id`, return `{ok,invoiceUrl}` (structured errors like `startCheckout`).
- [ ] Commit: `feat(payments): startRenewal action bills current plan for expired invites (#12)`

### Task E4: Webhook + recheck handle `ren_`
**Files:** Modify `src/app/api/payment/xendit/webhook/route.ts`, `src/app/onboarding/actions.ts` (recheck); Test `src/app/api/payment/xendit/webhook/__tests__/route.test.ts`

- [ ] Webhook: add a `body.external_id.startsWith('ren_')` branch → parse id, load inv, verify (PAID + amount === current plan price), `extendActivePeriod`. Idempotent (re-running just re-stamps a future expiry — guard by only extending when expired/needed).
- [ ] `recheckPayment`: when the row is paid+expired and the latest invoice is a `ren_` that's PAID, extend instead of publish.
- [ ] Add webhook test for a `ren_` PAID callback. Run: `npx vitest run src/app/api/payment/xendit/webhook` → pass.
- [ ] Commit: `feat(payments): webhook + recheck apply renewals (#12)`

### Task E5: PaymentGate uses renewal + shows errors; verify copy
**Files:** Modify `src/app/[template]/[slug]/dashboard/PaymentGate.tsx`; dict `common.activePeriod`/`paymentGate`; check `scripts/mark-paid.mjs`

- [ ] Expired branch: call `startRenewal` (not `startCheckout`); show the returned `error` inline (currently swallowed) + keep button enabled to retry. Confirm `paymentGate.expiredTitle/Body/PayBtn` clearly say "masa aktif habis — perpanjang di sini"; adjust dict if weak.
- [ ] Verify `scripts/mark-paid.mjs --days=-1` sets `expires_at` in the past; fix if needed so the expired gate actually triggers (test 4.2).
- [ ] Manual (A6/4.2/4.4): expire → dashboard shows renew gate → click → redirects to Xendit (or shows a clear error if keys absent) → after pay, period extends, data intact.
- [ ] Commit: `fix(payments): expired dashboard renews via Xendit with clear copy (A6,#11,#12)`

**Phase E verify:** `npx vitest run src/lib/payments src/app/api/payment`; manual CHAIN-4 (expire↔renew twice, no data loss/dupes).

---

## Phase F — Guestbook source attribution + count reconcile

### Task F1: Migration — extend `source` enum
**Files:** Create `supabase/migrations/2026-06-16_attendance_source.sql`

- [ ] `ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_source_check; ALTER TABLE attendances ADD CONSTRAINT attendances_source_check CHECK (source IN ('rsvp','walkin','unregistered'));` Document like the 2026-05-30 file; idempotent.
- [ ] Apply in Supabase SQL editor (note in commit body that it must be run).
- [ ] Commit: `feat(db): allow 'unregistered' attendance source (#10)`

### Task F2: Types widen to 'unregistered'
**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/types.ts:14,46`

- [ ] `source: 'rsvp' | 'walkin' | 'unregistered'` in both `AttendanceRow` and `AttendanceRowDb`.
- [ ] Commit: `feat(guestbook): widen source type (#10)`

### Task F3: Source inference + reconcile in actions (TDD)
**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/actions.ts`; Test `src/app/[template]/[slug]/dashboard/guestbook/__tests__/actions.test.ts`

- [ ] `addWalkInAttendance`: before insert, determine if the guest has a submitted RSVP (check `guests.rsvp_submitted_at` and/or a matching `rsvps` row) → `source='rsvp'` (+ `rsvp_id` when found) else `'walkin'`. Replace insert-or-`23505`-duplicate with an **upsert on `(invitation_id, guest_id)`**: on conflict update `guest_count`, `note_enc`, `source`, `arrived_at`; return `{ok,row,updated}`.
- [ ] `addUnlistedAttendance`: `source='unregistered'`.
- [ ] Tests: (a) listed guest who RSVP'd → source rsvp; (b) listed no-RSVP → walkin; (c) unlisted → unregistered; (d) re-add existing guest with new count → row updated, not duplicate-error.
- [ ] Run: `npx vitest run src/app/[template]/[slug]/dashboard/guestbook` → pass.
- [ ] Commit: `feat(guestbook): infer source + reconcile head-count on re-add (#10)`

### Task F4: Dialog + ledger reflect source/reconcile
**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/WalkInDialog.tsx`, `LedgerTable.tsx`/`StatsRow.tsx`; dict `tabs.guestbook.*`

- [ ] WalkInDialog: if the picked guest already has a ledger entry, prefill the existing count + label save "Perbarui jumlah"; feedback "diperbarui" vs "ditambahkan". Stop treating duplicate as an error.
- [ ] Ledger: render source as RSVP / Walk-in / Tak terdaftar (labels `id`+`en`).
- [ ] Manual (H5-H9): add from RSVP guest (rsvp source), listed walk-in, unlisted (unregistered), re-add to update count.
- [ ] Commit: `feat(guestbook): dialog reconcile + source labels in ledger (#10)`

**Phase F verify:** `npx vitest run src/app/[template]/[slug]/dashboard/guestbook`; manual H-series + the source cases.

---

## Final verification
- [ ] `npx vitest run` (full suite) green.
- [ ] `npm run build` (typecheck) clean.
- [ ] Manual smoke of the full panduan-uji-coba items touched, desktop + a ≤767px viewport.
- [ ] Update `TEST-REPORT.md` / `BUG-LEDGER.md` if those track status.
