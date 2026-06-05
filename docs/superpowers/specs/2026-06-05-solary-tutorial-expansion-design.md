# Solary Dashboard Tutorial — Expansion (lebih lengkap)

**Date:** 2026-06-05
**Status:** Draft, pending user review
**Branch:** `feat/solary-editor`
**Builds on:** `2026-06-02-solary-dashboard-tutorial-design.md` (the version that first turned the tab on for solary)

## Goal

Make the in-dashboard **Tutorial tab** for `solary` substantially more complete along four axes the
user asked for (all four selected):

1. **New topics** — add 4 categories: Quickstart, "Apa yang tamu lihat" (guest experience),
   Panduan Foto, FAQ.
2. **Deepen existing** — richer steps / always / never / tips on the 8 current categories.
3. **Richer visuals** — 1–2 extra annotated screenshots on high-value categories + shots for the
   new ones.
4. **Better structure** — a searchable table-of-contents and a "Buka tab …" deep-link from each
   category to the dashboard tab it documents.

Audience: the couple operating their own dashboard. Success = they can self-serve (configure,
publish, share, troubleshoot) without asking support, in either ID or EN.

## Chosen approach (B): evolve the content model to be flexible

The current model (`tutorial/content.ts`) hard-codes per-category counts (`stepCount`,
`alwaysCount`, `neverCount`, `tipCount`) and `TutorialTab` renders exactly that many items via a
`list(n, arr)` truncator. New content like **FAQ (Q&A)** and the descriptive **guest-experience**
topic do not fit the `steps/always/never/tips` mold, and the fixed counts make "deepen" brittle
(every added bullet needs a count bump in a second file).

We replace the rigid model with a flexible-but-minimal one:

- **Drop the `*Count` fields.** The renderer renders the **full array** from the dict for each block
  (`steps`, `always`, `never`, `tips`). Adding/removing a bullet becomes a one-file copy edit.
  - *Backward-compat check:* lovebirds dict arrays were authored to exactly the old counts, so
    rendering full arrays produces identical output. The implementation plan must verify each
    lovebirds array length equals its former count before deleting the counts (no silently-hidden
    items).
- **Add one new optional block: `faq`** — an array of `{ q, a }` rendered as a Q&A list under a new
  shared heading `headings.faq`.
- **Add optional `stepsHeading`** per category copy, so the ordered-list block can be relabelled
  (e.g. "Urutan ideal", "Yang dialami tamu", "Di mana foto muncul") and reused for non-"step"
  content instead of inventing more block types. Falls back to `headings.steps`.
- **Add optional `relatedTab` (in `content.ts`) + `openTab` label (in copy)** to drive the deep-link
  button (see Structure below).

This keeps YAGNI: exactly one new block type (`faq`) and one new heading-override, not a general
block engine.

**Lovebirds stays visually frozen** (user decision, 2026-06-05: *"solary aja"*). All new UI —
search/ToC, deep-link buttons, FAQ block — is **solary-only**. The shared content-model refactor
(counts → full arrays) is output-identical for lovebirds, so lovebirds renders exactly as before.
The search input is gated behind `template === 'solary'`; lovebirds categories carry no
`relatedTab`, so no deep-link buttons appear; lovebirds has no `faq` category. `headings.faq` is
added to the shared headings but is simply unused by lovebirds.

**Bilingual is mandatory** (user decision, 2026-06-05): every new and deepened string is authored in
**both** the `id` and `en` dictionary trees. No category, step, tip, FAQ entry, heading, or button
label may exist in one language only. Verification checks EN/ID parity (Testing below).

## Category set (solary) — 12 categories, in display order

| # | id | premium | relatedTab | new? | blocks used |
|---|----|---------|-----------|------|-------------|
| 1 | `quickstart` | — | `editor` | NEW | steps (as "Urutan ideal") + tips + 1 shot |
| 2 | `start` | — | — | existing | steps, always, never, tips, shot |
| 3 | `experience` | — | — | NEW | steps (as "Yang dialami tamu") + tips + shots(live) |
| 4 | `editor` | — | `editor` | existing | steps, always, never, tips, shots |
| 5 | `photos` | — | `editor` | NEW | steps (as "Di mana foto muncul") + tips + shot |
| 6 | `palette` | — | `palette` | existing | steps, always, never, tips, shot |
| 7 | `music` | — | `music` | existing | steps, always, never, tips, shot |
| 8 | `rsvps` | — | `rsvps` | existing | steps, always, never, tips, shot |
| 9 | `gifts` | — | `gifts` | existing | steps, always, never, shot |
| 10 | `guests` | — | `guests` | existing | steps, always, never, tips, shot |
| 11 | `guestbook` | premium | `guestbook` | existing | steps, always, never, shot |
| 12 | `faq` | — | — | NEW | faq (Q&A) only |

Solary still **drops `ornament`** (it renders its own Three.js galaxy). Lovebirds keeps its existing
9 categories (incl. `ornament`) unchanged.

### New-category content (concrete, so the spec is self-contained)

