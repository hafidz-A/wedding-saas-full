# finWedding — Landing Redesign + Brand + i18n (ID/EN) Penuh

> **Status:** Draft untuk direview
> **Tanggal:** 2026-05-28
> **Scope:** Satu spec besar (atas permintaan user). Mencakup rebrand → finWedding,
> fondasi i18n cookie-based ID/EN, komponen chrome reusable (Logo/Navbar/Footer),
> redesign landing page, dan **terjemahan SELURUH halaman** — publik, auth,
> onboarding, dashboard, dan editor.

---

## 1. Latar belakang & tujuan

Landing page asli (`src/app/page.tsx`) saat ini cuma kartu tengah polos — jauh dari
kesan "premium cinematic" yang dijual produk. User punya 2 file konsep HTML
(`landing_page_concept.html` + `_mobile.html`) sebagai **referensi rasa visual** (bukan
untuk dipakai langsung — keduanya Tailwind CDN + Playfair/Jakarta, sedangkan app pakai
Cormorant + DM Sans, CSS Modules / inline-style, tanpa Tailwind).

**Tujuan:**

1. **Rebrand** seluruh permukaan marketing/app ke **finWedding** (sebelumnya app cuma
   pakai metadata `"Wedding Invitation"`; "AmoreSaaS/EverAfter" hanya ada di file konsep).
2. **Redesign landing** jadi halaman penuh, responsif (hp/tablet/desktop), dengan CTA
   yang **benar-benar tersambung** ke rute yang sudah ada.
3. **Toggle bahasa ID/EN** dengan terjemahan isi, persist via cookie, **di semua halaman**.
4. **Showcase 2 template** existing (Lovebirds + Solary) dengan link preview live.

**Kenapa (motivasi):** landing adalah titik konversi utama; saat ini tidak menjual.
Bilingual penting karena audiens utama Indonesia tapi sebagian klien/tamu berbahasa Inggris.

---

## 2. Keputusan yang sudah dikunci (hasil brainstorm)

| Topik | Keputusan |
|---|---|
| Brand | **finWedding** |
| Logo | Wordmark dua-gaya: `fin` (DM Sans 600) · titik coral · `Wedding` (Cormorant italic 500) |
| Bahasa | Toggle ID/EN, **cookie-based**, default `id` |
| Cakupan i18n | **SEMUA halaman**: landing, templates, login, signup, onboarding, forgot/reset/verify-password, **dashboard penuh (semua tab) + editor** |
| Cakupan redesign visual | Landing `/` + Navbar/Footer reusable (halaman lain: hanya disisipi chrome + diterjemahkan, **tidak** di-restyle total) |
| Teknik styling komponen baru | **CSS Modules** (`.module.css`) — pakai variabel `tokens.css` |
| Template di-showcase | Lovebirds (coral `#E8553E`) + Solary (purple `#6B35A8`), framing "2 signature styles, more coming soon" |
| Eksekusi | Satu spec + satu rencana implementasi (tetap diorganisir per-milestone A–E) |

---

## 3. Non-goals (TIDAK dikerjakan)

- Tidak menambah template baru (pakai 2 yang ada).
- Tidak mengubah skema DB, logika auth, atau rendering invite (`[template]/[slug]/page.tsx`).
- Tidak membuat halaman pricing / plan enforcement.
- Tidak menambah library i18n (next-intl dll) — pakai dictionary buatan sendiri.
- Tidak menambah Tailwind / UI library (sesuai CLAUDE.md).
- Tidak mengubah animasi/GSAP/motion di section-section template invite.
- Tidak menerjemahkan konten *milik couple* (isi undangan) — itu data, bukan UI chrome.

---

## 4. Arsitektur i18n (fondasi, dibangun sekali)

### 4.1 Cookie & pembacaan

```
src/lib/i18n/
├── config.ts          // export type Lang = 'id' | 'en'
│                       // export const LANGS, DEFAULT_LANG='id', LANG_COOKIE='fin_lang'
├── getLang.ts         // 'server-only' — baca cookie via next/headers cookies()
│                       //   return cookie==='en' ? 'en' : 'id'
├── index.ts           // getDict(lang): Dict  + export type Dict
└── dictionaries/
    ├── common.ts      // nav, footer, tombol global, label toggle
    ├── landing.ts     // semua section landing
    ├── templates.ts   // halaman /templates
    ├── auth.ts        // login, signup, forgot, reset, verify
    ├── onboarding.ts  // wizard onboarding
    └── dashboard.ts   // dashboard + editor (namespace bertingkat)
```

