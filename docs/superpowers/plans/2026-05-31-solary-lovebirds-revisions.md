# Solary + Lovebirds Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship nine user-requested fixes across the Solary and Lovebirds wedding templates (RSVP confirmation, positional planet names, mandatory locked RSVP/Gift, gallery-only swap, themed music popup, story photo carousel, dual-photo welcome, gate photo effect) without regressing existing behavior.

**Architecture:** Two phases. Phase A is editor/behavior logic (TypeScript reducer + policy + a JS section component) covered by `vitest`. Phase B is visual Solary work (React section components + CSS) verified in the browser. Each task is independently committable; stage only the files named per task — the tree has unrelated Lovebirds WIP that must stay unstaged.

**Tech Stack:** Next.js 14, React 18, CSS Modules + CSS variables, `@dnd-kit` for editor drag, `vitest` for editor unit tests, GSAP/Three.js (Solary scene — do not touch).

**Spec:** `docs/superpowers/specs/2026-05-31-solary-lovebirds-revisions-design.md`

**Global rules:**
- Never `git add -A`. Each commit stages only the files listed in that task.
- Run `npx vitest run src/editor` after any editor change; expect green.
- Run `npx tsc --noEmit` (or `npm run build`) after Phase A.

---

## PHASE A — low-risk (editor / behavior)

### Task A1: Solary RSVP — remove WhatsApp redirect, add inline confirmation

**Files:**
- Modify: `src/all-templates/solary/sections/RSVPPlanet.jsx`

The `whatsappNumber` prop/field STAYS (couple uses it to share the invitation) —
we only stop the send button from opening `wa.me`, and add a confirmation panel.

- [ ] **Step 1: Remove the WhatsApp redirect in `onSubmit`**

In `src/all-templates/solary/sections/RSVPPlanet.jsx`, replace the `onSubmit`
body's tail. Current:

```js
    setSent(true);
    if (whatsappNumber) {
      const text = `RSVP — ${data.attending === "yes" ? "Attending ✦" : "Cannot attend"}\nName: ${data.guest_name}\nGuests: ${data.guest_count}\nMenu: ${data.meal_choice || "-"}\n${data.message ? "Note: " + data.message : ""}`;
      const num = whatsappNumber.replace(/\D/g, "");
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
    }
  };
```

Replace with:

```js
    setSent(true);
  };
```

- [ ] **Step 2: Add a `resetForm` helper and render a confirmation panel**

Keep `whatsappNumber` in the destructured props (do not remove it). After the
`onSubmit` function, add:

```js
  const resetForm = () => {
    setSent(false);
    setSendError(null);
    reset({ guest_name: name || "", attending: "yes", guest_count: 1, meal_choice: menuOptions[0] || "", message: "" });
  };
```

Then in the JSX, wrap the existing `<form>` `CardChild` so that when `sent` is
true a confirmation panel shows instead of the form. Replace the
`<CardChild>` that contains the `<form>` with:

```jsx
        <CardChild>
          {sent ? (
            <div className="center-text" style={{ marginTop: "0.5rem", padding: "1.75rem 1.5rem", border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)" }}>
              <div style={{ fontSize: 30, color: "var(--color-accent)", marginBottom: 10 }}>✦</div>
              <h3 className="h-3" style={{ marginBottom: 6 }}>Terima kasih</h3>
              <p className="p-body" style={{ color: "var(--color-fg-mute)", fontSize: 14, marginBottom: 16 }}>
                RSVP Anda telah kami catat. Sampai jumpa di hari bahagia kami.
              </p>
              <button type="button" className="btn-ghost" onClick={resetForm}>Kirim RSVP lain</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
              {/* ...existing form fields unchanged... */}
            </form>
          )}
        </CardChild>
```

Keep every existing field inside `<form>` exactly as-is. Change only the submit
button label back to a non-stateful one (since `sent` now swaps the whole block):

```jsx
            <button type="submit" className="form-button" disabled={isSubmitting}>
              {isSubmitting ? "Mengirim…" : "Kirim RSVP →"}
            </button>
```

- [ ] **Step 3: Manual verify (build)**

Run: `npx tsc --noEmit`
Expected: no new errors. (Component is JS; this just confirms nothing else broke.)
Browser check happens in the Phase-A verification task.

- [ ] **Step 4: Commit**

```bash
git add src/all-templates/solary/sections/RSVPPlanet.jsx
git commit -m "feat(solary): RSVP inline confirmation, drop WhatsApp redirect"
```

---

### Task A5: Solary planet names positional (derive from slot)

**Files:**
- Modify: `src/all-templates/solary/config/normalizeConfig.js`
- Test: `src/all-templates/solary/config/__tests__/normalizeConfig.test.js` (create)

- [ ] **Step 1: Write failing test for positional planet derivation**

