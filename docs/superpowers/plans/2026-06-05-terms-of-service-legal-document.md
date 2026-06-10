# Syarat & Ketentuan (Terms of Service) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah kerangka Syarat & Ketentuan menjadi dokumen hukum lengkap, profesional, dan siap-publish untuk platform undangan digital FIN.WEDDING — dikonsolidasikan menjadi **13 pasal utama bersub-bagian** (bukan 37 pasal terpisah) — lalu mengintegrasikannya ke halaman `/terms` dengan guard test anti-drift dan satu dokumen internal "Analisis Risiko Hukum".

**Architecture:** Konten legal ditulis sekali sebagai sumber portabel di `docs/legal/syarat-ketentuan.md`, lalu di-transkripsi ke komponen JSX presentational `TermsContent.tsx` (mengikuti pola `PrivacyContent.tsx`/`RefundContent.tsx` yang sudah ada). Halaman `/terms` diubah dari JSX inline menjadi `<LegalLayout><TermsContent/></LegalLayout>`. Sebuah vitest membaca kedua berkas sebagai teks dan menjamin (a) semua pasal & topik wajib ada, (b) tidak ada placeholder liar di luar allow-list, (c) markdown ↔ TSX tidak drift, (d) halaman benar-benar memakai `<TermsContent/>`.

**Tech Stack:** Next.js 14 (App Router, RSC), TypeScript, CSS Modules (`legal.module.css` `.prose`), Vitest 1.6 (runner: `npm test`). Tanpa jsdom/testing-library — guard test berbasis `fs` + assertion teks. Tanpa pipeline MDX (tidak ditambah — di luar scope).

---

## Konteks & Keadaan Saat Ini

| Berkas | Peran sekarang | Tindakan |
|---|---|---|
| `src/app/terms/page.tsx` | Konten T&C **inline JSX**, 12 `<h2>` pasal, `draftNote` draf | Diubah → render `<TermsContent/>` |
| `src/components/legal/TermsContent.tsx` | **belum ada** | **Dibuat** (mirror pola PrivacyContent) |
| `docs/legal/syarat-ketentuan.md` | Markdown referensi, 12 pasal, banyak `[…]` | **Ditulis ulang** → 13 pasal (bersub-bagian) |
| `src/components/legal/LegalLayout.tsx` | Shell legal; prop `draftNote` | `draftNote` dilepas saat publish |
| `src/components/legal/PrivacyContent.tsx` / `RefundContent.tsx` | Sudah lengkap | **Tidak disentuh** (acuan pola saja) |
| `src/lib/legal/__tests__/` | belum ada | **Dibuat** (`terms-content.test.ts`) |

**Pola yang diikuti** (penting — jangan menyimpang):
- Komponen konten = JSX presentational murni (`<h2>`, `<h3>`, `<p>`, `<ul><li>`), tanpa `'use client'`, aman dirender dari Server (page) maupun Client (modal). Lihat `PrivacyContent.tsx`.
- Typografi diwarisi dari `.prose` di `legal.module.css` — **jangan** menambah style inline di konten.
- Markdown di `docs/legal/` = salinan portabel/baca-manusia; berkas `.tsx` = yang benar-benar tayang. Keduanya dijaga sinkron oleh guard test.

## Keputusan Desain (locked)

1. **Konsolidasi 37 → 13 pasal.** Tidak ada poin yang dibuang; semua tema lama menjadi **sub-bagian** (`### x.y`) di dalam 13 pasal payung. Lihat tabel "Inventaris Pasal".
2. **Scope = Syarat & Ketentuan saja.** Privasi & Refund sudah punya konten penuh dan **di luar scope** (boleh follow-up). Sub-bagian Perlindungan Data (7.1) & Pengembalian Dana (8.5) cukup **meringkas + menunjuk** ke `/privacy` dan `/refund`, bukan menduplikasi.
3. **Brand vs entitas.** Pakai nama layanan **"FIN.WEDDING"** konsisten (sudah dipakai `PrivacyContent.tsx`). Fakta entitas resmi yang **tidak boleh dikarang** disimpan di blok Identitas (1.1) sebagai placeholder yang disetujui.
4. **Allow-list placeholder** (satu-satunya yang boleh tersisa di teks publish):
   `[ALAMAT]`, `[EMAIL]`, `[NOMOR WHATSAPP]`, `[DOMAIN]`, `[TANGGAL BERLAKU]`, `[PENGADILAN NEGERI]`.
   Selain itu = bug konten (di-fail oleh test).
