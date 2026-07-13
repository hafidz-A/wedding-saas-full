# Sprint 1 — Block-Based Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the JSON-preview stub in the `editor` dashboard tab with a working schema-driven editor that lets a couple reorder sections, edit fields, upload images, and publish their invitation entirely from the dashboard.

**Architecture:** A new isolated namespace `src/editor/` holds the editor framework. A `SectionSchema` per section type drives a generic form renderer (`<FieldEditor>`). State lives in a React Context (`<EditorProvider>`) holding a working copy of the page config; the user clicks **Save** to PUT the full config to a new server route. Image upload goes through a new `/api/upload` route that writes to the existing `invitation-media` Supabase Storage bucket. Drag-drop uses `@dnd-kit`.

**Tech Stack:**
- Next.js 14 App Router, React 18, TypeScript
- `@supabase/supabase-js` (service-role on server)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (new)
- Existing per-slug admin session cookie (`wsaas_admin_<slug>`)

**Spec reference:** [`docs/superpowers/specs/2026-05-21-sprint-1-block-based-editor-design.md`](../specs/2026-05-21-sprint-1-block-based-editor-design.md)

**Notes for the implementer:**
- This project is **not a git repo** (`Is a git repository: false`). Skip every `git commit` step you would normally do at the end of a task. Instead, treat each task as a checkpoint where the dev server still boots and `npm run build` is green.
- The project has **no test framework installed**. Plan uses manual smoke-test steps (click-through in browser) plus `npm run build` for type-checking. Do not introduce a test framework as part of Sprint 1.
- All existing section components live in `src/sections/<Name>/<Name>.jsx` and accept their props as `function Name(props)`. The schemas in Task 2 mirror the prop shapes you can verify directly in [`src/config/pageConfig.js`](../../../src/config/pageConfig.js).

---

## File Structure (created by this plan)

```
src/
├── app/
│   ├── [slug]/dashboard/
│   │   └── DashboardClient.tsx                  ← MODIFIED in Task 14
│   └── api/
│       ├── invitation/[slug]/
│       │   ├── config/route.ts                  ← NEW Task 5
│       │   └── publish/route.ts                 ← NEW Task 6
│       └── upload/route.ts                      ← NEW Task 7
├── editor/                                       ← NEW (Tasks 1–14)
│   ├── EditorRoot.tsx                            (Task 14)
│   ├── EditorProvider.tsx                        (Task 3)
│   ├── SectionList.tsx                           (Task 12)
│   ├── SectionRow.tsx                            (Task 12)
│   ├── AddSectionMenu.tsx                        (Task 12)
│   ├── FieldEditor.tsx                           (Task 11)
│   ├── SaveBar.tsx                               (Task 13)
│   ├── fields/
│   │   ├── TextField.tsx                         (Task 4)
│   │   ├── TextareaField.tsx                     (Task 4)
│   │   ├── DatetimeField.tsx                     (Task 4)
│   │   ├── BooleanField.tsx                      (Task 4)
│   │   ├── SelectField.tsx                       (Task 4)
│   │   ├── ImageField.tsx                        (Task 8)
│   │   ├── ImageArrayField.tsx                   (Task 9)
│   │   └── ObjectArrayField.tsx                  (Task 10)
│   ├── schemas/
│   │   ├── types.ts                              (Task 1)
│   │   ├── index.ts                              (Task 2)
│   │   └── <17 schema files>                     (Task 2)
│   ├── lib/
│   │   ├── auth.ts                               (Task 5)
│   │   ├── deepEqual.ts                          (Task 3)
│   │   └── useUpload.ts                          (Task 7)
│   └── editor.module.css                         (Task 14)
└── (everything else unchanged)
```

---

### Task 1: Install dnd-kit + define schema types

**Files:**
- Modify: `package.json`
- Create: `src/editor/schemas/types.ts`

- [ ] **Step 1.1: Install dnd-kit packages**

Run:
```
npm install @dnd-kit/core@^6 @dnd-kit/sortable@^7 @dnd-kit/utilities@^3
```

Expected: 3 packages added, no peer-dep warnings (React 18 is supported).

- [ ] **Step 1.2: Create schema type definitions**

Create `src/editor/schemas/types.ts`:

```ts
/**
 * Schema-driven editor type definitions. A SectionSchema describes the
 * editable surface of one section type (matching a key in sectionRegistry).
 * <FieldEditor> walks the `fields` array and renders inputs generically.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'image'
  | 'imageArray'
  | 'objectArray'

export interface BaseField {
  key: string
  label: string
  help?: string
}

export interface TextField extends BaseField {
  type: 'text'
}
export interface TextareaField extends BaseField {
  type: 'textarea'
  rows?: number
}
export interface DatetimeField extends BaseField {
  type: 'datetime'
}
export interface BooleanField extends BaseField {
  type: 'boolean'
}
export interface SelectField extends BaseField {
  type: 'select'
  options: { value: string; label: string }[]
}
export interface ImageField extends BaseField {
  type: 'image'
}
export interface ImageArrayField extends BaseField {
  type: 'imageArray'
  /** When true, items are objects with a `src` (e.g. gallery.images[].src);
   *  otherwise items are plain URL strings (e.g. hero.blastPhotos[]). */
  itemIsObject?: boolean
  /** Property name of the URL when itemIsObject is true (default: 'src'). */
  urlKey?: string
}
export interface ObjectArrayField extends BaseField {
  type: 'objectArray'
  /** Sub-schema for each row in the array. */
  itemFields: FieldDef[]
  /** Template used when adding a new row. */
  newItem: Record<string, unknown>
  /** Label key from the item used in the row header (e.g. 'title', 'name'). */
  itemLabelKey?: string
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

export interface SectionSchema {
  type: string
  label: string
  fields: FieldDef[]
}
```

- [ ] **Step 1.3: Verify**

Run:
```
npm run build
```
Expected: build succeeds. (Types are unused so far; this only confirms TypeScript can parse the new file.)

---

### Task 2: Define all 17 section schemas + registry

**Files:**
- Create: `src/editor/schemas/index.ts`
- Create: `src/editor/schemas/hero.ts`
- Create: `src/editor/schemas/ourStory.ts`
- Create: `src/editor/schemas/eventDetails.ts`
- Create: `src/editor/schemas/brideGroom.ts`
- Create: `src/editor/schemas/weddingParty.ts`
- Create: `src/editor/schemas/gallery.ts`
- Create: `src/editor/schemas/galleryHelix.ts`
- Create: `src/editor/schemas/gallerySpringCoil.ts`
- Create: `src/editor/schemas/schedule.ts`
- Create: `src/editor/schemas/rsvp.ts`
- Create: `src/editor/schemas/weddingGift.ts`
- Create: `src/editor/schemas/registry.ts`
- Create: `src/editor/schemas/accommodations.ts`
- Create: `src/editor/schemas/faq.ts`
- Create: `src/editor/schemas/guestbook.ts`
- Create: `src/editor/schemas/playlist.ts`
- Create: `src/editor/schemas/footer.ts`

Prop shapes are derived from [`src/config/pageConfig.js`](../../../src/config/pageConfig.js). When in doubt, that file is the source of truth.

- [ ] **Step 2.1: Hero schema**

Create `src/editor/schemas/hero.ts`:

```ts
import type { SectionSchema } from './types'

export const heroSchema: SectionSchema = {
  type: 'hero',
  label: 'Hero',
  fields: [
    { key: 'coupleName',       label: 'Couple name',   type: 'text' },
    { key: 'brideName',        label: 'Bride name',    type: 'text' },
    { key: 'groomName',        label: 'Groom name',    type: 'text' },
    { key: 'weddingDate',      label: 'Wedding date',  type: 'datetime' },
    { key: 'venue',            label: 'Venue',         type: 'text' },
    { key: 'welcomeText',      label: 'Welcome text',  type: 'textarea', rows: 2 },
    { key: 'scrollHint',       label: 'Scroll hint',   type: 'text' },
    { key: 'countdownEnabled', label: 'Show countdown', type: 'boolean' },
    { key: 'gateImage',        label: 'Gate image',     type: 'image' },
    { key: 'blastPhotos',      label: 'Blast photos',   type: 'imageArray' },
  ],
}
```

- [ ] **Step 2.2: Our Story schema**

Create `src/editor/schemas/ourStory.ts`:

```ts
import type { SectionSchema } from './types'

export const ourStorySchema: SectionSchema = {
  type: 'ourStory',
  label: 'Our Story',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'stories',
      label: 'Story cards',
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { id: '', year: '', date: '', title: '', description: '', image: '' },
      itemFields: [
        { key: 'year',        label: 'Year',        type: 'text' },
        { key: 'date',        label: 'Date',        type: 'text' },
        { key: 'title',       label: 'Title',       type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'image',       label: 'Image',       type: 'image' },
      ],
    },
  ],
}
```