Create `src/all-templates/solary/config/__tests__/normalizeConfig.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { normalizeSolaryConfig } from '../normalizeConfig.js'

const cfg = (types) => ({
  sections: types.map((type, i) => ({ id: `s${i}`, type, props: { sectionLabel: 'x' } })),
})

describe('normalizeSolaryConfig — positional planets', () => {
  it('assigns planets by slot: intro=andromeda, footer=sun, middle in pool order', () => {
    const out = normalizeSolaryConfig(cfg(['openingGate', 'welcomePlanet', 'storyPlanet', 'footerPlanet']))
    const keys = out.sections.map((s) => s.props.planetKey)
    expect(keys).toEqual(['andromeda', 'neptune', 'uranus', 'sun'])
  })

  it('is positional: a section moved to a new slot adopts that slot\'s planet', () => {
    // welcomePlanet now sits in slot 2 (after story) -> should be uranus, not neptune
    const out = normalizeSolaryConfig(cfg(['openingGate', 'storyPlanet', 'welcomePlanet', 'footerPlanet']))
    const welcome = out.sections.find((s) => s.type === 'welcomePlanet')
    expect(welcome.props.planetKey).toBe('uranus')
    expect(welcome.props.planetName).toBe('Uranus')
  })

  it('overrides any stored planetKey with the positional one', () => {
    const c = { sections: [
      { id: 'a', type: 'openingGate', props: {} },
      { id: 'b', type: 'welcomePlanet', props: { planetKey: 'mercury', planetName: 'Mercury' } },
      { id: 'z', type: 'footerPlanet', props: {} },
    ] }
    const out = normalizeSolaryConfig(c)
    expect(out.sections[1].props.planetKey).toBe('neptune')
    expect(out.sections[1].props.planetName).toBe('Neptune')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/all-templates/solary/config/__tests__/normalizeConfig.test.js`
Expected: FAIL (current code preserves stored planetKey / assigns from pool by "next unused").

- [ ] **Step 3: Rewrite the planet-assignment logic to be positional**

In `src/all-templates/solary/config/normalizeConfig.js`, replace the body of
`normalizeSolaryConfig` (the `used`/`nextPlanet`/`map` block) with a positional
walk. Keep `SECTION_LABELS`, `ALL_LABELS`, `PLANET_POOL`, `cap`, `fixLabel`
unchanged. New body:

```js
export function normalizeSolaryConfig(config) {
  if (!config || !Array.isArray(config.sections)) return config;

  // Planets are POSITIONAL. The first section (openingGate) frames Andromeda,
  // the last (footerPlanet) frames the Sun; everything between maps to the
  // canonical PLANET_POOL in journey order. We override any stored planetKey so
  // a reordered/swapped section always adopts the planet of the slot it lands
  // in — never carries its old planet with it.
  const sections = config.sections;
  const lastIdx = sections.length - 1;
  let poolIdx = 0;

  const planetFor = (s, idx) => {
    if (s.type === 'openingGate' || idx === 0) return 'andromeda';
    if (s.type === 'footerPlanet' || idx === lastIdx) return 'sun';
    const key = PLANET_POOL[poolIdx] || 'andromeda';
    poolIdx += 1;
    return key;
  };

  const out = sections.map((s, idx) => {
    const props = s.props || {};
    const next = { ...props };

    // 1. self-healing sectionLabel (label travels with the section)
    const label = fixLabel(s.type, props.sectionLabel);
    if (label !== props.sectionLabel) next.sectionLabel = label;

    // 2. positional planet — always derived, overriding stored values
    const key = planetFor(s, idx);
    next.planetKey = key;
    next.planetName = cap(key);

    return { ...s, props: next };
  });

  return { ...config, sections: out };
}
```

Note: `planetFor` consumes `poolIdx` only for middle sections, so even when a
middle slot is the special `saturnRing` it still receives the pool planet for
its index (which is `saturn` when at the canonical 4th slot). This matches the
existing demo arrangement.

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/all-templates/solary/config/__tests__/normalizeConfig.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/all-templates/solary/config/normalizeConfig.js src/all-templates/solary/config/__tests__/normalizeConfig.test.js
git commit -m "feat(solary): planet names derive positionally from slot"
```

---

### Task A7: RSVP + Gift mandatory & truly locked (both templates)

**Files:**
- Modify: `src/editor/templatePolicy.ts`
- Modify: `src/editor/SectionList.tsx`
- Modify: `src/editor/SectionRow.tsx`
- Modify: `src/editor/FieldEditor.tsx`
- Test: `src/editor/__tests__/templatePolicy.test.ts` (create or append)

- [ ] **Step 1: Add `mandatoryTypes` + helpers to the policy**

In `src/editor/templatePolicy.ts`:

Add to the `TemplatePolicy` interface:

```ts
  mandatoryTypes?: string[]     // types that must always exist: no remove/disable/type-change, position-locked
```

Set on each policy. In `solaryPolicy` add:

```ts
  mandatoryTypes: ['rsvpPlanet', 'giftPlanet'],
```

In `lovebirdsPolicy` add:

```ts
  mandatoryTypes: ['rsvp', 'weddingGift'],
```

Add a helper near `isTypeLockedFor`:

```ts
/** True for a type that must always be present and stays put (RSVP / Gift). */
export function isMandatoryType(type: string, policy: TemplatePolicy): boolean {
  return !!policy.mandatoryTypes?.includes(type)
}
```

Update `availableSwapTypes` to drop mandatory types from the offered list (so no
other slot can be turned into a second RSVP/Gift), keeping the current type
first:

```ts
  const rest = pool.filter(
    (t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t) && !policy?.mandatoryTypes?.includes(t),
  )