5. **Analisis Risiko Hukum = dokumen internal**, `docs/legal/syarat-ketentuan-analisis-risiko.md`. **Tidak** ditayangkan di website.
6. **Dasar hukum yang dirujuk:** UU No. 27/2022 (PDP), UU No. 11/2008 jo. UU No. 19/2016 jo. UU No. 1/2024 (ITE), UU No. 8/1999 (Perlindungan Konsumen — khususnya **Pasal 18 klausula baku**), KUHPerdata (Pasal 1320).
7. **Bahasa:** Indonesia formal saja (halaman legal eksisting ID-only).

## Peta Berkas

```
wedding-saas-next/
├── docs/legal/
│   ├── syarat-ketentuan.md                       (DITULIS ULANG — sumber portabel, 13 pasal)
│   └── syarat-ketentuan-analisis-risiko.md        (BARU — internal, tidak publish)
├── src/
│   ├── app/terms/page.tsx                          (MODIF — render <TermsContent/>)
│   ├── components/legal/
│   │   └── TermsContent.tsx                        (BARU — JSX presentational)
│   └── lib/legal/__tests__/
│       └── terms-content.test.ts                   (BARU — guard anti-drift/placeholder)
```

---

## Inventaris Pasal (sumber kebenaran untuk konten & test)

13 pasal payung. Judul `## N. Judul` harus **sama persis** di `.md` dan disebut `<h2>N. Judul</h2>` di `.tsx`. Kolom "Topik wajib" = sub-bagian (`### `) yang harus ada — masing-masing dijaga oleh `REQUIRED_TOPICS` di test agar tema hasil-merge tidak hilang.

