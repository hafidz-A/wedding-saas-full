# Admin content editors — legal documents (WYSIWYG) + marketing copy — design

**Date:** 2026-07-20 · **Status:** approved for planning (user request: "admin panel bisa
edit dokumen legal dengan textbox ala Word, dan edit copywriting marketing/landing page")

**Supersedes** `docs/superpowers/specs/2026-07-15-admin-legal-docs-design.md` for the legal
module: that spec chose a raw-HTML `<textarea>` and listed WYSIWYG as out of scope. The
operator now explicitly wants a Word-like editor, so the legal module here replaces the
textarea with a **hand-rolled rich-text editor**. Everything else in the 2026-07-15 spec
(data model, defaults strategy, sanitiser, public rendering, tests) still holds and is
restated below. `src/lib/legal/sanitize.ts` is already built to that spec.

## Problem

Two classes of copy require a code deploy to change today:

1. **Legal pages** (`/terms`, `/privacy`, `/refund`) are hardcoded bilingual React
   components (`src/components/legal/{Terms,Privacy,Refund}Content.tsx`), also rendered in
   the signup consent modal (`src/app/signup/SignupForm.tsx` → `LegalModal`). Editing a
   clause or a contact number means editing JSX and shipping.
2. **Marketing landing copy** lives entirely in `src/lib/i18n/dictionaries/landing.ts`
   (hero, emotional hook, features, how-it-works, testimonials, final CTA) plus nav/footer
   in `common.ts` and the site SEO metadata in `src/app/layout.tsx`. Rewording a headline
   is a code change.

The operator wants both editable from the `/admin` console.

## Shared architecture — "DB override over committed defaults"

Both modules follow one pattern, proven by the testimonials/plans modules:

- The committed source stays the **default and the fallback**. No DB row ⇒ the default
  renders; any DB read error ⇒ the default renders. **A public page can never 500 or go
  blank because of these features.**
- A DB row is an **override**. Saving writes/updates it; "kembalikan ke bawaan" deletes it.
- Reads happen through the **service-role admin client** (`createSupabaseAdminClient`),
  same posture as the other admin-owned tables (RLS on, no anon policies).
- Writes are **`requireAdmin`-guarded server actions**, audited via
  `logAdminAction(adminEmail, …)` (`src/lib/admin/log.ts`), and `revalidatePath` the
  affected public paths + the admin page.
- UI reuses `AdminDialogProvider` (confirm/alert — never `window.*`) and
  `FeedbackProvider` (toast), already wrapping `/admin` in `src/app/admin/layout.tsx`.
  Styling is token-compliant (`src/styles/tokens.css`); run `npm run check:tokens`.

Admin nav (`src/app/admin/layout.tsx`) gains two entries:
`['/admin/legal', 'Dokumen Legal']` and `['/admin/marketing', 'Teks Marketing']`.
`renderAdminAction` (`src/lib/admin/log.ts`) gains the new action labels (below).

---

## Module A — Legal documents (`/admin/legal`, "Dokumen Legal")

### A.1 Data model

`supabase/migrations/2026-07-20_legal_documents.sql`

```sql
create table public.legal_documents (
  doc_type      text not null check (doc_type in ('terms','privacy','refund')),
  lang          text not null check (lang in ('id','en')),
  content_html  text not null,
  updated_label text,                        -- human "Terakhir diperbarui" label
  updated_by    text,                        -- admin email
  updated_at    timestamptz not null default now(),
  primary key (doc_type, lang)
);
alter table public.legal_documents enable row level security;
-- no policies: service-role only (same posture as other admin tables)
```

### A.2 Library — `src/lib/legal/`

- `defaults.ts` *(new)* — `LEGAL_DOC_TYPES`, `LegalDocType`, `DEFAULT_LEGAL_HTML[doc][lang]`
  (template literals interpolating `${BRAND}` from `@/lib/brand`), and
  `DEFAULT_UPDATED[doc][lang]` (the current hardcoded "11 Juni 2026 / 11 June 2026").
  Generated mechanically from the three JSX components — their bodies are pure HTML +
  `{BRAND}` — after which the `{Terms,Privacy,Refund}Content.tsx` components are **deleted**
  (single source of truth).
- `sanitize.ts` *(already built)* — `sanitizeLegalHtml(html)`: tag allowlist
  (`h2 h3 h4 p ul ol li strong em b i u code span a br hr blockquote`), drops all attributes
  except `a[href]` (http/https/mailto/relative/fragment only), removes `script/style/iframe/
  …` with their content. Runs on **save AND on read** (defense in depth).
- `get.ts` *(new)* — `getLegalDoc(docType, lang)` →
  `{ html, updatedLabel, source: 'db'|'default' }`. Reads via the service-role client; **any
  DB error falls back to the default**. DB HTML is passed through `sanitizeLegalHtml` at read
  time.
- `consent.ts` *(exists, unchanged)*.

### A.3 Public rendering

- `/terms`, `/privacy`, `/refund` (`src/app/{terms,privacy,refund}/page.tsx`) call
  `getLegalDoc` and render via `dangerouslySetInnerHTML` inside the existing `LegalLayout`
  `.prose` container. The "Terakhir diperbarui" label comes from the row (fallback: default).
- `GET /api/legal/[doc]?lang=` *(new route handler)* → `{ html, updated }`. Legal text is
  public; params validated against the enums.
- **Signup consent modal**: new client component `src/components/legal/LegalDocBody.tsx`
  fetches `/api/legal/[doc]?lang=` on mount (loading state) and renders the sanitized HTML
  into `LegalModal`'s existing `.prose` body — replacing the direct `*Content` imports.
  Side benefit: the large legal text leaves the signup client bundle.

### A.4 Editor — hand-rolled Word-like rich text (the delta from 2026-07-15)

No new dependency (respects the "no UI library" rule in CLAUDE.md). Components under
`src/app/admin/legal/`:

- `page.tsx` (server) — status matrix (3 docs × ID/EN: **Bawaan** vs **Kustom** +
  updated_at/by), renders `LegalEditor` seeded with current DB rows.
- `RichTextEditor.tsx` (client, reusable) — the editor primitive:
  - A `contentEditable` surface styled with the same `.prose` typography as the public page,
    so **what the operator types already looks like the published page** ("rapi ketika
    submit").
  - A small sticky toolbar: **Heading (H2/H3), Bold, Italic, Bulleted list, Numbered list,
    Link (add/edit/remove via an AdminDialog form prompt), Clear formatting.** Buttons
    reflect the active state at the caret (e.g. Bold pressed inside bold text).
  - Formatting via `document.execCommand` for the core operations (bold/italic/lists) with a
    thin wrapper so the command set is centralised and swappable; headings and links applied
    with a small custom handler (execCommand `formatBlock` for headings, a range-wrapping
    handler for links). No arbitrary HTML paste: **on paste, strip to plain text** then let
    the operator format — keeps output clean and inside the allowlist.
  - `value`/`onChange` contract returns an HTML string; the parent owns dirty state.
  - Serialised HTML is normalised and, on save, run through `sanitizeLegalHtml` server-side
    (the editor's client-side allowlist is convenience only, never the security boundary).
- `LegalEditor.tsx` (client) — doc tabs (Terms/Privacy/Refund) + lang toggle (ID/EN), the
  `updated_label` text input, the `RichTextEditor`, and a **live preview** pane (same
  `.prose` styling) so the operator sees the exact public look. Buttons: **Simpan**,
  **Muat konten bawaan** (prefill the editor with `DEFAULT_LEGAL_HTML`; AdminDialog confirm
  when the editor is dirty), **Kembalikan ke bawaan** (delete the row; AdminDialog confirm).
- `actions.ts` (`'use server'`):
  - `saveLegalDoc({ docType, lang, contentHtml, updatedLabel })` — validate enums,
    non-empty, ≤ 500 KB; `sanitizeLegalHtml`; upsert on `(doc_type, lang)`; audit
    `legal.update`; revalidate `/terms /privacy /refund /admin/legal`.
  - `resetLegalDoc({ docType, lang })` — delete the row; audit `legal.reset`; same revalidate.
  - `getDefaultLegalHtml(docType, lang)` — returns the default for the prefill button.
  - All `requireAdmin`-guarded (return `{ ok:false, error }` on rejection, matching the
    testimonials/payments action shape).
- `renderAdminAction` map gains: `'legal.update' → 'Ubah dokumen legal {doc}/{lang}'`,
  `'legal.reset' → 'Kembalikan dokumen legal {doc}/{lang} ke bawaan'` (ref from `meta`).

---

## Module B — Marketing copy (`/admin/marketing`, "Teks Marketing")

Plain-text copy editing (NOT WYSIWYG): every value is a styled string wired into a specific
component slot, so rich formatting would break layout. The editor is a grouped form of
labelled text inputs/textareas, per language.

### B.1 Data model

`supabase/migrations/2026-07-20_marketing_copy.sql`

```sql
create table public.marketing_copy (
  copy_key   text not null,            -- dotted path, e.g. 'landing.hero.title'
  lang       text not null check (lang in ('id','en')),
  value      text not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (copy_key, lang)
);
alter table public.marketing_copy enable row level security;
-- no policies: service-role only
```

### B.2 The editable manifest — `src/lib/marketing-copy/manifest.ts` *(new)*

A **curated allowlist** of editable keys (not "every string in the dictionary"). Each entry:
`{ key, section, label, multiline, hasPlaceholder? }`. The manifest is the contract between
the DB keys, the editor form, and the read-time merge; a key absent from the manifest is
never editable and never overridden. Grouped sections:

| Section | Keys (dotted paths, source) |
|---|---|
| Hero | `landing.hero.{kicker,title,subtitle,ctaPrimary,ctaSecondary}` |
| Emotional Hook | `landing.emotionalHook.{title,body}` |
| Vibe Exploration | `landing.vibeExploration.{heading,subheading}` (headings only; labels/placeholder strings excluded in v1) |
| Features | `landing.features.{heading,subheading}` + `landing.features.items.{0,1,2}.{title,body}` |
| How It Works | `landing.howItWorks.heading` + `landing.howItWorks.steps.{0,1,2}.{title,body}` |
| Testimonials | `landing.testimonials.{heading,subheading,emptyHeading,emptyBody,emptyCta}` |
| Final CTA | `landing.finalCta.{title,subtitle,cta}` |
| Nav | `common.nav.{experience,templates,login,cta,myTemplate,home}` |
| Footer | `common.footer.{terms,privacy,refund,rights}` |
| SEO Meta | `meta.title`, `meta.description` |

Placeholder-bearing strings (e.g. `landing.vibeExploration.guestQuota` = `'{n} tamu'`) are
**excluded from v1** to avoid interpolation breakage; if any included key ever carries a
placeholder, its manifest entry sets `hasPlaceholder:true` and the form shows a "jangan hapus
`{n}`" hint. Array items are addressed by fixed index (`items.0…2`, `steps.0…2`); the manifest
only lists indices the committed default actually has.

### B.3 Read-time merge — `src/lib/marketing-copy/get.ts` *(new)*

- `getMarketingOverrides(lang)` → `Record<copyKey, value>` from the service-role client;
  **error ⇒ `{}`** (defaults render).
- `getMarketingCopy(lang)` → returns the landing + common subset with overrides applied by
  **deep-merging by dotted path** onto the committed `getDict(lang)` values (only manifest
  keys are eligible). Partial/one-language overrides fall back per key, so ID-only edits keep
  the committed EN — dict parity is preserved.
- `getMarketingMeta(lang)` → `{ title, description }` = committed layout values with
  `meta.title` / `meta.description` overrides applied.
- **`getDict` stays pure/synchronous and untouched** — client i18n (`useClientLang`) is
  unaffected; the override overlay is a server-only concern applied at the marketing page.

### B.4 Wiring the public surface

- `src/app/page.tsx` (already a server component) builds its `t.landing` / `t.common` from
  `getMarketingCopy(lang)` instead of raw `getDict`, then passes the merged slices to `Hero`,
  `SiteNav`, `SiteFooter`, etc. as it already does. **No section component changes** — they
  keep receiving the same prop shape.
- SEO: add `export async function generateMetadata()` to `src/app/page.tsx` that reads
  `getMarketingMeta(lang)` and returns title/description/OG/twitter, so the override is
  **scoped precisely to the landing page**. The root `src/app/layout.tsx` metadata stays as
  the site-wide default/fallback for every other route.
- Scope note: nav/footer overrides render on the landing page (where the overlay is applied).
  Propagating footer/nav edits to every other public page is intentionally **out of v1**
  (would require the overlay on each page and an async path through shared layout); revisit if
  the operator asks. Documented so it isn't mistaken for a bug.

### B.5 Admin module — `src/app/admin/marketing/`

- `page.tsx` (server) — reads all `marketing_copy` rows, renders `MarketingEditor` with, per
  manifest entry, the committed default (from `getDict`) and the current override (if any).
- `MarketingEditor.tsx` (client) — lang toggle (ID/EN) + collapsible section groups from the
  manifest. Each field: label, the input (single-line) or textarea (`multiline`), a muted
  "Bawaan:" preview of the committed value, and a per-field **Reset** (revert to default =
  delete that key's row). A dirty-field count + one **Simpan perubahan** saves the batch.
- `actions.ts` (`'use server'`):
  - `saveMarketingCopy(entries: { key, lang, value }[])` — every `key` must be in the
    manifest (reject otherwise), value length-capped; upsert changed keys, **delete keys whose
    value equals the committed default** (don't persist no-op overrides); audit
    `marketing.update` (meta: count of keys); `revalidatePath('/')` + `/admin/marketing`.
  - `resetMarketingCopy(key, lang)` — delete one override; audit `marketing.reset`; same
    revalidate.
  - `requireAdmin`-guarded.
- `renderAdminAction` map gains: `'marketing.update' → 'Ubah teks marketing ({n} field)'`,
  `'marketing.reset' → 'Kembalikan teks marketing {key} ke bawaan'`.

---

## Testing

Legal:
- `sanitize.test.ts` *(new — `sanitize.ts` ships without a test today)* — script/style/iframe
  + `on*` + `javascript:` stripped, allowed structure preserved.
- `get.test.ts` — DB override wins; no row / DB error ⇒ default; `${BRAND}` resolved; read-
  time sanitise applied.
- `actions.test.ts` — guard rejection, validation (enum/empty/size), upsert + audit call
  (mocked client, mirroring `admin/payments/__tests__/actions.test.ts`).

Marketing:
- `manifest.test.ts` — every manifest `key` resolves to a real path in the committed dict
  (guards against typos / dict drift); no placeholder key is included without
  `hasPlaceholder`.
- `get.test.ts` — override applied by dotted path; unknown/out-of-manifest keys ignored;
  DB error ⇒ committed defaults; one-language override keeps the other language's default
  (parity); `getMarketingMeta` override + fallback.
- `actions.test.ts` — guard rejection, non-manifest key rejected, no-op-equals-default
  deletes rather than stores, audit call.

Regression: existing `dict-parity.test.ts` still passes (overrides don't touch the committed
dictionaries). Run `npm run typecheck`, `npm run test`, `npm run check:tokens`.

Manual QA:
- `/terms /privacy /refund` render unchanged defaults; signup consent modal loads content.
- Legal editor: format text → Simpan → public page shows override → Kembalikan ke bawaan →
  default returns.
- Marketing editor: edit a hero headline (ID) → landing shows it, EN unchanged; edit
  `meta.title` → view-source `<title>` / OG updated; Reset field → default returns.

## Out of scope (v1)

- Versioning/history of either document set (the audit log records who/when; content history
  can come later).
- Rich-text for marketing copy (plain strings by design).
- Editing placeholder-bearing / micro-label marketing strings, and propagating nav/footer
  overrides beyond the landing page.
- Per-invitation legal text; adding/removing/reordering marketing sections (copy only, not
  structure — matches the operator's stated intent).

## Build order

1. **Legal module** first — the 2026-07-15 groundwork (sanitiser) exists and the data model
   is settled; the only new build surface is `defaults.ts`/`get.ts`, the public wiring, and
   the hand-rolled `RichTextEditor`.
2. **Marketing module** second — manifest + merge + form.

Each is independently shippable behind the admin allowlist.
