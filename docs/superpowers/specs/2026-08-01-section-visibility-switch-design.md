# Section on/off control — switch + status label, and the mandatory-section unlock — design

**Date:** 2026-08-01
**Status:** Implemented on `feat/live-preview-discoverability-part-2`.
**Surface:** dashboard editor section list — `src/editor/SectionList.tsx`, `src/editor/SectionRow.tsx`,
`src/editor/templatePolicy.ts`, `src/editor/EditorProvider.tsx`, `src/components/ui/Switch.tsx`.

---

## Problem

Two independent issues compounded in the editor's section list:

1. **The on/off control did not read as a control.** Each row's enable/disable affordance was a 12px
   filled dot — green for on, grey for off — with no track, no shape a user recognises as "toggle", no
   motion, and no text naming the state. It looked like a status LED, not something to click.

2. **Four sections were locked out of on/off — and reorder, and type-swap — for no product reason.**
   `templatePolicy.ts`'s `mandatoryTypes` forced RSVP and Gift (`rsvp`/`weddingGift` on Lovebirds,
   `rsvpPlanet`/`giftPlanet` on Solary) to behave like position-locked anchors: undraggable, excluded
   from the "change type" pool, and disable-locked — the same treatment as the true structural anchors
   (`hero`/`footer`, `intro`/`sun`). Solary additionally locked the `saturn` gallery slot's disable
   action (`locks.saturn.lockDisable`). None of RSVP/Gift/Saturn is a position anchor the way hero/footer
   or intro/sun are (see `docs/superpowers/specs/2026-06-15-section-swap-mode-design.md` for the original
   mandatory/anchor split). The lock was inherited from "guest data lives here, don't let anyone lose
   it" reasoning — a data-safety concern, not a structural one — and it made the section list feel more
   locked-down than the product actually needed.

## Decisions

### D1 — switch + status label (variant B), not a bare switch or a dimmed row

The owner picked **variant B: a `role="switch"` control plus an explicit "Tampil"/"Sembunyi"
("Visible"/"Hidden") text label**, over two alternatives considered:

- **A bare switch, no label.** Fixes "doesn't read as a control" (a track+knob is a recognised shape)
  but still leaves the *current state* to be read purely from position/fill colour — the same failure
  mode as the dot for anyone scanning quickly or unable to rely on colour.
- **A dimmed row.** Grey out the whole row when a section is off. Rejected: greying reads as an
  error/loading state elsewhere in the dashboard, and it would fight with the row's existing
  selected/hover states.

B keeps the row's visual weight constant regardless of state (the list doesn't jump around as sections
are toggled) and gives the state a name, not just a colour — matching the row's other labelled controls
(rename, remove) and carrying meaning independent of colour perception.

### D2 — unlock RSVP/Gift fully; Saturn gets on/off only