- [ ] **Step 2.3: Event Details schema**

Create `src/editor/schemas/eventDetails.ts`:

```ts
import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: 'Coral' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'gold',    label: 'Gold' },
  { value: 'sky',     label: 'Sky' },
  { value: 'purple',  label: 'Purple' },
]

export const eventDetailsSchema: SectionSchema = {
  type: 'eventDetails',
  label: 'Event Details',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'events',
      label: 'Events',
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { id: '', label: '', icon: '', date: '', time: '', location: '', accent: 'coral' },
      itemFields: [
        { key: 'label',    label: 'Label',    type: 'text' },
        { key: 'icon',     label: 'Icon',     type: 'text' },
        { key: 'date',     label: 'Date',     type: 'text' },
        { key: 'time',     label: 'Time',     type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'accent',   label: 'Accent',   type: 'select', options: ACCENTS },
      ],
    },
    { key: 'mapEmbed', label: 'Map embed URL', type: 'textarea', rows: 3 },
  ],
}
```

- [ ] **Step 2.4: Bride & Groom schema**

Create `src/editor/schemas/brideGroom.ts`:

```ts
import type { SectionSchema } from './types'

export const brideGroomSchema: SectionSchema = {
  type: 'brideGroom',
  label: 'Bride & Groom',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'people',
      label: 'People',
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { role: '', name: '', photo: '', parents: '', bio: '', instagram: '', direction: 'right' },
      itemFields: [
        { key: 'role',      label: 'Role',      type: 'text' },
        { key: 'name',      label: 'Name',      type: 'text' },
        { key: 'photo',     label: 'Photo',     type: 'image' },
        { key: 'parents',   label: 'Parents',   type: 'text' },
        { key: 'bio',       label: 'Bio',       type: 'textarea', rows: 3 },
        { key: 'instagram', label: 'Instagram', type: 'text' },
        { key: 'direction', label: 'Image side', type: 'select', options: [
          { value: 'left',  label: 'Left' },
          { value: 'right', label: 'Right' },
        ] },
      ],
    },
  ],
}
```

- [ ] **Step 2.5: Wedding Party schema**

Create `src/editor/schemas/weddingParty.ts`:

```ts
import type { SectionSchema } from './types'

export const weddingPartySchema: SectionSchema = {
  type: 'weddingParty',
  label: 'Wedding Party',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'people',
      label: 'People',
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', role: '', photo: '' },
      itemFields: [
        { key: 'name',  label: 'Name',  type: 'text' },
        { key: 'role',  label: 'Role',  type: 'text' },
        { key: 'photo', label: 'Photo', type: 'image' },
      ],
    },
  ],
}
```

- [ ] **Step 2.6: Gallery schema**

Create `src/editor/schemas/gallery.ts`:

```ts
import type { SectionSchema } from './types'

export const gallerySchema: SectionSchema = {
  type: 'gallery',
  label: 'Gallery',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'images',
      label: 'Images',
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { id: '', src: '', caption: '', tall: false },
      itemFields: [
        { key: 'src',     label: 'Image',     type: 'image' },
        { key: 'caption', label: 'Caption',   type: 'text' },
        { key: 'tall',    label: 'Tall (2-row)', type: 'boolean' },
      ],
    },
  ],
}
```

- [ ] **Step 2.7: Gallery Helix schema**

Create `src/editor/schemas/galleryHelix.ts`:

```ts
import type { SectionSchema } from './types'

export const galleryHelixSchema: SectionSchema = {
  type: 'galleryHelix',
  label: 'Gallery (Helix)',
  fields: [
    { key: 'sectionTitle',    label: 'Title',    type: 'text' },
    { key: 'sectionSubtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'photos',
      label: 'Photos',
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { src: '', caption: '' },
      itemFields: [
        { key: 'src',     label: 'Image',   type: 'image' },
        { key: 'caption', label: 'Caption', type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 2.8: Gallery Spring Coil schema**

Create `src/editor/schemas/gallerySpringCoil.ts`:

```ts
import type { SectionSchema } from './types'

export const gallerySpringCoilSchema: SectionSchema = {
  type: 'gallerySpringCoil',
  label: 'Gallery (Spring Coil)',
  fields: [
    { key: 'sectionTitle',    label: 'Title',    type: 'text' },
    { key: 'sectionSubtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'photos',
      label: 'Photos',
      type: 'objectArray',
      itemLabelKey: 'caption',
      newItem: { src: '', caption: '' },
      itemFields: [
        { key: 'src',     label: 'Image',   type: 'image' },
        { key: 'caption', label: 'Caption', type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 2.9: Schedule schema**

Create `src/editor/schemas/schedule.ts`:

```ts
import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: 'Coral' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'gold',    label: 'Gold' },
  { value: 'sky',     label: 'Sky' },
  { value: 'purple',  label: 'Purple' },
]

export const scheduleSchema: SectionSchema = {
  type: 'schedule',
  label: 'Schedule',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'events',
      label: 'Schedule items',
      type: 'objectArray',
      itemLabelKey: 'title',
      newItem: { id: '', time: '', title: '', description: '', accent: 'coral', icon: '' },
      itemFields: [
        { key: 'time',        label: 'Time',        type: 'text' },
        { key: 'title',       label: 'Title',       type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
        { key: 'accent',      label: 'Accent',      type: 'select', options: ACCENTS },
        { key: 'icon',        label: 'Icon',        type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 2.10: RSVP schema**

Create `src/editor/schemas/rsvp.ts`:

```ts
import type { SectionSchema } from './types'

export const rsvpSchema: SectionSchema = {
  type: 'rsvp',
  label: 'RSVP',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'mealOptions',
      label: 'Meal options',
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { value: '', label: '' },
      itemFields: [
        { key: 'value', label: 'Value (machine)', type: 'text' },
        { key: 'label', label: 'Label (display)', type: 'text' },
      ],
    },
    { key: 'maxGuests', label: 'Max guests per RSVP', type: 'text' },
  ],
}
```

- [ ] **Step 2.11: Wedding Gift schema**

Create `src/editor/schemas/weddingGift.ts`:

```ts
import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: 'Coral' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'gold',    label: 'Gold' },
  { value: 'sky',     label: 'Sky' },
  { value: 'purple',  label: 'Purple' },
]

export const weddingGiftSchema: SectionSchema = {
  type: 'weddingGift',
  label: 'Wedding Gift',
  fields: [
    { key: 'title',               label: 'Title',                 type: 'text' },
    { key: 'subtitle',            label: 'Subtitle',              type: 'text' },
    { key: 'intro',               label: 'Intro',                 type: 'textarea', rows: 3 },
    { key: 'confirmationEnabled', label: 'Show confirmation form', type: 'boolean' },
    {
      key: 'accounts',
      label: 'Accounts',
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', type: 'bank', name: '', accountNumber: '', accountHolder: '', accent: 'coral' },
      itemFields: [
        { key: 'type',          label: 'Type', type: 'select', options: [
          { value: 'bank',    label: 'Bank' },
          { value: 'ewallet', label: 'E-wallet' },
        ] },
        { key: 'name',          label: 'Bank / wallet name', type: 'text' },
        { key: 'accountNumber', label: 'Account number',     type: 'text' },
        { key: 'accountHolder', label: 'Account holder',     type: 'text' },
        { key: 'accent',        label: 'Accent',             type: 'select', options: ACCENTS },
      ],
    },
    { key: 'giftAddress', label: 'Physical-gift address', type: 'textarea', rows: 3 },
  ],
}
```

- [ ] **Step 2.12: Registry schema**

Create `src/editor/schemas/registry.ts`:

```ts
import type { SectionSchema } from './types'

const ACCENTS = [
  { value: 'coral',   label: 'Coral' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'gold',    label: 'Gold' },
  { value: 'sky',     label: 'Sky' },
  { value: 'purple',  label: 'Purple' },
]

export const registrySchema: SectionSchema = {
  type: 'registry',
  label: 'Registry',
  fields: [
    { key: 'title',   label: 'Title',   type: 'text' },
    { key: 'message', label: 'Message', type: 'textarea', rows: 3 },
    {
      key: 'platforms',
      label: 'Registry platforms',
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', description: '', url: '', accent: 'coral' },
      itemFields: [
        { key: 'name',        label: 'Name',        type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
        { key: 'url',         label: 'URL',         type: 'text' },
        { key: 'accent',      label: 'Accent',      type: 'select', options: ACCENTS },
      ],
    },
  ],
}
```

- [ ] **Step 2.13: Accommodations schema**

Create `src/editor/schemas/accommodations.ts`:

```ts
import type { SectionSchema } from './types'

export const accommodationsSchema: SectionSchema = {
  type: 'accommodations',
  label: 'Accommodations',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'hotels',
      label: 'Hotels',
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', distance: '', description: '', price: '', phone: '', tag: '' },
      itemFields: [
        { key: 'name',        label: 'Name',        type: 'text' },
        { key: 'distance',    label: 'Distance',    type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
        { key: 'price',       label: 'Price',       type: 'text' },
        { key: 'phone',       label: 'Phone',       type: 'text' },
        { key: 'tag',         label: 'Tag',         type: 'text' },
      ],
    },
    {
      key: 'tips',
      label: 'Travel tips',
      type: 'objectArray',
      itemLabelKey: 'text',
      newItem: { id: '', icon: '', text: '' },
      itemFields: [
        { key: 'icon', label: 'Icon', type: 'text' },
        { key: 'text', label: 'Text', type: 'textarea', rows: 2 },
      ],
    },
  ],
}
```

- [ ] **Step 2.14: FAQ schema**

Create `src/editor/schemas/faq.ts`:

```ts
import type { SectionSchema } from './types'

export const faqSchema: SectionSchema = {
  type: 'faq',
  label: 'FAQ',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'items',
      label: 'Questions',
      type: 'objectArray',
      itemLabelKey: 'q',
      newItem: { id: '', q: '', a: '' },
      itemFields: [
        { key: 'q', label: 'Question', type: 'text' },
        { key: 'a', label: 'Answer',   type: 'textarea', rows: 3 },
      ],
    },
  ],
}
```

- [ ] **Step 2.15: Guestbook schema**

Create `src/editor/schemas/guestbook.ts`:

```ts
import type { SectionSchema } from './types'

