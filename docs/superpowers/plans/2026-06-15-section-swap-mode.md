# Section move/swap reorder mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Geser / Tukar" (move / swap) toggle to the section-list editor so couples can swap two sections across a locked anchor, which the current move/insert path rejects.

**Architecture:** A new pure function `computeSwapOrder` (plus an `isSlotFixed` helper) in `templatePolicy.ts` computes a swapped id-order, rejecting any swap that touches a fixed slot. `SectionList.tsx` gains a `dragMode` toggle; in swap mode `onDragEnd` routes through `computeSwapOrder` and reuses the existing `reorderSectionsById`. The move/insert path is untouched.

**Tech Stack:** TypeScript, React 18, @dnd-kit, vitest. Spec: `docs/superpowers/specs/2026-06-15-section-swap-mode-design.md`.

---

### Task 1: `isSlotFixed` + `computeSwapOrder` in templatePolicy

**Files:**
- Modify: `src/editor/templatePolicy.ts` (add two exports after `computeSafeOrder`)
- Test: `src/editor/__tests__/templatePolicy.test.ts` (append a describe block)

- [ ] **Step 1: Write the failing tests**

Append to `src/editor/__tests__/templatePolicy.test.ts`. Also add `isSlotFixed, computeSwapOrder` to the existing import on line 2.

```ts
describe('computeSwapOrder (swap mode)', () => {
  const solary = getTemplatePolicy('solary')!
  // Mirrors the real Solary order: intro/saturn/sun position-locked, earth/mercury mandatory.
  const solarySections = [
    { id: 'intro', type: 'openingGate' },
    { id: 'neptune', type: 'welcomePlanet' },
    { id: 'uranus', type: 'storyPlanet' },
    { id: 'saturn', type: 'saturnRing' },
    { id: 'jupiter', type: 'countdownPlanet' },
    { id: 'mars', type: 'detailsPlanet' },
    { id: 'earth', type: 'rsvpPlanet' },
    { id: 'venus', type: 'teamPlanet' },
    { id: 'mercury', type: 'giftPlanet' },
    { id: 'sun', type: 'footerPlanet' },
  ]
  const solaryOrder = solarySections.map((s) => s.id)

  it('swaps two free cards across a position-locked card, leaving it put', () => {
    const next = computeSwapOrder(solaryOrder, 'uranus', 'jupiter', solary, solarySections)
    expect(next).not.toBeNull()
    // saturn keeps its index (3); the two free cards exchanged.
    expect(next![3]).toBe('saturn')
    expect(next![2]).toBe('jupiter')
    expect(next![4]).toBe('uranus')
  })

  it('swaps two free cards across a mandatory card, leaving it put', () => {
    const next = computeSwapOrder(solaryOrder, 'mars', 'venus', solary, solarySections)
    expect(next).not.toBeNull()
    expect(next![6]).toBe('earth') // rsvp (mandatory) unmoved
    expect(next![5]).toBe('venus')
    expect(next![7]).toBe('mars')
  })

  it('rejects swapping onto a position-locked card', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'saturn', solary, solarySections)).toBeNull()
  })

  it('rejects swapping onto a mandatory card', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'earth', solary, solarySections)).toBeNull()
  })

  it('rejects active === over', () => {
    expect(computeSwapOrder(solaryOrder, 'uranus', 'uranus', solary, solarySections)).toBeNull()
  })

  it('lovebirds: swaps two free cards across rsvp; rejects swapping onto an anchor', () => {
    const lb = getTemplatePolicy('lovebirds')!
    const lbSections = [
      { id: 'h', type: 'hero' },
      { id: 'q', type: 'quote' },
      { id: 'r', type: 'rsvp' },
      { id: 's', type: 'schedule' },
      { id: 'f', type: 'footer' },
    ]
    const lbOrder = lbSections.map((s) => s.id)
    const ok = computeSwapOrder(lbOrder, 'q', 's', lb, lbSections)
    expect(ok).toEqual(['h', 's', 'r', 'q', 'f'])
    // hero is anchored — can't be a swap target.
    expect(computeSwapOrder(lbOrder, 'q', 'h', lb, lbSections)).toBeNull()
  })

  it('isSlotFixed: locked id, anchored type, mandatory type are fixed; free is not', () => {
    expect(isSlotFixed({ id: 'saturn', type: 'saturnRing' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'earth', type: 'rsvpPlanet' }, solary)).toBe(true)
    expect(isSlotFixed({ id: 'uranus', type: 'storyPlanet' }, solary)).toBe(false)
    const lb = getTemplatePolicy('lovebirds')!
    expect(isSlotFixed({ id: 'h', type: 'hero' }, lb)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/editor/__tests__/templatePolicy.test.ts`