Considered: loosen only the *disable* lock and keep RSVP/Gift undraggable and un-swappable. Rejected for
those two in favour of a full unlock — reorder, type-swap, and on/off together — because a half-unlock
leaves an inconsistent mental model ("I can hide the gift section but I can't move it or change what it
is") without a data-safety reason behind the remaining restriction. The risk that motivated the original
lock is guests losing the ability to *submit*; that is fully addressed by D3 (a confirm on disable), not
by freezing position or type. `hero`/`footer`/`intro`/`sun` keep their full lock because they anchor the
page structurally (first/last slot, opening/closing beat) — that reason does not apply to RSVP/Gift.

**Saturn is the deliberate exception.** It was initially unlocked along with RSVP/Gift, then re-locked in
position and type on the same day: the Saturn photo ring is parented to the Saturn group in the 3D scene,
so a moved or swapped slot would frame an empty sky while the photos orbit off-camera. That is a physical
constraint of the scene, not a product preference, so the slot keeps `lockPosition` + `lockType`. It
deliberately does **not** carry `lockDisable` — couples can still switch the gallery off.

## Before / after lock matrix

| Template | Locked from on/off — before | Locked from on/off — after | Mechanism |
|---|---|---|---|
| Lovebirds | hero, footer, rsvp, weddingGift | hero, footer | `lockedTypes: ['hero','footer']` |
| Solary | intro, sun, saturn (gallery), rsvpPlanet, giftPlanet | intro, sun | `locks.intro.lockDisable` + `locks.sun.lockDisable` |

Position/type locks are a separate axis: Solary still position- and type-locks `saturn`, which is
therefore switchable off but never movable. RSVP/Gift are no longer drag-locked or swap-excluded in
either template — they're ordinary sections now, distinguished only by D3's confirm-on-disable.

`mandatoryTypes` (the field, `isMandatoryType()`, and every call site including `SectionList.tsx` and
`FieldEditor.tsx`) is deleted entirely, along with the `'missing_mandatory'` `PolicyViolation` code.
`computeSafeOrder` lost its now-unused `sections` parameter as a result.

## D3 — `confirmDisableTypes`: a confirm, not a lock, guards guest-data sections

New declarative field on `TemplatePolicy` (`src/editor/templatePolicy.ts`):

```ts
confirmDisableTypes?: string[] // types whose disable prompts a confirm (they collect guest data)
```

Lovebirds: `['rsvp', 'weddingGift']`. Solary: `['rsvpPlanet', 'giftPlanet']`. `needsDisableConfirm(type,
policy)` is the read; `SectionRow.handleToggle` calls it only on the **ON→OFF** transition — turning a
section back on never confirms, so re-enabling never carries friction.

Copy (`src/lib/i18n/dictionaries/dashboard.ts`, `editor.disableDataConfirm`) is explicit that existing
submissions are not deleted:

- id: "Kalau bagian ini dimatikan, tamu tidak bisa mengisinya di undangan. Data yang sudah masuk tetap
  aman dan masih terlihat di dashboard. Matikan sekarang?"
- en: "If this section is turned off, guests cannot fill it in on the invitation. Data already collected
  stays safe and remains visible in the dashboard. Turn it off now?"

Disabling only hides the *form* on the public page — RSVP/Gift data already collected stays in the
dashboard's RSVP/Gifts tabs regardless of the section's `enabled` flag.

## D4 — the `saturnRing` swap-pool trap, and why the pool stayed unchanged

`saturnRing` has a registered editor schema (`src/editor/schemas/solary/saturnRing.ts`) but is
deliberately kept **out** of `SOLARY_SWAPPABLE_POOL`: there is no need to offer it in the "change type"
dropdown while the slot can never be vacated. During the interim where `locks.saturn` was removed
entirely, that combination was a live one-way door — the slot became vacatable ("Change section type" →
`quotePlanet`) while no type existed to swap *back* to, so the gallery would be permanently destroyed for
that invitation. `saturnRing` was added to the pool to defuse it.

Re-locking the slot's type (D2) removes the hazard at its source, so the pool was restored to its
original contents. The invariant to preserve is the pairing, not either half: **`locks.saturn.lockType`
and `saturnRing`'s absence from the pool must change together.** Asserted in `template-policy.test.ts`
(the lock shape and `p.swappablePool` not containing `saturnRing` are checked in the same test) and
recorded as a standing trap in `CLAUDE.md`'s Known gotchas.

## D5 — a disabled gallery skips Saturn instead of handing it over

`normalizeConfig.js` assigns planets positionally and skips disabled sections so they don't consume a
planet. `saturnRing` was exempt — it always pinned Saturn — but that exemption was computed from the
*enabled* sections only. So switching the gallery off released Saturn back into the pool and the next
section inherited it: the journey ran uranus → saturn (now framing, say, the countdown) → jupiter.

The intended behaviour is that turning the gallery off **skips that stop**: uranus → jupiter, with the
Saturn planet still present in the solar system, simply never focused. `normalizeConfig.js` now keeps
Saturn reserved when a `saturnRing` section exists but is disabled. Covered by a dedicated case in
`normalizeConfig.test.js`, which also asserts no other section claims Saturn.

## Bug found in passing — `TOGGLE_SECTION_ENABLED` and `enabled: undefined`

`section.enabled` is optional; `undefined` has always meant "on" everywhere sections render (`enabled
!== false`). The reducer's toggle action, though, computed the new value as `!s.enabled` — the boolean
negation of the *raw* field, not of the *rendered* state. For a section whose `enabled` had never been
explicitly set (older or demo configs), the first click computed `!undefined → true`: "set it to the
value it was already effectively at," so the switch appeared to do nothing on the first click.

Fixed in `src/editor/EditorProvider.tsx`'s `TOGGLE_SECTION_ENABLED` case:

```ts
enabled: s.enabled === false,
```

The new value is the inverse of the *rendered* on/off state, so an undefined section now correctly flips
to `false` on the first click. Covered in `editor-reducer.test.ts` ("undefined (renders as ON) flips to
false on the first click, not true").

## New shared control: `<Switch>`

`src/components/ui/Switch.tsx` + `Switch.module.css` — a `role="switch"` `<button>` (not a checkbox
input, so it carries its own `aria-label`/`title` without a wrapping `<label>`), a 38×22 track on
`var(--radius-pill)`, `var(--color-emerald)` when checked / `var(--border-strong)` when unchecked, an
18×18 knob. The clickable button is stretched to a **44px-min tap target** independent of the visually
smaller track (WCAG 2.5.8 — target size).

`MusicTab.tsx`'s hand-rolled local `Toggle` (music enabled / loop) now wraps this shared `Switch`
instead of its own markup, dropping its hardcoded `#2D8C4E` fill in favour of the token.

## New token: `--status-success-text`

`--color-emerald` (`#2D8C4E`) measures roughly 4.2:1 as *text* on the dashboard's light surface — under
the 4.5:1 AA floor for small text, because it was designed and is already used as a *fill* (buttons,
badges, the switch track), where the bar is lower. The section-row status label ("Tampil"/"Sembunyi")
renders as text, so a new token was added to `src/styles/tokens.css`:

```css
--status-success-text: #1F6B3C; /* ~6.5:1 on the dashboard's light surface */
```

Usage split: the switch track keeps `--color-emerald` (fill, already compliant); the "on" status label
uses `--status-success-text` (text, newly compliant); the "off" label uses the existing `--text-muted`.

## Row layout

`SectionRow.tsx` renders, left to right: `[drag handle] [name] [pencil/rename] [status label] [switch]
[×/remove]`. A locked section (opening/footer) still renders the label and a `disabled` switch — with an
"always visible" tooltip (`t.lockedAlwaysOn`) — rather than omitting the control, so the column of
switches stays vertically aligned regardless of which rows are locked.

## Verification

Automated (already run, green):
- `npm run typecheck`
- `npm run test` — 109 files / 785 tests (whole suite; unrelated work was in the tree at the time)
- `npm run check:tokens`

`src/components/ui/__tests__/Switch.test.tsx` covers the new shared control (role/`aria-checked`,
inverse-of-current emit, no emit while disabled, caller `onClick` running before `onChange` so a row can
`stopPropagation`). Writing it surfaced a real defect: `Switch.tsx` used JSX without `import React`.
Next.js compiles that fine via the automatic JSX runtime, but `vitest.config.ts` sets no `jsx: 'automatic'`,
so under the classic transform the component threw `ReferenceError: React is not defined` the moment
anything rendered it — invisible to `npm run test` while no test rendered it. Every other file in
`src/components/ui/` imports React explicitly; `Switch.tsx` now does too.

Manual QA checklist:
- [ ] Toggling RSVP/Gift off raises the confirm dialog; toggling back on does not.
- [ ] Hero/footer (Lovebirds) and intro/sun (Solary) render a disabled switch with the "always visible"
      tooltip.
- [ ] Saturn gallery (Solary) shows the 🔒 drag handle and no "Change section type" dropdown, but its
      switch still works; turning it off makes the journey run uranus → jupiter with Saturn still
      visible in the scene.
- [ ] Status label reads "Tampil"/"Sembunyi" (id) or "Visible"/"Hidden" (en) and stays legible against
      the dashboard surface.

## Non-goals

- No change to `lockSectionCount` (Lovebirds) / `fixedSections` (Solary) — add/remove stays off for
  every template.
- No change to hero/footer or intro/sun position-anchoring — still first/last, still type-locked.
- No change to the Lovebirds single-gallery constraint (`swapGroups`).
