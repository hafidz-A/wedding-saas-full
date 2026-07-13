# Lovebirds — Gallery fix + Tutorial tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one-gallery-per-page in the lovebirds block editor, and add a bilingual in-dashboard "Tutorial" tab with per-category sub-tabs and real annotated screenshots.

**Architecture:** Part A is a pure-function fix in `templatePolicy.ts` (treat a swap-group as one occupied slot) with unit tests. Part B is a new client `TutorialTab` rendered from a typed content model whose copy lives in the existing i18n dict (id/en, parity-tested), illustrated by static PNGs in `public/tutorial/lovebirds/`, gated to the lovebirds template in `DashboardClient.tsx`.

**Tech Stack:** Next.js 14 (App Router), React 18, CSS Modules, Vitest, existing `src/lib/i18n` dict system, Playwright/Chrome-DevTools MCP for screenshots.

---

## File structure

| File | Responsibility |
|---|---|
| `src/editor/templatePolicy.ts` (modify) | Add `expandUsedBySwapGroup` helper; apply it in `availableAddTypes` + `availableSwapTypes`. |
| `src/editor/__tests__/template-policy.test.ts` (modify) | New gallery single-instance tests. |
| `src/app/[template]/[slug]/dashboard/tutorial/content.ts` (create) | Typed content model: category list + block structure + screenshot keys (no prose; prose is in dict). |
| `src/lib/i18n/dictionaries/dashboard.ts` (modify) | `chrome.tabs.tutorial` label + `tabs.tutorial.*` bilingual copy tree. |
| `src/app/[template]/[slug]/dashboard/TutorialTab.tsx` (create) | Renders sub-tabs + per-category blocks from content model + dict. |
| `src/app/[template]/[slug]/dashboard/TutorialTab.module.css` (create) | Tutorial styling matching dashboard chrome. |
| `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` (modify) | Add `'tutorial'` tab key (lovebirds-only) + render branch. |
| `public/tutorial/lovebirds/*.png` (create) | Annotated screenshots. |

**Git note:** the tree has unrelated WIP under `src/all-templates/lovebirds/**`. Never `git add -A`. Stage only the files listed per task. Dashboard paths contain `[` `]` — when git mis-parses them as globs, prefix the command with `GIT_LITERAL_PATHSPECS=1`.

---

## Task 1: Gallery single-instance — failing tests

**Files:**
- Test: `src/editor/__tests__/template-policy.test.ts`

- [ ] **Step 1: Add the failing tests**

Append inside the file (after the existing `describe` blocks):

```ts
describe('lovebirds gallery single-instance', () => {
  const registry: Record<string, unknown> = {
    hero: {}, footer: {}, quote: {}, ourStory: {}, eventDetails: {},
    brideGroom: {}, weddingParty: {}, galleryMasonry: {}, gallerySpringCoil: {},
    schedule: {}, rsvp: {}, weddingGift: {}, accommodations: {}, faq: {}, playlist: {},
  }
  const p = getTemplatePolicy('lovebirds')!

  it('does not offer the other gallery to a non-gallery section when a gallery exists', () => {
    const sections = [
      { id: 's-quote', type: 'quote' },
      { id: 's-gal', type: 'galleryMasonry' },
    ]
    const opts = availableSwapTypes(registry, sections, p, 's-quote', 'quote')
    expect(opts).not.toContain('gallerySpringCoil')
    expect(opts).not.toContain('galleryMasonry')
  })

  it('does not offer the other gallery in the add menu when a gallery exists', () => {
    const sections = [{ type: 'galleryMasonry' }]
    const opts = availableAddTypes(registry, sections, p)
    expect(opts).not.toContain('gallerySpringCoil')
    expect(opts).not.toContain('galleryMasonry')
  })

  it('still lets a gallery section swap to the other gallery type', () => {
    const sections = [{ id: 's-gal', type: 'galleryMasonry' }]
    const opts = availableSwapTypes(registry, sections, p, 's-gal', 'galleryMasonry')
    expect(opts).toContain('galleryMasonry')      // current type stays selectable
    expect(opts).toContain('gallerySpringCoil')   // swap target stays offered
  })

  it('offers both gallery types when no gallery exists yet', () => {
    const sections = [{ type: 'quote' }]
    const opts = availableAddTypes(registry, sections, p)
    expect(opts).toContain('galleryMasonry')
    expect(opts).toContain('gallerySpringCoil')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/editor/__tests__/template-policy.test.ts`
