# Solary Editable Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Solary template fully editable from the dashboard (like Lovebirds), honoring its fixed 9-slot solar-system structure — with per-slot type swapping, locked Intro/Saturn/Sun, 4 new optional sections, and palette control moved into the dashboard.

**Architecture:** The editor becomes template-aware via `getSchemaRegistry(template)`. A declarative `templatePolicy` describes which slots are locked/swappable/reorderable. Solary section types get typed editor schemas. Four new prop-driven planet components join the registry and the swap pool. Palette moves to a dashboard tab writing `config.theme.defaultPalette`; the live invite locks to it while the homepage demo keeps the floating switcher.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, vitest (node env), CSS Modules + CSS variables, @dnd-kit, Supabase (config JSONB).

---

## Conventions for this plan

- Run tests with: `npm test` (alias for `vitest run`). Tests live in `src/**/__tests__/*.test.ts` (node environment — no DOM).
- TDD is used for **pure-logic modules** (schema registry, template policy, reorder math, reducer actions). React components, schemas (declarative data), and UI wiring are **build-then-verify** (typecheck + `npm run build` + manual browser check), because vitest here is node-only (no jsdom).
- Solary section components are `.jsx` and follow the existing `DetailsPlanet.jsx` pattern: `<div className="section-stage"><GlassCard title={sectionLabel} planetName={planetName}>…</GlassCard></div>`.
- Never expose `planetKey` / `planetName` / `sectionLabel` as editable fields — they are slot identity / scene wiring.
- Lovebirds must stay behaviorally identical. Verify with the regression checks in Phase 1 & 5.
- Git staging: stage explicit paths only (no `git add -A`).

## File Structure (what gets created/modified)

**Editor core**
- `src/editor/schemas/index.ts` — MODIFY: add `getSchemaRegistry(template)`.
- `src/editor/schemas/solary/*.ts` — CREATE: 14 schemas + `index.ts` barrel.
- `src/editor/schemas/types.ts` — MODIFY: add `stringArray` field type.
- `src/editor/fields/StringArrayField.tsx` — CREATE.
- `src/editor/fields/ObjectArrayField.tsx` — MODIFY: render nested `imageArray`/`objectArray`/`stringArray`.
- `src/editor/FieldEditor.tsx` — MODIFY: `getSchemaRegistry(template)`, render `stringArray`, swap-type header.
- `src/editor/templatePolicy.ts` — CREATE: per-template slot policy + reorder math.
- `src/editor/EditorProvider.tsx` — MODIFY: `CHANGE_SECTION_TYPE`, `REORDER_SECTIONS_BY_ID`.
- `src/editor/SectionList.tsx` — MODIFY: policy-driven locks, hide Add, constrained DnD.
- `src/editor/SectionRow.tsx` — MODIFY: optional locked rendering (no drag handle / no remove).
- `src/editor/AddSectionMenu.tsx` — MODIFY: hidden when `fixedSections`.
- `src/editor/EditorRoot.tsx` — MODIFY: pass `template` to `FieldEditor`.

**New Solary sections**
- `src/all-templates/solary/sections/{QuotePlanet,SchedulePlanet,LiveStreamPlanet,FaqPlanet}.jsx` — CREATE.
- `src/all-templates/solary/config/sectionRegistry.js` — MODIFY: register 4 new types.

**Palette**
- `src/app/[template]/[slug]/dashboard/PaletteTab.tsx` — CREATE.
- `src/app/api/invitation/[slug]/theme/route.ts` — CREATE.
- `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` — MODIFY: conditional Palette tab.
- `src/all-templates/solary/Shell.jsx` — MODIFY: accept/forward `isDemo`; conditional `<PaletteSwitcher/>`.
- `src/all-templates/solary/contexts/ThemeContext.jsx` — MODIFY: `allowGuestSwitch` prop.
- `src/app/[template]/[slug]/InvitationView.tsx` — MODIFY: thread `isDemo`.
- `src/app/[template]/[slug]/page.tsx` — MODIFY: pass `isDemo={isDemoSlug}`.

**i18n**
- `src/lib/i18n/dictionaries/dashboard.ts` — MODIFY: add `chrome.tabs.palette`, `editor.*` swap keys, `tabs.palette` (id + en).

---

# PHASE 0 — Editor field-type enhancements

Foundation for editing Solary's arrays (string lists + nested arrays).

### Task 1: Add `stringArray` field type

**Files:**
- Modify: `src/editor/schemas/types.ts`
- Create: `src/editor/fields/StringArrayField.tsx`

- [ ] **Step 1: Add the type to the FieldDef union**

In `src/editor/schemas/types.ts`, add `'stringArray'` to `FieldType`:

```ts
export type FieldType =
  | 'text'
  | 'textarea'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'image'
  | 'imageArray'
  | 'objectArray'
  | 'audio'
  | 'stringArray'
```

Add the interface and include it in `FieldDef`:

```ts
export interface StringArrayField extends BaseField {
  type: 'stringArray'
  /** Placeholder for each new string row (default ''). */
  itemPlaceholder?: string
}

export type FieldDef =
  | TextField
  | TextareaField
  | DatetimeField
  | BooleanField
  | SelectField
  | ImageField
  | ImageArrayField
  | ObjectArrayField
  | AudioField
  | StringArrayField
```

- [ ] **Step 2: Create the StringArrayField component**

Create `src/editor/fields/StringArrayField.tsx`:

```tsx
'use client'

interface Props {
  label: string
  value: string[]
  onChange: (next: string[]) => void
  help?: string
  itemPlaceholder?: string
}

export default function StringArrayField({ label, value, onChange, help, itemPlaceholder }: Props) {
  const items = Array.isArray(value) ? value : []

  function update(i: number, v: string) {
    const next = items.slice()
    next[i] = v
    onChange(next)
  }
  function add() { onChange([...items, '']) }
  function remove(i: number) {
    const next = items.slice()
    next.splice(i, 1)
    onChange(next)
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={lbl}>{label}</span>
        <button type="button" style={btn} onClick={add}>+ Add</button>
      </div>
      <div style={list}>
        {items.map((s, i) => (
          <div key={i} style={row}>
            <input
              style={input}
              value={s}
              placeholder={itemPlaceholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button type="button" style={iconBtn} onClick={() => remove(i)}>×</button>
          </div>
        ))}
        {items.length === 0 && <div style={empty}>No items yet — click + Add.</div>}
      </div>
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 10 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)', flex: 1 }
const btn: React.CSSProperties = { padding: '6px 12px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const list: React.CSSProperties = { display: 'grid', gap: 8 }
const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
const input: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.18)', fontSize: 14, background: '#fff', color: '#2A2118' }
const iconBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 6, background: 'transparent', border: '1px solid rgba(42,33,24,0.15)', cursor: 'pointer', fontSize: 14 }
const empty: React.CSSProperties = { padding: 14, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed rgba(42,33,24,0.2)', borderRadius: 10 }
const hlp: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no new errors from these files.

- [ ] **Step 4: Commit**

```bash
git add src/editor/schemas/types.ts src/editor/fields/StringArrayField.tsx
git commit -m "feat(editor): add stringArray field type + StringArrayField"
```

---

### Task 2: Render `stringArray` in FieldEditor; extend ObjectArrayField for nested arrays

**Files:**
- Modify: `src/editor/FieldEditor.tsx`
- Modify: `src/editor/fields/ObjectArrayField.tsx`

- [ ] **Step 1: Render stringArray in FieldEditor**

In `src/editor/FieldEditor.tsx`, add the import:

```tsx
import StringArrayField from './fields/StringArrayField'
```

In `renderField`'s switch, add before the `objectArray` case:

```tsx
    case 'stringArray': return <StringArrayField key={f.key} label={label} value={Array.isArray(value) ? value : []} itemPlaceholder={f.itemPlaceholder} onChange={(v) => onChange(v)} help={help} />
```

- [ ] **Step 2: Extend ObjectArrayField to render nested imageArray / objectArray / stringArray**

In `src/editor/fields/ObjectArrayField.tsx`, add imports at the top:

```tsx
import ImageArrayField from './ImageArrayField'
import StringArrayField from './StringArrayField'
```

In the row-field `switch (f.type)` block, replace the `default:` branch with these cases plus the fallback:

```tsx
                      case 'imageArray':  return <ImageArrayField key={f.key} label={fLabel} value={Array.isArray(v) ? v : []} slug={slug} onChange={onChange} help={fHelp} />
                      case 'stringArray': return <StringArrayField key={f.key} label={fLabel} value={Array.isArray(v) ? v : []} itemPlaceholder={f.itemPlaceholder} onChange={onChange} help={fHelp} />
                      case 'objectArray': return <ObjectArrayField key={f.key} label={fLabel} value={Array.isArray(v) ? v : []} itemFields={f.itemFields} newItem={f.newItem} itemLabelKey={f.itemLabelKey} slug={slug} lang={lang} onChange={onChange} />
                      default:
                        return <div key={f.key} style={{ fontSize: 12, color: '#E8553E' }}>{t.unsupportedField} {f.type}</div>