| # | Judul Pasal | Sub-bagian / Topik wajib (deterministik — tulis semuanya) | Asal (lama) |
|---|---|---|---|
| 1 | **Definisi dan Identitas Penyedia** | **1.1 Identitas Penyedia** (FIN.WEDDING, `[ALAMAT]`, `[EMAIL]`, `[NOMOR WHATSAPP]`, `[DOMAIN]`, `[TANGGAL BERLAKU]`). **1.2 Definisi**: Layanan, Penyedia/Kami, Pengguna/Anda, Tamu, Konten Pengguna, Akun, Undangan/Slug, Paket, Masa Aktif, Gerbang Pembayaran, Pihak Ketiga. | 0,1 |
| 2 | **Penerimaan dan Perubahan Ketentuan** | Persetujuan terikat saat daftar/menggunakan; mencakup Kebijakan Privasi & Pengembalian Dana sebagai kesatuan; bila tidak setuju → hentikan penggunaan. Perubahan: pemberitahuan via situs/email; berlaku sejak dipublikasikan; penggunaan berkelanjutan = persetujuan. | 2,3 |
| 3 | **Akun: Kelayakan dan Keamanan** | **3.1 Kelayakan**: min. 18 th / sudah menikah; cakap hukum (Ps. 1320 KUHPerdata); bukan dalam pengampuan. **3.2 Keamanan Akun**: data benar/akurat/terkini; rahasiakan kata sandi; semua aktivitas via akun = tanggung jawab Pengguna; wajib lapor penyalahgunaan; kebijakan kata sandi (min. 8 + huruf besar + angka + simbol). | 4,5 |
| 4 | **Lingkup Layanan** | Templat diisi sendiri → tayang `[DOMAIN]/<templat>/<slug>`; **1 pembelian = 1 pasangan/acara**; tayang setelah pembayaran terkonfirmasi; aktif selama Masa Aktif (rujuk Pasal 8). | 6 |
| 5 | **Hak, Kewajiban, dan Larangan Pengguna** | **5.1 Hak Pengguna**: buat/sunting undangan selama Masa Aktif sesuai paket; bagikan tautan; kumpulkan RSVP/ucapan/konfirmasi hadiah; akses & salinan data; dukungan pelanggan. **5.2 Kewajiban Pengguna**: kendali penuh atas Konten; penggunaan sah; jaminan hak/izin konten; akurasi info acara; patuh UU ITE. **5.3 Larangan Penggunaan**: konten SARA/diskriminasi/ujaran kebencian/vulgar-pornografi/ancaman/judi/iklan pihak ketiga; konten melanggar hukum/hak pihak ketiga/malware; meretas/membebani/reverse-engineering/scraping; menyisipkan tautan platform lain; penipuan/menyamar; jual-kembali akun. Konsekuensi → Pasal 10. | 7,8,9 |
| 6 | **Konten Pengguna, Hak Cipta, dan Lisensi** | **6.1 Konten Pengguna & Moderasi**: penanggung jawab tunggal; Kami tidak menyaring/memvalidasi; berhak (tanpa wajib) menghapus/memoderasi. **6.2 Hak Cipta & HKI**: HKI Penyedia (templat, kode, logo, merek FIN.WEDDING; Pengguna dapat lisensi pakai terbatas non-komersial) + jaminan HKI Konten (foto→izin fotografer; musik/audio→lisensi sah; **embed YouTube/Vimeo**→berhak menyemat tanpa hapus atribusi/iklan, Kami hanya penampil; teks/nama→berhak mencantumkan). **6.3 Lisensi kepada Penyedia**: terbatas, non-eksklusif, bebas royalti, global, dapat dialihkan ke subprosesor (hosting), semata-mata untuk menjalankan Layanan; kepemilikan tetap Pengguna. **6.4 Pelaporan & Penurunan Konten (Notice-and-Takedown)**: aduan ke `[EMAIL]`; info yang diperlukan; pelanggar berulang → Pasal 10. | 10,11,12,31 |
| 7 | **Data Pribadi, Data Tamu, dan RSVP** | **7.1 Perlindungan Data Pribadi**: tunduk UU PDP 27/2022; ringkas + tunjuk `/privacy`; hak subjek data; Kebijakan Privasi bagian tak terpisahkan. **7.2 Data Tamu & RSVP**: Pengguna = pengendali data atas data Tamu, wajib dasar hukum/persetujuan Tamu; pengisian langsung oleh Tamu = persetujuan; Penyedia = prosesor atas instruksi. | 13,14 |
| 8 | **Pembayaran, Masa Aktif, dan Pengembalian Dana** | **8.1 Pembayaran**: via **Xendit** (berizin/diawasi OJK); Kami tak simpan data kartu; harga saat checkout dapat berubah untuk pesanan baru; pajak bila berlaku; kesalahan transfer di luar sistem bukan tanggung jawab Kami. **8.2 Masa Aktif Paket**: aktif selama Masa Aktif (termasuk pasca hari-H bila paket berjalan); **nonaktif otomatis** saat berakhir. **8.3 Upgrade & Perpanjangan**: tunduk harga berlaku; selisih upgrade non-refundable; tanpa auto-renew kecuali dinyatakan. **8.4 Pembatalan Pesanan**: sebelum aktivasi/konfirmasi bayar; setelah aktivasi mengikuti 8.5. **8.5 Pengembalian Dana**: ringkas + tunjuk `/refund`; produk digital final/non-refundable kecuali (kelebihan/ganda/salah transfer atau gagal aktif karena kesalahan teknis Kami); tanpa prorata; **catatan UUPK** hak konsumen atas produk cacat tetap berlaku. **8.6 Fitur Amplop Digital**: hanya menampilkan info rekening/dompet Pengguna; Kami **tidak** menampung/memproses/mendistribusikan dana hadiah; transaksi langsung pemberi↔Pengguna. | 15,16,17,18,19,30 |
| 9 | **Jaminan Terbatas, Tanggung Jawab, dan Ganti Rugi** | **9.1 Ketersediaan "Sebagaimana Adanya" & Force Majeure**: tanpa jaminan bebas gangguan/galat; pemeliharaan terjadwal/darurat; tak bertanggung jawab atas force majeure (bencana, listrik/internet, kegagalan hosting/gateway, kebijakan pemerintah). **9.2 Integrasi & Layanan Pihak Ketiga**: subprosesor utama (Supabase, Xendit, Resend, YouTube/Vimeo, peta); tunduk S&K masing-masing. **9.3 Pembatasan Tanggung Jawab** *(REVIEW LEGAL — Pasal 18 UUPK)*: tak bertanggung jawab atas kerugian tidak langsung/insidental/konsekuensial/kehilangan keuntungan/data; **batas total** = maksimum biaya yang dibayar untuk undangan terkait dalam 12 bulan terakhir. **9.4 Ganti Rugi (Indemnifikasi)** *(REVIEW LEGAL)*: Pengguna membebaskan & mengganti rugi Penyedia (termasuk biaya hukum wajar) atas klaim dari penggunaan/pelanggaran S&K/Konten Pengguna. | 20,21,22,23 |
| 10 | **Penangguhan, Penghentian, dan Penghapusan Data** | **10.1 Penangguhan & Penghentian Akun**: hak atas pelanggaran; tanpa pemberitahuan untuk pelanggaran berat (konten ilegal, pelanggaran HKI berulang, penipuan); efek: undangan dinonaktifkan; tanpa refund bila akibat pelanggaran; Pengguna boleh berhenti kapan saja. **10.2 Penghapusan & Retensi Data**: pasca tutup/Masa Aktif berakhir data dapat dihapus/dianonimkan setelah retensi (selaras Kebijakan Privasi); backup wajar untuk keamanan/audit; Pengguna boleh minta hapus lebih awal kecuali kewajiban hukum. **10.3 Perubahan atau Penghentian Layanan** *(REVIEW LEGAL — komitmen refund prorata)*: dapat menambah/ubah/hentikan fitur/Layanan dengan pemberitahuan wajar; bila penghentian permanen sebelum Masa Aktif habis tanpa kesalahan Pengguna → opsi refund prorata/pemindahan. | 24,25,26 |
| 11 | **Hukum yang Berlaku dan Penyelesaian Sengketa** | **11.1 Hukum yang Berlaku**: hukum Republik Indonesia. **11.2 Penyelesaian Sengketa** *(REVIEW LEGAL — pilihan forum)*: musyawarah dulu (mis. 30 hari); bila gagal → `[PENGADILAN NEGERI]` (atau arbitrase BANI bila dipilih). | 27,28 |
| 12 | **Ketentuan Lain-Lain** | **12.1 Komunikasi Elektronik & Pemberitahuan** (UU ITE; pemberitahuan ke email terdaftar/diumumkan di situs dianggap diterima). **12.2 Pengalihan Hak**: Pengguna tak boleh mengalihkan tanpa izin; Penyedia boleh karena merger/akuisisi dengan pemberitahuan. **12.3 Keterpisahan**: klausul batal tak membatalkan sisanya. **12.4 Pelepasan Hak**: kegagalan menegakkan hak bukan pelepasan. **12.5 Keseluruhan Perjanjian**: S&K + Privasi + Pengembalian Dana = keseluruhan perjanjian. **12.6 Bahasa**: disusun dalam Bahasa Indonesia; versi Indonesia yang berlaku. | 32–37 |
| 13 | **Kontak** | FIN.WEDDING — `[EMAIL]` — `[NOMOR WHATSAPP]` — `[ALAMAT]`. | 29 |