Expected: the first two tests FAIL (current code still offers `gallerySpringCoil`); the last two PASS.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/editor/__tests__/template-policy.test.ts
git commit -m "test(editor): gallery must be single-instance in lovebirds"
```

---

## Task 2: Gallery single-instance — implementation

**Files:**
- Modify: `src/editor/templatePolicy.ts`

- [ ] **Step 1: Add the swap-group expansion helper**

Add this exported helper above `availableAddTypes` (after `isMandatoryType`):

```ts
/**
 * Expand a set of used types so that if any member of a swap-group is used,
 * ALL members of that group count as used. This makes an interchangeable group
 * (e.g. galleryMasonry/gallerySpringCoil) occupy a single slot — you can switch
 * between members but cannot create a second one elsewhere.
 */
export function expandUsedBySwapGroup(
  used: Set<string>,
  policy: TemplatePolicy | null,
): Set<string> {
  if (!policy?.swapGroups) return used
  const out = new Set(used)
  for (const t of used) {
    for (const sib of policy.swapGroups[t] ?? []) out.add(sib)
  }
  return out
}
```

- [ ] **Step 2: Apply it in `availableAddTypes`**

Replace the body of `availableAddTypes` with:

```ts
export function availableAddTypes(
  registry: Record<string, unknown>,
  sections: { type: string }[],
  policy: TemplatePolicy | null,
): string[] {
  const used = expandUsedBySwapGroup(new Set(sections.map((s) => s.type)), policy)
  const pool = policy?.swappablePool ?? Object.keys(registry)
  return pool.filter((t) => !!registry[t] && !used.has(t))
}
```

- [ ] **Step 3: Apply it in `availableSwapTypes`**

In `availableSwapTypes`, change the `usedElsewhere` line so the expansion runs
but the current section's own group is not self-excluded. Replace:

```ts
  const usedElsewhere = new Set(
    sections.filter((s) => s.id !== currentId).map((s) => s.type),
  )
  const group = policy?.swapGroups?.[currentType]
  const pool = group ?? policy?.swappablePool ?? Object.keys(registry)
  const rest = pool.filter((t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t) && !policy?.mandatoryTypes?.includes(t))
```

with:

```ts
  const usedElsewhere = expandUsedBySwapGroup(
    new Set(sections.filter((s) => s.id !== currentId).map((s) => s.type)),
    policy,
  )
  const group = policy?.swapGroups?.[currentType]
  // The current section's own group members are not "taken" by another section,
  // so a gallery can still swap to its sibling.
  if (group) for (const sib of group) usedElsewhere.delete(sib)
  const pool = group ?? policy?.swappablePool ?? Object.keys(registry)
  const rest = pool.filter((t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t) && !policy?.mandatoryTypes?.includes(t))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/editor/__tests__/template-policy.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/templatePolicy.ts
git commit -m "fix(editor): gallery is single-instance in lovebirds (swap-group = one slot)"
```

---

## Task 3: Tutorial content model

**Files:**
- Create: `src/app/[template]/[slug]/dashboard/tutorial/content.ts`

The model holds **structure only** (which categories exist, which blocks each
renders, screenshot keys, plan gating). All prose is resolved from the dict by
key at render time, so this file has no user-facing strings.

- [ ] **Step 1: Create the content model**

```ts
// Structure for the lovebirds dashboard tutorial. Copy lives in the i18n dict
// under dashboard.tabs.tutorial.<categoryId>; this file only declares shape.

export type TutorialCategoryId =
  | 'start' | 'editor' | 'palette' | 'ornament' | 'music'
  | 'rsvps' | 'gifts' | 'guests' | 'guestbook'

export interface TutorialShot {
  /** file at public/tutorial/lovebirds/<key>.png */
  key: string
  /** dict key for the caption: dashboard.tabs.tutorial.<categoryId>.shots.<captionKey> */
  captionKey: string
}