```

Note: `ObjectArrayField` references itself recursively — this is valid because the function is in scope within its own module.

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/editor/FieldEditor.tsx src/editor/fields/ObjectArrayField.tsx
git commit -m "feat(editor): render stringArray + nested arrays inside ObjectArrayField"
```

---

# PHASE 1 — Template-aware schemas + Solary editing of existing 10 types

After this phase, opening a Solary invite's editor shows real fields for every default section (no "unknown section"). Lovebirds unchanged.

### Task 3: `getSchemaRegistry(template)` (TDD)

**Files:**
- Modify: `src/editor/schemas/index.ts`
- Create: `src/editor/schemas/solary/index.ts` (temporary empty registry for the test, filled in Task 4)
- Test: `src/editor/__tests__/schema-registry.test.ts`

- [ ] **Step 1: Create a minimal solary barrel so the import resolves**

Create `src/editor/schemas/solary/index.ts`:

```ts
import type { SectionSchema } from '../types'

// Filled in Task 4. Keeping the barrel here lets getSchemaRegistry resolve.
export const solarySchemaRegistry: Record<string, SectionSchema> = {}
```

- [ ] **Step 2: Write the failing test**

Create `src/editor/__tests__/schema-registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getSchemaRegistry, schemaRegistry } from '../schemas'
import { solarySchemaRegistry } from '../schemas/solary'

describe('getSchemaRegistry', () => {
  it('returns the lovebirds registry by default', () => {
    expect(getSchemaRegistry('lovebirds')).toBe(schemaRegistry)
  })
  it('returns the lovebirds registry for unknown templates', () => {
    expect(getSchemaRegistry('does-not-exist')).toBe(schemaRegistry)
  })
  it('returns the solary registry for solary', () => {
    expect(getSchemaRegistry('solary')).toBe(solarySchemaRegistry)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- schema-registry`
Expected: FAIL — `getSchemaRegistry is not a function`.

- [ ] **Step 4: Implement getSchemaRegistry**

In `src/editor/schemas/index.ts`, append after the existing `schemaRegistry` export:

```ts
import { solarySchemaRegistry } from './solary'

const registriesByTemplate: Record<string, Record<string, SectionSchema>> = {
  lovebirds: schemaRegistry,
  solary: solarySchemaRegistry,
}

export function getSchemaRegistry(template: string): Record<string, SectionSchema> {
  return registriesByTemplate[template] ?? schemaRegistry
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- schema-registry`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/editor/schemas/index.ts src/editor/schemas/solary/index.ts src/editor/__tests__/schema-registry.test.ts
git commit -m "feat(editor): template-scoped schema registry via getSchemaRegistry"
```

---

### Task 4: Solary schemas for the 10 existing section types

**Files:**
- Create: `src/editor/schemas/solary/{openingGate,welcomePlanet,storyPlanet,saturnRing,countdownPlanet,detailsPlanet,rsvpPlanet,teamPlanet,giftPlanet,footerPlanet}.ts`
- Modify: `src/editor/schemas/solary/index.ts`

Field choices below match the prop shapes consumed by the section components and `config/pageConfig.js`. Swappable types (welcome, story, countdown, details, rsvp, team, gift) include a `defaults` block; locked types (openingGate, saturnRing, footerPlanet) omit it.

- [ ] **Step 1: openingGate.ts**

```ts
import type { SectionSchema } from '../types'

export const openingGateSchema: SectionSchema = {
  type: 'openingGate',
  label: { id: 'Gerbang Pembuka', en: 'Opening Gate' },
  fields: [
    { key: 'eyebrow',    label: { id: 'Teks kecil atas', en: 'Eyebrow' }, type: 'text' },
    { key: 'coupleName', label: { id: 'Nama pasangan', en: 'Couple name' }, type: 'text' },
    { key: 'tagline',    label: { id: 'Tagline', en: 'Tagline' }, type: 'textarea', rows: 3 },
    { key: 'ctaLabel',   label: { id: 'Teks tombol', en: 'Button label' }, type: 'text' },
  ],
}
```

- [ ] **Step 2: welcomePlanet.ts**

```ts
import type { SectionSchema } from '../types'

export const welcomePlanetSchema: SectionSchema = {
  type: 'welcomePlanet',
  label: { id: 'Sambutan (Neptune)', en: 'Welcome (Neptune)' },
  fields: [
    { key: 'heading',         label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'body',            label: { id: 'Isi', en: 'Body' }, type: 'textarea', rows: 4 },
    { key: 'portrait',        label: { id: 'Foto potret', en: 'Portrait' }, type: 'image' },
    { key: 'portraitCaption', label: { id: 'Caption foto', en: 'Portrait caption' }, type: 'text' },
  ],
  defaults: {
    heading: 'We found each other in the deep blue.',
    body: 'A short prelude before the journey: who we are, where we met, and the gravity that pulled us together.',
    portrait: 'https://picsum.photos/seed/welcome-portrait/800/1000',
    portraitCaption: 'Bali, 2023',
  },
}
```

- [ ] **Step 3: storyPlanet.ts** (timeline objectArray with nested `photos` imageArray)

```ts
import type { SectionSchema } from '../types'

export const storyPlanetSchema: SectionSchema = {
  type: 'storyPlanet',
  label: { id: 'Kisah Kami (Uranus)', en: 'Our Story (Uranus)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'timeline',
      label: { id: 'Linimasa', en: 'Timeline' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { year: '', label: '', desc: '', photos: [] },
      itemFields: [
        { key: 'year',   label: { id: 'Tahun', en: 'Year' }, type: 'text' },
        { key: 'label',  label: { id: 'Label', en: 'Label' }, type: 'text' },
        { key: 'desc',   label: { id: 'Deskripsi', en: 'Description' }, type: 'textarea', rows: 3 },
        { key: 'photos', label: { id: 'Foto', en: 'Photos' }, type: 'imageArray' },
      ],
    },
  ],
  defaults: {
    heading: 'A timeline written in starlight.',
    timeline: [
      { year: '2019', label: 'First Orbit', desc: "We crossed paths at a friend's birthday.", photos: [] },
      { year: '2025', label: 'The Proposal', desc: 'Under a meteor shower. She said yes.', photos: [] },
    ],
  },
}
```

- [ ] **Step 4: saturnRing.ts** (locked type — content still editable: heading + photos objectArray)

```ts
import type { SectionSchema } from '../types'