**`quickstart` — "Quickstart 10 menit"** — friendly orientation + ideal order.
Steps (stepsHeading = "Urutan ideal"): isi data mempelai & acara → unggah foto tiap planet →
pilih palette → atur musik → cek lewat "Lihat live" → pastikan status **Terbit** → bagikan link
personal ke tamu. Tips: simpan tiap selesai; kerjakan dari atas ke bawah mengikuti urutan planet.
Deep-link: **Buka tab Editor →**. Shot: `quickstart-overview` (annotated dashboard overview).

**`experience` — "Apa yang tamu lihat"** — explains solary's signature guest-side moments so the
couple understands what they're configuring. Steps (stepsHeading = "Yang dialami tamu"): gerbang
pembuka dengan nama tamu → scroll kosmik antar-planet (kamera mengikuti) → welcome popup 1–2 foto →
story carousel → photo-stars (foto galeri melayang jadi bintang di belakang section lain) →
popup musik saat halaman dibuka. Tips: klik **Lihat live** di bar atas untuk mengalaminya sendiri;
pilih foto terbaik karena sebagian dipakai jadi bintang latar. No deep-link (it's the live invite).
Shots (from the live invitation, best-effort): `experience-planets`, `experience-music-popup`.

**`photos` — "Panduan Foto"** — where each photo appears + size/ratio rules. Steps (stepsHeading =
"Di mana foto muncul"): gerbang pembuka (potret tegak) → welcome (1–2 foto) → story carousel →
galeri → photo-stars (otomatis dari galeri). Tips: maksimal 5 MB per gambar; pakai rasio wajar
(potret untuk gerbang, lanskap/persegi untuk galeri) supaya tidak gepeng; foto galeri ikut jadi
bintang latar jadi pilih yang bagus. Deep-link: **Buka tab Editor →**. Shot: `photos-upload`
(editor upload control close-up).

**`faq` — "FAQ"** — Q&A only. Question set:
1. Undangan tidak bisa dibuka tamu — *cek status harus Terbit, dan masa aktif belum habis.*
2. Foto terlihat gepeng/terpotong — *pakai rasio wajar; potret untuk gerbang, lanskap/persegi untuk galeri.*
3. Perubahan hilang setelah reload — *belum klik Simpan; selalu Simpan sebelum menutup/refresh.*
4. Musik tidak bunyi — *aktifkan toggle Aktif + tamu harus menekan "Terima" di popup (kebijakan browser).*
5. Nama tamu tidak muncul di undangan — *kirim link personal dari tab Tamu, bukan link generic.*
6. Mau tambah/hapus bagian (planet) — *jumlah planet tetap; tata & isi saja. Galeri/RSVP/Hadiah terkunci.*
7. Masa aktif/expired — *selesaikan pembayaran sebelum hari-H; lihat banner di bar atas.*
8. Cara upgrade ke Premium (Buku Tamu) — *bayar selisihnya; undangan tetap online, tak ada data hilang.*

### Deepen existing categories (target depth)

For each of the 8 existing solary categories, bring copy to roughly: steps ≥ 4 concrete actions
(quickstart/editor more), always ≥ 2, never ≥ 2, tips ≥ 1 where useful. Keep the established
"elegant & natural" ID/EN tone (per `[[feedback_translation_quality]]`). No filler; every added
bullet must teach something specific (e.g. editor: mention the "Ganti tipe section" swap, the locked
Gallery/RSVP/Gift, the drag-reorder = guest journey order).

## Structure features

**Searchable table of contents.** Reuse the existing `subnav` pill row as the ToC. Add a small
search input above it: typing filters the visible pills by matching the query (lowercased) against
each category's `title` + `summary` (+ step text). Empty query = all pills. No matches = a short
"tidak ada hasil" line. Clicking a pill selects the category (current behavior). With 12 categories
this earns its keep. State: `const [query, setQuery] = useState('')`, derive `visibleCats`.

**Deep-link to related tab.** `TutorialTab` gains an optional prop
`onOpenTab?: (tab: string) => void`. `DashboardClient` passes `onOpenTab={(k) => setTab(k as TabKey)}`.
When a category has `relatedTab` and `onOpenTab` is provided, render a button under the summary:
label from copy `c.openTab` (e.g. "Buka tab Editor →"), onClick = `onOpenTab(cat.relatedTab)`. The
`relatedTab` id is one of the `DashboardClient` `TabKey`s. Guard: skip the button if the target tab
isn't in the visible set (e.g. non-premium hiding guestbook — already covered since the guestbook
*category* is premium-gated).

## File changes

1. **`tutorial/content.ts`**
   - Extend `TutorialCategoryId` with `quickstart | experience | photos | faq`.
   - Remove `stepCount/alwaysCount/neverCount/tipCount` from `TutorialCategory`; add
     `relatedTab?: string`.
   - Rebuild `TUTORIAL_CATEGORIES_SOLARY` to the 12-category list above (order + shots + relatedTab).
   - Update `TUTORIAL_CATEGORIES` (lovebirds): drop counts **only** (output identical). **No
     `relatedTab`** — lovebirds stays frozen. Categories/order/copy unchanged.