- Cookie `fin_lang`, `path=/`, `max-age=1 tahun`, `samesite=lax`. Default (tanpa cookie) = `id`.
- `getLang()` ditandai `import 'server-only'` supaya tidak kebawa ke bundle client.
- Tidak butuh `middleware.ts` (belum ada, dan default sudah ditangani `getLang`).

### 4.2 Struktur dictionary (typed)

`index.ts` menyusun objek `dict` `{ id: {...}, en: {...} }` dengan **shape identik**.
`type Dict = typeof dict['id']` → kompiler memaksa EN melengkapi semua key (mencegah key
hilang). `getDict(lang)` mengembalikan `dict[lang]`.

Contoh shape (potongan):

```ts
// dictionaries/landing.ts
export const landing = {
  id: {
    hero: {
      kicker: 'UNDANGAN PERNIKAHAN DIGITAL',
      title: 'Kisah cintamu, dirangkai sinematik.',
      subtitle: 'Bikin undangan digital premium yang memukau dari scroll pertama sampai RSVP. Pilih template, isi cerita kalian, bagikan link.',
      ctaPrimary: 'Buat Undangan',
      ctaSecondary: 'Lihat Template',
    },
    // features, showcase, howItWorks, finalCta ...
  },
  en: {
    hero: {
      kicker: 'DIGITAL WEDDING INVITATIONS',
      title: 'Your love story, told cinematically.',
      subtitle: 'Craft a premium digital invitation that captivates from the first scroll to the RSVP. Pick a template, add your story, share the link.',
      ctaPrimary: 'Create Invitation',
      ctaSecondary: 'Browse Templates',
    },
  },
} as const
```

### 4.3 Alur server → client

- **Server Component** (`page.tsx`, `dashboard/page.tsx`, dst.) memanggil `getLang()` →
  `getDict(lang)` → kirim **slice teks** (objek string biasa, serializable) sebagai
  **props** ke komponen anak (termasuk client component).
- **`<LangToggle lang>`** (client): saat diklik set cookie `fin_lang` lalu
  `router.refresh()` → server component render ulang baca cookie baru → UI ganti bahasa
  **tanpa full reload, tanpa flash**.
- **`<html lang>`** di `layout.tsx` dibuat dinamis: `layout` baca `getLang()` → `<html lang={lang}>`.

### 4.4 Komponen yang sekarang `'use client'` & hardcode Bahasa

Form seperti `login/LoginForm.tsx`, `signup/SignupForm.tsx`, `onboarding/OnboardingForm.tsx`
hardcode string Bahasa. Pola perbaikan: **page wrapper-nya (server) baca dict** lalu kirim
`dict` sebagai prop; form pakai `props.dict.*`, bukan literal. (Untuk pesan error dari
Supabase yang dinterpolasi, sediakan key per-kondisi di `auth.ts`.)

---

## 5. Brand finWedding + Logo

### 5.1 Komponen Logo

`src/components/site/Logo.tsx` (+ `Logo.module.css`):

```
[ fin ]·[ Wedding ]
  └DM Sans 600, --color-charcoal, lowercase, letter-spacing -0.01em
       └titik: lingkaran 6px --color-coral, vertical-center
              └Cormorant Garamond italic 500, --color-charcoal
```

- Prop `size?: 'sm' | 'md'` (sm utk footer, md utk navbar) → atur font-size via clamp.
- Prop `as?: 'link' | 'plain'` — di navbar bungkus `<Link href="/">`.
- Hover (md): titik coral sedikit `box-shadow` glow + `transition-default`.
- Hormati `prefers-reduced-motion` (sudah global, tapi jangan animasi wajib).

### 5.2 Rebrand string

- `layout.tsx` metadata `title`/`description` → finWedding.
- Metadata `templates/page.tsx` → finWedding.
- Tidak menyentuh metadata `[template]/[slug]/page.tsx` (itu judul undangan per-couple,
  bukan brand).
- Favicon/app icon marketing: **opsional / nice-to-have** (boleh menyusul; bukan blocker).

---

## 6. Chrome reusable (CSS Modules)

```
src/components/site/
├── SiteNav.tsx + .module.css      'use client'
├── SiteFooter.tsx + .module.css
└── LangToggle.tsx + .module.css   'use client'
```

### 6.1 SiteNav

- Sticky top, `backdrop-filter: blur`, border-bottom tipis; saat `scrollY>20` tambah
  bayangan + naikkan opasitas background (port dari konsep, via `useState`+listener atau
  `IntersectionObserver` sentinel).
