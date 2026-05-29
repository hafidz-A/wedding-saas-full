# Solary — Editable Template + Swappable Sections + Palette in Dashboard (Design)

**Date:** 2026-05-29
**Scope:** Make the Solary template editable from the dashboard, the same way Lovebirds is, but adapted to Solary's fixed solar-system structure. Add 4 optional wedding sections that the couple can swap into existing planet slots, and move palette selection from the live invitation into the dashboard.

---

## Background

- The dashboard editor (`src/editor/*`) is **template-blind**: it always reads one global `schemaRegistry` (`src/editor/schemas/index.ts`) whose keys are Lovebirds section types. Solary's section types (`openingGate`, `welcomePlanet`, `storyPlanet`, …) have no schema, so the editor renders the "unknown section" fallback. Solary is effectively **not editable** today.
- Solary's rendering is driven by `config.sections[]`, where each section binds to a 3D body via `section.props.planetKey`. The Three.js scene (`src/all-templates/solary/three/galacticScene.js`) hardcodes **8 planets + Sun + Andromeda**. `rhythm.js` reads section order and drives the camera planet-by-planet using `planetKey`.
- **Saturn's gallery is physically parented to the Saturn 3D mesh** (`planetGroups.saturn.add(photoRingGroup)`) with bespoke camera framing. That is why it cannot move.
- Palette is already wired: `ThemeProvider` reads `config.theme.defaultPalette`; the floating `PaletteSwitcher` (🎨) is a runtime, sessionStorage-backed override. The homepage demo (`/solary/demo-solary`) and real invites both render through the same `SolaryShell`, and `[template]/[slug]/page.tsx` already computes `isDemoSlug`.

These facts pin the constraints below.

## Goals

1. Solary sections are fully editable in the dashboard editor (text, datetime, boolean, image, image-array, object-array), matching the Lovebirds editing experience.
2. The section **count stays fixed** (no add / no remove) because each section occupies a fixed 3D body slot.
3. **Saturn (gallery) cannot be moved or retyped**, but its photos, heading, and captions remain fully editable.
4. The couple can **swap the section type** of any non-locked slot via a per-slot dropdown, choosing from a pool that includes the 7 default middle types plus 4 new ones.
5. The couple can **reorder** non-locked slots by drag, with Intro pinned first, Sun pinned last, and Saturn pinned at its slot.
6. Add 4 new Solary-styled sections: **Quote/Ayat, Rundown Acara, Live Streaming, FAQ**.
7. Move palette selection into a dashboard **"Palette" tab**; lock the live invitation to the couple's chosen palette (hide 🎨); keep 🎨 on the homepage demo.

## Non-Goals