2. **`TutorialTab.tsx`**
   - Render full dict arrays (delete the `list(n, …)` truncation; keep a small `arr(x)` =
     `Array.isArray(x) ? x.filter(Boolean) : []`).
   - Add search input (**rendered only when `template === 'solary'`**) + `visibleCats` filter
     driving the subnav.
   - Add the deep-link button (reads `cat.relatedTab`, `c.openTab`, calls `onOpenTab`). Only solary
     categories have `relatedTab`, so the button never appears on lovebirds.
   - Add a `<Faq>` renderer for `c.faq` (array of `{q,a}`) under `t.headings.faq`.
   - Use `c.stepsHeading ?? t.headings.steps` for the ordered-list heading.
   - New prop `onOpenTab?`. Keep the existing `onError` image hide-on-missing.

3. **`TutorialTab.module.css`** — styles for: search input, deep-link button (pill, kraft theme),
   FAQ block (`.faq`, `.faqQ`, `.faqA`), and an empty-search line. Match the existing warm palette
   (`#2a2118` / `#5c4a3a` / `#8a7866`).

4. **`DashboardClient.tsx`** — pass `onOpenTab={(k) => setTab(k as TabKey)}` to `<TutorialTab>`.
   (Tutorial already enabled for both templates; no change there.)

5. **`lib/i18n/dictionaries/dashboard.ts`** (both `id` and `en` trees)
   - Add `headings.faq` (used only by solary) and the per-category `openTab` label convention.
   - Under `tabs.tutorial.solary` in **both `id` and `en`**: add `quickstart`, `experience`,
     `photos`, `faq` sub-objects and deepen the 8 existing ones. Add `stepsHeading` where relabelled,
     `openTab` where deep-linked, `faq` array for the FAQ category. Author ID and EN together so
     neither tree is missing a key.
   - Lovebirds copy: **unchanged** (no `openTab`, no new keys).

6. **`public/tutorial/solary/`** — new annotated PNGs (best-effort, see below).

## Screenshots

Capture via Playwright MCP against the running dummy account (per
`[[reference_dummy_solary_login]]`): `/solary/dummy-solary/dashboard`, login
`dummy+dummy-solary@example.com` / `DemoTutorial123!`. Method as before: navigate to the tab, inject
a lightweight highlight overlay over the key control, screenshot the region.

New/added shot keys:
- `quickstart-overview` — dashboard with the ideal-order path annotated.
- `editor-section-edit` — a planet's edit panel (text + photo fields) annotated (Editor gets a 4th shot).
- `photos-upload` — the editor image-upload control + 5 MB limit note.
- `palette-dark-light` — the two palette groups labelled Gelap/Terang.
- `rsvps-export` — the filter/search + Unduh CSV control.
- `guests-message` — the WhatsApp message-template + copy-link control.
- `experience-planets`, `experience-music-popup` — from the **live invitation** (`/solary/dummy-solary`
  or a `demo-*` slug), the cosmic scroll and the music popup.

**Dependency / fallback:** screenshot capture needs the dev server running (note the
`[[project_solary_adaptive_and_devserver]]` gotcha: only **one** `next dev` at a time, or `.next`
corrupts). This is the most environment-dependent phase. Because `TutorialTab`'s `onError` already
hides any missing `<img>`, text + structure can ship first and screenshots backfill without breaking
the page. New text categories whose shots aren't captured simply render without an image.

## Implementation phases (for the plan)

1. Content-model refactor in `content.ts` + `TutorialTab.tsx` (counts→full arrays, `faq`,
   `stepsHeading`, `relatedTab`/deep-link, search), `DashboardClient` wiring, CSS. Verify lovebirds
   parity. — *typecheck + manual smoke, no new copy yet.*
2. Copy: 4 new solary categories + deepen 8, ID **and** EN; headings + openTab labels. Lovebirds
   `openTab` labels.
3. Screenshots (Playwright, dummy account) — new + enriched shots.
4. Verify (below).

## Out of scope / YAGNI

- No general block engine — only the `faq` block + `stepsHeading` override.
- No read-progress tracking, no accordion/collapse (user deselected these).
- No video/GIF — annotated PNGs only.
- No changes to dashboard functionality — documentation only.
- No automated screenshot pipeline — committed PNGs.

## Testing / verification

- `npx tsc --noEmit` (project typecheck) passes after the prop + model changes.
- `/solary/dummy-solary/dashboard` → Tutorial tab shows all 12 categories; search filters pills;
  each deep-link button switches the dashboard to the right tab; FAQ renders as Q&A; ID/EN toggle
  swaps **every** new + deepened string (no raw keys, no English leaking into ID, no ID leaking into
  EN). Spot-check both languages on all 12 categories.
- **EN/ID parity check:** every solary tutorial key present in the `id` tree exists in `en` and vice
  versa (no fallbacks to raw keys in either language).
- Lovebirds dashboard → **fully unchanged**: no search box, no deep-link buttons; same categories,
  copy, and screenshots as before.
- Missing-screenshot grace: temporarily reference a non-existent shot → its `<figure>` hides, page
  intact.
