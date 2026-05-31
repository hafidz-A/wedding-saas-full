# Solary + Lovebirds revisions — design

**Date:** 2026-05-31
**Branch:** `feat/solary-editor`
**Status:** approved-for-planning

Nine user-requested changes across the Solary and Lovebirds templates, plus one
universal rule. Delivered in two phases: **Phase A** (low-risk editor/behavior
changes) first, then **Phase B** (visual features). Hard constraint from the
user: *do not break existing behavior in either template* — only touch what each
item requires.

> WIP note: the working tree has ~22 unstaged Lovebirds files (active parallel
> edits by the user). Only the files named per-item below are to be modified.
> Never `git add -A`; stage only the spec doc + the files this work touches.

---

## Phase A — low-risk (behavior / editor)

### A1 · Solary RSVP → inline confirmation, no WhatsApp redirect
**File:** `src/all-templates/solary/sections/RSVPPlanet.jsx`,
`src/editor/schemas/solary/rsvpPlanet.ts`

Today `onSubmit` records the RSVP, sets `sent=true`, **then** opens
`https://wa.me/<number>?text=…` in a new tab. The user does not want the send
button to redirect to WhatsApp.

- Remove the `if (whatsappNumber) { window.open(wa.me…) }` block entirely.
- On success, render a **confirmation panel** mirroring GiftPlanet's success
  card: bordered `--color-surface` box, accent glyph (✦/♥), heading
  ("Terima kasih"), body ("RSVP Anda telah kami catat."), and a ghost button to
  reset and send another. Replace the current "Sent ✓ — Send Again" button-text
  trick with this panel (cleaner, matches Gift).
- **Keep** the `whatsappNumber` field in the dashboard schema — the couple still
  needs it (used to share the invitation with guests; not for the send button).
  No schema change; just stop consuming it for the redirect.

Acceptance: pressing Send records the RSVP and shows the inline confirmation; no
new tab / no WhatsApp navigation. The WhatsApp field still appears in the
dashboard editor.

### A5 · Solary planet names are positional and locked
**File:** `src/all-templates/solary/config/normalizeConfig.js`

Planets must be a fixed sequence keyed by **slot position**, not travel with a
section. Moving "Welcome" into the Uranus slot must read "Welcome · Uranus".

- Rewrite `normalizeSolaryConfig` planet assignment to **derive
  `planetKey`/`planetName` purely from index**, overriding any stored value:
  - First section (type `openingGate`) → `andromeda` (pinned intro).
  - Last section (type `footerPlanet`) → `sun` (pinned footer).
  - Every section in between → `PLANET_POOL[k++]` in order
    (`neptune, uranus, saturn, jupiter, mars, earth, venus, mercury`).
- Keep the existing `sectionLabel` self-heal (label travels with the section).
- `planetName` is **not** an editable field in any dashboard schema
  (verified — no `planetName` key in `src/editor/schemas/**`), so there is
  nothing to remove from the editor UI. This item is purely the derivation
  change.
- `CHANGE_SECTION_TYPE` in `EditorProvider.tsx` currently preserves stored
  `planetKey/planetName`; that becomes a harmless no-op because normalize now
  re-derives them at render. No change required there, but note it in the plan.

Acceptance: reorder any movable Solary section in the dashboard → the card
kicker and floating-nav planet name update to match the new slot, in journey
order, with Andromeda/Sun pinned at the ends. Saturn-ring stays at its locked
slot and keeps the Saturn planet.

### A7 · RSVP + Gift mandatory and locked in every template (universal)
**File:** `src/editor/templatePolicy.ts`, `src/editor/SectionList.tsx`,
`src/editor/SectionRow.tsx`, `src/editor/FieldEditor.tsx`

Every invitation must always contain an RSVP and a Gift/Wishlist section. They
cannot be removed, disabled, type-changed, or moved — the user chose
"benar-benar terpaku" (truly fixed: their index is preserved and other sections
cannot move past them).

- Add `mandatoryTypes?: string[]` to `TemplatePolicy`.
  - Solary: `['rsvpPlanet','giftPlanet']`.
  - Lovebirds: `['rsvp','weddingGift']`.
- Add helper `isMandatoryType(type, policy)`.
- **Remove / disable controls** for mandatory rows:
  - `SectionRow`: `canRemove=false`, `canDisable=false`, `draggable=false` (lock
    icon + tooltip) when the section's type is mandatory.
  - `FieldEditor`: treat mandatory types like `typeLocked` → no change-type
    dropdown, show the 🔒 hint.
  - `availableSwapTypes` / `availableAddTypes`: exclude mandatory types from
    being offered as swap/add targets elsewhere (they're already excluded from
    "add" by the used-set check since they always exist, but guard explicitly).