const COLORS = [
  { value: 'coral',  label: 'Coral' },
  { value: 'gold',   label: 'Gold' },
  { value: 'sky',    label: 'Sky' },
  { value: 'mint',   label: 'Mint' },
  { value: 'purple', label: 'Purple' },
]

export const guestbookSchema: SectionSchema = {
  type: 'guestbook',
  label: 'Guestbook',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'initialNotes',
      label: 'Seeded notes',
      type: 'objectArray',
      itemLabelKey: 'name',
      newItem: { id: '', name: '', message: '', color: 'gold' },
      itemFields: [
        { key: 'name',    label: 'Name',    type: 'text' },
        { key: 'message', label: 'Message', type: 'textarea', rows: 2 },
        { key: 'color',   label: 'Color',   type: 'select', options: COLORS },
      ],
    },
  ],
}
```

- [ ] **Step 2.16: Playlist schema**

Create `src/editor/schemas/playlist.ts`:

```ts
import type { SectionSchema } from './types'

export const playlistSchema: SectionSchema = {
  type: 'playlist',
  label: 'Playlist',
  fields: [
    { key: 'title',    label: 'Title',    type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    {
      key: 'initialSongs',
      label: 'Seeded songs',
      type: 'objectArray',
      itemLabelKey: 'song',
      newItem: { id: '', song: '', artist: '' },
      itemFields: [
        { key: 'song',   label: 'Song',   type: 'text' },
        { key: 'artist', label: 'Artist', type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 2.17: Footer schema**

Create `src/editor/schemas/footer.ts`:

```ts
import type { SectionSchema } from './types'

export const footerSchema: SectionSchema = {
  type: 'footer',
  label: 'Footer',
  fields: [
    { key: 'monogram',   label: 'Monogram',   type: 'text' },
    { key: 'hashtag',    label: 'Hashtag',    type: 'text' },
    { key: 'message',    label: 'Message',    type: 'textarea', rows: 2 },
    { key: 'coupleName', label: 'Couple name', type: 'text' },
    {
      key: 'socials',
      label: 'Socials',
      type: 'objectArray',
      itemLabelKey: 'label',
      newItem: { id: '', label: '', url: '' },
      itemFields: [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'url',   label: 'URL',   type: 'text' },
      ],
    },
  ],
}
```

- [ ] **Step 2.18: Schema registry index**

Create `src/editor/schemas/index.ts`:

```ts
import type { SectionSchema } from './types'
import { heroSchema } from './hero'
import { ourStorySchema } from './ourStory'
import { eventDetailsSchema } from './eventDetails'
import { brideGroomSchema } from './brideGroom'
import { weddingPartySchema } from './weddingParty'
import { gallerySchema } from './gallery'
import { galleryHelixSchema } from './galleryHelix'
import { gallerySpringCoilSchema } from './gallerySpringCoil'
import { scheduleSchema } from './schedule'
import { rsvpSchema } from './rsvp'
import { weddingGiftSchema } from './weddingGift'
import { registrySchema } from './registry'
import { accommodationsSchema } from './accommodations'
import { faqSchema } from './faq'
import { guestbookSchema } from './guestbook'
import { playlistSchema } from './playlist'
import { footerSchema } from './footer'

export const schemaRegistry: Record<string, SectionSchema> = {
  hero:              heroSchema,
  ourStory:          ourStorySchema,
  eventDetails:      eventDetailsSchema,
  brideGroom:        brideGroomSchema,
  weddingParty:      weddingPartySchema,
  gallery:           gallerySchema,
  galleryHelix:      galleryHelixSchema,
  gallerySpringCoil: gallerySpringCoilSchema,
  schedule:          scheduleSchema,
  rsvp:              rsvpSchema,
  weddingGift:       weddingGiftSchema,
  registry:          registrySchema,
  accommodations:    accommodationsSchema,
  faq:               faqSchema,
  guestbook:         guestbookSchema,
  playlist:          playlistSchema,
  footer:            footerSchema,
}

export type { SectionSchema, FieldDef } from './types'
```

- [ ] **Step 2.19: Verify**

Run:
```
npm run build
```
Expected: build succeeds. No type errors on schemas.

---

### Task 3: EditorProvider — Context + reducer

**Files:**
- Create: `src/editor/lib/deepEqual.ts`
- Create: `src/editor/EditorProvider.tsx`

- [ ] **Step 3.1: Deep-equal helper**

Create `src/editor/lib/deepEqual.ts`:

```ts
/**
 * Shallow-recursive deep equality for plain JSON values (config trees).
 * Sufficient for our config shape — no Date, Map, Set, functions.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const ak = Object.keys(ao)
  const bk = Object.keys(bo)
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    if (!deepEqual(ao[k], bo[k])) return false
  }
  return true
}
```

- [ ] **Step 3.2: EditorProvider**

Create `src/editor/EditorProvider.tsx`:

```tsx
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { deepEqual } from './lib/deepEqual'

export interface SectionEntry {
  id: string
  type: string
  enabled?: boolean
  theme?: string
  navLabel?: string
  background?: { type: string; value: string }
  layout?: string
  props?: Record<string, unknown>
  blocks?: unknown[]
  decorativeLayers?: unknown[]
}

export interface PageConfig {
  meta?: { title?: string; description?: string }
  sections: SectionEntry[]
}

interface State {
  config: PageConfig
  initialConfig: PageConfig
  selectedSectionId: string | null
  isSaving: boolean
  saveError: string | null
  lastSavedAt: string | null
}

type Action =
  | { type: 'UPDATE_FIELD';        sectionId: string; key: string; value: unknown }
  | { type: 'UPDATE_ARRAY_ITEM';   sectionId: string; key: string; index: number; subKey: string; value: unknown }
  | { type: 'ADD_ARRAY_ITEM';      sectionId: string; key: string; item: unknown }
  | { type: 'REMOVE_ARRAY_ITEM';   sectionId: string; key: string; index: number }
  | { type: 'REORDER_ARRAY_ITEMS'; sectionId: string; key: string; from: number; to: number }
  | { type: 'REORDER_SECTIONS';    from: number; to: number }
  | { type: 'TOGGLE_SECTION_ENABLED'; sectionId: string }
  | { type: 'ADD_SECTION';            sectionType: string; label: string }
  | { type: 'REMOVE_SECTION';         sectionId: string }
  | { type: 'SELECT_SECTION';         sectionId: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS';           savedAt: string }
  | { type: 'SAVE_ERROR';             message: string }

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function patchSection(
  config: PageConfig,
  sectionId: string,
  patch: (s: SectionEntry) => SectionEntry,
): PageConfig {
  return {
    ...config,
    sections: config.sections.map((s) => (s.id === sectionId ? patch(s) : s)),
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => ({
          ...s,
          props: { ...(s.props || {}), [action.key]: action.value },
        })),
      }

    case 'UPDATE_ARRAY_ITEM':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = ((s.props?.[action.key] as unknown[]) || []).slice()
          const item = { ...(arr[action.index] as Record<string, unknown>) }
          item[action.subKey] = action.value
          arr[action.index] = item
          return { ...s, props: { ...(s.props || {}), [action.key]: arr } }
        }),
      }

    case 'ADD_ARRAY_ITEM':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = ((s.props?.[action.key] as unknown[]) || []).slice()
          arr.push(action.item)
          return { ...s, props: { ...(s.props || {}), [action.key]: arr } }
        }),
      }

    case 'REMOVE_ARRAY_ITEM':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = ((s.props?.[action.key] as unknown[]) || []).slice()
          arr.splice(action.index, 1)
          return { ...s, props: { ...(s.props || {}), [action.key]: arr } }
        }),
      }

    case 'REORDER_ARRAY_ITEMS':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = (s.props?.[action.key] as unknown[]) || []
          return {
            ...s,
            props: { ...(s.props || {}), [action.key]: moveItem(arr, action.from, action.to) },
          }
        }),
      }

    case 'REORDER_SECTIONS':
      return {
        ...state,
        config: { ...state.config, sections: moveItem(state.config.sections, action.from, action.to) },
      }

    case 'TOGGLE_SECTION_ENABLED':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => ({
          ...s,
          enabled: !s.enabled,
        })),
      }

    case 'ADD_SECTION': {
      const id = `${action.sectionType}-${Date.now()}`
      const newSection: SectionEntry = {
        id,
        type: action.sectionType,
        enabled: true,
        props: {},
      }
      return {
        ...state,
        config: { ...state.config, sections: [...state.config.sections, newSection] },
        selectedSectionId: id,
      }
    }

    case 'REMOVE_SECTION': {
      const sections = state.config.sections.filter((s) => s.id !== action.sectionId)
      const selectedSectionId =
        state.selectedSectionId === action.sectionId
          ? sections[0]?.id ?? null
          : state.selectedSectionId
      return { ...state, config: { ...state.config, sections }, selectedSectionId }
    }

    case 'SELECT_SECTION':
      return { ...state, selectedSectionId: action.sectionId }

    case 'SAVE_START':
      return { ...state, isSaving: true, saveError: null }

    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        saveError: null,
        initialConfig: state.config,
        lastSavedAt: action.savedAt,
      }

    case 'SAVE_ERROR':
      return { ...state, isSaving: false, saveError: action.message }

    default:
      return state
  }
}

interface EditorContextValue extends State {
  isDirty: boolean
  selectedSection: SectionEntry | null
  updateField: (sectionId: string, key: string, value: unknown) => void
  updateArrayItem: (sectionId: string, key: string, index: number, subKey: string, value: unknown) => void
  addArrayItem: (sectionId: string, key: string, item: unknown) => void
  removeArrayItem: (sectionId: string, key: string, index: number) => void
  reorderArrayItems: (sectionId: string, key: string, from: number, to: number) => void
  reorderSections: (from: number, to: number) => void
  toggleSectionEnabled: (sectionId: string) => void
  addSection: (sectionType: string, label: string) => void
  removeSection: (sectionId: string) => void
  selectSection: (sectionId: string) => void
  save: () => Promise<void>
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>')
  return ctx
}

interface ProviderProps {
  slug: string
  initialConfig: PageConfig
  children: ReactNode
}

export function EditorProvider({ slug, initialConfig, children }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    config: initialConfig,
    initialConfig,
    selectedSectionId: initialConfig.sections[0]?.id ?? null,
    isSaving: false,
    saveError: null,
    lastSavedAt: null,
  })

  const isDirty = useMemo(() => !deepEqual(state.config, state.initialConfig), [state.config, state.initialConfig])

  const selectedSection = useMemo(
    () => state.config.sections.find((s) => s.id === state.selectedSectionId) ?? null,
    [state.config.sections, state.selectedSectionId],
  )

  // Beforeunload guard while dirty.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const save = useCallback(async () => {
    dispatch({ type: 'SAVE_START' })
    try {
      const res = await fetch(`/api/invitation/${slug}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: state.config }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        dispatch({ type: 'SAVE_ERROR', message: err.error || `HTTP ${res.status}` })
        return
      }
      const data = await res.json()
      dispatch({ type: 'SAVE_SUCCESS', savedAt: data.savedAt || new Date().toISOString() })
    } catch (e: any) {
      dispatch({ type: 'SAVE_ERROR', message: e?.message || 'Network error' })
    }
  }, [slug, state.config])

  const value: EditorContextValue = {
    ...state,
    isDirty,
    selectedSection,
    updateField: (sectionId, key, value) =>
      dispatch({ type: 'UPDATE_FIELD', sectionId, key, value }),
    updateArrayItem: (sectionId, key, index, subKey, value) =>
      dispatch({ type: 'UPDATE_ARRAY_ITEM', sectionId, key, index, subKey, value }),
    addArrayItem: (sectionId, key, item) =>
      dispatch({ type: 'ADD_ARRAY_ITEM', sectionId, key, item }),
    removeArrayItem: (sectionId, key, index) =>
      dispatch({ type: 'REMOVE_ARRAY_ITEM', sectionId, key, index }),
    reorderArrayItems: (sectionId, key, from, to) =>
      dispatch({ type: 'REORDER_ARRAY_ITEMS', sectionId, key, from, to }),
    reorderSections: (from, to) => dispatch({ type: 'REORDER_SECTIONS', from, to }),
    toggleSectionEnabled: (sectionId) =>
      dispatch({ type: 'TOGGLE_SECTION_ENABLED', sectionId }),
    addSection: (sectionType, label) =>
      dispatch({ type: 'ADD_SECTION', sectionType, label }),
    removeSection: (sectionId) => dispatch({ type: 'REMOVE_SECTION', sectionId }),
    selectSection: (sectionId) => dispatch({ type: 'SELECT_SECTION', sectionId }),
    save,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
```

- [ ] **Step 3.3: Verify**

Run:
```
npm run build
```
Expected: build succeeds. (Provider is not yet wired in anywhere — type check only.)

---

### Task 4: Primitive field components

**Files:**
- Create: `src/editor/fields/TextField.tsx`
- Create: `src/editor/fields/TextareaField.tsx`
- Create: `src/editor/fields/DatetimeField.tsx`
- Create: `src/editor/fields/BooleanField.tsx`
- Create: `src/editor/fields/SelectField.tsx`

All five share a common shape: receive `value`, `onChange(value)`, `label`, `help?`. Styles are inline to avoid bloating the module CSS in Task 14.

- [ ] **Step 4.1: TextField**

Create `src/editor/fields/TextField.tsx`:

```tsx
'use client'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}

export default function TextField({ label, value, onChange, help }: Props) {
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
      {help && <span style={hlp}>{help}</span>}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)' }
const input:React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 4.2: TextareaField**

Create `src/editor/fields/TextareaField.tsx`:

```tsx
'use client'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  help?: string
}

export default function TextareaField({ label, value, onChange, rows = 3, help }: Props) {
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <textarea
        value={value ?? ''}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        style={textarea}
      />
      {help && <span style={hlp}>{help}</span>}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)' }
const textarea: React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', background: '#fff' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 4.3: DatetimeField**

Create `src/editor/fields/DatetimeField.tsx`:

```tsx
'use client'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}

