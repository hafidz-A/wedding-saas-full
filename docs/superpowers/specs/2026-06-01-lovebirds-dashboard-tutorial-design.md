# Lovebirds — Gallery single-instance fix + in-dashboard Tutorial tab

> Date: 2026-06-01
> Status: Approved design, pending implementation plan
> Scope: lovebirds template only (solary tutorial is a separate future effort)

---

## Summary

Two independent pieces of work, both surfaced from one user request on the
lovebirds template:

- **Part A — bug fix.** The block editor still lets a *non-gallery* section be
  type-swapped into a second gallery, so a couple can end up with two galleries
  (masonry **and** springcoil). The template should allow **exactly one**
  gallery — either `galleryMasonry` *or* `gallerySpringCoil`. (`photoblast` is
  not a gallery; lovebirds has no such type, so nothing to exclude there.)

- **Part B — feature.** A new **in-dashboard "Tutorial" tab** for the couple,
  with per-category sub-tabs, bilingual ID/EN content (driven by the existing
  i18n dict), and real annotated screenshots of the actual dashboard. Lovebirds
  only for now.

The two parts share no files and can ship independently.

---

## Part A — Gallery single-instance fix

### Problem

`src/editor/templatePolicy.ts` defines a `swapGroups` map so a gallery section
can switch between `galleryMasonry` and `gallerySpringCoil`:

```ts
swapGroups: {
  galleryMasonry:   ['galleryMasonry', 'gallerySpringCoil'],
  gallerySpringCoil:['galleryMasonry', 'gallerySpringCoil'],
},
```

But the "used elsewhere" / "used" bookkeeping in `availableSwapTypes` and
`availableAddTypes` keys on the **literal type string**. So:

- **Swap menu leak:** a Quote section's "change type" dropdown filters out types
  used by other sections, but `galleryMasonry` and `gallerySpringCoil` are
  distinct strings. If the page already has a `galleryMasonry`, Quote is still
  offered `gallerySpringCoil` → swapping produces two galleries.
- **Add menu leak:** `availableAddTypes` has the same blind spot — with a
  `galleryMasonry` present it still offers `gallerySpringCoil` in "Add section".

### Fix

Treat a swap-group as **one occupied slot**. Introduce a helper that expands a
set of used types to include every sibling of any used swap-group member:

```ts
// pseudo
function expandUsedBySwapGroup(used: Set<string>, policy): Set<string> {
  const out = new Set(used)
  for (const t of used) {
    for (const sib of policy.swapGroups?.[t] ?? []) out.add(sib)
  }
  return out
}
```

- **`availableAddTypes`** — compute `used`, expand it by swap-group, then filter
  the pool against the expanded set. Result: a gallery type is offered only when
  **no** gallery type is currently in use.
- **`availableSwapTypes`** — compute `usedElsewhere`, expand it by swap-group,
  then filter. A *gallery's own* dropdown still uses its `swapGroups` pool, so it
  keeps offering masonry ↔ springcoil (the group members are excluded from
  `usedElsewhere` for the current section because they belong to *this* section's
  group — verify the current section's own type/group members are not treated as
  "used elsewhere"). A *non-gallery's* dropdown drops gallery types entirely
  while any gallery exists.

Edge cases to preserve:
- A gallery section swapping to the other gallery type must still work (it is the
  whole point of the group).
- Mandatory types (`rsvp`, `weddingGift`) remain excluded from swap options as
  today.
- `photoblast` — confirm it appears in no swap group (it does not; the lovebirds
  registry has no `photoblast` type). No change.

### Tests

Add to `src/editor/__tests__/template-policy.test.ts` (or the existing
`templatePolicy.test.ts`):

1. With a `galleryMasonry` section present, `availableSwapTypes(...)` for a
   `quote` section **must not** include `gallerySpringCoil`.
2. With a `galleryMasonry` section present, `availableAddTypes(...)` **must not**
   include `gallerySpringCoil`.
3. A `galleryMasonry` section's own `availableSwapTypes(...)` **must still**
   include `gallerySpringCoil` (regression guard — swapping galleries stays
   allowed).
4. With **no** gallery present, `availableAddTypes(...)` includes both gallery
   types (regression guard).

---

## Part B — In-dashboard Tutorial tab

### Goal

Give the couple an in-context guide: how to use each part of the dashboard,
what to **always** do, and what **not** to do / not to forget. Tabbed by
category, bilingual, illustrated with real annotated screenshots.

### Architecture

- **New component:** `src/app/[template]/[slug]/dashboard/TutorialTab.tsx`
  (`'use client'`). Renders an inner sub-tab navigation (the "tab perkategori")
  and a content pane per category.
