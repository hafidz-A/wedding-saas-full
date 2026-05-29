# Tutorial: Arsitektur Multi-Template (Panduan Reusable)

> Panduan lengkap cara kerja arsitektur multi-template di project ini, dan cara
> memakai pola yang sama untuk project SaaS lain ke depannya.
> Penjelasan dalam Bahasa Indonesia, kode/komentar dalam English.

---

## Daftar Isi
1. [Mental model](#1-mental-model)
2. [Prinsip inti](#2-prinsip-inti)
3. [Struktur folder template](#3-struktur-folder-template)
4. [3 file inti tiap template](#4-3-file-inti-tiap-template)
5. [Daftar pusat: templateIndex & templateCatalog](#5-daftar-pusat-templateindex--templatecatalog)
6. [Cara app memilih & merender template](#6-cara-app-memilih--merender-template)
7. [Routing](#7-routing)
8. [Model database](#8-model-database)
9. [Login / auth](#9-login--auth)
10. [RESEP: menambah template baru](#10-resep-menambah-template-baru)
11. [Template dengan library berat (3D/Canvas) — ssr:false](#11-template-dengan-library-berat-3dcanvas--ssrfalse)
12. [Jebakan CSS global (WAJIB baca)](#12-jebakan-css-global-wajib-baca)
13. [Scripts & seeding](#13-scripts--seeding)
14. [Checklist tambah template](#14-checklist-tambah-template)
15. [FAQ](#15-faq)
16. [i18n — Bilingual ID/EN](#16-i18n--bilingual-iden)

---

## 1. Mental model

Bayangkan **1 restoran, 1 dapur, beberapa tema ruangan**.

- **Dapur (shared backend):** database, auth/login, dashboard, RSVP, gift, upload, API. Dipakai SEMUA template.
- **Tema ruangan (per-template):** tampilan visual — section, CSS, animasi. BEDA tiap template.

Pelanggan duduk di ruangan mana pun, pesanan tetap ke dapur yang sama. Artinya: nambah template = nambah "tema ruangan", **tanpa** menyentuh dapur.

```
                       ┌─────────────────────────────┐
                       │        SHARED BACKEND        │
                       │  DB · Auth · Dashboard · API │
                       └──────────────┬──────────────┘
                                      │ (semua template pakai ini)
        ┌──────────────┬──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │lovebirds│   │ solary  │   │ garden  │   │   ...   │   │   ...   │
   │ (visual)│   │ (visual)│   │ (visual)│   │         │   │         │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

---

## 2. Prinsip inti

Tiga hal yang HARUS dipisah di kepala:

| Konsep | Apa | Disimpan di | Contoh |
|---|---|---|---|
| **ISI (content)** | Data couple: nama, tanggal, foto, urutan section | kolom `config` (JSONB) di DB | `{ sections: [{type:'hero', props:{...}}] }` |
| **TAMPILAN (template)** | Paket visual mana yang dipakai | kolom `template_id` di DB | `'lovebirds'` / `'solary'` |
| **JEMBATAN (registry)** | Peta tipe section → komponen React | file `registry.js` per template | `{ hero: HeroComponent }` |

Filosofi: **backend tidak peduli template apa pun.** Ia cuma menyimpan `template_id` + `config`. Saat render, app baca `template_id` lalu memilih "paket visual" yang sesuai.

---

## 3. Struktur folder template

Setiap template = 1 folder mandiri di `src/all-templates/<id>/`:

```
src/all-templates/<id>/
├── sections/          ← komponen tiap bagian undangan (Hero, Countdown, dll)
├── components/        ← komponen khusus template ini (opsional)
├── contexts/          ← React context khusus template (opsional)
├── styles/            ← CSS khusus template (opsional)
├── Shell.jsx          ← WAJIB: bingkai yang merangkai semua section
├── registry.js        ← WAJIB: peta { tipe → komponen }
└── defaultConfig.js   ← WAJIB: konten default + daftar section
```

Aturan main:
- Folder ini **self-contained** — semua import RELATIF ke dalam foldernya (`./sections/...`, `../contexts/...`). Jangan import antar-template.
- Boleh pakai shared infra lewat alias `@/` (mis. `@/components/...`, `@/hooks/...`) bila memang shared.
- File yang pakai hook React / browser API / animasi → diawali `'use client'`.

---

## 4. 3 file inti tiap template

### a) `registry.js` — kamus tipe → komponen

Menerjemahkan `type` di config jadi komponen React. Pakai `lazy()` biar code-split (tiap section jadi chunk terpisah).

```js
import { lazy } from 'react'

export const sectionRegistry = {
  hero:      lazy(() => import('./sections/Hero/Hero.jsx')),
  countdown: lazy(() => import('./sections/Countdown/Countdown.jsx')),
  rsvp:      lazy(() => import('./sections/Rsvp/Rsvp.jsx')),
  // ... semua tipe section yang template ini punya
}
export default sectionRegistry
```

### b) `defaultConfig.js` — konten default

Dipakai (1) saat couple baru daftar (di-seed ke DB), dan (2) untuk preview demo tanpa DB. Plain data — **tidak boleh** import komponen/Three.js, supaya aman dibaca server.

```js
export const defaultConfig = {
  meta: { title: '{{couple}} — Our Wedding', description: '...' },
  sections: [
    { id: 'hero',      type: 'hero',      enabled: true, props: { /* ... */ } },
    { id: 'countdown', type: 'countdown', enabled: true, props: { /* ... */ } },
    // urutan array = urutan tampil
  ],
}
export default defaultConfig
```

Skema 1 section: `{ id, type, enabled, theme?, props, ... }`.
- `type` harus cocok dengan key di `registry.js`.
- `enabled: false` → section di-skip.
- `props` → data yang dikirim ke komponen section.

### c) `Shell.jsx` — bingkai halaman

"Pembungkus terluar" template. Dia yang menentukan layout besar, provider, background, navbar, dan animasi global khas template itu. Menerima `{ config, slug }`.

Pola minimal:
```jsx
'use client'
import SectionRenderer from '@/renderers/SectionRenderer.jsx'
import { sectionRegistry } from './registry.js'

export default function Shell({ config, slug }) {
  return (
    <YourThemeProvider>
      {/* background / navbar / dekorasi khas template */}
      <SectionRenderer config={config} slug={slug} registry={sectionRegistry} />
    </YourThemeProvider>
  )
}
```

> Catatan: tiap template boleh punya "shell" yang sangat beda. Contoh nyata:
> - **lovebirds** → ThemeProvider + BotanicalBorder + FloatingNavbar + SectionRenderer biasa.
> - **solary** → 4 context (Theme/Audio/Guest/Journey) + scene 3D Three.js + smooth-scroll Lenis + renderer-nya sendiri.
> Karena tiap Shell mandiri, dua template bisa punya model render yang TOTAL berbeda.

---

## 5. Daftar pusat: templateIndex & templateCatalog

Dua file "registry pusat" yang menyatukan semua template:

### `src/config/templateIndex.js` — SERVER-SAFE (data only)
Dipakai server component (page.tsx) & onboarding. **Hanya boleh import data** (defaultConfig), JANGAN import Shell/registry/Three.js (nanti kode client kebawa ke server).

```js
import { defaultConfig as lovebirdsConfig } from '../templates/lovebirds/defaultConfig.js'
import { defaultConfig as solaryConfig }    from '../templates/solary/defaultConfig.js'

export const templates = {
  lovebirds: { label: 'Lovebirds', config: lovebirdsConfig },
  solary:    { label: 'Solary',    config: solaryConfig },
}
export const TEMPLATE_IDS = Object.keys(templates)
export const DEFAULT_TEMPLATE_ID = 'lovebirds'

export function isValidTemplate(id) { return id in templates }
export function getTemplate(id)      { return templates[id] || templates[DEFAULT_TEMPLATE_ID] }
export function getDefaultConfig(id) { return getTemplate(id).config }
export function getTemplateLabel(id) { return getTemplate(id).label }
```

### `src/config/templateCatalog.js` — DISPLAY metadata
Dipakai halaman galeri `/templates` & picker di onboarding. Plain data.

```js
export const templateCatalog = [
  { id: 'lovebirds', label: 'Lovebirds', description: '...', demoSlug: 'demo-lovebirds',
    thumbnail: '/images/templates/lovebirds-thumb.jpg', accent: '#E8553E', tags: ['cinematic'] },
  { id: 'solary',    label: 'Solary',    description: '...', demoSlug: 'demo-solary',
    thumbnail: '/images/templates/solary-thumb.jpg',    accent: '#6B35A8', tags: ['3D'] },
]
```

> Kenapa dua file? `templateIndex` butuh aman di server (no client code). `templateCatalog` murni untuk UI marketing. Pisah biar boundary server/client bersih.

---

## 6. Cara app memilih & merender template

Alur lengkap saat orang buka `/<template>/<slug>`:

```
URL: /solary/budi-sari
        │
        ▼
[1] src/app/[template]/[slug]/page.tsx        ← SERVER COMPONENT
      • isValidTemplate('solary')? kalau tidak → notFound()
      • query DB: SELECT config, template_id WHERE slug='budi-sari'
      • canonicalize: kalau template_id row ≠ URL → redirect ke yang benar
      • slug 'demo-*' & tak ada row → pakai getDefaultConfig() (preview)
      • render <InvitationView config slug templateId />
        │
        ▼
[2] src/app/[template]/[slug]/InvitationView.tsx   ← CLIENT "SAKLAR"
      const LovebirdsShell = dynamic(() => import('@/all-templates/lovebirds/Shell.jsx'), { ssr: true })
      const SolaryShell    = dynamic(() => import('@/all-templates/solary/Shell.jsx'),    { ssr: false })
      if (templateId === 'solary') return <SolaryShell .../>
      return <LovebirdsShell .../>
        │
        ▼
[3] Shell template merender section dari `config` lewat registry-nya
```

Kenapa ada "saklar" (InvitationView)?
- `page.tsx` itu **server component**. Shell itu **client component** (pakai animasi, browser API).
- InvitationView jadi jembatan server→client, dan `dynamic()` memastikan **tiap route cuma download bundle template yang dipakai** (lovebirds tidak ikut download Three.js-nya solary).

---

## 7. Routing

```
/                                  → marketing landing
/templates                         → galeri semua template (preview + pilih)
/<template>/<slug>                 → undangan publik   (mis. /lovebirds/rizky-amara)
/<template>/<slug>/dashboard       → dashboard admin (shared UI)
/<template>/demo-<template>        → preview demo (tanpa DB/login)
/signup /login /onboarding         → auth flow (static routes, tidak ke-catch [template])
```

Struktur folder Next.js (App Router):
```
src/app/[template]/[slug]/page.tsx          ← undangan publik
src/app/[template]/[slug]/dashboard/...     ← dashboard
src/app/[template]/[slug]/icon/route.ts     ← favicon dinamis
src/app/templates/page.tsx                  ← galeri
```

> ⚠️ Next.js TIDAK mengizinkan dua nama dynamic segment berbeda di level yang sama
> (mis. `[slug]` dan `[template]` sama-sama segmen pertama → error). Makanya routing
> lama `/[slug]` diganti total jadi `/[template]/[slug]`, bukan ditambah berdampingan.

---

## 8. Model database

Satu tabel `invitations`, tiap baris = 1 couple:

| kolom | fungsi |
|---|---|
| `slug` | identitas unik di URL (mis. `rizky-amara`). **Global unik** — makanya API cukup pakai slug. |
| `template_id` | template mana yang dipakai (`'lovebirds'`/`'solary'`) → menentukan VISUAL |
| `config` (JSONB) | ISI undangan (section + props) → menentukan KONTEN |
| `owner_user_id` | pemilik (FK ke Supabase Auth user) → menentukan SIAPA yang boleh edit |
| `is_published` | publik atau draft |

Kunci desain: **slug unik global**, jadi route API (`/api/invitation/[slug]/...`) cukup pakai slug tanpa template. `template_id` murni untuk memilih tampilan.

---

## 9. Login / auth

Pakai **Supabase Auth** (email + password). Bukan password per-undangan.

```
Signup (/signup)
   │  email + password → Supabase Auth kirim email verifikasi
   ▼
Verify (/verify-signup) → klik link di email
   │
   ▼
Onboarding (/onboarding?template=lovebirds)
   │  pilih template + isi data dasar
   │  → INSERT invitations { slug, template_id, owner_user_id=user.id, config }
   ▼
Dashboard (/<template>/<slug>/dashboard)
   • server cek: session ada? owner_user_id === user.id?
   • ya  → tampil dashboard (edit, RSVP, gift, dll)
   • tidak → tampil form login / "akun salah"
```

Cara couple login: buka `/<template>/<slug>/dashboard` → isi email+password → server verifikasi kepemilikan slug.

Bikin akun + undangan untuk testing (lewat script, paling cepat):
```powershell
node scripts/create-invitation.mjs rizky-amara passwordku `
  --bride="Amara" --groom="Rizky" --date=2026-11-15T16:00 `
  --venue="Jakarta" --email=kamu@email.com --template=lovebirds --full
```
Lalu login di `/lovebirds/rizky-amara/dashboard`.

Catatan:
- **Preview/demo tidak butuh login** (pakai `defaultConfig`).
- Login butuh `.env.local` (URL + anon key + service role key) & schema sudah di-apply di Supabase.

---

## 10. RESEP: menambah template baru

Misal bikin template **"garden"**. 4 langkah:

### Langkah 1 — Buat folder + 3 file inti
```
src/all-templates/garden/
├── sections/         ← komponenmu (tiap section 'use client')
├── registry.js       ← export sectionRegistry = { hero: lazy(...), ... }
├── defaultConfig.js  ← export defaultConfig = { meta, sections:[...] }
└── Shell.jsx         ← export default Shell({config, slug})
```

### Langkah 2 — Daftarkan di `templateIndex.js`
```js
import { defaultConfig as gardenConfig } from '../templates/garden/defaultConfig.js'
export const templates = {
  /* existing... */
  garden: { label: 'Garden', config: gardenConfig },   // ← tambah
}
```

### Langkah 3 — Tambah ke galeri `templateCatalog.js`
```js
{ id: 'garden', label: 'Garden', description: 'Tema taman botani...',
  demoSlug: 'demo-garden', accent: '#2D8C4E', tags: ['floral','organic'] }
```

### Langkah 4 — Sambungkan Shell di `InvitationView.tsx`
```tsx
const GardenShell = dynamic(() => import('@/all-templates/garden/Shell.jsx'), { ssr: true })
// di dalam fungsi:
if (templateId === 'garden') return <GardenShell config={config} slug={slug} />
```

Selesai. URL `/garden/<slug>` & `/garden/demo-garden` otomatis jalan. **Auth, dashboard, DB, API tidak perlu disentuh** — semuanya sudah otomatis dukung template baru.

> Bila template berasal dari project lain (mis. project Vite), lihat bagian 11 & 12.

---

## 11. Template dengan library berat (3D/Canvas) — ssr:false

Kalau template pakai Three.js / WebGL / library yang butuh `window`/`document` (seperti solary):

1. **Daftarkan Shell-nya dengan `ssr: false`** di InvitationView:
   ```tsx
   const SolaryShell = dynamic(() => import('@/all-templates/solary/Shell.jsx'), { ssr: false })
   ```
   Ini memastikan kode Shell **tidak pernah** jalan di server (server tak punya `window`).

2. **Boot logic di `useEffect`**, bukan di module top-level. Inisialisasi scene/scroll dilakukan setelah mount:
   ```jsx
   useEffect(() => {
     mountScene(); const lenis = startSmoothScroll();
     return () => { sceneInstance?.destroy?.() }   // cleanup saat unmount
   }, [])
   ```

3. **Hilangkan API khusus bundler lama.** Kalau template diambil dari project Vite, buang `import.meta.env` / `import.meta.hot` (itu Vite-only). Di Next pakai `process.env.NODE_ENV`.

4. **defaultConfig tetap plain data** (no import Three.js) supaya `templateIndex` aman di server.

---

## 12. Jebakan CSS global (WAJIB baca)

Ini sumber bug paling sering di multi-template. Karena ada **CSS global bersama** (mis. `src/styles/global.css` yang di-import di root `app/layout.tsx`), aturan global itu **bocor ke SEMUA route**, termasuk template lain.

Contoh nyata yang sempat terjadi di solary:
- `app/layout.tsx` set inline `<body style={{ background:'#FDF6EC' }}>` (cream) → menimpa background gelap solary.
- `global.css` punya `h1,h2,h3,h4 { color: var(--color-charcoal) }` (gelap) → judul solary jadi gelap-di-atas-gelap (tak terlihat).

**Pola solusi (scoped override):**
1. Saat Shell template mount, tandai `<body>` dengan class unik:
   ```jsx
   useEffect(() => {
     document.body.classList.add('solary-route')
     return () => document.body.classList.remove('solary-route')
   }, [])
   ```
2. Di CSS template, tulis aturan ber-specificity lebih tinggi (pakai class + `!important` bila lawan inline style):
   ```css
   body.solary-route { background: var(--color-bg) !important; color: var(--color-fg) !important; }
   body.solary-route h1, body.solary-route h2, body.solary-route h3 { color: var(--color-fg); }
   ```

Aturan praktis:
- **Specificity menang:** `body.x h1` (0,2,1) > `h1` global (0,0,1).
- **`!important` di stylesheet menang atas inline style** yang bukan `!important`.
- Karena CSS template hanya ter-load di route template itu (lewat dynamic Shell), override-nya **tidak** mengganggu template lain.

> Prinsip: jangan ubah CSS global bersama untuk memperbaiki 1 template — itu bisa merusak template lain. Selalu **scope** perbaikan ke class route template tsb.

---

## 13. Scripts & seeding

- **`scripts/create-invitation.mjs`** — bikin user Supabase + row undangan sekaligus.
  Flag penting: `--template=lovebirds|solary` (set `template_id`), `--full` (lovebirds: seed 14 section penuh).
- **`scripts/seed-full-config.mjs`** — isi ulang `config` lengkap ke row yang sudah ada (lovebirds).
- **Demo preview:** seed slug `demo-<template>` supaya galeri punya preview hidup. Atau biarkan — `page.tsx` otomatis fallback ke `defaultConfig` untuk slug berawalan `demo-`.

Saat menambah template, update `create-invitation.mjs` agar `--template=<id>` memuat config yang benar (untuk template non-lovebirds, muat dari `defaultConfig`-nya).

---

## 14. Checklist tambah template

- [ ] Folder `src/all-templates/<id>/` dengan `sections/`, `registry.js`, `defaultConfig.js`, `Shell.jsx`
- [ ] Semua file client diawali `'use client'`; import relatif ke dalam folder
- [ ] `defaultConfig.js` plain data (no import komponen/3D)
- [ ] Daftar di `templateIndex.js` (`templates[<id>] = { label, config }`)
- [ ] Daftar di `templateCatalog.js` (untuk galeri)
- [ ] Tambah branch + `dynamic()` di `InvitationView.tsx` (`ssr:false` bila pakai Three.js/WebGL)
- [ ] Library tambahan ter-`npm install` (mis. `three`, `lenis`)
- [ ] CSS template di-scope (lihat bagian 12) — uji background, warna teks, font
- [ ] `npm run build` clean
- [ ] Uji visual `/<id>/demo-<id>` di browser (320px / 768px / 1024px)
- [ ] (Opsional) seed demo row + thumbnail di `public/images/templates/`
- [ ] i18n: label schema section baru ditulis `{ id, en }` (bukan string polos); `npm test` → `dict-parity` hijau (lihat bagian 16)

---

## 15. FAQ

**Q: Template baru punya tipe section yang tak ada di template lain?**
Bebas. Tiap template punya `registry` sendiri. Tipe `videoHero` boleh ada di satu template saja.

**Q: Dua template punya section bernama sama (mis. Hero) tapi desain beda?**
Tidak konflik — file-nya beda folder (`templates/A/sections/Hero` vs `templates/B/sections/Hero`).

**Q: Couple bisa ganti template setelah daftar?**
Secara DB bisa (update `template_id`), tapi `config`-nya mungkin tak kompatibel antar template. Untuk MVP, pilih sekali saat onboarding.

**Q: Berapa max template?**
Tak terbatas. Selama bundler bisa code-split (lazy/dynamic), tak ada batas praktis.

**Q: Kenapa server/client dipisah ketat (templateIndex vs Shell)?**
Supaya kode client berat (Three.js dll) tidak ikut ter-bundle ke server component, dan tiap route cuma download bundle template yang dipakai.

**Q: Auth-nya per-template?**
Tidak. Auth, dashboard, API, DB semuanya SHARED. Yang per-template cuma lapisan visual (Shell + sections + CSS).

---

## 16. i18n — Bilingual ID/EN

Aplikasi ini bilingual (Bahasa Indonesia / English). Kunci memahaminya: **pisahkan dua "bahasa" yang berbeda.**

| | Apa | Diatur oleh | Berubah saat toggle? |
|---|---|---|---|
| **UI / keterangan** | Teks chrome: marketing, auth, onboarding, dashboard, **label di editor** | cookie `fin_lang` + toggle ID/EN | ✅ YA |
| **ISI undangan** | Konten couple (nama, cerita, foto, dll) di `config` | data couple | ❌ TIDAK |

> **Prinsip:** toggle **hanya** mengubah keterangan UI. Ia **tidak pernah** menyentuh isi kartu undangan. Karena itu komponen template (`src/all-templates/*/sections/*`) **tidak diterjemahkan** — isi tetap apa yang couple tulis.

### Cara kerja

```
cookie fin_lang ('id' | 'en', default 'id')
      │
      ▼
src/lib/i18n/getLang.ts (server-only)  ── baca cookie
      │
      ▼
getDict(lang)  ── ambil kamus dari src/lib/i18n/dictionaries/*
      │  (server page kirim slice teks sbg PROPS ke komponen)
      ▼
<LangToggle> klik → set cookie + router.refresh() → server render ulang (tanpa flash)
```

- **Dictionary** ada di `src/lib/i18n/dictionaries/` (`common`, `landing`, `auth`, `onboarding`, `templates`, `dashboard`). Shape `{ id, en }` **wajib identik** — dijaga test `src/lib/i18n/__tests__/dict-parity.test.ts` (`npm test`).
- **Server page** (mis. `page.tsx`, `dashboard/page.tsx`) memanggil `getLang()` → `getDict(lang)`, lalu mengoper slice yang relevan sebagai props.
- **Halaman client murni** (forgot/reset/verify-password — pakai `useSearchParams`, tak punya server wrapper) memakai `useClientLang()` (`src/lib/i18n/useClientLang.ts`) yang baca cookie di sisi client.

### Cakupan (sudah bilingual)

landing · templates · login · signup · onboarding · forgot/reset/verify-password · **seluruh dashboard** (chrome + 6 tab + 2 modal tamu) · **seluruh editor** (chrome + label semua schema).

### Editor: label schema `{id,en}`

Label field & section di editor memakai tipe `LabelText = string | { id, en }` (di `src/editor/schemas/types.ts`):

```ts
export type Localized = { id: string; en: string }
export type LabelText = string | Localized
export function localizeLabel(label: LabelText, lang): string { /* string → as-is; objek → label[lang] */ }
```

- Schema menulis `label: { id: 'Nama pasangan', en: 'Couple name' }`. String polos masih valid → fallback English (boleh dikonversi bertahap, build tetap hijau).
- Editor di dalam dashboard → konteks `DashboardI18nProvider` menyediakan `useDashboardDict()` (teks chrome) + `useDashboardLang()` (nilai `lang`). `FieldEditor`/`SectionList`/`AddSectionMenu`/`ObjectArrayField` me-resolve label via `localizeLabel(f.label, lang)`.
- **`defaults` di schema TIDAK perlu diterjemahkan** — itu konten contoh (isi), bukan keterangan.

### Setelan awal bahasa (onboarding)

Di langkah onboarding ada picker **"Bahasa dashboard"** (ID/EN). Memilihnya langsung men-set cookie, jadi dashboard + editor terbuka dalam bahasa itu sejak awal. Tetap bisa di-switch kapan saja lewat toggle di navbar. (Toggle = `src/components/site/LangToggle.tsx`.)

### Terjemahan elegan, bukan harfiah

Kualitas terjemahan dijaga **natural & elegan**, bukan terjemahan mesin. Contoh: "Our Story" → **"Kisah Kami"** (bukan "Cerita Kami"), "Venue" → "Lokasi acara", "Wedding Party" → "Pendamping Mempelai".

### Saat menambah template / section baru

1. **Nama & deskripsi template** → tambah ke `templateCatalog.js` dan (bila ditampilkan di marketing) ke dict terkait.
2. **Label schema** section baru → tulis langsung `{ id, en }` (lihat `src/editor/schemas/hero.ts` sebagai contoh).
3. **Jaga parity** — setiap key di `id` harus ada di `en`. `npm test` akan gagal (`dict-parity`) bila ada yang lupa.
4. Konten template/section (teks yang dilihat tamu) **bukan** urusan dict — itu isi undangan, biarkan apa adanya.

---

## 17. Prompt siap-pakai: integrasi template DARI LUAR project

Pakai ini saat kamu sudah punya web/template jadi di folder LAIN (mis. project Vite/HTML
terpisah) dan mau memasukkannya sebagai template baru ke project ini. Copy-paste ke
session Claude baru, ganti 3 placeholder `[GANTI: ...]`.

**PROMPT START** (copy dari sini)

```
Project wedding SaaS multi-template di:
  c:\Users\arifi\Downloads\multi-template\wedding-saas-next

WAJIB baca dulu: tutorial-multi.md (di root project) untuk arsitekturnya,
lalu CLAUDE.md. Ikuti pola template existing src/all-templates/solary sebagai
contoh template self-contained (punya components/contexts/styles/renderers sendiri).

Saya mau menambahkan TEMPLATE BARU yang dibuat di luar project ini.
  - Folder sumber template (di luar project): [GANTI: mis. c:\Users\arifi\Downloads\garden-wedding]
  - Nama template (untuk URL & DB template_id): [GANTI: mis. garden]   (huruf kecil, tanda hubung)
  - Label tampilan (untuk galeri/onboarding): [GANTI: mis. Garden]

Langkah yang aku minta:
1. COPY (bukan move — biar folder sumber tetap utuh) seluruh isi template yang dibutuhkan
   ke src/all-templates/[nama]/ sebagai paket SELF-CONTAINED:
     sections/, dan komponen/aset pendukungnya (components/, contexts/, styles/, utils/,
     renderers/, three/, config/ — sesuai yang dipakai). Semua import RELATIF ke dalam
     folder template; JANGAN bergantung ke alat milik template lain.
2. Buat 3 file inti: Shell.jsx (bingkai/komposisi), registry.js (type → komponen),
   defaultConfig.js (plain data: meta + sections[]; TANPA import komponen/Three.js).
3. Buang API khusus bundler lama: `import.meta.env` / `import.meta.hot` (Vite-only).
   Pakai `process.env.NODE_ENV` bila perlu. Pindahkan boot side-effect (scene/scroll)
   ke useEffect di Shell.
4. Tiap file yang pakai hook React / browser API / animasi diawali 'use client'.
5. Daftarkan template:
     - src/config/templateIndex.js  → templates[<nama>] = { label, config }
     - src/config/templateCatalog.js → entri galeri { id, label, description, demoSlug, accent, tags }
     - src/app/[template]/[slug]/InvitationView.tsx → dynamic-import Shell + branch
       if (templateId === '<nama>') return <Shell .../>
   Kalau template pakai library berat (Three.js/WebGL/canvas yang butuh window),
   daftarkan Shell-nya dengan { ssr: false }.
6. BACKGROUND/TEMA di-scope sendiri: Shell menambahkan className `<nama>-route` ke <body>
   saat mount (hapus saat unmount), dan CSS tema-nya ditulis `body.<nama>-route { ... }`
   (lihat lovebirds/styles/theme.css & solary). JANGAN ubah src/styles/global.css bersama
   (itu cuma reset/token/typografi netral milik semua halaman).
7. Hindari hydration mismatch: JANGAN pakai Date.now()/Math.random() saat render
   (bikin seed deterministik dari data config); render dekorasi non-deterministik
   secara client-only (mount-gate) bila perlu; inline <style> pakai
   dangerouslySetInnerHTML, bukan {cssString}.
8. Install dependency tambahan yang dibutuhkan template (mis. three, lenis) via npm install.
9. Verifikasi: `npm run build` harus clean (0 error), lalu jalankan dev dan buka
   /[nama]/demo-[nama] di browser — cek console BERSIH (tidak ada hydration warning),
   dan tampilan benar di 320px/768px/1024px.

CONSTRAINTS (penting):
- JANGAN ubah template lain (lovebirds, solary).
- JANGAN ubah auth, dashboard, editor, API, atau schema database.
- JANGAN taruh kode template di luar src/all-templates/[nama]/ (kecuali 3 titik
  registrasi di langkah 5).
- Folder sumber asli JANGAN dihapus/diubah — hanya dicopy.
```

**PROMPT END**

> Catatan: demo preview `/[nama]/demo-[nama]` otomatis jalan tanpa DB (fallback ke
> defaultConfig). Tidak perlu menyentuh auth/dashboard — begitu terdaftar, semua fitur
> SaaS (login, RSVP, gift, editor) otomatis tersedia untuk template baru.
