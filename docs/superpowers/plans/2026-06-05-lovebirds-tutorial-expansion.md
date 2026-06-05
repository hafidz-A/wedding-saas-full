# Lovebirds Tutorial Tab Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the lovebirds in-dashboard Tutorial tab materially more complete — deepen the 9 existing categories, add 4 new ones (`checklist`, `sections`, `billing`, `faq`), group the subnav, and add two additive content shapes (per-section guide cards + FAQ accordion) — all bilingual ID/EN, **without touching solary**.

**Architecture:** Same 3-file shape as today — `content.ts` (typed structure), `TutorialTab.tsx` (renderer), `TutorialTab.module.css` (styles), copy in `dashboard.ts` dict under `tabs.tutorial.*`. Grouping is opt-in via a `group` field set on lovebirds categories only; solary keeps a flat subnav. New blocks render only when a category declares `sectionGuideCount`/`faqCount`. Spec: `docs/superpowers/specs/2026-06-05-lovebirds-tutorial-expansion-design.md`.

**Tech Stack:** Next.js 14 (App Router), React 18 client component, CSS Modules, i18n dict objects, Vitest (`npm test` → `vitest run`).

**Conventions for this plan:**
- Code/comments in English; tutorial **copy** (the data strings) in Indonesian for `id` and English for `en`.
- After every dict edit, author **both** `id` and `en` together so `dict-parity.test.ts` stays green.
- Never `git add -A`. Dashboard paths contain `[template]`/`[slug]` brackets — `git add` of those paths needs `GIT_LITERAL_PATHSPECS=1`. The cwd may drift; use `git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next"`.
- Do NOT touch `src/all-templates/**`, `TUTORIAL_CATEGORIES_SOLARY`, or `tabs.tutorial.solary.*`.

**Repo root (all paths relative to it):** `c:/Users/arifi/Downloads/multi-template/wedding-saas-next`

---

## File map

| File | Responsibility | Action |
|---|---|---|
| `src/app/[template]/[slug]/dashboard/tutorial/content.ts` | Typed category/group structure | Modify |
| `src/app/[template]/[slug]/dashboard/TutorialTab.tsx` | Renderer (grouped subnav + blocks) | Modify |
| `src/app/[template]/[slug]/dashboard/TutorialTab.module.css` | Styles for groups, cards, FAQ | Modify |
| `src/lib/i18n/dictionaries/dashboard.ts` | All copy (`tabs.tutorial.*`) | Modify |
| `src/lib/i18n/__tests__/tutorial-structure.test.ts` | content.ts invariants | Create |
| `src/lib/i18n/__tests__/tutorial-copy.test.ts` | dict counts/shapes match content.ts | Create |
| `public/tutorial/lovebirds/billing-status.png` | Screenshot | Create |
| `public/tutorial/lovebirds/billing-upgrade.png` | Screenshot | Create |

---

## Task 1: content.ts — types, groups, and counts (existing categories)

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/tutorial/content.ts`
- Test: `src/lib/i18n/__tests__/tutorial-structure.test.ts`

This task adds the new types/fields and assigns `group` + deepened counts to the **existing** categories. New categories (`checklist`, `sections`, `billing`, `faq`) are added in Task 2 alongside the guarded renderer, so this commit keeps the current (flat) renderer working.

- [ ] **Step 1: Write the failing structure test**

Create `src/lib/i18n/__tests__/tutorial-structure.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_CATEGORIES_SOLARY,
  TUTORIAL_GROUPS,
} from '@/app/[template]/[slug]/dashboard/tutorial/content'