---

## Task 1: Guard test (TDD merah dulu)

**Files:**
- Create: `src/lib/legal/__tests__/terms-content.test.ts`

- [ ] **Step 1: Tulis test yang gagal**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

// `vitest run` dijalankan dari root paket wedding-saas-next → process.cwd() = root.
const root = process.cwd()
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

const md = read('docs/legal/syarat-ketentuan.md')
const tsx = read('src/components/legal/TermsContent.tsx')
const page = read('src/app/terms/page.tsx')

/** 13 judul pasal payung — identik di markdown (## N. ...) dan TSX (<h2>N. ...</h2>). */
const REQUIRED_ARTICLES = [
  '1. Definisi dan Identitas Penyedia',
  '2. Penerimaan dan Perubahan Ketentuan',
  '3. Akun: Kelayakan dan Keamanan',
  '4. Lingkup Layanan',
  '5. Hak, Kewajiban, dan Larangan Pengguna',
  '6. Konten Pengguna, Hak Cipta, dan Lisensi',
  '7. Data Pribadi, Data Tamu, dan RSVP',
  '8. Pembayaran, Masa Aktif, dan Pengembalian Dana',
  '9. Jaminan Terbatas, Tanggung Jawab, dan Ganti Rugi',
  '10. Penangguhan, Penghentian, dan Penghapusan Data',
  '11. Hukum yang Berlaku dan Penyelesaian Sengketa',
  '12. Ketentuan Lain-Lain',
  '13. Kontak',
]