- **Position lock (truly fixed):**
  - Solary path (`computeSafeOrder`): extend the locked-index guard so any
    section whose **type** is mandatory must keep its index in the result —
    reject the move otherwise. (Currently only id-keyed `locks` are guarded;
    add a type-based pass.)
  - Lovebirds path (the `anchorFirstType/anchorLastType` branch in
    `SectionList.onDragEnd`): after clamping between anchors, also reject/clamp
    any move that would change a mandatory section's index. Simplest robust
    rule: compute the tentative order and bail if any mandatory type's index
    changed.

Acceptance: in both templates the RSVP and Gift/Wishlist rows show a lock, have
no ×/disable, no change-type dropdown, cannot be dragged, and dragging other
sections cannot shift them. Seeded configs already include both sections; this
spec does not add auto-insertion of a missing one (out of scope — all current
seeds contain them). A follow-up note is recorded in §Open-items.

### A8 · Lovebirds gallery swaps only with the other gallery, photos preserved
**File:** `src/editor/templatePolicy.ts` (or `FieldEditor`/`availableSwapTypes`),
`src/editor/EditorProvider.tsx`

The two gallery types (`galleryMasonry`, `gallerySpringCoil`) may only be
swapped with each other, and the uploaded photos must survive the swap.

- Restrict swap options: when the current type is a gallery, `availableSwapTypes`
  returns only `[currentType, otherGalleryType]` (the other gallery, if not used
  by another slot). Implement via a `swapGroups` map on the policy:
  `lovebirds.swapGroups = { galleryMasonry: ['galleryMasonry','gallerySpringCoil'], gallerySpringCoil: [...] }`.
  When a type is in a swap group, the swap options come from that group instead
  of the full pool.
- Preserve photos in `CHANGE_SECTION_TYPE`: when both old and new types are
  galleries, carry over the `photos` array. Both schemas store `photos:
  [{src, …}]`; masonry uses `alt`, spring-coil uses `caption`. Map across:
  `{ src, caption: alt ?? caption, alt: caption ?? alt }` so the caption text is
  not lost in either direction. Other props adopt the new type's defaults.

Acceptance: selecting a Masonry (or Spring-Coil) gallery in the Lovebirds editor
shows a change-type dropdown containing only the two gallery options; swapping
keeps the same photos (and captions) in the new gallery; no other section type
is offered. Non-gallery sections are unaffected.

---

## Phase B — visual

### B2 · Solary themed music popup + fix saved-song playback
**File:** `src/all-templates/solary/Shell.jsx`, new
`src/all-templates/solary/components/MusicPopup.jsx` (+ CSS), and the music-src
plumbing.

Root cause of "lagu yang sudah disimpan belum bisa diputar": `Shell.jsx` wires
`<AudioProvider src={config.audio?.src}>` — the static demo path
`/audio/ambient.mp3` from `pageConfig` — while the dashboard "Music" tab saves
the user's song to `config.music.url`. The saved song is never loaded, and there
is no popup, so autoplay is blocked and nothing plays.

- **Source fix:** resolve audio src as `config.music?.url || config.audio?.src`
  and honor `config.music?.enabled !== false`. Pass into `AudioProvider`.
- **Popup:** add a Solary-styled `MusicPopup` that mirrors the Lovebirds
  `MusicPopup` behavior (delayed appear → accept/dismiss → on accept start
  looping audio via the existing `AudioContext.acceptMusic()` so it counts as a
  user gesture → after accept, a floating play/pause toggle). Style it with
  Solary's own tokens (`--color-surface`, `--color-line`, `--color-accent`,
  `--font-mono`, glass-card feel) so it matches whichever palette the couple
  picked. Use `config.music` for title/subtitle/labels (same shape Lovebirds
  uses). Mount it inside `AudioProvider` in `Shell.jsx`.
- Keep the existing `MuteButton` working; the popup drives accept/decline.

Acceptance: with a song saved in the dashboard, opening the Solary invitation
shows a palette-matched popup; pressing Putar starts the saved song; a
play/pause toggle remains; muting/unmuting works. No song saved → no popup.

### B3 · Our Story photo carousel + responsive
**File:** `src/all-templates/solary/sections/story/MemoryViewport.jsx`,
`PolaroidCluster.jsx`, `StoryMobileExperience.jsx`, and `globals.css`
(`.story-*`).

