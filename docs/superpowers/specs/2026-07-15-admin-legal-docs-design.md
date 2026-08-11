# Admin legal documents editor — design

**Date:** 2026-07-15 · **Status:** approved for build (autonomous session; user request:
"saya ingin admin panel bisa update legal dokumen")

## Problem

The legal pages (/terms, /privacy, /refund) are hardcoded bilingual React components
(`src/components/legal/{Terms,Privacy,Refund}Content.tsx`). Updating a clause, a contact
number, or the "last updated" date requires a code deploy. The operator wants to edit
these documents from the `/admin` console.

The same components are also rendered inside the signup consent modal
(`src/app/signup/SignupForm.tsx` → `LegalModal`), so any editable version must feed both
surfaces or the consent copy drifts from the published policy.

## Approaches considered

1. **DB HTML override + committed HTML defaults** *(chosen)* — a `legal_documents` table
   holds an optional per-doc-per-lang HTML override; the current component content is
   converted once (mechanically — the JSX bodies are pure HTML + `{BRAND}`) into template
   literal strings in `src/lib/legal/defaults.ts`, which remain the fallback and the
   "load default" prefill in the editor. Exact fidelity, zero new dependencies, resilient
   (missing table ⇒ defaults render).
2. **Markdown storage + hand-rolled renderer** — friendlier editing surface, but requires
   writing a markdown renderer (no lib in deps, and adding one is against the
   hand-rolled ethos) *and* a lossy JSX→markdown conversion of six long documents. More
   moving parts for the same outcome.
3. **No DB — edit files via repo** — not an admin-panel feature; rejected.

HTML editing is acceptable here because the editor ships a live preview pane, a
"load default content" prefill (so the operator edits existing text rather than writing
tags from scratch), and server-side allowlist sanitisation.

## Data model

`supabase/migrations/2026-07-15_legal_documents.sql`

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
-- no policies: service-role only, same posture as the other admin tables
```

A row is an **override**. No row ⇒ the committed default renders. "Kembalikan ke bawaan"
deletes the row.

## Library — `src/lib/legal/`

- `defaults.ts` — `LEGAL_DOC_TYPES`, `LegalDocType`, `DEFAULT_LEGAL_HTML[doc][lang]`
  (template literals interpolating `${BRAND}` from `@/lib/brand`), and
  `DEFAULT_UPDATED[doc][lang]` (the current hardcoded "11 Juni 2026 / 11 June 2026").
  Generated mechanically from the JSX components; those components are then deleted
  (single source of truth).
- `sanitize.ts` — `sanitizeLegalHtml(html)`: tag allowlist (`h2 h3 h4 p ul ol li strong
  em b i u a br hr blockquote span`), strips every attribute except `a[href]` (http/https/
  relative only, no `javascript:`), drops disallowed tags and their `<script>`-like
  content entirely. Defense-in-depth — writers are AAL2 allowlisted admins.
- `get.ts` — `getLegalDoc(docType, lang)` → `{ html, updatedLabel, source: 'db'|'default' }`.
  Reads via the service-role client; **any DB error falls back to the default** so the
  public pages can never 500 because of this feature. DB HTML is sanitised at read time.

## Public rendering

- `/terms`, `/privacy`, `/refund` pages call `getLegalDoc` and render the HTML via
  `dangerouslySetInnerHTML` inside the existing `LegalLayout` prose container.
  `updated` label comes from the row (fallback: default label).
- `GET /api/legal/[doc]?lang=` — public route handler returning `{ html, updated }`
  (legal text is public content; params validated).
- Signup consent modal: new client component `src/components/legal/LegalDocBody.tsx`
  fetches the API on mount (loading state), replacing the direct content-component
  imports — this also removes the large legal text from the signup client bundle.

## Admin module — `/admin/legal` ("Dokumen Legal")

- `page.tsx` — status matrix (3 docs × ID/EN: Bawaan vs Kustom + updated_at/by), renders
  the editor with current DB rows.
- `LegalEditor.tsx` (client) — doc tabs + lang toggle, `updated_label` input, monospace
  HTML textarea, live preview (same prose styling as the public page). Buttons:
  **Simpan**, **Muat konten bawaan** (prefill via server action; AdminDialog confirm when
  dirty), **Kembalikan ke bawaan** (delete row; AdminDialog confirm). No window.* popups.
- `actions.ts` — `saveLegalDoc` (validate enums, non-empty, ≤500 KB, sanitise, upsert),
  `resetLegalDoc` (delete), `getDefaultLegalHtml` (prefill). All `requireAdmin`-guarded,
  audited via `logAdminAction` (`legal.update`, `legal.reset`), revalidate the three
  public paths + /admin/legal.
- Admin layout nav gains `['/admin/legal', 'Dokumen Legal']`; `renderAdminAction` gains
  the two new action labels.

## Testing

- `sanitize.test.ts` — script/style/iframe stripped, `on*` + `javascript:` removed,
  allowed structure preserved.
- `get.test.ts` — DB override wins; no row / DB error ⇒ default; `${BRAND}` resolved.
- `actions.test.ts` — guard rejection, validation, upsert + audit call (mocked client,
  same pattern as admin payments action tests).
- Manual: /terms /privacy /refund render defaults unchanged; signup modal loads content;
  admin editor save → public page shows override → reset → default returns.

## Out of scope

- Versioning/history of legal docs (audit log records who/when; content history can come
  later if ever needed).
- Rich-text/WYSIWYG editing.
- Per-invitation legal text.