/** Topik hasil-merge yang WAJIB tetap ada (penjaga agar konsolidasi tak menghilangkan tema). */
const REQUIRED_TOPICS = [
  'Identitas Penyedia',
  'Definisi',
  'Kelayakan',
  'Keamanan Akun',
  'Hak Pengguna',
  'Kewajiban Pengguna',
  'Larangan Penggunaan',
  'Moderasi',
  'Hak Cipta',
  'Lisensi kepada Penyedia',
  'Notice-and-Takedown',
  'Perlindungan Data Pribadi',
  'Data Tamu',
  'Pembayaran',
  'Masa Aktif',
  'Upgrade',
  'Pembatalan',
  'Pengembalian Dana',
  'Amplop Digital',
  'Force Majeure',
  'Pihak Ketiga',
  'Pembatasan Tanggung Jawab',
  'Ganti Rugi',
  'Penangguhan',
  'Penghapusan',
  'Penghentian Layanan',
  'Hukum yang Berlaku',
  'Penyelesaian Sengketa',
  'Komunikasi Elektronik',
  'Pengalihan Hak',
  'Keterpisahan',
  'Pelepasan Hak',
  'Keseluruhan Perjanjian',
  'Bahasa',
]

/** Satu-satunya placeholder UPPERCASE yang boleh tersisa di teks publish. */
const ALLOWED_PLACEHOLDERS = [
  '[ALAMAT]',
  '[EMAIL]',
  '[NOMOR WHATSAPP]',
  '[DOMAIN]',
  '[TANGGAL BERLAKU]',
  '[PENGADILAN NEGERI]',
]

