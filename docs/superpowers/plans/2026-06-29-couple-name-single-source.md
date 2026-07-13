# Couple Name Single Source of Truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the couple's names a single source of truth (`config.couple = { name1, name2 }`) edited in one "Couple" panel at the top of the editor, flowing automatically into every Solary & Lovebirds consumer (Hero, Footer, OpeningGate, navbar, SEO title), with per-section name fields kept but **locked** behind a deliberate unlock-with-confirmation.

**Architecture:** A pure helper module (`src/lib/meta/couple.ts`) owns all couple logic (display, title compose, parse, navbar name, and render-time prop injection). `config.couple` lives in the editor's `PageConfig` and persists through the existing section save (`/config` route — `couple` is editor-owned, `meta` stays MetaTab-owned). Both templates' `SectionRenderer` inject canonical names into section props at render unless `props.coupleOverride` is set. `meta.title` is **derived at render** from `config.couple` + `meta.titleSuffix` (no longer stored as the source). The editor's `FieldEditor` renders couple-linked fields locked, with a hover (desktop) / always-visible (touch) unlock hint and a bilingual confirm dialog.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Vitest, CSS Modules + inline styles (existing editor patterns). Template files are plain `.jsx` with `'use client'`.

## Global Constraints

- **No new UI library** — inline styles / CSS Modules only, matching existing editor code.
- **Canonical store:** `config.couple = { name1?: string; name2?: string }` at config root. Names display as `name1 & name2` (separator `" & "`).
- **Field names exactly `name1` / `name2`**; UI labels "Mempelai 1 / Mempelai 2" (id) / "Partner 1 / Partner 2" (en).
- **No character limits** on name or suffix inputs (no `maxLength`, no counter).
- **Per-section override** is one boolean `props.coupleOverride`; granularity is per-section (one lock covers all couple fields in that section). Relink (clear the flag) must be available.
- **Touch affordance:** the unlock hint label shown on hover (desktop) must be shown **persistently** on touch devices (`@media (hover: none)`).
- **Bilingual** (id + en) for every new dashboard string.
- **`meta.title` is derived, not stored as source.** `config.meta` keeps `titleSuffix`, `description`, `ogImage` (MetaTab-owned via `/meta`). Backward-compat: when `config.couple` is empty, fall back to parsing a legacy stored `meta.title`.
- **`'use client'`** stays on all editor/section/component files. The helper is framework-agnostic TS.
- Path alias `@/*` → `src/*` is available repo-wide (importable from `.jsx`).
- **Spec:** `docs/superpowers/specs/2026-06-29-couple-name-single-source-design.md`.
- **Deviation from spec §4 (intentional, simpler):** no dedicated `/api/invitation/[slug]/couple` route. `config.couple` is part of editor state and saved by the existing `/config` section save — atomic with the `coupleOverride` flags, fewer moving parts. The spec's separate-route idea is superseded by this.

---

### Task 1: Couple helper module

**Files:**
- Create: `src/lib/meta/couple.ts`
- Test: `src/lib/meta/__tests__/couple.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface CoupleData { name1?: string; name2?: string }`
  - `coupleDisplay(c): string`
  - `composeTitle(c, suffix?): string`
  - `parseCoupleFromTitle(title?): { name1: string; name2: string; titleSuffix: string }`
  - `hasCouple(c): boolean`
  - `navName(config, fallback?): string`
  - `injectCoupleProps(section, couple?): Record<string, unknown>`
  - `deriveCoupleFromConfig(config): CoupleData`

- [ ] **Step 1: Write the failing test**

Create `src/lib/meta/__tests__/couple.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  coupleDisplay, composeTitle, parseCoupleFromTitle, hasCouple,
  navName, injectCoupleProps, deriveCoupleFromConfig,
} from '../couple'

describe('coupleDisplay', () => {
  it('joins names with " & " and trims/collapses', () => {
    expect(coupleDisplay({ name1: '  Rani ', name2: 'Adi ' })).toBe('Rani & Adi')
  })
  it('drops an empty side without a dangling separator', () => {
    expect(coupleDisplay({ name1: 'Rani', name2: '' })).toBe('Rani')
    expect(coupleDisplay({})).toBe('')
    expect(coupleDisplay(null)).toBe('')
  })
})

describe('composeTitle', () => {
  it('appends the suffix after " — "', () => {
    expect(composeTitle({ name1: 'Rani', name2: 'Adi' }, 'Our Wedding')).toBe('Rani & Adi — Our Wedding')
  })
  it('omits the suffix segment when empty, and returns suffix alone when no names', () => {
    expect(composeTitle({ name1: 'Rani', name2: 'Adi' }, '')).toBe('Rani & Adi')
    expect(composeTitle({}, 'Our Wedding')).toBe('Our Wedding')
  })
})

describe('parseCoupleFromTitle', () => {
  it('splits "n1 & n2 — suffix"', () => {
    expect(parseCoupleFromTitle('Rani & Adi — Our Wedding'))
      .toEqual({ name1: 'Rani', name2: 'Adi', titleSuffix: 'Our Wedding' })
  })
  it('handles no em-dash and extra ampersands', () => {
    expect(parseCoupleFromTitle('Rani & Adi')).toEqual({ name1: 'Rani', name2: 'Adi', titleSuffix: '' })
    expect(parseCoupleFromTitle('A & B & C — Day')).toEqual({ name1: 'A', name2: 'B & C', titleSuffix: 'Day' })
    expect(parseCoupleFromTitle(undefined)).toEqual({ name1: '', name2: '', titleSuffix: '' })
  })
})

describe('hasCouple', () => {
  it('is true only when at least one name is non-empty', () => {
    expect(hasCouple({ name1: 'Rani' })).toBe(true)
    expect(hasCouple({ name1: '  ', name2: '' })).toBe(false)
    expect(hasCouple(undefined)).toBe(false)
  })
})

describe('navName', () => {
  it('prefers config.couple, then legacy meta.title, then fallback', () => {
    expect(navName({ couple: { name1: 'Rani', name2: 'Adi' }, meta: { title: 'ignore — x' } })).toBe('Rani & Adi')
    expect(navName({ meta: { title: 'Rani & Adi — Our Wedding' } })).toBe('Rani & Adi')
    expect(navName({}, 'Galactic')).toBe('Galactic')
  })
})

describe('injectCoupleProps', () => {
  const couple = { name1: 'Rani', name2: 'Adi' }
  it('injects bride/groom/couple for hero', () => {
    const out = injectCoupleProps({ type: 'hero', props: { brideName: 'OLD', groomName: 'OLD', coupleName: 'OLD' } }, couple)
    expect(out).toMatchObject({ brideName: 'Rani', groomName: 'Adi', coupleName: 'Rani & Adi' })
  })
  it('injects coupleName for footer and openingGate', () => {
    expect(injectCoupleProps({ type: 'footer', props: { coupleName: 'OLD' } }, couple).coupleName).toBe('Rani & Adi')
    expect(injectCoupleProps({ type: 'openingGate', props: {} }, couple).coupleName).toBe('Rani & Adi')
  })
  it('passes through when overridden, when couple empty, or for non-couple types', () => {
    expect(injectCoupleProps({ type: 'hero', props: { coupleName: 'OLD', coupleOverride: true } }, couple).coupleName).toBe('OLD')
    expect(injectCoupleProps({ type: 'hero', props: { coupleName: 'OLD' } }, {}).coupleName).toBe('OLD')
    expect(injectCoupleProps({ type: 'gallery', props: { x: 1 } }, couple)).toEqual({ x: 1 })
  })
})

describe('deriveCoupleFromConfig', () => {
  it('uses existing config.couple when present', () => {
    expect(deriveCoupleFromConfig({ couple: { name1: 'A', name2: 'B' } })).toEqual({ name1: 'A', name2: 'B' })
  })
  it('falls back to hero bride/groom, then hero coupleName, then meta.title', () => {
    expect(deriveCoupleFromConfig({ sections: [{ type: 'hero', props: { brideName: 'Rani', groomName: 'Adi' } }] }))
      .toEqual({ name1: 'Rani', name2: 'Adi' })
    expect(deriveCoupleFromConfig({ sections: [{ type: 'hero', props: { coupleName: 'Rani & Adi' } }] }))
      .toEqual({ name1: 'Rani', name2: 'Adi' })
    expect(deriveCoupleFromConfig({ meta: { title: 'Rani & Adi — Our Wedding' } }))
      .toEqual({ name1: 'Rani', name2: 'Adi' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/meta/__tests__/couple.test.ts`
