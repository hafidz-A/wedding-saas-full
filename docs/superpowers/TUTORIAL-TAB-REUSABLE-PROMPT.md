# Reusable prompt — "Add a Tutorial/Panduan tab to a template's dashboard"

Paste the block below into a fresh Claude Code session, replacing `<TEMPLATE>` with the template
name (e.g. `aurora`) and filling in the template facts where asked. It is template-agnostic: it
tells the agent to *derive* the categories and copy from whatever the template actually does, while
reusing the shared renderer/architecture already shipped for `lovebirds` and `solary`.

---

GOAL: Add (or expand) an in-dashboard **Tutorial/Panduan tab** for the `<TEMPLATE>` wedding-invitation
template, matching the concept already shipped for `lovebirds` and `solary`. It is a categorized,
screenshot-backed, **bilingual (ID + EN)** self-serve guide the couple reads inside their dashboard.
It MUST adapt to THIS template's real features — do not copy another template's categories blindly.

STEP 0 — derive the content from the template (don't assume):
1. Open this template's `DashboardClient.tsx` and read the actual tab keys it renders. Each
   meaningful tab/feature → one tutorial category (e.g. Editor, Palette, Music, RSVP, Gifts, Guests,
   Guestbook, Background/Ornament, Meta…). Drop tabs this template doesn't have.
2. Note template-specific concepts that change the copy: the section model (sections vs "planets" vs
   blocks), which sections are locked/mandatory/swappable, the gallery rule, media size limits, the
   signature guest-facing experience (animations, popups, scroll behaviour), and any premium-gated
   features.
3. Choose the navigation STYLE for this template's tutorial (both are supported by the shared
   renderer — pick what fits):
   - **Grouped** (like lovebirds): for many categories (>10), bucket them into 3–5 labelled groups;
     optionally add per-section "guide cards".
   - **Flat + search** (like solary): one row of pills + a search box; add "Open <tab> →" deep-links.

ARCHITECTURE — reuse the shared system, do NOT fork it:
- `src/app/[template]/[slug]/dashboard/tutorial/content.ts` — structure only (no prose). Interface:
  `TutorialCategory = { id, group?, premiumOnly?, relatedTab?, stepCount, alwaysCount, neverCount,
  tipCount, sectionGuideCount?, faqCount?, shots: {key, captionKey}[] }`. Add a
  `TUTORIAL_CATEGORIES_<TEMPLATE>` array and return it from `getTutorialCategories(template)`.
- `src/app/[template]/[slug]/dashboard/TutorialTab.tsx` — the ONE shared renderer. It already:
  renders grouped subnav when categories have `group`, else a flat (optionally searchable) subnav;
  renders numbered `steps`, `always`/`never`/`tips` (✅/⛔/💡 markers), optional section-guide cards
  (👁 sees / ✍️ fill / ⚠️ watch) and a FAQ `<details>` accordion; shows an "Open tab" deep-link when a
  category has `relatedTab` + a copy `openTab` label + the `onOpenTab` prop (wired to `setTab` in
  DashboardClient). Extend it only ADDITIVELY and gate any new UI so other templates are byte-identical.
- `src/lib/i18n/dictionaries/dashboard.ts` — copy lives under `tabs.tutorial.<TEMPLATE>.*` (merged over
  the shared root by the renderer). Shared `headings`/`groups` stay shared. EVERY string in BOTH `id`
  and `en`.
- `public/tutorial/<TEMPLATE>/<key>.png` — annotated screenshots (best-effort; the renderer's `onError`
  auto-hides any missing figure, so copy ships before images do).

CONTENT RULES:
- Each category = a 1-line `summary` + `steps` (how-to) + `always` (do) + `never` (don't/forget) +
  `tips`. The counts in content.ts MUST equal the dict array lengths.
- Include, where relevant: a **Quickstart/checklist** (ordered "zero → published" path), a **"What
  guests see"** category that explains this template's signature experience, a **Photo guide** (where
  each photo appears + ideal size/ratio), a **Billing / active-period & upgrade** category, and a
  **FAQ** (Q&A troubleshooting). Add/relabel categories to match the template.
- Tone: elegant and natural in each language — NOT a literal word-for-word translation. ID in a clear,
  warm, slightly casual register; EN the natural equivalent. The language toggle changes only the
  dashboard UI copy, never the guest-facing invitation.

HARD REQUIREMENTS & GOTCHAS (these have bitten before):
- **Bilingual is mandatory.** `src/lib/i18n/__tests__/dict-parity.test.ts` enforces identical id/en
  key paths *including array lengths* — run it after every copy edit; a forgotten EN string fails it.
- **Copy-integrity test:** add/extend `tutorial-copy[-<template>].test.ts` to lock each category's dict
  copy to its declared counts in both languages, and to check block shapes (faq `{q,a}`, section-guide
  `{title,sees,fill,watch}`), shot captions, and an `openTab` string wherever `relatedTab` is set.
- **List-marker gotcha:** the app has a global `ul, ol { list-style: none }` reset
  (`src/styles/global.css`). The tutorial's numbered steps MUST re-enable markers in
  `TutorialTab.module.css` (`.steps { list-style: decimal outside }` + a styled `::marker`), or steps
  render as plain indented text with no numbers.
- **Don't regress other templates.** New `content.ts` fields are optional; gate any new renderer UI so
  existing templates render exactly as before. Add a regression check (open another template's tutorial
  and confirm it's unchanged).
- **Dev-server gotcha:** never run `npm run build` while `npm run dev` is running, and keep only ONE
  `next dev` at a time — either corrupts `.next` and every route 500s. If that happens: kill the dev
  server(s), delete `.next`, restart one `npm run dev`.
- Stage only the files you changed (never `git add -A`); the `[template]/[slug]` paths contain brackets
  and need `GIT_LITERAL_PATHSPECS=1` when `git add`-ing them.

PROCESS: brainstorm the category list + nav style with me first → write a spec under
`docs/superpowers/specs/` → write a task-by-task plan under `docs/superpowers/plans/` → execute it with
`npm test` + `npm run build` green after each step → final review.

VERIFY: `npm test` (incl. dict-parity + copy-integrity) green; `npm run build` clean; load
`/<TEMPLATE>/<slug>/dashboard` → Tutorial tab shows every category, the ID/EN toggle swaps *every*
string, search/deep-links work, numbered steps show markers, screenshots render or auto-hide; other
templates unchanged.

---

## Reference: how lovebirds & solary differ (so you can mirror or diverge intentionally)

| | lovebirds | solary |
|---|---|---|
| Nav style | grouped (4 groups) | flat + search box |
| Signature blocks | per-section guide cards (14) + FAQ accordion | "open tab" deep-links + FAQ accordion |
| Categories | 13 (incl. checklist, sections, billing, faq) | 12 (incl. quickstart, experience, photos, faq; no ornament) |
| Copy location | `tabs.tutorial.*` | `tabs.tutorial.solary.*` |
| content.ts list | `TUTORIAL_CATEGORIES` | `TUTORIAL_CATEGORIES_SOLARY` |

Both share one `TutorialTab.tsx`, one `content.ts` model (count-based), one FAQ accordion, and one set
of shared `headings`/`groups`. That is the pattern to keep: **one renderer, per-template content + style.**
