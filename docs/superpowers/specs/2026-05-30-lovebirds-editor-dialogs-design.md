1# Design — Lovebirds Editor Cleanup + Themed Dialogs

> Status: approved in brainstorming 2026-05-30. Next: implementation plan.
> Scope is the **dashboard editor** and **dashboard dialogs**. Invitation
> template performance is explicitly out of scope (user defers to a later
> session). The one section-component edit (WeddingGift.jsx, §B) is an
> approved, deliberate divergence from the byte-identical Vite source.

## Goals

1. Curate lovebirds to a fixed **10-section** model like solary (swap / change
   type / add / remove, capped at 10), instead of the current free-form 17.
2. Fold the standalone **Gift Registry** section into the **Wedding Gift**
   section (data + rendering).
3. Remove the **Guestbook ("Leave a Note")** section from lovebirds.
4. Prevent **duplicate section types** in the section pickers (all templates).
5. Replace native browser `confirm()`/`alert()` with **themed dialogs** matching
   the landing-page palette.

Out of scope: solary's section model (unchanged), the Phase-2 Buku Tamu
attendance tab and the Ucapan tab (untouched), invitation-template perf.

---

## A. Lovebirds section model (10 sections)

### Default roster (curated; user may still revise)

| # | type | notes |
|---|------|-------|
| 1 | `hero` | 🔒 anchored first, type-locked, non-removable |
| 2 | `quote` | **new section** (§A.1) — replaces `countdown`, which is redundant with the hero's built-in countdown |
| 3 | `ourStory` | |
| 4 | `eventDetails` | |
| 5 | `brideGroom` | |
| 6 | `galleryMasonry` | |
| 7 | `schedule` | |
| 8 | `rsvp` | |
| 9 | `weddingGift` | now includes registry (§B) |
| 10 | `footer` | 🔒 anchored last, type-locked, non-removable |

Dropped from the default (still addable/swappable from the pool):
`weddingParty`, `gallerySpringCoil`, `accommodations`, `faq`, `playlist`.

`countdown` is removed from lovebirds entirely (the hero has a built-in
countdown) — see §C.

### A.1 New `quote` section (verse / ayat)

Lovebirds has no quote section, only a `QuoteBlock` primitive. Add a thin,
dedicated section that reuses it:
- Component `src/all-templates/lovebirds/sections/Quote/Quote.jsx` — a section
  wrapper rendering the existing `QuoteBlock` (text + attribution) in a centered
  section container with the lovebirds look. New file (no Vite-divergence
  concern).
- Editor schema `src/editor/schemas/quote.ts` — fields `text` (textarea) and
  `attribution` (text, e.g. "QS Ar-Rum: 21"); registered in the lovebirds
  editor schema registry.
- Register `quote` in the lovebirds renderer (type → component) so it renders on
  the public page.
- Added to the section pool (addable/swappable).

### Behavior

- **Max 10 sections.** The "Add section" control is hidden/disabled at 10.
- **Hero anchored first, Footer anchored last** — both type-locked and
  non-removable. The 8 middle slots are free.
- Middle slots support: **reorder** (drag), **change type** (dropdown, like
  solary), **remove** (→ < 10).
- When < 10, "Add section" returns; adding caps back at 10.
- **Section pool** = all lovebirds types except `hero`, `footer`, `registry`,
  `guestbook`, `countdown` → 13 types: `quote`, `ourStory`, `eventDetails`,
  `brideGroom`, `weddingParty`, `galleryMasonry`, `gallerySpringCoil`,
  `schedule`, `rsvp`, `weddingGift`, `accommodations`, `faq`, `playlist`.

### Implementation notes

- `templatePolicy.ts`: add a `lovebirds` policy. Unlike solary (locks by fixed
  section **id**), lovebirds anchors/locks by section **type** (hero/footer),
  since add/remove generates fresh ids. Extend `TemplatePolicy` with
  `maxSections?: number`, plus type-based anchoring (`anchorFirstType`,
  `anchorLastType`, `lockedTypes`) used by lovebirds; solary's id-based locks
  stay as-is.
- `SectionList.tsx` / `FieldEditor.tsx` / `AddSectionMenu.tsx` read the policy
  and enforce: anchored types not draggable/removable/type-changeable; add menu
  hidden at `maxSections`.
- Solary is unchanged (still `fixedSections: true`, no add/remove).

---

## B. Gift Registry → Wedding Gift

### Schema

`weddingGiftSchema` gains a registry block (migrated from `registrySchema`):
- `registryEnabled` (boolean toggle)
- `registryTitle` (text)
- `registryMessage` (textarea)
- `platforms` (objectArray: `name`, `description`, `url`, `accent`)

### Rendering — **approved Vite divergence**

