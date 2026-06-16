# Testing-feedback revisions — design

**Date:** 2026-06-16
**Source:** `panduan-uji-coba.pdf` test run + the couple's inline feedback (Bahasa).
**Guiding constraint (user):** *"jangan rusak selain yang saya minta"* — touch only what each item requires; no opportunistic refactors.

This spec bundles 14 fixes from one testing pass into 6 themed batches, implemented **safest → riskiest**: A → B → D → C → E → F. Each batch ships + is verified before the next starts. One combined spec, one phased implementation plan.

## Locked decisions (from brainstorming)

1. **Music sources (#6):** keep MP3 upload; ADD three more — YouTube link, direct audio URL, and a small built-in royalty-free track library.
2. **Renewal (#13):** renew **re-bills the existing plan** (no plan picker, no downgrade on renew). Plan changes stay on the existing separate Upgrade button. This overrides the couple's earlier "pick Basic on renew" note — confirmed in a follow-up question.
3. **Editor previews (#7/#8):** lightweight **inline mockup** for Palette; Meta already has a share-card preview; Music keeps its existing audio player. No live invitation iframe per tab.
4. **Order:** A → B → D → C → E → F.

## Cross-cutting concerns (apply to every batch)

- **i18n parity:** all user-facing strings live in `src/lib/i18n/dictionaries/*` with `id` + `en` keys. `src/lib/i18n/__tests__/dict-parity.test.ts` fails if a key exists in one language only. Every new string → add to both.
- **Encryption boundary:** never log/expose `_enc` columns or `SUPABASE_SERVICE_ROLE_KEY` from a `'use client'` file. Guestbook/RSVP names stay encrypted at rest.
- **Tests:** update the existing vitest suites touched by a change (guestbook actions, webhook, editor reducer, csv). Add focused tests for new server logic (renewal, source attribution, reconcile).
- **Don't break:** byte-identical section components stay byte-identical unless the item explicitly targets them (only RSVPPlanet for #1/#2). Template policy (mandatory/locked sections) is unchanged.

---

## Batch A — Public invitation (guest-facing)

### A1 · RSVP post-submit message — replace WhatsApp CTA (#1, test D2)
- **Current:** [`RSVPPlanet.jsx:98-115`](../../../src/all-templates/solary/sections/RSVPPlanet.jsx) — after a successful submit it shows "Terima kasih / RSVP Anda telah kami catat…" **plus a `Hubungi via WhatsApp ↗` button** (only when `whatsappNumber` is set).
- **Desired:** drop the post-submit WhatsApp button. Replace with a warmer, humanized closing line (elegant, no CTA). Keep the ✦ + "Terima kasih" heading; enrich the body copy (e.g. a personal thank-you that addresses the guest by name when `useGuest().name` is available).
- **Scope guard:** the *pre-submit* WhatsApp footer (lines 179-190, "atau konfirmasi langsung via WhatsApp") is **not** mentioned by the user → leave it untouched.
- **Files:** `RSVPPlanet.jsx` only.

### A2 · RSVP re-open shows the form again (#2, test D4)
- **Current:** [`RSVPPlanet.jsx:22,45-50,77-81`](../../../src/all-templates/solary/sections/RSVPPlanet.jsx) persists a `rsvp-sent:<slug>` flag in `localStorage` and force-shows the thank-you screen on **every** page load — so a guest (or a second guest on the same device) opening the invite never sees the form again.
- **Desired:** on open, **always render the form**. Only show the thank-you screen after an in-session successful submit (`sent` set during this page view). The single-use token already enforces "kode sudah dipakai" / "sudah RSVP" server-side (tests D4/D6), so the client lock is redundant and harmful.
- **Implementation:** remove the load-time `setSent(true)` from `localStorage`; keep `sent` as in-session state only. (Optional: keep *writing* the timestamp for analytics but never read it to gate the view. Simplest = stop reading it.)
- **Files:** `RSVPPlanet.jsx` only.

### A3 · Make the "regenerate code" button look clickable (#3, test D7)
- **Current:** [`GuestsTab.module.css:251`](../../../src/app/[template]/[slug]/dashboard/GuestsTab.module.css) — `.regenBtn { font-size: .8rem; }`. No border, background, or affordance → reads as plain text. Rendered at [`GuestsTab.tsx:421-430`](../../../src/app/[template]/[slug]/dashboard/GuestsTab.tsx).
- **Desired:** give `.regenBtn` a real button look — outlined/ghost pill with an icon (e.g. `↻`) + label, hover state, pointer cursor — consistent with the other ghost buttons in the row. No behavior change.
- **Files:** `GuestsTab.module.css` (+ maybe an icon glyph in `GuestsTab.tsx`).

---

## Batch B — Dashboard editor UX

### B1 · Palette tab inline preview (#7, test G1)
- **Current:** [`PaletteTab.tsx`](../../../src/app/[template]/[slug]/dashboard/PaletteTab.tsx) lists swatch buttons, no preview of the effect.
- **Desired:** a small live mockup card inside the tab that re-renders with the **selected** palette's colors (background, heading, body, button, accent dot) so the owner sees the difference before saving. Pure client mock using the palette's known tokens — no iframe.
- **Note:** palette tokens are keyed by `palette.key` (e.g. `cosmicDark`). The mock needs a small map of key → {bg, fg, accent} for preview. Source the few representative colors from the swatch list already in `PaletteTab` + the template theme tokens.
- **Files:** `PaletteTab.tsx` (+ dict strings).

### B2 · Confirm appearance-tab structure + previews, refresh tutorial (#8)
- **Finding:** the requested tabs already exist as top-level dashboard tabs for **both** templates — `palette`, `music`, `meta` (Judul & Deskripsi), plus `editor` and `ornament` (lovebirds only). See [`DashboardClient.tsx:82-96`](../../../src/app/[template]/[slug]/dashboard/DashboardClient.tsx).
- **Desired:** ensure each appearance tab has a preview — Palette (B1, new), Meta (already has share-card preview), Music (keeps audio player). Then **update the tutorial** (`tutorial/content.ts` + `TutorialTab`) to describe the current tab set + that each has a preview + the save-button placement (B3) + new music sources (Batch C). Tutorial copy in `id` + `en`.
- **Files:** `tutorial/content.ts`, `TutorialTab.tsx`, dict.

### B3 · Save / refresh buttons at top-right AND bottom-right (#9)
- **Current:** the editor's `SaveBar` (status + publish + save) renders **top only** ([`EditorRoot.tsx:46`](../../../src/editor/EditorRoot.tsx)). Appearance tabs (palette/music/meta) have their save in the bottom footer only.
- **Desired:** in the **editor**, show the save affordance at top-right *and* a sticky one at bottom-right, so a scrolled-down owner is reminded to save. The two must **share state** (dirty/saving/published) — `SaveBar` reads `useEditor()` for save state, but holds `isPublished` in local `useState`. Lift `isPublished` into a shared place (EditorProvider or a small context) so both bars agree; or render a single sticky bottom bar that reuses the same context. Avoid two independent publish toggles.
- **Appearance tabs:** add a matching top-right save button mirroring the existing footer save (same handler/state) so "ingat harus disimpan" holds there too. Keep it lightweight.
- **Files:** `EditorRoot.tsx`, `SaveBar.tsx`, `EditorProvider.tsx` (publish state), `PaletteTab/MusicTab/MetaTab.tsx`.

### B4 · Stale-tab save-conflict → helpful popup (#5, test FC1)
- **Current:** the server already returns a 409 with a good message: *"Undangan ini sudah diubah dari tab atau perangkat lain. Muat ulang halaman dulu sebelum menyimpan."* ([`config/route.ts:62-67`](../../../src/app/api/invitation/[slug]/config/route.ts)). The client only shows it as small inline `saveError` text ([`EditorProvider.tsx:355-378`](../../../src/editor/EditorProvider.tsx)) + a fail toast — not a clear popup.
- **Desired:** on a **409** specifically, show a dialog (reuse `DialogProvider`) that explains the conflict and offers **"Muat ulang halaman"** (reload) as the primary action, plus a hint to close other open dashboard tabs. Cancel keeps their unsaved edits in place. Append the "tutup tab dashboard lain yang terbuka" suggestion to the message copy.
- **Implementation:** `save()` needs to detect `res.status === 409` and signal the SaveBar/editor to open the dialog (e.g. return a discriminated result or expose a `conflict` flag from the provider). Keep the generic fail toast for non-409 errors.
- **Files:** `EditorProvider.tsx`, `SaveBar.tsx` (or EditorRoot), dict, optionally the 409 message in `config/route.ts`.

### B5 · Section edit opens a popup on mobile (#14)
- **Current:** the editor is a side-by-side `SectionList` + `FieldEditor`. On mobile ([`EditorRoot.module.css:58-75`](../../../src/editor/EditorRoot.module.css)) it stacks: section strip on top (`max-height:220px`), field pane **below/off-screen**. Tapping a section selects it but the editing fields appear below the fold → "ketika dipencet belum ada pop upnya."
- **Interpretation (NEEDS USER CONFIRM):** the dead "button" is the section row on small screens — selecting it surfaces nothing visible. Fix: on small screens, selecting a section opens its `FieldEditor` in a **modal / bottom-sheet popup** (reuse the dialog/overlay style already used by `WalkInDialog`/`GuestEditModal`). On desktop, keep the inline side pane.
- **Fallback if interpretation is wrong:** if the user means a *specific* control inside a section editor that does nothing, I'll reproduce in the running editor, identify it, and wire its dialog. Confirm at spec review.
- **Files:** `EditorRoot.tsx` / a new `FieldEditorSheet` wrapper, `EditorRoot.module.css`.

---

## Batch D — CSV export without `id` / `created_at` (#4, test E2)
- **Current:** [`RsvpsTab.tsx:69`](../../../src/app/[template]/[slug]/dashboard/RsvpsTab.tsx) passes the raw `rsvps` rows (incl. `id`, `created_at`) straight to `downloadCsv`. `GiftsTab` likely does the same.
- **Desired:** project export rows to drop `id` and `created_at` (the user: "gaperlu ada kolom id dan created at"), keeping human-meaningful columns (name, attending, guest_count, meal, message; gifts: name, account, amount, currency, message). Optionally give columns friendly headers. Apply to **both** RSVP and Gift exports.
- **Implementation:** map → `pick` the wanted keys before `downloadCsv`. `downloadCsv` itself ([`lib/csv.ts`](../../../src/app/[template]/[slug]/dashboard/lib/csv.ts)) stays generic — no change there.
- **Files:** `RsvpsTab.tsx`, `GiftsTab.tsx`.

---

## Batch C — Music: more sources than MP3 upload (#6, test G2)

### Goal
Let the owner set background music via **(a)** MP3 upload (existing), **(b)** a direct audio URL, **(c)** a YouTube link, or **(d)** a built-in royalty-free track.

### Data model
`config.music` (see [`EditorProvider.tsx:29-37`](../../../src/editor/EditorProvider.tsx) / `MusicTab` `MusicSettings`) gains a discriminated `source`:
- `source: 'upload' | 'url' | 'youtube' | 'library'`
- `url` stays the playable source for `upload`/`url`/`library`; for `youtube`, store the video id/url separately (e.g. `youtubeId`).
- Back-compat: a config with just `url` and no `source` is treated as `source:'url'`/`'upload'` (no migration needed; default-resolve on read).

### Editor (`MusicTab.tsx`)
A small segmented control to pick the source, each with its own input:
- **Upload** — current flow.
- **URL** — text field; validate it's an `http(s)` audio-ish URL via the existing `safeUrl` helper.
- **YouTube** — text field; parse `youtube.com/watch?v=` / `youtu.be/` to an id; show a tiny thumbnail preview.
- **Library** — pick from a short bundled list (files under `public/music/…` or hosted URLs) with inline play.

### Playback (public site)
Two consumers: solary [`AudioContext.jsx`](../../../src/all-templates/solary/contexts/AudioContext.jsx) + [`MusicPopup.jsx`](../../../src/all-templates/solary/components/MusicPopup.jsx), and lovebirds [`MusicPopup`](../../../src/all-templates/lovebirds/sections/MusicPopup/MusicPopup.jsx).
- `upload`/`url`/`library` → existing `<audio>` element path (no change beyond reading the resolved url).
- `youtube` → hidden YouTube IFrame Player (YouTube IFrame API), started on the same user gesture that the music popup "Putar" button already requires. Honor the loop toggle via the API's loop/playlist param. Mute button toggles the iframe.
- **Caveats to surface in UI copy:** YouTube needs a tap to start (no silent autoplay), may show ads, and is subject to YouTube availability — recommend Upload/Library for the smoothest result.

### Endpoint
[`/api/invitation/[slug]/music`](../../../src/app/api/invitation/[slug]/music/route.ts) validates + persists the richer `music` object (validate `source`, sanitize url/youtubeId, length caps). Keep the PUT contract; widen the schema.

### Files
`MusicTab.tsx`, `music/route.ts`, solary `AudioContext.jsx` + `MusicPopup.jsx`, lovebirds `MusicPopup.jsx`, a YouTube-url parse helper + tests, `public/music/` assets, dict.

---

## Batch E — Payment / lifecycle: expiry + renewal (#11, #12, #13)

### Findings
- **Public expiry already works**: expired rows render `ExpiredInvitationView` and are hidden from guests + link previews ([`page.tsx:76-88,427-431`](../../../src/app/[template]/[slug]/page.tsx)).
- **Dashboard already routes** expired → `PaymentGate status="expired"` ([`dashboard/page.tsx:101-111`](../../../src/app/[template]/[slug]/dashboard/page.tsx)).
- **The break:** `PaymentGate`'s expired "Perpanjang" button calls `startCheckout`, which **hard-returns `"Undangan ini sudah dibayar"`** for any `is_paid` row ([`onboarding/actions.ts:200`](../../../src/app/onboarding/actions.ts)). An expired invitation is still `is_paid=true`, so checkout never starts and `onPay` silently does nothing (it only redirects on success) → "perpanjang tidak redirect ke xendit" + the "weird error" perception.
- Webhook routes by external-id prefix (`upg_` vs `inv_`) and the `inv_` branch refuses already-paid rows ([`webhook/route.ts:38,64`](../../../src/app/api/payment/xendit/webhook/route.ts)). `invitationIdFromExternalId` only parses `inv_` ([`xendit.ts:123`](../../../src/lib/payments/xendit.ts)).

### Design — a dedicated renewal path (mirrors the upgrade pattern)
1. **New server action `startRenewal(invitationId)`** in `onboarding/actions.ts`:
   - Owner + rate-limit checks (reuse `checkout:` bucket).
   - Require `is_paid === true` and status `expired` (allow active-but-near-expiry later; keep to expired now).
   - Resolve the **current** plan price via `resolvePlan(template_id, plan)`.
   - Expire any prior outstanding invoice, then `createXenditInvoice` with external id **`ren_<invitationId>_<ts>`**, success `?renewed=1`, failure `?renewal=failed`.
   - Persist the renewal invoice ids (reuse `xendit_invoice_id`/`xendit_external_id`, or a `plan_renewals` row mirroring `plan_upgrades` for a clean audit trail — **decision: reuse the invitation columns** to avoid a new table; the `ren_` prefix disambiguates in the webhook).
   - Return `{ ok, invoiceUrl }`.
2. **Webhook:** add a `body.external_id.startsWith('ren_')` branch → parse invitation id, re-verify (PAID + amount === current plan price), then **extend the active period**: a new `extendActivePeriod(admin, inv)` helper in `publish.ts` that sets `expires_at = resolved.expiresAt(now)` and ensures `is_published=true`, **without** touching `is_paid`/data. Generalize `invitationIdFromExternalId` (or add `renewalIdFromExternalId`) to parse `ren_`.
3. **Manual fallback:** `recheckPayment` (or a sibling `recheckRenewal`) handles the expired case — if the latest `ren_` invoice is paid, extend the period.
4. **`PaymentGate` wiring:** expired branch calls `startRenewal` (not `startCheckout`); **surface errors** (currently swallowed) — show the returned error inline + a retry. Confirm `paymentGate.expired*` copy clearly says "masa aktif habis — perpanjang di sini" with the renew button (adjust dict if weak).
5. **Verify** `scripts/mark-paid.mjs --days=-1` actually sets `expires_at` in the past (the test harness for expiry) — fix if it sets the wrong column.

### Data preservation
Renewal only extends `expires_at` + republishes — RSVPs, gifts, guestbook, ucapan all stay (test A7 / CHAIN-4). Repeated expire↔renew must not duplicate or lose data (CHAIN-4.5).

### Files
`onboarding/actions.ts`, `payments/publish.ts`, `payments/xendit.ts`, `webhook/route.ts`, `PaymentGate.tsx`, `profile/RecheckPaymentButton` (if reused), dict, `scripts/mark-paid.mjs`, webhook + actions tests.

### Out of scope (per decision 2)
No plan picker on the renew screen; no downgrade. Basic→Premium stays on the existing `startUpgradeCheckout` button.

---

## Batch F — Guestbook: source attribution + count reconcile (#10)

### Current model
`attendances.source` is constrained to `('rsvp','walkin')` ([migration](../../../supabase/migrations/2026-05-30_attendances.sql)). Unique index on `(invitation_id, guest_id)`. Server actions in [`guestbook/actions.ts`](../../../src/app/[template]/[slug]/dashboard/guestbook/actions.ts):
- `addWalkInAttendance(guestId)` → always inserts `source='walkin'`; a second add for the same guest returns `code:'duplicate'`.
- `addUnlistedAttendance(name)` → inserts `source='walkin'`, `guest_id=null`.
- RSVP "hadir" auto-creates `source='rsvp'` (in the rsvp API route).

### Desired rules (the couple's logic)
When the committee records arrivals manually, **source follows the guest's real state**:
- Picked guest **has submitted an RSVP** → `source='rsvp'` (even though committee entered it manually). Link `rsvp_id` when resolvable.
- Picked guest is **in the guest list but has NOT RSVP'd** → `source='walkin'`.
- **Not in any list** (manual unlisted add) → `source='unregistered'` (tak terdaftar).

**Reconcile, don't reject:** if the picked guest already has an attendance row, **update** its `guest_count` (and note/source) instead of returning `'duplicate'` — because the real head-count can differ from what they wrote in the RSVP ("kalau jumlahnya berbeda di update aja").

### Implementation
1. **Migration** (`supabase/migrations/2026-06-16_attendance_source.sql`): drop + recreate the `source` CHECK to `('rsvp','walkin','unregistered')`. Idempotent, documented like the existing migration.
2. **Types:** widen `AttendanceRow.source` / `AttendanceRowDb.source` to include `'unregistered'` ([types.ts](../../../src/app/[template]/[slug]/dashboard/guestbook/types.ts)).
3. **`addWalkInAttendance`:** before insert, look up whether the guest has a submitted RSVP (via `guests.rsvp_submitted_at` and/or a matching `rsvps` row) → choose `source` (`rsvp` vs `walkin`) and `rsvp_id`. Change the insert to an **upsert on `(invitation_id, guest_id)`**: on conflict update `guest_count`, `note_enc`, `source`, `arrived_at`, and return `{ ok, row, updated:true }`. Feedback copy distinguishes "ditambahkan" vs "diperbarui".
4. **`addUnlistedAttendance`:** `source='unregistered'`.
5. **`WalkInDialog`:** when a picked guest already has a ledger entry, pre-fill the existing count and label the action "Perbarui jumlah" (still works for brand-new adds). Map the (now non-fatal) duplicate path to the update flow.
6. **Ledger display** ([`LedgerTable.tsx`](../../../src/app/[template]/[slug]/dashboard/guestbook/LedgerTable.tsx) / `StatsRow`): show the three sources distinctly (RSVP / Walk-in / Tak terdaftar) with labels in `id` + `en`.

### Tests
Extend `guestbook/__tests__/actions.test.ts` (+ entitlement test) for: rsvp-vs-walkin source selection, unregistered source, and count reconcile-on-conflict.

### Files
new migration, `guestbook/types.ts`, `guestbook/actions.ts`, `WalkInDialog.tsx`, `LedgerTable.tsx`/`StatsRow.tsx`, dict, guestbook tests.

---

## Items needing the couple's confirmation at spec review
1. **#14 interpretation** — is the "button with no popup" the section row on **mobile** (→ open field editor as a popup), or a specific control inside a section editor? (Spec assumes the former.)
2. **#10 source rules** — confirm the three-way mapping (rsvp / walk-in / unregistered) and the **update-count-on-conflict** behavior as written.

## Verification plan (per batch)
Re-run the relevant `panduan-uji-coba` IDs after each batch: A→D2/D4/D7; B→FC1/G1/editor on mobile; D→E2; C→G2; E→A6/4.2/4.4/CHAIN-4; F→H5-H9/the new source cases. Plus `npm test` for touched suites and a manual editor/dashboard smoke on desktop + a narrow viewport.