describe('Syarat & Ketentuan — kelengkapan & anti-drift', () => {
  it('markdown memuat setiap heading pasal payung', () => {
    for (const title of REQUIRED_ARTICLES) {
      expect(md, `markdown kurang "## ${title}"`).toContain(`## ${title}`)
    }
  })

  it('TermsContent.tsx mencerminkan setiap pasal (tanpa drift)', () => {
    for (const title of REQUIRED_ARTICLES) {
      expect(tsx, `TermsContent.tsx kurang "${title}"`).toContain(title)
    }
  })

  it('semua topik hasil-merge masih ada di markdown dan TSX', () => {
    for (const topic of REQUIRED_TOPICS) {
      expect(md, `markdown kehilangan topik "${topic}"`).toContain(topic)
      expect(tsx, `TSX kehilangan topik "${topic}"`).toContain(topic)
    }
  })

  it('tidak ada placeholder UPPERCASE di luar allow-list', () => {
    // Cocokkan hanya token [HURUF BESAR ...]; abaikan tautan markdown [Teks](url).
    const re = /\[[A-Z][A-Z\s./-]*\]/g
    for (const [label, text] of [['markdown', md], ['tsx', tsx]] as const) {
      const stray = [...text.matchAll(re)]
        .map((m) => m[0])
        .filter((p) => !ALLOWED_PLACEHOLDERS.includes(p))
      expect([...new Set(stray)], `placeholder liar di ${label}`).toHaveLength(0)
    }
  })

  it('halaman /terms merender <TermsContent/>', () => {
    expect(page).toContain("from '@/components/legal/TermsContent'")
    expect(page).toContain('<TermsContent')
  })
})
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npm test -- terms-content`
Expected: FAIL — `ENOENT` (TermsContent.tsx belum ada) atau assertion heading/topik hilang.

---

## Task 2: Tulis ulang markdown sumber

**Files:**
- Modify (rewrite): `docs/legal/syarat-ketentuan.md`

- [ ] **Step 1:** Tulis ulang seluruh berkas mengikuti **Inventaris Pasal** (13 pasal). Aturan format:
  - H1 `# Syarat & Ketentuan Layanan FIN.WEDDING`, diikuti satu baris: `_Tanggal berlaku: [TANGGAL BERLAKU]. Dokumen ini merupakan perjanjian yang mengikat secara hukum._`
  - Tiap pasal: `## N. Judul` (judul **persis** dari `REQUIRED_ARTICLES`), pengantar 1 paragraf ramah, lalu sub-bagian `### x.y Judul` sesuai kolom "Topik wajib".
  - Sertakan SEMUA topik wajib; teks tiap sub-bagian ditulis penuh & profesional (bukan ringkasan satu kalimat).
  - Setiap string `REQUIRED_TOPICS` harus muncul apa adanya (mis. tulis sub-judul "Notice-and-Takedown", "Force Majeure", "Amplop Digital", dst.).
  - Cross-reference pakai teks + nomor pasal (mis. "lihat Pasal 10"), **bukan** tautan markdown ke teks berhuruf besar (agar tak memicu regex placeholder).
  - Hanya boleh memakai placeholder dari `ALLOWED_PLACEHOLDERS`. Semua `[NAMA APLIKASI]`, `[domain]`, `[…]`, `[NAMA USAHA]` lama → "FIN.WEDDING" atau placeholder yang disetujui.
  - Untuk sub-bagian ber-tanda *(REVIEW LEGAL)* (9.3, 9.4, 10.3, 11.2): tulis klausulnya penuh & profesional seperti final. **JANGAN** menaruh teks "REVIEW LEGAL" di berkas publish — catatan risiko hidup di Task 6.

- [ ] **Step 2:** Jalankan `npm test -- terms-content`
Expected: test heading markdown & topik (sisi md) & placeholder md → PASS; test TSX masih FAIL. Perbaiki bila ada placeholder/topik yang gagal.

---

## Task 3: Buat komponen TermsContent.tsx

**Files:**
- Create: `src/components/legal/TermsContent.tsx`

- [ ] **Step 1:** Buat komponen presentational yang men-transkripsi `syarat-ketentuan.md` ke JSX. Kerangka (isi seluruh 13 pasal + sub-bagian dari markdown):

