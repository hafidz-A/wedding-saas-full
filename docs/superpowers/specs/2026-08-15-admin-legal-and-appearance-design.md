# Admin: legal document editor + per-invitation appearance control — design

**Date:** 2026-08-15 · **Status:** approved for build (user: "buatkan plan update fitur admin
panel: (1) edit semua isi legal documents, tanggal update mengikuti kapan legal disave;
(2) palette + ornamen bisa diubah saat membuat undangan dan pada undangan yang sudah ada").

**Relation to earlier specs.** `2026-07-20-admin-content-editors-design.md` (Module A, legal)
is the approved predecessor and its architecture stands. This spec **supersedes its date
handling only**: the manual `updated_label` text input is replaced by a stored timestamp that
the public page formats per language. Module B of that spec (marketing copy) is untouched and
still unbuilt — out of scope here. `src/lib/legal/sanitize.ts` already exists and is reused.

---

## Module B — Appearance control (palette + ornament) from `/admin`

Built **first**: smaller, no migration, and it unblocks the "saya bantu pilihkan tema" sales
motion.

### B.1 Problem

`config.theme.defaultPalette` and `config.theme.ornamentType` are writable only by the couple,
through `PUT /api/invitation/[slug]/theme` (`verifyOwnership`). An operator helping a confused
client cannot set them, and the create-invitation form cannot seed them. Separately, "which
templates have ornaments" is encoded in three unrelated places — a hardcoded `ORNAMENT_TYPES`
array in the theme route, `template !== 'solary'` in `EditorWorkspace.tsx`, and a plan-features
migration — so a third template means hunting them down.

### B.2 The registry — `src/lib/templates/appearance.ts` *(new)*

One module answers "what appearance options does template X have":

```ts
export interface OrnamentOption { key: string; label: string }   // label = Indonesian UI label

export const TEMPLATE_ORNAMENTS: Record<string, readonly OrnamentOption[]> = {
  lovebirds: [
    { key: 'birds',       label: 'Burung terbang' },
    { key: 'butterflies', label: 'Kupu-kupu' },
    { key: 'perched',     label: 'Burung bertengger' },
  ],
  solary: [],            // three.js backdrop draws its own scene — no ornament layer
}

export function templateOrnaments(template): readonly OrnamentOption[]
export function isOrnamentAllowedForTemplate(template, key): boolean
export function templatePalettes(template): readonly string[]     // re-exports the palette allowlist
```

Unknown/legacy `template_id` is **lenient** (accepts any key known to any template), matching
the existing `isPaletteAllowedForTemplate` fallback exactly. A known template with `[]`
ornaments (Solary) is **denied** — that is the point of the registry.

Adding a template later = one row here. Palettes keep living in
`src/lib/config/palette-allowlist.ts` (already the single source, kept in sync with each
template's own theme definitions); the registry re-exports rather than duplicates them.

### B.3 Consumers rewired to the registry

- `src/app/api/invitation/[slug]/theme/route.ts` — drop the local `ORNAMENT_TYPES`; validate
  `ornamentType` against the row's `template_id` **after** the row is fetched (validation moves
  below the fetch, since the template is needed). Closes a real hole: Solary can currently be
  handed `ornamentType: 'birds'` and will store it.
- `src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx` — `if (template !== 'solary')`
  becomes `if (templateOrnaments(template).length > 0)`.

### B.4 Shared ornament preview — `src/components/appearance/OrnamentPreview.tsx` *(new)*

`OrnamentTab.tsx` carries the flock SVG paths, the flight layout, and the preview CSS
(~90 lines) plus a `PerchedCanvas` branch. Admin needs the identical visual (house rule:
previews reuse the real component, never a lookalike), so `PreviewScene` moves out verbatim
into a shared client component that both the dashboard tab and the admin dialog import.
`OrnamentTab` keeps its i18n, save wiring, and layout — only the scene moves.

### B.5 Admin surfaces

**1. Server action** `adminSetAppearance(id, { palette?, ornamentType? })` in
`src/app/admin/invitations/actions.ts`:

- `requireAdmin` guard (same `guard()` helper as its siblings), at least one field required.
- Fetches `config, template_id`; validates each supplied value against the registry for that
  template; merges into `config.theme` preserving every other config key (same read-merge-write
  shape as the owner theme route) and bumps `updated_at`.
- Audited as `invitation.set_appearance` with `meta: { palette, ornamentType }`;
  `revalidateInvitation()`.
- Deliberately **not** ownership-scoped and deliberately **not** a lock: it writes the same
  fields the couple's own tabs write, so the couple can still change it back. No new column,
  no read-only state to explain to a client.

**2. "Tampilan" dialog** — `src/app/admin/invitations/AppearanceDialog.tsx` *(new, client)*,
opened from a new button in `InvitationRow.tsx`:

- Palette picker driven by `TEMPLATE_VIBES` (`src/components/marketing/vibeData.ts`) so the
  operator sees real swatches and the real `PreviewMock` card — the same source the couple's
  PaletteTab and the landing explorer use.
- Ornament picker rendering `OrnamentPreview` live; the whole section is omitted when
  `templateOrnaments(templateId)` is empty.
- Save → `adminSetAppearance`; `FeedbackProvider` toast + `router.refresh()`, matching every
  other row action. Built from `@/components/ui/Button` + `controls.module.css`; tokens only.

**3. List query** — `src/app/admin/invitations/page.tsx` adds `theme:config->theme` to its
select (a JSON-path select, not the whole config, so the 500-row payload stays small) and
passes the current palette/ornament into the row.

**4. Create form** — `CreateInvitationForm.tsx` gains a **Palette** select and, when the chosen
template has ornaments, an **Ornamen** select; both react to the template dropdown.
`adminCreateInvitationForClient` validates them through the registry and merges them into
`config.theme` on the seeded config before insert (works for both the `buildSeedConfig`
Lovebirds path and the `getDefaultConfig` path).

### B.6 Tests

- `src/lib/templates/__tests__/appearance.test.ts` — Lovebirds accepts its three ornaments;
  **Solary rejects every ornament**; unknown template is lenient; palette delegation matches
  the allowlist.
- Extend the admin action tests (mirroring `src/app/admin/payments/__tests__/actions.test.ts`):
  non-admin rejected, Solary + `birds` rejected, valid save merges `config.theme` without
  dropping sibling config keys, audit called.

---

## Module A — Legal document editor (`/admin/legal`)

### A.1 Architecture (unchanged from 2026-07-20)

DB override over committed defaults. No row ⇒ default renders. Any DB error ⇒ default renders.
**A legal page can never blank or 500 because of this feature.** Reads go through the
service-role client; writes are `requireAdmin` server actions, audited, and `revalidatePath`
the public pages.

### A.2 Data model — `supabase/migrations/2026-08-15_legal_documents.sql`

```sql
create table public.legal_documents (
  doc_type     text not null check (doc_type in ('terms','privacy','refund')),
  lang         text not null check (lang in ('id','en')),
  content_html text not null,
  revised_at   timestamptz not null default now(),  -- PUBLIC "Terakhir diperbarui"
  updated_at   timestamptz not null default now(),  -- every save, incl. minor fixes (audit)
  updated_by   text,
  primary key (doc_type, lang)
);
alter table public.legal_documents enable row level security;
-- no policies: service-role only, same posture as the other admin-owned tables
```

**The two timestamps are the whole point of the date requirement.** A normal save moves both:
the published date follows the save, exactly as asked. A save with **"perbaikan kecil — jangan
ubah tanggal"** ticked moves only `updated_at`, so fixing a typo or a phone number does not
advertise a policy revision that did not happen. The admin status matrix shows both, so the
operator can always see the real last-touch time.

No `updated_label` column: the date is stored once as a timestamp and **formatted per language
at render** (`Intl.DateTimeFormat` `id-ID` / `en-GB`, `timeZone: 'Asia/Jakarta'`, e.g.
"11 Juni 2026" / "11 June 2026"). This removes the class of bug where the label says one date
and the content is newer.

### A.3 Library — `src/lib/legal/`

- `defaults.ts` *(new)* — `LEGAL_DOC_TYPES`, `LegalDocType`, `DEFAULT_LEGAL_HTML[doc][lang]`
  (template literals interpolating `${BRAND}`), `DEFAULT_REVISED_ISO` (`'2026-06-11'`, today's
  hardcoded label). Converted mechanically from the three JSX components — their bodies are
  already pure HTML + `{BRAND}` — after which `{Terms,Privacy,Refund}Content.tsx` are
  **deleted** so there is one source of truth.
- `sanitize.ts` *(exists)* — runs on save **and** on read.
- `get.ts` *(new)* — `getLegalDoc(doc, lang)` → `{ html, revisedAt, source: 'db'|'default' }`,
  never throws.
- `format.ts` *(new)* — `formatRevised(iso, lang)`, the single date formatter.

### A.4 Public rendering

- `/terms`, `/privacy`, `/refund` call `getLegalDoc` and render the sanitized HTML via
  `dangerouslySetInnerHTML` inside the existing `LegalLayout` `.prose` container; `updated`
  comes from `formatRevised(revisedAt, lang)`. These pages are server components, so the
  formatted date is computed server-side and cannot hydrate-mismatch.
- `GET /api/legal/[doc]?lang=` *(new)* → `{ html, updated }`; params validated against the
  enums. Legal text is public content.
- `src/components/legal/LegalDocBody.tsx` *(new, client)* fetches that API for the signup
  consent modal, replacing the direct `*Content` imports — the consent copy can no longer drift
  from the published policy, and ~770 lines of legal text leave the signup bundle.

### A.5 Admin editor — `/admin/legal` ("Dokumen Legal")

- `page.tsx` (server) — status matrix, 3 docs × ID/EN: **Bawaan** vs **Kustom**, public
  `revised_at`, last `updated_at`, and `updated_by`.
- `RichTextEditor.tsx` (client, reusable) — `contentEditable` styled with the same `.prose`
  typography as the public page, sticky toolbar (H2/H3, Bold, Italic, bulleted list, numbered
  list, link add/edit/remove via `AdminDialog` form, clear formatting), toolbar state reflects
  the caret, **paste is stripped to plain text**. `value`/`onChange` returns an HTML string.
  No new dependency (house rule: no UI library).
- `LegalEditor.tsx` (client) — doc tabs + ID/EN toggle, the editor, a live preview pane, the
  **"perbaikan kecil — jangan ubah tanggal"** checkbox, and buttons **Simpan · Muat konten
  bawaan · Kembalikan ke bawaan** (the last two behind `AdminDialog` confirms).
- `actions.ts` — `saveLegalDoc({ docType, lang, contentHtml, minorFix })` (validate enums,
  non-empty, ≤500 KB, sanitize, upsert, set `revised_at` only when `!minorFix`),
  `resetLegalDoc` (delete the row), `getDefaultLegalHtml` (prefill). All `requireAdmin`-guarded,
  audited (`legal.update`, `legal.reset`), revalidating `/terms /privacy /refund /admin/legal`.
- Admin nav gains `['/admin/legal', 'Dokumen Legal']`; `renderAdminAction` gains both labels.

### A.6 Tests

- `get.test.ts` — DB row wins; no row ⇒ default; DB throw ⇒ default; `${BRAND}` resolved.
- `format.test.ts` — ID and EN formatting, fixed timezone.
- `actions.test.ts` — guard rejection, size/enum validation, `minorFix` leaves `revised_at`
  untouched while a normal save moves it, audit called.
- Manual: the three public pages render byte-equivalent defaults before any row exists; signup
  consent modal loads; save → public page updates → reset → default returns.

---

## Out of scope

- Version history of legal documents (the audit log records who and when; content history can
  come later).
- Marketing-copy editor (Module B of the 2026-07-20 spec) — still unbuilt, still separate.
- Locking appearance against the couple, and any per-invitation legal text.