- **New styles:** `src/app/[template]/[slug]/dashboard/TutorialTab.module.css`,
  matching the dashboard chrome (bg `#F5EFE3`, ink `#2A2118`, accent `#E8553E`,
  body font `var(--font-body)`).
- **Content as data, not hardcoded JSX.** A typed content model (array of
  categories, each with ordered blocks: summary / steps / always / never / tips
  / screenshot refs). All user-visible strings come from the i18n dict; the data
  model holds only structure + screenshot keys.
- **i18n:** extend `src/lib/i18n/dictionaries/dashboard.ts`:
  - `chrome.tabs.tutorial` — the nav label (id: "Tutorial", en: "Tutorial" /
    "Guide").
  - `tabs.tutorial.*` — the full content tree (category titles + every block of
    copy), authored in both `id` and `en`. `dict-parity.test.ts` enforces the
    two languages keep identical key shapes.
- **Screenshots:** static PNGs under `public/tutorial/lovebirds/`, referenced by
  stable key (e.g. `editor-add-section.png`). Captured from the real running
  dashboard, cropped, and annotated (numbered markers, highlight boxes, arrows).

### Dashboard integration (minimal, in `DashboardClient.tsx`)

- Add `'tutorial'` to the `TabKey` union.
- Push `'tutorial'` into `tabKeys` **only when `template === 'lovebirds'`**
  (mirrors how the `ornament` tab is gated to non-solary). Placed last in the
  nav.
- Add one render branch: `{tab === 'tutorial' && <TutorialTab lang={lang} />}`
  (plan/template passed if needed so plan-gated categories like Buku Tamu can be
  conditionally shown).
- No other dashboard chrome changes.

### Categories (sub-tabs)

Mirror the real dashboard tabs, plus a starter:

1. **Mulai di sini** — login, Terbit/Draf toggle, status bayar/aktif period,
   "Lihat live", bahasa toggle.
2. **Editor Section** — tambah / hapus / urutkan section; Hero & Footer terkunci
   di ujung; RSVP + Hadiah wajib & tak bisa dihapus/dipindah; **aturan 1 galeri**
   (masonry *atau* springcoil, tidak bisa dua); upload foto; tombol **Simpan**.
3. **Palette** — pilih warna; tamu melihat palette ini.
4. **Latar / Ornamen** — background + ornamen melayang (burung/kupu/bertengger).
5. **Musik** — upload MP3, teks popup, loop/aktif.
6. **RSVP** — baca respons, filter, unduh CSV.
7. **Hadiah** — konfirmasi amplop/hadiah, total.
8. **Tamu** — undangan personal, link share, message template.
9. **Buku Tamu** — *premium only*; shown conditionally on plan.

### Per-category block layout (consistent)

Each category renders the same shape, omitting empty blocks:

- **Ringkasan** — one or two sentences: what this is for.
- **Cara pakai** — numbered steps, each may carry a screenshot.
- ✅ **Selalu lakukan** — the must-always list.
- ⛔ **Jangan / jangan lupa** — the don'ts and easy-to-forget items.
- 💡 **Tips** — optional.

### Screenshot pipeline (implementation-time)

1. Start dev server (`npm run dev`).
2. Log into a lovebirds demo invitation (seed one via
   `scripts/create-invitation.mjs` + `seed-full-config.mjs` if none exists).
3. For each tab/flow: navigate, inject a DOM overlay (numbered circles +
   translucent highlight rectangles + arrows positioned from target element
   bounding boxes), screenshot with a clip region to crop, save PNG to
   `public/tutorial/lovebirds/`.
4. Reference each PNG by its stable key from the content model.

### Testing

- **Part A:** the new unit tests above.
- **Part B:** `dict-parity.test.ts` passes (auto-covers the new tutorial keys);
  manual check — open the Tutorial tab, switch sub-tabs, toggle EN/ID and confirm
  copy switches, confirm screenshots render and are gated correctly (Buku Tamu
  category only on premium, tab only on lovebirds).

---

## Out of scope

- Solary tutorial (separate future effort).
- Any change to lovebirds template section components (`src/all-templates/
  lovebirds/**`) — those are under active parallel edit; this work must not touch
  them.

## WIP / safety notes

- User's parallel edits are all under `src/all-templates/lovebirds/**`. This work
  touches `src/editor/`, `src/app/[template]/[slug]/dashboard/`, the dict, and
  `public/` — no overlap.
- Do **not** `git add -A`; stage only this work's files and leave the user's WIP
  unstaged. Dashboard paths contain `[template]`/`[slug]` brackets — git
  pathspecs for them need `GIT_LITERAL_PATHSPECS=1`.
