# Lovebirds Editor Cleanup + Themed Dialogs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Curate lovebirds to a solary-style 10-section editor model, fold Gift Registry into Wedding Gift, drop the Guestbook + Countdown sections, prevent duplicate section types in the pickers, and replace native browser `confirm()`/`alert()` with themed dialogs.

**Architecture:** Extend the existing `templatePolicy` with a type-anchored lovebirds policy (max 10, hero/footer locked). A pure `migrateLovebirdsConfig()` folds registry→weddingGift and strips guestbook/countdown, run on both editor load and public render. A promise-based `DialogProvider` replaces native dialogs at the dashboard root.

**Tech Stack:** Next.js 14, React 18, CSS Modules, vitest (node env). UI verified via `npm run build` + manual browser; pure logic via vitest.

**Source spec:** `docs/superpowers/specs/2026-05-30-lovebirds-editor-dialogs-design.md`

**Conventions:** stage explicit paths only (`GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/..."`), never `git add -A`. Commit per task. Co-Author trailer on commits.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/editor/templatePolicy.ts` | modify | add lovebirds policy, `maxSections`, type-anchors, dedup helpers |
| `src/editor/__tests__/template-policy.test.ts` | modify | cover lovebirds policy + dedup |
| `src/all-templates/lovebirds/sections/Quote/Quote.jsx` | create | new quote section (reuses QuoteBlock) |
| `src/all-templates/lovebirds/sections/Quote/Quote.module.css` | create | quote section styling |
| `src/editor/schemas/quote.ts` | create | editor schema for quote |
| `src/editor/schemas/index.ts` | modify | lovebirds registry: +quote, −guestbook/−countdown/−registry |
| `src/all-templates/lovebirds/registry.js` | modify | renderer: +quote, −guestbook/−countdown/−registry |
| `src/editor/schemas/weddingGift.ts` | modify | + registry fields |
| `src/all-templates/lovebirds/sections/WeddingGift/WeddingGift.jsx` | modify | render registry block (Vite divergence) |
| `src/lib/config/migrate-lovebirds.ts` | create | pure config migration (fold registry, strip guestbook/countdown) |
| `src/lib/config/__tests__/migrate-lovebirds.test.ts` | create | migration unit tests |
| `src/all-templates/lovebirds/defaultConfig.js` | modify | curated 10-section default |
| `src/editor/EditorRoot.tsx` | modify | run migration before EditorProvider (lovebirds) |
| `src/app/[template]/[slug]/page.tsx` | modify | run migration on public render (lovebirds) |
| `src/editor/SectionList.tsx` | modify | maxSections, type-anchor drag/remove rules, dedup add |
| `src/editor/AddSectionMenu.tsx` | modify | dedup + maxSections + template registry |
| `src/editor/FieldEditor.tsx` | modify | change-type for lovebirds + dedup + anchored lock |
| `src/editor/SectionRow.tsx` | modify | use themed confirm |
| `src/components/dashboard/DialogProvider.tsx` | create | promise-based confirm/alert provider + themed modal |
| `src/components/dashboard/DialogProvider.module.css` | create | dialog styling (landing tokens) |
| `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` | modify | mount DialogProvider |
| `src/lib/i18n/dictionaries/dashboard.ts` | modify | dialog default labels (id+en) |
| dashboard tabs + `lib/csv.ts` + `editor/fields/ObjectArrayField.tsx` | modify | replace native confirm/alert |

---

## PHASE 1 — Template policy + dedup (pure logic, TDD)

### Task 1.1: Extend TemplatePolicy + add lovebirds policy

**Files:** Modify `src/editor/templatePolicy.ts`; Test `src/editor/__tests__/template-policy.test.ts`

- [ ] **Step 1: Write failing tests** — append to `template-policy.test.ts`:

```ts
import { getTemplatePolicy, availableAddTypes, availableSwapTypes } from '../templatePolicy'

describe('lovebirds policy', () => {
  const p = getTemplatePolicy('lovebirds')!
  it('exists, not fixed, max 10, hero/footer anchored+locked', () => {
    expect(p).not.toBeNull()
    expect(p.fixedSections).toBe(false)
    expect(p.maxSections).toBe(10)
    expect(p.anchorFirstType).toBe('hero')
    expect(p.anchorLastType).toBe('footer')
    expect(p.lockedTypes).toEqual(expect.arrayContaining(['hero', 'footer']))
  })
  it('pool excludes hero/footer/registry/guestbook/countdown, includes quote', () => {
    expect(p.swappablePool).toContain('quote')
    for (const t of ['hero', 'footer', 'registry', 'guestbook', 'countdown'])
      expect(p.swappablePool).not.toContain(t)
  })
})