- Changing the 3D scene, planet set, orbits, or camera logic.
- Touching the Lovebirds template, its schemas, or its editing behavior (must stay byte-identical in output).
- Per-section custom palette overrides (palette is one page-level choice).
- WYSIWYG click-in-preview editing or undo/redo (out of scope, same as Sprint 1).
- DB schema changes (everything persists inside the existing `config` JSONB).
- Letting guests switch palette on a published invite (explicitly locked to couple's choice).

---

## Architecture

### 1. Template-scoped editor schemas

Refactor the editor to select a schema registry by `template` instead of using one global object.

```
src/editor/schemas/
├── index.ts                 ← getSchemaRegistry(template); existing Lovebirds schemaRegistry kept here
├── types.ts                 ← unchanged (FieldDef, SectionSchema, Localized…)
├── hero.ts, countdown.ts, … ← existing Lovebirds schemas, untouched, stay in place
└── solary/
    ├── index.ts             ← solarySchemaRegistry barrel
    ├── openingGate.ts, welcomePlanet.ts, storyPlanet.ts, saturnRing.ts,
    │   countdownPlanet.ts, detailsPlanet.ts, rsvpPlanet.ts, teamPlanet.ts,
    │   giftPlanet.ts, footerPlanet.ts          ← 10 existing types
    └── quotePlanet.ts, schedulePlanet.ts, liveStreamPlanet.ts, faqPlanet.ts  ← 4 new
```

- `getSchemaRegistry(template: string)` returns the matching registry, defaulting to Lovebirds.
- Lovebirds schema files are **not moved** — the only hard requirement is that `getSchemaRegistry('solary')` returns the Solary set and `('lovebirds')`/unknown returns the existing one. This avoids touching the many Lovebirds imports.
- `FieldEditor`, `SectionList`, `AddSectionMenu` already receive (or can trivially receive) `template`; switch them from the global `schemaRegistry` import to `getSchemaRegistry(template)`.

Each Solary schema mirrors the inline `schema:` already present per section in `config/pageConfig.js`, upgraded to the typed `SectionSchema` shape (with `id`/`en` labels and a `defaults` block for swap-in placeholder content). The `planetKey`, `planetName`, and `sectionLabel` props are **intentionally not exposed** as editable fields — they are slot identity / scene wiring.

### 2. Slot policy (fixed count, locks, swap pool)

Introduce a per-template **slot policy** consumed by the editor UI (a small declarative module, e.g. `src/editor/templatePolicy.ts`):

```ts
type TemplatePolicy = {
  fixedSections: boolean        // true for solary → hide Add/Remove
  // section id → lock rules
  locks: Record<string, { lockType?: boolean; lockPosition?: boolean }>
  // types a non-locked slot may be swapped to
  swappablePool: string[]
  pinnedFirstId?: string        // 'intro'
  pinnedLastId?: string         // 'sun'
}
```

Solary policy:

| Section id | planetKey | Default type | Lock | Editable content |
|---|---|---|---|---|
| intro | (andromeda) | openingGate | type + position (first) | yes |
| neptune | neptune | welcomePlanet | — (swap + reorder) | yes |
| uranus | uranus | storyPlanet | — | yes |
| **saturn** | **saturn** | **saturnRing** | **type + position** | **yes (photos, heading, captions)** |
| jupiter | jupiter | countdownPlanet | — | yes |
| mars | mars | detailsPlanet | — | yes |
| earth | earth | rsvpPlanet | — | yes |
| venus | venus | teamPlanet | — | yes |
| mercury | mercury | giftPlanet | — | yes |
| sun | sun | footerPlanet | type + position (last) | yes |

`swappablePool` = `[welcomePlanet, storyPlanet, countdownPlanet, detailsPlanet, rsvpPlanet, teamPlanet, giftPlanet, quotePlanet, schedulePlanet, liveStreamPlanet, faqPlanet]` (11 types). Locked types (`openingGate`, `saturnRing`, `footerPlanet`) are **not** in the pool. Duplicates across slots are allowed (couple's choice; no uniqueness enforcement in v1).

The policy keys slots by **section id**, not by index, so reordering does not change which slots are locked.

### 3. Swap type (per-slot dropdown)

In `SectionList` / the selected-section header, a non-locked slot shows a **"Ganti tipe section"** dropdown listing `swappablePool` types (localized labels from `getSchemaRegistry`).

On change:
1. Confirm dialog: "Mengganti tipe akan mengganti isi section ini dengan konten contoh. Lanjutkan?"
2. New reducer action `CHANGE_SECTION_TYPE`: keep `{ id, enabled, navHidden, props.planetKey, props.planetName }`; set `type` to the new type; set `props` to `{ planetKey, planetName, ...newType.defaults }` (placeholder content from the target schema's `defaults`). `navLabel` resets to the new type's default label unless the couple set a custom one (keep custom).
3. The preview iframe refreshes; the camera still focuses the same planet because `planetKey` is preserved.

For locked-type slots, the dropdown is not rendered (replaced by a small "Terkunci" hint), but the field form still renders so content stays editable.

### 4. Reorder rules

`SectionList` drag-drop (existing `@dnd-kit`) gains constraints from the slot policy:
- Pinned-first (`intro`) and pinned-last (`sun`) rows are not draggable and cannot be displaced from the ends.
- Saturn is not draggable and stays at its current array index.
- The remaining slots reorder freely in the gaps. The `reorderSections` handler clamps so pinned/locked indices are preserved (compute the movable index set, reorder only within it).
- Locked rows render without a drag handle and without enable/disable toggle removal of position.

`enabled` toggle (hide a planet) — open question deferred: hiding a middle planet is allowed (scene simply skips it via `enabled === false`, already supported by `rhythm.js`/`Shell`). Intro/Saturn/Sun cannot be disabled.

### 5. Four new Solary sections

All are plain prop-driven React components following the `DetailsPlanet` pattern: `<div className="section-stage"><GlassCard title={sectionLabel} planetName={planetName}>…</GlassCard></div>`. They render at whatever planet slot hosts them and need no scene changes. Registered in `src/all-templates/solary/config/sectionRegistry.js`.

| Type | Component | Props (content) |
|---|---|---|
| `quotePlanet` | `QuotePlanet.jsx` | `heading?`, `verse` (textarea), `source` (text, e.g. "QS Ar-Rum: 21"), `translation?` (textarea) |
| `schedulePlanet` | `SchedulePlanet.jsx` | `heading`, `events: [{ time, title, desc }]` (objectArray) |
| `liveStreamPlanet` | `LiveStreamPlanet.jsx` | `heading`, `platform` (select: youtube/instagram/zoom/other), `url` (text), `scheduledAt` (datetime), `note?` (textarea) |
| `faqPlanet` | `FaqPlanet.jsx` | `heading`, `items: [{ q, a }]` (objectArray) |

Each has a matching `src/editor/schemas/solary/*.ts` with localized labels and a `defaults` block (placeholder content shown when swapped in). They respect Solary CSS variables (`--color-accent`, `--color-fg`, `--font-display`, etc.) so all 8 palettes work.

### 6. Palette in dashboard + lock on live invite

**Dashboard "Palette" tab** (Solary-only), mirroring `MusicTab` / `BackgroundTab`:
- New component `src/app/[template]/[slug]/dashboard/PaletteTab.tsx`. Shown only when `template === 'solary'` (tab list is conditional on template).
- 8 swatches (grouped Dark / Light, reusing the labels from `PaletteSwitcher`). Selecting one sets `config.theme.defaultPalette`.
- Persist via a small PUT route `src/app/api/invitation/[slug]/theme/route.ts` that merges `{ theme: { defaultPalette } }` into the row's `config` (same auth/ownership check as the other config routes). Initial value read from `invitation.config?.theme?.defaultPalette`.

**Live invitation lock:**
- `[template]/[slug]/page.tsx` passes `isDemo={isDemoSlug}` to `InvitationView`, which forwards it to `SolaryShell`.
- `SolaryShell` renders `<PaletteSwitcher />` only when `isDemo` is true.
- `ThemeProvider` gains an `allowGuestSwitch` (default true) prop. When false (real invite), it **ignores sessionStorage** and locks to `config.theme.defaultPalette` so a stale demo session doesn't leak across routes.
- Homepage demo path keeps `isDemo === true` → 🎨 stays, current behavior unchanged.

---

## Data flow

```
config.sections[]  ──Shell/SectionRenderer──▶ planet components (by type)
        │                                         ▲
        │ planetKey ──rhythm.js──▶ galacticScene camera
        ▼
   editor (getSchemaRegistry('solary')) ── edit fields / swap type / reorder ──▶ PUT /api/invitation/[slug]/config
config.theme.defaultPalette ── PaletteTab ──▶ PUT /api/invitation/[slug]/theme ──▶ ThemeProvider(defaultPalette, allowGuestSwitch=false)
```

## Files touched (summary)

**Editor core (template-aware):**
- `src/editor/schemas/index.ts` — add `getSchemaRegistry(template)`; keep exporting the current Lovebirds `schemaRegistry` in place (no file moves) to avoid import churn.
- `src/editor/schemas/solary/*.ts` — 14 schemas (new) + a `solary/index.ts` barrel exporting `solarySchemaRegistry`.
- `src/editor/FieldEditor.tsx`, `SectionList.tsx`, `AddSectionMenu.tsx` — use `getSchemaRegistry(template)`; honor slot policy (hide Add/Remove, render swap dropdown, constrain DnD).
- `src/editor/EditorProvider.tsx` — add `CHANGE_SECTION_TYPE`; clamp `REORDER_SECTIONS` to movable set; gate add/remove when `fixedSections`.
- `src/editor/templatePolicy.ts` — slot policy per template (new).

**New Solary sections:**
- `src/all-templates/solary/sections/{QuotePlanet,SchedulePlanet,LiveStreamPlanet,FaqPlanet}.jsx` (new).
- `src/all-templates/solary/config/sectionRegistry.js` — register 4 new types.

**Palette:**
- `src/app/[template]/[slug]/dashboard/PaletteTab.tsx` (new) + tab wiring in `DashboardClient.tsx` (conditional on template).
- `src/app/api/invitation/[slug]/theme/route.ts` (new).
- `src/all-templates/solary/Shell.jsx` — accept/forward `isDemo`; conditional `<PaletteSwitcher />`.
- `src/all-templates/solary/contexts/ThemeContext.jsx` — `allowGuestSwitch` prop.
- `src/app/[template]/[slug]/InvitationView.tsx` + `page.tsx` — thread `isDemo`.

**i18n:** dashboard dictionary entries for the new tab, swap dropdown, lock hints, and new section labels (id/en).

## Testing / verification

- `getSchemaRegistry('solary')` returns 14 schemas; `('lovebirds')` and unknown default to Lovebirds.
- Editor on a Solary invite: every default section shows real fields (no "unknown section"); Add/Remove hidden; Saturn shows fields but no type dropdown and is not draggable; Intro stays first, Sun stays last under drag.
- Swap a middle slot (e.g. Venus teamPlanet → faqPlanet): props replaced with FAQ defaults, `planetKey` preserved, preview still focuses Venus.
- Reorder two middle slots: order persists; Saturn index unchanged.
- Palette tab: pick a palette → save → reload live invite shows it; 🎨 absent on live invite; 🎨 present on `/solary/demo-solary`.
- Lovebirds editor unchanged (regression check); build clean; existing editor tests pass.
- Manual browser check of all 4 new sections across at least one dark + one light palette.

## Open questions / risks

- **`navLabel` on swap** — keep custom, else reset to new type default (decided: keep custom if present).
- **Hiding a middle planet** (`enabled=false`) is allowed but creates a journey with fewer stops; acceptable, already supported by the scene. Locked slots can't be hidden.