Expected: FAIL — `../couple` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/meta/couple.ts`:

```ts
/**
 * Couple-name single source of truth.
 *
 * `config.couple = { name1, name2 }` is the canonical home for the couple's
 * names. Everything else (Hero/Footer/OpeningGate props, navbar brand, SEO
 * title) derives from it via these helpers.
 */

export interface CoupleData {
  name1?: string
  name2?: string
}

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim()

/** "Rani & Adi" — empty sides dropped, no dangling separator. */
export function coupleDisplay(c: CoupleData | null | undefined): string {
  const cc = c ?? {}
  return [cc.name1, cc.name2].map(clean).filter(Boolean).join(' & ')
}

/** SEO/share title: "Rani & Adi — Our Wedding" (suffix optional). */
export function composeTitle(c: CoupleData | null | undefined, suffix?: string | null): string {
  const names = coupleDisplay(c)
  const s = clean(suffix)
  if (!s) return names
  return names ? `${names} — ${s}` : s
}

/** Best-effort split of a legacy stored title back into structured parts. */
export function parseCoupleFromTitle(title?: string | null): { name1: string; name2: string; titleSuffix: string } {
  const raw = clean(title)
  const dash = raw.indexOf('—')
  const namesPart = dash >= 0 ? raw.slice(0, dash) : raw
  const titleSuffix = dash >= 0 ? clean(raw.slice(dash + 1)) : ''
  const parts = namesPart.split('&').map((p) => p.trim()).filter(Boolean)
  return { name1: parts[0] ?? '', name2: parts.slice(1).join(' & '), titleSuffix }
}

export function hasCouple(c: CoupleData | null | undefined): boolean {
  return coupleDisplay(c).length > 0
}

/** Navbar brand: canonical couple first, then legacy meta.title parse, then fallback. */
export function navName(
  config: { couple?: CoupleData | null; meta?: { title?: string } | null } | null | undefined,
  fallback = 'Wedding',
): string {
  const cfg = config ?? {}
  const display = coupleDisplay(cfg.couple)
  if (display) return display
  const fromTitle = clean(cfg.meta?.title?.split('—')[0])
  return fromTitle || fallback
}

// Section types that consume the couple's names.
const COUPLE_TYPES = new Set(['hero', 'footer', 'openingGate'])

/**
 * Inject canonical couple names into a section's props at render time, unless the
 * section opted out (`props.coupleOverride`). Returns the props object to spread.
 * Pure — no mutation of the input. When couple is empty, returns props unchanged
 * (legacy invitations keep their stored per-section copies).
 */
export function injectCoupleProps(
  section: { type: string; props?: Record<string, unknown> | null } | null | undefined,
  couple?: CoupleData | null,
): Record<string, unknown> {
  const props = { ...((section?.props as Record<string, unknown>) || {}) }
  if (!section || props.coupleOverride) return props
  if (!COUPLE_TYPES.has(section.type)) return props
  const display = coupleDisplay(couple)
  if (!display) return props
  const name1 = clean(couple?.name1)
  const name2 = clean(couple?.name2)
  if (section.type === 'hero') {
    if (name1) props.brideName = name1
    if (name2) props.groomName = name2
    props.coupleName = display
  } else {
    props.coupleName = display
  }
  return props
}