```tsx
/**
 * Syarat & Ketentuan — body content only (no page chrome).
 *
 * Transkripsi 1:1 dari docs/legal/syarat-ketentuan.md. Dirender oleh route
 * /terms (dibungkus LegalLayout) dan dapat dipakai ulang oleh modal consent
 * (dibungkus LegalModal) — satu sumber teks agar tak drift. JSX presentational
 * murni: aman dirender dari Server maupun Client.
 *
 * Placeholder yang tersisa ([ALAMAT], [EMAIL], [NOMOR WHATSAPP], [DOMAIN],
 * [TANGGAL BERLAKU], [PENGADILAN NEGERI]) = fakta entitas yang wajib diisi
 * sebelum publish — lihat docs/legal/syarat-ketentuan-analisis-risiko.md.
 */
export default function TermsContent() {
  return (
    <>
      <p>
        Selamat datang di FIN.WEDDING. Syarat &amp; Ketentuan ini merupakan
        perjanjian yang mengikat secara hukum antara Anda dan FIN.WEDDING…
      </p>

      <h2>1. Definisi dan Identitas Penyedia</h2>
      <h3>1.1 Identitas Penyedia</h3>
      <ul>
        <li>Nama layanan: FIN.WEDDING</li>
        <li>Alamat: <code>[ALAMAT]</code></li>
        <li>Email: <code>[EMAIL]</code></li>
        <li>WhatsApp: <code>[NOMOR WHATSAPP]</code></li>
        <li>Situs: <code>[DOMAIN]</code></li>
        <li>Tanggal berlaku: <code>[TANGGAL BERLAKU]</code></li>
      </ul>
      <h3>1.2 Definisi</h3>
      {/* … */}

      {/* … seluruh pasal 2–13 dengan sub-bagian ### x.y, mirror markdown … */}

      <h2>13. Kontak</h2>
      <p>…</p>
    </>
  )
}
```

  Aturan transkripsi:
  - `## N. Judul` → `<h2>N. Judul</h2>`; `### x.y Judul` → `<h3>x.y Judul</h3>`; paragraf → `<p>`; daftar → `<ul><li>` / `<ol>`.
  - Escape entity: `&` → `&amp;`, `<` → `&lt;`. Placeholder dibungkus `<code>…</code>` (konsisten PrivacyContent).
  - Pastikan setiap string `REQUIRED_TOPICS` muncul apa adanya di JSX.
  - **Jangan** menambah `'use client'` dan **jangan** style inline (warisi `.prose`).

- [ ] **Step 2:** Jalankan `npm test -- terms-content`
Expected: test heading TSX, topik (sisi tsx), placeholder tsx → PASS. Test "halaman /terms" masih FAIL.

---

## Task 4: Sambungkan halaman /terms

**Files:**
- Modify: `src/app/terms/page.tsx`

- [ ] **Step 1:** Ganti seluruh JSX inline dengan render komponen. Hasil akhir berkas:

```tsx
import LegalLayout from '@/components/legal/LegalLayout'
import TermsContent from '@/components/legal/TermsContent'

export const metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat & Ketentuan layanan undangan pernikahan digital FIN.WEDDING.',
}

export default function TermsPage() {
  return (
    <LegalLayout title="Syarat & Ketentuan" updated="[TANGGAL BERLAKU]">
      <TermsContent />
    </LegalLayout>
  )
}
```

  Catatan: hapus prop `draftNote` (dokumen versi siap-publish; banner "DRAF" tak lagi tampil). `updated` memakai `[TANGGAL BERLAKU]` — masuk allow-list, diisi saat go-live.

- [ ] **Step 2:** Jalankan `npm test -- terms-content`
Expected: **semua 5 test PASS**.

- [ ] **Step 3:** Suite penuh anti-regresi: `npm test`
Expected: semua hijau (suite eksisting + test baru).

- [ ] **Step 4: Commit**

```bash
git add docs/legal/syarat-ketentuan.md src/components/legal/TermsContent.tsx src/app/terms/page.tsx src/lib/legal/__tests__/terms-content.test.ts
git commit -m "feat(legal): consolidated Terms of Service (13 pasal) + guard test, render via TermsContent"
```

---

## Task 5: Verifikasi render di browser (smoke)

**Files:** — (tidak ada perubahan)

- [ ] **Step 1:** `npm run dev`
- [ ] **Step 2:** Buka `http://localhost:3000/terms`. Verifikasi:
  - Judul "Syarat & Ketentuan", **tanpa** banner draf.
  - 13 pasal + sub-bagian tampil berurutan dengan tipografi `.prose` (h2/h3/list rapi).
  - `/terms` tetap dapat diakses langsung (footer cross-nav legal sudah tak memuat link "Syarat & Ketentuan").
- [ ] **Step 3:** `npm run build`
Expected: build sukses, tanpa error TS/lint pada berkas baru.