```

Update `computeSafeOrder` to also preserve mandatory-type indices. It currently
receives only ids + policy; give it the section list so it can check types. Change
the signature and the guard:

```ts
export function computeSafeOrder(
  order: string[],
  activeId: string,
  overId: string,
  policy: TemplatePolicy,
  sections?: { id: string; type: string }[],
): string[] | null {
  if (activeId === overId) return null
  if (isPositionLocked(activeId, policy)) return null

  // A mandatory-type slot can't be the thing being dragged.
  const typeOf = (id: string) => sections?.find((s) => s.id === id)?.type
  const activeType = typeOf(activeId)
  if (activeType && isMandatoryType(activeType, policy)) return null

  const from = order.indexOf(activeId)
  const to = order.indexOf(overId)
  if (from < 0 || to < 0) return null

  const next = order.slice()
  next.splice(from, 1)
  next.splice(to, 0, activeId)

  for (const [id, lock] of Object.entries(policy.locks)) {
    if (!lock.lockPosition) continue
    if (order.indexOf(id) !== next.indexOf(id)) return null
  }
  // Mandatory-type slots must keep their index too.
  if (sections) {
    for (const s of sections) {
      if (!isMandatoryType(s.type, policy)) continue
      if (order.indexOf(s.id) !== next.indexOf(s.id)) return null
    }
  }
  return next
}
```

- [ ] **Step 2: Write tests for the policy guards**

Append to (or create) `src/editor/__tests__/templatePolicy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder, isMandatoryType, availableSwapTypes } from '../templatePolicy'

describe('mandatory RSVP/Gift locks', () => {
  const solary = getTemplatePolicy('solary')!
  const sections = [
    { id: 'neptune', type: 'welcomePlanet' },
    { id: 'earth', type: 'rsvpPlanet' },
    { id: 'mercury', type: 'giftPlanet' },
  ]
  const order = sections.map((s) => s.id)

  it('marks rsvp/gift mandatory', () => {
    expect(isMandatoryType('rsvpPlanet', solary)).toBe(true)
    expect(isMandatoryType('giftPlanet', solary)).toBe(true)
    expect(isMandatoryType('welcomePlanet', solary)).toBe(false)
  })

  it('refuses to drag a mandatory slot', () => {
    expect(computeSafeOrder(order, 'earth', 'neptune', solary, sections)).toBeNull()
  })

  it('refuses a move that would shift a mandatory slot index', () => {
    // dragging welcome past earth would change earth's index -> reject
    expect(computeSafeOrder(order, 'neptune', 'mercury', solary, sections)).toBeNull()
  })

  it('excludes mandatory types from swap options', () => {
    const reg: Record<string, unknown> = { welcomePlanet: {}, rsvpPlanet: {}, giftPlanet: {}, quotePlanet: {} }
    const opts = availableSwapTypes(reg, sections, solary, 'neptune', 'welcomePlanet')
    expect(opts).not.toContain('rsvpPlanet')
    expect(opts).not.toContain('giftPlanet')
  })
})
```

- [ ] **Step 3: Run tests, verify fail then implement passes**

Run: `npx vitest run src/editor/__tests__/templatePolicy.test.ts`
Expected after Step 1: PASS. (If you wrote the test first, it fails before Step 1.)

- [ ] **Step 4: Pass `sections` into `computeSafeOrder` from SectionList**

In `src/editor/SectionList.tsx`, the Solary branch of `onDragEnd`:

```ts
    if (policy) {
      const order = config.sections.map((s) => s.id)
      const next = computeSafeOrder(order, String(active.id), String(over.id), policy, config.sections)
      if (next) reorderSectionsById(next)
      return
    }
```

In the lovebirds anchored branch, after computing `to` (clamped between
anchors), reject moves that would shift a mandatory section. Replace the
`if (from !== to) reorderSections(from, to)` line with:

```ts
      if (from === to) return
      // Build the tentative order and bail if any mandatory section moves index.
      const tentative = order.slice()
      const [moved] = tentative.splice(from, 1)
      tentative.splice(to, 0, moved)
      const shiftsMandatory = order.some(
        (s, i) => isMandatoryType(s.type, policy) && tentative.findIndex((t) => t.id === s.id) !== i,
      )
      if (shiftsMandatory) return
      reorderSections(from, to)
      return
```

Also: in the same branch, a mandatory-type row must not be draggable in the
first place. Update the early guard:

```ts
      if (isTypeAnchored(order[from].type, policy)) return
      if (isMandatoryType(order[from].type, policy)) return
```

Add `isMandatoryType` to the import from `./templatePolicy`.

- [ ] **Step 5: Disable row controls for mandatory rows in SectionList**

In `src/editor/SectionList.tsx`, inside the `config.sections.map`, compute and
pass mandatory state:

```tsx
              const mandatory = policy ? isMandatoryType(s.type, policy) : false
              ...
                <SectionRow
                  ...
                  draggable={!posLocked && !typeAnchored && !mandatory}
                  canRemove={!policy?.fixedSections && !typeLocked && !mandatory}
                  canDisable={!disableLocked && !typeLocked && !mandatory}
                />
```

- [ ] **Step 6: Lock the change-type dropdown for mandatory types**

In `src/editor/FieldEditor.tsx`, fold mandatory into `typeLocked`:

```ts
  const typeLocked = policy
    ? isTypeLockedFor(selectedSection.type, policy) || isTypeLocked(selectedSection.id, policy) || isMandatoryType(selectedSection.type, policy)
    : false
