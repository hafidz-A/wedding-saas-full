# Implementation Plan: Multi-Template Restructure

> Dokumen ini adalah instruksi lengkap untuk Claude session berikutnya.
> Baca CLAUDE.md dan TEMPLATES.md untuk context arsitektur.
> JANGAN mulai sebelum memastikan working directory sudah benar (sudah di folder multi-template).

---

## Pre-condition

Sebelum mulai, pastikan:
- Project sudah dipindah ke `c:\Users\arifi\Downloads\multi-template\wedding-saas-next\`
- `wedding-saas-solar` sudah ada di `c:\Users\arifi\Downloads\multi-template\wedding-saas-solar\`
- `npm install` sudah jalan
- Git clean (commit atau stash perubahan TEMPLATES.md terlebih dahulu)

---

## Step 1 — Buat folder `src/templates/lovebirds/`

```
src/templates/lovebirds/
├── sections/     ← MOVE semua dari src/sections/ ke sini
├── registry.js   ← baru (adapt dari src/config/sectionRegistry.js)
└── defaultConfig.js ← baru (adapt dari src/config/pageConfig.js)
```

### 1a. Move sections

COPY (bukan move) semua folder dan file dari `src/sections/` ke `src/templates/lovebirds/sections/`. Folder `src/sections/` tetap ada sebagai referensi.

Daftar yang harus dicopy:
```
Accommodations/
BlocksSection/
BrideGroom/
Countdown/
EventDetails/
Faq/
Footer/
GalleryMasonry/
GallerySpringCoil/
Guestbook/
Hero/
MusicPopup/
OurStory/
OurStoryStack/
Playlist/
Registry/
Rsvp/
Schedule/
WeddingGift/
WeddingParty/
```

Folder `src/sections/` tetap ada — jangan hapus, user masih mau otak-atik.

### 1b. Buat `src/templates/lovebirds/registry.js`

Adapt dari `src/config/sectionRegistry.js`. Ubah semua import path dari `'../sections/...'` ke `'./sections/...'`:

```js
import { lazy } from 'react'

export const sectionRegistry = {
  hero:              lazy(() => import('./sections/Hero/Hero.jsx')),
  countdown:         lazy(() => import('./sections/Countdown/Countdown.jsx')),
  ourStory:          lazy(() => import('./sections/OurStoryStack/OurStory.jsx')),
  eventDetails:      lazy(() => import('./sections/EventDetails/EventDetails.jsx')),
  brideGroom:        lazy(() => import('./sections/BrideGroom/BrideGroom.jsx')),
  weddingParty:      lazy(() => import('./sections/WeddingParty/WeddingParty.jsx')),
  galleryMasonry:    lazy(() => import('./sections/GalleryMasonry/index.js')),
  gallerySpringCoil: lazy(() => import('./sections/GallerySpringCoil/index.js')),
  schedule:          lazy(() => import('./sections/Schedule/Schedule.jsx')),
  rsvp:              lazy(() => import('./sections/Rsvp/Rsvp.jsx')),
  weddingGift:       lazy(() => import('./sections/WeddingGift/WeddingGift.jsx')),
  registry:          lazy(() => import('./sections/Registry/Registry.jsx')),
  accommodations:    lazy(() => import('./sections/Accommodations/Accommodations.jsx')),
  faq:               lazy(() => import('./sections/Faq/Faq.jsx')),
  guestbook:         lazy(() => import('./sections/Guestbook/Guestbook.jsx')),
  playlist:          lazy(() => import('./sections/Playlist/Playlist.jsx')),
  footer:            lazy(() => import('./sections/Footer/Footer.jsx')),
  blocks:            lazy(() => import('./sections/BlocksSection/BlocksSection.jsx')),
}
```

### 1c. Buat `src/templates/lovebirds/defaultConfig.js`

Adapt dari `src/config/pageConfig.js`:
- Rename export dari `pageConfig` ke `defaultConfig`
- Isi tetap sama (sections array + meta)
- File `src/config/pageConfig.js` JANGAN dihapus dulu — masih dipakai sebagai fallback. Akan di-update di Step 6.

---

## Step 2 — Buat folder `src/templates/solary/`

```
src/templates/solary/
├── sections/       ← COPY dari ../wedding-saas-solar/src/sections/
├── registry.js     ← baru
└── defaultConfig.js ← baru
```

### 2a. Copy solar sections

COPY (bukan move — solar project tetap utuh sebagai referensi) dari:
`../wedding-saas-solar/src/sections/` → `src/templates/solary/sections/`

File yang harus dicopy:
```
CountdownPlanet.jsx
CountdownSection.jsx
DetailsPlanet.jsx
FooterPlanet.jsx
FooterSection.jsx
GallerySection.jsx
GiftPlanet.jsx
GiftSection.jsx
HeroSection.jsx
IntroSection.jsx
OpeningGatePlaceholder.jsx
RSVPPlanet.jsx
RSVPSection.jsx
SaturnRingPlanet.jsx
StoryPlanet.jsx
StorySection.jsx
TeamPlanet.jsx
TeamSection.jsx
WelcomePlanet.jsx
story/                    ← subfolder, copy seluruhnya
  ConnectorPipe.jsx
  MemoryViewport.jsx
  PolaroidCluster.jsx
  StoryDesktopExperience.jsx
  StoryMobileExperience.jsx
  TimelineRail.jsx