describe('dedup helpers', () => {
  const reg = { hero: {}, quote: {}, rsvp: {}, weddingGift: {}, faq: {} } as any
  const p = getTemplatePolicy('lovebirds')!
  const sections = [{ id: 'a', type: 'hero' }, { id: 'b', type: 'rsvp' }]
  it('availableAddTypes omits used + non-pool + missing-from-registry', () => {
    const out = availableAddTypes(reg, sections, p)
    expect(out).toContain('quote')      // in pool, registry, unused
    expect(out).not.toContain('rsvp')   // used
    expect(out).not.toContain('hero')   // not in pool
  })
  it('availableSwapTypes keeps current type first, omits other-used', () => {
    const out = availableSwapTypes(reg, sections, p, 'b', 'rsvp')
    expect(out[0]).toBe('rsvp')         // current stays selectable
    expect(out).toContain('quote')
    expect(out).not.toContain('hero')   // hero is used by section a... actually hero not in pool
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/editor/__tests__/template-policy.test.ts` → fails (lovebirds null, helpers undefined).

- [ ] **Step 3: Implement** in `templatePolicy.ts`. Extend the interface and add the policy + helpers:

```ts
export interface TemplatePolicy {
  fixedSections: boolean
  locks: Record<string, SlotLock>
  swappablePool: string[]
  pinnedFirstId?: string
  pinnedLastId?: string
  maxSections?: number          // NEW — cap on section count (lovebirds: 10)
  anchorFirstType?: string      // NEW — type pinned to index 0 (lovebirds: 'hero')
  anchorLastType?: string       // NEW — type pinned to last index (lovebirds: 'footer')
  lockedTypes?: string[]        // NEW — types that can't be removed or type-changed
}

const LOVEBIRDS_POOL = [
  'quote', 'ourStory', 'eventDetails', 'brideGroom', 'weddingParty',
  'galleryMasonry', 'gallerySpringCoil', 'schedule', 'rsvp', 'weddingGift',
  'accommodations', 'faq', 'playlist',
]

const lovebirdsPolicy: TemplatePolicy = {
  fixedSections: false,
  locks: {},
  swappablePool: LOVEBIRDS_POOL,
  maxSections: 10,
  anchorFirstType: 'hero',
  anchorLastType: 'footer',
  lockedTypes: ['hero', 'footer'],
}

const policies: Record<string, TemplatePolicy> = { solary: solaryPolicy, lovebirds: lovebirdsPolicy }
```

Add helpers at the end of the file:

```ts
/** True for a type pinned to an end (lovebirds hero/footer). */
export function isTypeAnchored(type: string, policy: TemplatePolicy): boolean {
  return policy.anchorFirstType === type || policy.anchorLastType === type
}

/** True for a type that cannot be removed or type-changed. */
export function isTypeLockedFor(type: string, policy: TemplatePolicy): boolean {
  return !!policy.lockedTypes?.includes(type)
}

/** Types offerable in the "add section" menu: in-pool, registered, not already used. */
export function availableAddTypes(
  registry: Record<string, unknown>,
  sections: { type: string }[],
  policy: TemplatePolicy | null,
): string[] {
  const used = new Set(sections.map((s) => s.type))
  const pool = policy?.swappablePool ?? Object.keys(registry)
  return pool.filter((t) => !!registry[t] && !used.has(t))
}

/** Types offerable in the "change type" dropdown: current type first, then
 *  in-pool/registered types not used by any OTHER section. */
export function availableSwapTypes(
  registry: Record<string, unknown>,
  sections: { id: string; type: string }[],
  policy: TemplatePolicy | null,
  currentId: string,
  currentType: string,
): string[] {
  const usedElsewhere = new Set(sections.filter((s) => s.id !== currentId).map((s) => s.type))
  const pool = policy?.swappablePool ?? Object.keys(registry)
  const rest = pool.filter((t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t))
  return [currentType, ...rest]
}
```

- [ ] **Step 4: Run, expect PASS** — `npx vitest run src/editor/__tests__/template-policy.test.ts`.

- [ ] **Step 5: Commit** — `GIT_LITERAL_PATHSPECS=1 git add src/editor/templatePolicy.ts src/editor/__tests__/template-policy.test.ts` then commit `feat(editor): lovebirds template policy + dedup helpers`.

---

## PHASE 2 — Quote section (new)

### Task 2.1: Quote component + CSS

**Files:** Create `src/all-templates/lovebirds/sections/Quote/Quote.jsx`, `.../Quote.module.css`

- [ ] **Step 1: Create `Quote.jsx`** (reuses the existing `QuoteBlock` primitive):

```jsx
'use client'

import QuoteBlock from '../../blocks/QuoteBlock.jsx'
import styles from './Quote.module.css'

// New lovebirds section (no Vite-divergence concern — net-new file).
export default function Quote({ text, attribution }) {
  if (!text) return null
  return (
    <section className={styles.quote}>
      <div className={styles.inner}>
        <QuoteBlock text={text} attribution={attribution} />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `Quote.module.css`** (match lovebirds cream/serif look):

```css
.quote {
  background: var(--color-cream, #FDF6EC);
  padding: clamp(64px, 12vw, 140px) var(--container-pad, 24px);
}
.inner {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}
```

- [ ] **Step 3: Verify import path** — `QuoteBlock.jsx` lives at `src/all-templates/lovebirds/blocks/QuoteBlock.jsx`; from `sections/Quote/` the relative path is `../../blocks/QuoteBlock.jsx`. Confirm it exists.

- [ ] **Step 4: Commit** — add the two files, commit `feat(lovebirds): quote/verse section component`.

### Task 2.2: Quote editor schema + register

**Files:** Create `src/editor/schemas/quote.ts`; Modify `src/editor/schemas/index.ts`, `src/all-templates/lovebirds/registry.js`

- [ ] **Step 1: Create `quote.ts`**:

```ts
import type { SectionSchema } from './types'

export const quoteSchema: SectionSchema = {
  type: 'quote',
  label: { id: 'Kutipan / Ayat', en: 'Quote / Verse' },
  fields: [
    { key: 'text', label: { id: 'Teks kutipan', en: 'Quote text' }, type: 'textarea', rows: 4 },
    { key: 'attribution', label: { id: 'Sumber', en: 'Attribution' }, type: 'text', help: { id: 'mis. QS Ar-Rum: 21', en: 'e.g. QS Ar-Rum: 21' } },
  ],
  defaults: {
    text: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
    attribution: 'QS Ar-Rum: 21',
  },
}
```

- [ ] **Step 2: Register in renderer** — `src/all-templates/lovebirds/registry.js`: add `quote: lazy(() => import('./sections/Quote/Quote.jsx')),` and REMOVE the `countdown`, `registry`, `guestbook` lines (their data is migrated/stripped in Phase 4; SectionRenderer skips unknown types as a safety net — verify it returns null for missing types).

- [ ] **Step 3: Register in editor schema registry** — handled in Task 3.1 (lovebirds-specific registry). For now add `quote` import + entry to the shared `schemaRegistry` in `schemas/index.ts`:

```ts
import { quoteSchema } from './quote'
// in schemaRegistry object:
  quote: quoteSchema,
```

- [ ] **Step 4: Verify build** — `npm run build` succeeds.

- [ ] **Step 5: Commit** — add `quote.ts`, `schemas/index.ts`, `registry.js`; commit `feat(editor): register quote section (lovebirds)`.

---

## PHASE 3 — Lovebirds-specific registry (drop guestbook/countdown/registry)

### Task 3.1: Lovebirds editor registry excludes removed types

**Files:** Modify `src/editor/schemas/index.ts`

- [ ] **Step 1:** Replace the `registriesByTemplate.lovebirds = schemaRegistry` mapping with a curated lovebirds registry that omits `registry`, `guestbook`, `countdown`:

```ts
// Lovebirds: registry section folded into weddingGift (B); guestbook + countdown
// removed (C). Build its registry by excluding those types.
const LOVEBIRDS_EXCLUDED = new Set(['registry', 'guestbook', 'countdown'])
const lovebirdsSchemaRegistry: Record<string, SectionSchema> = Object.fromEntries(
  Object.entries(schemaRegistry).filter(([type]) => !LOVEBIRDS_EXCLUDED.has(type)),
)

const registriesByTemplate: Record<string, Record<string, SectionSchema>> = {
  lovebirds: lovebirdsSchemaRegistry,
  solary: solarySchemaRegistry,
}
```

- [ ] **Step 2:** `AddSectionMenu` currently imports the shared `schemaRegistry` directly — that's replaced in Phase 5 to use `getSchemaRegistry(template)`. No change here beyond the above.

- [ ] **Step 3: Verify build** — `npm run build`.

- [ ] **Step 4: Commit** — `feat(editor): lovebirds registry drops registry/guestbook/countdown`.

---

## PHASE 4 — Registry → Wedding Gift + config migration

### Task 4.1: Wedding Gift schema gains registry fields

**Files:** Modify `src/editor/schemas/weddingGift.ts`

- [ ] **Step 1:** Append these fields to `weddingGiftSchema.fields` (after `giftAddress`):

```ts
    { key: 'registryEnabled', label: { id: 'Tampilkan wishlist/registry', en: 'Show registry/wishlist' }, type: 'boolean' },
    { key: 'registryTitle', label: { id: 'Judul registry', en: 'Registry title' }, type: 'text' },
    { key: 'registryMessage', label: { id: 'Pesan registry', en: 'Registry message' }, type: 'textarea', rows: 2 },
    {
      key: 'platforms',
      label: { id: 'Platform wishlist', en: 'Registry platforms' },
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', description: '', url: '', accent: 'coral' },
      itemFields: [
        { key: 'name', label: { id: 'Nama', en: 'Name' }, type: 'text' },
        { key: 'description', label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 2 },
        { key: 'url', label: { id: 'URL', en: 'URL' }, type: 'text' },
        { key: 'accent', label: { id: 'Aksen', en: 'Accent' }, type: 'select', options: ACCENTS },
      ],
    },
```

Add `registryEnabled: false` to `weddingGiftSchema.defaults`.

- [ ] **Step 2: Verify build** — `npm run build`.
- [ ] **Step 3: Commit** — `feat(editor): wedding gift gains registry/wishlist fields`.

### Task 4.2: Migration function (pure, TDD)

**Files:** Create `src/lib/config/migrate-lovebirds.ts`, `src/lib/config/__tests__/migrate-lovebirds.test.ts`

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, it, expect } from 'vitest'
import { migrateLovebirdsConfig } from '../migrate-lovebirds'

describe('migrateLovebirdsConfig', () => {
  it('strips guestbook + countdown sections', () => {
    const cfg = { sections: [{ id: 'h', type: 'hero' }, { id: 'c', type: 'countdown' }, { id: 'g', type: 'guestbook' }, { id: 'f', type: 'footer' }] }
    const out = migrateLovebirdsConfig(cfg)
    expect(out.sections.map((s: any) => s.type)).toEqual(['hero', 'footer'])
  })
  it('folds a registry section into weddingGift and drops it', () => {
    const cfg = { sections: [
      { id: 'wg', type: 'weddingGift', props: { title: 'Gift' } },
      { id: 'r', type: 'registry', props: { title: 'Registry', message: 'Msg', platforms: [{ id: 'p1', name: 'X' }] } },
    ] }
    const out = migrateLovebirdsConfig(cfg)
    expect(out.sections.map((s: any) => s.type)).toEqual(['weddingGift'])
    const wg: any = out.sections[0]
    expect(wg.props.registryEnabled).toBe(true)
    expect(wg.props.registryTitle).toBe('Registry')
    expect(wg.props.platforms).toEqual([{ id: 'p1', name: 'X' }])
    expect(wg.props.title).toBe('Gift') // original preserved
  })
  it('does not mutate the input', () => {
    const cfg = { sections: [{ id: 'c', type: 'countdown' }] }
    const snap = JSON.parse(JSON.stringify(cfg))
    migrateLovebirdsConfig(cfg)
    expect(cfg).toEqual(snap)
  })
  it('is idempotent + null-safe', () => {
    expect(migrateLovebirdsConfig(null)).toBeNull()
    const cfg = { sections: [{ id: 'h', type: 'hero' }] }
    expect(migrateLovebirdsConfig(migrateLovebirdsConfig(cfg))).toEqual(migrateLovebirdsConfig(cfg))
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/lib/config/__tests__/migrate-lovebirds.test.ts`.

- [ ] **Step 3: Implement `migrate-lovebirds.ts`** (pure, no mutation):

```ts
/** Types removed from lovebirds — stripped from any config on load/render. */
const DROP_TYPES = new Set(['guestbook', 'countdown'])

interface Section { id: string; type: string; props?: Record<string, any>; [k: string]: any }
interface Config { sections?: Section[]; [k: string]: any }

/**
 * Migrate a lovebirds config to the new model:
 *  - drop `guestbook` + `countdown` sections (removed from lovebirds)
 *  - fold a standalone `registry` section's data into the `weddingGift`
 *    section (registryEnabled/Title/Message/platforms) and drop it.
 * Pure + idempotent + null-safe. Safe to run on every load/render.
 */
export function migrateLovebirdsConfig<T extends Config | null | undefined>(config: T): T {
  if (!config || !Array.isArray(config.sections)) return config
  let registrySection: Section | null = null
  const kept: Section[] = []
  for (const s of config.sections) {
    if (!s) continue
    if (s.type === 'registry') { registrySection = s; continue }
    if (DROP_TYPES.has(s.type)) continue
    kept.push({ ...s })
  }
  if (registrySection) {
    const wg = kept.find((s) => s.type === 'weddingGift')
    if (wg) {
      const r = registrySection.props || {}
      wg.props = {
        ...(wg.props || {}),
        registryEnabled: true,
        registryTitle: r.title ?? wg.props?.registryTitle,
        registryMessage: r.message ?? wg.props?.registryMessage,
        platforms: r.platforms ?? wg.props?.platforms,
      }
    }
    // If no weddingGift section exists, the registry data is intentionally dropped.
  }
  return { ...config, sections: kept } as T
}
```

- [ ] **Step 4: Run, expect PASS**.
- [ ] **Step 5: Commit** — add both files; `feat(config): lovebirds migration (fold registry, strip guestbook/countdown)`.

### Task 4.3: Render the registry block in WeddingGift.jsx (Vite divergence)

**Files:** Modify `src/all-templates/lovebirds/sections/WeddingGift/WeddingGift.jsx`

- [ ] **Step 1:** Read the current `WeddingGift.jsx`. Add a header comment marking the deliberate divergence, then render a registry block after the accounts area, guarded by `registryEnabled`:

```jsx
{registryEnabled && Array.isArray(platforms) && platforms.length > 0 && (
  <div className={styles.registry}>
    {registryTitle && <h3 className={styles.registryTitle}>{registryTitle}</h3>}
    {registryMessage && <p className={styles.registryMessage}>{registryMessage}</p>}
    <div className={styles.registryGrid}>
      {platforms.map((p) => (
        <a key={p.id || p.name} className={styles.registryCard} href={p.url || '#'} target="_blank" rel="noopener noreferrer">
          <span className={styles.registryName}>{p.name}</span>
          {p.description && <span className={styles.registryDesc}>{p.description}</span>}
        </a>
      ))}
    </div>
  </div>
)}
```

Destructure `registryEnabled, registryTitle, registryMessage, platforms` from props at the top of the component. Add matching `.registry*` classes to `WeddingGift.module.css` (cream cards, coral accents — match existing styles in that file).

- [ ] **Step 2:** Add a one-line note to the repo `CLAUDE.md` (wedding-saas-next) under "Conventions": `WeddingGift.jsx intentionally diverges from the Vite source (renders the folded Gift Registry).`

- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `feat(lovebirds): render folded gift registry in Wedding Gift`.

### Task 4.4: Run migration on load + render

**Files:** Modify `src/editor/EditorRoot.tsx`, `src/app/[template]/[slug]/page.tsx`

- [ ] **Step 1: EditorRoot** — it receives `template` + `initialConfig`. Before passing to `EditorProvider`, migrate when lovebirds:

```ts
import { migrateLovebirdsConfig } from '@/lib/config/migrate-lovebirds'
// ...
const cfg = template === 'lovebirds' ? migrateLovebirdsConfig(initialConfig) : initialConfig
// pass cfg as initialConfig to <EditorProvider>
```

- [ ] **Step 2: Public page** — in `src/app/[template]/[slug]/page.tsx`, after `config = decryptConfig(config)` and before `<InvitationView>`, add:

```ts
if (templateId === 'lovebirds') config = migrateLovebirdsConfig(config)
```

(import `migrateLovebirdsConfig`). This ensures unsaved old configs don't render dropped sections and show the folded registry.

- [ ] **Step 3: Verify build** — `npm run build`.
- [ ] **Step 4: Commit** — `feat(config): apply lovebirds migration on editor load + public render`.

---

## PHASE 5 — Curated 10 default + policy enforcement wiring

### Task 5.1: Curated 10-section default config

**Files:** Modify `src/all-templates/lovebirds/defaultConfig.js`

- [ ] **Step 1:** Reduce the default `sections` array to exactly these 10, in order: `hero`, `quote`, `ourStory`, `eventDetails`, `brideGroom`, `galleryMasonry`, `schedule`, `rsvp`, `weddingGift`, `footer`. Remove `countdown`, `weddingParty`, `gallerySpringCoil`, `registry`, `accommodations`, `faq`, `guestbook`, `playlist` from the default. Insert a `quote` section at index 1 using the schema defaults (text + attribution). Keep all other sections' existing props intact.

- [ ] **Step 2: Verify** — `npm run build`; load `/lovebirds/demo-lovebirds` (Task 7) shows 10 sections, quote at position 2.
- [ ] **Step 3: Commit** — `feat(lovebirds): curated 10-section default config`.

### Task 5.2: AddSectionMenu — dedup + maxSections + template registry

**Files:** Modify `src/editor/AddSectionMenu.tsx`

- [ ] **Step 1:** Change the menu to read the current sections + policy via `useEditor()` and compute available types. Replace `Object.entries(schemaRegistry)` with `availableAddTypes(getSchemaRegistry(template), config.sections, policy)`. Pass `template` as a prop from `SectionList`. Hide the whole add button when `config.sections.length >= (policy?.maxSections ?? Infinity)`. When the available list is empty, render a disabled "Semua section sudah dipakai" note.

```tsx
const { config } = useEditor()
const policy = getTemplatePolicy(template)
const registry = getSchemaRegistry(template)
const atMax = !!policy?.maxSections && config.sections.length >= policy.maxSections
const types = availableAddTypes(registry, config.sections, policy)
if (atMax) return null
// render only `types` (map type → registry[type].label)
```

- [ ] **Step 2: Verify build**.
- [ ] **Step 3: Commit** — `feat(editor): add-section menu dedups + respects maxSections`.

### Task 5.3: SectionList — anchor locks + reorder rules

**Files:** Modify `src/editor/SectionList.tsx`, `src/editor/SectionRow.tsx`

- [ ] **Step 1:** In `SectionList`, compute per-row lock state from the type-anchored lovebirds policy (in addition to solary's id-based locks):

```tsx
const typeAnchored = policy ? isTypeAnchored(s.type, policy) : false
const typeLocked = policy ? isTypeLockedFor(s.type, policy) : false
// draggable when NOT position-locked (solary) AND NOT type-anchored (lovebirds)
draggable={!posLocked && !typeAnchored}
canRemove={!policy?.fixedSections && !typeLocked}
```

- [ ] **Step 2:** In `onDragEnd`, for a policy with `anchorFirstType`/`anchorLastType` (lovebirds), clamp the drop so anchors stay at the ends:

```tsx
if (policy?.anchorFirstType || policy?.anchorLastType) {
  const order = config.sections
  const from = order.findIndex((s) => s.id === active.id)
  let to = order.findIndex((s) => s.id === over.id)
  const firstFree = order.findIndex((s) => !isTypeAnchored(s.type, policy))
  const lastFree = order.length - 1 - [...order].reverse().findIndex((s) => !isTypeAnchored(s.type, policy))
  to = Math.max(firstFree, Math.min(lastFree, to))
  if (from >= 0 && to >= 0 && from !== to) reorderSections(from, to)
  return
}
```

Keep the existing solary `computeSafeOrder` branch and the default branch.

- [ ] **Step 3:** Pass `template` to `AddSectionMenu` (`<AddSectionMenu template={template} onAdd={...} />`) and render it when `!policy?.fixedSections` (lovebirds qualifies). The internal `atMax` check (Task 5.2) hides it at 10.

- [ ] **Step 4: Verify build**.
- [ ] **Step 5: Commit** — `feat(editor): lovebirds anchor locks + bounded reorder`.

### Task 5.4: FieldEditor — change-type for lovebirds + dedup

**Files:** Modify `src/editor/FieldEditor.tsx`

- [ ] **Step 1:** Replace `swapOptions` computation so it works for lovebirds (policy exists, type not anchored/locked) and dedups via `availableSwapTypes`:

```tsx
const anchored = policy ? isTypeAnchored(selectedSection.type, policy) : false
const typeLocked = policy ? (isTypeLockedFor(selectedSection.type, policy) || isTypeLocked(selectedSection.id, policy)) : false
const swapOptions = policy && !typeLocked && !anchored
  ? availableSwapTypes(registry, config.sections, policy, selectedSection.id, selectedSection.type)
  : []
```

Pull `config` from `useEditor()`. The `<select>` renders `swapOptions` (first entry is the current type). Keep the `changeTypeConfirm` gate (it becomes a themed dialog in Phase 6).

- [ ] **Step 2: Verify build**.
- [ ] **Step 3: Commit** — `feat(editor): change-type dropdown for lovebirds + dedup`.

---

## PHASE 6 — Themed confirm/alert dialogs

### Task 6.1: DialogProvider + themed modal

**Files:** Create `src/components/dashboard/DialogProvider.tsx`, `.../DialogProvider.module.css`

- [ ] **Step 1: Create `DialogProvider.tsx`**:

```tsx
'use client'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import styles from './DialogProvider.module.css'

interface ConfirmOpts { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; tone?: 'default' | 'danger' }
interface AlertOpts { title?: string; message: string; okLabel?: string }
interface DialogState { kind: 'confirm' | 'alert'; opts: ConfirmOpts & AlertOpts; resolve: (v: boolean) => void }

interface Ctx { confirm: (o: ConfirmOpts) => Promise<boolean>; alert: (o: AlertOpts) => Promise<void> }
const DialogCtx = createContext<Ctx | null>(null)

export function useConfirm() { return useDialog().confirm }
export function useAlert() { return useDialog().alert }
function useDialog(): Ctx { const c = useContext(DialogCtx); if (!c) throw new Error('useDialog outside DialogProvider'); return c }

export function DialogProvider({ children, labels }: { children: ReactNode; labels: { confirm: string; cancel: string; ok: string } }) {
  const [state, setState] = useState<DialogState | null>(null)
  const resolveRef = useRef<(v: boolean) => void>()

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => {
    resolveRef.current = resolve
    setState({ kind: 'confirm', opts, resolve })
  }), [])
  const alert = useCallback((opts: AlertOpts) => new Promise<void>((resolve) => {
    resolveRef.current = () => resolve()
    setState({ kind: 'alert', opts, resolve: () => resolve() })
  }), [])

  function close(result: boolean) { state?.resolve(result); setState(null) }

  return (
    <DialogCtx.Provider value={{ confirm, alert }}>
      {children}
      {state && (
        <div className={styles.scrim} role="dialog" aria-modal="true" onClick={() => close(false)}>
          <div className={styles.card} onClick={(e) => e.stopPropagation()}>
            {state.opts.title && <h2 className={styles.title}>{state.opts.title}</h2>}
            <p className={styles.message}>{state.opts.message}</p>
            <div className={styles.actions}>
              {state.kind === 'confirm' && (
                <button className={styles.cancel} onClick={() => close(false)}>{state.opts.cancelLabel || labels.cancel}</button>
              )}
              <button
                className={state.opts.tone === 'danger' ? styles.danger : styles.primary}
                onClick={() => close(true)}
              >
                {state.kind === 'alert' ? (state.opts.okLabel || labels.ok) : (state.opts.confirmLabel || labels.confirm)}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  )
}
```

- [ ] **Step 2: Create `DialogProvider.module.css`** using landing tokens:

```css
.scrim { position: fixed; inset: 0; z-index: 4000; background: rgba(42,33,24,0.45); display: grid; place-items: center; padding: 20px; }
.card { width: min(420px, 100%); background: var(--color-cream, #FDF6EC); border-radius: 20px; padding: 28px 26px 22px; box-shadow: 0 30px 80px rgba(42,33,24,0.32); }
.title { margin: 0 0 10px; font-family: var(--font-display, 'Cormorant Garamond', serif); font-style: italic; font-size: 26px; color: var(--color-charcoal, #2A2118); }
.message { margin: 0 0 22px; font-family: var(--font-body, 'DM Sans', sans-serif); font-size: 15px; line-height: 1.55; color: rgba(42,33,24,0.75); }
.actions { display: flex; gap: 10px; justify-content: flex-end; }
.actions button { font-family: var(--font-body, sans-serif); font-size: 13px; font-weight: 600; padding: 11px 22px; border-radius: 999px; cursor: pointer; border: none; }
.cancel { background: transparent; border: 1px solid rgba(42,33,24,0.2); color: var(--color-charcoal, #2A2118); }
.primary { background: var(--color-coral, #E8553E); color: #fff; }
.danger { background: #C43F2A; color: #fff; }
```

- [ ] **Step 3: Verify** that `src/styles/tokens.css` is loaded globally (root layout) so `--color-*`/`--font-*` resolve in the dashboard; the CSS includes literal fallbacks regardless.

- [ ] **Step 4: Commit** — `feat(dashboard): themed confirm/alert DialogProvider`.

### Task 6.2: i18n dialog labels + mount provider

**Files:** Modify `src/lib/i18n/dictionaries/dashboard.ts`, `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`

- [ ] **Step 1:** Add to BOTH `id` and `en` `chrome` blocks a `dialog` object:
  - id: `dialog: { confirm: 'Ya', cancel: 'Batal', ok: 'OK' }`
  - en: `dialog: { confirm: 'Yes', cancel: 'Cancel', ok: 'OK' }`
  (dict-parity test enforces both.)

- [ ] **Step 2:** In `DashboardClient.tsx`, wrap the existing content with `<DialogProvider labels={dict.chrome.dialog}>` (inside `DashboardI18nProvider`, around the `<main>`).

- [ ] **Step 3: Verify** — `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts` passes; `npm run build`.
- [ ] **Step 4: Commit** — `feat(dashboard): mount DialogProvider + dialog i18n`.

### Task 6.3: Replace native confirm/alert (14 sites)

**Files:** Modify the 10 files below.

Pattern — replace `if (confirm(MSG)) { doThing() }` with:
```tsx
const confirm = useConfirm()
// ...
if (await confirm({ message: MSG, tone: 'danger' })) { doThing() }
```
and `alert(MSG)` with `const showAlert = useAlert(); await showAlert({ message: MSG })`. Make the enclosing handler `async`. Use `tone: 'danger'` for delete/remove/reset/clear confirmations.

- [ ] **Step 1:** Replace, file by file:

| File | Sites | Tone |
|---|---|---|
| `src/editor/SectionRow.tsx:137` | remove section confirm | danger |
| `src/editor/FieldEditor.tsx:53,77` | remove (danger) + change-type (default) | mixed |
| `src/editor/fields/ObjectArrayField.tsx:41` | remove item confirm | danger |
| `src/app/[template]/[slug]/dashboard/GuestsTab.tsx:361` | delete guest confirm | danger |
| `src/app/[template]/[slug]/dashboard/NotesTab.tsx:49,57,63` | delete confirm + 2 alerts | danger/— |
| `src/app/[template]/[slug]/dashboard/MusicTab.tsx:98` | clear confirm | danger |
| `src/app/[template]/[slug]/dashboard/BackgroundTab.tsx:150` | reset confirm | danger |
| `src/app/[template]/[slug]/dashboard/GuestbookTab.tsx:62,67,72` | delete confirm + 2 alerts | danger/— |

For `editor/*` files (SectionRow, FieldEditor, ObjectArrayField): these render inside the dashboard tree, so `useConfirm()/useAlert()` work. Convert the inline handlers to async.

- [ ] **Step 2:** `src/app/[template]/[slug]/dashboard/lib/csv.ts:7` — `downloadCsv` is a plain function (no hooks). Change it to return `false` when there's nothing to export instead of calling `alert`; update both callers (`RsvpsTab`, `GiftsTab`) to `if (!downloadCsv(...)) await showAlert({ message: t.nothingToExport })`. Add `nothingToExport` to the dashboard dict (id+en).

- [ ] **Step 3: Verify** — `npm run build`; manual browser check each flow (delete section, change type, remove array item, delete guest/note/attendance, clear music, reset background, empty CSV) shows the themed dialog and behaves as before.

- [ ] **Step 4: Commit** — `feat(dashboard): replace native confirm/alert with themed dialog`.

---

## PHASE 7 — Verify

### Task 7.1: Full verification

- [ ] **Step 1:** `npx tsc --noEmit` → clean.
- [ ] **Step 2:** `npx vitest run` → all green (incl. new policy/migration tests + dict-parity).
- [ ] **Step 3:** `npm run build` → green.
- [ ] **Step 4: Manual** — run `node scripts/seed-dummy.mjs --template=lovebirds` (or `npm run dev`), open `/lovebirds/<slug>/dashboard` editor:
  - 10 sections; hero/footer not draggable/removable; middle slots reorder + change-type.
  - Add menu hidden at 10; after removing one, add menu shows only unused types.
  - Wedding Gift has registry fields; public page renders the registry block.
  - No guestbook/countdown/registry options anywhere; quote section editable + renders.
  - All confirms/alerts are themed.
- [ ] **Step 5:** Final commit if any fixups: `chore: lovebirds editor cleanup + dialogs verification`.

---

## Self-Review notes

- **Spec coverage:** A→Phases 1,3,5; A.1 quote→Phase 2; B→Phase 4; C→Phases 2(registry.js),3,4; D→Phase 1 helpers + Phase 5.2/5.4; E→Phase 6. All covered.
- **Types:** `availableAddTypes`/`availableSwapTypes`/`isTypeAnchored`/`isTypeLockedFor`/`migrateLovebirdsConfig` are defined once (Phase 1/4) and used consistently in Phase 5/6.
- **Risk:** Phase 4.3 (WeddingGift.jsx) + Phase 5.1 (defaultConfig) touch lovebirds template files — deliberate, documented divergence. SectionRenderer must skip unknown types (verify in Task 3.1).