```

Add `isMandatoryType` to the import from `./templatePolicy`.

- [ ] **Step 7: Run all editor tests + typecheck**

Run: `npx vitest run src/editor`
Expected: PASS (including existing reducer tests).
Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/editor/templatePolicy.ts src/editor/SectionList.tsx src/editor/SectionRow.tsx src/editor/FieldEditor.tsx src/editor/__tests__/templatePolicy.test.ts
git commit -m "feat(editor): RSVP+Gift mandatory and position-locked in all templates"
```

(`SectionRow.tsx` is included only if a change was needed; the prop-driven flags
already cover it, so it may be unchanged — drop it from `git add` if so.)

---

### Task A8: Lovebirds gallery swaps only with the other gallery, photos preserved

**Files:**
- Modify: `src/editor/templatePolicy.ts`
- Modify: `src/editor/FieldEditor.tsx` (use swap-group-aware options)
- Modify: `src/editor/EditorProvider.tsx` (preserve photos on gallery↔gallery swap)
- Test: `src/editor/__tests__/templatePolicy.test.ts`, `src/editor/__tests__/editor-reducer.test.ts`

- [ ] **Step 1: Add `swapGroups` to the policy + a group-aware swap-options fn**

In `src/editor/templatePolicy.ts`, add to `TemplatePolicy`:

```ts
  swapGroups?: Record<string, string[]>   // type -> the only types it may swap with (incl. itself)
```

On `lovebirdsPolicy`:

```ts
  swapGroups: {
    galleryMasonry: ['galleryMasonry', 'gallerySpringCoil'],
    gallerySpringCoil: ['galleryMasonry', 'gallerySpringCoil'],
  },
```

Update `availableSwapTypes` so a grouped type only offers its group (minus types
used by other slots), current first:

```ts
export function availableSwapTypes(
  registry: Record<string, unknown>,
  sections: { id: string; type: string }[],
  policy: TemplatePolicy | null,
  currentId: string,
  currentType: string,
): string[] {
  const usedElsewhere = new Set(
    sections.filter((s) => s.id !== currentId).map((s) => s.type),
  )
  const group = policy?.swapGroups?.[currentType]
  const pool = group ?? policy?.swappablePool ?? Object.keys(registry)
  const rest = pool.filter(
    (t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t) && !policy?.mandatoryTypes?.includes(t),
  )
  return [currentType, ...rest]
}
```

- [ ] **Step 2: Test the gallery-only swap options**

Append to `src/editor/__tests__/templatePolicy.test.ts`:

```ts
import { availableSwapTypes as swapTypes } from '../templatePolicy'

describe('lovebirds gallery swap group', () => {
  const lb = getTemplatePolicy('lovebirds')!
  const reg: Record<string, unknown> = {
    galleryMasonry: {}, gallerySpringCoil: {}, quote: {}, rsvp: {}, weddingGift: {}, faq: {},
  }
  it('a masonry gallery only offers the two galleries', () => {
    const sections = [{ id: 'g1', type: 'galleryMasonry' }, { id: 'q', type: 'quote' }]
    const opts = swapTypes(reg, sections, lb, 'g1', 'galleryMasonry')
    expect(new Set(opts)).toEqual(new Set(['galleryMasonry', 'gallerySpringCoil']))
  })
  it('omits the other gallery if already used by another slot', () => {
    const sections = [{ id: 'g1', type: 'galleryMasonry' }, { id: 'g2', type: 'gallerySpringCoil' }]
    const opts = swapTypes(reg, sections, lb, 'g1', 'galleryMasonry')
    expect(opts).toEqual(['galleryMasonry']) // spring-coil used elsewhere
  })
})
```

- [ ] **Step 3: Preserve photos in `CHANGE_SECTION_TYPE` for gallery↔gallery**

In `src/editor/EditorProvider.tsx`, inside the `CHANGE_SECTION_TYPE` case, after
the `preserved` planet block and before building the return, add gallery photo
carry-over:

```ts
          const GALLERY_TYPES = new Set(['galleryMasonry', 'gallerySpringCoil'])
          if (GALLERY_TYPES.has(s.type) && GALLERY_TYPES.has(action.newType) && Array.isArray(prev.photos)) {
            // masonry uses {src, alt}; spring-coil uses {src, caption}. Map both so
            // the caption text survives in either direction.
            preserved.photos = (prev.photos as Array<Record<string, unknown>>).map((p) => {
              const text = (p.alt ?? p.caption ?? '') as string
              return { src: p.src ?? '', alt: text, caption: text }
            })
          }
```