```

### 2b. Tambahkan `'use client'` ke semua section solar

Solar adalah Vite project — belum punya `'use client'` directive. Setiap `.jsx` file di `src/templates/solary/sections/` harus ditambah `'use client'` di baris pertama.

### 2c. Fix import paths di section solar

Section solar mungkin import dari path relatif ke struktur Vite (`../../components/`, `../../config/`, dll). Periksa setiap file dan:
- Import yang merujuk ke shared components → ubah ke `@/components/...`
- Import yang merujuk ke solar-specific components → buat di `src/templates/solary/components/` jika perlu
- Import yang merujuk ke config → ubah sesuai kebutuhan

**PENTING:** Solar mungkin pakai library yang belum di-install di project Next.js:
- `three` (Three.js) — cek `wedding-saas-solar/package.json` untuk dependencies tambahan
- `lenis` — sudah ada di solar, cek apakah perlu di Next.js juga
- Install dependencies yang kurang via `npm install <package>`

### 2d. Buat `src/templates/solary/registry.js`

```js
import { lazy } from 'react'

export const sectionRegistry = {
  hero:         lazy(() => import('./sections/HeroSection.jsx')),
  intro:        lazy(() => import('./sections/IntroSection.jsx')),
  welcome:      lazy(() => import('./sections/WelcomePlanet.jsx')),
  countdown:    lazy(() => import('./sections/CountdownSection.jsx')),
  story:        lazy(() => import('./sections/StorySection.jsx')),
  details:      lazy(() => import('./sections/DetailsPlanet.jsx')),
  team:         lazy(() => import('./sections/TeamSection.jsx')),
  gallery:      lazy(() => import('./sections/GallerySection.jsx')),
  rsvp:         lazy(() => import('./sections/RSVPSection.jsx')),
  gift:         lazy(() => import('./sections/GiftSection.jsx')),
  footer:       lazy(() => import('./sections/FooterSection.jsx')),
  // Planet variants (jika dipakai sebagai section type terpisah)
  countdownPlanet:  lazy(() => import('./sections/CountdownPlanet.jsx')),
  storyPlanet:      lazy(() => import('./sections/StoryPlanet.jsx')),
  rsvpPlanet:       lazy(() => import('./sections/RSVPPlanet.jsx')),
  giftPlanet:       lazy(() => import('./sections/GiftPlanet.jsx')),
  footerPlanet:     lazy(() => import('./sections/FooterPlanet.jsx')),
  teamPlanet:       lazy(() => import('./sections/TeamPlanet.jsx')),
  saturnRing:       lazy(() => import('./sections/SaturnRingPlanet.jsx')),
  openingGate:      lazy(() => import('./sections/OpeningGatePlaceholder.jsx')),
}
```

> NOTE: Periksa `wedding-saas-solar/src/config/` untuk tahu mapping type yang benar.
> Registry di atas adalah estimasi — adjust berdasarkan actual pageConfig solar.

### 2e. Buat `src/templates/solary/defaultConfig.js`

Adapt dari `wedding-saas-solar/src/config/pageConfig.js` (jika ada).
Jika tidak ada, buat dari section list di registry.

---

## Step 3 — Buat `src/config/templateIndex.js`

```js
import { sectionRegistry as lovebirdsRegistry } from '@/templates/lovebirds/registry'
import { defaultConfig as lovebirdsConfig } from '@/templates/lovebirds/defaultConfig'
import { sectionRegistry as solaryRegistry } from '@/templates/solary/registry'
import { defaultConfig as solaryConfig } from '@/templates/solary/defaultConfig'