Per chapter (`timeline[i].photos`):
- **0 photos:** render nothing (blank) — already the case via `hasActivePhoto`;
  verify the connector pipe stays hidden and no placeholder card shows.
- **≥1 photo:** show the photo in the existing polaroid/cluster style.
- **>1 photo:** make the photo **tappable to advance** to the next photo of the
  same chapter (slide to the next, **not** a zoom/lightbox). Add a small
  indicator (dots or "1/3"). Reset to photo 0 when the active chapter changes.
  Internal photo index is local state in the cluster, independent of
  `activeIndex`.
- **Responsive:** make desktop + mobile experiences work across portrait and
  landscape (sizing via `clamp`/`min`, cluster max-dimensions bounded to the
  viewport, mobile experience verified in both orientations).

Acceptance: a chapter with one photo shows it; with several, tapping cycles
through them in place with an indicator; a chapter with none shows nothing;
layout holds on phone portrait, phone landscape, and desktop.

### B4 · Welcome planet — 1-photo vs 2-photo layout
**File:** `src/all-templates/solary/sections/WelcomePlanet.jsx`,
`src/editor/schemas/solary/welcomePlanet.ts`, `pageConfig.js` (defaults).

Let the couple choose between one centered portrait (current) and two portraits
(left + right) to show who is marrying whom.

- Schema: add `layout` select (`single` | `duo`, default `single`), and a second
  portrait pair `portrait2` / `portraitCaption2` (shown/used only for `duo`).
- `WelcomePlanet`: when `layout === 'duo'` and both portraits exist, render two
  `SafeImage`s side-by-side (CSS grid `repeat(2, …)`), each with its caption,
  collapsing to stacked on narrow widths. `single` keeps today's centered single
  portrait exactly. Reuse the existing `SafeImage` (keep its placeholder/error
  behavior).

Acceptance: toggling layout in the dashboard switches the Welcome section between
one centered photo and two side-by-side photos; narrow screens stack the two;
`single` is byte-for-byte the current look.

### B6 · Gate "shooting-photo" effect
**File:** new `src/all-templates/solary/components/GatePhotoStars.jsx` (+ CSS),
mounted from `OpeningGate.jsx`; schema field on the `openingGate` section
(`src/editor/schemas/solary/openingGate.ts`) + `pageConfig.js` defaults.

In the opening gate, instead of literal twinkling stars, user-supplied photos
drift toward the screen and fade in/out like twinkling stars.

- **Engine:** a lightweight layer (DOM-absolute or single canvas) behind the gate
  card (`z-index` below `.gate-card`, above the galactic background). Each
  "shooting photo" spawns at a **bounded-random** position (avoid the center
  card region; clamp to safe margins), scales/translates slightly toward the
  viewer, fades in then out, then respawns. Cap concurrent count (e.g. 5–7) and
  cap spawn rate so it reads intentional, not chaotic.
- **Style:** render each photo in the Gallery-of-Memories card style
  (rounded/bordered, soft shadow) and **palette-aware** via Solary tokens, so it
  matches the chosen theme — consistent with `SaturnRingPlanet`'s look.
- **Photos:** a dashboard `imageArray` field on the gate section
  (`gatePhotos`); if empty, the effect renders nothing (gate falls back to its
  current plain look).
- **Responsive:** bounded spawn zones recompute on resize; works in portrait and
  landscape on phone + desktop. Respect `prefers-reduced-motion` (static or
  disabled).

Acceptance: with gate photos supplied, the opening gate shows photos drifting
in/out at varied-but-bounded positions in the chosen palette's style, responsive
on phone portrait/landscape and desktop; with none supplied, the gate looks as
it does today.

---

## Open items / out of scope
- **Auto-insert** of a missing mandatory section is **not** in scope: all current
  seed configs (`pageConfig.js`, lovebirds default) already contain RSVP + Gift.
  If a legacy config lacks one, the editor simply won't show it; a future task
  can add auto-repair in `normalizeConfig` / lovebirds equivalent.
- **Sharing the invitation via the WhatsApp number** (the couple's stated use for
  keeping that field) is a separate feature, not built here.

## Test / verify strategy
- `npm run build` (typecheck) after Phase A; targeted `vitest` for the editor
  reducer/policy (`src/editor/__tests__`) covering: mandatory lock (no
  remove/disable/move/swap), gallery-only swap + photo preservation, positional
  planet derivation.
- Manual: run dev server, open a Solary invitation + dashboard and a Lovebirds
  invitation + dashboard; verify each acceptance criterion. Phase B is
  visual-heavy → verify in browser at phone-portrait, phone-landscape, desktop.
- Do not stage unrelated WIP files; commit per-item.