(`preserved` is spread last via `{ ...defaults, ...preserved }`, so the carried
photos override the new type's default photos.)

- [ ] **Step 4: Test photo preservation**

Append to `src/editor/__tests__/editor-reducer.test.ts`:

```ts
describe('CHANGE_SECTION_TYPE — gallery photo preservation', () => {
  const galBase = {
    config: { sections: [
      { id: 'g1', type: 'galleryMasonry', props: { photos: [{ src: 'a.jpg', alt: 'Hi' }] } },
    ] },
    initialConfig: { sections: [] }, selectedSectionId: 'g1',
    isSaving: false, saveError: null, lastSavedAt: null,
  } as any
  it('carries photos across masonry -> spring coil, mapping alt to caption', () => {
    const next = reducer(galBase, { type: 'CHANGE_SECTION_TYPE', sectionId: 'g1', newType: 'gallerySpringCoil', defaults: { photos: [{ src: 'default.jpg', caption: 'def' }], sectionTitle: 'X' } })
    const s = next.config.sections[0]
    expect(s.type).toBe('gallerySpringCoil')
    expect(s.props.photos).toEqual([{ src: 'a.jpg', alt: 'Hi', caption: 'Hi' }])
  })
})
```

- [ ] **Step 5: Run editor tests + typecheck**

Run: `npx vitest run src/editor`
Expected: PASS (all suites).
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/editor/templatePolicy.ts src/editor/FieldEditor.tsx src/editor/EditorProvider.tsx src/editor/__tests__/templatePolicy.test.ts src/editor/__tests__/editor-reducer.test.ts
git commit -m "feat(editor): lovebirds galleries swap only with each other, keep photos"
```

---

### Task A-VERIFY: Phase A browser smoke test

**Files:** none (manual)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: succeeds with no new type errors.

- [ ] **Step 2: Dev server smoke (per CLAUDE.md, ONE `next dev` only)**

Run: `npm run dev`, then in a browser:
- Solary invitation: submit RSVP → inline "Terima kasih" panel, NO new WhatsApp tab.
- Solary dashboard: drag a movable section into another slot → its planet name
  updates to the slot's planet; RSVP + Gift rows show 🔒, no ×/disable/drag, and
  can't be displaced by dragging neighbors; no change-type dropdown on them.
- Lovebirds dashboard: select a gallery → change-type lists only the two
  galleries; swap → photos remain; RSVP + Wishlist rows locked like Solary's.

Record results in the task notes. Stop the dev server when done.

---

## PHASE B — visual (Solary)

> Phase B tasks each begin with a "read first" step because the exact markup is
> visual and best confirmed against the live files. Code blocks below are the
> intended shape; adapt to the real structure you read.

### Task B2: Solary themed music popup + saved-song playback fix

**Files:**
- Modify: `src/all-templates/solary/Shell.jsx`
- Create: `src/all-templates/solary/components/MusicPopup.jsx`
- Create: `src/all-templates/solary/components/MusicPopup.module.css`
- Read first: `src/all-templates/lovebirds/sections/MusicPopup/MusicPopup.jsx` (pattern), `src/all-templates/lovebirds/sections/MusicPopup/MusicPopup.module.css`, `src/all-templates/solary/contexts/AudioContext.jsx`, how `config.music` reaches the template (check `src/app/[template]/[slug]/InvitationView` / page wiring), `src/all-templates/solary/components/MuteButton.jsx`.

- [ ] **Step 1: Read the pattern + confirm `config.music` shape**

Read the Lovebirds `MusicPopup` and the Solary `AudioContext`. Confirm the saved
music object is `config.music = { url, enabled, title, subtitle, acceptLabel, dismissLabel, loop }`
(see `EditorProvider.MusicSettings`). Confirm how `config` is passed to Solary
`Shell` (it receives the full saved config).

- [ ] **Step 2: Fix the audio source wiring in `Shell.jsx`**

In `src/all-templates/solary/Shell.jsx`, derive the audio source from saved
music first, demo audio as fallback, and honor `enabled`:

```js
  const music = config.music || {}
  const audioSrc = (music.enabled !== false && music.url) ? music.url : config.audio?.src
```

Pass `audioSrc` to `AudioProvider`:

```jsx
      <AudioProvider src={audioSrc} defaultVolume={config.audio?.volume ?? 0.5}>
```

- [ ] **Step 3: Create the Solary `MusicPopup` driven by `AudioContext`**

Create `src/all-templates/solary/components/MusicPopup.jsx`. It mirrors the
Lovebirds UX but uses the existing `useAudio()` context (so the same `<audio>`
element + mute button keep working) and Solary tokens for styling:

```jsx
import React, { useEffect, useState } from "react";
import { useAudio } from "../contexts/AudioContext.jsx";
import styles from "./MusicPopup.module.css";

export default function MusicPopup({ title = "Putar musik latar?", subtitle = "Nikmati pengalaman undangan lebih lengkap", acceptLabel = "Putar", dismissLabel = "Nanti", delayMs = 1500 }) {
  const audio = useAudio();
  const [phase, setPhase] = useState("hidden"); // hidden | shown | done
  useEffect(() => {
    if (!audio?.hasAudio) return undefined;
    const t = setTimeout(() => setPhase((p) => (p === "hidden" ? "shown" : p)), delayMs);
    return () => clearTimeout(t);
  }, [audio?.hasAudio, delayMs]);

  if (!audio?.hasAudio || phase !== "shown") return null;
  return (
    <div className={styles.popup} role="dialog" aria-label="Music permission">
      <span className={styles.icon} aria-hidden="true">♪</span>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.btns}>
        <button type="button" className={styles.btnDismiss} onClick={() => { audio.declineMusic(); setPhase("done"); }}>{dismissLabel}</button>
        <button type="button" className={styles.btnAccept} onClick={() => { audio.acceptMusic(); setPhase("done"); }}>{acceptLabel}</button>
      </div>
    </div>
  );
}
```

After accept, the existing `MuteButton` (already in `Shell`) acts as the
play/pause/mute control, so no separate toggle is needed.

- [ ] **Step 4: Create `MusicPopup.module.css` using Solary tokens**

Create `src/all-templates/solary/components/MusicPopup.module.css`. Use Solary
palette variables so it matches the chosen theme:

```css
.popup {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: 70; display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; max-width: min(460px, calc(100vw - 32px));
  background: var(--color-surface); color: var(--color-fg);
  border: 1px solid var(--color-line); border-radius: var(--r-3);
  box-shadow: 0 10px 40px rgba(0,0,0,0.35); backdrop-filter: blur(8px);
  animation: mpIn 360ms cubic-bezier(0.32,0.72,0,1);
}
@keyframes mpIn { from { opacity: 0; transform: translate(-50%, 14px); } to { opacity: 1; transform: translate(-50%, 0); } }
.icon { color: var(--color-accent); font-size: 20px; }
.text { display: grid; gap: 2px; }
.title { margin: 0; font-size: 14px; }
.subtitle { margin: 0; font-size: 12px; color: var(--color-fg-mute); }
.btns { display: flex; gap: 8px; margin-left: 4px; }
.btnDismiss, .btnAccept {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 8px 14px; border-radius: 999px; cursor: pointer; border: 1px solid var(--color-line);
}
.btnDismiss { background: transparent; color: var(--color-fg-mute); }
.btnAccept { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-bg, #0b0b14); }
@media (max-width: 480px) { .popup { flex-wrap: wrap; bottom: 16px; } }
```

(Confirm token names against `src/all-templates/solary/styles/tokens.css` /
`themes.css` while implementing; adjust `--color-bg` fallback to the real token.)

- [ ] **Step 5: Mount the popup in `Shell.jsx`**

Import it and render inside `AudioProvider` (alongside `MuteButton`):

```jsx
import MusicPopup from './components/MusicPopup.jsx'
...
            <MuteButton />
            <MusicPopup
              title={music.title}
              subtitle={music.subtitle}
              acceptLabel={music.acceptLabel}
              dismissLabel={music.dismissLabel}
            />
```

(Pass only defined props; the component defaults cover the rest.)

- [ ] **Step 6: Verify in browser**

Run dev server. With a song saved in the dashboard Music tab, open the Solary
invitation → palette-matched popup appears → Putar starts the saved song →
MuteButton toggles it. Switch palette → popup colors follow. No song → no popup.

- [ ] **Step 7: Commit**

```bash
git add src/all-templates/solary/Shell.jsx src/all-templates/solary/components/MusicPopup.jsx src/all-templates/solary/components/MusicPopup.module.css
git commit -m "feat(solary): themed music popup + play saved song from config.music"
```

---

### Task B4: Welcome planet — 1-photo vs 2-photo layout

**Files:**
- Modify: `src/all-templates/solary/sections/WelcomePlanet.jsx`
- Modify: `src/editor/schemas/solary/welcomePlanet.ts`
- Modify: `src/all-templates/solary/config/pageConfig.js` (add defaults)
- Read first: current `welcomePlanet.ts` schema, `WelcomePlanet.jsx`.

- [ ] **Step 1: Add schema fields (`layout`, `portrait2`, `portraitCaption2`)**

In `src/editor/schemas/solary/welcomePlanet.ts`, add a select for layout and the
second portrait fields. Pattern (match the file's existing field style):

```ts
    { type: 'select', key: 'layout', label: { id: 'Tata letak foto', en: 'Photo layout' },
      options: [
        { value: 'single', label: { id: '1 foto (tengah)', en: '1 photo (center)' } },
        { value: 'duo', label: { id: '2 foto (kiri & kanan)', en: '2 photos (left & right)' } },
      ] },
    { type: 'image', key: 'portrait2', label: { id: 'Foto kedua', en: 'Second photo' }, help: { id: 'Dipakai bila tata letak "2 foto"', en: 'Used when layout is "2 photos"' } },
    { type: 'text', key: 'portraitCaption2', label: { id: 'Keterangan foto kedua', en: 'Second photo caption' } },
```

- [ ] **Step 2: Render duo layout in `WelcomePlanet.jsx`**

Accept the new props and branch. Replace the single-portrait `CardChild` with a
layout-aware block:

```jsx
export default function WelcomePlanet({ sectionLabel, planetName, heading, body, portrait, portraitCaption, layout = "single", portrait2, portraitCaption2 }) {
  const duo = layout === "duo" && (portrait || portrait2);
  ...
        {duo ? (
          <CardChild>
            <div className="welcome-duo" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "clamp(0.8rem, 3vw, 1.6rem)", margin: "0.5rem 0 1rem", justifyItems: "center" }}>
              <SafeImage src={portrait} caption={portraitCaption} alt="Portrait one" />
              <SafeImage src={portrait2} caption={portraitCaption2} alt="Portrait two" />
            </div>
          </CardChild>
        ) : portrait ? (
          <CardChild>
            <div style={{ display: "grid", placeItems: "center", margin: "0.5rem 0 1rem" }}>
              <SafeImage src={portrait} caption={portraitCaption} alt="Couple portrait" />
            </div>
          </CardChild>
        ) : null}
