# Nama pasangan satu sumber kebenaran (`config.couple`) + field section terkunci

**Tanggal:** 2026-06-29
**Status:** Disetujui arah & default (menunggu review spec)
**Branch:** `feat/solary-editor`
**Menggantikan:** `2026-06-29-solary-navbar-couple-name-split-design.md` (navbar split jadi
bagian kecil dari desain ini)

## Masalah

Nama pasangan (panggilan singkat, mis. "Amara & Rizky", "Aruna & Daksa") **terduplikasi
di banyak tempat** di kedua template dan akan terus bertambah seiring template baru:

| Tempat | Field | Dipakai untuk |
|---|---|---|
| Lovebirds **Hero** (`hero.props`) | `brideName`, `groomName`, `coupleName` | dua nama besar + monogram |
| Lovebirds **Footer** (`footer.props`) | `coupleName` | "With love, …", "© … ", monogram |
| Solary **OpeningGate** (props) | `coupleName` | judul gate `<h1>` |
| **Navbar Solary** (`Shell.jsx`, `InvitationPage.jsx`) | parse `meta.title.split('—')[0]` | brand navbar |
| **Meta** (`meta.title`) | judul SEO/tab browser/share | komposit nama |
| Palette preview (`EditorWorkspace.tsx:70`) | baca `hero.props.coupleName` | kartu pratinjau |
| SEO fallback (`app/[template]/[slug]/page.tsx`) | `p.coupleName` | `generateMetadata` |
| Onboarding/seed (`lib/onboarding/seed-config.ts`) | `bride`/`groom` → komposit | sumber awal, disalin ke semua di atas |

User mengubah nama di satu tempat (mis. Hero) → tempat lain (Footer, gate, navbar)
tetap nilai lama → **drift / tidak konsisten**, dan mudah lupa.

## Tujuan

Satu tempat untuk mengetik nama pasangan, mengalir otomatis ke semua konsumen di semua
template (sekarang & ke depan). Tetap sediakan jalan keluar (override per-section) tetapi
**di balik interaksi sengaja** (kunci → konfirmasi) supaya tidak menimbulkan drift tak
sengaja.

## Keputusan (dari brainstorming)

- **Sumber tunggal:** `config.couple = { name1, name2 }` di akar config (template-agnostik).
- **Lokasi UI:** panel **"Pasangan"** tersendiri di **paling atas editor** (bukan di tab Meta).
- **Field nama per-section tetap ada**, tetapi **terkunci (linked)** secara default;
  override hanya setelah konfirmasi.
- **Granularitas kunci: per-section** (satu gembok mencakup semua field nama di section itu).
- Flag override disimpan **satu boolean** di props section: `coupleOverride: boolean`.
- Nama field kanonis **`name1` / `name2`** (netral; label UI "Mempelai 1 / Mempelai 2").
- **Bisa relink** (kembali ke warisan) — bukan pintu satu arah.
- **Tanpa batas karakter** pada input nama & akhiran judul.
- **Pemisah `" & "`** antar dua nama.
- **Affordance unlock pada layar sentuh:** label petunjuk yang sama seperti saat hover
  **ditampilkan permanen** (tak ada hover di touch).

## Desain

### 1. Data — `config.couple`

```jsonc
config.couple = { name1: "Amara", name2: "Rizky" }
```

Nilai tampil (display) di mana-mana: `coupleDisplay = [name1, name2].map(trim).filter(Boolean).join(' & ')`.

`config.meta.title` (SEO) menjadi **turunan**: `coupleDisplay — titleSuffix` (suffix tetap
diedit di tab Meta). Field lama `meta.coupleName1/2` dari spec yang digantikan **tidak
dipakai** — kanoniknya pindah ke `config.couple`.

### 2. Helper murni — `src/lib/meta/couple.ts`

