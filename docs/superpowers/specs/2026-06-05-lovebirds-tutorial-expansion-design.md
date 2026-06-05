# Lovebirds — Tutorial tab expansion ("lebih lengkap")

> Date: 2026-06-05
> Status: Approved design, pending implementation plan
> Scope: **lovebirds template only**. Solary tutorial is a separate effort in
> another session (`2026-06-05-solary-tutorial-expansion-design.md`) and must NOT
> be touched here.

---

## Summary

Expand the in-dashboard **Tutorial tab** for lovebirds so it is materially more
complete. Four things, all driven by the existing i18n dict + a typed content
model:

1. **Deepen** the 9 existing categories (more detailed steps / always / never /
   tips / captions).
2. **Add 4 new categories**: `checklist` (zero-to-published roadmap), `sections`
   (per-section guide cards for every lovebirds section), `billing` (active
   period & upgrade), `faq` (Q&A troubleshooting).
3. **Group the subnav** into 4 labelled groups so ~13 categories stay scannable.
4. **Two new content shapes** in the renderer: section-guide cards and a Q&A
   (FAQ) accordion — additive, so existing categories are unaffected.

All copy is authored **bilingual ID + EN**; `dict-parity.test.ts` enforces it.
Media is text + annotated screenshots (no video), following the existing PNG
pattern.

### Non-goals / hard constraints

- **No solary changes whatsoever** — not even grouping. `TUTORIAL_CATEGORIES_SOLARY`
  and `tutorial.solary.*` stay byte-identical; solary continues to render a flat
  subnav with its current categories.
- No changes under `src/all-templates/**` (active parallel WIP).
- No new dependencies, no UI library (CSS Modules only).

---

## Architecture

Same three-file shape as today:

- **Structure/data:** `src/app/[template]/[slug]/dashboard/tutorial/content.ts`
  (typed category list — no user copy).
- **Renderer:** `src/app/[template]/[slug]/dashboard/TutorialTab.tsx` (`'use client'`).
- **Styles:** `src/app/[template]/[slug]/dashboard/TutorialTab.module.css`.
- **Copy:** `src/lib/i18n/dictionaries/dashboard.ts` under `tabs.tutorial.*`.
- **Screenshots:** `public/tutorial/lovebirds/<key>.png`.

### Shared-file safety (lovebirds vs solary)

`content.ts` and `TutorialTab.tsx` are shared by both templates. All edits MUST
keep solary output identical:

- Grouping is **opt-in via a `group` field**. Only `TUTORIAL_CATEGORIES`
  (lovebirds) gains `group`. When a template's categories have no `group`, the
  subnav renders **flat** exactly as today. `TUTORIAL_CATEGORIES_SOLARY` is left
  untouched → flat.
- New block shapes (`sectionGuideCount`, `faqCount`) are optional and only set on
  lovebirds categories. Solary categories never set them → those blocks never
  render for solary.
- New copy goes under the shared `tabs.tutorial.*` root. Solary's `TutorialTab`
  merges `{ ...root, ...root.solary }`, so it *could* resolve e.g. `root.checklist`
  — but `TUTORIAL_CATEGORIES_SOLARY` does not list `checklist`, so it is never
  accessed. Group labels live under `tabs.tutorial.groups.*` (shared) and are only
  read when a category has a `group`.

---

## Information architecture (lovebirds)

4 labelled groups, 13 categories:

| Group (id) | Group label (id / en) | Categories |
|---|---|---|
| `prep` | Persiapan / Getting started | `start`, `checklist` |
| `fill` | Mengisi undangan / Filling your invitation | `editor`, `sections`, `palette`, `ornament`, `music` |
| `data` | Tamu & data / Guests & data | `rsvps`, `gifts`, `guests`, `guestbook` (premium) |
| `help` | Akun & bantuan / Account & help | `billing`, `faq` |

Order within the subnav follows the table top-to-bottom. `guestbook` stays
`premiumOnly` (hidden on Basic). `guests` is retitled **"Tamu & Bagikan" /
"Guests & Sharing"** and absorbs the sharing topic (personal vs generic link, WA
template, send etiquette, QR/preview) — no separate `share` category.

---

## Content model (content.ts)