export const saturnRingSchema: SectionSchema = {
  type: 'saturnRing',
  label: { id: 'Galeri (Saturn)', en: 'Gallery (Saturn)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'photos',
      label: { id: 'Foto cincin', en: 'Ring photos' },
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { src: '', caption: '' },
      itemFields: [
        { key: 'src',     label: { id: 'Gambar', en: 'Image' }, type: 'image' },
        { key: 'caption', label: { id: 'Caption', en: 'Caption' }, type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 5: countdownPlanet.ts**

```ts
import type { SectionSchema } from '../types'

export const countdownPlanetSchema: SectionSchema = {
  type: 'countdownPlanet',
  label: { id: 'Hitung Mundur (Jupiter)', en: 'Countdown (Jupiter)' },
  fields: [
    { key: 'heading',      label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'subheading',   label: { id: 'Subjudul', en: 'Subheading' }, type: 'text' },
    { key: 'targetDate',   label: { id: 'Tanggal acara', en: 'Target date' }, type: 'datetime' },
    { key: 'endDate',      label: { id: 'Tanggal selesai', en: 'End date' }, type: 'datetime' },
    { key: 'venueName',    label: { id: 'Nama tempat', en: 'Venue name' }, type: 'text' },
    { key: 'venueAddress', label: { id: 'Alamat tempat', en: 'Venue address' }, type: 'text' },
  ],
  defaults: {
    heading: '02 · 14 · 2027',
    subheading: 'Sunday · 16:00 WIB · Garden Pavilion',
    targetDate: '2027-02-14T16:00:00+07:00',
    endDate: '2027-02-14T22:00:00+07:00',
    venueName: 'Plataran Menteng',
    venueAddress: 'Jl. HOS Cokroaminoto 42, Jakarta',
  },
}
```

- [ ] **Step 6: detailsPlanet.ts** (cards objectArray with select icon)

```ts
import type { SectionSchema } from '../types'

const ICONS = [
  { value: 'pin',     label: { id: 'Pin', en: 'Pin' } },
  { value: 'clock',   label: { id: 'Jam', en: 'Clock' } },
  { value: 'sparkle', label: { id: 'Sparkle', en: 'Sparkle' } },
  { value: 'car',     label: { id: 'Mobil', en: 'Car' } },
]

export const detailsPlanetSchema: SectionSchema = {
  type: 'detailsPlanet',
  label: { id: 'Detail Acara (Mars)', en: 'Details (Mars)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'cards',
      label: { id: 'Kartu detail', en: 'Detail cards' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { icon: 'pin', label: '', primary: '', secondary: '', actionLabel: '', actionHref: '' },
      itemFields: [
        { key: 'icon',        label: { id: 'Ikon', en: 'Icon' }, type: 'select', options: ICONS },
        { key: 'label',       label: { id: 'Label', en: 'Label' }, type: 'text' },
        { key: 'primary',     label: { id: 'Teks utama', en: 'Primary' }, type: 'text' },
        { key: 'secondary',   label: { id: 'Teks kedua', en: 'Secondary' }, type: 'text' },
        { key: 'actionLabel', label: { id: 'Teks tombol', en: 'Action label' }, type: 'text' },
        { key: 'actionHref',  label: { id: 'Link tombol', en: 'Action link' }, type: 'text' },
      ],
    },
    { key: 'quote',            label: { id: 'Kutipan', en: 'Quote' }, type: 'textarea', rows: 2 },
    { key: 'quoteAttribution', label: { id: 'Sumber kutipan', en: 'Quote attribution' }, type: 'text' },
  ],
  defaults: {
    heading: 'Where, when, and what to wear.',
    cards: [
      { icon: 'pin', label: 'Venue', primary: 'Plataran Menteng', secondary: 'Jakarta', actionLabel: 'Open Map', actionHref: '#' },
      { icon: 'clock', label: 'Time', primary: '16:00 — 22:00 WIB', secondary: 'Doors open 15:30', actionLabel: '', actionHref: '' },
    ],
    quote: 'Wear what makes you feel like a constellation.',
    quoteAttribution: 'Dress code note from the couple',
  },
}
```

- [ ] **Step 7: rsvpPlanet.ts** (menuOptions stringArray)

```ts
import type { SectionSchema } from '../types'

export const rsvpPlanetSchema: SectionSchema = {
  type: 'rsvpPlanet',
  label: { id: 'RSVP (Earth)', en: 'RSVP (Earth)' },
  fields: [
    { key: 'heading',        label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'deadline',       label: { id: 'Batas waktu', en: 'Deadline' }, type: 'text' },
    { key: 'whatsappNumber', label: { id: 'Nomor WhatsApp', en: 'WhatsApp number' }, type: 'text' },
    { key: 'menuOptions',    label: { id: 'Pilihan menu', en: 'Menu options' }, type: 'stringArray', itemPlaceholder: 'e.g. Nusantara' },
  ],
  defaults: {
    heading: 'Please confirm your orbit by 31 January.',
    deadline: '2027-01-31',
    whatsappNumber: '+62 812-1234-5678',
    menuOptions: ['Nusantara', 'Mediterranean', 'Vegetarian'],
  },
}
```

- [ ] **Step 8: teamPlanet.ts** (groups objectArray with nested members objectArray)

```ts
import type { SectionSchema } from '../types'

export const teamPlanetSchema: SectionSchema = {
  type: 'teamPlanet',
  label: { id: 'Tim Pengiring (Venus)', en: 'Bridal Party (Venus)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'groups',
      label: { id: 'Grup', en: 'Groups' },
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { label: '', members: [] },
      itemFields: [
        { key: 'label', label: { id: 'Nama grup', en: 'Group label' }, type: 'text' },
        {
          key: 'members',
          label: { id: 'Anggota', en: 'Members' },
          type: 'objectArray',
          itemLabelKey: 'name',
          newItem: { name: '', role: '', avatar: '' },
          itemFields: [
            { key: 'name',   label: { id: 'Nama', en: 'Name' }, type: 'text' },
            { key: 'role',   label: { id: 'Peran', en: 'Role' }, type: 'text' },
            { key: 'avatar', label: { id: 'Foto', en: 'Avatar' }, type: 'image' },
          ],
        },
      ],
    },
  ],
  defaults: {
    heading: 'The constellation by our side.',
    groups: [
      { label: 'Bridesmaids', members: [{ name: 'Maya', role: 'Maid of Honor', avatar: '' }] },
      { label: 'Groomsmen',   members: [{ name: 'Rio',  role: 'Best Man',      avatar: '' }] },
    ],
  },
}
```

- [ ] **Step 9: giftPlanet.ts** (accounts objectArray + wishesEnabled boolean)

```ts
import type { SectionSchema } from '../types'

export const giftPlanetSchema: SectionSchema = {
  type: 'giftPlanet',
  label: { id: 'Hadiah & Ucapan (Mercury)', en: 'Gifts & Wishes (Mercury)' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'accounts',
      label: { id: 'Rekening', en: 'Accounts' },
      type: 'objectArray',
      itemLabelKey: 'bank',
      newItem: { bank: '', number: '', name: '' },
      itemFields: [
        { key: 'bank',   label: { id: 'Bank', en: 'Bank' }, type: 'text' },
        { key: 'number', label: { id: 'No. rekening', en: 'Account number' }, type: 'text' },
        { key: 'name',   label: { id: 'Atas nama', en: 'Account name' }, type: 'text' },
      ],
    },
    { key: 'wishesEnabled', label: { id: 'Aktifkan ucapan', en: 'Enable wishes' }, type: 'boolean' },
  ],
  defaults: {
    heading: 'Your presence is the gift. But if you insist…',
    accounts: [{ bank: 'BCA', number: '1234567890', name: 'Aruna K.' }],
    wishesEnabled: true,
  },
}
```

- [ ] **Step 10: footerPlanet.ts** (locked type)

```ts
import type { SectionSchema } from '../types'

export const footerPlanetSchema: SectionSchema = {
  type: 'footerPlanet',
  label: { id: 'Penutup (Sun)', en: 'Footer (Sun)' },
  fields: [
    { key: 'heading',          label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'body',             label: { id: 'Isi', en: 'Body' }, type: 'textarea', rows: 3 },
    { key: 'easterEggMessage', label: { id: 'Pesan rahasia (klik matahari)', en: 'Easter egg message' }, type: 'textarea', rows: 2 },
  ],
}
```

- [ ] **Step 11: Fill the barrel** — replace `src/editor/schemas/solary/index.ts`:

```ts
import type { SectionSchema } from '../types'
import { openingGateSchema } from './openingGate'
import { welcomePlanetSchema } from './welcomePlanet'
import { storyPlanetSchema } from './storyPlanet'
import { saturnRingSchema } from './saturnRing'
import { countdownPlanetSchema } from './countdownPlanet'
import { detailsPlanetSchema } from './detailsPlanet'
import { rsvpPlanetSchema } from './rsvpPlanet'
import { teamPlanetSchema } from './teamPlanet'
import { giftPlanetSchema } from './giftPlanet'
import { footerPlanetSchema } from './footerPlanet'

export const solarySchemaRegistry: Record<string, SectionSchema> = {
  openingGate:     openingGateSchema,
  welcomePlanet:   welcomePlanetSchema,
  storyPlanet:     storyPlanetSchema,
  saturnRing:      saturnRingSchema,
  countdownPlanet: countdownPlanetSchema,
  detailsPlanet:   detailsPlanetSchema,
  rsvpPlanet:      rsvpPlanetSchema,
  teamPlanet:      teamPlanetSchema,
  giftPlanet:      giftPlanetSchema,
  footerPlanet:    footerPlanetSchema,
}
```

- [ ] **Step 12: Add a test asserting all 10 types resolve**

Append to `src/editor/__tests__/schema-registry.test.ts`:

```ts
describe('solarySchemaRegistry', () => {
  it('has all 10 existing solary section types', () => {
    const r = getSchemaRegistry('solary')
    for (const t of ['openingGate','welcomePlanet','storyPlanet','saturnRing','countdownPlanet','detailsPlanet','rsvpPlanet','teamPlanet','giftPlanet','footerPlanet']) {
      expect(r[t]).toBeTruthy()
      expect(r[t].fields.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 13: Run tests**

Run: `npm test -- schema-registry`
Expected: PASS (4 describe blocks).

- [ ] **Step 14: Commit**

```bash
git add src/editor/schemas/solary/ src/editor/__tests__/schema-registry.test.ts
git commit -m "feat(editor): solary schemas for the 10 existing section types"
```

---

### Task 5: Thread `template` into FieldEditor (use Solary schemas)

**Files:**
- Modify: `src/editor/FieldEditor.tsx`
- Modify: `src/editor/EditorRoot.tsx`

- [ ] **Step 1: Accept `template` in FieldEditor and use getSchemaRegistry**

In `src/editor/FieldEditor.tsx`, change the import:

```tsx
import { getSchemaRegistry } from './schemas'
import { localizeLabel, type FieldDef } from './schemas/types'
```

Change the Props and schema lookup:

```tsx
interface Props {
  slug: string
  template: string
}

export default function FieldEditor({ slug, template }: Props) {
  const { selectedSection, updateField, removeSection } = useEditor()
  const t = useDashboardDict().editor
  const lang = useDashboardLang()

  if (!selectedSection) {
    return <div style={empty}>{t.selectPrompt}</div>
  }

  const schema = getSchemaRegistry(template)[selectedSection.type]
```

- [ ] **Step 2: Pass `template` from EditorRoot**

In `src/editor/EditorRoot.tsx`, update the `FieldEditor` usage:

```tsx
          <main className={styles.fieldPane}>
            <FieldEditor slug={slug} template={template} />
          </main>
```

- [ ] **Step 3: Verify typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual browser check**

Run: `npm run dev`. Open a Solary invite dashboard editor (e.g. `http://localhost:3000/solary/demo-solary/dashboard` after login, or seed a solary invite). Select each section.
Expected: every section shows real fields (no "Unknown section"); Saturn shows heading + ring photos; RSVP shows menu options as a string list; Story timeline rows expose nested photo uploaders; Team groups expose nested members.

Also open a **Lovebirds** invite editor and confirm it is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/editor/FieldEditor.tsx src/editor/EditorRoot.tsx
git commit -m "feat(editor): FieldEditor selects schema registry by template"
```

---

# PHASE 2 — Slot policy: fixed count, locks, type swap, constrained reorder

### Task 6: Template policy module + reorder math (TDD)

**Files:**
- Create: `src/editor/templatePolicy.ts`
- Test: `src/editor/__tests__/template-policy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/editor/__tests__/template-policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTemplatePolicy, computeSafeOrder } from '../templatePolicy'

const ids = ['intro','neptune','uranus','saturn','jupiter','mars','earth','venus','mercury','sun']

describe('getTemplatePolicy', () => {
  it('returns null for templates without a policy (e.g. lovebirds)', () => {
    expect(getTemplatePolicy('lovebirds')).toBeNull()
  })
  it('locks intro, saturn, sun for solary', () => {
    const p = getTemplatePolicy('solary')!
    expect(p.fixedSections).toBe(true)
    expect(p.locks.saturn).toEqual({ lockType: true, lockPosition: true })
    expect(p.locks.intro.lockType).toBe(true)
    expect(p.locks.sun.lockType).toBe(true)
    expect(p.swappablePool).not.toContain('saturnRing')
    expect(p.swappablePool).toContain('faqPlanet')
  })
})

describe('computeSafeOrder', () => {
  const p = getTemplatePolicy('solary')!
  it('reorders two movable slots', () => {
    // move venus (idx 7) before jupiter (idx 4)
    const next = computeSafeOrder(ids, 'venus', 'jupiter', p)
    expect(next).toEqual(['intro','neptune','uranus','saturn','venus','jupiter','mars','earth','mercury','sun'])
  })
  it('refuses to move a locked-position slot (saturn)', () => {
    expect(computeSafeOrder(ids, 'saturn', 'neptune', p)).toBeNull()
  })
  it('refuses to move onto/over a pinned end (sun stays last)', () => {
    // dropping mercury after sun is illegal → saturn/sun anchors preserved
    const next = computeSafeOrder(ids, 'mercury', 'sun', p)
    if (next) {
      expect(next[0]).toBe('intro')
      expect(next[next.length - 1]).toBe('sun')
      expect(next[3]).toBe('saturn')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- template-policy`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement templatePolicy.ts**

Create `src/editor/templatePolicy.ts`:

```ts
export interface SlotLock {
  lockType?: boolean
  lockPosition?: boolean
  lockDisable?: boolean
}

export interface TemplatePolicy {
  fixedSections: boolean
  locks: Record<string, SlotLock>
  swappablePool: string[]
  pinnedFirstId?: string
  pinnedLastId?: string
}

const SOLARY_SWAPPABLE_POOL = [
  'welcomePlanet',
  'storyPlanet',
  'countdownPlanet',
  'detailsPlanet',
  'rsvpPlanet',
  'teamPlanet',
  'giftPlanet',
  'quotePlanet',
  'schedulePlanet',
  'liveStreamPlanet',
  'faqPlanet',
]

const solaryPolicy: TemplatePolicy = {
  fixedSections: true,
  pinnedFirstId: 'intro',
  pinnedLastId: 'sun',
  locks: {
    intro:  { lockType: true, lockPosition: true, lockDisable: true },
    saturn: { lockType: true, lockPosition: true, lockDisable: true },
    sun:    { lockType: true, lockPosition: true, lockDisable: true },
  },
  swappablePool: SOLARY_SWAPPABLE_POOL,
}

const policies: Record<string, TemplatePolicy> = { solary: solaryPolicy }

export function getTemplatePolicy(template: string): TemplatePolicy | null {
  return policies[template] ?? null
}

export function isPositionLocked(id: string, policy: TemplatePolicy): boolean {
  return !!policy.locks[id]?.lockPosition
}
export function isTypeLocked(id: string, policy: TemplatePolicy): boolean {
  return !!policy.locks[id]?.lockType
}

/**
 * Reorder by id while preserving every position-locked slot at its current
 * index. Returns the new id order, or null if the move is illegal (the
 * dragged slot is position-locked, or the result would shift any locked slot).
 */
export function computeSafeOrder(
  order: string[],
  activeId: string,
  overId: string,
  policy: TemplatePolicy,
): string[] | null {
  if (activeId === overId) return null
  if (isPositionLocked(activeId, policy)) return null

  const from = order.indexOf(activeId)
  const to = order.indexOf(overId)
  if (from < 0 || to < 0) return null

  const next = order.slice()
  next.splice(from, 1)
  next.splice(to, 0, activeId)

  // Every position-locked slot must remain at the same index it had before.
  for (const [id, lock] of Object.entries(policy.locks)) {
    if (!lock.lockPosition) continue
    if (order.indexOf(id) !== next.indexOf(id)) return null
  }
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- template-policy`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/templatePolicy.ts src/editor/__tests__/template-policy.test.ts
git commit -m "feat(editor): template slot policy + locked-aware reorder math"
```

---

### Task 7: Reducer actions — `CHANGE_SECTION_TYPE` and `REORDER_SECTIONS_BY_ID` (TDD)

**Files:**
- Modify: `src/editor/EditorProvider.tsx`
- Test: `src/editor/__tests__/editor-reducer.test.ts`

The reducer is not exported today. First export it, then test it.

- [ ] **Step 1: Export the reducer and types**

In `src/editor/EditorProvider.tsx`, change `function reducer` to `export function reducer`, and add `export type { State, Action }` near the type defs (add `export` to the `type Action` and `interface State` declarations).

- [ ] **Step 2: Add the two new actions to the Action union**

Add to the `Action` union:

```ts
  | { type: 'CHANGE_SECTION_TYPE'; sectionId: string; newType: string; defaults?: Record<string, unknown> }
  | { type: 'REORDER_SECTIONS_BY_ID'; order: string[] }
```

- [ ] **Step 3: Implement the cases**

Add inside the reducer `switch`:

```ts
    case 'CHANGE_SECTION_TYPE':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const prev = (s.props || {}) as Record<string, unknown>
          const preserved: Record<string, unknown> = {}
          if (prev.planetKey !== undefined) preserved.planetKey = prev.planetKey
          if (prev.planetName !== undefined) preserved.planetName = prev.planetName
          if (prev.sectionLabel !== undefined) preserved.sectionLabel = prev.sectionLabel
          return {
            ...s,
            type: action.newType,
            props: { ...(action.defaults || {}), ...preserved },
          }
        }),
      }

    case 'REORDER_SECTIONS_BY_ID': {
      const byId = new Map(state.config.sections.map((s) => [s.id, s]))
      const next = action.order
        .map((id) => byId.get(id))
        .filter((s): s is SectionEntry => !!s)
      // Guard: only apply if it's a pure permutation (same length).
      if (next.length !== state.config.sections.length) return state
      return { ...state, config: { ...state.config, sections: next } }
    }
```

- [ ] **Step 4: Expose helpers on the context**

In `EditorContextValue` add:

```ts
  changeSectionType: (sectionId: string, newType: string, defaults?: Record<string, unknown>) => void
  reorderSectionsById: (order: string[]) => void
```

In the `value` object add:

```ts
    changeSectionType: (sectionId, newType, defaults) =>
      dispatch({ type: 'CHANGE_SECTION_TYPE', sectionId, newType, defaults }),
    reorderSectionsById: (order) => dispatch({ type: 'REORDER_SECTIONS_BY_ID', order }),
```

- [ ] **Step 5: Write the failing test**

Create `src/editor/__tests__/editor-reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { reducer } from '../EditorProvider'

const base = {
  config: { sections: [
    { id: 'venus', type: 'teamPlanet', props: { planetKey: 'venus', planetName: 'Venus', heading: 'old' } },
    { id: 'mars', type: 'detailsPlanet', props: { planetKey: 'mars', planetName: 'Mars' } },
  ] },
  initialConfig: { sections: [] },
  selectedSectionId: 'venus',
  isSaving: false, saveError: null, lastSavedAt: null,
} as any

describe('CHANGE_SECTION_TYPE', () => {
  it('keeps planetKey/planetName, swaps type, applies defaults', () => {
    const next = reducer(base, { type: 'CHANGE_SECTION_TYPE', sectionId: 'venus', newType: 'faqPlanet', defaults: { heading: 'FAQ', items: [{ q: 'Q', a: 'A' }] } })
    const s = next.config.sections[0]
    expect(s.type).toBe('faqPlanet')
    expect(s.props.planetKey).toBe('venus')
    expect(s.props.planetName).toBe('Venus')
    expect(s.props.heading).toBe('FAQ')
    expect(s.props.items).toHaveLength(1)
    expect(s.props.old).toBeUndefined() // old content replaced
  })
})

describe('REORDER_SECTIONS_BY_ID', () => {
  it('reorders to match the id order', () => {
    const next = reducer(base, { type: 'REORDER_SECTIONS_BY_ID', order: ['mars', 'venus'] })
    expect(next.config.sections.map((s: any) => s.id)).toEqual(['mars', 'venus'])
  })
  it('ignores a non-permutation order', () => {
    const next = reducer(base, { type: 'REORDER_SECTIONS_BY_ID', order: ['mars'] })
    expect(next.config.sections.map((s: any) => s.id)).toEqual(['venus', 'mars'])
  })
})
```

- [ ] **Step 6: Run test**

Run: `npm test -- editor-reducer`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/editor/EditorProvider.tsx src/editor/__tests__/editor-reducer.test.ts
git commit -m "feat(editor): CHANGE_SECTION_TYPE + REORDER_SECTIONS_BY_ID reducer actions"
```

---

### Task 8: SectionList & SectionRow — policy-driven locks, swap dropdown, constrained DnD

**Files:**
- Modify: `src/editor/SectionList.tsx`
- Modify: `src/editor/SectionRow.tsx`
- Modify: `src/editor/AddSectionMenu.tsx`

- [ ] **Step 1: Hide Add menu when sections are fixed**

In `src/editor/SectionList.tsx`, import the policy + schema helpers:

```tsx
import { getSchemaRegistry } from './schemas'
import { getTemplatePolicy, computeSafeOrder, isPositionLocked } from './templatePolicy'
```

Inside the component, derive:

```tsx
  const { config, selectedSectionId, reorderSections, reorderSectionsById,
    toggleSectionEnabled, selectSection, addSection, removeSection } = useEditor()
  const policy = getTemplatePolicy(template)
```

Replace the `onDragEnd` body so policy templates use `computeSafeOrder`:

```tsx
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    if (policy) {
      const order = config.sections.map((s) => s.id)
      const next = computeSafeOrder(order, String(active.id), String(over.id), policy)
      if (next) reorderSectionsById(next)
      return
    }
    const from = config.sections.findIndex((s) => s.id === active.id)
    const to = config.sections.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    reorderSections(from, to)
  }
```

Wrap the `AddSectionMenu` so it only renders when not fixed:

```tsx
      {!policy?.fixedSections && (
        <div style={{ padding: 12 }}>
          <AddSectionMenu onAdd={(type, label) => addSection(type, label)} />
        </div>
      )}
```

Pass lock + swap info into each `SectionRow`:

```tsx
            {config.sections.map((s) => {
              const lock = policy?.locks[s.id]
              const typeLocked = !!lock?.lockType
              const posLocked = !!lock?.lockPosition
              const disableLocked = !!lock?.lockDisable
              return (
                <SectionRow
                  key={s.id}
                  section={s}
                  label={localizeLabel(getSchemaRegistry(template)[s.type]?.label ?? s.type, lang)}
                  isSelected={s.id === selectedSectionId}
                  onSelect={() => selectSection(s.id)}
                  onToggleEnabled={() => toggleSectionEnabled(s.id)}
                  onRemove={() => removeSection(s.id)}
                  draggable={!posLocked}
                  canRemove={!policy?.fixedSections}
                  canDisable={!disableLocked}
                />
              )
            })}
```

Also delete the old `import { schemaRegistry } from './schemas'` line (the label now resolves via `getSchemaRegistry(template)[s.type]` shown above).

- [ ] **Step 2: Honor the new props in SectionRow**

In `src/editor/SectionRow.tsx`, extend the `Props` interface (add three optional flags, default true):

```tsx
interface Props {
  section: SectionEntry
  label: string
  isSelected: boolean
  onSelect: () => void
  onToggleEnabled: () => void
  onRemove: () => void
  draggable?: boolean
  canRemove?: boolean
  canDisable?: boolean
}
```

Update the component signature to destructure with defaults:

```tsx
export default function SectionRow({ section, label, isSelected, onSelect, onToggleEnabled, onRemove, draggable = true, canRemove = true, canDisable = true }: Props) {
```

Replace the drag-handle `<span>` (lines ~68-76) so the dnd-kit listeners only attach when draggable:

```tsx
      <span
        {...(draggable ? attributes : {})}
        {...(draggable ? listeners : {})}
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: draggable ? 'grab' : 'not-allowed', color: 'rgba(42,33,24,0.4)', fontSize: 14, padding: '0 4px', opacity: draggable ? 1 : 0.5 }}
        aria-label={draggable ? t.dragReorder : t.lockedHint}
        title={draggable ? t.dragReorder : t.lockedHint}
      >
        {draggable ? '⠿' : '🔒'}
      </span>
```

Wrap the enable/disable dot button so it's hidden when `canDisable` is false:

```tsx
      {canDisable && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleEnabled() }}
          title={section.enabled === false ? t.enableTitle : t.disableTitle}
          style={{
            width: 12, height: 12, borderRadius: 999,
            border: 'none', cursor: 'pointer',
            background: section.enabled === false ? 'rgba(42,33,24,0.18)' : '#2D8C4E',
            flexShrink: 0,
          }}
        />
      )}
```

Wrap the remove (×) button so it's hidden when `canRemove` is false:

```tsx
      {canRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (confirm(`${t.removeConfirmPrefix}"${displayLabel}"${t.removeConfirmSuffix}`)) onRemove() }}
          style={{ border: 'none', background: 'transparent', color: 'rgba(42,33,24,0.4)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
          aria-label={t.removeAria}
        >
          ×
        </button>
      )}
```

Note: `t.lockedHint` is added to the dashboard dict in Task 9 Step 2. Tasks 8 and 9 are both in Phase 2; if executing strictly in order, add the `lockedHint` key (Task 9 Step 2) before relying on it here, or temporarily use the string `'Terkunci'` / `'Locked'` until Task 9 lands.

- [ ] **Step 3: AddSectionMenu unchanged but safe**

`src/editor/AddSectionMenu.tsx` needs no change (it's simply not rendered when fixed). Leave as-is.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 5: Manual browser check (Solary)**

`npm run dev` → Solary editor. Expected: no "+ Add section"; Intro/Saturn/Sun rows show 🔒, are not draggable, have no × ; dragging Venus before Jupiter reorders and persists order on save; Saturn never changes index; Lovebirds editor still has Add + free reorder.

- [ ] **Step 6: Commit**

```bash
git add src/editor/SectionList.tsx src/editor/SectionRow.tsx
git commit -m "feat(editor): policy-driven locks, hidden add, constrained reorder for solary"
```

---

### Task 9: Swap-type dropdown in FieldEditor header

**Files:**
- Modify: `src/editor/FieldEditor.tsx`

- [ ] **Step 1: Render a "Change type" select for non-locked slots**

In `src/editor/FieldEditor.tsx`, import policy + helpers and the editor hook field:

```tsx
import { getTemplatePolicy, isTypeLocked } from './templatePolicy'
```

Add `template` is already a prop (Task 5). Pull `changeSectionType` from `useEditor()`:

```tsx
  const { selectedSection, updateField, removeSection, changeSectionType } = useEditor()
```

Compute swap options after `schema`/`props` are resolved (inside the `return` path where `schema` exists):

```tsx
  const policy = getTemplatePolicy(template)
  const registry = getSchemaRegistry(template)
  const typeLocked = policy ? isTypeLocked(selectedSection.id, policy) : false
  const swapOptions = policy && !typeLocked
    ? policy.swappablePool.filter((tp) => registry[tp])
    : []

  function onChangeType(newType: string) {
    if (newType === selectedSection!.type) return
    if (!confirm(t.changeTypeConfirm)) return
    changeSectionType(selectedSection!.id, newType, registry[newType]?.defaults)
  }
```

In the section header (the `<header style={hdr}>` block that renders the schema label), add the dropdown when `swapOptions.length > 0`:

```tsx
      <header style={hdr}>
        <p style={kicker}>{t.sectionKicker}</p>
        <h3 style={h3}>{localizeLabel(schema.label, lang)}</h3>
        {swapOptions.length > 0 && (
          <label style={{ display: 'block', marginTop: 10 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(42,33,24,0.55)' }}>{t.changeType}</span>
            <select
              value={selectedSection.type}
              onChange={(e) => onChangeType(e.target.value)}
              style={{ display: 'block', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.2)', fontSize: 13, background: '#fff', color: '#2A2118' }}
            >
              {swapOptions.map((tp) => (
                <option key={tp} value={tp}>{localizeLabel(registry[tp].label, lang)}</option>
              ))}
            </select>
          </label>
        )}
        {typeLocked && policy && <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(42,33,24,0.45)' }}>🔒 {t.lockedHint}</p>}
      </header>
```

- [ ] **Step 2: Add the i18n keys used above** (`changeType`, `changeTypeConfirm`, `lockedHint`)

In `src/lib/i18n/dictionaries/dashboard.ts`, inside **both** `id.editor` and `en.editor` objects, add:

```ts
      // id.editor
      changeType: 'Ganti tipe section',
      changeTypeConfirm: 'Mengganti tipe akan mengganti isi section ini dengan konten contoh. Lanjutkan?',
      lockedHint: 'Posisi & tipe section ini dikunci. Isinya tetap bisa diedit.',
```

```ts
      // en.editor
      changeType: 'Change section type',
      changeTypeConfirm: 'Changing the type will replace this section content with sample content. Continue?',
      lockedHint: 'This section position & type are locked. Its content stays editable.',
```

- [ ] **Step 3: Typecheck + dict parity test**

Run: `npx tsc --noEmit && npm test -- dict-parity`
Expected: clean; dict-parity PASS.

- [ ] **Step 4: Manual browser check**

Solary editor → select Venus (teamPlanet) → "Ganti tipe section" dropdown lists 11 types incl. the 4 new (which won't render until Phase 3 but the option appears) → switching to e.g. detailsPlanet shows confirm, replaces props, preview still focuses Venus. Saturn shows the 🔒 locked hint and no dropdown.

- [ ] **Step 5: Commit**

```bash
git add src/editor/FieldEditor.tsx src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(editor): per-slot change-type dropdown for solary swappable slots"
```

---

# PHASE 3 — Four new Solary sections

After this phase, the 4 new types render and are fully editable + swappable.

### Task 10: Build the 4 new section components

**Files:**
- Create: `src/all-templates/solary/sections/QuotePlanet.jsx`
- Create: `src/all-templates/solary/sections/SchedulePlanet.jsx`
- Create: `src/all-templates/solary/sections/LiveStreamPlanet.jsx`
- Create: `src/all-templates/solary/sections/FaqPlanet.jsx`

- [ ] **Step 1: QuotePlanet.jsx**

```jsx
import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function QuotePlanet({ sectionLabel, planetName, heading, verse, source, translation }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        {heading && (
          <CardChild>
            <h2 className="h-2 center-text" style={{ marginBottom: "1.25rem" }}>{heading}</h2>
          </CardChild>
        )}
        <CardChild>
          <blockquote style={{ margin: 0, textAlign: "center", padding: "0 1rem" }}>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--fs-h3)", lineHeight: 1.5, margin: 0 }}>
              “{verse}”
            </p>
            {translation && (
              <p style={{ color: "var(--color-fg-mute)", marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>{translation}</p>
            )}
            {source && (
              <footer className="mono faint" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                — {source}
              </footer>
            )}
          </blockquote>
        </CardChild>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: SchedulePlanet.jsx**

```jsx
import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function SchedulePlanet({ sectionLabel, planetName, heading, events = [] }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.5rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="stack gap-5">
            {events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "baseline", borderBottom: "1px solid var(--color-line)", paddingBottom: 14 }}>
                <div className="mono" style={{ minWidth: 96, color: "var(--color-accent)", fontSize: 13, letterSpacing: "0.12em" }}>{e.time}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1.2 }}>{e.title}</div>
                  {e.desc && <div style={{ color: "var(--color-fg-mute)", fontSize: 14, marginTop: 4 }}>{e.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 3: LiveStreamPlanet.jsx**

```jsx
import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

const PLATFORM_LABEL = { youtube: "YouTube", instagram: "Instagram", zoom: "Zoom", other: "Live" };

export default function LiveStreamPlanet({ sectionLabel, planetName, heading, platform = "youtube", url, scheduledAt, note }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div style={{ textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 8 }}>
              {PLATFORM_LABEL[platform] || "Live"}
            </div>
            {scheduledAt && <div style={{ color: "var(--color-fg-mute)", marginBottom: 18, fontSize: 14 }}>{scheduledAt}</div>}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="form-button" style={{ display: "inline-block", textDecoration: "none" }}>
                Watch Live →
              </a>
            )}
            {note && <p style={{ color: "var(--color-fg-mute)", marginTop: 18, fontSize: 14, lineHeight: 1.6 }}>{note}</p>}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 4: FaqPlanet.jsx**

```jsx
import React, { useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function FaqPlanet({ sectionLabel, planetName, heading, items = [] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.5rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="stack gap-3">
            {items.map((it, i) => {
              const isOpen = open === i;
              return (
                <div key={i} style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: "var(--color-fg)", fontFamily: "var(--font-display)", fontSize: "1.1rem" }}
                  >
                    <span>{it.q}</span>
                    <span style={{ color: "var(--color-accent)" }}>{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && it.a && (
                    <p style={{ color: "var(--color-fg-mute)", margin: "0 0 16px", fontSize: 14, lineHeight: 1.6 }}>{it.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/all-templates/solary/sections/QuotePlanet.jsx src/all-templates/solary/sections/SchedulePlanet.jsx src/all-templates/solary/sections/LiveStreamPlanet.jsx src/all-templates/solary/sections/FaqPlanet.jsx
git commit -m "feat(solary): add Quote, Schedule, LiveStream, FAQ planet sections"
```

---

### Task 11: Register the 4 new types

**Files:**
- Modify: `src/all-templates/solary/config/sectionRegistry.js`

- [ ] **Step 1: Import + register**

Edit `src/all-templates/solary/config/sectionRegistry.js`:

```js
import OpeningGatePlaceholder from "../sections/OpeningGatePlaceholder.jsx";
import WelcomePlanet        from "../sections/WelcomePlanet.jsx";
import StoryPlanet          from "../sections/StoryPlanet.jsx";
import SaturnRingPlanet     from "../sections/SaturnRingPlanet.jsx";
import CountdownPlanet      from "../sections/CountdownPlanet.jsx";
import DetailsPlanet        from "../sections/DetailsPlanet.jsx";
import RSVPPlanet           from "../sections/RSVPPlanet.jsx";
import TeamPlanet           from "../sections/TeamPlanet.jsx";
import GiftPlanet           from "../sections/GiftPlanet.jsx";
import FooterPlanet         from "../sections/FooterPlanet.jsx";
import QuotePlanet          from "../sections/QuotePlanet.jsx";
import SchedulePlanet       from "../sections/SchedulePlanet.jsx";
import LiveStreamPlanet     from "../sections/LiveStreamPlanet.jsx";
import FaqPlanet            from "../sections/FaqPlanet.jsx";

export const sectionRegistry = {
  openingGate:     OpeningGatePlaceholder,
  welcomePlanet:   WelcomePlanet,
  storyPlanet:     StoryPlanet,
  saturnRing:      SaturnRingPlanet,
  countdownPlanet: CountdownPlanet,
  detailsPlanet:   DetailsPlanet,
  rsvpPlanet:      RSVPPlanet,
  teamPlanet:      TeamPlanet,
  giftPlanet:      GiftPlanet,
  footerPlanet:    FooterPlanet,
  quotePlanet:     QuotePlanet,
  schedulePlanet:  SchedulePlanet,
  liveStreamPlanet: LiveStreamPlanet,
  faqPlanet:       FaqPlanet,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/all-templates/solary/config/sectionRegistry.js
git commit -m "feat(solary): register 4 new section types in the registry"
```

---

### Task 12: Editor schemas for the 4 new types + register in barrel

**Files:**
- Create: `src/editor/schemas/solary/{quotePlanet,schedulePlanet,liveStreamPlanet,faqPlanet}.ts`
- Modify: `src/editor/schemas/solary/index.ts`

- [ ] **Step 1: quotePlanet.ts**

```ts
import type { SectionSchema } from '../types'

export const quotePlanetSchema: SectionSchema = {
  type: 'quotePlanet',
  label: { id: 'Kutipan / Ayat', en: 'Quote / Verse' },
  fields: [
    { key: 'heading',     label: { id: 'Judul (opsional)', en: 'Heading (optional)' }, type: 'text' },
    { key: 'verse',       label: { id: 'Ayat / kutipan', en: 'Verse / quote' }, type: 'textarea', rows: 4 },
    { key: 'translation', label: { id: 'Terjemahan (opsional)', en: 'Translation (optional)' }, type: 'textarea', rows: 3 },
    { key: 'source',      label: { id: 'Sumber', en: 'Source' }, type: 'text', help: { id: 'mis. QS Ar-Rum: 21', en: 'e.g. QS Ar-Rum: 21' } },
  ],
  defaults: {
    heading: '',
    verse: 'And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them.',
    translation: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.',
    source: 'QS Ar-Rum: 21',
  },
}
```

- [ ] **Step 2: schedulePlanet.ts**

```ts
import type { SectionSchema } from '../types'

export const schedulePlanetSchema: SectionSchema = {
  type: 'schedulePlanet',
  label: { id: 'Rundown Acara', en: 'Schedule' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'events',
      label: { id: 'Acara', en: 'Events' },
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { time: '', title: '', desc: '' },
      itemFields: [
        { key: 'time',  label: { id: 'Waktu', en: 'Time' }, type: 'text' },
        { key: 'title', label: { id: 'Acara', en: 'Title' }, type: 'text' },
        { key: 'desc',  label: { id: 'Keterangan', en: 'Description' }, type: 'textarea', rows: 2 },
      ],
    },
  ],
  defaults: {
    heading: 'Rundown Acara',
    events: [
      { time: '08:00', title: 'Akad Nikah', desc: 'Pemberkatan di ballroom utama.' },
      { time: '11:00', title: 'Resepsi', desc: 'Ramah tamah & santap siang.' },
      { time: '19:00', title: 'Dinner Reception', desc: 'Hiburan & potong kue.' },
    ],
  },
}
```

- [ ] **Step 3: liveStreamPlanet.ts**

```ts
import type { SectionSchema } from '../types'

const PLATFORMS = [
  { value: 'youtube',   label: { id: 'YouTube', en: 'YouTube' } },
  { value: 'instagram', label: { id: 'Instagram', en: 'Instagram' } },
  { value: 'zoom',      label: { id: 'Zoom', en: 'Zoom' } },
  { value: 'other',     label: { id: 'Lainnya', en: 'Other' } },
]

export const liveStreamPlanetSchema: SectionSchema = {
  type: 'liveStreamPlanet',
  label: { id: 'Live Streaming', en: 'Live Streaming' },
  fields: [
    { key: 'heading',     label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    { key: 'platform',    label: { id: 'Platform', en: 'Platform' }, type: 'select', options: PLATFORMS },
    { key: 'url',         label: { id: 'Link siaran', en: 'Stream link' }, type: 'text' },
    { key: 'scheduledAt', label: { id: 'Jadwal tayang', en: 'Scheduled time' }, type: 'text' },
    { key: 'note',        label: { id: 'Catatan (opsional)', en: 'Note (optional)' }, type: 'textarea', rows: 2 },
  ],
  defaults: {
    heading: 'Saksikan Langsung',
    platform: 'youtube',
    url: 'https://youtube.com/live/your-stream',
    scheduledAt: 'Minggu, 14 Feb 2027 · 16:00 WIB',
    note: 'Bagi yang berhalangan hadir, ikuti acara kami secara langsung.',
  },
}
```

- [ ] **Step 4: faqPlanet.ts**

```ts
import type { SectionSchema } from '../types'

export const faqPlanetSchema: SectionSchema = {
  type: 'faqPlanet',
  label: { id: 'FAQ', en: 'FAQ' },
  fields: [
    { key: 'heading', label: { id: 'Judul', en: 'Heading' }, type: 'text' },
    {
      key: 'items',
      label: { id: 'Pertanyaan', en: 'Questions' },
      type: 'objectArray',
      itemLabelKey: 'q',
      newItem: { q: '', a: '' },
      itemFields: [
        { key: 'q', label: { id: 'Pertanyaan', en: 'Question' }, type: 'text' },
        { key: 'a', label: { id: 'Jawaban', en: 'Answer' }, type: 'textarea', rows: 3 },
      ],
    },
  ],
  defaults: {
    heading: 'Pertanyaan Umum',
    items: [
      { q: 'Apakah boleh membawa anak?', a: 'Tentu, kami menyambut keluarga Anda.' },
      { q: 'Apa dress code-nya?', a: 'Formal dengan nuansa warna gelap metalik.' },
      { q: 'Apakah tersedia parkir?', a: 'Ya, valet parking tersedia untuk tamu.' },
    ],
  },
}
```

- [ ] **Step 5: Add to the solary barrel** — in `src/editor/schemas/solary/index.ts` add imports and registry entries:

```ts
import { quotePlanetSchema } from './quotePlanet'
import { schedulePlanetSchema } from './schedulePlanet'
import { liveStreamPlanetSchema } from './liveStreamPlanet'
import { faqPlanetSchema } from './faqPlanet'
```

```ts
  // add inside solarySchemaRegistry:
  quotePlanet:      quotePlanetSchema,
  schedulePlanet:   schedulePlanetSchema,
  liveStreamPlanet: liveStreamPlanetSchema,
  faqPlanet:        faqPlanetSchema,
```

- [ ] **Step 6: Extend the registry test for 14 types**

In `src/editor/__tests__/schema-registry.test.ts`, update the existing solary list to include the 4 new types:

```ts
    for (const t of ['openingGate','welcomePlanet','storyPlanet','saturnRing','countdownPlanet','detailsPlanet','rsvpPlanet','teamPlanet','giftPlanet','footerPlanet','quotePlanet','schedulePlanet','liveStreamPlanet','faqPlanet']) {
```

Add a test that every swappable-pool type has `defaults`:

```ts
import { getTemplatePolicy } from '../templatePolicy'

it('every swappable-pool type has a defaults block', () => {
  const r = getSchemaRegistry('solary')
  const pool = getTemplatePolicy('solary')!.swappablePool
  for (const t of pool) {
    expect(r[t], `missing schema for ${t}`).toBeTruthy()
    expect(r[t].defaults, `missing defaults for ${t}`).toBeTruthy()
  }
})
```

- [ ] **Step 7: Run tests + build**

Run: `npm test -- schema-registry && npm run build`
Expected: PASS + clean build.

- [ ] **Step 8: Manual browser check**

Solary editor → swap Venus to each of the 4 new types → confirm sample content renders in the preview at the Venus planet, and fields are editable. Check on one dark + one light palette.

- [ ] **Step 9: Commit**

```bash
git add src/editor/schemas/solary/ src/editor/__tests__/schema-registry.test.ts
git commit -m "feat(editor): schemas for the 4 new swappable solary sections"
```

---

# PHASE 4 — Palette in dashboard + lock on live invite

### Task 13: `allowGuestSwitch` on ThemeContext; `isDemo` through Shell

**Files:**
- Modify: `src/all-templates/solary/contexts/ThemeContext.jsx`
- Modify: `src/all-templates/solary/Shell.jsx`
- Modify: `src/app/[template]/[slug]/InvitationView.tsx`
- Modify: `src/app/[template]/[slug]/page.tsx`

- [ ] **Step 1: ThemeContext honors `allowGuestSwitch`**

In `src/all-templates/solary/contexts/ThemeContext.jsx`, change the signature and the initial-state logic so that when guest switching is disabled it ignores sessionStorage and locks to `defaultPalette`:

```jsx
export function ThemeProvider({ defaultPalette = DEFAULT_PALETTE, options, allowGuestSwitch = true, children }) {
  const [palette, setPaletteState] = useState(() => {
    if (allowGuestSwitch) {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved && PALETTES[saved]) return saved;
      } catch {}
    }
    return PALETTES[defaultPalette] ? defaultPalette : DEFAULT_PALETTE;
  });

  useEffect(() => {
    themeBus.set(palette);
    if (allowGuestSwitch) {
      try { sessionStorage.setItem(STORAGE_KEY, palette); } catch {}
    }
  }, [palette, allowGuestSwitch]);

  // Keep palette in sync if the couple's default changes (locked mode).
  useEffect(() => {
    if (!allowGuestSwitch && PALETTES[defaultPalette]) setPaletteState(defaultPalette);
  }, [allowGuestSwitch, defaultPalette]);
```

(Keep the rest of the provider — `setPalette`, `value`, export — unchanged.)

- [ ] **Step 2: Shell accepts `isDemo`, gates PaletteSwitcher, passes lock**

In `src/all-templates/solary/Shell.jsx`, change the signature and the ThemeProvider + switcher render:

```jsx
export default function Shell({ config: incoming, slug, isDemo = false }) {
```

```jsx
    <ThemeProvider
      defaultPalette={config.theme?.defaultPalette}
      options={config.theme?.paletteOptions}
      allowGuestSwitch={isDemo}
    >
```

```jsx
            {isDemo && <PaletteSwitcher />}
```

- [ ] **Step 3: InvitationView forwards `isDemo`**

In `src/app/[template]/[slug]/InvitationView.tsx`:

```tsx
export default function InvitationView({
  config, slug, templateId, isDemo = false,
}: {
  config: any
  slug: string
  templateId: string
  isDemo?: boolean
}) {
  if (templateId === 'solary') {
    return <SolaryShell config={config} slug={slug} isDemo={isDemo} />
  }
  return <LovebirdsShell config={config} slug={slug} />
}
```

- [ ] **Step 4: page.tsx passes `isDemo={isDemoSlug}`**

In `src/app/[template]/[slug]/page.tsx`, the final render becomes:

```tsx
  return <InvitationView config={config} slug={slug} templateId={templateId} isDemo={isDemoSlug} />
```

- [ ] **Step 5: Build + manual check**

Run: `npm run build`. Then `npm run dev`:
- `/solary/demo-solary` → 🎨 floating switcher **present**, switching works.
- A real published Solary invite → 🎨 **absent**; palette equals `config.theme.defaultPalette`; opening the demo first then the real invite does NOT leak the demo palette (locked mode ignores sessionStorage).

- [ ] **Step 6: Commit**

```bash
git add src/all-templates/solary/contexts/ThemeContext.jsx src/all-templates/solary/Shell.jsx src/app/[template]/[slug]/InvitationView.tsx "src/app/[template]/[slug]/page.tsx"
git commit -m "feat(solary): lock palette on live invite, keep switcher on demo"
```

---

### Task 14: Theme PUT route

**Files:**
- Create: `src/app/api/invitation/[slug]/theme/route.ts`

- [ ] **Step 1: Create the route (mirrors background/route.ts)**

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'

interface Ctx { params: { slug: string } }

const ALLOWED_PALETTES = new Set([
  'cosmicDark', 'nebulaDark', 'roseDark', 'emeraldDark',
  'lavenderLight', 'sunburstLight', 'roseLight', 'botanicalLight',
])

/**
 * PUT /api/invitation/[slug]/theme
 * Body: { defaultPalette: string }
 * Owner-only. Updates config.theme.defaultPalette only (isolated like /background).
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = params
  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const palette = body?.defaultPalette
  if (typeof palette !== 'string' || !ALLOWED_PALETTES.has(palette)) {
    return NextResponse.json({ error: 'Invalid palette' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: row, error: fetchErr } = await (supabase.from('invitations') as any)
    .select('config').eq('id', owner.id).single()
  if (fetchErr || !row) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const cfg = { ...(row.config || {}) }
  cfg.theme = { ...(cfg.theme || {}), defaultPalette: palette }

  const savedAt = new Date().toISOString()
  const { error } = await (supabase.from('invitations') as any)
    .update({ config: cfg, updated_at: savedAt }).eq('id', owner.id)
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ ok: true, savedAt, defaultPalette: palette })
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: route compiles.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/invitation/[slug]/theme/route.ts"
git commit -m "feat(api): PUT /invitation/[slug]/theme to set config.theme.defaultPalette"
```

---

### Task 15: Palette dashboard tab (Solary only)

**Files:**
- Create: `src/app/[template]/[slug]/dashboard/PaletteTab.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`
- Modify: `src/lib/i18n/dictionaries/dashboard.ts`

- [ ] **Step 1: Add i18n keys** — in `dashboard.ts`, add to **both** `id.chrome.tabs` and `en.chrome.tabs`:

```ts
        palette: 'Palette',
```

Add a `palette` block under **both** `id.tabs` and `en.tabs` (mirror the `background` block placement):

```ts
// id.tabs.palette
      palette: {
        title: 'Palette Warna',
        subtitle: 'Pilih satu palette untuk undangan kamu. Tamu akan melihat palette ini.',
        groupDark: 'Gelap Kosmik',
        groupLight: 'Terang Pastel',
        save: 'Simpan',
        saving: 'Menyimpan…',
        savedOk: 'Tersimpan ✓',
        saveFailed: 'Gagal menyimpan',
        networkError: 'Gangguan jaringan',
      },
```

```ts
// en.tabs.palette
      palette: {
        title: 'Color Palette',
        subtitle: 'Pick one palette for your invitation. Guests will see this palette.',
        groupDark: 'Cosmic Dark',
        groupLight: 'Pastel Light',
        save: 'Save',
        saving: 'Saving…',
        savedOk: 'Saved ✓',
        saveFailed: 'Save failed',
        networkError: 'Network error',
      },
```

- [ ] **Step 2: Create PaletteTab.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'

const DARK = [
  { key: 'cosmicDark', label: 'Purple', swatch: '#7D53DE' },
  { key: 'nebulaDark', label: 'Nebula', swatch: '#c19bff' },
  { key: 'roseDark', label: 'Rose', swatch: '#e64980' },
  { key: 'emeraldDark', label: 'Emerald', swatch: '#0f9f8e' },
]
const LIGHT = [
  { key: 'lavenderLight', label: 'Lavender', swatch: '#b794f6' },
  { key: 'sunburstLight', label: 'Sunburst', swatch: '#f5c518' },
  { key: 'roseLight', label: 'Rose', swatch: '#f43f5e' },
  { key: 'botanicalLight', label: 'Botanical', swatch: '#3f9142' },
]

export default function PaletteTab({ slug, initial }: { slug: string; initial?: string }) {
  const t = useDashboardDict().tabs.palette
  const [palette, setPalette] = useState(initial || 'cosmicDark')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPalette: palette }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: e.error || t.saveFailed })
        return
      }
      setMsg({ kind: 'ok', text: t.savedOk })
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || t.networkError })
    } finally {
      setSaving(false)
    }
  }

  const Group = ({ title, items }: { title: string; items: typeof DARK }) => (
    <section style={section}>
      <h3 style={h3}>{title}</h3>
      <div style={grid}>
        {items.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPalette(p.key)}
            style={{ ...swatchBtn, borderColor: palette === p.key ? '#2A2118' : 'rgba(42,33,24,0.15)', outline: palette === p.key ? '2px solid #2A2118' : 'none' }}
          >
            <span style={{ ...dot, background: p.swatch }} />
            <span style={{ fontSize: 13 }}>{p.label}</span>
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <div style={card}>
      <header><h2 style={h2}>{t.title}</h2><p style={sub}>{t.subtitle}</p></header>
      <Group title={t.groupDark} items={DARK} />
      <Group title={t.groupLight} items={LIGHT} />
      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </button>
      </footer>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 28, boxShadow: '0 12px 36px rgba(42,33,24,0.06)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)' }
const section: React.CSSProperties = { display: 'grid', gap: 12, padding: 18, background: '#fff', borderRadius: 12, border: '1px solid rgba(42,33,24,0.08)' }
const h3: React.CSSProperties = { fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,33,24,0.6)', margin: 0, fontWeight: 600 }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }
const swatchBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid', background: '#fff', cursor: 'pointer', color: '#2A2118' }
const dot: React.CSSProperties = { width: 20, height: 20, borderRadius: '50%', display: 'inline-block' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid rgba(42,33,24,0.06)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const msgOk: React.CSSProperties = { fontSize: 12, color: '#2D8C4E', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: '#E8553E', marginRight: 'auto' }
```

- [ ] **Step 3: Wire the tab into DashboardClient (Solary only)**

In `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`:

Add the import:

```tsx
import PaletteTab from './PaletteTab'
```

Extend the tab union type and the tab list. Change the `useState` tab type to include `'palette'`:

```tsx
  const [tab, setTab] = useState<
    'rsvps' | 'gifts' | 'guests' | 'editor' | 'music' | 'background' | 'notes' | 'palette'
  >('rsvps')
```

Build the nav list conditionally so `palette` only appears for Solary:

```tsx
  const tabKeys = (
    template === 'solary'
      ? (['rsvps', 'gifts', 'guests', 'notes', 'editor', 'palette', 'music', 'background'] as const)
      : (['rsvps', 'gifts', 'guests', 'notes', 'editor', 'music', 'background'] as const)
  )
```

Replace the `.map` source in the `<nav>` from the inline array to `tabKeys.map((t) => ( … ))`.

Render the panel after the `background` block:

```tsx
        {tab === 'palette' && (
          <PaletteTab slug={slug} initial={invitation.config?.theme?.defaultPalette} />
        )}
```

- [ ] **Step 4: dict parity + build**

Run: `npm test -- dict-parity && npm run build`
Expected: dict-parity PASS; build clean.

- [ ] **Step 5: Manual browser check**

Solary dashboard → "Palette" tab visible → pick a palette → Save → reload live invite reflects it. Lovebirds dashboard → no "Palette" tab.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/PaletteTab.tsx" "src/app/[template]/[slug]/dashboard/DashboardClient.tsx" src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(dashboard): solary Palette tab writing config.theme.defaultPalette"
```

---

# PHASE 5 — Full verification & regression

### Task 16: End-to-end verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (existing + new schema-registry / template-policy / editor-reducer / dict-parity).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build, no type errors.

- [ ] **Step 3: Solary editor walkthrough** (`npm run dev`, Solary invite dashboard → Editor)

Verify each:
- [ ] Every section shows real fields (no "Unknown section").
- [ ] No "+ Add section"; locked rows (Intro/Saturn/Sun) show 🔒, no drag, no remove.
- [ ] Saturn editable: change heading + add/replace a ring photo + caption → saved → reflected on live invite ring.
- [ ] Swap a middle slot (e.g. Venus → faqPlanet → schedulePlanet): props replaced with defaults, `planetKey` preserved, preview camera still focuses that planet.
- [ ] Drag-reorder two middle slots → order persists after save; Saturn index unchanged; Intro first, Sun last.
- [ ] All 4 new sections render correctly on one dark + one light palette.

- [ ] **Step 4: Palette walkthrough**
- [ ] Palette tab pick + save → live invite uses it; 🎨 absent on live invite; 🎨 present on `/solary/demo-solary`.

- [ ] **Step 5: Lovebirds regression**
- [ ] Lovebirds editor unchanged: Add section present, free reorder, all sections editable, no swap dropdown, no Palette tab.

- [ ] **Step 6: Final commit (if any verification fixups were needed)**

```bash
git add -- <only the specific files you fixed>
git commit -m "fix(solary): verification fixups"
```

---

## Self-review notes (spec coverage)

- Spec §1 template-aware schemas → Tasks 3, 5.
- Spec §2 slot policy / fixed count / locks → Tasks 6, 8.
- Spec §3 swap type → Tasks 7, 9.
- Spec §4 reorder rules → Tasks 6, 8.
- Spec §5 four new sections → Tasks 10, 11, 12.
- Spec §6 palette in dashboard + live lock → Tasks 13, 14, 15.
- Editing depth (nested arrays, string lists) needed for "full like Lovebirds" → Tasks 1, 2.
- i18n parity preserved → keys added in both id/en in Tasks 9, 15.