export const templates = {
  'lovebirds': {
    registry: lovebirdsRegistry,
    config: lovebirdsConfig,
    label: 'Lovebirds',
  },
  'solary': {
    registry: solaryRegistry,
    config: solaryConfig,
    label: 'Solary',
  },
}

export function getTemplate(templateId) {
  return templates[templateId] || templates['lovebirds']
}

export function getRegistry(templateId) {
  return (templates[templateId] || templates['lovebirds']).registry
}

export function getDefaultConfig(templateId) {
  return (templates[templateId] || templates['lovebirds']).config
}
```

---

## Step 4 — Update `src/renderers/SectionRenderer.jsx`

Ubah dari hardcoded registry ke dynamic lookup:

```jsx
'use client'

import { Suspense, useMemo } from 'react'
import { getRegistry } from '../config/templateIndex.js'
import { resolveTheme, resolveBackground } from '../config/themes.js'
import SectionSkeleton from '../components/SectionSkeleton.jsx'

export default function SectionRenderer({ config, slug, templateId = 'lovebirds' }) {
  const registry = getRegistry(templateId)

  const sections = useMemo(() => {
    return (config?.sections || []).filter((s) => s && s.enabled !== false)
  }, [config])

  return (
    <main style={{ position: 'relative', zIndex: 1 }}>
      {sections.map((section) => {
        const Component = registry[section.type]
        if (!Component) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[SectionRenderer] Unknown section type "${section.type}" for template "${templateId}"`)
          }
          return null
        }

        const themeVars = resolveTheme(section.theme)
        const backgroundCss = resolveBackground(section.background)
        const wrapStyle = {
          ...themeVars,
          ...(backgroundCss ? { background: backgroundCss } : null),
        }

        return (
          <div
            key={section.id}
            id={section.id}
            data-section={section.id}
            data-section-type={section.type}
            data-section-theme={section.theme}
            style={wrapStyle}
          >
            <Suspense fallback={<SectionSkeleton label={section.id} />}>
              <Component
                {...(section.props || {})}
                id={section.id}
                slug={slug}
                blocks={section.blocks}
                decorativeLayers={section.decorativeLayers}
                layout={section.layout}
              />
            </Suspense>
          </div>
        )
      })}
    </main>
  )
}
```

Hapus import lama:
- ~~`import { pageConfig } from '../config/pageConfig.js'`~~
- ~~`import { sectionRegistry } from '../config/sectionRegistry.js'`~~

---

## Step 5 — Ubah routing: `[slug]` → `[template]/[slug]`

### 5a. Copy folder

```
src/app/[slug]/  →  src/app/[template]/[slug]/
```

COPY (bukan move) semua file ke struktur baru. Folder `src/app/[slug]/` tetap ada.

### 5b. Update `src/app/[template]/[slug]/page.tsx`

Params berubah:

```tsx
interface PageProps {
  params: { template: string; slug: string }
}

export default async function Page({ params }: PageProps) {
  const { template, slug } = params
  // ... fetch invitation, pastikan template_id match
  // Pass templateId ke InvitationView
  return <InvitationView config={config} slug={slug} templateId={template} />
}
```

Tambah validasi template:
```tsx
const VALID_TEMPLATES = ['lovebirds', 'solary']
if (!VALID_TEMPLATES.includes(template)) {
  notFound()
}
```

### 5c. Update `src/app/[template]/[slug]/InvitationView.tsx`

Terima `templateId` prop, pass ke SectionRenderer:

```tsx
export default function InvitationView({ config, slug, templateId }: {
  config: any; slug: string; templateId: string
}) {
  // ...
  return (
    <ThemeProvider theme={undefined}>
      <SmoothScroll />
      <GlobalBackground gifUrl={bgGif} />
      <BotanicalBorder />
      <SectionRenderer config={config} slug={slug} templateId={templateId} />
      <FloatingNavbar sections={sections} />
      {/* MusicPopup: import dari template-specific path */}
      {musicActive && (
        <Suspense fallback={null}>
          <MusicPopup ... />
        </Suspense>
      )}
    </ThemeProvider>
  )
}
```

**MusicPopup import issue:** Saat ini import `@/sections/MusicPopup/index.js`. Setelah move:
- Jika MusicPopup shared across templates → pindah ke `@/components/MusicPopup/`
- Jika template-specific → import dari `@/templates/lovebirds/sections/MusicPopup/index.js`
- Recommendation: pindah ke `@/components/` karena music overlay bukan template-specific

### 5d. Update dashboard files

Semua file di `src/app/[template]/[slug]/dashboard/` yang pakai `params.slug` harus diupdate untuk juga membaca `params.template`:
- `page.tsx` — auth check + login action
- `DashboardClient.tsx` — mungkin perlu templateId untuk editor
- `guests/actions.ts` — server actions

Cek setiap file apakah ada reference ke `params` atau route construction.

### 5e. Proteksi static routes

Static routes otomatis prioritas di Next.js App Router, jadi `/signup`, `/login`, `/onboarding` dll sudah aman. Tapi tambahkan validasi di `[template]/[slug]/page.tsx` untuk reject template names yang bukan template ID valid (sudah di Step 5b).

### 5f. Update semua internal link/redirect yang reference `/<slug>`

Cari semua file yang construct URL dengan pattern `/${slug}` atau `/${invitation.slug}`:

```
grep -r "/${slug}" src/
grep -r "/\${slug}" src/
grep -r "redirect(" src/
grep -r "router.push" src/
```

Ubah ke `/${template}/${slug}` atau `/${templateId}/${slug}`.

Files yang kemungkinan perlu diupdate:
- `src/app/onboarding/actions.ts` — redirect setelah onboarding
- `src/app/login/LoginForm.tsx` — redirect setelah login
- `src/app/[template]/[slug]/dashboard/page.tsx` — cookie path
- API routes yang return slug-based URLs

### 5g. Cookie path update

Session cookie saat ini scoped ke `path: /<slug>`. Ubah ke `path: /<template>/<slug>`:

Cari di codebase:
```
grep -r "path.*slug" src/
```

---

## Step 6 — Update remaining imports

### Files yang reference `@/sections/`

Setelah sections dipindah ke `@/templates/lovebirds/sections/`, semua import yang pakai `@/sections/` harus diupdate.

Cari:
```
grep -r "@/sections/" src/
grep -r "../sections/" src/
```

Yang paling penting:
- `src/app/[template]/[slug]/InvitationView.tsx` — MusicPopup import (lihat Step 5c)
- `src/config/sectionRegistry.js` — file ini bisa DIHAPUS setelah registry pindah ke template folders

### Files yang reference `@/config/sectionRegistry`

```
grep -r "sectionRegistry" src/
```

Semua harus pakai `templateIndex.js` sekarang.

### File `src/config/pageConfig.js`

Setelah `defaultConfig.js` dibuat di template folder:
- `pageConfig.js` masih dipakai sebagai fallback di `page.tsx`
- Update fallback: import `getDefaultConfig('lovebirds')` dari templateIndex sebagai gantinya
- Setelah itu `pageConfig.js` bisa dihapus (opsional — keep for backward compat jika mau)

---

## Step 7 — Template Showcase & Demo Previews

### 7a. Seed demo invitations per template

Setiap template harus punya 1 demo invitation di database yang bisa di-preview tanpa signup.

```powershell
# Lovebirds demo
node scripts/create-invitation.mjs demo-lovebirds demo1234 `
  --template=lovebirds `
  --bride="Rani Sastrawijaya" `
  --groom="Adi Pratama" `
  --date=2025-11-15T16:00 `
  --venue="The Grand Ballroom, Jakarta"

# Solary demo
node scripts/create-invitation.mjs demo-solary demo1234 `
  --template=solary `
  --bride="Sari Wulandari" `
  --groom="Budi Hartono" `
  --date=2025-12-20T10:00 `
  --venue="Planetarium Jakarta"
```

Slug convention: `demo-<template-id>` — hardcoded sebagai demo, selalu `is_published = true`.

### 7b. Buat halaman `/templates` — Template Gallery

Buat `src/app/templates/page.tsx`:

```tsx
// Server component — no auth needed
// Menampilkan semua template yang tersedia dengan:
// - Thumbnail/screenshot per template
// - Nama template + short description
// - "Preview" button → link ke /<template>/demo-<template>
// - "Pilih Template Ini" button → link ke /onboarding?template=<template>
```

Layout:
- Grid 2 kolom (desktop), 1 kolom (mobile)
- Card per template dengan thumbnail besar
- CTA jelas: "Lihat Preview" + "Gunakan Template Ini"

Links:
```
Lovebirds → Preview: /lovebirds/demo-lovebirds
            Pilih:   /onboarding?template=lovebirds

Solary    → Preview: /solary/demo-solary
            Pilih:   /onboarding?template=solary
```

### 7c. Tambahkan link ke `/templates` dari halaman utama

Update `src/app/page.tsx` (marketing landing):
- Tambah section "Pilih Template" atau CTA button yang arahkan ke `/templates`

### 7d. Template data source

Buat `src/config/templateCatalog.js` untuk data statis yang dipakai di halaman `/templates`:

```js
export const templateCatalog = [
  {
    id: 'lovebirds',
    label: 'Lovebirds',
    description: 'Cinematic wedding invitation dengan animasi botanical dan foto polaroid.',
    demoSlug: 'demo-lovebirds',
    thumbnail: '/images/templates/lovebirds-thumb.jpg',
    tags: ['cinematic', 'elegant', 'botanical'],
  },
  {
    id: 'solary',
    label: 'Solary',
    description: 'Futuristic solar system theme dengan planet 3D dan animasi orbit.',
    demoSlug: 'demo-solary',
    thumbnail: '/images/templates/solary-thumb.jpg',
    tags: ['futuristic', 'space', '3D'],
  },
]
```

Thumbnail images: screenshot manual dari masing-masing template, taruh di `public/images/templates/`.

### 7e. Fallback preview tanpa database

Untuk dev tanpa Supabase, `[template]/[slug]/page.tsx` harus support fallback:
- Jika slug = `demo-lovebirds` dan DB kosong → load `defaultConfig` dari `templateIndex`
- Jika slug = `demo-solary` dan DB kosong → load `defaultConfig` dari `templateIndex`

```tsx
// Di page.tsx
if (!data && slug.startsWith('demo-')) {
  config = getDefaultConfig(template)
} else if (!data) {
  notFound()
}
```

---

## Step 8 — Update onboarding

`src/app/onboarding/actions.ts` dan `src/app/onboarding/OnboardingForm.tsx`:
- Baca `?template=` dari URL search params (dari link di `/templates`)
- Tambah field `template` selection (dropdown: Lovebirds / Solary), pre-filled jika ada query param
- Pass `template_id` saat insert ke `invitations` table
- Redirect ke `/${template}/${slug}/dashboard` setelah selesai

---

## Step 9 — Update scripts

### `scripts/create-invitation.mjs`
- Tambah `--template` flag (default: `lovebirds`)
- Set `template_id` di insert query

### `scripts/seed-full-config.mjs`
- Tambah `--template` flag
- Load `defaultConfig` dari template yang sesuai

---

## Step 10 — Test

```powershell
npm run dev

# Template gallery
# http://localhost:3000/templates → 2 card (Lovebirds + Solary) tampil

# Lovebirds template
# http://localhost:3000/lovebirds/adi-rani → harus render identik
# http://localhost:3000/lovebirds/demo-lovebirds → demo preview jalan
# http://localhost:3000/lovebirds/adi-rani/dashboard → login harus jalan

# Solary template
# http://localhost:3000/solary/demo-solary → demo preview jalan (planet 3D, dll)

# Static routes harus tetap jalan
# http://localhost:3000/signup
# http://localhost:3000/login
# http://localhost:3000/onboarding?template=lovebirds → pre-filled template

npm run build  # harus clean, no errors
```

### Checklist visual — Lovebirds
- [ ] Hero section animasi jalan
- [ ] GSAP ScrollTrigger pinning jalan
- [ ] Countdown timer jalan
- [ ] Gallery masonry + spring coil jalan
- [ ] RSVP form submit jalan
- [ ] WeddingGift form submit jalan
- [ ] Guestbook notes tampil
- [ ] MusicPopup muncul
- [ ] BotanicalBorder tampil
- [ ] FloatingNavbar navigasi jalan
- [ ] Responsive: 320px, 768px, 1024px
- [ ] Dashboard login + semua tab jalan

### Checklist visual — Solary
- [ ] Semua section render tanpa error (cek console untuk missing 'use client')
- [ ] Three.js planet/orbit animasi jalan
- [ ] Tidak ada error import (dependency three/lenis ter-install)
- [ ] Responsive di mobile

### Checklist — Template Gallery
- [ ] `/templates` tampil 2 card dengan thumbnail
- [ ] Tombol "Preview" arahkan ke demo slug yang benar
- [ ] Tombol "Gunakan Template" arahkan ke `/onboarding?template=<id>`
- [ ] Link dari landing `/` ke `/templates` jalan

---

## Step 11 — Commit

```bash
git add .
git commit -m "refactor: restructure to multi-template architecture (lovebirds + solary)"
```

---

## Ringkasan perubahan file

| Action | Path |
|--------|------|
| COPY | `src/sections/*` → `src/templates/lovebirds/sections/*` |
| CREATE | `src/templates/lovebirds/registry.js` |
| CREATE | `src/templates/lovebirds/defaultConfig.js` |
| COPY | `../wedding-saas-solar/src/sections/*` → `src/templates/solary/sections/*` |
| CREATE | `src/templates/solary/registry.js` |
| CREATE | `src/templates/solary/defaultConfig.js` |
| CREATE | `src/config/templateIndex.js` |
| CREATE | `src/config/templateCatalog.js` (data gallery: id, label, demoSlug, thumbnail) |
| CREATE | `src/app/templates/page.tsx` (halaman gallery template) |
| CREATE | `public/images/templates/lovebirds-thumb.jpg` + `solary-thumb.jpg` (screenshot) |
| UPDATE | `src/renderers/SectionRenderer.jsx` |
| COPY | `src/app/[slug]/` → `src/app/[template]/[slug]/` |
| UPDATE | `src/app/[template]/[slug]/page.tsx` (+ fallback demo-* slug) |
| UPDATE | `src/app/[template]/[slug]/InvitationView.tsx` |
| UPDATE | `src/app/[template]/[slug]/dashboard/page.tsx` |
| UPDATE | `src/app/page.tsx` (link ke /templates) |
| UPDATE | `src/app/onboarding/actions.ts` |
| UPDATE | `src/app/onboarding/OnboardingForm.tsx` (baca ?template= query) |
| UPDATE | `scripts/create-invitation.mjs` |
| UPDATE | `scripts/seed-full-config.mjs` |
| SEED | demo-lovebirds + demo-solary invitations (via create-invitation.mjs) |
| KEEP | `src/sections/` (tetap ada sebagai referensi) |
| KEEP | `src/app/[slug]/` (tetap ada, user masih otak-atik) |
| KEEP | `src/config/sectionRegistry.js` (tetap ada sebagai referensi) |
| KEEP | `src/config/pageConfig.js` (tetap ada sebagai referensi) |

---

## CRITICAL constraints

- Visual output HARUS IDENTIK setelah restructure — ini refactor, bukan redesign
- Jangan hilangkan animasi, GSAP, motion, atau CSS apapun
- CSS Modules tetap dipakai — JANGAN introduce Tailwind atau UI library
- `'use client'` tetap di semua section/component files
- `SUPABASE_SERVICE_ROLE_KEY` tetap hanya di `src/lib/supabase/admin.ts` dan `src/app/api/`
- Solary sections perlu `'use client'` ditambahkan (belum ada dari Vite project)
- Solary mungkin butuh install dependency tambahan (three.js, lenis, dll)