/**
 * Stores ISO 8601 string (e.g. "2025-11-15T16:00:00"). Browser
 * datetime-local input uses "YYYY-MM-DDTHH:MM" — we strip seconds
 * from the stored value for display, then re-append ":00" on change.
 */
export default function DatetimeField({ label, value, onChange, help }: Props) {
  const local = typeof value === 'string' ? value.slice(0, 16) : ''
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:00` : '')}
        style={input}
      />
      {help && <span style={hlp}>{help}</span>}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)' }
const input:React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 4.4: BooleanField**

Create `src/editor/fields/BooleanField.tsx`:

```tsx
'use client'

interface Props {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  help?: string
}

export default function BooleanField({ label, value, onChange, help }: Props) {
  return (
    <div style={wrap}>
      <label style={row}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <span style={lbl}>{label}</span>
      </label>
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 4 }
const row:  React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }
const lbl:  React.CSSProperties = { fontSize: 13, color: '#2A2118' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)', marginLeft: 28 }
```

- [ ] **Step 4.5: SelectField**

Create `src/editor/fields/SelectField.tsx`:

```tsx
'use client'

interface Props {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  help?: string
}

export default function SelectField({ label, value, options, onChange, help }: Props) {
  return (
    <label style={wrap}>
      <span style={lbl}>{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={select}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {help && <span style={hlp}>{help}</span>}
    </label>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)' }
const select: React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, background: '#fff', outline: 'none' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 4.6: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 5: Server auth helper + `PUT /api/invitation/[slug]/config`

**Files:**
- Create: `src/editor/lib/auth.ts`
- Create: `src/app/api/invitation/[slug]/config/route.ts`

- [ ] **Step 5.1: Auth helper (verifies the per-slug session cookie)**

Create `src/editor/lib/auth.ts`:

```ts
import { cookies } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const SESSION_COOKIE_PREFIX = 'wsaas_admin_'

/**
 * Mirrors the auth check in src/app/[slug]/dashboard/page.tsx: the cookie
 * value is the first 32 chars of the bcrypt password_hash. We re-fetch the
 * invitation to compare and return its id when the request is authorized.
 *
 * Returns the invitation row on success, null on failure. Route handlers
 * should respond 403 when null is returned.
 */
export async function verifyOwnership(slug: string): Promise<{ id: string; password_hash: string } | null> {
  const cookieStore = cookies()
  const cookie = cookieStore.get(`${SESSION_COOKIE_PREFIX}${slug}`)
  if (!cookie?.value) return null

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('invitations')
    .select('id, password_hash')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return null
  const fingerprint = (data.password_hash as string).slice(0, 32)
  if (cookie.value !== fingerprint) return null
  return data as { id: string; password_hash: string }
}
```

- [ ] **Step 5.2: PUT config route**

Create `src/app/api/invitation/[slug]/config/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'

interface Ctx {
  params: { slug: string }
}

/**
 * PUT /api/invitation/[slug]/config
 * Body: { config: PageConfig }
 *
 * Owner-only. Writes the full `config` JSONB column for the invitation
 * identified by slug. Returns the savedAt timestamp on success.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = params

  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const config = body?.config
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Missing or invalid config' }, { status: 400 })
  }
  if (!Array.isArray(config.sections)) {
    return NextResponse.json({ error: 'config.sections must be an array' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const savedAt = new Date().toISOString()
  const { error } = await supabase
    .from('invitations')
    .update({ config, updated_at: savedAt })
    .eq('id', owner.id)

  if (error) {
    console.error('[config update]', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, savedAt })
}
```

- [ ] **Step 5.3: Verify**

Run:
```
npm run build
```
Expected: build succeeds, new route is discovered (look for `/api/invitation/[slug]/config` in the build output).

---

### Task 6: `POST /api/invitation/[slug]/publish`

**Files:**
- Create: `src/app/api/invitation/[slug]/publish/route.ts`

- [ ] **Step 6.1: Publish route**

Create `src/app/api/invitation/[slug]/publish/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { verifyOwnership } from '@/editor/lib/auth'

interface Ctx {
  params: { slug: string }
}

/**
 * POST /api/invitation/[slug]/publish
 * Body: { is_published: boolean }
 *
 * Owner-only. Flips the is_published flag on the invitation row.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = params

  const owner = await verifyOwnership(slug)
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body?.is_published !== 'boolean') {
    return NextResponse.json({ error: 'is_published must be a boolean' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('invitations')
    .update({ is_published: body.is_published, updated_at: new Date().toISOString() })
    .eq('id', owner.id)

  if (error) {
    console.error('[publish update]', error)
    return NextResponse.json({ error: 'Failed to update publish state' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, is_published: body.is_published })
}
```

- [ ] **Step 6.2: Verify**

Run:
```
npm run build
```
Expected: build succeeds, route discovered.

---

### Task 7: `POST /api/upload` + useUpload hook

**Files:**
- Create: `src/app/api/upload/route.ts`
- Create: `src/editor/lib/useUpload.ts`

- [ ] **Step 7.1: Upload route**

Create `src/app/api/upload/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

const SESSION_COOKIE_PREFIX = 'wsaas_admin_'
const BUCKET = 'invitation-media'
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/upload (multipart)
 * Form fields:
 *   - file: File
 *   - slug: string
 *
 * Verifies the per-slug session cookie owns the invitation, resolves it to
 * an id, and uploads to invitation-media/<id>/<timestamp>-<safe-name>.<ext>.
 * Returns the public URL.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const slug = String(form.get('slug') || '')
  const file = form.get('file')
  if (!slug || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing slug or file' }, { status: 400 })
  }

  // --- ownership check (inline; this route does not import @/editor to keep
  //     the api boundary independent of the editor namespace) ---
  const cookie = cookies().get(`${SESSION_COOKIE_PREFIX}${slug}`)
  if (!cookie?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = createSupabaseAdminClient()
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, password_hash')
    .eq('slug', slug)
    .maybeSingle()
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (cookie.value !== (invitation.password_hash as string).slice(0, 32)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // --- validate ---
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported mime: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }

  // --- upload ---
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  const path = `${invitation.id}/${Date.now()}-${safeName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (upErr) {
    console.error('[upload]', upErr)
    return NextResponse.json({ error: upErr.message || 'Upload failed' }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ ok: true, url: pub.publicUrl, path })
}
```

- [ ] **Step 7.2: useUpload hook**

Create `src/editor/lib/useUpload.ts`:

```ts
'use client'

import { useCallback, useState } from 'react'

export function useUpload(slug: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      setError(null)
      try {
        const form = new FormData()
        form.append('slug', slug)
        form.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(err.error || `HTTP ${res.status}`)
          return null
        }
        const data = await res.json()
        return data.url as string
      } catch (e: any) {
        setError(e?.message || 'Upload failed')
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [slug],
  )

  return { upload, isUploading, error }
}
```

- [ ] **Step 7.3: Verify**

Run:
```
npm run build
```
Expected: build succeeds, `/api/upload` discovered.

---

### Task 8: ImageField (single)

**Files:**
- Create: `src/editor/fields/ImageField.tsx`

- [ ] **Step 8.1: ImageField**

Create `src/editor/fields/ImageField.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import { useUpload } from '../lib/useUpload'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  slug: string
  help?: string
}

export default function ImageField({ label, value, onChange, slug, help }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const { upload, isUploading, error } = useUpload(slug)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await upload(file)
    if (url) onChange(url)
    e.target.value = ''
  }

  return (
    <div style={wrap}>
      <span style={lbl}>{label}</span>
      <div style={row}>
        {value ? (
          <img src={value} alt="" style={thumb} />
        ) : (
          <div style={placeholder}>No image</div>
        )}
        <div style={btns}>
          <button type="button" style={btn} disabled={isUploading} onClick={() => fileInput.current?.click()}>
            {isUploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button type="button" style={btnGhost} onClick={() => onChange('')}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={onPick}
        />
      </div>
      {error && <span style={errStyle}>{error}</span>}
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 8 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)' }
const row:  React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14 }
const thumb: React.CSSProperties = { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(42,33,24,0.12)' }
const placeholder: React.CSSProperties = { width: 80, height: 80, borderRadius: 8, border: '1px dashed rgba(42,33,24,0.25)', display: 'grid', placeItems: 'center', fontSize: 11, color: 'rgba(42,33,24,0.5)' }
const btns: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const btn:  React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: 'transparent', color: '#2A2118', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(42,33,24,0.2)', cursor: 'pointer' }
const errStyle: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 8.2: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 9: ImageArrayField (grid + reorder + add/remove)

**Files:**
- Create: `src/editor/fields/ImageArrayField.tsx`

- [ ] **Step 9.1: ImageArrayField**

Create `src/editor/fields/ImageArrayField.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUpload } from '../lib/useUpload'

interface Props {
  label: string
  value: string[]                            // array of URLs (we serialize as strings)
  onChange: (next: string[]) => void
  slug: string
  help?: string
}

export default function ImageArrayField({ label, value, onChange, slug, help }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const { upload, isUploading, error } = useUpload(slug)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const items = Array.isArray(value) ? value : []

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const urls: string[] = []
    for (const f of files) {
      const url = await upload(f)
      if (url) urls.push(url)
    }
    if (urls.length) onChange([...items, ...urls])
    e.target.value = ''
  }

  function remove(idx: number) {
    const next = items.slice()
    next.splice(idx, 1)
    onChange(next)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = items.indexOf(String(active.id))
    const to = items.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onChange(arrayMove(items, from, to))
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={lbl}>{label}</span>
        <button type="button" style={btn} disabled={isUploading} onClick={() => fileInput.current?.click()}>
          {isUploading ? 'Uploading…' : '+ Add'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          multiple
          onChange={onPick}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div style={grid}>
            {items.map((url, i) => (
              <SortableTile key={url + i} id={url} url={url} onRemove={() => remove(i)} />
            ))}
            {items.length === 0 && <div style={empty}>No images yet — click + Add to upload.</div>}
          </div>
        </SortableContext>
      </DndContext>

      {error && <span style={errStyle}>{error}</span>}
      {help && <span style={hlp}>{help}</span>}
    </div>
  )
}

function SortableTile({ id, url, onRemove }: { id: string; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    cursor: 'grab',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <img src={url} alt="" style={tile} />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        onPointerDown={(e) => e.stopPropagation()}
        style={removeBtn}
      >
        ×
      </button>
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gap: 10 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)', flex: 1 }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }
const tile: React.CSSProperties = { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(42,33,24,0.12)', display: 'block' }
const removeBtn: React.CSSProperties = { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', fontSize: 14, lineHeight: 1, cursor: 'pointer' }
const btn:  React.CSSProperties = { padding: '6px 12px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const empty:React.CSSProperties = { gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed rgba(42,33,24,0.2)', borderRadius: 10 }
const errStyle: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
const hlp:  React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
```

- [ ] **Step 9.2: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 10: ObjectArrayField (nested rows with sub-schema)

**Files:**
- Create: `src/editor/fields/ObjectArrayField.tsx`

This is the most complex primitive — it nests `FieldEditor`'s rendering logic. To avoid a circular import, this file imports the leaf field components directly and re-implements a tiny per-row dispatcher.

- [ ] **Step 10.1: ObjectArrayField**

Create `src/editor/fields/ObjectArrayField.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { FieldDef } from '../schemas/types'
import TextField from './TextField'
import TextareaField from './TextareaField'
import DatetimeField from './DatetimeField'
import BooleanField from './BooleanField'
import SelectField from './SelectField'
import ImageField from './ImageField'

interface Props {
  label: string
  value: Record<string, unknown>[]
  itemFields: FieldDef[]
  newItem: Record<string, unknown>
  itemLabelKey?: string
  slug: string
  onChange: (next: Record<string, unknown>[]) => void
}

export default function ObjectArrayField({
  label, value, itemFields, newItem, itemLabelKey, slug, onChange,
}: Props) {
  const items = Array.isArray(value) ? value : []
  const [openIdx, setOpenIdx] = useState<number | null>(items.length === 1 ? 0 : null)

  function add() {
    const next = [...items, { ...newItem, id: `item-${Date.now()}` }]
    onChange(next)
    setOpenIdx(next.length - 1)
  }

  function remove(idx: number) {
    if (!confirm('Remove this item?')) return
    const next = items.slice()
    next.splice(idx, 1)
    onChange(next)
    setOpenIdx(null)
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    const [it] = next.splice(idx, 1)
    next.splice(j, 0, it)
    onChange(next)
    setOpenIdx(j)
  }

  function updateItem(idx: number, key: string, val: unknown) {
    const next = items.slice()
    next[idx] = { ...next[idx], [key]: val }
    onChange(next)
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={lbl}>{label}</span>
        <button type="button" style={btn} onClick={add}>+ Add</button>
      </div>

      <div style={list}>
        {items.map((item, i) => {
          const headerLabel = (itemLabelKey && String(item[itemLabelKey] ?? '')) || `Item ${i + 1}`
          const open = openIdx === i
          return (
            <div key={i} style={card}>
              <div style={rowHead} onClick={() => setOpenIdx(open ? null : i)}>
                <span style={chev}>{open ? '▾' : '▸'}</span>
                <span style={rowLbl}>{headerLabel || `Item ${i + 1}`}</span>
                <div style={rowBtns} onClick={(e) => e.stopPropagation()}>
                  <button type="button" style={iconBtn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" style={iconBtn} onClick={() => move(i, +1)} disabled={i === items.length - 1}>↓</button>
                  <button type="button" style={iconBtn} onClick={() => remove(i)}>×</button>
                </div>
              </div>
              {open && (
                <div style={body}>
                  {itemFields.map((f) => {
                    const v = (item[f.key] as any) ?? defaultForField(f)
                    const onChange = (val: unknown) => updateItem(i, f.key, val)
                    switch (f.type) {
                      case 'text':     return <TextField     key={f.key} label={f.label} value={v} onChange={onChange} help={f.help} />
                      case 'textarea': return <TextareaField key={f.key} label={f.label} value={v} rows={f.rows} onChange={onChange} help={f.help} />
                      case 'datetime': return <DatetimeField key={f.key} label={f.label} value={v} onChange={onChange} help={f.help} />
                      case 'boolean':  return <BooleanField  key={f.key} label={f.label} value={v} onChange={onChange} help={f.help} />
                      case 'select':   return <SelectField   key={f.key} label={f.label} value={v} options={f.options} onChange={onChange} help={f.help} />
                      case 'image':    return <ImageField    key={f.key} label={f.label} value={v} slug={slug} onChange={onChange} help={f.help} />
                      default:
                        return <div key={f.key} style={{ fontSize: 12, color: '#E8553E' }}>Unsupported nested field: {f.type}</div>
                    }
                  })}
                </div>
              )}
            </div>
          )
        })}
        {items.length === 0 && <div style={empty}>No items yet — click + Add to create one.</div>}
      </div>
    </div>
  )
}

function defaultForField(f: FieldDef): unknown {
  switch (f.type) {
    case 'boolean': return false
    case 'text':
    case 'textarea':
    case 'datetime':
    case 'select':
    case 'image': return ''
    default: return ''
  }
}

const wrap: React.CSSProperties = { display: 'grid', gap: 10 }
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
const lbl:  React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(42,33,24,0.6)', flex: 1 }
const btn:  React.CSSProperties = { padding: '6px 12px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const list: React.CSSProperties = { display: 'grid', gap: 8 }
const card: React.CSSProperties = { border: '1px solid rgba(42,33,24,0.12)', borderRadius: 10, background: '#fff' }
const rowHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }
const chev: React.CSSProperties = { color: 'rgba(42,33,24,0.5)', width: 14 }
const rowLbl: React.CSSProperties = { flex: 1, fontSize: 13, color: '#2A2118', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const rowBtns: React.CSSProperties = { display: 'flex', gap: 4 }
const iconBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid rgba(42,33,24,0.15)', cursor: 'pointer', fontSize: 13 }
const body: React.CSSProperties = { display: 'grid', gap: 14, padding: '4px 14px 16px', borderTop: '1px solid rgba(42,33,24,0.08)' }
const empty:React.CSSProperties = { padding: 18, textAlign: 'center', color: 'rgba(42,33,24,0.5)', fontSize: 13, border: '1px dashed rgba(42,33,24,0.2)', borderRadius: 10 }
```

- [ ] **Step 10.2: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 11: FieldEditor (top-level form renderer)

**Files:**
- Create: `src/editor/FieldEditor.tsx`

- [ ] **Step 11.1: FieldEditor**

Create `src/editor/FieldEditor.tsx`:

```tsx
'use client'

import { useEditor } from './EditorProvider'
import { schemaRegistry } from './schemas'
import type { FieldDef } from './schemas/types'
import TextField from './fields/TextField'
import TextareaField from './fields/TextareaField'
import DatetimeField from './fields/DatetimeField'
import BooleanField from './fields/BooleanField'
import SelectField from './fields/SelectField'
import ImageField from './fields/ImageField'
import ImageArrayField from './fields/ImageArrayField'
import ObjectArrayField from './fields/ObjectArrayField'

interface Props {
  slug: string
}

export default function FieldEditor({ slug }: Props) {
  const { selectedSection, updateField } = useEditor()

  if (!selectedSection) {
    return <div style={empty}>Select a section on the left to start editing.</div>
  }

  const schema = schemaRegistry[selectedSection.type]
  const props = (selectedSection.props || {}) as Record<string, any>

  if (!schema) {
    return (
      <div style={fallback}>
        <h3 style={h3}>{selectedSection.type}</h3>
        <p style={{ color: 'rgba(42,33,24,0.65)', fontSize: 13 }}>
          No schema for section type <code>{selectedSection.type}</code>. Edit the raw JSON in
          Supabase if you need to change this section.
        </p>
        <pre style={pre}>{JSON.stringify(selectedSection, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <header style={hdr}>
        <p style={kicker}>Section</p>
        <h3 style={h3}>{schema.label}</h3>
      </header>
      <div style={form}>
        {schema.fields.map((f) => renderField(f, props[f.key], (v) => updateField(selectedSection.id, f.key, v), slug))}
      </div>
    </div>
  )
}

function renderField(
  f: FieldDef,
  value: any,
  onChange: (v: unknown) => void,
  slug: string,
) {
  switch (f.type) {
    case 'text':       return <TextField     key={f.key} label={f.label} value={value ?? ''} onChange={(v) => onChange(v)} help={f.help} />
    case 'textarea':   return <TextareaField key={f.key} label={f.label} value={value ?? ''} rows={f.rows} onChange={(v) => onChange(v)} help={f.help} />
    case 'datetime':   return <DatetimeField key={f.key} label={f.label} value={value ?? ''} onChange={(v) => onChange(v)} help={f.help} />
    case 'boolean':    return <BooleanField  key={f.key} label={f.label} value={!!value} onChange={(v) => onChange(v)} help={f.help} />
    case 'select':     return <SelectField   key={f.key} label={f.label} value={value ?? ''} options={f.options} onChange={(v) => onChange(v)} help={f.help} />
    case 'image':      return <ImageField    key={f.key} label={f.label} value={value ?? ''} slug={slug} onChange={(v) => onChange(v)} help={f.help} />
    case 'imageArray': return <ImageArrayField key={f.key} label={f.label} value={Array.isArray(value) ? value : []} slug={slug} onChange={(v) => onChange(v)} help={f.help} />
    case 'objectArray':return <ObjectArrayField
                                key={f.key}
                                label={f.label}
                                value={Array.isArray(value) ? value : []}
                                itemFields={f.itemFields}
                                newItem={f.newItem}
                                itemLabelKey={f.itemLabelKey}
                                slug={slug}
                                onChange={(v) => onChange(v)}
                              />
  }
}

const wrap: React.CSSProperties = { display: 'grid', gap: 20 }
const hdr:  React.CSSProperties = { borderBottom: '1px solid rgba(42,33,24,0.08)', paddingBottom: 12 }
const kicker:React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.24em', color: '#E8553E' }
const h3:   React.CSSProperties = { margin: '4px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 26 }
const form: React.CSSProperties = { display: 'grid', gap: 20, paddingBottom: 60 }
const empty:React.CSSProperties = { padding: 40, color: 'rgba(42,33,24,0.6)', fontSize: 14, textAlign: 'center' }
const fallback: React.CSSProperties = { display: 'grid', gap: 12 }
const pre:  React.CSSProperties = { background: '#fff', padding: 14, borderRadius: 8, fontSize: 11, maxHeight: 320, overflow: 'auto' }
```

- [ ] **Step 11.2: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 12: SectionList + SectionRow + AddSectionMenu

**Files:**
- Create: `src/editor/SectionList.tsx`
- Create: `src/editor/SectionRow.tsx`
- Create: `src/editor/AddSectionMenu.tsx`

- [ ] **Step 12.1: SectionRow**

Create `src/editor/SectionRow.tsx`:

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SectionEntry } from './EditorProvider'

interface Props {
  section: SectionEntry
  label: string
  isSelected: boolean
  onSelect: () => void
  onToggleEnabled: () => void
  onRemove: () => void
}

export default function SectionRow({ section, label, isSelected, onSelect, onToggleEnabled, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    background: isSelected ? 'rgba(232,85,62,0.10)' : 'transparent',
    border: isSelected ? '1px solid rgba(232,85,62,0.45)' : '1px solid transparent',
    cursor: 'pointer',
  }

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}>
      <span
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: 'grab', color: 'rgba(42,33,24,0.4)', fontSize: 14, padding: '0 4px' }}
        aria-label="Drag to reorder"
      >
        ⠿
      </span>
      <span style={{ flex: 1, fontSize: 13, color: '#2A2118' }}>{label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleEnabled() }}
        title={section.enabled === false ? 'Disabled — click to enable' : 'Enabled — click to disable'}
        style={{
          width: 12, height: 12, borderRadius: 999,
          border: 'none', cursor: 'pointer',
          background: section.enabled === false ? 'rgba(42,33,24,0.18)' : '#2D8C4E',
        }}
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (confirm(`Remove section "${label}"?`)) onRemove() }}
        style={{ border: 'none', background: 'transparent', color: 'rgba(42,33,24,0.4)', cursor: 'pointer', fontSize: 14 }}
        aria-label="Remove section"
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 12.2: AddSectionMenu**

