# Sprint 1 — Block-Based Editor (Design)

**Date:** 2026-05-21
**Scope:** Replace the stub `editor` tab in `/[slug]/dashboard` with a working schema-driven editor that lets a couple edit, reorder, image-upload, and publish their invitation without touching JSON in Supabase.

---

## Goals

1. Reorder sections via drag-drop (`config.sections[]`).
2. Inline edit of every section's text/date/boolean/select fields via a generic schema-driven form.
3. Image upload to the `invitation-media` Supabase Storage bucket, for both single-image and image-array fields.
4. Publish toggle (`is_published`).
5. "Open preview" button that opens `/[slug]?preview=1` in a new tab for the full cinematic view. (No live in-dashboard preview pane — see Non-Goals.)

## Non-Goals (Sprint 1)

- Live in-dashboard preview pane (cinematic sections too heavy to re-render on every keystroke).
- Click-in-preview WYSIWYG editing.
- Undo/redo.
- Multi-user conflict handling / optimistic locking.
- Image cropping / resizing on upload.
- Orphan image cleanup in storage.
- Editing the generic `blocks`-composed section (no default invitation uses it; falls back to raw JSON).
- Schema validation engine (required/format checks).

---

## Architecture

### 1. Layout

The dashboard's `editor` tab renders a two-column layout (`<EditorRoot>`):

```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard header  [Published ●]  [Save ✓ disabled]  [View live] │
├──────────────────┬──────────────────────────────────────────────┤
│ SECTIONS         │  FIELD EDITOR                                │
│ (left, 280px)    │  (right, fills rest)                         │
│                  │                                              │
│ ⠿ Hero      ●    │  ┌─ Hero ────────────────────────────────┐  │
│ ⠿ Our Story ●    │  │ Couple name   [Adi & Rani______ ]  │  │
│ ⠿ Gallery   ○    │  │ Wedding date  [2025-11-15T16:00____]  │  │
│ ⠿ Schedule  ●    │  │ Venue         [The Grand Ballroom__ ]  │  │
│ ⠿ RSVP      ●    │  │ Gate image    [thumbnail] [↑ Upload]   │  │
│ ⠿ Footer    ●    │  │ Blast photos  [+] [img] [img] [img]    │  │
│                  │  │ Countdown     [✓ enabled]              │  │
│ [+ Add section]  │  └────────────────────────────────────────┘  │
│                  │                                              │
│ [Open preview ↗] │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

- **Left rail** (`<SectionList>`): drag-drop list of sections, each row shows drag handle (`⠿`), section label, enable/disable dot. Selecting a row drives the right pane. `+ Add section` opens a dropdown of section types from `schemaRegistry`.
- **Right pane** (`<FieldEditor>`): renders a form from the selected section's schema.
- **Header bar** (`<SaveBar>` injected near the existing dashboard header): `Publish` toggle, `Save` button (disabled when not dirty), dirty indicator, `View live` link.

Drag-drop uses `@dnd-kit/core` + `@dnd-kit/sortable` (also reused for `imageArray` reorder).

### 2. Schema-driven Form

Each section type owns a schema file under `src/editor/schemas/` describing its editable fields. Forms are rendered generically from the schema — no per-section form component.

**Field types (Sprint 1):**

| Type | Render | Example field |
|---|---|---|
| `text` | `<input type=text>` | `coupleName`, `venue`, `title` |
| `textarea` | `<textarea>` | `description`, `welcomeText` |
| `datetime` | `<input type=datetime-local>` | `weddingDate` |
| `boolean` | toggle | `countdownEnabled`, `enabled` |
| `image` | thumbnail + Upload button | `gateImage`, `story.image` |
| `imageArray` | grid thumbnails + add / reorder / remove | `blastPhotos`, gallery images |
| `select` | `<select>` from options | `theme`, `layout` |
| `objectArray` | list of rows with nested sub-schema | `stories[]`, `scheduleItems[]` |

**Schema example:**

```ts
// src/editor/schemas/hero.ts
export const heroSchema: SectionSchema = {
  type: 'hero',
  label: 'Hero',
  fields: [
    { key: 'coupleName',       label: 'Couple name',   type: 'text' },
    { key: 'brideName',        label: 'Bride name',    type: 'text' },
    { key: 'groomName',        label: 'Groom name',    type: 'text' },
    { key: 'weddingDate',      label: 'Wedding date',  type: 'datetime' },
    { key: 'venue',            label: 'Venue',         type: 'text' },
    { key: 'welcomeText',      label: 'Welcome text',  type: 'textarea' },
    { key: 'gateImage',        label: 'Gate image',    type: 'image' },
    { key: 'blastPhotos',      label: 'Blast photos',  type: 'imageArray' },
    { key: 'countdownEnabled', label: 'Show countdown', type: 'boolean' },
  ],
}
```

**Sections schema-ized in Sprint 1 (17 specialized types):**
hero, ourStory, eventDetails, brideGroom, weddingParty, gallery, galleryHelix, gallerySpringCoil, schedule, rsvp, weddingGift, registry, accommodations, faq, guestbook, playlist, footer.

The generic `blocks` section type falls back to a "Edit via JSON" panel showing the raw JSONB area.

### 3. State Management

Single React Context (`<EditorProvider>`) holds the working copy of the config and exposes mutation actions.

```ts
{
  config: PageConfig,           // working copy mutated by the form
  initialConfig: PageConfig,    // snapshot from server; baseline for diff
  isDirty: boolean,             // deepEqual(config, initialConfig) === false
  selectedSectionId: string,
  isSaving: boolean,
  saveError: string | null,
}
```

Mutations (all synchronous; touch local state only):

- `updateField(sectionId, key, value)` — set `config.sections[i].props[key]`.
- `updateNestedField(sectionId, path, value)` — for array items, e.g. `stories[2].title`.
- `addArrayItem(sectionId, key, item)` / `removeArrayItem(sectionId, key, idx)` / `reorderArrayItems(sectionId, key, fromIdx, toIdx)`.
- `reorderSections(fromIdx, toIdx)`.
- `toggleSectionEnabled(sectionId)`.
- `addSection(type)` / `removeSection(sectionId)`.

### 4. Save Flow

```
User clicks Save
    ↓
