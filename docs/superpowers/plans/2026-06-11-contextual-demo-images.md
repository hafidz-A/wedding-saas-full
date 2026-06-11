# Contextual Demo Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every demo/placeholder image on the landing page and in both templates (live preview + purchased starter configs) is contextual to its caption/slot, and a published invitation never renders an empty image slot.

**Architecture:** One registry module (`src/lib/demoImages.js`) owns every curated Unsplash photo ID. Default configs, editor schemas, and the landing page import from it. A generic render-time walker (`fillEmptyImages`) fills blank image fields with contextual registry photos, wired at the single public-render chokepoint `app/[template]/[slug]/page.tsx` (which also serves the editor's preview iframe and the `demo-*` slugs).

**Tech Stack:** Next.js 14, plain ESM JS for cross-runtime modules (importable from `.ts`, `.jsx`, and node scripts), Vitest (tests in `__tests__/`), verify with `npx tsc --noEmit` + `npx vitest run` (NOT `npm run lint` — it hangs).

**Spec:** `docs/superpowers/specs/2026-06-11-contextual-demo-images-design.md`

**Branch:** continue on `feat/solary-editor`. NEVER `git add -A` — stage explicit paths only (user works in parallel).

---

### Task 1: Registry module `src/lib/demoImages.js`

**Files:**
- Create: `src/lib/demoImages.js`
- Test: `src/lib/__tests__/demoImages.test.ts`

Plain `.js` ESM (no TS syntax) so node scripts can import it later if needed; TS consumers resolve it via the existing `@/` alias (allowJs already in use — `defaultConfig.js` is imported from TS today).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/demoImages.test.ts
import { describe, it, expect } from 'vitest'
import { DEMO_PHOTOS, demoImg } from '../demoImages'

describe('demoImages registry', () => {
  it('builds a proper Unsplash URL', () => {
    expect(demoImg('bridePortrait', 800)).toMatch(
      /^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?auto=format&fit=crop&w=800&q=80$/,
    )
  })
  it('every key has a non-empty photo id', () => {
    for (const [key, id] of Object.entries(DEMO_PHOTOS)) {
      expect(id, key).toMatch(/^\d+-[a-f0-9]+$/)
    }
  })
  it('throws on unknown key', () => {
    expect(() => demoImg('nope', 100)).toThrow(/unknown demo image key/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/demoImages.test.ts`
Expected: FAIL — cannot resolve `../demoImages`

- [ ] **Step 3: Write the registry**

The IDs below are the initial curation: every ID already used in this repo is kept under a key matching what the photo actually shows; new contexts get best-guess well-known Unsplash IDs. **Task 3 visually verifies every single key and swaps any mismatch — do not skip it.**

```js
// src/lib/demoImages.js
/* ============================================================
   demoImages.js — single source for every demo/placeholder photo.
   Keys are context slots; values are Unsplash photo IDs.
   Consumed by: lovebirds defaultConfig, solary pageConfig, editor
   schemas, marketing components, and fillEmptyImages (render-time
   fallback for purchased invitations).
   Verify visually via /dev/demo-images (dev only) and
   `node scripts/check-demo-images.mjs` after any change.
   ============================================================ */

export const DEMO_PHOTOS = {
  // — couple & portraits —
  coupleGate:      '1519741497674-611481863552', // bride & groom, classic formal
  coupleClassic:   '1606800052052-a08af7148866', // wedding-day couple
  coupleCasual:    '1521336575822-6da63fb45455', // couple casual outdoors
  coupleSunset:    '1474552226712-ac0f0961a954', // couple silhouette at sunset
  bridePortrait:   '1525186402429-b4ff38bedec6', // bride solo portrait
  groomPortrait:   '1507003211169-0a1dd7228f2d', // groom/man solo portrait

  // — story moments (lovebirds OurStory + solary storyPlanet) —
  storyFirstMeet:  '1502635385003-ee1e6a1a742d', // couple by the sea
  storyFirstDate:  '1502139214982-d0ad755818d8', // bonfire / evening date
  storyHoliday:    '1530103862676-de8c9debad1d', // festive hats / holiday fun
  storyProposal:   '1522673607200-164d1b6ce486', // hands + ring proposal
  storyWedding:    '1465495976277-4387d4b0b4c6', // ceremony / arch

  // — gallery moments —
  galleryCoffee:        '1495474472287-4d71bcdd2085', // coffee
  galleryRoadTrip:      '1511285560929-80b456fea0bc', // road trip / car
  gallerySunsetWalk:    '1476900543704-4312b78632f8', // sunset walk
  galleryCityLights:    '1469371670807-013ccf25f16a', // city night
  galleryCooking:       '1556911220-bff31c812dba',    // cooking at home
  galleryFamilyDinner:  '1414235077428-338989a2e8c0', // dinner table
  galleryBeach:         '1507525428034-b723cf961d3e', // beach
  galleryHiking:        '1501555088652-021faa106b9b', // hiking couple
  galleryMovieNight:    '1489599849927-2ee91cede3ba', // cinema
  galleryBirthday:      '1464349095431-e9a21285b5f3', // birthday cake candles
  galleryAnniversary:   '1518621736915-f3b1c41bfd00', // intimate dinner / toast
  gallerySunrise:       '1470252649378-9c29740c9fa8', // sunrise sky
  galleryCelebration:   '1492684223066-81342ee5ff30', // sparklers celebration
  galleryVenue:         '1519167758481-83f550bb49b3', // garden venue
  galleryDressFitting:  '1595777457583-95e059d581b8', // bridal dress
  galleryCakeTasting:   '1535141192574-5d4897c12636', // wedding cake
  galleryPreWedShoot:   '1583939003579-730e3918a45a', // pre-wedding shoot
  galleryBrunch:        '1529543544282-ea669407fca3', // brunch spread
  gallerySaveTheDate:   '1607190074257-dd4b7af0309f', // stationery / invites
  galleryRings:         '1605100804763-247f67b3557e', // wedding rings
  galleryFirstDance:    '1523438885200-e635ba2c371e', // first dance
  galleryGraduation:    '1523580494863-6f3031224c94', // graduation / milestone

  // — wedding party / team —
  partyMaidOfHonor:  '1494790108377-be9c29b29330', // woman portrait 1
  partyBridesmaid2:  '1438761681033-6461ffad8d80', // woman portrait 2
  partyBridesmaid3:  '1544005313-94ddf0286df2',    // woman portrait 3
  partyBestMan:      '1500648767791-00dcc994a43e', // man portrait 1
  partyGroomsman2:   '1506794778202-cad84cf45f1d', // man portrait 2
  partyGroomsman3:   '1472099645785-5658abf4ff4e', // man portrait 3

  // — wishlist / gifts —
  wishlistCookware:  '1556909114-f6e7ad7d3136',    // kitchen / cookware
  wishlistHoneymoon: '1507525428034-b723cf961d3e', // beach travel (shared w/ galleryBeach — OK)
}

/** Build a CDN URL for a registry key at the given pixel width. */
export function demoImg(key, width) {
  const id = DEMO_PHOTOS[key]
  if (!id) throw new Error(`unknown demo image key: ${key}`)
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/demoImages.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/demoImages.js src/lib/__tests__/demoImages.test.ts
git commit -m "feat(demo-images): central registry of curated contextual demo photos"
```

---

### Task 2: URL health-check script

**Files:**
- Create: `scripts/check-demo-images.mjs`

- [ ] **Step 1: Write the script**

```js
// scripts/check-demo-images.mjs
// One-shot guard: every registry photo must respond 200 from Unsplash.
// Usage: node scripts/check-demo-images.mjs
import { DEMO_PHOTOS, demoImg } from '../src/lib/demoImages.js'

let failed = 0
for (const key of Object.keys(DEMO_PHOTOS)) {
  const url = demoImg(key, 100)
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    failed++
    console.error(`✗ ${key} → HTTP ${res.status}  ${url}`)
  } else {
    console.log(`✓ ${key}`)
  }
}
if (failed > 0) {
  console.error(`\n${failed} dead photo ID(s). Replace them in src/lib/demoImages.js.`)
  process.exit(1)
}
console.log('\nAll demo images healthy.')
```

- [ ] **Step 2: Run it**

Run: `node scripts/check-demo-images.mjs`
Expected: every line `✓ <key>`, exit 0. If any `✗`: replace that ID in the registry with a working candidate (see Task 3's curation loop) before continuing.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-demo-images.mjs
git commit -m "chore(demo-images): add URL health-check script"
```

---

### Task 3: Visual contact sheet + curation pass (GATING)

**Files:**
- Create: `src/app/dev/demo-images/page.tsx`
- Possibly modify: `src/lib/demoImages.js` (swapped IDs)

This is the step that makes the images actually *contextual*. A wrong-but-loading photo passes Task 2; only eyes catch "galleryCakeTasting is actually a mountain".

- [ ] **Step 1: Create the dev-only contact sheet**

```tsx
// src/app/dev/demo-images/page.tsx
import { notFound } from 'next/navigation'
import { DEMO_PHOTOS, demoImg } from '@/lib/demoImages'

/** Dev-only contact sheet to eyeball every demo image against its key. */
export default function DemoImagesPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const keys = Object.keys(DEMO_PHOTOS)
  return (
    <main style={{ padding: 24, background: '#111', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontFamily: 'monospace' }}>demo images — {keys.length} keys</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {keys.map((key) => (
          <figure key={key} style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demoImg(key, 400)} alt={key} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 }} />
            <figcaption style={{ color: '#9f9', fontFamily: 'monospace', fontSize: 12, padding: '4px 0' }}>{key}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run the dev server and screenshot the sheet**

Run: `npm run dev` (background; ensure no second dev server — two `next dev` corrupt `.next`). Open `http://localhost:3000/dev/demo-images` with the Chrome DevTools MCP (or Playwright MCP) and take a full-page screenshot. Read the screenshot.

- [ ] **Step 3: Curation loop — swap every mismatched key**

For each key whose photo does not match its context (e.g. `galleryDressFitting` shows a landscape):
1. Find a replacement: open `https://unsplash.com/s/photos/<search-terms>` in the MCP browser, pick a matching photo, open it, and copy the photo ID from its URL (`unsplash.com/photos/<slug>-<id>` → the trailing id segment maps to `images.unsplash.com/photo-<id>` — verify by loading `https://images.unsplash.com/photo-<id>?w=200` directly).
2. Update `src/lib/demoImages.js`.
3. Reload the contact sheet, re-screenshot, re-check.

Repeat until **every** key matches its context. Also verify portraits: `partyMaidOfHonor/Bridesmaid*` female, `partyBestMan/Groomsman*` male, `bridePortrait` female, `groomPortrait` male.

- [ ] **Step 4: Re-run the health check**

Run: `node scripts/check-demo-images.mjs`
Expected: all ✓, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dev/demo-images/page.tsx src/lib/demoImages.js
git commit -m "feat(demo-images): dev contact sheet + visually verified curation"
```

---

### Task 4: `fillEmptyImages` render-time fallback

**Files:**
- Create: `src/lib/config/fillEmptyImages.js`
- Test: `src/lib/config/__tests__/fillEmptyImages.test.ts`

Generic recursive walker over `config.sections[*].props`, keyed on **field name** (with section-type context for pools). No section component changes.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/config/__tests__/fillEmptyImages.test.ts
import { describe, it, expect } from 'vitest'
import { fillEmptyImages } from '../fillEmptyImages'

const section = (type: string, props: any) => ({ id: type, type, enabled: true, props })

describe('fillEmptyImages', () => {
  it('is null-safe and returns non-section configs untouched', () => {
    expect(fillEmptyImages(null)).toBeNull()
    expect(fillEmptyImages({ meta: {} } as any)).toEqual({ meta: {} })
  })

  it('fills empty lovebirds image fields contextually', () => {
    const cfg = {
      sections: [
        section('hero', { gateImage: '', blastPhotos: ['', 'https://keep.me/x.jpg', ''] }),
        section('ourStory', { stories: [{ title: 'a', image: '' }, { title: 'b', image: '  ' }] }),
        section('brideGroom', { people: [
          { role: 'Bride', name: 'A', photo: '' },
          { role: 'Groom', name: 'R', photo: '' },
        ]}),
        section('galleryMasonry', { photos: [{ src: '', alt: 'x' }, { src: 'https://keep.me/y.jpg', alt: 'y' }] }),
        section('weddingParty', { people: [
          { name: 'Maya', role: 'Maid of Honor', photo: '' },
          { name: 'Dimas', role: 'Best Man', photo: '' },
        ]}),
        section('footer', { photos: [{ src: '', alt: 'Amara' }] }),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props
    expect(p(0).gateImage).toMatch(/images\.unsplash\.com/)
    expect(p(0).blastPhotos[0]).toMatch(/images\.unsplash\.com/)
    expect(p(0).blastPhotos[1]).toBe('https://keep.me/x.jpg') // untouched
    expect(p(1).stories[0].image).toMatch(/images\.unsplash\.com/)
    expect(p(1).stories[0].image).not.toBe(p(1).stories[1].image) // cycles, not repeats
    expect(p(2).people[0].photo).not.toBe(p(2).people[1].photo)   // bride ≠ groom
    expect(p(3).photos[0].src).toMatch(/images\.unsplash\.com/)
    expect(p(3).photos[1].src).toBe('https://keep.me/y.jpg')
    expect(p(4).people[0].photo).not.toBe(p(4).people[1].photo)   // female vs male pool
    expect(p(5).photos[0].src).toMatch(/images\.unsplash\.com/)
  })

  it('fills empty solary image fields contextually', () => {
    const cfg = {
      sections: [
        section('openingGate', { gatePhotos: ['', '', ''] }),
        section('welcomePlanet', { portrait: '', portrait2: '' }),
        section('storyPlanet', { timeline: [{ label: 'x', photos: ['', ''] }, { label: 'y', photos: [] }] }),
        section('saturnRing', { photos: [{ src: '', caption: 'First Coffee' }] }),
        section('teamPlanet', { groups: [
          { label: 'Bridesmaids', members: [{ name: 'Maya', role: 'Maid of Honor', avatar: '' }] },
          { label: 'Groomsmen',   members: [{ name: 'Rio',  role: 'Best Man',      avatar: '' }] },
        ]}),
        section('giftPlanet', { wishlist: [{ name: 'Cookware', image: '', url: '' }] }),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props
    expect(p(0).gatePhotos.every((u: string) => u.includes('images.unsplash.com'))).toBe(true)
    expect(p(1).portrait).toMatch(/images\.unsplash\.com/)
    expect(p(1).portrait2).toMatch(/images\.unsplash\.com/)
    expect(p(1).portrait).not.toBe(p(1).portrait2)
    expect(p(2).timeline[0].photos[0]).toMatch(/images\.unsplash\.com/)
    expect(p(3).photos[0].src).toMatch(/images\.unsplash\.com/)
    expect(p(4).groups[0].members[0].avatar).not.toBe(p(4).groups[1].members[0].avatar)
    expect(p(5).wishlist[0].image).toMatch(/images\.unsplash\.com/)
  })

  it('does not invent fields and does not touch non-image strings', () => {
    const cfg = { sections: [section('rsvp', { title: 'Will You Join Us?', subtitle: '' })] }
    const out = fillEmptyImages(cfg)!
    expect(out.sections[0].props).toEqual({ title: 'Will You Join Us?', subtitle: '' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/config/__tests__/fillEmptyImages.test.ts`
Expected: FAIL — cannot resolve `../fillEmptyImages`

- [ ] **Step 3: Implement**

```js
// src/lib/config/fillEmptyImages.js
/* ============================================================
   fillEmptyImages — render-time fallback so a published
   invitation NEVER shows an empty image slot. Walks
   config.sections[*].props and fills blank image-bearing fields
   with contextual photos from the demo registry. Pure: returns
   a new config, never mutates, never persisted to the DB.
   Wired in app/[template]/[slug]/page.tsx (public render +
   editor preview iframe + demo-* slugs, both templates).
   ============================================================ */
import { demoImg } from '../demoImages.js'

const blank = (v) => typeof v !== 'string' || v.trim() === ''

const STORY_POOL = ['storyFirstMeet', 'storyFirstDate', 'storyHoliday', 'storyProposal', 'storyWedding']
const GALLERY_POOL = [
  'galleryCoffee', 'galleryRoadTrip', 'gallerySunsetWalk', 'galleryCityLights',
  'galleryCooking', 'galleryFamilyDinner', 'galleryBeach', 'galleryHiking',
  'galleryCelebration', 'galleryAnniversary', 'galleryFirstDance', 'storyWedding',
]
const FEMALE_POOL = ['partyMaidOfHonor', 'partyBridesmaid2', 'partyBridesmaid3']
const MALE_POOL = ['partyBestMan', 'partyGroomsman2', 'partyGroomsman3']
const PORTRAIT_POOL = ['coupleClassic', 'coupleCasual', 'coupleSunset']
const WISHLIST_POOL = ['wishlistCookware', 'wishlistHoneymoon']

const FEMALE_ROLE = /bride|maid|wanita|perempuan|ibu/i
const MALE_ROLE = /groom|best\s*man|pria|laki|bapak/i

// Field names treated as a single image URL.
const SINGLE_IMAGE_FIELDS = new Set(['image', 'photo', 'avatar', 'src', 'portrait', 'portrait2', 'gateImage'])
// Field names treated as an array of image URL strings.
const IMAGE_ARRAY_FIELDS = new Set(['blastPhotos', 'gatePhotos', 'photos', 'images'])

/**
 * One counter per pool per section, so consecutive empty slots cycle
 * through different photos instead of repeating the first one.
 */
function makePicker() {
  const counters = new Map()
  return (pool, width) => {
    const n = counters.get(pool) ?? 0
    counters.set(pool, n + 1)
    return demoImg(pool[n % pool.length], width)
  }
}

function poolFor(fieldName, holder, sectionType) {
  if (fieldName === 'gateImage') return { pool: ['coupleGate'], width: 2000 }
  if (fieldName === 'portrait') return { pool: ['coupleClassic'], width: 1000 }
  if (fieldName === 'portrait2') return { pool: ['coupleCasual'], width: 1000 }
  if (fieldName === 'avatar' || fieldName === 'photo') {
    const role = String(holder?.role ?? '')
    if (FEMALE_ROLE.test(role)) return { pool: [...FEMALE_POOL], width: 800 }
    if (MALE_ROLE.test(role)) return { pool: [...MALE_POOL], width: 800 }
    return { pool: [...PORTRAIT_POOL], width: 800 }
  }
  if (fieldName === 'image') {
    // wishlist items have name+url siblings; story items have title/desc
    if (holder && 'url' in holder) return { pool: [...WISHLIST_POOL], width: 600 }
    if (sectionType === 'ourStory' || sectionType === 'storyPlanet') return { pool: [...STORY_POOL], width: 1400 }
    return { pool: [...GALLERY_POOL], width: 900 }
  }
  // 'src' and image-array entries
  if (sectionType === 'ourStory' || sectionType === 'storyPlanet') return { pool: [...STORY_POOL], width: 900 }
  return { pool: [...GALLERY_POOL], width: 900 }
}

function walk(node, sectionType, pick, holder) {
  if (Array.isArray(node)) return node.map((item) => walk(item, sectionType, pick, holder))
  if (node === null || typeof node !== 'object') return node

  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (SINGLE_IMAGE_FIELDS.has(key) && blank(value)) {
      const { pool, width } = poolFor(key, node, sectionType)
      out[key] = pick(pool, width)
    } else if (IMAGE_ARRAY_FIELDS.has(key) && Array.isArray(value)) {
      out[key] = value.map((entry) => {
        if (typeof entry === 'string') {
          if (!blank(entry)) return entry
          const { pool, width } = poolFor(key, node, sectionType)
          return pick(pool, width)
        }
        return walk(entry, sectionType, pick, node)
      })
    } else if (value && typeof value === 'object') {
      out[key] = walk(value, sectionType, pick, node)
    } else {
      out[key] = value
    }
  }
  return out
}

export function fillEmptyImages(config) {
  if (!config || !Array.isArray(config.sections)) return config
  const sections = config.sections.map((s) => {
    if (!s || !s.props) return s
    const pick = makePicker() // fresh cycle per section
    return { ...s, props: walk(s.props, s.type, pick, null) }
  })
  return { ...config, sections }
}

export default fillEmptyImages
```

Note on the walker: `photos` arrays hold either plain URL strings (hero `blastPhotos`, solary `gatePhotos`, storyPlanet `timeline[].photos`) or `{src, ...}` objects (galleries, footer, saturnRing) — both branches are handled. `audio.src` lives at config level, not inside `sections[*].props`, so it is never touched.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/config/__tests__/fillEmptyImages.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/config/fillEmptyImages.js src/lib/config/__tests__/fillEmptyImages.test.ts
git commit -m "feat(demo-images): fillEmptyImages render-time fallback walker"
```

---

### Task 5: Wire fallback into the public render path

**Files:**
- Modify: `src/app/[template]/[slug]/page.tsx` (around line 143)

- [ ] **Step 1: Import and apply**

Add to imports:

```ts
import { fillEmptyImages } from '@/lib/config/fillEmptyImages'
```

Find (line ~143):

```ts
  if (templateId === 'lovebirds') config = migrateLovebirdsConfig(config)
```

Replace with:

```ts
  if (templateId === 'lovebirds') config = migrateLovebirdsConfig(config)
  // Render-time only: blank image slots fall back to contextual demo photos.
  // Never persisted — the editor still sees the owner's real (empty) value.
  config = fillEmptyImages(config)
```

Important: do NOT add this to `EditorRoot.tsx` or `migrateLovebirdsConfig` itself — the editor must keep seeing empty values (that's what triggers the Task 9 hint), and saved configs must not absorb placeholder URLs. The editor's `PreviewPane` is an iframe onto this public route, so the preview still shows the fallback.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean. (If TS complains about importing the `.js` module, add `// @ts-expect-error` is NOT the fix — create `src/lib/config/fillEmptyImages.d.ts` with `export function fillEmptyImages<T>(config: T): T` instead.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/[template]/[slug]/page.tsx"
git commit -m "feat(demo-images): never render empty image slots on public invitations"
```

(Note: bracketed paths need `GIT_LITERAL_PATHSPECS=1` in some shells; in PowerShell quote the path as above — if `git add` reports no match, use `$env:GIT_LITERAL_PATHSPECS='1'; git add 'src/app/[template]/[slug]/page.tsx'`.)

---

### Task 6: Lovebirds `defaultConfig.js` from registry

**Files:**
- Modify: `src/all-templates/lovebirds/defaultConfig.js`

- [ ] **Step 1: Replace every image URL**

Add at top:

```js
import { demoImg } from '../../lib/demoImages.js'
```

Then replace, keeping every other prop byte-identical:

| Slot | Old | New |
|---|---|---|
| hero `gateImage` | photo-1519741497674 | `demoImg('coupleGate', 2000)` |
| hero `blastPhotos` (8) | mixed repeats | `['bridePortrait','storyWedding','storyFirstMeet','coupleClassic','galleryRoadTrip','galleryFirstDance','galleryCoffee','galleryFamilyDinner'].map((k) => demoImg(k, 500))` |
| ourStory card-1 "The First Meeting" (sea) | 1519741497674 | `demoImg('storyFirstMeet', 1400)` |
| ourStory card-2 "Our First Date" (bonfire) | 1502139214982 | `demoImg('storyFirstDate', 1400)` |
| ourStory card-3 "Our Holiday Together" (hats) | 1530103862676 | `demoImg('storyHoliday', 1400)` |
| ourStory card-4 "The Proposal" | 1523580494863 (graduation!) | `demoImg('storyProposal', 1400)` |
| ourStory card-5 "The Wedding Day" | 1606800052052 | `demoImg('storyWedding', 1400)` |
| brideGroom Bride photo | 1525186402429 | `demoImg('bridePortrait', 800)` |
| brideGroom Groom photo | 1507003211169 | `demoImg('groomPortrait', 800)` |
| footer photos Amara/Rizky | same two | `demoImg('bridePortrait', 600)` / `demoImg('groomPortrait', 600)` |

galleryMasonry — 16 photos, each matched to its existing `alt`:

```js
photos: [
  { src: demoImg('storyProposal', 600),      alt: 'The proposal' },
  { src: demoImg('coupleCasual', 600),       alt: 'Just us' },
  { src: demoImg('galleryBirthday', 600),    alt: 'Birthday surprise' },
  { src: demoImg('coupleClassic', 600),      alt: 'Our wedding' },
  { src: demoImg('galleryCoffee', 600),      alt: 'Lazy Sunday' },
  { src: demoImg('galleryRoadTrip', 600),    alt: 'Road trip' },
  { src: demoImg('storyHoliday', 600),       alt: 'Holiday together' },
  { src: demoImg('storyFirstDate', 600),     alt: 'First date' },
  { src: demoImg('galleryCoffee', 600),      alt: 'Coffee mornings' },
  { src: demoImg('galleryCityLights', 600),  alt: 'City lights' },
  { src: demoImg('gallerySunsetWalk', 600),  alt: 'Sunset walk' },
  { src: demoImg('galleryRings', 600),       alt: 'The rings' },
  { src: demoImg('galleryBeach', 600),       alt: 'First holiday' },
  { src: demoImg('galleryCooking', 600),     alt: 'Cooking together' },
  { src: demoImg('galleryFamilyDinner', 600),alt: 'Family dinner' },
  { src: demoImg('galleryFirstDance', 600),  alt: 'First dance' },
],
```

(Two changes to alts are intentional: "The proposal 2" → "The rings" so the photo can match; "Coffee mornings" duplicate of "Lazy Sunday" photo is fine — different alts may share a vibe, but never show a photo contradicting its alt. If `galleryCoffee` twice bothers the eye in Task 11's visual pass, swap "Lazy Sunday" to `coupleSunset`.)

- [ ] **Step 2: Verify nothing else changed**

Run: `git diff --stat src/all-templates/lovebirds/defaultConfig.js` and read the diff — only image lines + the import + the two alt strings may change.
Run: `npx tsc --noEmit` and `npx vitest run` — expected clean/green (seed-config & migrate tests still pass).

- [ ] **Step 3: Commit**

```bash
git add src/all-templates/lovebirds/defaultConfig.js
git commit -m "feat(lovebirds): caption-matched contextual demo photos in defaultConfig"
```

---

### Task 7: Solary `pageConfig.js` — kill every picsum

**Files:**
- Modify: `src/all-templates/solary/config/pageConfig.js`

- [ ] **Step 1: Replace all picsum URLs**

Add at top:

```js
import { demoImg } from "../../../lib/demoImages.js";
```

Replacements (keep captions/desc as-is):

- openingGate `gatePhotos`: `[demoImg('coupleClassic', 400), demoImg('coupleCasual', 400), demoImg('coupleSunset', 400)]`
- welcomePlanet `portrait`: `demoImg('coupleClassic', 1000)`; `portrait2`: `demoImg('coupleCasual', 1000)` (update the `// [CONTOH]` comments to say "demo via Unsplash registry")
- storyPlanet timeline:
  - 2019 "First Orbit" (met at a friend's birthday): `[demoImg('galleryBirthday', 600), demoImg('storyFirstMeet', 600)]`
  - 2021 "Gravity": keep `photos: []` (render-time fill covers it; demonstrates the fallback on the live demo)
  - 2023 "Aligned" (coffee mornings): `[demoImg('galleryCoffee', 600), demoImg('galleryCityLights', 600), demoImg('galleryCooking', 600)]`
  - 2025 "The Proposal": `[demoImg('storyProposal', 600)]`
  - 2027 "The Wedding": `[demoImg('storyWedding', 600), demoImg('coupleClassic', 600)]`
- saturnRing `photos` — 18 entries, each matched to caption:

```js
photos: [
  { src: demoImg('galleryCoffee', 1200),       caption: "First Coffee" },
  { src: demoImg('gallerySunsetWalk', 1200),   caption: "Bandung Sunset" },
  { src: demoImg('galleryRoadTrip', 1200),     caption: "Beach Drive" },
  { src: demoImg('galleryHiking', 1200),       caption: "Hiking Day" },
  { src: demoImg('galleryMovieNight', 1200),   caption: "Movie Night" },
  { src: demoImg('galleryBirthday', 1200),     caption: "Birthday Dinner" },
  { src: demoImg('galleryAnniversary', 1200),  caption: "Anniversary" },
  { src: demoImg('gallerySunrise', 1200),      caption: "Sunrise Hike" },
  { src: demoImg('storyProposal', 1200),       caption: "The Question" },
  { src: demoImg('coupleSunset', 1200),        caption: "She Said Yes" },
  { src: demoImg('galleryCelebration', 1200),  caption: "Celebration" },
  { src: demoImg('galleryVenue', 1200),        caption: "Venue Visit" },
  { src: demoImg('galleryDressFitting', 1200), caption: "Dress Fitting" },
  { src: demoImg('galleryCakeTasting', 1200),  caption: "Cake Tasting" },
  { src: demoImg('galleryPreWedShoot', 1200),  caption: "Pre-wed Shoot" },
  { src: demoImg('galleryBrunch', 1200),       caption: "Family Brunch" },
  { src: demoImg('gallerySaveTheDate', 1200),  caption: "Save the Date" },
  { src: demoImg('galleryRings', 1200),        caption: "Last Steps" },
],
```

- teamPlanet avatars: Maya → `demoImg('partyMaidOfHonor', 400)`, Sasha → `partyBridesmaid2`, Putri → `partyBridesmaid3`, Rio → `partyBestMan`, Aldi → `partyGroomsman2`, Bima → `partyGroomsman3` (all width 400).
- Update the stale comment on line ~189 ("Demo via picsum.photos…") to "Demo via the curated Unsplash registry (src/lib/demoImages.js)."

- [ ] **Step 2: Verify**

Run: `Select-String -Path src/all-templates/solary/config/pageConfig.js -Pattern picsum` → no matches.
Run: `npx tsc --noEmit; npx vitest run` → clean/green.

- [ ] **Step 3: Commit**

```bash
git add src/all-templates/solary/config/pageConfig.js
git commit -m "feat(solary): replace every random picsum photo with caption-matched demo photos"
```

---

### Task 8: Editor schemas from registry

**Files (modify all):**
- `src/editor/schemas/hero.ts`
- `src/editor/schemas/ourStory.ts`
- `src/editor/schemas/brideGroom.ts`
- `src/editor/schemas/gallery.ts`
- `src/editor/schemas/galleryHelix.ts`
- `src/editor/schemas/gallerySpringCoil.ts`
- `src/editor/schemas/galleryMasonry.ts`
- `src/editor/schemas/weddingParty.ts`
- `src/editor/schemas/weddingGift.ts` (only if its defaults contain image URLs — check; `newItem` stays `''`)
- `src/editor/schemas/solary/welcomePlanet.ts`
- `src/editor/schemas/solary/giftPlanet.ts`
- `src/editor/schemas/solary/teamPlanet.ts`
- `src/editor/schemas/solary/saturnRing.ts` (only if defaults contain URLs)

These `defaults` are what a section gets when **added fresh in the editor** — they must match the same contextual photos as Task 6/7.

- [ ] **Step 1: Replace URLs in each schema's `defaults`**

In every file add `import { demoImg } from '@/lib/demoImages'` and swap hardcoded URLs for the registry call with the same key/width choices as Tasks 6–7. Specifically:

- `hero.ts`: `gateImage: demoImg('coupleGate', 2000)`; `blastPhotos`: first 4 of the Task 6 hero list at width 500.
- `ourStory.ts`: 3 default cards → `storyFirstMeet` / `storyHoliday` / `storyWedding` at 1400 (match each card's title; if a card says "Proposal" use `storyProposal`).
- `brideGroom.ts`: `bridePortrait` / `groomPortrait` at 800.
- `gallery.ts` / `galleryHelix.ts` / `gallerySpringCoil.ts`: match captions — 'The proposal' → `storyProposal`, 'A road trip' → `galleryRoadTrip`, 'First holiday' → `galleryBeach`, 'Lazy Sunday' → `galleryCoffee` (width 900).
- `galleryMasonry.ts`: 8 defaults → same alt-matched keys as Task 6 (width 600).
- `weddingParty.ts`: Maya → `demoImg('partyMaidOfHonor', 800)`, Dimas → `demoImg('partyBestMan', 800)` (was `''`).
- `solary/welcomePlanet.ts`: `portrait: demoImg('coupleClassic', 1000)`.
- `solary/giftPlanet.ts` wishlist: `wishlistCookware` / `wishlistHoneymoon` at 600.
- `solary/teamPlanet.ts`: Maya → `demoImg('partyMaidOfHonor', 400)`, Rio → `demoImg('partyBestMan', 400)` (was `''`).
- Leave every `newItem: { …image: '' }` untouched.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit; npx vitest run` → clean/green.
Run: `Select-String -Path src/editor/schemas -Pattern "picsum|images\.unsplash" -Recurse` → only matches via… actually expected: **zero** raw URL matches; everything goes through `demoImg`.

- [ ] **Step 3: Commit**

```bash
git add src/editor/schemas
git commit -m "feat(editor): schema defaults use the contextual demo-image registry"
```

---

### Task 9: Landing page + OurStoryStack hardcoded fallback + ImageField hint

**Files:**
- Modify: `src/components/marketing/Features.tsx:79,86`
- Modify: `src/all-templates/lovebirds/sections/OurStoryStack/OurStory.jsx:13-17`
- Modify: `src/editor/fields/ImageField.tsx`
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (both `id` and `en` — dict-parity test enforces key parity)

- [ ] **Step 1: Features.tsx polaroids**

Add `import { demoImg } from '@/lib/demoImages'` and replace the two `<img src="https://images.unsplash.com/...">` with:

```tsx
<img src={demoImg('coupleClassic', 300)} alt="" />   {/* "Sweetest Vows" polaroid */}
<img src={demoImg('coupleSunset', 300)} alt="" />    {/* "Infinite Love" polaroid */}
```

- [ ] **Step 2: OurStoryStack demo fallback cards**

In `OurStory.jsx`, add `import { demoImg } from '../../../../lib/demoImages.js'` and fill the 5 `image: ''` entries (lines 13–17): First Meeting → `demoImg('storyFirstMeet', 1400)`, First Date → `storyFirstDate`, A Trip Together → `storyHoliday`, The Proposal → `storyProposal`, The Wedding Day → `storyWedding` (all 1400). **This file is otherwise byte-frozen vs the Vite original — touch only those 5 strings + the import.**

- [ ] **Step 3: Dictionary keys**

In `dashboard.ts`, inside the `editor` block of BOTH languages add:

```ts
// id
imageEmptyHint: 'Kosong — contoh foto akan tampil di undangan. Ganti dengan fotomu sendiri.',
// en
imageEmptyHint: 'Empty — a sample photo will appear on the invitation. Replace it with your own.',
```

- [ ] **Step 4: ImageField hint**

In `ImageField.tsx`:

```tsx
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
// inside the component:
const t = useDashboardDict().editor
// after the error/help spans, when empty:
{!value && <span style={hintStyle}>{t.imageEmptyHint}</span>}
// styles:
const hintStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)', fontStyle: 'italic' }
```

(ImageField is only ever rendered inside the dashboard editor — `FieldEditor.tsx` and `ObjectArrayField.tsx` — both under `DashboardI18nProvider`, so the hook is safe.)

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit; npx vitest run` → clean/green (dict-parity passes).

```bash
git add src/components/marketing/Features.tsx src/all-templates/lovebirds/sections/OurStoryStack/OurStory.jsx src/editor/fields/ImageField.tsx src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(demo-images): landing polaroids, story fallback photos, editor empty-image hint"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Full test + type pass**

Run: `npx tsc --noEmit` then `npx vitest run`
Expected: 0 type errors; all suites green (including dict-parity, normalizeConfig, migrate-lovebirds, seed-config-related, and the two new suites).

- [ ] **Step 2: URL health**

Run: `node scripts/check-demo-images.mjs` → all ✓.

- [ ] **Step 3: Visual pass in the browser (single dev server!)**

With `npm run dev` running, screenshot and READ each of:
1. `http://localhost:3000` — landing: EmotionalHook + Features polaroids look right.
2. `http://localhost:3000/lovebirds/rizky-amara` (or `/lovebirds/demo-anything`) — hero gate, blast photos, story cards match titles, bride/groom portraits gendered correctly, all 16 gallery photos match alts, footer polaroids.
3. `http://localhost:3000/solary/demo-check` — gate photos, Neptune portrait, Uranus timeline (the empty 2021 "Gravity" item must show fallback photos, proving fillEmptyImages), Saturn ring captions vs photos, Venus team avatars gendered correctly, Mercury wishlist images.
4. Dashboard editor (dummy lovebirds login from memory: `/lovebirds/dummy-lovebirds/dashboard`) — clear an image → hint text appears under the field; preview iframe still shows a contextual photo there.

Fix any visual mismatch by swapping registry keys/IDs (re-run Task 3 loop), then re-screenshot.

- [ ] **Step 4: Final commit (if visual pass changed anything)**

```bash
git add src/lib/demoImages.js
git commit -m "fix(demo-images): post-visual-pass photo swaps"
```

---

## Self-review notes

- Spec §1 registry → Task 1; §2 replacements → Tasks 6/7/8/9; §3 fallback + hint → Tasks 4/5/9; §4 verification → Tasks 2/3/10. Out-of-scope items (TemplateShowcase, tutorial PNGs, local download) untouched.
- `wishlistHoneymoon` intentionally shares an ID with `galleryBeach`; the `demoImages.test.ts` does not assert global uniqueness for this reason.
- `fillEmptyImages` runs on every public render including fully-populated configs — pure object walk, no network, negligible cost.
- Purchased users: `buildSeedConfig` deep-clones `defaultConfig` (lovebirds), so Task 6 fixes buyer starter configs automatically; solary buyers come from `pageConfig` likewise via Task 7.
