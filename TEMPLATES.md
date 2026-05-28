# Multi-Template Architecture

## Konsep

Project ini 1 app, 1 database, 1 deploy — tapi bisa punya **unlimited template undangan**. Setiap template = 1 folder di `src/templates/`. Template sharing auth, dashboard, guests, RSVP, gifts — yang beda cuma **visual rendering** (sections + CSS + animasi).

---

## Struktur Folder Template

Setiap template adalah 1 folder di `src/templates/<nama-template>/`:

```
src/templates/<nama-template>/
├── sections/              ← komponen React per section (Hero.jsx, Countdown.jsx, dll)
│   ├── Hero/
│   │   ├── Hero.jsx
│   │   └── Hero.module.css
│   ├── Countdown/
│   │   ├── Countdown.jsx
│   │   └── Countdown.module.css
│   └── ... (section lainnya)
├── components/            ← komponen shared khusus template ini (opsional)
├── styles/                ← token CSS khusus template (opsional)
├── defaultConfig.js       ← pageConfig default (section list + placeholder content)
├── registry.js            ← { hero: lazy(() => import('./sections/Hero/Hero.jsx')), ... }
└── README.md              ← deskripsi template, screenshot, credits
```

### File wajib:

**`registry.js`** — mapping type → component:
```js
import { lazy } from 'react'

export const sectionRegistry = {
  hero:         lazy(() => import('./sections/Hero/Hero.jsx')),
  countdown:    lazy(() => import('./sections/Countdown/Countdown.jsx')),
  ourStory:     lazy(() => import('./sections/OurStoryStack/OurStory.jsx')),
  eventDetails: lazy(() => import('./sections/EventDetails/EventDetails.jsx')),
  // ... semua section yang template ini punya
}
```

**`defaultConfig.js`** — config default yang di-seed saat couple daftar:
```js
export const defaultConfig = {
  meta: { title: '{{coupleName}} — Our Wedding', description: '...' },
  sections: [
    { id: 'hero', type: 'hero', enabled: true, theme: 'darkLuxury', props: { ... } },
    { id: 'countdown', type: 'countdown', enabled: true, props: { ... } },
    // ...
  ],
}
```

---

## Cara App Memilih Template

### Database: `invitations.template_id`

```sql
-- Kolom sudah ada di tabel invitations:
template_id TEXT NOT NULL DEFAULT 'lovebirds'
-- Contoh value: 'lovebirds', 'solary', 'garden-wedding'
```

### Rendering: `src/renderers/SectionRenderer.jsx`

```jsx
// Load registry berdasarkan template_id:
import { sectionRegistry as lovebirdsRegistry } from '@/templates/lovebirds/registry'
import { sectionRegistry as solaryRegistry } from '@/templates/solary/registry'

const registries = {
  'lovebirds': lovebirdsRegistry,
  'solary': solaryRegistry,
}

function getRegistry(templateId) {
  return registries[templateId] || lovebirdsRegistry // fallback
}
```

### Onboarding: couple pilih template

Di onboarding form, tambahin step awal "Pilih template" yang set `template_id` sebelum isi data.

### URL routing

```
/lovebirds/rizky-amara           ← couple pakai Lovebirds
/solary/budi-sari              ← couple pakai Solary
/lovebirds/rizky-amara/dashboard ← dashboard (shared UI)
```

Next.js routes:
```
src/app/[template]/[slug]/page.tsx
src/app/[template]/[slug]/dashboard/page.tsx
src/app/[template]/page.tsx            ← preview/demo template
```

---

## Cara Menambah Template Baru

### Step 1 — Siapkan folder template

Taruh folder kamu (yang isinya sections + CSS) di:
```
src/templates/<nama-template>/
```

Pastikan ada minimal:
- `sections/` folder dengan komponen React
- `registry.js` yang export `sectionRegistry`
- `defaultConfig.js` yang export `defaultConfig`

### Step 2 — Daftarkan di registry master

Buka `src/config/templateIndex.js` (atau lokasi yang dibuat saat restructure) dan tambah:
```js
import { sectionRegistry as namaRegistry } from '@/templates/<nama-template>/registry'
import { defaultConfig as namaConfig } from '@/templates/<nama-template>/defaultConfig'

export const templates = {
  // existing
  'lovebirds': { registry: lovebirdsRegistry, config: lovebirdsConfig, label: 'Lovebirds' },
  // tambah ini:
  '<nama-template>': { registry: namaRegistry, config: namaConfig, label: 'Nama Template' },
}
```

### Step 3 — Test

```bash
npm run dev
# Buka: http://localhost:3000/<nama-template>  ← preview
# Signup → pilih template → isi data → lihat hasilnya
```

### Step 4 — Commit + push

```bash
git add src/templates/<nama-template>/
git commit -m "feat: add <nama-template> wedding template"
git push
```