```

Add a responsive rule so duo stacks on narrow widths. Append to
`src/all-templates/solary/styles/globals.css` (or components.css):

```css
@media (max-width: 560px) {
  .welcome-duo { grid-template-columns: 1fr !important; }
}
```

- [ ] **Step 3: Add demo defaults to `pageConfig.js`**

In the `neptune` welcomePlanet section `props`, add:

```js
        layout: "single",
        portrait2: "https://picsum.photos/seed/aruna-daksa-portrait-2/800/1000",
        portraitCaption2: "Jakarta, 2024",
```

- [ ] **Step 4: Verify in browser**

Toggle layout single↔duo in the dashboard; duo shows two side-by-side portraits
with captions, stacking under 560px; single is unchanged from today.

- [ ] **Step 5: Commit**

```bash
git add src/all-templates/solary/sections/WelcomePlanet.jsx src/editor/schemas/solary/welcomePlanet.ts src/all-templates/solary/config/pageConfig.js src/all-templates/solary/styles/globals.css
git commit -m "feat(solary): welcome planet supports 1 or 2 portraits"
```

---

### Task B3: Our Story — per-chapter photo carousel + responsive

**Files:**
- Read first: `src/all-templates/solary/sections/story/MemoryViewport.jsx`, `PolaroidCluster.jsx`, `StoryMobileExperience.jsx`, and the `.story-*` rules in `src/all-templates/solary/styles/globals.css`.
- Modify: `MemoryViewport.jsx` and/or `PolaroidCluster.jsx` (carousel), `StoryMobileExperience.jsx` (responsive + carousel), `globals.css` (responsive).

- [ ] **Step 1: Read the photo cluster + understand current photo rendering**

Determine where a chapter's `photos[]` is rendered (cluster) and how 0-photo is
handled today (`hasActivePhoto` hides the connector; confirm nothing renders for
empty). Identify the element that should receive the tap handler.

- [ ] **Step 2: Add local photo-index state + tap-to-advance in the cluster**

In the component that renders the active chapter's photos (likely
`PolaroidCluster.jsx`), add:

```jsx
const [photoIdx, setPhotoIdx] = useState(0);
// reset when the chapter (its photo set) changes
useEffect(() => { setPhotoIdx(0); }, [photos]);
const count = Array.isArray(photos) ? photos.length : 0;
if (count === 0) return null; // blank when no photo
const current = photos[photoIdx % count];
const advance = () => setPhotoIdx((i) => (i + 1) % count);
```

Render `current` as the photo (keep the existing polaroid styling). When
`count > 1`, make the photo a button/clickable and show an indicator:

```jsx
<div className="story-photo" role={count > 1 ? "button" : undefined} tabIndex={count > 1 ? 0 : undefined}
     onClick={count > 1 ? advance : undefined}
     onKeyDown={count > 1 ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); } } : undefined}
     style={{ cursor: count > 1 ? "pointer" : "default" }}>
  {/* existing <img> using current.src / current.caption */}