PUT /api/invitation/[slug]/config
    body: { config: <full PageConfig> }
    ↓
Server route handler:
    1. Read admin session cookie → verify slug ownership
    2. UPDATE invitations SET config = $1, updated_at = now() WHERE slug = $2
    3. Return { ok: true, savedAt }
    ↓
Client:
    - initialConfig = config (reset dirty)
    - Toast "Saved ✓"
```

**Decisions:**

- **Full-config write**, not partial patch. Simpler, no merge logic; payload stays small (<50 KB).
- **No optimistic locking**. Last-write-wins; one user per invitation assumed.
- **Publish toggle** is a separate endpoint `POST /api/invitation/[slug]/publish` with `{ is_published: boolean }` so it doesn't couple to dirty config.
- **Beforeunload guard**: when `isDirty`, `window.onbeforeunload` warns the user.

### 5. Image Upload

**Bucket:** `invitation-media` (existing).

**Path:** `invitation-media/<invitation_id>/<timestamp>-<original-filename>.<ext>`

**Flow:**

```
User clicks [↑ Upload] in an ImageField / ImageArrayField
    ↓
File picker → user picks file
    ↓
Client: POST /api/upload (multipart form)
    body: file + invitationId
    ↓
Server route handler (service-role):
    1. Verify session cookie → owns this invitation
    2. Validate: mime in {image/jpeg, image/png, image/gif, image/webp}, size ≤ 5 MB
    3. supabase.storage.from('invitation-media').upload(path, file)
    4. Get public URL
    5. Return { url, path }
    ↓
Client:
    - updateField(sectionId, key, url)              for type: image
    - addArrayItem(sectionId, key, url)             for type: imageArray
    - Dirty → user must Save to persist URL in config