Expected: FAIL — `computeSwapOrder is not a function` / `isSlotFixed is not a function`.

- [ ] **Step 3: Implement the two functions**

Append to `src/editor/templatePolicy.ts` (after `computeSafeOrder`, end of file):

```ts
/**
 * A slot that cannot take part in a swap: position-locked by id, anchored by
 * type (lovebirds hero/footer), or mandatory by type (rsvp/gift). This is
 * exactly the inverse of SectionRow's `draggable` gate.
 */
export function isSlotFixed(
  section: { id: string; type: string },
  policy: TemplatePolicy,
): boolean {
  if (isPositionLocked(section.id, policy)) return true
  if (isTypeAnchored(section.type, policy)) return true
  if (isMandatoryType(section.type, policy)) return true
  return false
}

/**
 * Swap two slots by id. Returns the new id order, or null if the swap is
 * illegal: active === over, an id is missing, or EITHER endpoint is a fixed
 * slot. Because only the two endpoints move, any locked/mandatory card BETWEEN
 * them stays at its index — which is what lets a swap cross a locked anchor.
 */
export function computeSwapOrder(
  order: string[],
  activeId: string,
  overId: string,
  policy: TemplatePolicy,
  sections: { id: string; type: string }[],
): string[] | null {
  if (activeId === overId) return null
  const active = sections.find((s) => s.id === activeId)
  const over = sections.find((s) => s.id === overId)
  if (!active || !over) return null
  if (isSlotFixed(active, policy) || isSlotFixed(over, policy)) return null
  const from = order.indexOf(activeId)
  const to = order.indexOf(overId)
  if (from < 0 || to < 0) return null
  const next = order.slice()
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/editor/__tests__/templatePolicy.test.ts`
Expected: PASS (new block + existing `computeSafeOrder` tests stay green).

- [ ] **Step 5: Commit**

```bash
git add src/editor/templatePolicy.ts src/editor/__tests__/templatePolicy.test.ts
git commit -m "feat(editor): computeSwapOrder + isSlotFixed for swap-mode reorder"
```

---

### Task 2: i18n keys for the toggle + rejected-swap feedback

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (the `editor` block in BOTH the `id` and `en` locales — near `dragReorder`)

- [ ] **Step 1: Add keys to the Indonesian `editor` block**

Find `dragReorder: 'Seret untuk mengurutkan',` (≈ line 1122) and add directly below it:

```ts
      dragModeMove: 'Geser',
      dragModeSwap: 'Tukar',
      dragModeHint: 'Geser = sisipkan • Tukar = saling tukar (bisa lewat bagian terkunci)',
      swapBlocked: 'Tidak bisa menukar dengan bagian terkunci.',
```

- [ ] **Step 2: Add the same keys to the English `editor` block**

Find `dragReorder: 'Drag to reorder',` (≈ line 2285) and add directly below it:

```ts
      dragModeMove: 'Move',
      dragModeSwap: 'Swap',
      dragModeHint: 'Move = insert • Swap = exchange (can cross locked sections)',
      swapBlocked: "Can't swap with a locked section.",
```

- [ ] **Step 3: Typecheck (the dict is structurally typed — both locales must match)**

Run: `npm run typecheck`
Expected: PASS — no "property missing in type" errors. If the dict has an explicit interface, both locales now have the four new keys so it stays consistent.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "i18n(editor): drag-mode toggle + swap-blocked strings (id/en)"
```

---

### Task 3: Toggle UI + swap branch in SectionList

**Files:**
- Modify: `src/editor/SectionList.tsx`

- [ ] **Step 1: Import `useState` and `computeSwapOrder`**

Line 1 area — add the React import (the file currently has no React state import):

```tsx
'use client'