</div>
{count > 1 && (
  <div className="story-photo-dots" aria-hidden="true">
    {photos.map((_, i) => <span key={i} data-active={i === photoIdx} />)}
  </div>
)}
```

Keep the slide a simple swap (no zoom/lightbox). Optionally add a CSS
cross-fade on `current.src` change.

- [ ] **Step 3: Dots styling + responsive story CSS**

In `globals.css`, add:

```css
.story-photo-dots { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }
.story-photo-dots span { width: 6px; height: 6px; border-radius: 999px; background: var(--color-line); transition: background 200ms; }
.story-photo-dots span[data-active="true"] { background: var(--color-accent); }
```

Audit `.story-desktop__grid`, `.story-mobile*`, and cluster sizing for
portrait/landscape: ensure photo max dimensions are viewport-bounded
(`max-height: clamp(...)`, `width: min(...)`), and the mobile experience holds in
landscape. Add/adjust `@media (orientation: landscape) and (max-height: 540px)`
rules as needed so the card + photo fit without clipping.

- [ ] **Step 4: Mirror tap-to-advance in the mobile experience**

If `StoryMobileExperience.jsx` renders photos via the same cluster component, it
inherits the carousel. If it has its own photo rendering, apply the same
`photoIdx` pattern there.

- [ ] **Step 5: Verify in browser (3 viewports)**

Phone portrait, phone landscape, desktop: a chapter with 1 photo shows it; with
several, tapping cycles with dots; with none, nothing renders; no layout clipping.

- [ ] **Step 6: Commit**

```bash
git add src/all-templates/solary/sections/story/ src/all-templates/solary/styles/globals.css
git commit -m "feat(solary): Our Story per-chapter photo carousel + responsive"
```

---

### Task B6: Gate "shooting-photo" effect

**Files:**
- Read first: `src/all-templates/solary/components/OpeningGate.jsx`, the `.gate-*` CSS in `globals.css`, `src/all-templates/solary/sections/SaturnRingPlanet.jsx` (card style to echo), `src/editor/schemas/solary/openingGate.ts`.
- Create: `src/all-templates/solary/components/GatePhotoStars.jsx` (+ `.module.css` or globals rules).
- Modify: `OpeningGate.jsx` (mount the layer), `src/editor/schemas/solary/openingGate.ts` (add `gatePhotos` imageArray), `pageConfig.js` (demo defaults).

- [ ] **Step 1: Read gate structure + Saturn card style + confirm gate prop flow**

Confirm `OpeningGate` receives section `props` (it does — spread from
`OpeningGatePlaceholder`). Decide layer placement: behind `.gate-card`, above the
galactic canvas. Note the Saturn ring photo card styling to echo (rounded,
bordered, soft shadow, palette tokens).

- [ ] **Step 2: Build `GatePhotoStars.jsx` (bounded-random drifting photos)**

Create `src/all-templates/solary/components/GatePhotoStars.jsx`. DOM-based
(simplest, palette-aware via CSS). Each active photo is positioned in a
bounded-random spot avoiding the center card, fades in/out, slightly scales
toward the viewer, then respawns:

```jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./GatePhotoStars.module.css";

