# Solary Tutorial Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the solary in-dashboard Tutorial tab substantially more complete — 4 new categories, deepened existing copy, richer screenshots, a searchable table-of-contents, and a per-category "open the related tab" deep-link — all bilingual (ID + EN), with lovebirds left visually frozen.

**Architecture:** Evolve the existing tutorial system (`tutorial/content.ts` + `TutorialTab.tsx` + `dashboard.ts` i18n) from a rigid fixed-count model to a flexible one: render full dict arrays, add one optional `faq` block and an optional `stepsHeading` override, and a `relatedTab` deep-link. New UI (search, deep-link, FAQ) is gated to solary. Copy lives in the i18n dictionaries; the renderer is pure presentation.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, CSS Modules, Vitest (node env), Playwright MCP (screenshots).

**Spec:** `docs/superpowers/specs/2026-06-05-solary-tutorial-expansion-design.md`

**Branch:** `feat/solary-editor` (already current). Commit after each task. Per project rule: `git add` only the exact files listed — never `git add -A` (the user edits template/styles in parallel).

---

## File map

| File | Responsibility | Action |
|---|---|---|
| `src/app/[template]/[slug]/dashboard/tutorial/content.ts` | Category shape + per-template lists | Modify (drop counts, add `relatedTab`, 4 new solary ids) |
| `src/app/[template]/[slug]/dashboard/tutorial/__tests__/content.test.ts` | Guards category lists | Create |
| `src/app/[template]/[slug]/dashboard/tutorial/__tests__/copy.test.ts` | Guards solary copy completeness | Create |
| `src/app/[template]/[slug]/dashboard/TutorialTab.tsx` | Renderer (search, deep-link, faq, full arrays) | Modify (full rewrite) |
| `src/app/[template]/[slug]/dashboard/TutorialTab.module.css` | Styles for search/deep-link/faq | Modify (append) |
| `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` | Pass `onOpenTab` | Modify (1 line block) |
| `src/lib/i18n/dictionaries/dashboard.ts` | ID + EN copy | Modify (headings + solary copy, both trees) |
| `public/tutorial/solary/*.png` | Screenshots | Create (best-effort) |

The pre-existing `src/lib/i18n/__tests__/dict-parity.test.ts` already enforces identical ID/EN key paths (including array lengths) for the whole `dashboard` dict — it is the automated guard for the "bilingual mandatory" rule. Run it after every copy edit.

---

## Task 1: Content model refactor (`content.ts`)

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/tutorial/content.ts`
- Test: `src/app/[template]/[slug]/dashboard/tutorial/__tests__/content.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/[template]/[slug]/dashboard/tutorial/__tests__/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTutorialCategories } from '../content'