import { useState } from 'react'
```

Extend the `templatePolicy` import (line 14) to include `computeSwapOrder`:

```tsx
import { getTemplatePolicy, computeSafeOrder, computeSwapOrder, isTypeAnchored, isTypeLockedFor, isMandatoryType, canAddSections, canRemoveSectionType } from './templatePolicy'
```

- [ ] **Step 2: Add `dragMode` state**

Inside `SectionList`, right after `const sensors = useSensors(...)` (≈ line 38):

```tsx
  const [dragMode, setDragMode] = useState<'move' | 'swap'>('move')
```

- [ ] **Step 3: Add the swap branch at the top of `onDragEnd`**

Immediately after the guard `if (!over || active.id === over.id) return` (line 42), insert:

```tsx
    if (dragMode === 'swap') {
      if (policy) {
        const ids = config.sections.map((s) => s.id)
        const next = computeSwapOrder(ids, String(active.id), String(over.id), policy, config.sections)
        if (next) reorderSectionsById(next)
        else fb.fail(t.swapBlocked)
        return
      }
      const from = config.sections.findIndex((s) => s.id === active.id)
      const to = config.sections.findIndex((s) => s.id === over.id)
      if (from < 0 || to < 0) return
      const ids = config.sections.map((s) => s.id)
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      reorderSectionsById(ids)
      return
    }
```

- [ ] **Step 4: Render the toggle in the header**

Replace the header block (lines 85–87):

```tsx
      <header style={hdr}>
        <p style={kicker}>{t.sectionsHeader}</p>
      </header>
```

with:

```tsx
      <header style={hdr}>
        <p style={kicker}>{t.sectionsHeader}</p>
        <div style={modeToggle} role="group" aria-label={t.dragModeHint} title={t.dragModeHint}>
          <button
            type="button"
            onClick={() => setDragMode('move')}
            style={dragMode === 'move' ? modeBtnActive : modeBtn}
          >⇅ {t.dragModeMove}</button>
          <button
            type="button"
            onClick={() => setDragMode('swap')}
            style={dragMode === 'swap' ? modeBtnActive : modeBtn}
          >⇄ {t.dragModeSwap}</button>
        </div>
      </header>
```

- [ ] **Step 5: Add the toggle styles + make the header a column**

Change the `hdr` style constant (line 144) to stack the kicker above the toggle:

```tsx
const hdr:  React.CSSProperties = { padding: '18px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }
```

Add these style constants near the others (after `kicker`, ≈ line 145):

```tsx
const modeToggle: React.CSSProperties = { display: 'inline-flex', alignSelf: 'flex-start', borderRadius: 8, background: 'rgba(42,33,24,0.06)', padding: 2, gap: 2 }
const modeBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(42,33,24,0.55)', padding: '4px 8px', borderRadius: 6 }
const modeBtnActive: React.CSSProperties = { ...modeBtn, background: '#E8553E', color: '#fff' }
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/editor/SectionList.tsx
git commit -m "feat(editor): Geser/Tukar toggle wires swap mode into the section list"
```

---

### Task 4: Full verification

- [ ] **Step 1: Run the whole unit suite + typecheck**

Run: `npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 2: Lint the touched files**

Run: `npm run lint`
Expected: no new errors in `templatePolicy.ts` / `SectionList.tsx` / `dashboard.ts`.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/solary-editor
```

---

## Self-review notes

- **Spec coverage:** UI toggle (Task 3), `computeSwapOrder`/`isSlotFixed` (Task 1), `onDragEnd` routing (Task 3), i18n + `fb.fail` feedback (Tasks 2–3), tests (Task 1). All spec sections mapped.
- **Type consistency:** `computeSwapOrder(order, activeId, overId, policy, sections)` and `isSlotFixed(section, policy)` signatures identical across plan + spec. Reuses `reorderSectionsById` / `REORDER_SECTIONS_BY_ID` — no new reducer.
- **No placeholders:** every code step is complete and copy-pasteable.