```

**Validation table:**

| Check | Limit | On fail |
|---|---|---|
| Mime type | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | 400 |
| Size | ≤ 5 MB | 400 |
| Ownership | `session.slug === invitation.slug` | 403 |

UI components:

- `<ImageField>` — single. Thumbnail when set, buttons `Upload` / `Replace` / `Remove`. Spinner + disabled state while uploading.
- `<ImageArrayField>` — 4-col grid of thumbnails. Hover row exposes remove (×). `+ Add image` triggers picker. Drag-reorder via dnd-kit `<SortableContext>`.

### 6. API Endpoints (new)

| Method | Path | Body | Behavior |
|---|---|---|---|
| `PUT` | `/api/invitation/[slug]/config` | `{ config }` | Owner-only. Writes full `config` JSONB. Returns `{ ok, savedAt }`. |
| `POST` | `/api/invitation/[slug]/publish` | `{ is_published: boolean }` | Owner-only. Flips `is_published`. Returns `{ ok }`. |
| `POST` | `/api/upload` | multipart: `file`, `invitationId` | Owner-only. Validates, uploads to `invitation-media/<id>/`, returns `{ url, path }`. |

All three reuse the existing admin session cookie established by `LoginForm`. Server uses the service-role Supabase client (`src/lib/supabase/admin.ts`).

---

## File Structure

New code is namespaced under `src/editor/` to keep the public invitation runtime untouched.

```
src/
├── app/
│   ├── [slug]/dashboard/
│   │   └── DashboardClient.tsx       ← MODIFIED: tab 'editor' renders <EditorRoot>
│   └── api/
│       ├── invitation/[slug]/
│       │   ├── config/route.ts       ← NEW
│       │   └── publish/route.ts      ← NEW
│       └── upload/route.ts           ← NEW
└── editor/                            ← NEW namespace
    ├── EditorRoot.tsx                 ← provider + 2-col layout
    ├── EditorProvider.tsx             ← Context + reducer
    ├── SectionList.tsx                ← left rail
    ├── SectionRow.tsx
    ├── AddSectionMenu.tsx
    ├── FieldEditor.tsx                ← right pane
    ├── SaveBar.tsx                    ← save button, publish toggle, dirty indicator
    ├── fields/
    │   ├── TextField.tsx
    │   ├── TextareaField.tsx
    │   ├── DatetimeField.tsx
    │   ├── BooleanField.tsx
    │   ├── SelectField.tsx
    │   ├── ImageField.tsx
    │   ├── ImageArrayField.tsx
    │   └── ObjectArrayField.tsx
    ├── schemas/
    │   ├── index.ts                   ← schemaRegistry: { hero: heroSchema, ... }
    │   ├── types.ts                   ← SectionSchema, FieldDef types
    │   ├── hero.ts
    │   ├── ourStory.ts
    │   ├── eventDetails.ts
    │   ├── brideGroom.ts
    │   ├── weddingParty.ts
    │   ├── gallery.ts
    │   ├── galleryHelix.ts
    │   ├── gallerySpringCoil.ts
    │   ├── schedule.ts
    │   ├── rsvp.ts
    │   ├── weddingGift.ts
    │   ├── registry.ts
    │   ├── accommodations.ts
    │   ├── faq.ts
    │   ├── guestbook.ts
    │   ├── playlist.ts
    │   └── footer.ts
    ├── lib/
    │   ├── useUpload.ts               ← image upload hook
    │   └── deepEqual.ts               ← isDirty check
    └── editor.module.css              ← all editor styles
```

**Public invitation render path (`src/sections/`, `src/renderers/`, `src/config/`) is unchanged.** Schemas only describe props that already exist on each section component.

## Dependencies (new)

```json
"@dnd-kit/core": "^6",
"@dnd-kit/sortable": "^6",
"@dnd-kit/utilities": "^3"
```

No form library — controlled inputs via Context are sufficient.

---

## Success Criteria

A couple can, end-to-end, without touching Supabase:

1. Log in to `/<slug>/dashboard`, open the `editor` tab, see all sections from their `config.sections`.
2. Drag a section up/down; ordering persists after Save + reload.
3. Click any section → edit text/date fields → values reflected on the public page after Save + reload.
4. Upload an image to a single-image field (e.g. Hero `gateImage`) → preview updates → Save → public page renders the new image.
5. Upload, reorder, and remove images in an array field (e.g. Hero `blastPhotos`) → Save → public page reflects changes.
6. Toggle `is_published` from the header → public `/<slug>` page becomes published / unpublished accordingly.
7. Closing the tab while dirty triggers a browser-native confirmation.