/** Seed config.couple for a config that predates it (editor prefill). */
export function deriveCoupleFromConfig(
  config: {
    couple?: CoupleData | null
    sections?: Array<{ type: string; props?: Record<string, any> | null }> | null
    meta?: { title?: string } | null
  } | null | undefined,
): CoupleData {
  const cfg = config ?? {}
  if (hasCouple(cfg.couple)) return cfg.couple as CoupleData
  const hero = cfg.sections?.find((s) => s.type === 'hero')?.props || undefined
  if (hero?.brideName || hero?.groomName) {
    return { name1: clean(hero.brideName), name2: clean(hero.groomName) }
  }
  if (hero?.coupleName) {
    const p = parseCoupleFromTitle(String(hero.coupleName))
    return { name1: p.name1, name2: p.name2 }
  }
  const p = parseCoupleFromTitle(cfg.meta?.title)
  return { name1: p.name1, name2: p.name2 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/meta/__tests__/couple.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/meta/couple.ts src/lib/meta/__tests__/couple.test.ts
git commit -m "feat(couple): add single-source couple-name helpers + injection"
```

---

### Task 2: Editor state — `config.couple` + reducer + derive on load

**Files:**
- Modify: `src/editor/EditorProvider.tsx`
- Modify: `src/editor/EditorRoot.tsx`
- Test: `src/editor/__tests__/editor-reducer.test.ts`

**Interfaces:**
- Consumes: `deriveCoupleFromConfig` from `@/lib/meta/couple` (Task 1).
- Produces: `PageConfig.couple?: { name1?: string; name2?: string }`; reducer action `UPDATE_COUPLE`; context method `updateCouple(key: 'name1' | 'name2', value: string)`.

- [ ] **Step 1: Write the failing test**

Append to `src/editor/__tests__/editor-reducer.test.ts` (import `reducer` is already used in that file; reuse its existing import). Add:

```ts
import { reducer } from '../EditorProvider'

describe('UPDATE_COUPLE', () => {
  const base = {
    config: { sections: [], couple: { name1: 'A', name2: 'B' } },
    initialConfig: { sections: [] },
    selectedSectionId: null,
    isSaving: false,
    saveError: null,
    lastSavedAt: null,
    baseSectionsHash: 'x',
  } as any

  it('sets a single couple name without dropping the other', () => {
    const next = reducer(base, { type: 'UPDATE_COUPLE', key: 'name1', value: 'Rani' } as any)
    expect(next.config.couple).toEqual({ name1: 'Rani', name2: 'B' })
  })
  it('initializes couple when absent', () => {
    const next = reducer({ ...base, config: { sections: [] } }, { type: 'UPDATE_COUPLE', key: 'name2', value: 'Adi' } as any)
    expect(next.config.couple).toEqual({ name2: 'Adi' })
  })
})
```

(If the file already imports `reducer`, do not duplicate the import — add only the `describe` block.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/editor/__tests__/editor-reducer.test.ts`
Expected: FAIL — `UPDATE_COUPLE` not handled (couple unchanged).

- [ ] **Step 3: Implement in `EditorProvider.tsx`**

(a) Extend `PageConfig` (the interface near line 42) — add the `couple` field:

```ts
export interface PageConfig {
  meta?: { title?: string; description?: string }
  couple?: { name1?: string; name2?: string }
  music?: MusicSettings
  bgGif?: string
  sections: SectionEntry[]
}
```

(b) Add the action to the `Action` union (near line 65):

```ts
  | { type: 'UPDATE_COUPLE'; key: 'name1' | 'name2'; value: string }
```

(c) Add the reducer case (next to `UPDATE_FIELD`, inside `reducer`):

```ts
    case 'UPDATE_COUPLE':
      return {
        ...state,
        config: { ...state.config, couple: { ...(state.config.couple || {}), [action.key]: action.value } },
      }
```

(d) Add to the `EditorContextValue` interface (near line 301, alongside `updateField`):

```ts
  updateCouple: (key: 'name1' | 'name2', value: string) => void
```

(e) Add to the `value` object (near line 521, alongside `updateField`):

```ts
    updateCouple: (key, value) => dispatch({ type: 'UPDATE_COUPLE', key, value }),
```

- [ ] **Step 4: Seed `couple` on load in `EditorRoot.tsx`**

Add the import at the top:

```ts
import { deriveCoupleFromConfig } from '@/lib/meta/couple'
```

Update `safeConfig` (currently lines ~39-42) to seed `couple`:

```ts
  const safeConfig: PageConfig = {
    meta: migrated?.meta ?? {},
    couple: deriveCoupleFromConfig(migrated),
    sections: Array.isArray(migrated?.sections) ? migrated.sections : [],
  }
```

- [ ] **Step 5: Run test + type-check**

Run: `npm run test -- src/editor/__tests__/editor-reducer.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/editor/EditorProvider.tsx src/editor/EditorRoot.tsx src/editor/__tests__/editor-reducer.test.ts
git commit -m "feat(editor): config.couple state + reducer + derive on load"
```

---

### Task 3: Schema `linkedGroup` markers + dashboard i18n keys

**Files:**
- Modify: `src/editor/schemas/types.ts`
- Modify: `src/editor/schemas/hero.ts`
- Modify: `src/editor/schemas/footer.ts`
- Modify: `src/editor/schemas/solary/openingGate.ts`
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (the `editor: {` block in BOTH `id` and `en` locales)

**Interfaces:**
- Consumes: nothing.
- Produces: `BaseField.linkedGroup?: 'couple'` (used by Task 5); `editor.couplePanel.*` and `editor.coupleLock.*` dict keys (used by Tasks 4 & 5).

- [ ] **Step 1: Add `linkedGroup` to the schema base field**

In `src/editor/schemas/types.ts`, extend `BaseField`:

```ts
export interface BaseField {
  key: string
  label: LabelText
  help?: LabelText
  /** Marks a field as bound to a centrally-managed group (currently only the
   *  couple's names). The editor renders these LOCKED unless the section opts
   *  out via props.coupleOverride. */
  linkedGroup?: 'couple'
}
```

- [ ] **Step 2: Mark the couple fields in the three schemas**

`src/editor/schemas/hero.ts` — add `linkedGroup: 'couple'` to the three name fields:

```ts
    { key: 'coupleName',       label: { id: 'Nama pasangan', en: 'Couple name' },        type: 'text', linkedGroup: 'couple' },
    { key: 'brideName',        label: { id: 'Nama mempelai wanita', en: 'Bride name' },   type: 'text', linkedGroup: 'couple' },
    { key: 'groomName',        label: { id: 'Nama mempelai pria', en: 'Groom name' },     type: 'text', linkedGroup: 'couple' },
```

`src/editor/schemas/footer.ts` — find the `coupleName` field and add the marker:

```ts
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text', linkedGroup: 'couple' },
```

`src/editor/schemas/solary/openingGate.ts` — find the `coupleName` field and add the marker:

```ts
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text', linkedGroup: 'couple' },
```

- [ ] **Step 3: Add dict keys (Indonesian `id` locale)**

In `src/lib/i18n/dictionaries/dashboard.ts`, inside the **`id`** locale's `editor: {` object, add:

```ts
        couplePanel: {
          heading: 'Nama Pasangan',
          hint: 'Diatur di sini sekali — terpakai di seluruh undangan (pembuka, footer, navbar, judul tab).',
          name1: 'Mempelai 1',
          name1Ph: 'mis. Rani',
          name2: 'Mempelai 2',
          name2Ph: 'mis. Adi',
          preview: 'Tampil sebagai',
        },
        coupleLock: {
          unlockHint: 'Klik untuk mengubah khusus di section ini',
          relink: '🔗 Hubungkan lagi ke Nama Pasangan',
          dialogTitle: 'Lepas dari Nama Pasangan?',
          dialogMessage: 'Nama ini diatur terpusat di panel Pasangan. Jika kamu mengubahnya di sini, section ini tidak akan ikut berubah saat kamu memperbarui Nama Pasangan. Lanjutkan?',
          proceed: 'Lanjutkan',
          cancel: 'Batal',
        },
```

- [ ] **Step 4: Add dict keys (English `en` locale)**

Inside the **`en`** locale's `editor: {` object, add:

```ts
        couplePanel: {
          heading: 'Couple names',
          hint: 'Set once here — used across the whole invitation (opening, footer, navbar, browser tab title).',
          name1: 'Partner 1',
          name1Ph: 'e.g. Rani',
          name2: 'Partner 2',
          name2Ph: 'e.g. Adi',
          preview: 'Shows as',
        },
        coupleLock: {
          unlockHint: 'Click to override just this section',
          relink: '🔗 Relink to Couple names',
          dialogTitle: 'Unlink from Couple names?',
          dialogMessage: 'This name is managed centrally in the Couple panel. If you change it here, this section won’t update when you edit the Couple names. Proceed?',
          proceed: 'Proceed',
          cancel: 'Cancel',
        },
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (both locales share identical key shapes; schema markers are valid `BaseField` keys).

- [ ] **Step 6: Commit**

```bash
git add src/editor/schemas/types.ts src/editor/schemas/hero.ts src/editor/schemas/footer.ts src/editor/schemas/solary/openingGate.ts src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(editor): linkedGroup field marker + couple panel/lock i18n"
```

---

### Task 4: Couple panel component + mount at top of editor

**Files:**
- Create: `src/editor/CouplePanel.tsx`
- Modify: `src/editor/EditorRoot.tsx`

**Interfaces:**
- Consumes: `useEditor()` (`config.couple`, `updateCouple`) from Task 2; `coupleDisplay` from `@/lib/meta/couple`; `editor.couplePanel.*` dict from Task 3.
- Produces: `<CouplePanel />` rendered once above the editor row.

- [ ] **Step 1: Create the panel component**

Create `src/editor/CouplePanel.tsx`:

```tsx
'use client'

import { useEditor } from './EditorProvider'
import { coupleDisplay } from '@/lib/meta/couple'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'

export default function CouplePanel() {
  const { config, updateCouple } = useEditor()
  const t = useDashboardDict().editor.couplePanel
  const couple = config.couple || {}
  const display = coupleDisplay(couple)

  return (
    <section style={card}>
      <div style={{ borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14 }}>
        <h2 style={h2}>{t.heading}</h2>
        <p style={hint}>{t.hint}</p>
      </div>
      <div style={grid}>
        <label style={field}>
          <span style={lbl}>{t.name1}</span>
          <input
            type="text"
            value={couple.name1 ?? ''}
            onChange={(e) => updateCouple('name1', e.target.value)}
            placeholder={t.name1Ph}
            style={input}
          />
        </label>
        <label style={field}>
          <span style={lbl}>{t.name2}</span>
          <input
            type="text"
            value={couple.name2 ?? ''}
            onChange={(e) => updateCouple('name2', e.target.value)}
            placeholder={t.name2Ph}
            style={input}
          />
        </label>
      </div>
      <p style={previewLine}>{t.preview}: <strong style={{ color: 'var(--text-primary)' }}>{display || '—'}</strong></p>
    </section>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', padding: 'clamp(14px, 2.5vw, 22px)', boxShadow: 'var(--shadow-sm)', display: 'grid', gap: 14, marginBottom: 16 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 22, margin: 0 }
const hint: React.CSSProperties = { margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', maxWidth: 620, lineHeight: 1.5 }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const input: React.CSSProperties = { height: 36, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const previewLine: React.CSSProperties = { margin: 0, fontSize: 12, color: 'var(--text-muted)' }
```

- [ ] **Step 2: Mount it at the top of the editor**

In `src/editor/EditorRoot.tsx`, add the import:

```ts
import CouplePanel from './CouplePanel'
```

Render it immediately inside `.wrap`, before `.topBar` (so it sits at the very top of the editor body). Change:

```tsx
      <div className={styles.wrap}>
        <div className={styles.topBar}>
```

to:

```tsx
      <div className={styles.wrap}>
        <CouplePanel />
        <div className={styles.topBar}>
```

- [ ] **Step 3: Type-check + manual verification**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run dev`, open a Solary or Lovebirds `/<template>/<slug>/dashboard` → editor (sections) tab. Verify the "Nama Pasangan" panel appears at the top with two inputs prefilled from the couple's data and a live "Tampil sebagai: …" line. Editing a name marks the editor dirty (Save button enables).

- [ ] **Step 4: Commit**

```bash
git add src/editor/CouplePanel.tsx src/editor/EditorRoot.tsx
git commit -m "feat(editor): Couple names panel at top of editor"
```

---

### Task 5: Locked couple fields + unlock/relink mechanic in FieldEditor

**Files:**
- Create: `src/editor/fields/LockedCoupleField.tsx`
- Create: `src/editor/fields/LockedCoupleField.module.css`
- Modify: `src/editor/FieldEditor.tsx`

**Interfaces:**
- Consumes: `injectCoupleProps`, `hasCouple` from `@/lib/meta/couple`; `useConfirm()` from `DialogProvider`; `editor.coupleLock.*` dict; `updateField`, `config` from `useEditor()`.
- Produces: locked rendering for `linkedGroup: 'couple'` fields + a relink control.

- [ ] **Step 1: Create the locked-field component (with hover/touch CSS)**

Create `src/editor/fields/LockedCoupleField.module.css`:

```css
.wrap {
  display: grid;
  gap: 6px;
}
.lockedBox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-strong);
  background: var(--surface-raised);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
}
.value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  flex-shrink: 0;
  font-size: 13px;
  opacity: 0.7;
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
}
/* Desktop (hover-capable): reveal the hint only on hover/focus. */
@media (hover: hover) {
  .hint { opacity: 0; transition: opacity 150ms ease; }
  .lockedBox:hover ~ .hint,
  .lockedBox:focus-visible ~ .hint { opacity: 1; }
  .lockedBox:hover { border-color: var(--interactive-primary); }
}
/* Touch (no hover): keep the same hint label permanently visible. */
@media (hover: none) {
  .hint { opacity: 1; }
}
```

Create `src/editor/fields/LockedCoupleField.tsx`:

```tsx
'use client'

import styles from './LockedCoupleField.module.css'

interface Props {
  label: string
  value: string
  hint: string
  onUnlock: () => void
}

/**
 * A couple-linked field shown locked (read-only) because its value is managed
 * centrally in the Couple panel. Clicking/tapping asks for confirmation (handled
 * by the parent via onUnlock) before turning into a normal editable field. The
 * unlock hint shows on hover for pointer devices and is always visible on touch
 * (see the module CSS @media (hover) rules).
 */
export default function LockedCoupleField({ label, value, hint, onUnlock }: Props) {
  return (
    <div className={styles.wrap}>
      <span style={lbl}>{label}</span>
      <button type="button" className={styles.lockedBox} onClick={onUnlock} aria-label={`${label} — ${hint}`}>
        <span className={styles.value}>{value || '—'}</span>
        <span className={styles.badge} aria-hidden="true">🔒</span>
      </button>
      <span className={styles.hint}>{hint}</span>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
```

- [ ] **Step 2: Wire the lock into `FieldEditor.tsx`**

Add imports at the top:

```ts
import { injectCoupleProps, hasCouple } from '@/lib/meta/couple'
import LockedCoupleField from './fields/LockedCoupleField'
```

Inside the component, after `const props = (selectedSection.props || {}) as Record<string, any>` (line ~44), compute the couple state:

```ts
  const coupleLock = (useDashboardDict().editor as any).coupleLock
  const coupleOverride = !!props.coupleOverride
  const coupleActive = hasCouple(config.couple)
  const inheritedProps = injectCoupleProps({ type: selectedSection.type, props }, config.couple)
  const hasCoupleFields = (schema?.fields || []).some((f) => (f as any).linkedGroup === 'couple')

  async function unlockCouple() {
    const ok = await confirmDialog({
      title: coupleLock.dialogTitle,
      message: coupleLock.dialogMessage,
      confirmLabel: coupleLock.proceed,
      cancelLabel: coupleLock.cancel,
    })
    if (!ok) return
    // Seed each couple field with its current inherited value so editing starts
    // from what's on screen, then flip the override flag on.
    ;(schema.fields as FieldDef[]).forEach((f) => {
      if ((f as any).linkedGroup === 'couple') {
        updateField(selectedSection!.id, f.key, inheritedProps[f.key] ?? '')
      }
    })
    updateField(selectedSection!.id, 'coupleOverride', true)
  }
  function relinkCouple() {
    updateField(selectedSection!.id, 'coupleOverride', false)
  }
```

(The `schema` const is computed earlier in the function and is non-null in the render path below — this block sits after the `if (!schema) { ... }` early return.)

Then change the fields render (line ~117) to lock couple-linked fields when appropriate:

```tsx
      <div style={form}>
        {schema.fields.map((f) => {
          const isCouple = (f as any).linkedGroup === 'couple'
          if (isCouple && coupleActive && !coupleOverride) {
            return (
              <LockedCoupleField
                key={f.key}
                label={localizeLabel(f.label, lang)}
                value={String(inheritedProps[f.key] ?? '')}
                hint={coupleLock.unlockHint}
                onUnlock={unlockCouple}
              />
            )
          }
          return renderField(f, props[f.key], (v) => updateField(selectedSection!.id, f.key, v), slug, lang)
        })}
        {hasCoupleFields && coupleActive && coupleOverride && (
          <button type="button" onClick={relinkCouple} style={relinkBtn}>{coupleLock.relink}</button>
        )}
      </div>
```

Add the relink button style near the other style consts at the bottom of the file:

```ts
const relinkBtn: React.CSSProperties = {
  justifySelf: 'start',
  padding: '8px 14px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--border-strong)',
  background: 'transparent',
  color: 'var(--text-primary)',
  fontSize: 11,
  letterSpacing: '0.08em',
  cursor: 'pointer',
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verification (desktop + touch + relink)**

Run: `npm run dev`. In a Lovebirds editor, select the Hero section:
- The Couple name / Bride / Groom fields show **locked** (🔒) with the inherited value.
- **Desktop:** hovering a locked field reveals the "Klik untuk mengubah…" hint and highlights the border.
- **Touch (emulate via DevTools device toolbar, `@media (hover: none)`):** the hint label is **always visible** under each locked field.
- Click a locked field → bilingual confirm dialog → **Proceed** → the three name fields become editable, seeded with the current names; a "🔗 Relink" button appears.
- Click **Relink** → fields return to locked/inherited.
- Repeat the locked-field check on the Footer section and (Solary) the OpeningGate section.

- [ ] **Step 5: Commit**

```bash
git add src/editor/fields/LockedCoupleField.tsx src/editor/fields/LockedCoupleField.module.css src/editor/FieldEditor.tsx
git commit -m "feat(editor): locked couple fields with hover/touch unlock + relink"
```

---

### Task 6: Render path reads couple — injection + navbar (both templates)

**Files:**
- Modify: `src/all-templates/solary/Shell.jsx`
- Modify: `src/all-templates/solary/components/InvitationPage.jsx`
- Modify: `src/all-templates/solary/renderers/SectionRenderer.jsx`
- Modify: `src/all-templates/lovebirds/renderers/SectionRenderer.jsx`

**Interfaces:**
- Consumes: `injectCoupleProps`, `navName` from `@/lib/meta/couple` (Task 1).
- Produces: sections rendered with injected names; navbar `logo` from `navName`.

- [ ] **Step 1: Solary `Shell.jsx` — navbar + thread couple to sections**

Add the import (after the `ThemeProvider` import, ~line 22):

```jsx
import { injectCoupleProps, navName } from '@/lib/meta/couple'
```

Change the navbar logo (line 128) from:

```jsx
              logo={config.meta?.title?.split('—')[0]?.trim() || 'Wedding'}
```

to:

```jsx
              logo={navName(config, 'Wedding')}
```

Change the section map (lines ~132-134) to pass `couple`:

```jsx
              {visible.map((s) => (
                <SectionRenderer key={s.id} section={s} slug={effSlug} gatePhotos={gatePhotos} couple={config.couple} />
              ))}
```

- [ ] **Step 2: Solary `InvitationPage.jsx` — navbar + thread couple**

Add the import among the top imports:

```jsx
import { injectCoupleProps, navName } from '@/lib/meta/couple'
```

Change the navbar logo (line 48):

```jsx
              logo={navName(config, 'Galactic')}
```

Change its section map (line ~53) to pass `couple`:

```jsx
              {visible.map((s) => (
                <SectionRenderer key={s.id} section={s} slug={slug} gatePhotos={gatePhotos} couple={config.couple} />
              ))}
```

(If `injectCoupleProps` ends up unused in this file because injection happens inside `SectionRenderer`, remove it from the import to satisfy lint — keep only `navName`.)

- [ ] **Step 3: Solary `SectionRenderer.jsx` — inject couple into props**

Add the import at the top:

```jsx
import { injectCoupleProps } from "@/lib/meta/couple";
```

Change the signature (line 23) to accept `couple`:

```jsx
export default function SectionRenderer({ section, slug = "demo", gatePhotos = [], couple = null }) {
```

Change the component render (line 57) to spread injected props:

```jsx
        <Component {...injectCoupleProps(section, couple)} slug={slug} {...extraProps} />
```

- [ ] **Step 4: Lovebirds `SectionRenderer.jsx` — inject couple into props**

Add the import at the top:

```jsx
import { injectCoupleProps } from '@/lib/meta/couple'
```

Change the component render (lines ~49-56) — replace `{...(section.props || {})}` with the injected props:

```jsx
              <Component
                {...injectCoupleProps(section, config?.couple)}
                id={section.id}
                slug={slug}
                blocks={section.blocks}
                decorativeLayers={section.decorativeLayers}
                layout={section.layout}
              />
```

- [ ] **Step 5: Type-check + manual verification**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npm run dev`. For both a Solary and a Lovebirds invitation that has `config.couple` set (save the Couple panel once):
- Lovebirds: Hero shows the two names + monogram; Footer "With love, …" matches; navbar (Solary) shows the couple name.
- Solary: OpeningGate `<h1>` and navbar brand both reflect the couple name.
- Edit the Couple panel → save → all of the above update together.

- [ ] **Step 6: Commit**

```bash
git add src/all-templates/solary/Shell.jsx src/all-templates/solary/components/InvitationPage.jsx src/all-templates/solary/renderers/SectionRenderer.jsx src/all-templates/lovebirds/renderers/SectionRenderer.jsx
git commit -m "feat(templates): render sections + navbar from config.couple"
```

---

### Task 7: SEO title derivation + palette preview read couple

**Files:**
- Modify: `src/app/[template]/[slug]/page.tsx` (the `generateMetadata` title resolution, around line 457)
- Modify: `src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx:70`

**Interfaces:**
- Consumes: `composeTitle`, `coupleDisplay` from `@/lib/meta/couple`.
- Produces: SEO `<title>` derived from `config.couple` + `meta.titleSuffix`; palette preview heading from `config.couple`.

- [ ] **Step 1: Read the current title resolution in `page.tsx`**

Run: `npm run dev` is not needed; open `src/app/[template]/[slug]/page.tsx` around line 450-460 to see the `generateMetadata` block. It currently resolves the page title roughly as:

```ts
      (typeof meta.title === 'string' && meta.title.trim()) ||
      ...
```

- [ ] **Step 2: Derive the title from couple + suffix**

Add the import near the other imports at the top of `page.tsx`:

```ts
import { composeTitle, coupleDisplay } from '@/lib/meta/couple'
```

In `generateMetadata`, compute a derived title and prefer it over the legacy stored `meta.title`. Replace the title resolution expression (the `(typeof meta.title === 'string' && meta.title.trim()) || …` chain) so the **derived** title wins when a couple is set, falling back to the legacy stored title:

```ts
      composeTitle(config.couple, config.meta?.titleSuffix).trim() ||
      (typeof meta.title === 'string' && meta.title.trim()) ||
      // …keep the remaining existing fallbacks (coupleName / brand) unchanged…
```

(Keep every existing fallback after these two lines exactly as-is. `composeTitle({}, undefined)` returns `''`, so when there is no couple and no suffix this line contributes nothing and the legacy path is used.)

- [ ] **Step 3: Palette preview reads `config.couple`**

In `src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx`, add the import:

```ts
import { coupleDisplay } from '@/lib/meta/couple'
```

Change the couple-name resolution (lines ~69-70):

```ts
  const hero = invitation.config?.sections?.find((s: any) => s.type === 'hero')?.props
  const coupleName: string | undefined = hero?.coupleName
```

to prefer the canonical couple:

```ts
  const hero = invitation.config?.sections?.find((s: any) => s.type === 'hero')?.props
  const coupleName: string | undefined = coupleDisplay(invitation.config?.couple) || hero?.coupleName
```

- [ ] **Step 4: Type-check + manual verification**

Run: `npx tsc --noEmit`
Expected: PASS.
Manual: with a couple set, the browser tab title reads `Name1 & Name2 — <suffix>`; the dashboard Palette preview card shows the canonical couple name.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/page.tsx" "src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx"
git commit -m "feat: derive SEO title + palette preview from config.couple"
```

---

### Task 8: Meta tab — suffix instead of name; meta route stores `titleSuffix`

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/MetaTab.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx` (pass `couple` to `MetaTab`)
- Modify: `src/app/api/invitation/[slug]/meta/route.ts`
- Test: `src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `composeTitle`, `parseCoupleFromTitle` from `@/lib/meta/couple`; `config.couple` passed from EditorWorkspace.
- Produces: MetaTab edits `titleSuffix` (not names); `/meta` PUT persists `config.meta.titleSuffix`.

- [ ] **Step 1: Write the failing test for the meta route**

In `src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`, add inside the describe block:

```ts
  it('stores titleSuffix (normalized) and no longer requires a title', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = rowFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ titleSuffix: '  Our   Wedding ' }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.meta.titleSuffix).toBe('Our Wedding')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`
Expected: FAIL — `titleSuffix` not handled (400 "Nothing to update", or value not stored).

- [ ] **Step 3: Accept `titleSuffix` in the meta route**

In `src/app/api/invitation/[slug]/meta/route.ts`:

After the existing `hasTitle/hasDesc/hasImage` detection, add suffix detection and include it in the "nothing to update" guard:

```ts
  const hasSuffix = typeof body?.titleSuffix === 'string'
```

Update the guard:

```ts
  if (!hasTitle && !hasDesc && !hasImage && !hasSuffix) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
```

Compute the normalized suffix (next to the existing `title`/`description` normalizations):

```ts
  const titleSuffix = hasSuffix ? (body.titleSuffix as string).replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX) : undefined
```

Persist it in the meta-assignment block:

```ts
  if (hasTitle) cfg.meta.title = title
  if (hasSuffix) cfg.meta.titleSuffix = titleSuffix
  if (hasDesc) cfg.meta.description = description
  if (hasImage) cfg.meta.ogImage = rawImage
```

(The legacy `title` handling stays for backward-compat; MetaTab no longer sends it.)

- [ ] **Step 4: Run the meta route tests**

Run: `npm run test -- src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`
Expected: PASS — new suffix test green; existing title/description/image tests still pass.

- [ ] **Step 5: Pass `couple` to MetaTab from EditorWorkspace**

In `src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx`, update the MetaTab render (line ~168) to pass the couple:

```tsx
          <MetaTab slug={slug} template={template} initial={invitation.config?.meta ?? null} couple={invitation.config?.couple ?? null} onSaved={setLiveUpdatedAt} />
```

- [ ] **Step 6: Replace the Title input with a Suffix input + derived preview in MetaTab**

In `src/app/[template]/[slug]/dashboard/MetaTab.tsx`:

Add the import:

```ts
import { composeTitle, parseCoupleFromTitle } from '@/lib/meta/couple'
```

Extend `MetaSettings` and `Props`:

```ts
interface MetaSettings {
  title?: string
  titleSuffix?: string
  description?: string
  ogImage?: string
}

interface Props {
  slug: string
  template?: string
  initial?: MetaSettings | null
  couple?: { name1?: string; name2?: string } | null
  onSaved?: (savedAt: string) => void
}
```

Update the component signature to destructure `couple`:

```ts
export default function MetaTab({ slug, template, initial, couple, onSaved }: Props) {
```

Replace the `title` state (`const [title, setTitle] = useState(initial?.title ?? '')`) with a suffix state that prefills from a legacy title:

```ts
  const [titleSuffix, setTitleSuffix] = useState(
    initial?.titleSuffix ?? parseCoupleFromTitle(initial?.title).titleSuffix,
  )
```

Replace the `previewTitle` line with a derived title from the couple + suffix:

```ts
  const derivedTitle = composeTitle(couple, titleSuffix)
  const previewTitle = derivedTitle.trim() || t.previewTitleFallback
```

In `save()`, change the request body from `{ title, description, ogImage }` to:

```ts
        body: JSON.stringify({ titleSuffix, description, ogImage }),
```

Replace the Title `<label>` block (the one with `t.fTitle` and `maxLength={TITLE_MAX}`) with a Suffix input + derived-title preview:

```tsx
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>{t.fSuffix}</span>
          <input
            type="text"
            value={titleSuffix}
            onChange={(e) => { setTitleSuffix(e.target.value); setMsg(null) }}
            placeholder={t.fSuffixPlaceholder}
            style={input}
          />
        </label>
        <p style={help}>{t.titlePreviewLabel}: <strong style={{ color: 'var(--text-primary)' }}>{derivedTitle || '—'}</strong></p>
```

Remove the now-unused `const TITLE_MAX = 120` line at the top **only if** nothing else references it; the meta route keeps its own copy. (MetaTab no longer needs it — the suffix input has no limit.)

- [ ] **Step 7: Add MetaTab i18n keys**

In `src/lib/i18n/dictionaries/dashboard.ts`, inside the **`id`** locale's `tabs.meta` object, add:

```ts
        fSuffix: 'Akhiran judul',
        fSuffixPlaceholder: 'mis. Undangan Pernikahan',
        titlePreviewLabel: 'Judul jadi',
```

Inside the **`en`** locale's `tabs.meta` object, add:

```ts
        fSuffix: 'Title suffix',
        fSuffixPlaceholder: 'e.g. Wedding Invitation',
        titlePreviewLabel: 'Title becomes',
```

- [ ] **Step 8: Type-check + manual verification**

Run: `npx tsc --noEmit`
Expected: PASS.
Manual: Meta tab now shows a "Akhiran judul" input (no name field, no counter) and a live "Judul jadi: Name1 & Name2 — <suffix>" preview that reflects the couple set in the Couple panel. Saving persists the suffix; the browser tab title and share preview reflect the composed title.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/MetaTab.tsx" "src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx" "src/app/api/invitation/[slug]/meta/route.ts" "src/app/api/invitation/[slug]/meta/__tests__/route.test.ts" src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(meta): edit title suffix; SEO title derives from couple"
```

---

### Task 9: Onboarding / seed / default config write `config.couple`

**Files:**
- Modify: `src/lib/onboarding/seed-config.ts`
- Modify: `src/all-templates/lovebirds/defaultConfig.js`
- Modify: `src/all-templates/solary/config/pageConfig.js`
- Test: `src/lib/onboarding/__tests__/seed-config.test.ts`

**Interfaces:**
- Consumes: existing `deriveNames` in `seed-config.ts` (bride/groom → coupleName).
- Produces: seeded configs carry `config.couple = { name1, name2 }`; SEO title derives from it.

- [ ] **Step 1: Update the seed-config test**

In `src/lib/onboarding/__tests__/seed-config.test.ts`, the existing assertion `expect(cfg.meta.title).toBe('Rani & Adi — Our Wedding')` (line ~62) must change to assert the new canonical shape. Replace it with:

```ts
    expect(cfg.couple).toEqual({ name1: 'Rani', name2: 'Adi' })
    expect(cfg.meta.titleSuffix).toBe('Our Wedding')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/onboarding/__tests__/seed-config.test.ts`
Expected: FAIL — `cfg.couple` undefined / `meta.titleSuffix` undefined.

- [ ] **Step 3: Seed `config.couple` + `meta.titleSuffix`**

In `src/lib/onboarding/seed-config.ts`, where it currently sets `meta` (around line 130, `title: \`${coupleName} — Our Wedding\``), change the seed to write the canonical couple + a suffix instead of a denormalized title. The `deriveNames(input)` result already exposes `bride`/`groom`-derived `coupleName`; capture the raw names too. Update the `deriveNames` destructure and the `meta` object:

```ts
  const { coupleName, monogram, hashtag, formattedDate } = deriveNames(input)
  // …existing code…
```

Set, alongside building the config object:

```ts
    couple: { name1: input.bride, name2: input.groom },
    meta: {
      titleSuffix: 'Our Wedding',
      // (no denormalized title — SEO title derives from couple + suffix at render)
    },
```

(Keep the rest of the seeded config — sections, hero props, etc. — unchanged. Per-section `coupleName`/`brideName`/`groomName` may stay seeded; the renderer ignores them while locked.)

- [ ] **Step 4: Add `couple` to the bundled default configs**

In `src/all-templates/lovebirds/defaultConfig.js`, add a top-level `couple` near `meta` (so the bundled demo also has it):

```js
  couple: { name1: 'Rani', name2: 'Adi' },
```

In `src/all-templates/solary/config/pageConfig.js`, add a top-level `couple` next to `meta` (line ~22):

```js
  couple: { name1: "Aruna", name2: "Daksa" },
```

- [ ] **Step 5: Run the seed test + type-check**

Run: `npm run test -- src/lib/onboarding/__tests__/seed-config.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/onboarding/seed-config.ts src/all-templates/lovebirds/defaultConfig.js src/all-templates/solary/config/pageConfig.js src/lib/onboarding/__tests__/seed-config.test.ts
git commit -m "feat(onboarding): seed config.couple + meta.titleSuffix"
```

---

### Task 10: Full regression pass

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `npm run test`
Expected: PASS — couple helper, reducer, meta route, seed-config tests all green; no other suite regressed. (If `seed-config.test.ts` had additional `meta.title` assertions beyond the one updated in Task 9, update them to the couple/suffix shape and re-run.)

- [ ] **Step 2: Token guardrail**

Run: `npm run check:tokens`
Expected: PASS (no off-scale literals; `LockedCoupleField.module.css` uses tokens only).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Cross-template manual verification**

Run `npm run dev`. For **both** a Solary and a Lovebirds invitation:
- Edit names once in the **Couple panel** → Save → confirm Hero, Footer, OpeningGate (Solary), navbar brand, browser tab title all update together.
- In a section editor, confirm the name fields are **locked** with the inherited value; verify hover hint (desktop) and persistent hint (touch emulation); unlock via the bilingual dialog → fields editable + Relink; Relink restores inheritance.
- Confirm the **Lovebirds** in-page nav (section pills) is unchanged.
- Open an **older** invitation (no `config.couple`): the Couple panel prefills from its existing names; sections still render (fallback, no injection) until the panel is saved; navbar falls back to the legacy `meta.title` parse.

- [ ] **Step 5: Commit (if any incidental fixes were needed)**

```bash
git add -A
git commit -m "test: regression pass for couple-name single source"
```

---

## Self-Review

**Spec coverage:**
- §1 `config.couple` data → Task 2 (state) + Task 9 (seed/defaults). ✓
- §2 helper `couple.ts` → Task 1. ✓
- §3 renderer injection (both templates) → Task 6 (+ pure `injectCoupleProps` tested in Task 1). ✓
- §4 Couple panel at top of editor → Task 4 (persisted via existing `/config` save — documented deviation from spec's separate route). ✓
- §5 locked-field mechanic: hover + persistent-on-touch hint + bilingual dialog + relink → Task 5. ✓
- §6 Meta tab shrinks to suffix/desc/image; derived title → Task 8. ✓
- §7 schema `linkedGroup` + override flag → Task 3 (marker) + Task 5 (flag use). ✓
- §8 onboarding/seed write `config.couple` → Task 9. ✓
- §9 backward-compat/migration: derive on load (Task 2), render fallback when couple empty (Task 1 `injectCoupleProps`), navbar/title fallback (Tasks 6-7). ✓
- Consumer checklist: helper, navbar, SEO, palette preview, MetaTab, schemas, i18n, onboarding — all assigned. ✓

**Placeholder scan:** No TBD/TODO; each code step shows full code. The `- [ ]` markers are task checkboxes, not placeholders.

**Type consistency:** `CoupleData`, `coupleDisplay`, `composeTitle`, `parseCoupleFromTitle`, `hasCouple`, `navName`, `injectCoupleProps`, `deriveCoupleFromConfig` defined in Task 1 are used with matching signatures in Tasks 2, 4, 5, 6, 7, 8. `UPDATE_COUPLE` / `updateCouple` / `coupleOverride` / `linkedGroup` consistent across Tasks 2, 3, 5. Dict keys `editor.couplePanel.*` / `editor.coupleLock.*` / `tabs.meta.fSuffix|titlePreviewLabel` added in Tasks 3 & 8 before use.

**Notes / risks:**
- `meta.title` is no longer stored as the source — derived in `generateMetadata` (Task 7) and navbar (`navName`, Task 6). Legacy stored titles remain a fallback, so old invitations are unaffected until their owner saves the Couple panel.
- The Couple panel persists through the **section** save surface (`/config`), so a couple edit makes the editor "dirty" and is saved by the normal Save button — atomic with `coupleOverride` flags. It does NOT use a sub-tab route. `couple` is intentionally absent from the `/config` route's `PRESERVE_KEYS`, which is what lets the editor own it.
- If `seed-full-config.mjs` (the demo seeder) also writes `meta.title`, it still works (legacy fallback); optionally align it with `config.couple` in a follow-up — out of scope here.