const MAX_CONCURRENT = 6;
const LIFETIME_MS = 4200;

// Bounded-random position in vw/vh, biased to the edges (avoid center 30-70%).
function randomSpot() {
  const edge = () => (Math.random() < 0.5 ? Math.random() * 28 + 4 : Math.random() * 28 + 68);
  const free = () => Math.random() * 92 + 4;
  return Math.random() < 0.5 ? { x: edge(), y: free() } : { x: free(), y: edge() };
}

export default function GatePhotoStars({ photos = [], reducedMotion = false }) {
  const list = useMemo(() => photos.filter(Boolean), [photos]);
  const [sparks, setSparks] = useState([]);

  useEffect(() => {
    if (!list.length || reducedMotion) return undefined;
    let id = 0;
    const spawn = () => {
      const spot = randomSpot();
      const photo = list[Math.floor(Math.random() * list.length)];
      const spark = { key: ++id, photo, ...spot, rot: (Math.random() * 16 - 8) };
      setSparks((s) => [...s, spark].slice(-MAX_CONCURRENT));
      setTimeout(() => setSparks((s) => s.filter((k) => k.key !== spark.key)), LIFETIME_MS);
    };
    const iv = setInterval(spawn, 900);
    spawn();
    return () => clearInterval(iv);
  }, [list, reducedMotion]);

  if (!list.length) return null;
  return (
    <div className={styles.layer} aria-hidden="true">
      {sparks.map((s) => (
        <figure key={s.key} className={styles.spark}
          style={{ left: `${s.x}vw`, top: `${s.y}vh`, ["--rot"]: `${s.rot}deg` }}>
          <img src={s.photo} alt="" loading="lazy" />
        </figure>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `GatePhotoStars.module.css` — palette-aware card style + twinkle**

Create `src/all-templates/solary/components/GatePhotoStars.module.css`:

```css
.layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 1; }
.spark {
  position: absolute; margin: 0; width: clamp(64px, 9vw, 132px); aspect-ratio: 3/4;
  transform: translate(-50%, -50%) rotate(var(--rot)) scale(0.7);
  border-radius: 10px; overflow: hidden; border: 1px solid var(--color-line);
  background: var(--color-surface); box-shadow: 0 8px 30px rgba(0,0,0,0.45);
  opacity: 0; animation: sparkTwinkle 4200ms ease-in-out forwards;
}
.spark img { width: 100%; height: 100%; object-fit: cover; }
@keyframes sparkTwinkle {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rot)) scale(0.62); }
  22% { opacity: 0.92; }
  60% { opacity: 0.92; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rot)) scale(1.04); }
}
@media (orientation: landscape) and (max-height: 540px) {
  .spark { width: clamp(54px, 12vh, 96px); }
}
```

- [ ] **Step 4: Mount in `OpeningGate.jsx` with reduced-motion + gatePhotos prop**

In `OpeningGate.jsx`, accept `gatePhotos` and render the layer inside
`.gate-root` (before `.gate-card`). Add a reduced-motion read:

```jsx
import GatePhotoStars from "./GatePhotoStars.jsx";
...
export default function OpeningGate({ eyebrow, coupleName, tagline, ctaLabel = "Get Started", gatePhotos = [] }) {
  ...
  return (
    <div ref={rootRef} className="gate-root" data-faded={faded ? "true" : "false"}>
      <GatePhotoStars photos={gatePhotos} reducedMotion={typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches} />
      <div className="gate-card">
      ...
```

Ensure `.gate-card` has `position: relative; z-index: 2` in CSS so it stays above
the layer (check `globals.css` and add if missing).

- [ ] **Step 5: Add `gatePhotos` to the gate schema + demo defaults**

In `src/editor/schemas/solary/openingGate.ts`, add:

```ts
    { type: 'imageArray', key: 'gatePhotos', label: { id: 'Foto bintang jatuh', en: 'Shooting photos' }, help: { id: 'Foto yang melayang di gerbang pembuka', en: 'Photos drifting across the opening gate' } },
```

In `pageConfig.js` `intro` section `props`, add a small demo set:

```js
        gatePhotos: [
          "https://picsum.photos/seed/gate-1/300/400",
          "https://picsum.photos/seed/gate-2/300/400",
          "https://picsum.photos/seed/gate-3/300/400",
        ],
```

- [ ] **Step 6: Verify in browser (3 viewports)**

Phone portrait, phone landscape, desktop: photos drift in/out at varied-but-
bounded spots, palette-styled, not overlapping the card text; with no gatePhotos
the gate looks exactly as today; reduced-motion disables the drift.

- [ ] **Step 7: Commit**

```bash
git add src/all-templates/solary/components/GatePhotoStars.jsx src/all-templates/solary/components/GatePhotoStars.module.css src/all-templates/solary/components/OpeningGate.jsx src/editor/schemas/solary/openingGate.ts src/all-templates/solary/config/pageConfig.js
git commit -m "feat(solary): opening-gate shooting-photo effect (palette-aware, responsive)"
```

---

## Final verification

- [ ] `npx vitest run src/editor src/all-templates/solary` → all green
- [ ] `npm run build` → succeeds
- [ ] Browser pass of every acceptance criterion in the spec across phone
  portrait, phone landscape, desktop for the Solary visual items.
- [ ] `git status` shows no unintended staged files; the pre-existing Lovebirds
  WIP remains unstaged.