- **Desktop (≥768px):** Logo (kiri) · link tengah/kanan (Experience→`#features`,
  Templates→`/templates`, Login→`/login`) · `LangToggle` · CTA "Buat Undangan"→`/signup`.
- **Mobile (<768px):** Logo + tombol hamburger → panel slide-down berisi link + toggle + CTA.
- Props: `lang: Lang`, `t: Dict['nav']`.

### 6.2 SiteFooter

- Logo (sm) + tagline singkat · kolom link **yang hanya berisi rute valid**
  (Templates, Login, Buat Undangan) · `LangToggle` · copyright `© 2026 finWedding`.
- **Tidak ada link mati** — Privacy/Terms/Press di-drop sampai halamannya ada.
- Props: `lang`, `t: Dict['footer']`.

### 6.3 LangToggle

- Dua state pill `ID | EN`, current = aktif (warna coral). Props `lang`.
- Set cookie + `router.refresh()`. `aria-pressed` untuk a11y. Min tap-target 44px (global).

---

## 7. Redesign landing `/`

`src/app/page.tsx` = **server component**: baca `lang`+`dict`, render `<SiteNav>` +
section + `<SiteFooter>`. Section dibuat sebagai komponen di `src/components/marketing/`
(client di mana butuh reveal animasi). Tiap section terima slice teks sebagai prop.

> **Reveal animasi — catatan akurasi:** `useScrollReveal` yang ada itu **scoped ke template
> Lovebirds** (`src/all-templates/lovebirds/hooks/useScrollReveal.js`). **Jangan** diimpor
> lintas-batas ke marketing — itu mengikat chrome publik ke satu template (justru dilarang
> arsitektur, lih. komentar `layout.tsx` soal theme leak). Buat hook **app-level**
> `src/hooks/useReveal.ts` (IntersectionObserver, ±15 baris, hormati `prefers-reduced-motion`).

```
src/components/marketing/
├── Hero.tsx + .module.css
├── Features.tsx + .module.css
├── TemplateShowcase.tsx + .module.css
├── HowItWorks.tsx + .module.css
└── FinalCta.tsx + .module.css
```

### 7.1 Daftar section + wiring CTA (semua rute REAL)

| # | Section | Isi | CTA → rute |
|---|---|---|---|
| 1 | **Hero** | kicker, headline, subcopy, visual **phone-mockup CSS** (tanpa gambar eksternal) | `Buat Undangan`→`/signup` · `Lihat Template`→`/templates` |
| 2 | **Features** | 3 kartu fitur **nyata**: (a) RSVP & Manajemen Tamu (b) Musik Latar (c) Galeri, Cerita & Amplop Digital | — |
| 3 | **TemplateShowcase** | 2 kartu besar: Lovebirds (accent coral) + Solary (accent purple), ambil meta dari `templateCatalog.js` | per kartu: `Preview`→`/{id}/{demoSlug}` · `Gunakan`→`/onboarding?template={id}` |
| 4 | **HowItWorks** | 3 langkah: Pilih template → Isi cerita & data → Bagikan link | — |
| 5 | **FinalCta** | ajakan daftar (panel gelap, blur dekoratif) | `Buat Undangan`→`/signup` |

> **Phone-mockup Hero** dibuat CSS-only (frame HP + kartu undangan bergradien pakai accent
> token), supaya tidak bergantung URL gambar eksternal yang dipakai di konsep. Screenshot
> asli boleh menggantikan nanti.

### 7.2 Copy bilingual landing (final)

**Hero** — lihat §4.2.

**Features (judul · deskripsi):**
- RSVP & Manajemen Tamu — "Kelola daftar tamu, konfirmasi kehadiran, plus-one, dan ucapan — rapi dalam satu dashboard." / *RSVP & Guest Management* — "Manage your guest list, attendance, plus-ones, and wishes — all in one tidy dashboard."
- Musik Latar — "Setel lagu favorit kalian, otomatis main begitu undangan dibuka." / *Background Music* — "Set your favorite song to play the moment the invitation opens."
- Galeri, Cerita & Amplop Digital — "Timeline kisah, galeri foto, dan amplop digital (transfer bank) — lengkap." / *Gallery, Story & Digital Gift* — "Story timeline, photo gallery, and digital gift (bank transfer) — all included."

**HowItWorks:**
- "Pilih template" / "Pick a template"
- "Isi cerita & data kalian" / "Add your story & details"
- "Bagikan link ke tamu" / "Share the link with guests"

