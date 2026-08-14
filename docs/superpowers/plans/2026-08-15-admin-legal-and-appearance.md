# Plan — admin legal editor + per-invitation appearance control

Spec: [`2026-08-15-admin-legal-and-appearance-design.md`](../specs/2026-08-15-admin-legal-and-appearance-design.md)
Branch: `feat/admin-legal-and-appearance`

Three tasks, executed **strictly in order** (each one starts from a green tree).

---

## Task 1 — Appearance registry + admin appearance control (Module B)

**Goal:** an operator can set palette and ornament for any invitation, at creation time and
afterwards, and "which template has ornaments" lives in exactly one place.

1. **`src/lib/templates/appearance.ts`** *(new)* — `OrnamentOption`, `TEMPLATE_ORNAMENTS`
   (lovebirds: birds/butterflies/perched with Indonesian labels; solary: `[]`),
   `templateOrnaments`, `isOrnamentAllowedForTemplate` (unknown template ⇒ lenient union,
   known-but-empty ⇒ deny), `templatePalettes` (delegates to
   `src/lib/config/palette-allowlist.ts`).
2. **`src/app/api/invitation/[slug]/theme/route.ts`** — delete the local `ORNAMENT_TYPES`;
   move ornament validation below the row fetch and validate against `row.template_id`.
3. **`src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx`** — replace
   `if (template !== 'solary')` with `templateOrnaments(template).length > 0`.
4. **`src/components/appearance/OrnamentPreview.tsx`** *(new, client)* — move `PREVIEW`,
   `FLY`, `PREVIEW_CSS`, and `PreviewScene` verbatim out of `OrnamentTab.tsx` (which keeps its
   i18n/save/layout and imports the new component). `import React` explicitly.
5. **`src/app/admin/invitations/actions.ts`** — add `adminSetAppearance(id, { palette?,
   ornamentType? })`: `guard()`, at least one field, fetch `config, template_id`, validate via
   the registry, read-merge-write `config.theme` (preserve sibling keys), bump `updated_at`,
   `logAdminAction('invitation.set_appearance', …)`, `revalidateInvitation()`.
6. **`src/lib/admin/log.ts`** — add the `invitation.set_appearance` label.
7. **`src/app/admin/invitations/page.tsx`** — add `theme:config->theme` to the select; pass
   `palette` / `ornamentType` into `InvitationRow`.
8. **`src/app/admin/invitations/AppearanceDialog.tsx`** *(new, client)* — palette picker from
   `TEMPLATE_VIBES` + `PreviewMock`; ornament picker using `OrnamentPreview`, omitted when the
   template has none; save via `adminSetAppearance`, `FeedbackProvider` toast +
   `router.refresh()`. `@/components/ui/Button` + `controls.module.css`, tokens only.
9. **`src/app/admin/invitations/InvitationRow.tsx`** — add the "Tampilan" button that opens it.
10. **`CreateInvitationForm.tsx` + `adminCreateInvitationForClient`** — Palette select always,
    Ornamen select only when the selected template has ornaments (reset on template change);
    server-side validation through the registry; merge into `config.theme` before insert.
11. **Tests** — `src/lib/templates/__tests__/appearance.test.ts` (Solary rejects every
    ornament; Lovebirds accepts its three; unknown lenient) and an `adminSetAppearance` action
    test in `src/app/admin/invitations/__tests__/` following the payments action-test pattern
    (guard rejection, invalid ornament rejected, valid save preserves sibling config keys).

**Verify:** `npm run typecheck && npm run test && npm run check:tokens`.

---

## Task 2 — Legal content moves to data (Module A, part 1)

**Goal:** the three public pages and the signup consent modal render from
`getLegalDoc`, with the committed defaults still producing byte-equivalent output. No admin UI
yet — nothing user-visible changes.

1. **`supabase/migrations/2026-08-15_legal_documents.sql`** — the table from the spec
   (`revised_at` + `updated_at` + `updated_by`, RLS on, no policies). Header comment with the
   "apply in Supabase SQL editor" instructions, matching the other migrations.