---

## Task 6: Dokumen internal "Analisis Risiko Hukum"

**Files:**
- Create: `docs/legal/syarat-ketentuan-analisis-risiko.md`

- [ ] **Step 1:** Tulis dokumen internal (tidak dipublish):
  - **Ringkasan**: dokumen siap-pakai, tetapi butuh review advokat sebelum go-live.
  - **Placeholder wajib diisi**: tabel `[ALAMAT]`, `[EMAIL]`, `[NOMOR WHATSAPP]`, `[DOMAIN]`, `[TANGGAL BERLAKU]`, `[PENGADILAN NEGERI]` + sumber datanya.
  - **Area berisiko (prioritas tinggi)** — petakan ke nomor sub-bagian:
    1. **Pasal 9.3 & 9.4 (Pembatasan Tanggung Jawab & Indemnifikasi)** vs **Pasal 18 UU 8/1999** — klausul pengalihan tanggung jawab terlalu luas dapat **batal demi hukum**; perlu dipersempit advokat.
    2. **Pasal 10.3** — komitmen refund prorata bila Layanan dihentikan; pastikan selaras kemampuan finansial & Kebijakan Pengembalian Dana.
    3. **Pasal 11.2** — pilihan forum (PN vs BANI); tentukan domisili hukum entitas.
    4. **Pasal 8.5 / UUPK** — pastikan "non-refundable" tidak menutup hak konsumen atas produk cacat/tak sesuai.
    5. **Status entitas** (PT/CV/perorangan) → izin usaha (PSE Kominfo) & kewajiban pajak.
  - **Area berisiko (sedang)**: retensi data (selaras Kebijakan Privasi), notice-and-takedown (6.4), kewajiban pendaftaran PSE Lingkup Privat (Permenkominfo 5/2020).
  - **Rekomendasi**: review advokat + samakan tanggal berlaku ketiga dokumen legal (terms/privacy/refund).
- [ ] **Step 2: Commit**

```bash
git add docs/legal/syarat-ketentuan-analisis-risiko.md
git commit -m "docs(legal): internal legal-risk analysis for Terms of Service"
```

---

## Self-Review (checklist penulis plan)

- **Spec coverage:** 29 pasal pengguna + 8 audit (total 37 topik) seluruhnya terpetakan ke 13 pasal payung lewat kolom "Asal (lama)" & "Topik wajib"; tak ada yang hilang (dijaga `REQUIRED_TOPICS`). "Dokumen siap publish H1/H2/H3" → Task 2/3; "Analisis Risiko terpisah" → Task 6; "konsisten UU PDP/ITE/konsumen" → sub-bagian 7.1/12.1/8.5 + Keputusan #6; "minim placeholder" → allow-list + Task 1 guard; "[REVIEW LEGAL] di area berisiko" → tanda di inventaris (9.3/9.4/10.3/11.2/8.5) + Task 6. ✓
- **Placeholder scan:** Tidak ada "TBD/implement later"; tiap pasal punya topik wajib konkret; test code lengkap & runnable. ✓
- **Type/Name consistency:** Judul `REQUIRED_ARTICLES` (Task 1) = `## N.` (Task 2) = `<h2>N.</h2>` (Task 3); `REQUIRED_TOPICS` = string sub-judul yang ditulis di Task 2/3. Path berkas konsisten lintas task. ✓

---

## Catatan eksekusi

- **Out of scope (follow-up bila diinginkan):** menaikkan `PrivacyContent.tsx`/`RefundContent.tsx`, menyamakan tanggal berlaku ketiga dokumen, mengisi placeholder entitas asli, dan (opsional) memasang kembali link "Syarat & Ketentuan" ke footer bila gerbang pembayaran mensyaratkannya.
- **Data yang dibutuhkan sebelum go-live (dari pemilik bisnis):** nama badan usaha resmi, alamat, email kontak, nomor WhatsApp, domain final, tanggal berlaku, pilihan pengadilan/arbitrase.