Vercel auto-deploy. Selesai.

---

## Prompt untuk Claude: "Tambahkan Template Baru"

Copy-paste prompt ini ke Claude session baru saat mau integrasi template:

---

**PROMPT START** (copy dari sini)

```
Saya punya project wedding SaaS di c:\Users\arifi\Downloads\wedding-saas-next.
Baca CLAUDE.md dan TEMPLATES.md untuk context arsitektur.

Saya mau menambahkan template baru ke project ini.

Template yang mau ditambahkan ada di folder:
  [GANTI: path ke folder template, mis. c:\Users\arifi\Downloads\solary\]

Nama template untuk URL dan database:
  [GANTI: mis. solary]

Label display (untuk UI):
  [GANTI: mis. Solary]

Tolong:
1. Copy/move section components dari folder template ke src/templates/[nama]/sections/
2. Buat registry.js yang mapping semua section types
3. Buat defaultConfig.js dari pageConfig yang ada di folder template
   (kalau ada pageConfig.js, adapt dari situ. Kalau gak ada, bikin dari section list)
4. Daftarkan template di templateIndex.js
5. Pastikan semua section pakai 'use client' dan import-nya relative ke folder baru
6. Pastikan CSS modules jalan (rename kalau ada conflict)
7. Test: npm run dev → buka /[nama-template] → pastikan preview jalan
8. Commit + push

Constraints:
- JANGAN ubah template yang sudah ada (lovebirds dll)
- JANGAN ubah database schema — cuma tambah row template_id baru
- JANGAN ubah auth/dashboard/routing — cuma tambah entry di templateIndex
- Setiap section harus 'use client' dan pakai CSS Modules
- Ikuti pattern dari template existing (lihat src/templates/lovebirds/ sebagai contoh)
```

**PROMPT END**

---

## Prompt untuk Claude: "Restructure Project untuk Multi-Template"

Pakai prompt ini SEKALI untuk restructure awal (belum dilakukan):

---

**PROMPT START** (copy dari sini)

```
Saya punya project wedding SaaS di c:\Users\arifi\Downloads\wedding-saas-next.
Baca CLAUDE.md dan TEMPLATES.md untuk context.

Project ini sekarang punya 1 template (cinematic) dengan sections di src/sections/,
config di src/config/pageConfig.js, dan registry di src/config/sectionRegistry.js.

Tolong restructure project agar support multi-template:

1. Buat folder src/templates/lovebirds/
2. COPY semua section dari src/sections/ ke src/templates/lovebirds/sections/
   (src/sections/ tetap ada sebagai referensi)
3. COPY src/config/sectionRegistry.js → src/templates/lovebirds/registry.js
   (update semua relative import paths di dalamnya)
4. COPY src/config/pageConfig.js → src/templates/lovebirds/defaultConfig.js
   (rename export dari pageConfig ke defaultConfig)
5. Buat src/config/templateIndex.js yang import dari templates/lovebirds/
6. Update src/renderers/SectionRenderer.jsx agar baca registry dari templateIndex
   berdasarkan templateId prop
7. Update routing dari src/app/[slug]/ ke src/app/[template]/[slug]/
   (pastikan /signup, /login, /onboarding TIDAK kena catch oleh [template])
8. Update onboarding action: tambahin template selection
9. Update semua import yang reference src/sections/ atau src/config/pageConfig
   ke lokasi baru
10. Test: npm run dev → buka /lovebirds/rizky-amara → harus sama persis
    seperti sebelum restructure
11. Build: npm run build → harus clean
12. Commit dengan pesan: "refactor: restructure to multi-template architecture"

CRITICAL:
- Visual output HARUS IDENTIK setelah restructure — ini refactor, bukan redesign
- Jangan hilangkan animasi, GSAP, motion, atau CSS apapun
- Test di 320px, 768px, 1024px viewport — responsive harus tetap jalan
- Run npm test — 34 existing tests harus tetap pass
```

**PROMPT END**

---

## FAQ

**Q: Kalau template baru punya section type yang gak ada di template lain?**
A: Gak masalah. Setiap template punya registry sendiri. Section "videoHero" bisa ada di Solary tapi gak ada di Lovebirds. Dashboard editor cukup baca registry template yang aktif.

**Q: Kalau 2 template punya section dengan nama sama (mis. Hero) tapi desain beda?**
A: Masing-masing punya file Hero.jsx sendiri di folder template masing-masing. Gak conflict karena import path-nya beda.

**Q: Couple bisa ganti template setelah daftar?**
A: Secara DB bisa (update template_id). Tapi config sections-nya mungkin gak kompatibel. Untuk MVP, gak perlu support template switching — couple pilih sekali saat onboarding.

**Q: Berapa template max?**
A: Unlimited. Selama Next.js bisa bundle-nya (lazy import), gak ada cap.