```ts
interface CoupleData { name1?: string; name2?: string }

coupleDisplay(c: CoupleData): string
  // "Amara & Rizky" (segmen kosong di-drop, tanpa " & " menggantung)

composeTitle(c: CoupleData, suffix?: string): string
  // "Amara & Rizky — Our Wedding" (suffix opsional)

parseCoupleFromTitle(title?: string): { name1: string; name2: string; titleSuffix: string }
  // migrasi/prefill dari meta.title lama

navName(config: { couple?: CoupleData; meta?: { title?: string } }, fallback?: string): string
  // coupleDisplay(config.couple) → fallback parse meta.title → fallback string
```

Semua konsumen memakai helper ini → satu implementasi teruji.

### 3. Injeksi di renderer (kedua template)

Sebelum render tiap section, jika `section.props.coupleOverride` **tidak** truthy,
suntikkan nilai turunan ke props (komponen section tetap byte-identical — hanya sumber
prop berubah):

| Section | Prop yang disuntik (saat terkunci) |
|---|---|
| Lovebirds `hero` | `brideName = name1`, `groomName = name2`, `coupleName = coupleDisplay` |
| Lovebirds `footer` | `coupleName = coupleDisplay` |
| Solary `openingGate` | `coupleName = coupleDisplay` |

Jika `coupleOverride === true`, props tersimpan dipakai apa adanya (tidak disuntik).
Helper injeksi tunggal `injectCoupleProps(section, couple)` dipakai di
`SectionRenderer` kedua template (peta `type → fields`).

Navbar Solary (`Shell.jsx`, `InvitationPage.jsx`): `logo = navName(config, 'Wedding'|'Galactic')`.
Title SEO: `meta.title` turunan dari `config.couple` + suffix saat disimpan.

### 4. Panel "Pasangan" di editor

Komponen baru di paling atas editor (di atas daftar section): dua input **Mempelai 1 /
Mempelai 2** (tanpa batas karakter) + baris preview "Tampil sebagai: *Amara & Rizky*".
Simpan ke `config.couple` lewat route khusus `PUT /api/invitation/[slug]/couple`
(meniru pola `/meta`, `/music`, `/palette`). Menyimpan panel ini juga me-recompute
`meta.title` turunan agar SEO selalu sinkron.

### 5. Mekanik field terkunci (linked) di editor section

Schema field nama ditandai milik grup `couple` (lihat §7). Di `FieldEditor`, field bertanda
ini dirender **terkunci** saat `coupleOverride !== true`:

- Menampilkan **nilai warisan** (dari `config.couple`), read-only, dengan badge gembok 🔒.
- **Hover (desktop, `@media (hover: hover)`):** field menyala + label
  "Klik untuk membuka / Click to unlock".
- **Layar sentuh (`@media (hover: none)`):** label yang **sama ditampilkan permanen**
  (badge + teks selalu terlihat & bisa diketuk; tak bergantung hover).
- **Klik/ketuk →** `useConfirm()` (komponen `DialogProvider` yang sudah ada, promise-based,
  bilingual) menampilkan:
  - judul: "Lepas dari Nama Pasangan? / Unlink from Couple name?"
  - pesan: "Nama ini diatur terpusat di panel Pasangan. Jika kamu mengubahnya di sini,
    section ini tidak akan ikut berubah saat kamu memperbarui Nama Pasangan. Lanjutkan? /
    This name is managed centrally in the Couple panel. If you change it here, this
    section won't update when you edit the Couple name. Proceed?"
  - tombol: "Lanjutkan / Proceed" + "Batal / Cancel"
- **Proceed →** set `coupleOverride = true` untuk section itu; seed nilai field dengan
  nilai warisan saat ini lalu field jadi editable (semua field nama section terbuka).
- **Relink →** tombol kecil "🔗 Hubungkan lagi ke Nama Pasangan / Relink to Couple name"
  saat terbuka → set `coupleOverride = false`; field kembali warisan (read-only).

Granularitas: satu kunci per section (hero membuka bride+groom+couple sekaligus).

### 6. Tab Meta menyusut