```ts
export type TutorialCategoryId =
  | 'start' | 'checklist' | 'editor' | 'sections' | 'palette' | 'ornament'
  | 'music' | 'rsvps' | 'gifts' | 'guests' | 'guestbook' | 'billing' | 'faq'

export type TutorialGroupId = 'prep' | 'fill' | 'data' | 'help'

export interface TutorialGroup {
  id: TutorialGroupId
  /** dict key: tabs.tutorial.groups.<id> */
}

export const TUTORIAL_GROUPS: TutorialGroupId[] = ['prep', 'fill', 'data', 'help']

export interface TutorialCategory {
  id: TutorialCategoryId
  group?: TutorialGroupId            // NEW — set on lovebirds only
  premiumOnly?: boolean
  stepCount: number
  alwaysCount: number
  neverCount: number
  tipCount: number
  sectionGuideCount?: number         // NEW — # of cards in c.sectionGuides[]
  faqCount?: number                  // NEW — # of Q&A pairs in c.faqs[]
  shots: TutorialShot[]
}
```

- `TUTORIAL_CATEGORIES` (lovebirds): every entry gets a `group`; `sections` gets
  `sectionGuideCount`; `faq` gets `faqCount`; `checklist`/`billing` use the
  existing step/always/never/tip fields.
- `TUTORIAL_CATEGORIES_SOLARY`: **unchanged**.
- `getTutorialCategories(template)`: unchanged signature/behaviour.

### New copy block shapes (in the dict, per category)

```ts
// for `sections`: c.sectionGuides is an ordered array, length = sectionGuideCount
sectionGuides: [
  { title: string, sees: string, fill: string, watch: string }, // 👁 / ✍️ / ⚠️
  ...
]
// for `faq`: c.faqs is an ordered array, length = faqCount
faqs: [ { q: string, a: string }, ... ]
```

Both authored in `id` and `en`. The renderer reads them defensively (same
falsy-filter pattern as the existing `list()` helper) so a short/missing array
never throws.

---

## Renderer (TutorialTab.tsx)

Additive changes only:

1. **Grouped subnav.** If any visible category has a `group`, render the subnav as
   groups: for each `g` in `TUTORIAL_GROUPS`, a small group label
   (`t.groups[g]`) followed by the buttons for categories whose `group === g`
   (premium filter unchanged). If no category has a `group` (→ solary), render the
   current flat list. Active-tab logic unchanged.
2. **Section-guide block.** When `cat.sectionGuideCount`, render a `<SectionGuide>`
   list from `c.sectionGuides`: each card shows the section title and three
   labelled lines (👁 *Apa yang tamu lihat* / ✍️ *Cara mengisi* / ⚠️ *Hati-hati*),
   using `t.headings.sees/fill/watch`. Placed where `steps` would be.
3. **FAQ block.** When `cat.faqCount`, render a `<Faq>` list from `c.faqs` using
   native `<details><summary>` accordions.
4. Existing blocks (summary / shots / steps / always / never / tips) unchanged.

New headings needed under `tabs.tutorial.headings`: `sees`, `fill`, `watch`, and
`faq` (section label). `steps`/`always`/`never`/`tips` already exist.

### Styles (TutorialTab.module.css)

Add: group label style in subnav; `.sectionGuide` card (matches dashboard chrome
— bg `#F5EFE3`, ink `#2A2118`, accent `#E8553E`, `var(--font-body)`); `.faqItem`
accordion (summary row + answer). No changes to existing class output.

---

## Content plan

### New: `checklist` — "Dari nol sampai terbit"
~10 ordered steps mapping the whole journey (login & language → core data in Hero
→ arrange & fill sections → upload gallery & music → palette & ornament → Wedding
Gift accounts & RSVP → preview live on phone + desktop → add guests & message
template → confirm Published + active period → share personal links). Plus
always / never / tips. Screenshot: reuse `start-header` (or optional
`checklist-overview`).

### New: `sections` — per-section guide cards (ALL sections)
One card per section, each with sees / fill / watch:
Hero, Quote, Bride & Groom, Our Story, Event Details, Schedule, Gallery
(Masonry/Spring Coil — note the **one-gallery rule** + "Ganti tipe section"),
Wedding Party, Accommodations, FAQ-section (guest-facing Q&A — distinct from the
`faq` help category), Wedding Gift (bank/e-wallet, gift address, confirmation
toggle; registry folded in), RSVP, Footer, and a brief Blocks (custom) note.
Countdown is covered under Hero (folded via `countdownEnabled`). Screenshot:
reuse `editor-list` (optional one live-invitation reference shot).

