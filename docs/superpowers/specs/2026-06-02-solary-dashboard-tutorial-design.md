# Solary Dashboard Tutorial — Design

**Date:** 2026-06-02
**Status:** Approved pending review
**Related:** `2026-06-01-lovebirds-dashboard-tutorial-design.md` (the lovebirds equivalent this mirrors)

## Goal

Turn on the in-dashboard **Tutorial tab** for the `solary` template. It is already coded
(`TutorialTab.tsx` + `tutorial/content.ts` + i18n copy) but hard-wired to lovebirds and hidden
for solary (`DashboardClient.tsx:91` — "Tutorial is lovebirds-only for now (solary gets its own later)").

The tab gives a solary couple a categorized, screenshot-backed guide to their dashboard, with four
buckets per category: **Cara pakai / Selalu lakukan / Jangan–jangan lupa / Tips** (How to / Always /
Never–don't-forget / Tips). Bilingual (ID + EN), matching the dashboard language toggle.

## What's solary-specific (vs lovebirds)

The solary dashboard shows these tabs (from `DashboardClient.tsx`): **RSVP, Hadiah, Tamu, Buku Tamu
(premium), Editor, Palette, Musik**. There is **no Ornament/Latar tab** — solary renders its own
Three.js galactic background, so that tab is hidden. Tutorial categories therefore drop `ornament`.

Copy differences from the lovebirds tutorial:
- **Palette:** solary has **8 palettes in two groups** — Dark (Purple, Nebula, Rose, Emerald) and
  Light (Lavender, Sunburst, Rose, Botanical). Not the "two options" the lovebirds copy implies.
- **No ornament category.** Mention instead that the galactic background is automatic; the
  per-section "planet" look follows the chosen palette.
- **Editor:** sections are positional "planets"; the set is fixed (no add/remove); Hero/opening gate
  is locked first and Footer locked last; the gallery is swap-only (one gallery). Same Save discipline.
- **Music:** identical mechanics — one MP3 ≤ 12 MB, popup text, Enabled + Loop toggles, Save.
- **Editor photos:** images ≤ 5 MB (`upload/route.ts`).

## Architecture / changes

Make the existing tutorial system template-aware. Four edited files, one new asset folder.

1. **`tutorial/content.ts`**
   - Keep `TUTORIAL_CATEGORIES` (lovebirds) and add `TUTORIAL_CATEGORIES_SOLARY` (same shape, no
     `ornament`).
   - Export `getTutorialCategories(template: string)` returning the solary list for `'solary'`,
     lovebirds otherwise.
   - Solary shot keys: `start-header`, `editor-list`, `editor-gallery-rule`, `editor-save`,
     `palette-grid`, `music-upload`, `rsvps-table`, `gifts-table`, `guests-share`, `guestbook-ledger`.

2. **`TutorialTab.tsx`**
   - Accept a `template: string` prop.
   - `SHOT_BASE = \`/tutorial/${template}\``.
   - Categories from `getTutorialCategories(template)`.
   - Copy namespace: `const root = dict.tabs.tutorial; const copy = template === 'solary' ? root.solary : root`.
     Headings/navTitle stay shared (`root.headings`, `root.navTitle`); per-category copy is `copy[cat.id]`.
   - The existing `onError` hide-on-missing-image behavior stays, so partial screenshot sets degrade gracefully.

3. **`lib/i18n/dictionaries/dashboard.ts`** (both `id` and `en` trees)
   - Under `tabs.tutorial`, add a `solary: { start, editor, palette, music, rsvps, gifts, guests, guestbook }`
     sub-object with solary-accurate copy. Existing flat keys remain the lovebirds copy.

4. **`DashboardClient.tsx`**
   - Line ~91: show the tutorial tab for solary as well (`keys.push('tutorial')` for both templates).
   - Pass `template={template}` to `<TutorialTab>`.

5. **`public/tutorial/solary/`** (new) — 8–10 annotated PNG screenshots, keys as above.

## Screenshots

Captured from the live dummy account already running on `localhost:3000`:
- URL: `/solary/dummy-solary/dashboard`
- Login: `dummy+dummy-solary@example.com` / `test1234`

Method: Playwright MCP (browser already-available). For each category, navigate to the tab, inject a
lightweight highlight overlay (box + label) over the key control via `evaluate`, then screenshot the
relevant region (element clip = natural crop). Save as `public/tutorial/solary/<key>.png`.

Annotated targets:
- `start-header` — top bar: Published/Draft, active period, View live, Language toggle.
- `editor-list` — left section list (drag handles; no add/remove).
- `editor-gallery-rule` — "Ganti tipe section" gallery swap dialog.
- `editor-save` — Save button.
- `palette-grid` — the two palette groups, one selected.
- `music-upload` — MP3 upload panel + Enabled toggle.
- `rsvps-table` — stats + table.
- `gifts-table` — gifts list + total.
- `guests-share` — share-link panel.
- `guestbook-ledger` — premium ledger (dummy is premium).

## Out of scope / YAGNI

- No change to the tutorial visual design (`TutorialTab.module.css` is reused as-is).
- No new dashboard features — documentation only.
- No automated screenshot regeneration pipeline; screenshots are committed PNGs.

## Testing / verification

- `npx tsc --noEmit` (or the project's typecheck) passes after the prop + content changes.
- Load `/solary/dummy-solary/dashboard` → Tutorial tab appears, all 8 categories switch, solary
  screenshots render, ID/EN toggle swaps the copy.
- Load a lovebirds dashboard → unchanged (still its own categories + screenshots).