describe('tutorial content structure', () => {
  it('every lovebirds category has a valid group', () => {
    for (const cat of TUTORIAL_CATEGORIES) {
      expect(cat.group, `${cat.id} missing group`).toBeTruthy()
      expect(TUTORIAL_GROUPS).toContain(cat.group)
    }
  })

  it('solary categories stay flat (no group)', () => {
    for (const cat of TUTORIAL_CATEGORIES_SOLARY) {
      expect(cat.group, `${cat.id} should have no group`).toBeUndefined()
    }
  })

  it('exposes four ordered groups', () => {
    expect(TUTORIAL_GROUPS).toEqual(['prep', 'fill', 'data', 'help'])
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test -- tutorial-structure`
Expected: FAIL — `TUTORIAL_GROUPS` is not exported yet / categories have no `group`.

- [ ] **Step 3: Edit content.ts — replace the type + interface header**

Replace the top of the file (the `TutorialCategoryId` type through the `TutorialCategory` interface) with:

```ts
// Structure for the lovebirds dashboard tutorial. Copy lives in the i18n dict
// under dashboard.tabs.tutorial.<categoryId>; this file only declares shape.

export type TutorialCategoryId =
  | 'start' | 'checklist' | 'editor' | 'sections' | 'palette' | 'ornament'
  | 'music' | 'rsvps' | 'gifts' | 'guests' | 'guestbook' | 'billing' | 'faq'

export type TutorialGroupId = 'prep' | 'fill' | 'data' | 'help'

/** Ordered groups for the lovebirds subnav. Label dict key: tutorial.groups.<id> */
export const TUTORIAL_GROUPS: TutorialGroupId[] = ['prep', 'fill', 'data', 'help']

export interface TutorialShot {
  /** file at public/tutorial/<template>/<key>.png */
  key: string
  /** dict key for the caption: dashboard.tabs.tutorial.<categoryId>.shots.<captionKey> */
  captionKey: string
}

export interface TutorialCategory {
  id: TutorialCategoryId
  /** when set, the subnav renders grouped (lovebirds). Solary omits it → flat. */
  group?: TutorialGroupId
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
  /** number of section-guide cards authored in the dict (c.sectionGuides[0..n-1]) */
  sectionGuideCount?: number
  /** number of Q&A pairs authored in the dict (c.faqs[0..n-1]) */
  faqCount?: number
  /** screenshots shown for this category, in order */
  shots: TutorialShot[]
}
```

- [ ] **Step 4: Edit content.ts — replace the `TUTORIAL_CATEGORIES` array (existing cats only, with groups + deepened counts)**

Replace the entire `export const TUTORIAL_CATEGORIES: TutorialCategory[] = [ ... ]` block with:

```ts
export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  { id: 'start', group: 'prep', stepCount: 6, alwaysCount: 3, neverCount: 3, tipCount: 2,
    shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'editor', group: 'fill', stepCount: 6, alwaysCount: 4, neverCount: 4, tipCount: 3,
    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'palette', group: 'fill', stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 1,
    shots: [{ key: 'palette-grid', captionKey: 'grid' }] },
  { id: 'ornament', group: 'fill', stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 1,
    shots: [{ key: 'ornament-pick', captionKey: 'pick' }] },
  { id: 'music', group: 'fill', stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 2,
    shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps', group: 'data', stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 2,
    shots: [{ key: 'rsvps-table', captionKey: 'table' }] },
  { id: 'gifts', group: 'data', stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests', group: 'data', stepCount: 4, alwaysCount: 3, neverCount: 2, tipCount: 2,
    shots: [{ key: 'guests-share', captionKey: 'share' }] },
  { id: 'guestbook', group: 'data', premiumOnly: true, stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 1,
    shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
]
```

Leave `TUTORIAL_CATEGORIES_SOLARY` and `getTutorialCategories` **unchanged**.

- [ ] **Step 5: Run the structure test — verify it passes**

Run: `npm test -- tutorial-structure`
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full suite to confirm nothing else broke**

Run: `npm test`
Expected: PASS — `dict-parity` still green (no dict changes yet).

- [ ] **Step 7: Commit**

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/__tests__/tutorial-structure.test.ts
GIT_LITERAL_PATHSPECS=1 git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add "src/app/[template]/[slug]/dashboard/tutorial/content.ts"
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): add group/section-guide/faq fields + deepen counts (lovebirds)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Renderer + CSS + new category entries + dict scaffolding

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/tutorial/content.ts` (add the 4 new categories)
- Modify: `src/app/[template]/[slug]/dashboard/TutorialTab.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/TutorialTab.module.css`
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (add `groups` + new `headings` keys, id+en)

The guarded renderer tolerates categories whose copy is not authored yet (shows the id as a label, empty body), so adding the 4 new categories here is safe before their copy lands in Tasks 4–6.

- [ ] **Step 1: Edit content.ts — insert the 4 new categories into `TUTORIAL_CATEGORIES`**

Insert `checklist` immediately after the `start` entry:

```ts
  { id: 'checklist', group: 'prep', stepCount: 10, alwaysCount: 2, neverCount: 2, tipCount: 2,
    shots: [] },
```

Insert `sections` immediately after the `editor` entry:

```ts
  { id: 'sections', group: 'fill', stepCount: 0, alwaysCount: 2, neverCount: 1, tipCount: 1,
    sectionGuideCount: 14, shots: [] },
```

Append `billing` and `faq` as the last two entries (after `guestbook`):

```ts
  { id: 'billing', group: 'help', stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [
      { key: 'billing-status',  captionKey: 'status' },
      { key: 'billing-upgrade', captionKey: 'upgrade' },
    ] },
  { id: 'faq', group: 'help', stepCount: 0, alwaysCount: 0, neverCount: 0, tipCount: 0,
    faqCount: 10, shots: [] },
```

- [ ] **Step 2: Replace `TutorialTab.tsx` entirely**

```tsx
'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { getTutorialCategories, TUTORIAL_GROUPS, type TutorialCategory } from './tutorial/content'
import styles from './TutorialTab.module.css'

export default function TutorialTab({
  isPremium,
  template = 'lovebirds',
}: {
  isPremium: boolean
  template?: string
}) {
  const dict = useDashboardDict()
  // Screenshots live at public/tutorial/<template>/<key>.png.
  const SHOT_BASE = `/tutorial/${template}`
  // The tutorial copy tree is hand-authored; index it loosely by category id.
  // Solary keeps its own copy under tutorial.solary.*, with headings/navTitle shared.
  const root = (dict.tabs as any).tutorial
  const t = template === 'solary' && root.solary ? { ...root, ...root.solary } : root
  const cats = getTutorialCategories(template).filter((c) => !c.premiumOnly || isPremium)
  const [active, setActive] = useState<string>(cats[0]?.id ?? 'start')
  const cat = cats.find((c) => c.id === active) ?? cats[0]
  const c = t[cat.id]

  const list = (n: number, arr: string[] | undefined): string[] =>
    Array.from({ length: n }, (_, i) => arr?.[i]).filter(Boolean) as string[]

  const grouped = cats.some((x) => x.group)

  const renderTab = (x: TutorialCategory) => (
    <button
      key={x.id}
      className={`${styles.subtab} ${x.id === active ? styles.subtabActive : ''}`}
      onClick={() => setActive(x.id)}
    >
      {t[x.id]?.title ?? x.id}
    </button>
  )

  return (
    <div className={styles.wrap}>
      <nav className={styles.subnav}>
        {grouped
          ? TUTORIAL_GROUPS.map((g) => {
              const inGroup = cats.filter((x) => x.group === g)
              if (!inGroup.length) return null
              return (
                <div key={g} className={styles.group}>
                  <span className={styles.groupLabel}>{t.groups?.[g] ?? g}</span>
                  <div className={styles.groupTabs}>{inGroup.map(renderTab)}</div>
                </div>
              )
            })
          : cats.map(renderTab)}
      </nav>

      {c && (
        <>
          <h2 className={styles.title}>{c.title}</h2>
          <p className={styles.summary}>{c.summary}</p>

          {cat.shots[0] && <Shot cat={cat} c={c} index={0} base={SHOT_BASE} />}

          {cat.stepCount > 0 && (
            <>
              <p className={styles.h}>{t.headings.steps}</p>
              <ol className={styles.steps}>
                {list(cat.stepCount, c.steps).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}

          {cat.sectionGuideCount ? <SectionGuides cat={cat} c={c} t={t} /> : null}
          {cat.faqCount ? <Faqs cat={cat} c={c} /> : null}

          {cat.shots.slice(1).map((_, i) => (
            <Shot key={i + 1} cat={cat} c={c} index={i + 1} base={SHOT_BASE} />
          ))}

          <Block title={t.headings.always} cls={styles.always} items={list(cat.alwaysCount, c.always)} />
          <Block title={t.headings.never} cls={styles.never} items={list(cat.neverCount, c.never)} />
          {cat.tipCount > 0 && (
            <Block title={t.headings.tips} cls={styles.tips} items={list(cat.tipCount, c.tips)} />
          )}
        </>
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
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </>
  )
}

function SectionGuides({ cat, c, t }: { cat: TutorialCategory; c: any; t: any }) {
  const n = cat.sectionGuideCount ?? 0
  const cards = Array.from({ length: n }, (_, i) => c.sectionGuides?.[i]).filter(Boolean)
  if (!cards.length) return null
  return (
    <div className={styles.guideList}>
      {cards.map((g: any, i: number) => (
        <div key={i} className={styles.guideCard}>
          <h3 className={styles.guideTitle}>{g.title}</h3>
          <p className={styles.guideRow}>
            <span className={styles.guideLabel}>👁 {t.headings.sees}</span> {g.sees}
          </p>
          <p className={styles.guideRow}>
            <span className={styles.guideLabel}>✍️ {t.headings.fill}</span> {g.fill}
          </p>
          <p className={styles.guideRow}>
            <span className={styles.guideLabel}>⚠️ {t.headings.watch}</span> {g.watch}
          </p>
        </div>
      ))}
    </div>
  )
}

function Faqs({ cat, c }: { cat: TutorialCategory; c: any }) {
  const n = cat.faqCount ?? 0
  const items = Array.from({ length: n }, (_, i) => c.faqs?.[i]).filter(Boolean)
  if (!items.length) return null
  return (
    <div className={styles.faqList}>
      {items.map((f: any, i: number) => (
        <details key={i} className={styles.faqItem}>
          <summary className={styles.faqQ}>{f.q}</summary>
          <p className={styles.faqA}>{f.a}</p>
        </details>
      ))}
    </div>
  )
}

function Shot({ cat, c, index, base }: { cat: TutorialCategory; c: any; index: number; base: string }) {
  const shot = cat.shots[index]
  if (!shot) return null
  const caption: string | undefined = c.shots?.[shot.captionKey]
  return (
    <figure className={styles.shot}>
      <img
        src={`${base}/${shot.key}.png`}
        alt={caption ?? ''}
        loading="lazy"
        onError={(e) => {
          const fig = e.currentTarget.closest('figure') as HTMLElement | null
          if (fig) fig.style.display = 'none'
        }}
      />
      {caption && <figcaption className={styles.shotCap}>{caption}</figcaption>}
    </figure>
  )
}
```

- [ ] **Step 3: Append CSS to `TutorialTab.module.css`**

```css

/* grouped subnav (lovebirds) — each group wraps to its own line */
.group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.group + .group { margin-top: 10px; }
.groupLabel {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7866;
}
.groupTabs { display: flex; flex-wrap: wrap; gap: 8px; }

/* per-section guide cards */
.guideList { display: flex; flex-direction: column; gap: 12px; margin: 8px 0 4px; }
.guideCard {
  border: 1px solid rgba(42, 33, 24, 0.12);
  border-radius: 12px;
  padding: 14px 16px;
  background: #fbf7ee;
}
.guideTitle { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #2a2118; }
.guideRow { margin: 4px 0; line-height: 1.5; color: #2a2118; }
.guideLabel { font-weight: 600; color: #5c4a3a; margin-right: 4px; white-space: nowrap; }

/* FAQ accordion */
.faqList { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 4px; }
.faqItem {
  border: 1px solid rgba(42, 33, 24, 0.12);
  border-radius: 10px;
  padding: 10px 14px;
  background: #fbf7ee;
}
.faqQ { font-weight: 600; cursor: pointer; color: #2a2118; list-style: none; }
.faqQ::-webkit-details-marker { display: none; }
.faqItem[open] .faqQ { margin-bottom: 8px; }
.faqA { margin: 0; line-height: 1.55; color: #5c4a3a; }
```

- [ ] **Step 4: Add `groups` + new `headings` keys to the dict (id), in `dashboard.ts`**

In the **id** dict, inside `tabs.tutorial`, replace the existing `headings: { ... }` block with the version below and add a `groups` block right after `navTitle`:

```ts
        navTitle: 'Panduan Dashboard',
        groups: {
          prep: 'Persiapan',
          fill: 'Mengisi undangan',
          data: 'Tamu & data',
          help: 'Akun & bantuan',
        },
        headings: {
          steps: 'Cara pakai',
          always: 'Selalu lakukan',
          never: 'Jangan / jangan lupa',
          tips: 'Tips',
          sees: 'Yang tamu lihat',
          fill: 'Cara mengisi',
          watch: 'Hati-hati',
          faq: 'Tanya–jawab',
        },
```

- [ ] **Step 5: Add `groups` + new `headings` keys to the dict (en), in `dashboard.ts`**

In the **en** dict, inside `tabs.tutorial`, replace the existing `headings: { ... }` block and add `groups` after `navTitle`:

```ts
        navTitle: 'Dashboard Guide',
        groups: {
          prep: 'Getting started',
          fill: 'Filling your invitation',
          data: 'Guests & data',
          help: 'Account & help',
        },
        headings: {
          steps: 'How to',
          always: 'Always do',
          never: "Don't / don't forget",
          tips: 'Tips',
          sees: 'What guests see',
          fill: 'How to fill it',
          watch: 'Watch out',
          faq: 'Q&A',
        },
```

- [ ] **Step 6: Run tests + build**

Run: `npm test`
Expected: PASS — `dict-parity` green (groups/headings added in both langs), `tutorial-structure` green.

Run: `npm run build`
Expected: clean (0 errors).

- [ ] **Step 7: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add "src/app/[template]/[slug]/dashboard/tutorial/content.ts" "src/app/[template]/[slug]/dashboard/TutorialTab.tsx" "src/app/[template]/[slug]/dashboard/TutorialTab.module.css"
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/dictionaries/dashboard.ts
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): grouped subnav + section-guide & FAQ blocks (lovebirds)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---
## Task 3: Deepen the 9 existing categories (copy, id + en)

**Files:** Modify `src/lib/i18n/dictionaries/dashboard.ts`

The 9 existing category objects (`start` … `guestbook`) are contiguous in each language's `tabs.tutorial` block, ending just before the `solary:` key. Replace that whole contiguous run in **both** languages with the deepened versions below. Counts match Task 1.

- [ ] **Step 1: Replace the id run (`start:` … `guestbook:`) with:**

```ts
        start: {
          title: 'Mulai di sini',
          summary: 'Kenalan dengan dashboard: status undangan, masa aktif, dan tombol penting di bar atas.',
          steps: [
            'Login pakai email & password undangan kamu. Lupa password? Pakai tautan "Lupa password" untuk reset lewat email.',
            'Perhatikan status Terbit/Draf: Draf = tamu belum bisa membuka; Terbit = undangan sudah live.',
            'Lihat status masa aktif di kanan atas. Kalau masih ada banner "belum bayar", undangan bisa kedaluwarsa.',
            'Tombol "Lihat live" membuka undangan di tab baru — pakai untuk mengecek hasil.',
            'Toggle Bahasa (ID/EN) hanya mengubah tampilan dashboard & editor, bukan isi undangan tamu.',
            'Jelajahi tab dashboard: Editor, Palette, Musik, RSVP, Hadiah, Tamu, dan lainnya — tiap tab punya panduannya di sini.',
          ],
          always: [
            'Pastikan status Terbit sebelum membagikan link ke tamu.',
            'Cek masa aktif belum berakhir.',
            'Simpan setiap perubahan sebelum pindah tab atau menutup halaman.',
          ],
          never: [
            'Jangan bagikan link saat undangan masih Draf.',
            'Jangan lupa bayar sebelum hari-H supaya undangan tidak kedaluwarsa.',
            'Jangan bagikan email & password dashboard ke tamu — itu hanya untuk kamu.',
          ],
          tips: [
            'Klik "Lihat live" tiap selesai mengedit untuk memastikan hasilnya benar.',
            'Buka "Lihat live" di HP dan komputer — tampilan tamu bisa berbeda di layar kecil.',
          ],
          shots: {
            header: 'Bar atas: status Terbit/Draf, masa aktif, tombol Lihat live, dan toggle Bahasa.',
          },
        },
        editor: {
          title: 'Editor Section',
          summary: 'Atur isi, foto, dan urutan setiap bagian undangan.',
          steps: [
            'Daftar bagian ada di panel kiri — seret (drag) untuk mengubah urutan.',
            'Klik sebuah bagian untuk mengedit teks dan foto; unggah foto lewat tombol upload.',
            'Hero terkunci di paling atas dan Footer di paling bawah — tidak bisa dipindah.',
            'RSVP dan Hadiah wajib ada dan terkunci — tidak bisa dihapus atau dipindah.',
            'Galeri hanya boleh satu — Masonry atau SpringCoil. Buka "Ganti tipe section" untuk berpindah di antara keduanya.',
            'Susunan section sudah tetap (tidak ada Tambah/Hapus). Klik Simpan setiap selesai.',
          ],
          always: [
            'Klik Simpan setiap selesai mengedit.',
            'Cek hasil lewat "Lihat live".',
            'Pakai foto dengan rasio wajar supaya tidak gepeng.',
            'Perpendek label bagian yang terlalu panjang supaya navbar rapi.',
          ],
          never: [
            'Jangan reload halaman sebelum Simpan — perubahan akan hilang.',
            'Jangan berharap dua galeri sekaligus — template ini hanya satu galeri.',
            'Jangan cari tombol Tambah/Hapus bagian — sengaja dimatikan agar layout tetap rapi & lengkap.',
            'Jangan mengunggah file non-gambar ke slot foto.',
          ],
          tips: [
            'Susun urutan bagian mengikuti alur cerita kalian.',
            'Foto berukuran besar lebih tajam; kompres dulu bila terlalu berat.',
            'Lihat tab "Panduan tiap Section" untuk tahu cara mengisi tiap bagian.',
          ],
          shots: {
            list: 'Daftar bagian — seret untuk urutkan, edit isinya. Tidak ada tombol tambah/hapus.',
            galleryRule: 'Lewat "Ganti tipe section", galeri hanya menawarkan Masonry ↔ Spring Coil.',
            save: 'Tombol Simpan — selalu klik setelah mengedit.',
          },
        },
        palette: {
          title: 'Palette Warna',
          summary: 'Pilih skema warna yang akan dilihat tamu di undangan.',
          steps: [
            'Telusuri pilihan palette yang tersedia.',
            'Klik satu palette untuk menerapkannya — preview langsung berubah.',
            'Klik Simpan agar palette tersimpan untuk tamu.',
          ],
          always: [
            'Simpan setelah memilih palette.',
            'Cek hasilnya lewat "Lihat live".',
          ],
          never: ['Jangan lupa Simpan — kalau tidak, tamu masih melihat palette lama.'],
          tips: ['Pilih palette yang selaras dengan warna dominan foto kalian.'],
          shots: { grid: 'Grid palette — satu sedang dipilih.' },
        },
        ornament: {
          title: 'Latar / Ornamen',
          summary: 'Hiasan animasi yang melayang di halaman undangan.',
          steps: [
            'Pilih jenis ornamen: Burung, Kupu-kupu, atau Bertengger.',
            'Lihat pratinjau gerakannya di layar.',
            'Klik Simpan.',
          ],
          always: [
            'Simpan setelah mengganti ornamen.',
            'Pastikan ornamen terbaca jelas di atas warna palette pilihanmu.',
          ],
          never: ['Jangan pilih ornamen yang tabrakan dengan nuansa foto kalian.'],
          tips: ['Ornamen halus biasanya lebih elegan daripada yang ramai.'],
          shots: { pick: 'Pilihan ornamen layar.' },
        },
        music: {
          title: 'Musik Latar',
          summary: 'Lagu yang diputar di latar undangan lewat popup.',
          steps: [
            'Unggah satu file MP3 (maksimal 12 MB).',
            'Atur teks popup: judul dan tombol Terima/Tutup.',
            'Atur Loop bila ingin lagu mengulang.',
            'Aktifkan toggle Aktif, lalu klik Simpan.',
          ],
          always: [
            'Aktifkan toggle Aktif kalau ingin musik muncul.',
            'Simpan setelah mengunggah.',
          ],
          never: [
            'Jangan unggah file lebih dari 12 MB.',
            'Jangan harap musik berbunyi otomatis — browser memblokir autoplay, jadi tamu harus menekan tombol di popup.',
          ],
          tips: [
            'Pilih lagu lembut berdurasi panjang supaya tidak cepat mengulang.',
            'Pakai MP3 yang sudah dikompres agar undangan tetap ringan.',
          ],
          shots: { upload: 'Panel unggah MP3 dan pengaturan teks popup.' },
        },
        rsvps: {
          title: 'RSVP',
          summary: 'Respons kehadiran dari tamu undangan.',
          steps: [
            'Lihat ringkasan: Respons, Hadir, Tidak hadir, dan estimasi tamu.',
            'Filter atau cari nama tertentu.',
            'Unduh CSV untuk rekap data.',
          ],
          always: [
            'Segarkan untuk melihat respons terbaru.',
            'Cocokkan estimasi tamu dengan kapasitas tempat acara.',
          ],
          never: ['Jangan anggap kosong = error — terisi saat tamu submit form.'],
          tips: [
            'Unduh CSV untuk rekap data RSVP kapan saja.',
            'Opsi menu di form mencerminkan pilihan yang kamu atur di section RSVP.',
          ],
          shots: { table: 'Tabel RSVP beserta statistik di atasnya.' },
        },
        gifts: {
          title: 'Hadiah',
          summary: 'Konfirmasi amplop/hadiah yang dikirim tamu.',
          steps: [
            'Lihat daftar konfirmasi dan total yang disebutkan.',
            'Cari nama atau akun tertentu.',
            'Unduh CSV untuk rekap.',
          ],
          always: [
            'Cocokkan konfirmasi dengan mutasi rekening kalian sendiri.',
            'Pastikan rekening di section Wedding Gift sudah benar.',
          ],
          never: [
            'Jangan jadikan angka di sini sebagai bukti transfer — ini input dari tamu.',
            'Jangan matikan konfirmasi di Wedding Gift kalau ingin tetap menerima data ini.',
          ],
          tips: ['Tab ini muncul saat tamu mengisi form konfirmasi di section Wedding Gift.'],
          shots: { table: 'Tabel konfirmasi hadiah.' },
        },
        guests: {
          title: 'Tamu & Bagikan',
          summary: 'Buat undangan personal dan bagikan link khusus tiap tamu.',
          steps: [
            'Tambahkan nama tamu satu per satu.',
            'Atur template pesan (gunakan {{name}} untuk nama dan {{url}} untuk link).',
            'Salin link personal masing-masing tamu.',
            'Kirim lewat WhatsApp memakai tombol/template yang tersedia.',
          ],
          always: [
            'Pakai link personal supaya nama tamu muncul di undangan.',
            'Cek ejaan nama sebelum mengirim.',
            'Atur template pesan terlebih dahulu sebelum mengirim massal.',
          ],
          never: [
            'Jangan kirim link generic kalau ingin sapaan personal.',
            'Jangan kirim ke semua orang sekaligus — sulit dipantau bila ada yang salah.',
          ],
          tips: [
            'Kirim bertahap, jangan sekaligus, supaya mudah dipantau.',
            'Coba buka link salah satu tamu sendiri untuk memastikan namanya benar.',
          ],
          shots: { share: 'Daftar tamu dengan tombol salin link dan pesan.' },
        },
        guestbook: {
          title: 'Buku Tamu',
          summary: 'Catatan kehadiran tamu saat acara berlangsung (fitur Premium).',
          steps: [
            'Kalau undanganmu masih Basic, tab ini terkunci — klik "Upgrade ke Premium" (cukup bayar selisihnya).',
            'Setelah Premium, buka Buku Tamu saat hari-H.',
            'Tandai tamu yang hadir saat mereka tiba.',
          ],
          always: [
            'Gunakan saat hari-H untuk mencatat kehadiran tamu.',
            'Siapkan perangkat yang terhubung internet di meja penerima tamu.',
          ],
          never: ['Jangan khawatir saat upgrade — undanganmu tetap online, tidak ada data yang hilang.'],
          tips: ['Lihat tab "Bayar, Masa Aktif & Upgrade" untuk detail proses upgrade.'],
          shots: { ledger: 'Ledger kehadiran tamu (terbuka setelah Premium).' },
        },
```

- [ ] **Step 2: Replace the en run (`start:` … `guestbook:`) with:**

```ts
        start: {
          title: 'Start here',
          summary: 'Get oriented: your invitation status, active period, and the key buttons in the top bar.',
          steps: [
            'Sign in with your invitation email & password. Forgot it? Use the "Forgot password" link to reset via email.',
            'Watch the Published/Draft status: Draft = guests can\'t open it yet; Published = your invitation is live.',
            'Check the active-period status at the top right. If an "unpaid" banner is still showing, your invitation can expire.',
            'The "View live" button opens your invitation in a new tab — use it to check your work.',
            'The Language toggle (ID/EN) only changes the dashboard & editor UI, not the invitation your guests see.',
            'Explore the dashboard tabs: Editor, Palette, Music, RSVP, Gifts, Guests, and more — each has its own guide here.',
          ],
          always: [
            'Make sure the status is Published before sharing the link with guests.',
            'Check that the active period hasn\'t ended.',
            'Save every change before switching tabs or closing the page.',
          ],
          never: [
            'Don\'t share the link while the invitation is still Draft.',
            'Don\'t forget to pay before the big day so your invitation doesn\'t expire.',
            'Don\'t share your dashboard email & password with guests — those are just for you.',
          ],
          tips: [
            'Click "View live" after each edit to confirm the result looks right.',
            'Open "View live" on both phone and computer — the guest view can differ on small screens.',
          ],
          shots: {
            header: 'Top bar: Published/Draft status, active period, View live button, and the Language toggle.',
          },
        },
        editor: {
          title: 'Section Editor',
          summary: 'Arrange the content, photos, and order of every part of your invitation.',
          steps: [
            'The section list is in the left panel — drag to reorder.',
            'Click a section to edit its text and photos; upload photos via the upload button.',
            'Hero is locked to the very top and Footer to the very bottom — they can\'t be moved.',
            'RSVP and Gifts are mandatory and locked — they can\'t be removed or moved.',
            'You may only have one gallery — Masonry or SpringCoil. Use "Change section type" to switch between the two.',
            'The set of sections is fixed (no Add/Remove). Click Save whenever you finish.',
          ],
          always: [
            'Click Save every time you finish editing.',
            'Check the result via "View live".',
            'Use photos with a sensible aspect ratio so they don\'t stretch.',
            'Shorten overly long section labels so the navbar stays tidy.',
          ],
          never: [
            'Don\'t reload the page before saving — your changes will be lost.',
            'Don\'t expect two galleries at once — this template has only one.',
            'Don\'t look for an Add/Remove section button — they\'re disabled on purpose to keep the layout complete and tidy.',
            'Don\'t upload non-image files into a photo slot.',
          ],
          tips: [
            'Order the sections to follow your story.',
            'Larger photos look sharper; compress first if they\'re too heavy.',
            'See the "Per-section guide" tab to learn how to fill each part.',
          ],
          shots: {
            list: 'Section list — drag to reorder and edit content. No add/remove buttons.',
            galleryRule: 'Via "Change section type", the gallery only offers Masonry ↔ Spring Coil.',
            save: 'The Save button — always click it after editing.',
          },
        },
        palette: {
          title: 'Color Palette',
          summary: 'Pick the color scheme your guests will see on the invitation.',
          steps: [
            'Browse the available palettes.',
            'Click a palette to apply it — the preview updates instantly.',
            'Click Save so the palette is stored for guests.',
          ],
          always: [
            'Save after picking a palette.',
            'Check the result via "View live".',
          ],
          never: ['Don\'t forget to Save — otherwise guests still see the old palette.'],
          tips: ['Pick a palette that matches the dominant colors in your photos.'],
          shots: { grid: 'Palette grid — one is selected.' },
        },
        ornament: {
          title: 'Background / Ornaments',
          summary: 'Animated decorations that float across the invitation page.',
          steps: [
            'Pick an ornament type: Birds, Butterflies, or Perched.',
            'Preview its motion on screen.',
            'Click Save.',
          ],
          always: [
            'Save after changing the ornament.',
            'Make sure the ornament reads clearly over your chosen palette.',
          ],
          never: ['Don\'t pick an ornament that clashes with the mood of your photos.'],
          tips: ['Subtle ornaments usually look more elegant than busy ones.'],
          shots: { pick: 'Screen ornament options.' },
        },
        music: {
          title: 'Background Music',
          summary: 'A song played in the background of your invitation via a popup.',
          steps: [
            'Upload one MP3 file (max 12 MB).',
            'Set the popup text: title and the Accept/Dismiss buttons.',
            'Set Loop if you want the song to repeat.',
            'Turn on the Enabled toggle, then click Save.',
          ],
          always: [
            'Turn on the Enabled toggle if you want the music to appear.',
            'Save after uploading.',
          ],
          never: [
            'Don\'t upload a file larger than 12 MB.',
            'Don\'t expect music to play on its own — browsers block autoplay, so guests must tap the popup button.',
          ],
          tips: [
            'Pick a soft, long song so it doesn\'t loop too soon.',
            'Use a compressed MP3 to keep the invitation light.',
          ],
          shots: { upload: 'The MP3 upload panel and popup text settings.' },
        },
        rsvps: {
          title: 'RSVP',
          summary: 'Attendance responses from your guests.',
          steps: [
            'See the summary: Responses, Attending, Declined, and the guest estimate.',
            'Filter or search for a specific name.',
            'Download CSV for a recap.',
          ],
          always: [
            'Refresh to see the latest responses.',
            'Match the guest estimate against your venue capacity.',
          ],
          never: ['Don\'t assume empty = error — it fills in as guests submit the form.'],
          tips: [
            'Download the CSV for an RSVP recap anytime.',
            'The form\'s meal options reflect what you set in the RSVP section.',
          ],
          shots: { table: 'The RSVP table with stats above it.' },
        },
        gifts: {
          title: 'Gifts',
          summary: 'Confirmations of gifts/envelopes your guests send.',
          steps: [
            'See the list of confirmations and the total mentioned.',
            'Search for a specific name or account.',
            'Download CSV for a recap.',
          ],
          always: [
            'Cross-check confirmations against your own bank statement.',
            'Make sure the accounts in the Wedding Gift section are correct.',
          ],
          never: [
            'Don\'t treat the numbers here as proof of transfer — they\'re guest input.',
            'Don\'t turn off confirmation in Wedding Gift if you still want to receive this data.',
          ],
          tips: ['This tab fills in when guests submit the confirmation form in the Wedding Gift section.'],
          shots: { table: 'The gift confirmation table.' },
        },
        guests: {
          title: 'Guests & Sharing',
          summary: 'Create personal invitations and share a unique link per guest.',
          steps: [
            'Add guest names one by one.',
            'Set the message template (use {{name}} for the name and {{url}} for the link).',
            'Copy each guest\'s personal link.',
            'Send via WhatsApp using the provided button/template.',
          ],
          always: [
            'Use the personal link so the guest\'s name appears in the invitation.',
            'Check the spelling of names before sending.',
            'Set the message template first before sending in bulk.',
          ],
          never: [
            'Don\'t send the generic link if you want a personal greeting.',
            'Don\'t send to everyone at once — it\'s hard to track if something\'s wrong.',
          ],
          tips: [
            'Send in batches, not all at once, so it\'s easier to track.',
            'Open one guest\'s link yourself to confirm the name is correct.',
          ],
          shots: { share: 'The guest list with copy-link and message buttons.' },
        },
        guestbook: {
          title: 'Guestbook',
          summary: 'A record of guest attendance during the event (Premium feature).',
          steps: [
            'If your invitation is still Basic, this tab is locked — click "Upgrade to Premium" (just pay the difference).',
            'Once Premium, open the Guestbook on the day.',
            'Mark guests as present when they arrive.',
          ],
          always: [
            'Use it on the day to record guest attendance.',
            'Have an internet-connected device ready at the reception desk.',
          ],
          never: ['Don\'t worry about upgrading — your invitation stays online and no data is lost.'],
          tips: ['See the "Active period & Upgrade" tab for details on the upgrade process.'],
          shots: { ledger: 'The guest attendance ledger (unlocked after Premium).' },
        },
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS — `dict-parity` green (id/en still mirror), `tutorial-structure` green.

- [ ] **Step 4: Commit**

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/dictionaries/dashboard.ts
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): deepen 9 existing lovebirds categories (id+en)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---
## Task 4: New categories `checklist` + `billing` (copy, id + en)

**Files:** Modify `src/lib/i18n/dictionaries/dashboard.ts`

New category objects can go anywhere inside `tabs.tutorial` (the renderer indexes by id). Insert them **immediately before the `solary:` key** in each language.

- [ ] **Step 1: Insert into the id tree (before `solary:`):**

```ts
        checklist: {
          title: 'Dari nol sampai terbit',
          summary: 'Peta singkat seluruh proses — dari isi data sampai undangan siap dibagikan. Ikuti urutannya; detail tiap langkah ada di tab masing-masing.',
          steps: [
            'Login, lalu pilih bahasa dashboard (ID/EN) sesuai selera.',
            'Isi data inti di section Hero: nama pasangan, tanggal, dan lokasi acara.',
            'Buka Editor Section — tata urutan, lalu isi teks & foto tiap bagian (lihat tab "Panduan tiap Section").',
            'Unggah foto galeri dan, bila mau, satu lagu di tab Musik.',
            'Pilih Palette warna dan ornamen latar sesuai nuansa kalian.',
            'Isi rekening di Wedding Gift dan atur opsi di RSVP.',
            'Klik "Lihat live" dan periksa undangan di HP maupun komputer.',
            'Tambahkan daftar tamu dan siapkan template pesan di tab Tamu.',
            'Pastikan masa aktif masih berlaku dan ubah status jadi Terbit.',
            'Salin link personal tiap tamu dan bagikan lewat WhatsApp.',
          ],
          always: [
            'Simpan tiap selesai mengisi satu bagian.',
            'Cek "Lihat live" sebelum menandai selesai.',
          ],
          never: [
            'Jangan loncat ke berbagi link sebelum status Terbit.',
            'Jangan biarkan foto contoh/placeholder ikut terbit — ganti dengan foto kalian.',
          ],
          tips: [
            'Kerjakan bertahap; tidak harus selesai sekali duduk — semua tersimpan.',
            'Selesaikan data inti (nama, tanggal, lokasi) dulu, baru perindah tampilan.',
          ],
          shots: {},
        },
        billing: {
          title: 'Bayar, Masa Aktif & Upgrade',
          summary: 'Cara membaca masa aktif undangan, apa yang terjadi saat kedaluwarsa, dan cara upgrade ke Premium.',
          steps: [
            'Lihat status masa aktif di bar atas dashboard.',
            'Kalau ada banner "belum bayar" atau masa aktif hampir habis, lakukan pembayaran sesuai instruksi.',
            'Untuk fitur Premium (mis. Buku Tamu), klik "Upgrade ke Premium" dan bayar selisihnya.',
            'Setelah pembayaran terdeteksi, status diperbarui otomatis — segarkan bila perlu.',
          ],
          always: [
            'Bayar/perpanjang sebelum hari-H agar undangan tidak nonaktif saat dibutuhkan.',
            'Simpan bukti pembayaran sampai status berubah aktif.',
          ],
          never: [
            'Jangan biarkan masa aktif habis — saat kedaluwarsa, tamu tidak bisa membuka undangan.',
            'Jangan ragu upgrade karena takut kehilangan data — semua isi tetap utuh.',
          ],
          tips: ['Upgrade Basic → Premium hanya menambah fitur; kamu cukup membayar selisih harga.'],
          shots: {
            status: 'Banner & status masa aktif di bar atas dashboard.',
            upgrade: 'Tombol & alur upgrade ke Premium.',
          },
        },
```

- [ ] **Step 2: Insert into the en tree (before `solary:`):**

```ts
        checklist: {
          title: 'From zero to published',
          summary: 'A short map of the whole process — from filling in your details to a shareable invitation. Follow the order; each step has its own tab here.',
          steps: [
            'Sign in, then pick your dashboard language (ID/EN).',
            'Fill the core details in the Hero section: couple names, date, and venue.',
            'Open the Section Editor — set the order, then fill the text & photos of each part (see the "Per-section guide" tab).',
            'Upload your gallery photos and, if you like, one song in the Music tab.',
            'Pick a color Palette and a background ornament that match your mood.',
            'Add your accounts in Wedding Gift and set the options in RSVP.',
            'Click "View live" and check the invitation on both phone and computer.',
            'Add your guest list and prepare the message template in the Guests tab.',
            'Make sure the active period is valid and switch the status to Published.',
            'Copy each guest\'s personal link and share it via WhatsApp.',
          ],
          always: [
            'Save after finishing each part.',
            'Check "View live" before calling it done.',
          ],
          never: [
            'Don\'t jump to sharing the link before the status is Published.',
            'Don\'t let the sample/placeholder photos go live — replace them with your own.',
          ],
          tips: [
            'Work in stages; you don\'t have to finish in one sitting — everything is saved.',
            'Finish the core details (names, date, venue) first, then make it pretty.',
          ],
          shots: {},
        },
        billing: {
          title: 'Active period & Upgrade',
          summary: 'How to read your invitation\'s active period, what happens when it expires, and how to upgrade to Premium.',
          steps: [
            'Check the active-period status in the dashboard\'s top bar.',
            'If an "unpaid" banner shows or the period is nearly over, pay following the instructions.',
            'For Premium features (e.g. Guestbook), click "Upgrade to Premium" and pay the difference.',
            'Once payment is detected, the status updates automatically — refresh if needed.',
          ],
          always: [
            'Pay/renew before the big day so the invitation doesn\'t go inactive when you need it.',
            'Keep your payment proof until the status turns active.',
          ],
          never: [
            'Don\'t let the active period lapse — when it expires, guests can\'t open the invitation.',
            'Don\'t hesitate to upgrade for fear of losing data — all your content stays intact.',
          ],
          tips: ['Upgrading Basic → Premium only adds features; you just pay the price difference.'],
          shots: {
            status: 'The active-period banner & status in the dashboard top bar.',
            upgrade: 'The upgrade-to-Premium button & flow.',
          },
        },
```

- [ ] **Step 3: Run tests + commit**

Run: `npm test` → Expected: PASS (`dict-parity` green).

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/dictionaries/dashboard.ts
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): add checklist + billing categories (id+en)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: New category `sections` — per-section guide cards (copy, id + en)

**Files:** Modify `src/lib/i18n/dictionaries/dashboard.ts`

14 cards; `sectionGuideCount: 14` was set in Task 2. Insert before `solary:` in each language.

- [ ] **Step 1: Insert into the id tree (before `solary:`):**

```ts
        sections: {
          title: 'Panduan tiap Section',
          summary: 'Apa fungsi tiap bagian undangan dan cara mengisinya — dari Hero sampai Footer. Tidak semua undangan memuat semua bagian ini; tergantung paket section di akunmu.',
          sectionGuides: [
            { title: 'Hero / Gerbang Pembuka',
              sees: 'Layar pembuka: foto besar, nama pasangan, tanggal, dan hitung mundur sebelum tamu masuk.',
              fill: 'Isi nama pasangan, tanggal & jam acara, lokasi, dan teks sambutan; unggah foto sampul; nyalakan/matikan hitung mundur.',
              watch: 'Pakai foto sampul resolusi tinggi & orientasi pas; ini kesan pertama tamu.' },
            { title: 'Quote / Kutipan',
              sees: 'Satu kutipan atau ayat singkat dengan sumbernya.',
              fill: 'Tulis teks kutipan dan atribusinya (mis. nama surat & ayat).',
              watch: 'Jaga tetap singkat — satu paragraf cukup.' },
            { title: 'Mempelai',
              sees: 'Profil mempelai wanita & pria: foto, nama, orang tua, bio singkat, Instagram.',
              fill: 'Isi foto, nama lengkap, nama orang tua, bio singkat, dan akun Instagram tiap mempelai.',
              watch: 'Pastikan ejaan nama & orang tua benar — bagian ini paling diperhatikan keluarga.' },
            { title: 'Our Story / Kisah Kami',
              sees: 'Tumpukan kartu kisah yang muncul saat tamu menggulir: tahun, judul, cerita, foto.',
              fill: 'Tambahkan kartu per momen: tahun/tanggal, judul, cerita singkat, dan satu foto.',
              watch: 'Urutkan dari awal ke akhir; cerita yang terlalu panjang membuat kartu penuh.' },
            { title: 'Event Details / Detail Acara',
              sees: 'Kartu akad, resepsi, dan dress code, plus peta lokasi.',
              fill: 'Isi tanggal, jam, dan lokasi tiap acara; tempel kode embed Google Maps untuk peta.',
              watch: 'Pakai embed Maps (bukan link biasa) supaya peta tampil di dalam undangan.' },
            { title: 'Schedule / Rundown',
              sees: 'Lini masa acara hari-H: jam, judul kegiatan, dan keterangan singkat.',
              fill: 'Tambahkan baris per kegiatan dengan jam, judul, dan deskripsi.',
              watch: 'Urutkan menurut waktu; cukup poin penting, bukan semua detail.' },
            { title: 'Galeri Foto',
              sees: 'Koleksi foto kalian dalam tata letak Masonry atau Spring Coil.',
              fill: 'Unggah foto-foto terbaik; pilih gaya lewat "Ganti tipe section".',
              watch: 'Hanya boleh satu galeri. Pakai foto rasio wajar agar tidak gepeng.' },
            { title: 'Wedding Party / Pendamping',
              sees: 'Daftar pendamping mempelai (bridesmaids/groomsmen) beserta foto.',
              fill: 'Tambahkan nama, peran, dan foto tiap pendamping.',
              watch: 'Bagian opsional; mungkin tidak ada di setiap undangan.' },
            { title: 'Akomodasi',
              sees: 'Rekomendasi penginapan untuk tamu dari luar kota.',
              fill: 'Isi nama hotel, jarak/keterangan, dan tautan atau nomor telepon bila ada.',
              watch: 'Opsional; cantumkan hanya tempat yang benar-benar kamu rekomendasikan.' },
            { title: 'FAQ Section (untuk tamu)',
              sees: 'Tanya-jawab yang dibaca tamu — mis. parkir, anak-anak, dress code.',
              fill: 'Tambahkan pasangan pertanyaan & jawaban yang sering ditanyakan tamu.',
              watch: 'Opsional; berbeda dari tab "FAQ & Solusi Masalah" yang merupakan panduan untukmu.' },
            { title: 'Wedding Gift / Hadiah',
              sees: 'Info rekening bank/e-wallet, alamat kirim kado, dan tombol konfirmasi hadiah.',
              fill: 'Tambahkan rekening (nama bank, nomor, atas nama), alamat kado, dan nyalakan konfirmasi bila perlu.',
              watch: 'Periksa nomor rekening dua kali — salah ketik berisiko salah transfer.' },
            { title: 'RSVP',
              sees: 'Form konfirmasi kehadiran yang diisi tamu: hadir/tidak, jumlah, pilihan menu.',
              fill: 'Atur batas jumlah tamu dan opsi menu; teks ajakan bisa disesuaikan.',
              watch: 'Wajib ada dan tidak bisa dihapus. Respons masuk ke tab RSVP.' },
            { title: 'Footer / Penutup',
              sees: 'Penutup undangan: monogram, hashtag, pesan terima kasih, foto, dan tautan sosial.',
              fill: 'Isi monogram/inisial, hashtag, pesan singkat, foto, dan tautan media sosial.',
              watch: 'Terkunci di paling bawah — tidak bisa dipindah.' },
            { title: 'Blocks (bagian bebas)',
              sees: 'Bagian fleksibel berisi blok teks, gambar, atau kutipan yang kamu susun sendiri.',
              fill: 'Tambahkan blok sesuai kebutuhan bila ingin konten di luar section standar.',
              watch: 'Opsional; pakai secukupnya agar alur undangan tidak berantakan.' },
          ],
          always: [
            'Isi dulu bagian wajib: Hero, Mempelai, Detail Acara, RSVP, dan Hadiah.',
            'Ganti semua teks & foto contoh dengan milik kalian.',
          ],
          never: ['Jangan biarkan bagian penting kosong atau berisi placeholder saat terbit.'],
          tips: ['Buka tiap bagian di Editor sambil membaca kartu ini agar tahu field-nya.'],
          shots: {},
        },
```

> Note: when pasting, verify all strings are plain Latin/ASCII (no stray Cyrillic look-alikes). The only intended non-ASCII are the emoji in the renderer and the `↔`/`–` punctuation.

- [ ] **Step 2: Insert into the en tree (before `solary:`):**

```ts
        sections: {
          title: 'Per-section guide',
          summary: 'What each part of the invitation is for and how to fill it — from Hero to Footer. Not every invitation includes every part; it depends on the section set on your account.',
          sectionGuides: [
            { title: 'Hero / Opening gate',
              sees: 'The opening screen: a large photo, couple names, the date, and a countdown before guests enter.',
              fill: 'Enter couple names, event date & time, venue, and a welcome line; upload a cover photo; turn the countdown on/off.',
              watch: 'Use a high-resolution, well-oriented cover photo — it\'s the guest\'s first impression.' },
            { title: 'Quote',
              sees: 'A single short quote or verse with its source.',
              fill: 'Write the quote text and its attribution (e.g. chapter & verse).',
              watch: 'Keep it short — one paragraph is enough.' },
            { title: 'Bride & Groom',
              sees: 'Profiles of the bride and groom: photo, name, parents, short bio, Instagram.',
              fill: 'Add a photo, full name, parents\' names, a short bio, and the Instagram handle for each.',
              watch: 'Double-check the spelling of names & parents — family scrutinises this most.' },
            { title: 'Our Story',
              sees: 'A stack of story cards that appear as guests scroll: year, title, story, photo.',
              fill: 'Add a card per moment: year/date, title, a short story, and one photo.',
              watch: 'Order them oldest to newest; an overly long story overfills the card.' },
            { title: 'Event Details',
              sees: 'Cards for the ceremony, reception, and dress code, plus a location map.',
              fill: 'Fill the date, time, and location of each event; paste a Google Maps embed code for the map.',
              watch: 'Use a Maps embed (not a plain link) so the map shows inside the invitation.' },
            { title: 'Schedule',
              sees: 'A timeline of the day: time, activity title, and a short note.',
              fill: 'Add a row per activity with a time, title, and description.',
              watch: 'Order by time; keep it to the key moments, not every detail.' },
            { title: 'Photo gallery',
              sees: 'Your photo collection in a Masonry or Spring Coil layout.',
              fill: 'Upload your best photos; pick the style via "Change section type".',
              watch: 'Only one gallery is allowed. Use sensibly-proportioned photos so they don\'t stretch.' },
            { title: 'Wedding Party',
              sees: 'A list of the wedding party (bridesmaids/groomsmen) with photos.',
              fill: 'Add each member\'s name, role, and photo.',
              watch: 'Optional; it may not be present on every invitation.' },
            { title: 'Accommodations',
              sees: 'Lodging recommendations for out-of-town guests.',
              fill: 'Add the hotel name, distance/notes, and a link or phone number if available.',
              watch: 'Optional; list only places you genuinely recommend.' },
            { title: 'FAQ section (for guests)',
              sees: 'Q&A that guests read — e.g. parking, children, dress code.',
              fill: 'Add question & answer pairs guests often ask.',
              watch: 'Optional; different from the "FAQ & Troubleshooting" tab, which is guidance for you.' },
            { title: 'Wedding Gift',
              sees: 'Bank/e-wallet account info, a gift mailing address, and a gift-confirmation button.',
              fill: 'Add accounts (bank name, number, holder), the gift address, and turn on confirmation if needed.',
              watch: 'Double-check account numbers — a typo risks misdirected transfers.' },
            { title: 'RSVP',
              sees: 'The attendance form guests fill in: attending/not, headcount, meal choice.',
              fill: 'Set the guest limit and meal options; the invitation text can be customised.',
              watch: 'Mandatory and cannot be removed. Responses arrive in the RSVP tab.' },
            { title: 'Footer',
              sees: 'The invitation\'s closing: monogram, hashtag, thank-you message, photos, and social links.',
              fill: 'Add a monogram/initials, hashtag, a short message, photos, and social links.',
              watch: 'Locked at the very bottom — it can\'t be moved.' },
            { title: 'Blocks (free section)',
              sees: 'A flexible part holding text, image, or quote blocks you arrange yourself.',
              fill: 'Add blocks as needed when you want content beyond the standard sections.',
              watch: 'Optional; use sparingly so the invitation\'s flow stays clean.' },
          ],
          always: [
            'Fill the mandatory parts first: Hero, Bride & Groom, Event Details, RSVP, and Wedding Gift.',
            'Replace all sample text & photos with your own.',
          ],
          never: ['Don\'t leave important parts empty or full of placeholders when you publish.'],
          tips: ['Open each part in the Editor while reading this card so you know its fields.'],
          shots: {},
        },
```

- [ ] **Step 3: Run tests + commit**

Run: `npm test` → Expected: PASS.

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/dictionaries/dashboard.ts
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): add per-section guide cards (id+en)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: New category `faq` — Q&A troubleshooting (copy, id + en)

**Files:** Modify `src/lib/i18n/dictionaries/dashboard.ts`

10 Q&A pairs; `faqCount: 10` was set in Task 2. Insert before `solary:` in each language.

- [ ] **Step 1: Insert into the id tree (before `solary:`):**

```ts
        faq: {
          title: 'FAQ & Solusi Masalah',
          summary: 'Jawaban cepat untuk masalah yang paling sering ditemui saat mengelola undangan.',
          faqs: [
            { q: 'Perubahan saya hilang setelah reload. Kenapa?',
              a: 'Kemungkinan belum diklik Simpan. Selalu klik Simpan sebelum berpindah tab atau menutup/menyegarkan halaman.' },
            { q: 'Foto jadi gepeng atau terpotong.',
              a: 'Gunakan foto dengan rasio wajar (mis. potret 4:5 atau lanskap 3:2) dan resolusi cukup besar; hindari gambar yang terlalu kecil.' },
            { q: 'Musik tidak berbunyi di undangan.',
              a: 'Pastikan toggle Aktif menyala dan file sudah terunggah. Browser memblokir autoplay, jadi tamu perlu menekan tombol di popup musik.' },
            { q: 'Tamu bilang undangan tidak bisa dibuka.',
              a: 'Cek dua hal: status harus Terbit (bukan Draf), dan masa aktif belum kedaluwarsa. Perbaiki salah satunya bila perlu.' },
            { q: 'Saya lupa password dashboard.',
              a: 'Gunakan tautan "Lupa password" di halaman login untuk reset lewat email kamu.' },
            { q: 'Nama tamu tidak muncul di undangan.',
              a: 'Pastikan kamu membagikan link personal tamu (dari tab Tamu), bukan link umum tanpa nama.' },
            { q: 'Saya ingin dua galeri, tapi tidak bisa.',
              a: 'Template lovebirds hanya mendukung satu galeri. Gunakan "Ganti tipe section" untuk berpindah antara Masonry dan Spring Coil.' },
            { q: 'File MP3 saya ditolak saat diunggah.',
              a: 'Ukuran maksimal 12 MB. Kompres lagu atau pilih versi berkualitas lebih rendah agar muat.' },
            { q: 'Saya tidak menemukan tombol Tambah/Hapus section.',
              a: 'Memang sengaja dimatikan agar layout tetap rapi dan lengkap. Kamu bisa menata urutan dan, untuk galeri, mengganti tipenya.' },
            { q: 'Bagaimana cara membuka fitur Buku Tamu?',
              a: 'Buku Tamu adalah fitur Premium. Klik "Upgrade ke Premium" (bayar selisih) — undanganmu tetap online dan tidak ada data yang hilang.' },
          ],
          shots: {},
        },
```

- [ ] **Step 2: Insert into the en tree (before `solary:`):**

```ts
        faq: {
          title: 'FAQ & Troubleshooting',
          summary: 'Quick answers to the problems people hit most often while managing their invitation.',
          faqs: [
            { q: 'My changes disappeared after a reload. Why?',
              a: 'You probably didn\'t click Save. Always click Save before switching tabs or closing/refreshing the page.' },
            { q: 'My photos look stretched or cropped.',
              a: 'Use photos with a sensible ratio (e.g. 4:5 portrait or 3:2 landscape) and a large-enough resolution; avoid tiny images.' },
            { q: 'The music doesn\'t play on the invitation.',
              a: 'Make sure the Enabled toggle is on and the file is uploaded. Browsers block autoplay, so guests need to tap the button in the music popup.' },
            { q: 'Guests say the invitation won\'t open.',
              a: 'Check two things: the status must be Published (not Draft), and the active period must not be expired. Fix whichever applies.' },
            { q: 'I forgot my dashboard password.',
              a: 'Use the "Forgot password" link on the login page to reset it via your email.' },
            { q: 'The guest\'s name doesn\'t show in the invitation.',
              a: 'Make sure you shared the guest\'s personal link (from the Guests tab), not the generic link without a name.' },
            { q: 'I want two galleries, but I can\'t.',
              a: 'The lovebirds template supports only one gallery. Use "Change section type" to switch between Masonry and Spring Coil.' },
            { q: 'My MP3 was rejected on upload.',
              a: 'The max size is 12 MB. Compress the song or pick a lower-quality version so it fits.' },
            { q: 'I can\'t find the Add/Remove section button.',
              a: 'They\'re disabled on purpose to keep the layout tidy and complete. You can reorder sections and, for the gallery, change its type.' },
            { q: 'How do I unlock the Guestbook feature?',
              a: 'The Guestbook is a Premium feature. Click "Upgrade to Premium" (pay the difference) — your invitation stays online and no data is lost.' },
          ],
          shots: {},
        },
```

- [ ] **Step 3: Run tests + commit**

Run: `npm test` → Expected: PASS.

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/dictionaries/dashboard.ts
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): add FAQ & troubleshooting Q&A (id+en)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---
## Task 7: Screenshots for the `billing` category (best-effort)

**Files:**
- Create: `public/tutorial/lovebirds/billing-status.png`
- Create: `public/tutorial/lovebirds/billing-upgrade.png`

The renderer's `onError` hides a missing `<figure>`, so the `billing` tab works (text only) even without these. Capture them when a suitable account state is available. `billing-status` needs an account whose top bar shows the active-period/unpaid banner; `billing-upgrade` shows the upgrade-to-Premium control (e.g. the locked Guestbook upgrade CTA on a Basic account).

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev` — wait for `http://localhost:3000`.

- [ ] **Step 2: Capture `billing-status`**

Log into a lovebirds dashboard (demo: `/lovebirds/dummy-lovebirds/dashboard`, password `DemoTutorial123!`; or a Basic account if you need the unpaid banner). With Playwright/Chrome DevTools MCP, inject a translucent highlight rectangle + arrow over the active-period status in the top bar, then screenshot **clipped** to that region. Save as `public/tutorial/lovebirds/billing-status.png` (target width ~1000px).

- [ ] **Step 3: Capture `billing-upgrade`**

Navigate to the upgrade control (the Guestbook "Upgrade to Premium" CTA on a Basic account is a reliable target). Annotate and screenshot clipped. Save as `public/tutorial/lovebirds/billing-upgrade.png`.

- [ ] **Step 4: Verify in the UI**

Open the dashboard Tutorial tab → group "Akun & bantuan" → "Bayar, Masa Aktif & Upgrade". Confirm both images render with captions. If a shot is unavailable, leave it out — the figure auto-hides.

- [ ] **Step 5: Commit (only if PNGs were produced)**

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add public/tutorial/lovebirds/billing-status.png public/tutorial/lovebirds/billing-upgrade.png
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "feat(tutorial): annotated screenshots for billing category

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Copy-integrity test + full verification

**Files:**
- Create: `src/lib/i18n/__tests__/tutorial-copy.test.ts`

This test locks the dict copy to the counts declared in `content.ts`, in **both** languages, and checks the new block shapes + shot captions.

- [ ] **Step 1: Write the copy-integrity test**

```ts
import { describe, it, expect } from 'vitest'
import { dashboard } from '../dictionaries/dashboard'
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_GROUPS,
} from '@/app/[template]/[slug]/dashboard/tutorial/content'

const LANGS = ['id', 'en'] as const

function tutorialFor(lang: 'id' | 'en') {
  return (dashboard as any)[lang].tabs.tutorial
}

function expectLen(arr: unknown, n: number, msg: string) {
  if (n === 0) return
  expect(Array.isArray(arr), `${msg} not array`).toBe(true)
  expect((arr as unknown[]).length, `${msg} length`).toBeGreaterThanOrEqual(n)
}

describe('lovebirds tutorial copy integrity', () => {
  it('group labels exist in both languages', () => {
    for (const lang of LANGS) {
      const t = tutorialFor(lang)
      for (const g of TUTORIAL_GROUPS) {
        expect(typeof t.groups?.[g], `${lang} groups.${g}`).toBe('string')
      }
    }
  })

  it('headings exist in both languages', () => {
    for (const lang of LANGS) {
      const h = tutorialFor(lang).headings
      for (const k of ['steps', 'always', 'never', 'tips', 'sees', 'fill', 'watch', 'faq']) {
        expect(typeof h?.[k], `${lang} headings.${k}`).toBe('string')
      }
    }
  })

  it('every category has copy matching its declared counts in both languages', () => {
    for (const lang of LANGS) {
      const t = tutorialFor(lang)
      for (const cat of TUTORIAL_CATEGORIES) {
        const c = t[cat.id]
        expect(c, `${lang} tutorial.${cat.id} missing`).toBeTruthy()
        expect(typeof c.title, `${lang} ${cat.id}.title`).toBe('string')
        expect(typeof c.summary, `${lang} ${cat.id}.summary`).toBe('string')
        expectLen(c.steps, cat.stepCount, `${lang} ${cat.id}.steps`)
        expectLen(c.always, cat.alwaysCount, `${lang} ${cat.id}.always`)
        expectLen(c.never, cat.neverCount, `${lang} ${cat.id}.never`)
        expectLen(c.tips, cat.tipCount, `${lang} ${cat.id}.tips`)

        if (cat.sectionGuideCount) {
          expectLen(c.sectionGuides, cat.sectionGuideCount, `${lang} ${cat.id}.sectionGuides`)
          for (const g of c.sectionGuides) {
            for (const k of ['title', 'sees', 'fill', 'watch']) {
              expect(typeof g[k], `${lang} ${cat.id} card.${k}`).toBe('string')
            }
          }
        }

        if (cat.faqCount) {
          expectLen(c.faqs, cat.faqCount, `${lang} ${cat.id}.faqs`)
          for (const f of c.faqs) {
            expect(typeof f.q, `${lang} ${cat.id} faq.q`).toBe('string')
            expect(typeof f.a, `${lang} ${cat.id} faq.a`).toBe('string')
          }
        }

        for (const shot of cat.shots) {
          expect(typeof c.shots?.[shot.captionKey], `${lang} ${cat.id} caption ${shot.captionKey}`).toBe('string')
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run the new test**

Run: `npm test -- tutorial-copy`
Expected: PASS. If it fails, the message names the exact `<lang> <category>.<field>` whose count/shape is off — fix that dict entry (or the count in content.ts) and re-run.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — `dict-parity`, `tutorial-structure`, `tutorial-copy`, and all existing tests green.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean (0 errors).

- [ ] **Step 5: Manual QA (lovebirds)**

Start `npm run dev`, open a lovebirds dashboard Tutorial tab and verify:
- Subnav shows 4 groups (Persiapan / Mengisi undangan / Tamu & data / Akun & bantuan).
- All 13 categories open without error; `sections` shows 14 cards (👁/✍️/⚠️); `faq` shows a working accordion.
- Toggle Bahasa ID↔EN — every string switches; no raw keys/ids appear.
- Premium gating: on a Basic account `guestbook` is hidden; on Premium it appears.
- Screenshots render or auto-hide (no broken-image icons).

- [ ] **Step 6: Regression QA (solary) — must be unchanged**

Open a solary dashboard Tutorial tab and confirm: **flat** subnav (no groups), original categories only (no `checklist`/`sections`/`billing`/`faq`), no section-guide or FAQ blocks. (Solary has no `ornament` category — that's pre-existing, not a regression.)

- [ ] **Step 7: Commit**

```bash
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" add src/lib/i18n/__tests__/tutorial-copy.test.ts
git -C "c:/Users/arifi/Downloads/multi-template/wedding-saas-next" commit -m "test(tutorial): lock lovebirds copy to declared counts (id+en)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review (author checklist — completed during planning)

**Spec coverage:** deepen 9 (Task 3) ✓ · 4 new categories — checklist/billing (Task 4), sections (Task 5), faq (Task 6) ✓ · grouped subnav (Task 2) ✓ · section-guide + FAQ shapes (Task 2 renderer, Tasks 5/6 copy) ✓ · bilingual + parity (every copy task does id+en; Task 8 locks it) ✓ · screenshots (Task 7) ✓ · solary untouched (content.ts solary array & `tutorial.solary.*` never edited; Task 8 Step 6 regression check) ✓.

**Placeholder scan:** no TBD/TODO; all copy and code are literal. Empty `shots: {}` objects are intentional (categories with no screenshots).

**Type consistency:** category ids match the `TutorialCategoryId` union; group ids (`prep`/`fill`/`data`/`help`) match `TUTORIAL_GROUPS`; heading keys (`steps/always/never/tips/sees/fill/watch/faq`), card keys (`title/sees/fill/watch`), and faq keys (`q/a`) are identical across content.ts, the renderer, the dict copy, and both tests; counts in content.ts (Tasks 1–2) match array lengths in the copy (Tasks 3–6) and are enforced by `tutorial-copy.test.ts` (Task 8).