### New: `billing` — "Bayar, Masa Aktif & Upgrade"
Reading the active-period status/banner; what expiry means (guests can't open);
how to pay / extend; Basic vs Premium; upgrade flow (pay the difference, **no data
lost**); what's locked on Basic (Buku Tamu). Plus always / never / tips.
Screenshots: **new** `billing-status`, `billing-upgrade`.

### New: `faq` — "FAQ & Solusi Masalah" (Q&A)
Q&A pairs for common problems: stretched photos (use sane ratio); music not
playing (Active toggle + browsers block autoplay → popup needs a tap); lost edits
(forgot **Save** / reloaded); guests can't open (still Draft / unpaid-expired);
forgot password (reset via email); guest name not showing (use personal link, not
generic); can't have two galleries (one-gallery rule); MP3 rejected (>12 MB). No
screenshot.

### Deepen the 9 existing categories
- **start** — login/password + forgot-password (email reset), Draft vs Published,
  the top-bar elements, language-toggle persistence.
- **editor** — drag-reorder, Hero/Footer locked, RSVP+Gift mandatory & locked,
  one-gallery rule + how to swap, photo upload (size/format/ratio), nav-label
  edit, Save behaviour.
- **palette** — what each palette does to the guest view, preview before save.
- **ornament** — bird / butterfly / perched, where they appear, matching the mood.
- **music** — MP3 ≤12 MB, popup text, loop/active, why a popup is needed (autoplay
  block), pick a long soft track.
- **rsvps** — reading responses, attending count, filter/search, CSV export, meal
  options mirror guest choices.
- **gifts** — guest input ≠ transfer proof, reconcile with bank, CSV, relation to
  the Wedding Gift confirmation toggle.
- **guests (Tamu & Bagikan)** — add guests, personal vs generic link, WA template
  (`{{name}}`/`{{url}}`), send in batches, QR/preview, check name before sending.
- **guestbook** — premium gating, upgrade (pay difference, no data lost), used on
  the day for check-in.

---

## Screenshots

- Reuse existing 11 PNGs for the old categories.
- New captures from the demo account `/lovebirds/dummy-lovebirds/dashboard`
  (login per the dummy-lovebirds memory): `billing-status`, `billing-upgrade`.
- `onError` already hides a missing `<figure>`, so copy ships even before a shot
  is captured. FAQ has no screenshot.

---

## i18n & testing

- Every new/edited string authored in **both** `id` and `en` under
  `tabs.tutorial.*`; group labels under `tabs.tutorial.groups.*`; new headings
  under `tabs.tutorial.headings.*`.
- `dict-parity.test.ts` auto-covers the new keys (id/en shape must match).
- `npm test` green; `npm run build` clean.
- Manual QA (lovebirds): open Tutorial, walk all 13 categories across 4 groups,
  toggle ID/EN, verify section-guide cards + FAQ accordion, premium gating
  (`guestbook` hidden on Basic, visible on Premium), screenshots load or hide
  gracefully.
- **Regression QA (solary): tutorial unchanged** — flat subnav, original
  categories only, no section-guide/FAQ blocks.

---

## Files touched

- `src/app/[template]/[slug]/dashboard/tutorial/content.ts`
- `src/app/[template]/[slug]/dashboard/TutorialTab.tsx`
- `src/app/[template]/[slug]/dashboard/TutorialTab.module.css`
- `src/lib/i18n/dictionaries/dashboard.ts` (lovebirds `tabs.tutorial.*` + shared
  `groups`/`headings` only)
- `public/tutorial/lovebirds/billing-status.png`, `billing-upgrade.png` (new)

**Not touched:** `src/all-templates/**`, `tabs.tutorial.solary.*`,
`TUTORIAL_CATEGORIES_SOLARY`, the solary spec.

## WIP / safety notes

- Dashboard paths contain `[template]`/`[slug]` brackets — git pathspecs need
  `GIT_LITERAL_PATHSPECS=1`.
- Do **not** `git add -A`; stage only the files above and leave parallel WIP
  unstaged. The cwd can drift — use `git -C <repo>`.

## Implementation phases (for the plan)

1. **Structural** — content.ts types/groups/counts; TutorialTab grouped subnav +
   `<SectionGuide>` + `<Faq>` + CSS; verify with placeholder copy (solary flat
   render verified unchanged).
2. **Deepen** the 9 existing categories (bilingual).
3. **New copy** — `checklist`, `sections` (all cards), `billing`, `faq`
   (bilingual).
4. **Screenshots** — capture `billing-*`, wire keys.
5. **Verify** — dict-parity, manual ID/EN, premium gating, solary-unchanged, build.