**FinalCta** — judul "Siap bikin undangan kalian?" / "Ready to create yours?";
sub "Bangun dan lihat hasilnya sebelum dipublish." / "Build it and preview before you publish."
(**Sengaja tidak ada klaim harga/gratis** — plan enforcement belum aktif.)

### 7.3 Responsif (mobile-first, breakpoint token 768/1024)

- Base 320–767 → `@media (min-width:768px)` tablet → `@media (min-width:1024px)` desktop.
- Nav: hamburger <768 → inline ≥768.
- Hero: stack (teks lalu visual) → 2-kolom ≥1024.
- Features: 1 → 2 (≥768) → 3 (≥1024) kolom.
- Showcase: 1 → 2 (≥1024) kolom.
- HowItWorks: 1 → 3 baris (≥768).
- Container `--container-max` (1240px) + `--container-pad`.

---

## 8. Terjemahan seluruh permukaan (cakupan penuh)

Pendekatan seragam: **ekstrak setiap string user-facing → key dict → render dari prop**.
Tiap halaman/komponen client menerima slice dict dari server ancestor terdekat.

### 8.1 Publik + auth + onboarding

| Surface | File | Catatan |
|---|---|---|
| Landing | `app/page.tsx` (rewrite) | §7 |
| Templates | `app/templates/page.tsx` | sisipkan SiteNav/Footer, terjemahkan copy; styling kartu **tetap** |
| Login (global) | `app/login/page.tsx` + `LoginForm.tsx` | dict via prop; LangToggle pojok |
| Signup | `app/signup/page.tsx` + `SignupForm.tsx` | idem |
| Onboarding | `app/onboarding/page.tsx` + `OnboardingForm.tsx` (+ `actions.ts` utk pesan) | wizard 5 field |
| Forgot pwd | `app/forgot-password/page.tsx` | |
| Reset pwd | `app/reset-password/page.tsx` | |
| Verify signup | `app/verify-signup/page.tsx` | |

`templateCatalog.js` punya `description` Bahasa. Karena dipakai di /templates **dan**
showcase landing, pindahkan teks deskripsi ke `dict` (key per template id), katalog cukup
simpan id/label/accent/tags/demoSlug/thumbnail.

### 8.2 Dashboard + editor (bagian terbesar)

Login per-slug dashboard + chrome + semua tab + editor. Inventaris:

```
app/[template]/[slug]/dashboard/
  page.tsx (server: baca lang→props)  DashboardClient.tsx  LoginForm.tsx  loading.tsx
  RsvpsTab.tsx  GiftsTab.tsx  GuestsTab.tsx  MusicTab.tsx  BackgroundTab.tsx  NotesTab.tsx
  GuestImportModal.tsx  GuestEditModal.tsx
  guests/actions.ts (pesan hasil)   lib/csv.ts (header CSV — pertimbangkan tetap/EN)
src/editor/
  EditorRoot  SectionList  SectionRow  PreviewPane  SaveBar  AddSectionMenu  FieldEditor  EditorProvider
  fields/ (Text, Textarea, Datetime, Boolean, Image, ImageArray, Select, ObjectArray, Audio)
  schemas/ (lihat wrinkle di bawah)
```

- `dashboard/page.tsx` (server) baca `getLang()` → kirim `dict.dashboard` ke `DashboardClient`,
  yang teruskan ke tab & editor lewat props atau **React context** (`DashboardI18nProvider`)
  agar tidak prop-drilling dalam-dalam. (Context client OK — bukan rahasia.)
- **LangToggle** muncul di header dashboard juga.

**Wrinkle — label di `editor/schemas/*.ts`:** schema mendefinisikan `label` field
(mis. "Judul", "Subjudul") yang tampil di editor. Schema = data TS biasa, tidak bisa
panggil `getDict`. **Pendekatan yang dipilih:** ubah `label: string` → `label: { id: string; en: string }`
(atau `labelKey` yang di-resolve `FieldEditor` terhadap dict). `FieldEditor`/`SectionRow`
memilih sesuai `lang` dari context. Ini menyentuh **semua file schema** + tempat yang baca `.label`.
Ini bagian paling memakan waktu — eksekusi setelah dict & context dashboard siap.

**Keputusan kecil yang perlu ditetapkan saat implementasi:** header CSV export (`lib/csv.ts`)
— ikut bahasa UI atau dikunci EN? Default rekomendasi: **ikut bahasa UI**.

---

## 9. Peta file (ringkas)