`src/all-templates/lovebirds/sections/WeddingGift/WeddingGift.jsx` renders a new
registry block below the account cards (heading, message, platform cards with
outbound links), shown only when `registryEnabled`. A header comment + a note in
`CLAUDE.md` document that this file is intentionally no longer byte-identical
with the upstream Vite project.

### Data migration

On editor load (and via the renderer path) for lovebirds configs that still
contain a standalone `registry` section: move its `title`/`message`/`platforms`
into the `weddingGift` section's props (`registryTitle`/`registryMessage`/
`platforms`, `registryEnabled: true`) and drop the `registry` section. If no
`weddingGift` section exists, the registry data is dropped (logged). Existing
public pages stop rendering the standalone section once `registry` is removed
from the lovebirds renderer registry.

---

## C. Remove Guestbook + Countdown sections from lovebirds

- Remove `guestbook` and `countdown` from the lovebirds **editor schema
  registry**, the **renderer** registry, and the **pool**.
  - `guestbook`: not wanted.
  - `countdown`: redundant — the hero already has a built-in countdown.
- Strip any `guestbook` / `countdown` section from lovebirds configs on load
  (same mechanism as the existing `DEPRECATED_SECTION_TYPES` set, made
  template-aware).
- The dashboard **Ucapan** tab and the Phase-2 **Buku Tamu** attendance tab are
  untouched (different features).
- Solary is unaffected.

---

## D. No duplicate section types (all templates)

- **Add menu** (`AddSectionMenu`): a type already present in `config.sections`
  is not offered. The menu reads current sections via `useEditor()`.
- **Change-type dropdown** (`FieldEditor`): types used by other slots are hidden
  (so changing type can't create a duplicate either). The current slot's own
  type stays selected.
- Applies to lovebirds and solary alike.

---

## E. Themed confirmation/alert dialogs

### Mechanism

- `DialogProvider` mounted once at the dashboard root, exposing
  `useConfirm()` → `(opts) => Promise<boolean>` and `useAlert()` →
  `(opts) => Promise<void>`. Promise-based so it cleanly replaces synchronous
  `confirm()`/`alert()` call sites.
- `confirm(opts)` resolves `true`/`false`; `alert(opts)` resolves on dismiss.
- `opts`: `{ title?, message, confirmLabel?, cancelLabel?, tone?: 'default' | 'danger' }`.

### Visual (landing palette, via `src/styles/tokens.css`)

- Backdrop scrim; centered card on `--color-cream` (`#FDF6EC`).
- Title `--font-display` (Cormorant) italic, `--color-charcoal`.
- Primary button `--color-coral` (`#E8553E`) pill; `danger` tone uses the
  existing red (`#C43F2A`); cancel is an outline pill.
- Matches the marketing/landing look automatically by reusing the tokens.

### Call sites replaced (14)

Editor: `SectionRow.tsx`, `FieldEditor.tsx` (remove + change-type),
`ObjectArrayField.tsx`. Dashboard: `GuestsTab.tsx`, `NotesTab.tsx` (confirm +
2 alerts), `MusicTab.tsx`, `BackgroundTab.tsx`, `GuestbookTab.tsx` (confirm +
2 alerts), `lib/csv.ts`. The `csv.ts` helper (not a component) takes an
injected `onError` callback or returns a result so the caller can show the
themed alert.

---

## Cross-cutting

- **i18n**: new dialog labels (confirm/cancel defaults) + any new schema field
  labels go to both `id` and `en` (dict-parity test enforces).
- **Renderer registry**: lovebirds public renderer drops `registry` + `guestbook`.
- **Config migration** runs in the editor load path (template-aware
  `cleanConfig`) and is idempotent.
- **Tests**: extend `template-policy.test.ts` (lovebirds policy: maxSections,
  anchored hero/footer, pool); add a config-migration unit test
  (registry→weddingGift fold, guestbook strip); add a dedup unit test for the
  pickers' available-type computation. UI verified via build + manual browser.

## Acceptance criteria

- New lovebirds invitation seeds exactly the 10 default sections (incl. the new
  `quote` section at slot 2, not `countdown`); hero first & footer last are
  locked; middle slots swap/change-type/remove; add is blocked at 10 and dedupes
  types.
- The `quote` section renders the verse text + attribution on the public page
  and is editable (text + attribution) in the editor.
- A lovebirds config with a standalone `registry` section opens with that data
  folded into Wedding Gift and the standalone section gone; the public page
  renders the registry block inside Wedding Gift.
- `guestbook` sections no longer appear in lovebirds (editor or public);
  Ucapan + Buku Tamu tabs still work.
- No picker (add or change-type) offers a type already in the config.
- Every former `confirm()`/`alert()` shows the themed dialog; flows (delete
  section, change type, clear music, reset background, delete note/guest/
  attendance, CSV empty) behave identically to before.
- Build green; vitest green (incl. new tests + dict-parity).
