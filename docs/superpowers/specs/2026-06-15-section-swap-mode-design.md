# Section reorder — "Geser / Tukar" (move / swap) mode

**Date:** 2026-06-15
**Status:** Approved — ready for plan
**Templates affected:** Solary, Lovebirds (and any future policy-driven template)

---

## Problem

The dashboard section editor reorders with a **move/insert** model (dnd-kit
sortable: splice the dragged card out, splice it back in at the drop target;
everything between shifts by one). This is correct for normal reordering but has
a frustrating failure mode around **locked sections**.

Both templates pin certain slots in place:

- **Solary** — position-locked *by id*: `intro`, `saturn`, `sun`; plus
  mandatory *by type*: `rsvpPlanet` (`earth`), `giftPlanet` (`mercury`).
- **Lovebirds** — anchored *by type*: `hero` (first), `footer` (last); plus
  mandatory *by type*: `rsvp`, `weddingGift`.

A move that crosses one of these is **rejected silently**, because the
insert-shift would change the locked slot's index. `computeSafeOrder`
([templatePolicy.ts:180](../../../src/editor/templatePolicy.ts)) checks every
locked/mandatory slot and returns `null` if any moved. Lovebirds does the
equivalent clamp in `onDragEnd` ([SectionList.tsx:46](../../../src/editor/SectionList.tsx)).

Concrete Solary example — order is:

```
intro🔒  neptune  uranus  saturn🔒  jupiter  mars  earth(rsvp)  venus  mercury(gift)  sun🔒
```

Dragging `uranus` (above `saturn`) down past `jupiter` (below `saturn`) is
impossible: the insert-shift moves `saturn`'s index → the move is rejected. The
couple can never get a section from above a locked anchor to below it.

## Insight

A **swap** exchanges only the two endpoint cards and leaves everything between
them untouched — including a locked card sitting in the middle. So swapping
`uranus` ↔ `jupiter` keeps `saturn` exactly where it is:

```
intro🔒  neptune  jupiter  saturn🔒  uranus  mars  earth  venus  mercury  sun🔒
```

Swap is therefore the natural way to reorder across locked anchors.

## Decision

Add a **mode toggle** to the section list: **Geser** (move/insert — the current
behavior, default) and **Tukar** (swap). The move path is left completely
untouched; swap is a new branch plus one pure function. Decisions made during
brainstorming:

- **Both behaviors available** (not a replacement) — couples keep insert for
  normal reordering and gain swap for crossing locks.
- **Mechanism = mode toggle** (over drop-zone detection or a Shift modifier):
  simplest, discoverable, works on touch/mobile, smallest blast radius.

---

## Design

### 1. UI — toggle in the section-list header

A small segmented control in [SectionList.tsx](../../../src/editor/SectionList.tsx)
header, next to the "Bagian / Sections" kicker:

```
SECTIONS                         [ ⇅ Geser │ ⇄ Tukar ]
```

- Local state: `const [dragMode, setDragMode] = useState<'move' | 'swap'>('move')`.
  Default `'move'` → existing behavior is byte-for-byte unchanged.
- **Not persisted** — resets to "Geser" on reload. (localStorage persistence is
  YAGNI for now.)
- Inline styles consistent with the file's existing pattern; coral accent
  `#E8553E` marks the active segment.

### 2. Swap logic — new pure function in `templatePolicy.ts`

```ts
/** A slot that cannot participate in a swap: position-locked by id,
 *  anchored by type (hero/footer), or mandatory by type (rsvp/gift).
 *  This is exactly the inverse of SectionRow's `draggable`. */
export function isSlotFixed(
  section: { id: string; type: string },
  policy: TemplatePolicy,
): boolean

/** Swap two slots by id. Returns the new id order, or null if the swap is
 *  illegal (active === over, or EITHER endpoint is a fixed slot). */
export function computeSwapOrder(
  order: string[],
  activeId: string,
  overId: string,
  policy: TemplatePolicy,
  sections: { id: string; type: string }[],
): string[] | null
```

Rules:

- `null` if `activeId === overId`.
- `null` if `isSlotFixed(active)` **or** `isSlotFixed(over)` — swap is allowed
  **only when both cards are draggable.** This is what keeps every locked card
  fixed: a locked card can be neither the dragged nor the target endpoint, and
  cards between the two endpoints are never touched by a swap.
- Otherwise: exchange the elements at `from` and `to`, return the new id array.

`isSlotFixed` mirrors the existing `draggable` computation at
[SectionList.tsx:108](../../../src/editor/SectionList.tsx):
`!posLocked && !typeAnchored && !mandatory`. One helper, used by both the row's
drag-handle gating and the swap legality check, keeps them in lockstep.

Works uniformly for Solary (id locks) and Lovebirds (type anchors/mandatory)
because it only consults existing policy helpers (`isPositionLocked`,
`isTypeAnchored`, `isMandatoryType`).

### 3. Routing in `onDragEnd`

A swap branch is added at the top of the handler; the existing move branches are
left exactly as they are.

```ts
function onDragEnd(e: DragEndEvent) {
  const { active, over } = e
  if (!over || active.id === over.id) return

  if (dragMode === 'swap') {
    if (policy) {
      const ids = config.sections.map((s) => s.id)
      const next = computeSwapOrder(ids, String(active.id), String(over.id), policy, config.sections)
      if (next) reorderSectionsById(next)
      else fb.fail(t.swapBlocked)          // dropped onto a locked card
      return
    }
    // No policy (e.g. plain template): swap the two indices directly.
    const from = config.sections.findIndex((s) => s.id === active.id)
    const to   = config.sections.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    const ids = config.sections.map((s) => s.id)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    reorderSectionsById(ids)
    return
  }

  // …unchanged: lovebirds anchored branch / solary computeSafeOrder / plain move…
}
```

Reuses the existing `reorderSectionsById` / `REORDER_SECTIONS_BY_ID` action —
**no new reducer action needed.**

### 4. i18n + feedback

Add to the `editor` block of both locales in
[dashboard.ts](../../../src/lib/i18n/dictionaries/dashboard.ts):

| key | id | en |
|---|---|---|
| `dragModeMove` | `Geser` | `Move` |
| `dragModeSwap` | `Tukar` | `Swap` |
| `dragModeHint` | `Geser = sisipkan • Tukar = saling tukar (bisa lewat bagian terkunci)` | `Move = insert • Swap = exchange (can cross locked sections)` |
| `swapBlocked` | `Tidak bisa menukar dengan bagian terkunci.` | `Can't swap with a locked section.` |

On a rejected swap (drop onto a 🔒 card) call `fb.fail(t.swapBlocked)` — unlike
the old silent move rejection, the couple is told *why* nothing happened. (`fail`
exists on the `FeedbackApi`, [FeedbackProvider.tsx:17](../../../src/components/dashboard/FeedbackProvider.tsx).)

### 5. Tests

Unit tests for `computeSwapOrder` in
[templatePolicy.test.ts](../../../src/editor/__tests__/templatePolicy.test.ts):

- **Solary** — swap `uranus` ↔ `jupiter` across `saturn` → `saturn` keeps its
  index; the two free cards exchange.
- **Solary** — swap two free cards across `earth`(`rsvpPlanet`, mandatory) →
  `earth` stays put.
- **Solary** — reject swap where `over` is `saturn` (position-locked), `earth`
  (mandatory), or `active === over`.
- **Lovebirds** — swap two free cards across `rsvp` → succeeds; reject when
  `over` is `hero`/`footer` (anchored) or a mandatory type.
- `isSlotFixed` truth table for one of each: position-locked id, anchored type,
  mandatory type, free section.

---

## Non-goals (YAGNI)

- Persisting the chosen mode across reloads.
- Drop-zone (over-card vs between-card) detection or a Shift-modifier mechanism.
- Multi-select swap, or swapping more than two cards at once.
- Any change to add/remove, type-change, enable/disable, or the move/insert path.

## Blast radius

The move/insert path is not modified. New surface = one pure function
(`computeSwapOrder` + `isSlotFixed` helper), one `useState` toggle, one branch in
`onDragEnd`, four i18n keys. Existing `computeSafeOrder` tests stay green.