describe('tutorial categories', () => {
  it('solary has the 12 expected categories in order', () => {
    const ids = getTutorialCategories('solary').map((c) => c.id)
    expect(ids).toEqual([
      'quickstart', 'start', 'experience', 'editor', 'photos', 'palette',
      'music', 'rsvps', 'gifts', 'guests', 'guestbook', 'faq',
    ])
  })

  it('solary drops the ornament category', () => {
    expect(getTutorialCategories('solary').some((c) => c.id === 'ornament')).toBe(false)
  })

  it('lovebirds keeps its 9 categories and stays frozen (no relatedTab)', () => {
    const cats = getTutorialCategories('lovebirds')
    expect(cats.map((c) => c.id)).toEqual([
      'start', 'editor', 'palette', 'ornament', 'music', 'rsvps', 'gifts', 'guests', 'guestbook',
    ])
    expect(cats.every((c) => c.relatedTab === undefined)).toBe(true)
  })

  it('only solary categories carry relatedTab', () => {
    const withTab = getTutorialCategories('solary').filter((c) => c.relatedTab)
    expect(withTab.map((c) => c.id)).toEqual([
      'quickstart', 'editor', 'photos', 'palette', 'music', 'rsvps', 'gifts', 'guests', 'guestbook',
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/\[template\]/\[slug\]/dashboard/tutorial/__tests__/content.test.ts`
Expected: FAIL — solary list is still the old 8 ids (no `quickstart`/`experience`/`photos`/`faq`), and `relatedTab` doesn't exist yet.

> Note: the bracketed folder names are literal on disk. In PowerShell, quote the path: `npx vitest run "src/app/[template]/[slug]/dashboard/tutorial/__tests__/content.test.ts"`. Or just run all tests: `npm test`.

- [ ] **Step 3: Rewrite `content.ts`**

Replace the entire file with:

```ts
// Structure for the dashboard tutorial. Copy lives in the i18n dict under
// dashboard.<lang>.tabs.tutorial.<categoryId> (lovebirds) and
// dashboard.<lang>.tabs.tutorial.solary.<categoryId> (solary). This file only
// declares shape + which screenshots/tab each category maps to.

export type TutorialCategoryId =
  | 'quickstart' | 'start' | 'experience' | 'editor' | 'photos'
  | 'palette' | 'ornament' | 'music'
  | 'rsvps' | 'gifts' | 'guests' | 'guestbook' | 'faq'

export interface TutorialShot {
  /** file at public/tutorial/<template>/<key>.png */
  key: string
  /** dict key for the caption: ...tutorial.<categoryId>.shots.<captionKey> */
  captionKey: string
}

export interface TutorialCategory {
  id: TutorialCategoryId
  /** premium-only categories are hidden for non-premium plans */
  premiumOnly?: boolean
  /** dashboard tab this category documents; renders a "open tab" deep-link (solary only) */
  relatedTab?: string
  /** screenshots shown for this category, in order */
  shots: TutorialShot[]
}

// Lovebirds — unchanged set/order. No relatedTab: lovebirds stays frozen.
export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  { id: 'start',     shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'editor',    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'palette',   shots: [{ key: 'palette-grid', captionKey: 'grid' }] },
  { id: 'ornament',  shots: [{ key: 'ornament-pick', captionKey: 'pick' }] },
  { id: 'music',     shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps',     shots: [{ key: 'rsvps-table', captionKey: 'table' }] },
  { id: 'gifts',     shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests',    shots: [{ key: 'guests-share', captionKey: 'share' }] },
  { id: 'guestbook', premiumOnly: true, shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
]

// Solary — 12 categories. Drops ornament (own Three.js galaxy); adds quickstart,
// experience, photos, faq. relatedTab drives the deep-link button.
export const TUTORIAL_CATEGORIES_SOLARY: TutorialCategory[] = [
  { id: 'quickstart', relatedTab: 'editor',
    shots: [{ key: 'quickstart-overview', captionKey: 'overview' }] },
  { id: 'start',
    shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'experience',
    shots: [
      { key: 'experience-planets',     captionKey: 'planets' },
      { key: 'experience-music-popup', captionKey: 'musicPopup' },
    ] },
  { id: 'editor', relatedTab: 'editor',
    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-section-edit', captionKey: 'edit' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'photos', relatedTab: 'editor',
    shots: [{ key: 'photos-upload', captionKey: 'upload' }] },
  { id: 'palette', relatedTab: 'palette',
    shots: [
      { key: 'palette-grid',       captionKey: 'grid' },
      { key: 'palette-dark-light', captionKey: 'groups' },
    ] },
  { id: 'music', relatedTab: 'music',
    shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps', relatedTab: 'rsvps',
    shots: [
      { key: 'rsvps-table',  captionKey: 'table' },
      { key: 'rsvps-export', captionKey: 'export' },
    ] },
  { id: 'gifts', relatedTab: 'gifts',
    shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests', relatedTab: 'guests',
    shots: [
      { key: 'guests-share',   captionKey: 'share' },
      { key: 'guests-message', captionKey: 'message' },
    ] },
  { id: 'guestbook', premiumOnly: true, relatedTab: 'guestbook',
    shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
  { id: 'faq', shots: [] },
]

/** Category list for a template's tutorial. Solary uses the 12-category list. */
export function getTutorialCategories(template: string): TutorialCategory[] {
  return template === 'solary' ? TUTORIAL_CATEGORIES_SOLARY : TUTORIAL_CATEGORIES
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- content.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/tutorial/content.ts" "src/app/[template]/[slug]/dashboard/tutorial/__tests__/content.test.ts"
git commit -m "feat(tutorial): flexible content model + 12 solary categories"
```

> If bracketed pathspecs are rejected by git, prefix: `GIT_LITERAL_PATHSPECS=1 git add ...` (per project memory).

---

## Task 2: Renderer — search, deep-link, faq, full-array rendering (`TutorialTab.tsx` + CSS + DashboardClient)

No component unit test (the repo has no jsdom/React test setup; all existing tests are node-logic). Guard = `tsc` + the copy tests + manual smoke. The renderer is written defensively so a not-yet-translated category renders blank instead of crashing.

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/TutorialTab.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/TutorialTab.module.css`
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Replace `TutorialTab.tsx` with the full new renderer**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { getTutorialCategories, type TutorialCategory } from './tutorial/content'
import styles from './TutorialTab.module.css'

export default function TutorialTab({
  isPremium,
  template = 'lovebirds',
  onOpenTab,
}: {
  isPremium: boolean
  template?: string
  onOpenTab?: (tab: string) => void
}) {
  const dict = useDashboardDict()
  const isSolary = template === 'solary'
  // Screenshots live at public/tutorial/<template>/<key>.png.
  const SHOT_BASE = `/tutorial/${template}`
  // Copy tree: solary keeps its own copy under tutorial.solary.*, merged over the
  // shared lovebirds copy so headings/searchPlaceholder/noResult stay shared.
  const root = (dict.tabs as any).tutorial
  const t = isSolary && root.solary ? { ...root, ...root.solary } : root

  const allCats = getTutorialCategories(template).filter((x) => !x.premiumOnly || isPremium)

  const [query, setQuery] = useState('')
  const visibleCats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCats
    return allCats.filter((x) => {
      const cc = t[x.id] ?? {}
      const hay = [cc.title, cc.summary, ...(Array.isArray(cc.steps) ? cc.steps : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [query, allCats, t])

  const [active, setActive] = useState<string>(allCats[0]?.id ?? 'start')
  const cat = (visibleCats.find((x) => x.id === active) ?? visibleCats[0] ?? allCats[0]) as TutorialCategory
  const c = (t[cat.id] ?? {}) as any

  const arr = (x: unknown): string[] => (Array.isArray(x) ? (x.filter(Boolean) as string[]) : [])

  return (
    <div className={styles.wrap}>
      {isSolary && (
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder ?? ''}
          aria-label={t.searchPlaceholder ?? 'Search'}
        />
      )}

      <nav className={styles.subnav}>
        {visibleCats.map((x) => (
          <button
            key={x.id}
            className={`${styles.subtab} ${x.id === cat.id ? styles.subtabActive : ''}`}
            onClick={() => setActive(x.id)}
          >
            {t[x.id]?.title ?? x.id}
          </button>
        ))}
      </nav>
      {visibleCats.length === 0 && <p className={styles.noResult}>{t.noResult ?? ''}</p>}

      <h2 className={styles.title}>{c.title ?? ''}</h2>
      <p className={styles.summary}>{c.summary ?? ''}</p>

      {cat.relatedTab && onOpenTab && c.openTab && (
        <button className={styles.openTab} onClick={() => onOpenTab(cat.relatedTab!)}>
          {c.openTab}
        </button>
      )}

      {cat.shots[0] && <Shot cat={cat} c={c} index={0} base={SHOT_BASE} />}

      {arr(c.steps).length > 0 && (
        <>
          <p className={styles.h}>{c.stepsHeading ?? t.headings.steps}</p>
          <ol className={styles.steps}>
            {arr(c.steps).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      )}

      {cat.shots.slice(1).map((_, i) => (
        <Shot key={i + 1} cat={cat} c={c} index={i + 1} base={SHOT_BASE} />
      ))}

      <Block title={t.headings.always} cls={styles.always} items={arr(c.always)} />
      <Block title={t.headings.never} cls={styles.never} items={arr(c.never)} />
      <Block title={t.headings.tips} cls={styles.tips} items={arr(c.tips)} />

      {Array.isArray(c.faq) && c.faq.length > 0 && (
        <>
          <p className={styles.h}>{t.headings.faq}</p>
          <dl className={styles.faq}>
            {c.faq.map((f: { q: string; a: string }, i: number) => (
              <div key={i} className={styles.faqItem}>
                <dt className={styles.faqQ}>{f.q}</dt>
                <dd className={styles.faqA}>{f.a}</dd>
              </div>
            ))}
          </dl>
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

- [ ] **Step 2: Append styles to `TutorialTab.module.css`**

Append to the end of the file:

```css
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 1px solid rgba(42, 33, 24, 0.16);
  background: #fff;
  color: #2a2118;
  font-family: inherit;
  font-size: 14px;
}
.search:focus { outline: none; border-color: rgba(42, 33, 24, 0.5); }

.noResult { color: #8a7866; font-size: 13px; margin: 0 0 16px; }

.openTab {
  display: inline-block;
  margin: 0 0 18px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #2a2118;
  background: #2a2118;
  color: #f5efe3;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.openTab:hover { opacity: 0.85; }

.faq { margin: 0; }
.faqItem { padding: 12px 0; border-bottom: 1px solid rgba(42, 33, 24, 0.1); }
.faqItem:last-child { border-bottom: none; }
.faqQ { font-weight: 600; color: #2a2118; margin: 0 0 4px; }
.faqA { margin: 0; color: #5c4a3a; line-height: 1.55; }
```

- [ ] **Step 3: Wire `onOpenTab` in `DashboardClient.tsx`**

Find the tutorial render (around line 316):

```tsx
            {tab === 'tutorial' && (
              <TutorialTab isPremium={invitation.plan === 'premium'} template={template} />
            )}
```

Replace with:

```tsx
            {tab === 'tutorial' && (
              <TutorialTab
                isPremium={invitation.plan === 'premium'}
                template={template}
                onOpenTab={(k) => setTab(k as TabKey)}
              />
            )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors). The renderer reads copy loosely via `any`, so missing-yet copy is not a type error.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/TutorialTab.tsx" "src/app/[template]/[slug]/dashboard/TutorialTab.module.css" "src/app/[template]/[slug]/dashboard/DashboardClient.tsx"
git commit -m "feat(tutorial): search + deep-link + faq renderer (solary-gated)"
```

---

## Task 3: Shared headings + Quickstart & Experience copy (ID + EN)

All copy edits touch `src/lib/i18n/dictionaries/dashboard.ts`. The `id` tree's solary object spans ~line 396–539; the `en` tree's ~872… solary at ~1031–1173. Always edit **both** trees in the same task so the parity test stays green.

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts`

- [ ] **Step 1: Add `faq` heading + `searchPlaceholder` + `noResult` to the shared `tutorial` object — ID tree**

In the `id` tree, the `tutorial` object (line ~237) currently is:

```ts
      tutorial: {
        navTitle: 'Panduan Dashboard',
        headings: {
          steps: 'Cara pakai',
          always: 'Selalu lakukan',
          never: 'Jangan / jangan lupa',
          tips: 'Tips',
        },
```

Change to:

```ts
      tutorial: {
        navTitle: 'Panduan Dashboard',
        searchPlaceholder: 'Cari topik…',
        noResult: 'Tidak ada hasil. Coba kata kunci lain.',
        headings: {
          steps: 'Cara pakai',
          always: 'Selalu lakukan',
          never: 'Jangan / jangan lupa',
          tips: 'Tips',
          faq: 'Tanya–Jawab',
        },
```

- [ ] **Step 2: Mirror the same additions in the EN tree**

In the `en` tree, the `tutorial` object (line ~872) currently is:

```ts
      tutorial: {
        navTitle: 'Dashboard Guide',
        headings: {
          steps: 'How to',
          always: 'Always do',
          never: "Don't / don't forget",
          tips: 'Tips',
        },
```

Change to:

```ts
      tutorial: {
        navTitle: 'Dashboard Guide',
        searchPlaceholder: 'Search topics…',
        noResult: 'No results. Try another keyword.',
        headings: {
          steps: 'How to',
          always: 'Always do',
          never: "Don't / don't forget",
          tips: 'Tips',
          faq: 'Q & A',
        },
```

- [ ] **Step 3: Add `quickstart` + `experience` to the ID solary object**

In the `id` tree, inside `tabs.tutorial.solary: {` (line ~396), the first entry is `start: {`. Insert these two objects immediately **before** `start:` so order matches the category list:

```ts
          quickstart: {
            title: 'Quickstart 10 menit',
            summary: 'Belum tahu mulai dari mana? Ikuti urutan ini sekali jalan — sepuluh menit, undangan tata-surya kamu siap dibagikan.',
            stepsHeading: 'Urutan ideal',
            openTab: 'Buka tab Editor →',
            steps: [
              'Isi data mempelai & acara: nama, tanggal, lokasi. Ini yang muncul di gerbang pembuka.',
              'Unggah foto untuk tiap planet lewat tab Editor (maksimal 5 MB per gambar).',
              'Pilih palette warna — latar galaksi ikut menyesuaikan otomatis.',
              'Atur musik latar: unggah satu MP3 lalu aktifkan toggle Aktif.',
              'Klik "Lihat live" di bar atas untuk mengecek hasilnya seperti yang dilihat tamu.',
              'Pastikan status berubah jadi Terbit — selama masih Draf, tamu belum bisa membuka.',
              'Buka tab Tamu, buat link personal, lalu bagikan ke masing-masing tamu.',
            ],
            tips: [
              'Kerjakan dari planet paling atas ke bawah — itu juga urutan tamu menjelajah.',
              'Simpan tiap selesai satu bagian supaya tidak ada yang hilang.',
            ],
            shots: {
              overview: 'Tata letak dashboard — titik mulai tiap langkah ditandai.',
            },
          },
          experience: {
            title: 'Apa yang tamu lihat',
            summary: 'Solary bukan halaman biasa — tamu menjelajah tata surya. Pahami momen-momen ini supaya kamu tahu yang sedang kamu atur.',
            stepsHeading: 'Yang dialami tamu',
            steps: [
              'Gerbang pembuka menyapa tamu dengan nama mereka (kalau kamu kirim link personal).',
              'Scroll kosmik: kamera meluncur antar-planet, tiap planet adalah satu bagian undangan.',
              'Welcome popup menampilkan satu–dua foto pilihan sebagai sambutan hangat.',
              'Story carousel memutar kisah kalian sebagai rangkaian foto bergerak.',
              'Photo-stars: foto galeri kamu melayang jadi bintang berkelip di balik bagian lain.',
              'Popup musik muncul saat halaman dibuka; tamu menekan "Terima" untuk memutar lagu.',
            ],
            tips: [
              'Klik "Lihat live" di bar atas untuk mengalami semuanya sendiri sebelum membagikan.',
              'Pilih foto galeri terbaik — sebagian dipakai jadi bintang latar di seluruh halaman.',
            ],
            shots: {
              planets: 'Scroll kosmik antar-planet seperti yang dilihat tamu.',
              musicPopup: 'Popup musik saat halaman pertama dibuka.',
            },
          },
```

- [ ] **Step 4: Add `quickstart` + `experience` to the EN solary object**

In the `en` tree, inside `tabs.tutorial.solary: {` (line ~1031), insert immediately **before** `start:`:

```ts
          quickstart: {
            title: '10-minute quickstart',
            summary: "Not sure where to begin? Follow this order once — ten minutes and your solar-system invitation is ready to share.",
            stepsHeading: 'Ideal order',
            openTab: 'Open Editor tab →',
            steps: [
              'Fill in the couple & event details: names, date, venue. This is what shows on the opening gate.',
              'Upload a photo for each planet in the Editor tab (max 5 MB per image).',
              'Pick a colour palette — the galaxy background adjusts automatically.',
              'Set the background music: upload one MP3, then switch the Enabled toggle on.',
              'Click "View live" in the top bar to check the result the way guests will see it.',
              "Make sure the status flips to Published — while it's Draft, guests can't open it.",
              'Open the Guests tab, create personal links, then share them with each guest.',
            ],
            tips: [
              "Work from the top planet down — that's also the order guests explore.",
              'Save after each section so nothing gets lost.',
            ],
            shots: {
              overview: "The dashboard layout — each step's starting point is marked.",
            },
          },
          experience: {
            title: 'What guests see',
            summary: "Solary isn't an ordinary page — guests travel through a solar system. Knowing these moments helps you understand what you're setting up.",
            stepsHeading: 'What guests experience',
            steps: [
              'The opening gate greets guests by name (when you send a personal link).',
              'A cosmic scroll: the camera glides between planets, each planet a section of the invitation.',
              'A welcome popup shows one or two chosen photos as a warm greeting.',
              'The story carousel plays your story as a sequence of moving photos.',
              'Photo-stars: your gallery photos float as twinkling stars behind the other sections.',
              'A music popup appears when the page opens; guests tap "Accept" to play the song.',
            ],
            tips: [
              'Click "View live" in the top bar to experience it all yourself before sharing.',
              'Pick your best gallery photos — some become background stars across the whole page.',
            ],
            shots: {
              planets: 'The cosmic scroll between planets, as guests see it.',
              musicPopup: 'The music popup when the page first opens.',
            },
          },
```

- [ ] **Step 5: Run the parity test**

Run: `npm test -- dict-parity`
Expected: PASS — `dashboard` id/en key paths identical (the two new categories + headings.faq + searchPlaceholder/noResult exist symmetrically). If it fails, the printed diff names the missing/extra path; fix the offending tree.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(tutorial): solary quickstart + experience copy (id/en) + faq heading"
```

---

## Task 4: Photos & FAQ copy (ID + EN)

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts`

- [ ] **Step 1: Add `photos` + `faq` to the ID solary object**

In the `id` solary object, insert `photos:` immediately **after** the `editor:` entry, and `faq:` as the **last** entry (immediately before the closing `},` of `solary`, after `guestbook:`).

`photos` (after `editor`):

```ts
          photos: {
            title: 'Panduan Foto',
            summary: 'Di mana tiap foto muncul dan ukuran idealnya, supaya tidak ada yang pecah atau gepeng.',
            stepsHeading: 'Di mana foto muncul',
            openTab: 'Buka tab Editor →',
            steps: [
              'Gerbang pembuka: satu potret tegak tampil paling besar — pakai foto terbaik kalian.',
              'Welcome popup: satu–dua foto sambutan saat halaman dibuka.',
              'Story carousel: rangkaian foto kisah perjalanan kalian.',
              'Galeri: kumpulan foto utama; sebagian otomatis dipakai jadi photo-stars.',
              'Photo-stars: diambil otomatis dari galeri — tak perlu unggah terpisah.',
            ],
            tips: [
              'Maksimal 5 MB per gambar; kalau lebih, perkecil dulu.',
              'Pakai rasio wajar: potret untuk gerbang, lanskap atau persegi untuk galeri.',
              'Foto galeri ikut jadi bintang latar — jadi pilih yang paling bagus.',
            ],
            shots: {
              upload: 'Tombol unggah foto di Editor beserta batas 5 MB.',
            },
          },
```

`faq` (last entry in solary):

```ts
          faq: {
            title: 'FAQ',
            summary: 'Pertanyaan yang sering muncul dan solusi cepatnya.',
            faq: [
              { q: 'Undangan tidak bisa dibuka tamu?', a: 'Cek statusnya harus Terbit (bukan Draf) dan masa aktif belum habis. Banner pembayaran di bar atas menandakan undangan bisa kedaluwarsa.' },
              { q: 'Foto terlihat gepeng atau terpotong?', a: 'Pakai rasio wajar: potret untuk gerbang pembuka, lanskap atau persegi untuk galeri. Hindari gambar yang terlalu lebar atau terlalu sempit.' },
              { q: 'Perubahan hilang setelah halaman di-reload?', a: 'Berarti belum tersimpan. Selalu klik Simpan sebelum menutup atau me-refresh halaman editor.' },
              { q: 'Musik tidak berbunyi?', a: 'Aktifkan toggle Aktif di tab Musik, dan ingat tamu harus menekan "Terima" di popup — browser melarang musik berbunyi otomatis tanpa interaksi.' },
              { q: 'Nama tamu tidak muncul di undangan?', a: 'Kirim link personal dari tab Tamu, bukan link generic. Hanya link personal yang menampilkan nama tamu.' },
              { q: 'Bisakah menambah atau menghapus bagian (planet)?', a: 'Jumlah planet sudah tetap demi menjaga tata surya tetap utuh. Kamu bisa menata urutan dan mengganti jenis sebagian planet, tapi Galeri, RSVP, dan Hadiah terkunci.' },
              { q: 'Masa aktif habis / undangan kedaluwarsa?', a: 'Selesaikan pembayaran sebelum hari-H. Status masa aktif ada di bar atas sebelah kanan.' },
              { q: 'Bagaimana upgrade ke Premium (Buku Tamu)?', a: 'Cukup bayar selisihnya. Undangan tetap online selama proses, tidak ada data yang hilang.' },
            ],
          },
```

- [ ] **Step 2: Add `photos` + `faq` to the EN solary object (same positions)**

`photos` (after `editor`):

```ts
          photos: {
            title: 'Photo guide',
            summary: 'Where each photo appears and the ideal sizes, so nothing comes out blurry or stretched.',
            stepsHeading: 'Where photos appear',
            openTab: 'Open Editor tab →',
            steps: [
              'Opening gate: one upright (portrait) photo shows largest — use your very best shot.',
              'Welcome popup: one or two greeting photos when the page opens.',
              'Story carousel: a sequence of photos telling your journey.',
              'Gallery: your main photo set; some are used automatically as photo-stars.',
              'Photo-stars: pulled automatically from the gallery — no separate upload needed.',
            ],
            tips: [
              "Max 5 MB per image; if it's larger, shrink it first.",
              'Use sensible ratios: portrait for the gate, landscape or square for the gallery.',
              'Gallery photos also become background stars — so pick the best ones.',
            ],
            shots: {
              upload: 'The photo-upload button in the Editor and its 5 MB limit.',
            },
          },
```

`faq` (last entry in solary):

```ts
          faq: {
            title: 'FAQ',
            summary: 'Common questions and their quick fixes.',
            faq: [
              { q: "Guests can't open the invitation?", a: "Check that the status is Published (not Draft) and the active period hasn't ended. A payment banner in the top bar means the invitation can expire." },
              { q: 'Photos look stretched or cropped?', a: 'Use sensible ratios: portrait for the opening gate, landscape or square for the gallery. Avoid images that are too wide or too narrow.' },
              { q: 'Changes disappear after reloading the page?', a: "They weren't saved. Always click Save before closing or refreshing the editor." },
              { q: "Music won't play?", a: 'Switch the Enabled toggle on in the Music tab, and remember guests must tap "Accept" in the popup — browsers block music from autoplaying without interaction.' },
              { q: "Guest names don't show on the invitation?", a: "Send a personal link from the Guests tab, not the generic link. Only personal links display the guest's name." },
              { q: 'Can I add or remove sections (planets)?', a: 'The number of planets is fixed to keep the solar system whole. You can reorder and change the type of some planets, but Gallery, RSVP, and Gifts are locked.' },
              { q: 'Active period ended / invitation expired?', a: 'Complete payment before the big day. The active-period status is in the top-right of the top bar.' },
              { q: 'How do I upgrade to Premium (Guest Book)?', a: 'Just pay the difference. Your invitation stays online throughout, and no data is lost.' },
            ],
          },
```

- [ ] **Step 3: Run the parity test**

Run: `npm test -- dict-parity`
Expected: PASS. (FAQ arrays must have the same length in both trees — both have 8 items.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(tutorial): solary photos + faq copy (id/en)"
```

---

## Task 5: Deepen existing solary categories + add `openTab` labels & new shot captions (ID + EN)

Add an `openTab` label to every existing solary category that has a `relatedTab` (editor, palette, music, rsvps, gifts, guests, guestbook), plus the targeted depth additions and the new shot captions (`editor.shots.edit`, `palette.shots.groups`, `rsvps.shots.export`, `guests.shots.message`). `start` gets one extra step + tip but no `openTab` (no relatedTab). Every addition is mirrored in both trees.

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts`

- [ ] **Step 1: ID tree — `start`**

Append one item to `solary.start.steps` and one to `solary.start.tips`:

- new step (append): `'Bookmark halaman dashboard ini supaya gampang kembali kapan saja.'`
- new tip (append): `'Toggle Bahasa hanya mengubah tampilan dashboard, bukan isi undangan untuk tamu.'`

- [ ] **Step 2: ID tree — `editor`**

- add key `openTab: 'Buka tab Editor →',`
- append to `always`: `'Pratinjau di HP juga, bukan cuma di laptop — kebanyakan tamu membuka dari ponsel.'`
- add to `shots`: `edit: 'Panel edit satu planet — ubah teks dan ganti foto di sini.',`

- [ ] **Step 3: ID tree — `palette`**

- add key `openTab: 'Buka tab Palette →',`
- append to `tips` (already has 1): `'Coba dua–tiga palette lewat "Lihat live" sebelum memutuskan.'`
- add to `shots`: `groups: 'Dua kelompok palette — Gelap (malam berbintang) dan Terang (pastel lembut).',`

- [ ] **Step 4: ID tree — `music`**

- add key `openTab: 'Buka tab Musik →',`
- append to `never`: `'Jangan pilih lagu dengan intro hening panjang — popup keburu ditutup tamu.'`

- [ ] **Step 5: ID tree — `rsvps`**

- add key `openTab: 'Buka tab RSVP →',`
- append to `steps`: `'Pantau angka "Hadir" untuk perkiraan katering dan kursi.'`
- add to `shots`: `export: 'Filter/cari dan tombol Unduh CSV untuk rekap.',`

- [ ] **Step 6: ID tree — `gifts`**

- add key `openTab: 'Buka tab Hadiah →',`
- add a `tips` array (gifts currently has none): `tips: ['Cocokkan tiap konfirmasi dengan mutasi rekening sebelum menandainya diterima.'],`

- [ ] **Step 7: ID tree — `guests`**

- add key `openTab: 'Buka tab Tamu →',`
- append to `tips` (already has 1): `'Simpan template pesan WhatsApp sekali, lalu kirim massal jadi lebih cepat.'`
- add to `shots`: `message: 'Template pesan WhatsApp + tombol salin link personal.',`

- [ ] **Step 8: ID tree — `guestbook`**

- add key `openTab: 'Buka tab Buku Tamu →',`
- add a `tips` array (none currently): `tips: ['Buka di HP saat hari-H untuk menandai tamu yang datang langsung (walk-in).'],`

- [ ] **Step 9: EN tree — mirror Steps 1–8 exactly**

Apply the same additions to the EN `solary` object (same keys, same array lengths):

- `start`: step `'Bookmark this dashboard page so you can come back anytime.'`; tip `'The Language toggle only changes the dashboard view, not the guest-facing invitation.'`
- `editor`: `openTab: 'Open Editor tab →',`; always `'Preview on a phone too, not just a laptop — most guests open it on mobile.'`; `shots.edit: 'A single planet\'s edit panel — change its text and swap photos here.'`
- `palette`: `openTab: 'Open Palette tab →',`; tip `'Try two or three palettes via "View live" before deciding.'`; `shots.groups: 'The two palette groups — Dark (starry night) and Light (soft pastel).'`
- `music`: `openTab: 'Open Music tab →',`; never `"Don't pick a song with a long silent intro — guests may close the popup first."`
- `rsvps`: `openTab: 'Open RSVP tab →',`; step `'Watch the "Attending" number to estimate catering and seating.'`; `shots.export: 'Filter/search and the Download CSV button for your records.'`
- `gifts`: `openTab: 'Open Gifts tab →',`; `tips: ['Match each confirmation against your bank statement before marking it received.'],`
- `guests`: `openTab: 'Open Guests tab →',`; tip `'Save your WhatsApp message template once, then sending in bulk is faster.'`; `shots.message: 'The WhatsApp message template + copy-personal-link button.'`
- `guestbook`: `openTab: 'Open Guest Book tab →',`; `tips: ['Open it on your phone on the day to check in walk-in guests.'],`

- [ ] **Step 10: Run the parity test**

Run: `npm test -- dict-parity`
Expected: PASS. If it fails, a printed path like `dashboard ... solary.gifts.tips[0]` present in one tree only tells you which mirror you missed.

- [ ] **Step 11: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(tutorial): deepen solary categories + openTab labels + shot captions (id/en)"
```

---

## Task 6: Copy-completeness test (final guard)

**Files:**
- Create: `src/app/[template]/[slug]/dashboard/tutorial/__tests__/copy.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { dashboard } from '@/lib/i18n/dictionaries/dashboard'
import { getTutorialCategories } from '../content'

const langs = ['id', 'en'] as const
const cats = getTutorialCategories('solary')

function solaryCopy(lang: 'id' | 'en'): any {
  return (dashboard as any)[lang].tabs.tutorial.solary
}

describe('solary tutorial copy completeness', () => {
  it.each(langs)('%s: every solary category has title + summary', (lang) => {
    const sol = solaryCopy(lang)
    for (const c of cats) {
      expect(sol[c.id], `${lang}.${c.id} missing`).toBeTruthy()
      expect(typeof sol[c.id].title).toBe('string')
      expect(typeof sol[c.id].summary).toBe('string')
    }
  })

  it.each(langs)('%s: categories with relatedTab have an openTab label', (lang) => {
    const sol = solaryCopy(lang)
    for (const c of cats.filter((x) => x.relatedTab)) {
      expect(typeof sol[c.id].openTab, `${lang}.${c.id}.openTab missing`).toBe('string')
    }
  })

  it.each(langs)('%s: the faq category has a non-empty Q&A list', (lang) => {
    const faq = solaryCopy(lang).faq.faq
    expect(Array.isArray(faq)).toBe(true)
    expect(faq.length).toBeGreaterThan(0)
    for (const item of faq) {
      expect(typeof item.q).toBe('string')
      expect(typeof item.a).toBe('string')
    }
  })

  it.each(langs)('%s: headings include faq + search copy exists', (lang) => {
    const tut = (dashboard as any)[lang].tabs.tutorial
    expect(typeof tut.headings.faq).toBe('string')
    expect(typeof tut.searchPlaceholder).toBe('string')
    expect(typeof tut.noResult).toBe('string')
  })
})
```

- [ ] **Step 2: Run it (should pass now that Tasks 3–5 are done)**

Run: `npm test -- copy.test`
Expected: PASS (8 assertions across id/en). If a category is missing copy or an `openTab`, this names it.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/tutorial/__tests__/copy.test.ts"
git commit -m "test(tutorial): solary copy-completeness guard"
```

---

## Task 7: Screenshots (Playwright MCP, best-effort)

The `onError` handler hides any `<img>` whose PNG is absent, so this task is non-blocking: text + structure already ship. Capture what the environment allows.

**Prerequisite:** exactly one `next dev` running (project memory: two `next dev` corrupt `.next`). Start it if needed: `npm run dev`. Log into the dummy account at `/solary/dummy-solary/dashboard` — `dummy+dummy-solary@example.com` / `DemoTutorial123!` (per `reference_dummy_solary_login`; if it was reset, re-run `node scripts/seed-dummy.mjs`).

**Files:**
- Create: `public/tutorial/solary/<key>.png`

- [ ] **Step 1: Capture the new dashboard shots**

For each, navigate to the tab, inject a highlight overlay (box + label) over the named control via `evaluate`, then screenshot the element region. Save with the exact key:

- `editor-section-edit.png` — Editor tab, a single planet's edit panel (text fields + photo upload) highlighted.
- `photos-upload.png` — Editor tab, the image-upload control + the 5 MB limit note.
- `palette-dark-light.png` — Palette tab, both palette groups with "Gelap"/"Terang" labels.
- `rsvps-export.png` — RSVP tab, the filter/search row + "Unduh CSV" button.
- `guests-message.png` — Guests tab, the WhatsApp message template + copy-link button.
- `quickstart-overview.png` — the dashboard with the ideal-order path annotated (numbered callouts).

- [ ] **Step 2: Capture the live-invitation shots**

Open the live invitation (`/solary/dummy-solary`, or a `demo-*` slug). Capture:

- `experience-planets.png` — the cosmic scroll between planets mid-scroll.
- `experience-music-popup.png` — the music popup on first open.

- [ ] **Step 3: Verify they render**

Reload `/solary/dummy-solary/dashboard` → Tutorial tab → each enriched category now shows its extra screenshot; new categories show theirs. Any not-captured key simply renders no image (figure hidden).

- [ ] **Step 4: Commit whatever was captured**

```bash
git add public/tutorial/solary/
git commit -m "feat(tutorial): solary tutorial screenshots (new + enriched)"
```

> If the dev server / dummy account isn't available in this environment, skip Task 7 and note it in the final summary — the feature is complete without images and they can be backfilled later.

---

## Task 8: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS — including `content.test`, `copy.test`, and `dict-parity` (dashboard id/en identical).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke — solary**

`/solary/dummy-solary/dashboard` → Tutorial tab:
- 12 category pills appear in order (Quickstart … FAQ); guestbook visible (dummy is premium).
- Typing in the search box filters the pills; clearing restores all; a no-match query shows the "Tidak ada hasil" line.
- A category with a deep-link (e.g. Editor) shows "Buka tab Editor →"; clicking it switches the dashboard to the Editor tab.
- FAQ category renders the Q&A list (no steps/always/never).
- Flip the dashboard Language toggle → every title/summary/step/tip/FAQ swaps ID⟷EN; no raw keys, no language leaking the wrong way. Spot-check all 12.

- [ ] **Step 4: Manual smoke — lovebirds (frozen)**

Open any lovebirds dashboard → Tutorial tab: no search box, no deep-link buttons; same 9 categories, copy, and screenshots as before.

- [ ] **Step 5: Final commit (if any cleanup)**

```bash
git add -- <only files you changed>
git commit -m "chore(tutorial): final verification pass"
```

---

## Self-review notes (already reconciled)

- **Spec coverage:** new topics (Tasks 3–4), deepen (Task 5), richer visuals (Task 7), search + deep-link (Task 2), bilingual (every copy task + parity test), lovebirds frozen (Task 1 no-relatedTab, Task 2 `isSolary` gate, Task 8 Step 4). ✓
- **Type consistency:** `relatedTab?: string`, `onOpenTab?: (tab: string) => void`, `getTutorialCategories`, shot `captionKey`s (`overview`/`planets`/`musicPopup`/`edit`/`upload`/`groups`/`export`/`message`) all match between `content.ts`, the renderer, and the copy `shots` objects. ✓
- **No placeholders:** all copy strings and test bodies are literal. ✓