Create `src/editor/AddSectionMenu.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { schemaRegistry } from './schemas'

interface Props {
  onAdd: (sectionType: string, label: string) => void
}

export default function AddSectionMenu({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(schemaRegistry)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: '1px dashed rgba(42,33,24,0.25)', background: 'transparent',
          color: 'rgba(42,33,24,0.65)', fontSize: 12, letterSpacing: '0.16em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        + Add section
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            maxHeight: 280, overflow: 'auto', background: '#fff',
            border: '1px solid rgba(42,33,24,0.15)', borderRadius: 10,
            boxShadow: '0 10px 30px rgba(42,33,24,0.10)', zIndex: 20,
          }}
        >
          {entries.map(([type, schema]) => (
            <button
              key={type}
              type="button"
              onClick={() => { onAdd(type, schema.label); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none', background: 'transparent',
                fontSize: 13, color: '#2A2118', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(42,33,24,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {schema.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 12.3: SectionList**

Create `src/editor/SectionList.tsx`:

```tsx
'use client'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEditor } from './EditorProvider'
import { schemaRegistry } from './schemas'
import SectionRow from './SectionRow'
import AddSectionMenu from './AddSectionMenu'

interface Props {
  slug: string
}

export default function SectionList({ slug }: Props) {
  const {
    config, selectedSectionId,
    reorderSections, toggleSectionEnabled, selectSection, addSection, removeSection,
  } = useEditor()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = config.sections.findIndex((s) => s.id === active.id)
    const to = config.sections.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    reorderSections(from, to)
  }

  return (
    <aside style={wrap}>
      <header style={hdr}>
        <p style={kicker}>Sections</p>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={config.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div style={list}>
            {config.sections.map((s) => (
              <SectionRow
                key={s.id}
                section={s}
                label={schemaRegistry[s.type]?.label ?? s.type}
                isSelected={s.id === selectedSectionId}
                onSelect={() => selectSection(s.id)}
                onToggleEnabled={() => toggleSectionEnabled(s.id)}
                onRemove={() => removeSection(s.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div style={{ padding: 12 }}>
        <AddSectionMenu onAdd={(type, label) => addSection(type, label)} />
      </div>

      <footer style={ftr}>
        <a
          href={`/${slug}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          style={previewLink}
        >
          Open preview ↗
        </a>
      </footer>
    </aside>
  )
}

const wrap: React.CSSProperties = { width: 280, flexShrink: 0, borderRight: '1px solid rgba(42,33,24,0.08)', background: 'rgba(255,255,255,0.55)', display: 'flex', flexDirection: 'column' }
const hdr:  React.CSSProperties = { padding: '18px 16px 8px' }
const kicker:React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.24em', color: '#E8553E' }
const list: React.CSSProperties = { display: 'grid', gap: 4, padding: '4px 8px', flex: 1, overflow: 'auto' }
const ftr:  React.CSSProperties = { padding: 12, borderTop: '1px solid rgba(42,33,24,0.08)' }
const previewLink: React.CSSProperties = { display: 'block', textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }
```

- [ ] **Step 12.4: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 13: SaveBar (save button + publish toggle + dirty indicator)

**Files:**
- Create: `src/editor/SaveBar.tsx`

- [ ] **Step 13.1: SaveBar**

Create `src/editor/SaveBar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useEditor } from './EditorProvider'

interface Props {
  slug: string
  initialIsPublished: boolean
}

export default function SaveBar({ slug, initialIsPublished }: Props) {
  const { isDirty, isSaving, saveError, save, lastSavedAt } = useEditor()
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishErr, setPublishErr] = useState<string | null>(null)

  async function togglePublish() {
    const next = !isPublished
    setPublishBusy(true)
    setPublishErr(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setPublishErr(err.error || `HTTP ${res.status}`)
        return
      }
      setIsPublished(next)
    } finally {
      setPublishBusy(false)
    }
  }

  return (
    <div style={wrap}>
      <div style={status}>
        {isSaving ? (
          <span style={savingTxt}>Saving…</span>
        ) : isDirty ? (
          <span style={dirtyTxt}>● Unsaved changes</span>
        ) : lastSavedAt ? (
          <span style={savedTxt}>Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
        ) : (
          <span style={savedTxt}>All up to date</span>
        )}
        {saveError && <span style={errTxt}>{saveError}</span>}
        {publishErr && <span style={errTxt}>{publishErr}</span>}
      </div>

      <button
        type="button"
        disabled={publishBusy}
        onClick={togglePublish}
        style={isPublished ? pillOn : pillOff}
      >
        {isPublished ? 'Published ●' : 'Draft ○'}
      </button>

      <button
        type="button"
        disabled={!isDirty || isSaving}
        onClick={save}
        style={{ ...saveBtn, opacity: !isDirty || isSaving ? 0.4 : 1, cursor: !isDirty || isSaving ? 'default' : 'pointer' }}
      >
        Save
      </button>
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const status: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }
const dirtyTxt: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
const savedTxt: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.55)' }
const savingTxt: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.65)' }
const errTxt:   React.CSSProperties = { fontSize: 11, color: '#E8553E' }
const pillOn:  React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: '#2D8C4E', color: '#fff', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const pillOff: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: 'rgba(42,33,24,0.15)', color: '#2A2118', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const saveBtn: React.CSSProperties = { padding: '10px 22px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none' }
```

- [ ] **Step 13.2: Verify**

Run:
```
npm run build
```
Expected: build succeeds.

---

### Task 14: EditorRoot + wire into DashboardClient

**Files:**
- Create: `src/editor/EditorRoot.tsx`
- Modify: `src/app/[slug]/dashboard/DashboardClient.tsx`

- [ ] **Step 14.1: EditorRoot**

Create `src/editor/EditorRoot.tsx`:

```tsx
'use client'

import { EditorProvider, type PageConfig } from './EditorProvider'
import SectionList from './SectionList'
import FieldEditor from './FieldEditor'
import SaveBar from './SaveBar'

interface Props {
  slug: string
  initialConfig: PageConfig
  initialIsPublished: boolean
}

export default function EditorRoot({ slug, initialConfig, initialIsPublished }: Props) {
  // Ensure the config has a sections array even when the DB value was null.
  const safeConfig: PageConfig = {
    meta: initialConfig?.meta ?? {},
    sections: Array.isArray(initialConfig?.sections) ? initialConfig.sections : [],
  }

  return (
    <EditorProvider slug={slug} initialConfig={safeConfig}>
      <div style={wrap}>
        <div style={topBar}>
          <SaveBar slug={slug} initialIsPublished={initialIsPublished} />
        </div>
        <div style={body}>
          <SectionList slug={slug} />
          <main style={pane}>
            <FieldEditor slug={slug} />
          </main>
        </div>
      </div>
    </EditorProvider>
  )
}

const wrap: React.CSSProperties = { display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 'calc(100vh - 200px)' }
const topBar: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', padding: '0 0 16px' }
const body:  React.CSSProperties = { display: 'flex', gap: 0, background: 'rgba(255,255,255,0.55)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 36px rgba(42,33,24,0.06)', minHeight: 600 }
const pane:  React.CSSProperties = { flex: 1, padding: 28, overflow: 'auto' }
```

- [ ] **Step 14.2: Wire into DashboardClient — replace the `editor` tab body**

Modify `src/app/[slug]/dashboard/DashboardClient.tsx`.

Replace the existing import block at the top with:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import EditorRoot from '@/editor/EditorRoot'
```

Replace the entire `{tab === 'editor' && ( … )}` block (currently shows JSON preview) with:

```tsx
        {tab === 'editor' && (
          <EditorRoot
            slug={slug}
            initialConfig={invitation.config ?? { sections: [] }}
            initialIsPublished={!!invitation.is_published}
          />
        )}
```

(Keep the other tabs — overview, rsvps, gifts — exactly as they are.)

- [ ] **Step 14.3: Verify build**

Run:
```
npm run build
```
Expected: build succeeds.

- [ ] **Step 14.4: Verify dev server boots**

Run:
```
npm run dev
```
Expected: server starts on http://localhost:3000 with no startup errors.

Leave running for Task 15.

---

### Task 15: End-to-end smoke test (manual)

**Files:** None — pure verification.

**Prereqs:**
- `.env.local` is filled per README (Supabase URL, anon key, service role, ADMIN_SESSION_SECRET).
- An invitation exists, e.g. `adi-rani` from `node scripts/create-invitation.mjs adi-rani demo1234 premium`.
- The `invitation-media` Storage bucket exists in Supabase (per README setup step 2).

Walk through every Success Criterion from the spec. For each step, the expected outcome is in **bold**.

- [ ] **Step 15.1: Login + editor visible**

  1. In a browser, open `http://localhost:3000/adi-rani/dashboard`.
  2. Log in with password `demo1234`.
  3. Click the **Editor** tab.

  Expected: **Left rail shows the list of sections from the invitation's `config.sections`. Right pane shows fields for the first section (Hero). Header has Save button (disabled), Published/Draft pill, and "View live" link.**

- [ ] **Step 15.2: Reorder sections**

  1. Drag the **Our Story** row above **Hero** in the left rail.

  Expected: **Order updates immediately. Save button becomes enabled. "● Unsaved changes" indicator appears.**

  2. Click **Save**.
  3. After "Saved HH:MM:SS" appears, click **View live** (opens public page in a new tab).

  Expected: **Public page renders Our Story first, then Hero.** (Revert by dragging back and saving again so subsequent tests start clean.)

- [ ] **Step 15.3: Edit text fields**

  1. Select **Hero** in the left rail.
  2. In **Couple name**, change "Adi & Rani" to "Adi & Rani ❤".
  3. In **Venue**, change to "Grand Ballroom, Bali".
  4. Click **Save**.
  5. Reload the public page tab.

  Expected: **Public hero shows the new couple name and venue.**

- [ ] **Step 15.4: Toggle countdown boolean**

  1. In Hero, toggle **Show countdown** off.
  2. Save and reload public page.

  Expected: **Countdown is hidden on the live page.** Toggle back on, save, confirm it re-appears.

- [ ] **Step 15.5: Upload a single image (Hero.gateImage)**

  1. In Hero, find **Gate image**. Click **Replace**.
  2. Pick a small JPG/PNG (< 5 MB).

  Expected: **Spinner shows "Uploading…", then thumbnail replaces the old one. Save button enables.**

  3. Save. Reload public page.

  Expected: **Hero gate uses the newly uploaded image.**

- [ ] **Step 15.6: Upload to image array (Hero.blastPhotos)**

  1. In Hero, scroll to **Blast photos**. Click **+ Add**.
  2. Pick 1–3 images at once (multi-select).

  Expected: **New tiles appear at the end of the grid. Save button enables.**

  3. Drag one tile to a different position. Click the **×** on another tile to remove it.

  Expected: **Reorder and remove both reflect in the grid.**

  4. Save. Reload public page.

  Expected: **Hero blast images match the new set and order.**

- [ ] **Step 15.7: Edit object array (OurStory.stories)**

  1. Select **Our Story**.
  2. Expand the second story card. Change its **Title** and **Description**.
  3. Click **+ Add** to append a new card. Expand it and fill Title + Description + upload a small image.
  4. Use the **↑ / ↓** buttons to move the new card up by one position.
  5. Save. Reload public page.

  Expected: **Stories show edits, new card, and new position.**

- [ ] **Step 15.8: Toggle publish**

  1. In the header, click the green **Published ●** pill.

  Expected: **Pill flips to gray "Draft ○".**

  2. Open the public URL `/adi-rani` in a fresh incognito tab.

  Expected: **Not-found / unpublished view.** Toggle back to Published in the dashboard, refresh incognito tab — public page returns.

- [ ] **Step 15.9: Add + remove a section**

  1. Click **+ Add section** in the left rail. Pick **FAQ**.

  Expected: **New empty FAQ section appears at the bottom, becomes selected, right pane shows its fields.**

  2. Click the **×** on the new section row and confirm.

  Expected: **Section removed. Selection moves to another section.**

- [ ] **Step 15.10: Beforeunload guard**

  1. Change any field. Do NOT click Save.
  2. Try to close the tab or navigate away.

  Expected: **Browser-native "Leave site? Changes you made may not be saved" prompt.**

- [ ] **Step 15.11: Authorization check**

  1. In a fresh incognito window (no admin cookie), open DevTools Network tab.
  2. Run: `fetch('/api/invitation/adi-rani/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"config":{"sections":[]}}' }).then(r => r.status)`

  Expected: **403.** Same for `/api/upload` and `/api/invitation/<slug>/publish`.

- [ ] **Step 15.12: Confirm no regression on existing tabs**

  Click **Overview**, **RSVPs**, **Gifts** tabs in the dashboard.

  Expected: **All three render exactly as before this sprint — same Stat tiles, same placeholder copy.**

**If every step passes:** Sprint 1 is complete. Stop the dev server.

**If any step fails:** the failing step's "Expected" describes the contract that was broken — go back to the task that introduced the related code (linked in File Structure above) and debug.

---

## Done

This plan delivers everything in the spec's Success Criteria. No tests are added (project has no test framework); verification is via build + the manual walkthrough in Task 15. Future sprints can layer in: orphan-image cleanup, undo/redo, multi-user conflict handling, schema-validation, and the WYSIWYG click-in-preview interaction.