2. **`src/lib/legal/defaults.ts`** *(new)* — mechanical JSX → HTML-string conversion of
   `TermsContent.tsx`, `PrivacyContent.tsx`, `RefundContent.tsx`, both languages, `${BRAND}`
   interpolated, plus `DEFAULT_REVISED_ISO = '2026-06-11'`. **Convert, do not rewrite:** the
   legal wording must survive character-for-character (`&ldquo;` etc. become the literal
   characters).
3. **`src/lib/legal/format.ts`** *(new)* — `formatRevised(iso, lang)` via `Intl.DateTimeFormat`
   (`id-ID` / `en-GB`, `timeZone: 'Asia/Jakarta'`).
4. **`src/lib/legal/get.ts`** *(new)* — `getLegalDoc(doc, lang)`; service-role read; sanitize DB
   HTML on read; **any** error path returns the default.
5. **`src/app/{terms,privacy,refund}/page.tsx`** — render `getLegalDoc` output via
   `dangerouslySetInnerHTML` inside `LegalLayout`, `updated={formatRevised(...)}`.
6. **`src/app/api/legal/[doc]/route.ts`** *(new)* — `GET ?lang=` → `{ html, updated }`, enums
   validated.
7. **`src/components/legal/LegalDocBody.tsx`** *(new, client)* — fetch + render for
   `LegalModal`; wire it into `src/app/signup/SignupForm.tsx`; delete the three `*Content.tsx`
   components.
8. **Tests** — `get.test.ts` (row wins / no row / DB throws ⇒ default) and `format.test.ts`.

**Verify:** `npm run typecheck && npm run test`, then diff the rendered `/terms`, `/privacy`,
`/refund` against the pre-change output — they must be identical before any DB row exists.

---

## Task 3 — Admin legal editor (Module A, part 2)

**Goal:** `/admin/legal` edits all six documents with a Word-like editor; the published date
follows the save unless "perbaikan kecil" is ticked.

1. **`src/app/admin/legal/actions.ts`** — `saveLegalDoc({ docType, lang, contentHtml,
   minorFix })` (enums, non-empty, ≤500 KB, `sanitizeLegalHtml`, upsert on `(doc_type, lang)`,
   set `revised_at = now()` only when `!minorFix`, always set `updated_at`/`updated_by`),
   `resetLegalDoc`, `getDefaultLegalHtml`. `requireAdmin`, audited (`legal.update`,
   `legal.reset`), revalidate `/terms /privacy /refund /admin/legal`.
2. **`src/app/admin/legal/RichTextEditor.tsx`** *(new, client)* — contentEditable with `.prose`
   typography, sticky toolbar (H2/H3, B, I, UL, OL, link via `AdminDialog` form, clear
   formatting), caret-aware button state, paste-as-plain-text, `value`/`onChange` HTML string.
   No new dependency.
3. **`src/app/admin/legal/LegalEditor.tsx`** *(new, client)* — doc tabs + ID/EN toggle, live
   preview, the "perbaikan kecil — jangan ubah tanggal" checkbox, Simpan / Muat konten bawaan /
   Kembalikan ke bawaan (the last two behind `AdminDialog` confirms), dirty-state guard.
4. **`src/app/admin/legal/page.tsx`** *(new, server)* — status matrix (Bawaan/Kustom, public
   `revised_at`, last `updated_at`, `updated_by`) + the editor.
5. **`src/app/admin/layout.tsx`** — nav entry `['/admin/legal', 'Dokumen Legal']`;
   **`src/lib/admin/log.ts`** — the two new action labels.
6. **Tests** — `actions.test.ts`: guard rejection, validation, **`minorFix: true` leaves
   `revised_at` out of the upsert while a normal save sets it**, audit called.

**Verify:** `npm run typecheck && npm run test && npm run check:tokens`; manual pass — save an
override, confirm the public page shows the new text and the new date; save again with
"perbaikan kecil", confirm the date did not move; reset, confirm the default returns.