**Baru (~i18n + komponen):**
```
src/lib/i18n/{config,getLang,index}.ts
src/lib/i18n/dictionaries/{common,landing,templates,auth,onboarding,dashboard}.ts
src/components/site/{Logo,SiteNav,SiteFooter,LangToggle}.tsx (+ .module.css)
src/components/marketing/{Hero,Features,TemplateShowcase,HowItWorks,FinalCta}.tsx (+ .module.css)
src/hooks/useReveal.ts                  // IntersectionObserver reveal, app-level & template-agnostic
src/app/[template]/[slug]/dashboard/DashboardI18nProvider.tsx (context)  // jika dipakai
```

**Dimodifikasi:**
```
src/app/layout.tsx                      // <html lang> dinamis + metadata finWedding
src/app/page.tsx                        // rewrite total → landing baru
src/app/templates/page.tsx              // + chrome + i18n
src/app/login/{page,LoginForm}.tsx
src/app/signup/{page,SignupForm}.tsx
src/app/onboarding/{page,OnboardingForm,actions}.ts(x)
src/app/{forgot-password,reset-password,verify-signup}/page.tsx
src/app/[template]/[slug]/dashboard/*  // page + DashboardClient + 6 tab + 2 modal + LoginForm + guests/actions
src/editor/**                          // semua komponen + fields + schemas (label bilingual)
src/config/templateCatalog.js          // pindahkan description → dict
```

---

## 10. Milestone (urutan eksekusi dalam satu rencana)

- **A. Fondasi i18n + brand** — `lib/i18n/*`, `LangToggle`, `Logo`, `<html lang>` dinamis,
  metadata finWedding. (Tidak ada perubahan tampak besar selain logo.)
- **B. Chrome reusable** — `SiteNav` + `SiteFooter` + dict `common`.
- **C. Redesign landing** — 5 komponen marketing + rewrite `page.tsx` + dict `landing`.
- **D. i18n publik/auth/onboarding** — templates, login, signup, onboarding, forgot/reset/verify
  + pindah deskripsi katalog.
- **E. i18n dashboard + editor** — chrome dashboard, 6 tab, modal, editor, **schema label bilingual**.

Tiap milestone: build harus hijau sebelum lanjut.

---

## 11. Edge case & risiko

1. **Key dict hilang** → dicegah oleh `type Dict = typeof dict['id']` (EN wajib lengkap).
2. **Flash bahasa salah saat pertama load** → tidak terjadi: SSR baca cookie sebelum render.
3. **`getLang()` di client** → dilarang (server-only). Selalu lewat prop/context dari server.
4. **Prop-drilling dashboard** → pakai `DashboardI18nProvider` (context) untuk tab/editor.
5. **Schema label** (§8.2) = perubahan terluas; bisa memecah editor kalau ada tempat baca
   `.label` sebagai string yang terlewat — audit semua pembaca `.label`.
6. **`<html lang>` + caching** — App Router render dinamis karena `cookies()` membuat route
   dynamic; pastikan tidak ada `export const dynamic = 'force-static'` yang bentrok.
7. **Test existing (34)** — menguji logika `lib/guests/*` (phone, parse-import, crypto),
   bukan string UI → seharusnya tetap pass. Jalankan untuk memastikan.
8. **CSS Modules + token** — semua warna via `var(--color-*)`; jangan hardcode hex baru.
9. **Marketing harus template-agnostic** — chrome & landing tidak boleh impor apa pun dari
   `src/all-templates/<template>/` (hook, CSS, komponen). Showcase cukup baca data dari
   `templateCatalog.js` (id/label/accent/tags/demoSlug). Mencegah satu template "bocor"
   ke halaman publik.

---

## 12. Rencana verifikasi

- `npm run dev` → cek `/`, `/templates`, `/login`, `/signup`, `/onboarding`, dan satu
  dashboard demo di **320 / 768 / 1024px**.
- Toggle bahasa: ganti di landing → navigasi ke /templates & /login → **bahasa persist**
  (cookie). Reload → tetap. Ganti di dashboard → tab & editor ikut.
- Semua CTA mengarah ke rute benar (signup/templates/login/onboarding/preview).
- Tidak ada link mati.
- `npm run build` bersih; `npm test` 34 test pass.
- Cek `prefers-reduced-motion` mematikan animasi reveal/float.

---

## 13. Open questions

- (Minor) Header CSV export ikut bahasa UI atau kunci EN? → default: ikut UI.
- (Minor) Favicon finWedding sekarang atau menyusul? → default: menyusul (nice-to-have).