export interface TutorialCategory {
  id: TutorialCategoryId
  /** premium-only categories are hidden for non-premium plans */
  premiumOnly?: boolean
  /** number of numbered steps authored in the dict (steps[0..n-1]) */
  stepCount: number
  /** number of "always" bullets authored in the dict */
  alwaysCount: number
  /** number of "never / don't forget" bullets authored in the dict */
  neverCount: number
  /** number of tips bullets authored in the dict (0 = no tips block) */
  tipCount: number
  /** screenshots shown for this category, in order */
  shots: TutorialShot[]
}

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  { id: 'start',     stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'editor',    stepCount: 6, alwaysCount: 3, neverCount: 4, tipCount: 2,
    shots: [
      { key: 'editor-list',        captionKey: 'list' },
      { key: 'editor-add',         captionKey: 'add' },
      { key: 'editor-gallery-rule',captionKey: 'galleryRule' },
      { key: 'editor-save',        captionKey: 'save' },
    ] },
  { id: 'palette',   stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'palette-grid', captionKey: 'grid' }] },
  { id: 'ornament',  stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'ornament-pick', captionKey: 'pick' }] },
  { id: 'music',     stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps',     stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 1,
    shots: [{ key: 'rsvps-table', captionKey: 'table' }] },
  { id: 'gifts',     stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests',    stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'guests-share', captionKey: 'share' }] },
  { id: 'guestbook', premiumOnly: true, stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
]
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add 'src/app/[template]/[slug]/dashboard/tutorial/content.ts'
git commit -m "feat(dashboard): tutorial content model (structure only)"
```

---

## Task 4: Tutorial dict copy (bilingual)

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts`

Author the full copy tree for **both** `id` and `en`. The `dict-parity` test
compares key paths **including array indices**, so each list MUST have the same
number of items in `id` and `en` (matching the counts declared in `content.ts`).

The substance for each category (author concise, warm Indonesian for `id`,
natural English for `en` — not literal) is below. Wording is the engineer's;
the points are fixed.

- [ ] **Step 1: Add `chrome.tabs.tutorial` label**

In both `id.chrome.tabs` and `en.chrome.tabs`, add:
```ts
tutorial: 'Tutorial',
```

- [ ] **Step 2: Add the `tabs.tutorial` tree (id)**

Add under `id.tabs` (and mirror for `en` in the next step). Shape per category:
`{ title, summary, steps: string[], always: string[], never: string[], tips: string[], shots: { <captionKey>: string } }`.

Author these points:

- **navTitle**: "Tutorial" / section title "Panduan Dashboard".
- **start** — title "Mulai di sini". summary: orientasi dashboard.
  steps: (1) Login pakai email & password undangan. (2) Status **Terbit/Draf** —
  Draf = belum bisa diakses tamu; Terbit = live. (3) Status periode aktif/bayar
  di kanan atas; kalau **belum bayar** ada banner — undangan bisa kedaluwarsa.
  (4) Tombol **"Lihat live"** buka undangan di tab baru; toggle **Bahasa** ganti
  ID/EN.
  always: ["Cek status **Terbit** sebelum bagikan link", "Pastikan periode aktif
  belum kedaluwarsa"].
  never: ["Jangan bagikan link saat masih **Draf**", "Jangan lupa **bayar**
  sebelum hari-H biar tidak kedaluwarsa"].
  tips: ["Klik 'Lihat live' tiap habis edit untuk cek hasil"].
  shots.header: "Bar atas: status Terbit/Draf, periode, Lihat live, Bahasa".
- **editor** — title "Editor Section". summary: atur isi & urutan section.
  steps: (1) Daftar section di kiri — **drag** untuk ubah urutan. (2) Klik
  section untuk **edit teks/foto**; upload foto lewat tombol unggah. (3)
  **Tambah** section dari menu "Add section". (4) **Hero** & **Footer** terkunci
  di paling atas & bawah — tidak bisa dipindah/dihapus. (5) **RSVP** & **Hadiah**
  wajib ada — tidak bisa dihapus. (6) **Galeri cuma boleh satu** — Masonry **atau**
  SpringCoil; kalau sudah ada satu, tipe galeri lain hilang dari menu. Klik
  **Simpan** saat selesai.
  always: ["Klik **Simpan** setiap selesai edit", "Cek hasil lewat 'Lihat live'",
  "Pakai foto rasio wajar biar tidak gepeng"].
  never: ["Jangan reload tanpa **Simpan** — perubahan hilang", "Jangan harap dua
  galeri sekaligus — template ini satu galeri", "Jangan hapus RSVP/Hadiah (memang
  dikunci)", "Jangan upload file non-gambar ke slot foto"].
  tips: ["Susun urutan section sesuai alur cerita", "Nama section panjang? singkat
  saja biar rapi"].
  shots.list: "Daftar section — drag handle untuk urutan".
  shots.add: "Menu 'Add section' — tipe yang sudah dipakai tidak muncul".
  shots.galleryRule: "Setelah pilih satu galeri, galeri satunya hilang".
  shots.save: "Tombol Simpan — selalu klik setelah edit".
- **palette** — title "Palette Warna". summary: warna yang dilihat tamu.
  steps: (1) Pilih satu palette (Gelap Kosmik / Terang Pastel). (2) Klik
  **Simpan**.
  always: ["Simpan setelah pilih palette"].
  never: ["Jangan lupa Simpan — kalau tidak, tamu lihat palette lama"].
  shots.grid: "Grid palette — satu dipilih".
- **ornament** — title "Latar / Ornamen". summary: hiasan melayang di undangan.
  steps: (1) Pilih ornamen: Burung / Kupu-kupu / Bertengger. (2) **Simpan**.
  always: ["Simpan setelah ganti ornamen"].
  never: ["Jangan pilih ornamen yang tabrakan dengan nuansa foto"].
  shots.pick: "Pilihan ornamen layar".
- **music** — title "Musik Latar". summary: lagu yang diputar di undangan.
  steps: (1) Upload satu **MP3** (maks 12 MB). (2) Atur teks popup (judul,
  tombol Terima/Tutup). (3) Aktifkan **Aktif** & atur **Loop**, lalu **Simpan**.
  always: ["Aktifkan toggle **Aktif** kalau ingin musik muncul", "Simpan setelah
  upload"].
  never: ["Jangan upload file > 12 MB", "Jangan lupa Aktif — kalau off, popup
  tidak muncul"].
  tips: ["Pilih lagu lembut, durasi panjang biar tidak cepat mengulang"].
  shots.upload: "Panel upload MP3 + teks popup".
- **rsvps** — title "RSVP". summary: respons kehadiran tamu.
  steps: (1) Lihat ringkasan: Respons, Hadir, Tidak, Est. tamu. (2) Filter/cari,
  lalu **Unduh CSV** untuk rekap.
  always: ["Segarkan untuk lihat respons terbaru"].
  never: ["Jangan anggap kosong = error — terisi saat tamu submit"].
  tips: ["Unduh CSV untuk hitung katering"].
  shots.table: "Tabel RSVP + statistik".
- **gifts** — title "Hadiah". summary: konfirmasi amplop/hadiah.
  steps: (1) Lihat daftar konfirmasi + total disebutkan. (2) Cari nama/akun,
  Unduh CSV.
  always: ["Cocokkan konfirmasi dengan mutasi rekening sendiri"].
  never: ["Jangan jadikan angka di sini sebagai bukti transfer — ini input tamu"].
  shots.table: "Tabel konfirmasi hadiah".
- **guests** — title "Tamu". summary: undangan personal + link share.
  steps: (1) Tambah nama tamu. (2) Salin **link personal** tiap tamu. (3) Pakai
  **template pesan** untuk kirim via WhatsApp.
  always: ["Pakai link personal biar nama tamu muncul di undangan", "Cek nama
  sebelum kirim"].
  never: ["Jangan kirim link generic kalau mau sapaan personal", "Jangan lupa
  set template pesan dulu"].
  tips: ["Kirim bertahap, jangan sekaligus, biar gampang pantau"].
  shots.share: "Daftar tamu + tombol salin link & pesan".
- **guestbook** — title "Buku Tamu" (premium). summary: catatan kehadiran saat
  acara.
  steps: (1) Buka Buku Tamu (fitur **Premium**). (2) Tandai tamu yang hadir saat
  acara.
  always: ["Pakai saat hari-H untuk absen tamu"].
  never: ["Jangan bingung kalau tidak ada — ini khusus paket Premium"].
  shots.ledger: "Ledger kehadiran tamu".

- [ ] **Step 3: Mirror the whole tree into `en`**

Translate every string into natural English, keeping **identical keys and
identical array lengths**. (e.g. `start.always` has 2 items in both languages.)

- [ ] **Step 4: Run the parity + type checks**

Run: `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: PASS (id/en key paths identical).
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(i18n): bilingual lovebirds dashboard tutorial copy"
```

---

## Task 5: TutorialTab component + styles

**Files:**
- Create: `src/app/[template]/[slug]/dashboard/TutorialTab.tsx`
- Create: `src/app/[template]/[slug]/dashboard/TutorialTab.module.css`

- [ ] **Step 1: Create the styles**

```css
/* TutorialTab.module.css */
.wrap { max-width: 920px; margin: 0 auto; }
.subnav {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-bottom: 24px; padding-bottom: 12px;
  border-bottom: 1px solid rgba(42, 33, 24, 0.12);
}
.subtab {
  padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(42,33,24,0.16);
  background: transparent; color: rgba(42,33,24,0.7); font-size: 13px;
  cursor: pointer; font-family: inherit; transition: all 0.15s ease;
}
.subtabActive { background: #2A2118; color: #F5EFE3; border-color: #2A2118; }
.title { font-size: 22px; font-weight: 600; margin: 0 0 6px; color: #2A2118; }
.summary { color: #5C4A3A; margin: 0 0 20px; line-height: 1.55; }
.h { font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;
    color: #8a7866; margin: 24px 0 10px; }
.steps { margin: 0; padding-left: 20px; line-height: 1.7; color: #2A2118; }
.bullets { list-style: none; margin: 0; padding: 0; }
.bullets li { padding: 6px 0 6px 26px; position: relative; line-height: 1.55; }
.always li::before { content: '✅'; position: absolute; left: 0; }
.never li::before  { content: '⛔'; position: absolute; left: 0; }
.tips li::before   { content: '💡'; position: absolute; left: 0; }
.shot { margin: 14px 0; }
.shot img { width: 100%; border-radius: 12px; border: 1px solid rgba(42,33,24,0.12);
    box-shadow: 0 6px 20px rgba(42,33,24,0.10); display: block; }
.shotCap { font-size: 12px; color: #8a7866; margin-top: 6px; text-align: center; }
```

- [ ] **Step 2: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { TUTORIAL_CATEGORIES, type TutorialCategory } from './tutorial/content'
import styles from './TutorialTab.module.css'

const SHOT_BASE = '/tutorial/lovebirds'

export default function TutorialTab({ isPremium }: { isPremium: boolean }) {
  const dict = useDashboardDict() // dict.tabs.tutorial.*
  const t = dict.tabs.tutorial as any
  const cats = TUTORIAL_CATEGORIES.filter((c) => !c.premiumOnly || isPremium)
  const [active, setActive] = useState<string>(cats[0]?.id ?? 'start')
  const cat = cats.find((c) => c.id === active) ?? cats[0]
  const c = t[cat.id]

  const list = (n: number, arr: string[] | undefined) =>
    Array.from({ length: n }, (_, i) => arr?.[i]).filter(Boolean) as string[]

  return (
    <div className={styles.wrap}>
      <nav className={styles.subnav}>
        {cats.map((x) => (
          <button
            key={x.id}
            className={`${styles.subtab} ${x.id === active ? styles.subtabActive : ''}`}
            onClick={() => setActive(x.id)}
          >
            {t[x.id].title}
          </button>
        ))}
      </nav>

      <h2 className={styles.title}>{c.title}</h2>
      <p className={styles.summary}>{c.summary}</p>

      {cat.shots[0] && <Shot cat={cat} c={c} index={0} />}

      <p className={styles.h}>{t.headings.steps}</p>
      <ol className={styles.steps}>
        {list(cat.stepCount, c.steps).map((s, i) => <li key={i}>{s}</li>)}
      </ol>

      {cat.shots.slice(1).map((_, i) => (
        <Shot key={i + 1} cat={cat} c={c} index={i + 1} />
      ))}

      <Block title={t.headings.always} cls={styles.always} items={list(cat.alwaysCount, c.always)} />
      <Block title={t.headings.never}  cls={styles.never}  items={list(cat.neverCount, c.never)} />
      {cat.tipCount > 0 && (
        <Block title={t.headings.tips} cls={styles.tips} items={list(cat.tipCount, c.tips)} />
      )}
    </div>
  )
}

function Block({ title, cls, items }: { title: string; cls: string; items: string[] }) {
  if (!items.length) return null
  return (
    <>
      <p className={styles.h}>{title}</p>
      <ul className={`${styles.bullets} ${cls}`}>
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </>
  )
}

function Shot({ cat, c, index }: { cat: TutorialCategory; c: any; index: number }) {
  const shot = cat.shots[index]
  if (!shot) return null
  return (
    <figure className={styles.shot}>
      <img
        src={`${SHOT_BASE}/${shot.key}.png`}
        alt={c.shots?.[shot.captionKey] ?? ''}
        loading="lazy"
        onError={(e) => { (e.currentTarget.closest('figure') as HTMLElement).style.display = 'none' }}
      />
      {c.shots?.[shot.captionKey] && (
        <figcaption className={styles.shotCap}>{c.shots[shot.captionKey]}</figcaption>
      )}
    </figure>
  )
}
```

> Note: confirm the dict-consumer hook name. Check `DashboardI18nProvider.tsx`
> for the exported hook (it may be `useDashboardDict`, `useDict`, or a context).
> Use whatever it actually exports; the snippet assumes `useDashboardDict()`
> returning the `dashboard` dict slice. Also add `headings: { steps, always,
> never, tips }` to `tabs.tutorial` in BOTH languages in Task 4 (add to the
> id/en trees and re-run parity).

- [ ] **Step 3: Wire the `headings` keys**

If not already added in Task 4, add to `tabs.tutorial` (id + en):
```ts
headings: { steps: 'Cara pakai', always: 'Selalu lakukan', never: 'Jangan / jangan lupa', tips: 'Tips' },
navTitle: 'Panduan Dashboard',
```
(en: `{ steps: 'How to', always: 'Always do', never: "Don't / don't forget", tips: 'Tips' }`)
Re-run: `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts` → PASS.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add 'src/app/[template]/[slug]/dashboard/TutorialTab.tsx' 'src/app/[template]/[slug]/dashboard/TutorialTab.module.css'
git commit -m "feat(dashboard): TutorialTab component + styles"
```

---

## Task 6: Wire the Tutorial tab into the dashboard (lovebirds-only)

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Import the component**

Add near the other tab imports (after `import PaletteTab from './PaletteTab'`):
```tsx
import TutorialTab from './TutorialTab'
```

- [ ] **Step 2: Extend the `TabKey` union**

```tsx
  type TabKey =
    | 'rsvps' | 'gifts' | 'guests' | 'guestbook'
    | 'editor' | 'music' | 'ornament' | 'palette' | 'tutorial'
```

- [ ] **Step 3: Push the tab key (lovebirds only)**

In the `tabKeys` IIFE, before `return keys`, add:
```tsx
    // Tutorial is lovebirds-only for now (solary gets its own later).
    if (template === 'lovebirds') keys.push('tutorial')
```

- [ ] **Step 4: Add the render branch**

After the `palette` branch:
```tsx
            {tab === 'tutorial' && (
              <TutorialTab isPremium={invitation.plan === 'premium'} />
            )}
```

- [ ] **Step 5: Type-check + build the dashboard route**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors (the `dict.chrome.tabs.tutorial` label resolves because
Task 4 added it).

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`, log into a lovebirds invitation's dashboard, confirm a
**Tutorial** tab appears last, sub-tabs switch, the EN/ID toggle flips the copy,
and (premium) the **Buku Tamu** sub-tab shows only on premium. Screenshots will
be blank/hidden until Task 7 — that's expected (the `onError` hides them).

- [ ] **Step 7: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add 'src/app/[template]/[slug]/dashboard/DashboardClient.tsx'
git commit -m "feat(dashboard): show Tutorial tab on lovebirds"
```

---

## Task 7: Capture + embed annotated screenshots

**Files:**
- Create: `public/tutorial/lovebirds/*.png` (keys from `content.ts`)

Screenshot keys needed: `start-header`, `editor-list`, `editor-add`,
`editor-gallery-rule`, `editor-save`, `palette-grid`, `ornament-pick`,
`music-upload`, `rsvps-table`, `gifts-table`, `guests-share`, `guestbook-ledger`.

- [ ] **Step 1: Ensure a lovebirds demo invitation exists**

If none exists, seed one:
```bash
node scripts/create-invitation.mjs demo-lovebirds demo1234 --bride="Rani" --groom="Adi" --date=2025-11-15T16:00 --venue="Jakarta" --email=demo@example.com --plan=premium --template=lovebirds
node scripts/seed-full-config.mjs demo-lovebirds --bride="Rani" --groom="Adi" --date=2025-11-15T16:00 --venue="Jakarta"
```
(Check `create-invitation.mjs --help` / source for the exact `--template` flag
name; adjust if different. Premium plan ensures the Buku Tamu screenshot is
reachable.)

- [ ] **Step 2: Capture each tab with annotation**

With `npm run dev` running, use the Playwright (or Chrome-DevTools) MCP:
1. Navigate to `http://localhost:3000/lovebirds/demo-lovebirds/dashboard`, log in.
2. For each target tab/element: get the target element's bounding box, inject a
   transient overlay (numbered circle + translucent highlight rect + arrow) via
   an `evaluate`/`run_code` step, then `take_screenshot` with a `clip` region to
   crop to the relevant area.
3. Save each PNG to `public/tutorial/lovebirds/<key>.png`.

Annotation overlay snippet (inject before screenshot, remove after):
```js
(sel, label) => {
  const el = document.querySelector(sel); if (!el) return null;
  const r = el.getBoundingClientRect();
  const box = document.createElement('div');
  box.id = '__tut_overlay';
  box.style.cssText = `position:fixed;left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px;border:3px solid #E8553E;border-radius:10px;box-shadow:0 0 0 4000px rgba(0,0,0,0.04);z-index:99999;pointer-events:none`;
  const tag = document.createElement('div');
  tag.textContent = label;
  tag.style.cssText = `position:fixed;left:${r.left-6}px;top:${r.top-30}px;background:#E8553E;color:#fff;font:600 13px sans-serif;padding:3px 9px;border-radius:6px;z-index:100000`;
  document.body.append(box, tag);
  return { x: r.left-40, y: r.top-50, width: r.width+80, height: r.height+90 };
}
```
Use the returned rect as the `clip` for cropping. Remove `#__tut_overlay` + the
tag between shots.

- [ ] **Step 3: Verify the screenshots render**

Reload the dashboard Tutorial tab; confirm each sub-tab now shows its
screenshot(s) with captions (no hidden/broken images).

- [ ] **Step 4: Commit**

```bash
git add public/tutorial/lovebirds
git commit -m "docs(dashboard): annotated screenshots for lovebirds tutorial"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full test run**

Run: `npx vitest run src/editor/__tests__/template-policy.test.ts src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: all PASS.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Manual end-to-end**

`npm run dev` → lovebirds dashboard:
- Editor: with a gallery present, confirm "Add section" and a non-gallery's
  "change type" no longer offer the second gallery; confirm a gallery section can
  still swap masonry ↔ springcoil.
- Tutorial: all sub-tabs, both languages, screenshots visible; Buku Tamu sub-tab
  premium-gated; tab absent on a solary dashboard.

- [ ] **Step 4: Confirm WIP untouched**

Run: `git status --short` — verify only this work's files are staged/committed
and the user's `src/all-templates/lovebirds/**` edits remain unstaged.

---

## Self-review notes

- **Spec coverage:** Part A (fix + 4 tests) → Tasks 1–2. Tutorial tab, content
  model, bilingual dict, component, integration, screenshots → Tasks 3–7. WIP
  safety → Task 8 Step 4. All spec sections covered.
- **Open verification (flagged in-task, not placeholders):** the dict-consumer
  hook name in `DashboardI18nProvider.tsx` (Task 5 note) and the
  `create-invitation.mjs` template flag (Task 7 note) must be read from source
  before use; both have explicit "check the source" instructions.
- **Type consistency:** `TutorialCategory`/`TutorialShot` fields and the dict
  shape (`title/summary/steps/always/never/tips/shots/headings`) are used
  identically across content.ts (Task 3), dict (Task 4), and component (Task 5).