Hapus input nama dari tab Meta. Sisakan: **Deskripsi**, **foto share (og:image)**,
dan **Akhiran judul** (`meta.titleSuffix`). Title SEO ditampilkan sebagai preview turunan
"Judul jadi: *Amara & Rizky — Our Wedding*". Tab Meta tetap menyimpan suffix + desc +
image; nama tidak lagi di sini.

### 7. Schema & flag

- Tambah penanda pada field schema yang termasuk grup couple, mis. `linkedGroup: 'couple'`
  pada field `coupleName/brideName/groomName` di `hero.ts`, `footer.ts`,
  `solary/openingGate.ts` (dan `solary/footerPlanet.ts` bila ada nama).
- `coupleOverride` adalah prop section biasa (ikut tersimpan via route config section),
  default tak-ada/false.

### 8. Onboarding / seed

`seed-config.ts` dan `OnboardingForm`: tetap menerima bride/groom, tetapi tulis ke
`config.couple = { name1: bride, name2: groom }` sebagai kanonik. Boleh tetap menulis
salinan per-section (renderer mengabaikannya saat terkunci) demi aman, tetapi sumber
kebenaran adalah `config.couple`. `meta.title` tetap diseed sebagai turunan.

### 9. Backward-compat / migrasi

Undangan lama belum punya `config.couple`. Saat dibaca tanpa `config.couple`:
- Editor panel Pasangan **prefill** via `parseCoupleFromTitle(meta.title)` (atau dari
  `hero.props.coupleName` bila ada) — nilai muncul, user tinggal Simpan untuk menetapkannya.
- Renderer: bila `config.couple` kosong, **jangan menyuntik** (biarkan props section lama
  tampil apa adanya) → tampilan tidak berubah untuk undangan lama sampai user mengisi panel.
- Navbar: `navName` fallback ke parse `meta.title` lama.

## Di luar scope (sengaja)

- Tidak menyatukan tanggal/venue/hashtag — hanya nama. (Bisa jadi pekerjaan lanjutan dengan
  pola yang sama.)
- Tidak mengubah animasi/tata letak section.
- Monogram tetap diturunkan dari nama (perilaku `deriveMonogram` tak berubah); tidak ada
  field monogram khusus baru.

## Konsumen yang harus diperbarui (checklist coverage)

- [ ] `src/lib/meta/couple.ts` (helper) + test
- [ ] `config.couple` ditulis: route `couple`, panel editor, onboarding/seed, defaultConfig
- [ ] Injeksi: `solary/renderers/SectionRenderer.jsx`, `lovebirds` SectionRenderer
- [ ] Navbar: `solary/Shell.jsx`, `solary/components/InvitationPage.jsx`
- [ ] Meta: `MetaTab.tsx` (buang nama, sisakan suffix/desc/image), route `meta` (title turunan)
- [ ] Palette preview: `EditorWorkspace.tsx:70` baca `config.couple`
- [ ] SEO fallback: `page.tsx` baca `config.couple`
- [ ] Editor lock: `FieldEditor.tsx` + field schema (`linkedGroup`) + CSS hover/touch + i18n
- [ ] Dialog copy + panel/lock labels: `lib/i18n/dictionaries/dashboard.ts` (id + en)

## Test (garis besar)

- Unit helper `couple.ts`: `coupleDisplay`, `composeTitle`, `parseCoupleFromTitle`, `navName`
  (termasuk fallback & edge: satu nama kosong, ampersand ganda, suffix ber-em-dash).
- Unit `injectCoupleProps`: terkunci menyuntik, `coupleOverride` melewati, `config.couple`
  kosong tidak menyuntik.
- Route `couple`: owner-only, simpan `config.couple`, recompute `meta.title`.
- Route `meta`: title turunan dari `config.couple` + suffix; backward-compat raw title.
- Reducer/editor: toggle `coupleOverride` true/false.
- Manual: kedua template — edit panel Pasangan → cek Hero/Footer/Gate/navbar/tab browser;
  uji lock hover (desktop) + label permanen (emulasi touch) + dialog + relink.
