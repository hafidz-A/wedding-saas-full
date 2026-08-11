# Landing Page Audit: fincards.land

**Dibuat:** 2026-07-28 · **Direvisi:** 2026-07-28 (koreksi model bisnis)
**URL:** https://www.fincards.land
**Jenis bisnis:** SaaS undangan pernikahan digital, multi-template, bayar sekali
**Aksi konversi utama:** klik ke explorer (`/#vibe`) → onboarding → **bayar** → editor terbuka

---

## ⚠️ Koreksi penting — baca ini dulu

Versi pertama dokumen ini dibangun di atas premis **yang salah**: bahwa pasangan bisa merancang undangan lengkap gratis lalu bayar saat siap sebar. **Itu tidak benar.**

Yang benar, terverifikasi di kode (`src/app/[template]/[slug]/dashboard/page.tsx`):

```
if (period.status === 'draft' || period.status === 'expired') {
  return <PaymentGate ... />     // "Bayar Dulu" — bukan editor
}
```

**Model bisnisnya bayar dulu.** Pemilik yang belum bayar tidak bisa masuk editor sama sekali; yang bisa dia lakukan hanya *melihat* undangannya sendiri yang belum terbit. Tidak ada uji coba gratis.

Sumber kesalahannya: `CLAUDE.md` sendiri menulis "edits a live preview for free" — bertentangan dengan barisnya sendiri tentang PaymentGate, dan bertentangan dengan kode. Baris itu **sudah diperbaiki** supaya sesi berikutnya tidak mengulang kesalahan yang sama.

**Satu-satunya yang benar-benar gratis: demo publik di landing** (slug `demo-*`), tanpa perlu daftar.

Semua copy di situs sudah dikoreksi. Lima dokumen iklan lama masih mengandung klaim palsu — lihat bagian terakhir.

---

## Skor: 51 → 76 /100

| Kategori | Bobot | Sebelum | Sesudah |
|---|---|---|---|
| Message Match | 20% | 45 | **78** |
| CTA Clarity & Placement | 20% | 55 | **82** |
| Trust & Social Proof | 15% | 15 | **45** ⚠️ |
| Above-the-Fold Impact | 15% | 60 | **82** |
| Copy Quality | 10% | 50 | **88** |
| Form & Friction | 10% | 85 | 85 |
| Mobile Optimization | 5% | 85 | **88** |
| Page Speed | 5% | 35 | **88** |
| **Total tertimbang** | | **51** | **76** |

Turun dari 79 ke 76 setelah koreksi: sudut bebas-risiko yang tadinya menaikkan Message Match & ATF ternyata tidak sah. Penawaran jujurnya lebih lemah — tapi ini angka yang sebenarnya.

---

## Ringkasan eksekutif

### Tiga kekuatan
1. **Demo penuh bisa dibuka tanpa daftar** — ganti template, ganti 10 palette, buka undangan lengkap. Kompetitor kebanyakan cuma kasih screenshot. Ini alat penurun risiko paling jujur yang tersedia.
2. **Hook yang benar-benar berbeda** — "Undangan? Ini lebih mirip film pendek." Tidak generik, dan produknya menepati.
3. **Bayar sekali + kendali penuh di tangan pasangan.** Di pasar yang banyak diisi jasa "order via WA, admin yang buatkan, revisi terbatas", self-edit tanpa batas adalah pembeda nyata — dan ini yang seharusnya jadi sudut jualan utama.

### Tiga masalah kritis

**1. Nol sinyal kepercayaan → sekarang sebagian tertutup.** Tanpa testimoni, tanpa garansi, tanpa lencana pembayaran. Trust bar sudah dipasang dengan klaim terverifikasi, tapi **testimoni pelanggan asli masih nol** — dan karena modelnya bayar-dulu, bukti sosial jadi jauh lebih penting daripada kalau ada uji coba gratis. Ini penghambat terbesar yang tersisa.

**2. Empat register sapaan dalam satu halaman.** `kalian` (hero), `-mu` (explorer), `Anda` (features ×3), `anda` huruf kecil (CTA penutup — kalimat terakhir sebelum tombol beli). Melanggar aturan voice kamu sendiri. **Sudah diseragamkan ke `kamu`/`-mu`; sapuan akhir: nol kata ganti orang tersisa.**

**3. Harga tersembunyi di balik dua klik.** Untuk produk bayar-dulu, menyembunyikan harga adalah friksi terburuk yang bisa dipilih — pengunjung yang tidak menemukan harga akan berasumsi mahal lalu pergi. **Sudah diperbaiki:** jangkar harga tampil di hero, diambil dari `template_plans`.

---

## Yang sudah diperbaiki (live di kode, belum ter-deploy)

### Hero

**SEBELUM:**
> `UNDANGAN DIGITAL` · **Undangan? Ini lebih mirip film pendek.**
> Tamu scroll, cerita **kalian** terbuka scene demi scene… Pilih template, isi cerita, bagikan link-nya.
> `[Buat Undangan]` `[Lihat Template]`

**SESUDAH:**
> `DEMO LENGKAP, TANPA DAFTAR` · **Undangan? Ini lebih mirip film pendek.**
> Tamu scroll, ceritamu terbuka scene demi scene — dari gerbang pembuka sampai RSVP. Buka demo lengkapnya sekarang, lihat persis apa yang kamu dapat sebelum memutuskan.
> `[Lihat Template]`  *(satu tombol — pasangan lama sama-sama menuju `/#vibe`, jadi yang kedua tidak membeli apa pun)*
> *Mulai Rp 199.999 · Bayar sekali, tanpa langganan bulanan*

**Kenapa lebih baik:** kicker membawa penawaran jujur yang tersedia (demo tanpa daftar) alih-alih label kategori; judul dipertahankan karena sudah kuat; CTA menjanjikan persis apa yang tombolnya lakukan — dulu "Coba Gratis Sekarang" menjanjikan uji coba yang tidak ada **dan** mengarah ke explorer, bukan pendaftaran.

### Alur "tiga langkah" — urutannya dijujurkan

| | Sebelum | Sesudah |
|---|---|---|
| 1 | Pilih template | Pilih template & paket |
| 2 | Isi cerita & data | **Bayar sekali** — dashboard editor langsung terbuka |
| 3 | Bagikan link | Isi cerita & sebar link |

Versi lama menempatkan pengisian data **sebelum** pembayaran. Itu menggambarkan produk yang tidak ada.

### CTA penutup

**SEBELUM:** "Siap bikin undangan **kalian**?" / "Desain sesuai keinginan **anda**!" / `[Mulai Rancang Sekarang]`
**SESUDAH:** "Siap bikin undanganmu?" / "Buka demo lengkapnya, pilih paket, lalu atur undanganmu sendiri kapan saja. Bayar sekali, tanpa langganan." / `[Mulai Rancang Undangan]`

### Voice — disatukan ke `kamu / -mu`

`cerita kalian` → ceritamu · `momen spesial kalian` → spesialmu · `Anda dapat fokus` → Fokusmu tinggal satu · `lagu pilihan Anda` → pilihanmu · `rekening pilihan Anda` → pilihanmu · `keinginan anda` → undanganmu. Blok `showcase` yang sudah mati (tidak dirender sejak `4c54122`) dihapus — di situlah sisa "kalian" terakhir bersembunyi.

### Trust bar

Empat klaim di bawah hero, semuanya bisa dicek di kode: bayar sekali · pembayaran Midtrans · data tamu terenkripsi · jalur WhatsApp asli.

**Sengaja tanpa badge garansi.** Mekanisme refund ada (`refund_requests`, panel admin) tapi kebijakan di `/refund` tidak menyatakan jendela waktu apa pun — yang ada cuma "30 hari musyawarah sengketa" di Terms, dan itu bukan garansi uang kembali.

### Jangkar harga

**"Mulai Rp 199.999"** sebagai klausa pertama di bawah CTA hero, diambil dari baris `template_plans` termurah lewat `page.tsx` (`cheapestPlan`) — **bukan hardcode**. Klausanya hilang sendiri kalau plan tidak tersedia.

### FAQ

Lima pertanyaan sebelum CTA penutup, pakai `<details>`/`<summary>` **native** — nol JavaScript, aksesibel keyboard, atribut `name` memberi accordion eksklusif langsung dari browser (terverifikasi: membuka item 2 menutup item 1 sendiri). Pertanyaan pertama menjawab keberatan bayar-dulu secara langsung dan jujur.

---

## Performa — hero tidak lagi menyandera dirinya di balik JavaScript

**Diagnosis (produksi, Slow 4G + CPU 4x, viewport 390px):** LCP **6.273 ms**. TTFB cuma **27 ms** (server sehat); *render delay* **6.246 ms** = **99,6%**. Elemen LCP-nya `Hero_subtitle`.

**Dua akar masalah:**
1. `import * as THREE from 'three'` — seluruh three.js masuk **statis** ke bundel hero.
2. Copy hero dibungkus `motion.div` dengan `initial={{ opacity: 0 }}` — teks sudah ada di HTML server, tapi **tak terlihat** sampai React hidrasi.

**Perbaikan:** entrance dipindah ke CSS `@keyframes` (timing & easing di-port 1:1, tampilan tidak berubah); `Hero3dBackground` jadi `next/dynamic ssr:false`; lalu **dilewati sepenuhnya di bawah 768px** dan saat pengguna minta hemat-gerak — karena importnya dinamis, tidak merendernya berarti three.js tidak pernah diunduh di HP.

**Hasil — A/B build produksi, mesin & throttling sama:**

| Metrik | Baseline | Putaran 1 | Putaran 2 |
|---|---|---|---|
| **FCP** | 3.216 ms | ~836 ms | **740–912 ms** |
| DOMContentLoaded | 3.890 ms | 1.267 ms | ~930 ms |
| **JS diunduh (mobile)** | 463 KB | 464 KB | **334 KB** |
| Route `/` | 159 kB | 26,3 kB | 27,1 kB |
| First Load JS | 471 kB | 338 kB | 339 kB |
| WebGL di hero (mobile) | ya | ya | **tidak** |

Trust bar + FAQ 5 item hanya menambah **0,8 kB** ke route — hasil memilih `<details>` native ketimbang accordion ber-JavaScript.

### Verifikasi

`npx tsc --noEmit` bersih · `npx vitest run` **705 tes lolos** (termasuk paritas kamus ID/EN) · `npm run check:tokens` bersih · `npm run build` sukses · nol overflow horizontal di 390px · kicker muat satu baris · `prefers-reduced-motion` diuji **empiris** (animasi dimatikan → semua elemen tetap `opacity: 1`, tidak ada konten hilang).

---

## Prioritas berikutnya

| # | Aksi | Dampak | Usaha |
|---|---|---|---|
| 1 | **Bersihkan klaim palsu di 5 dokumen iklan** (di bawah) — mengiklankan uji coba gratis yang tidak ada bukan sekadar salah pesan, itu berisiko hukum & jaminan refund | Tinggi | Sedang |
| 2 | **Deploy** — semua perbaikan di dokumen ini terverifikasi lokal tapi **belum tayang** | Tinggi | Rendah |
| 3 | **Kumpulkan testimoni asli** — untuk produk bayar-dulu, bukti sosial bukan pelengkap, melainkan pengganti uji coba yang tidak kamu miliki | Tinggi | Sedang |
| 4 | **Pertimbangkan penurun risiko yang nyata** (di bawah) — ini keputusan produk, bukan copy | Tinggi | Tinggi |
| 5 | **Tetapkan jendela garansi refund** — mekanismenya sudah ada, kebijakannya belum menyebut periode. Tetapkan, tulis di `/refund`, lalu tambahkan ke trust bar | Sedang | Rendah |
| 6 | **Tinjau harga coret** — `compare_at_price_idr` aktif permanen (299.999→199.999 / 349.999→249.999). Kalau harga coret itu tidak pernah benar-benar berlaku, hapus: diskon semu berisiko ditolak platform iklan | Sedang | Rendah |

> **Koreksi:** butir "masa aktif tidak tampil di UI paket" yang sempat tercantum di sini **salah** dan sudah dicabut. `PlanDisplay` memang tidak punya field durasi bertipe, tapi masa aktif tetap sampai ke pembeli lewat array `features` (`"Masa aktif 1 tahun"` / `"Masa aktif seumur hidup"`), yang dirender di `VibePlanCard.tsx:73`. Tidak ada yang perlu diperbaiki.

### Aksi #4 — penurun risiko yang nyata (keputusan produk)

Model bayar-dulu punya satu kelemahan struktural: calon pembeli harus menyerahkan uang **sebelum** tahu undangannya bakal bagus dengan foto mereka sendiri. Kompetitor yang menawarkan preview gratis akan menang di titik ini. Tiga pilihan, dari termurah:

1. **Garansi uang kembali dengan jendela jelas** (mis. 7 hari, sebelum undangan disebar). Paling murah — mekanismenya sudah ada, tinggal kebijakan.
2. **Preview draft yang lebih kaya sebelum bayar** — biarkan onboarding menerima 1–2 foto dan tampilkan hasilnya di layar PaymentGate. Perubahan produk sedang, tapi menyerang keberatan #1 secara langsung.
3. **Buka editor terbatas sebelum bayar** (mis. bisa edit, tapi tidak bisa publish/sebar). Ini yang bikin sudut "rancang dulu" jadi sah — pekerjaan terbesar, dampak terbesar.

Sampai salah satunya ada, **jangan pernah** menulis copy bernuansa uji coba gratis.

---

## Selaraskan iklan dengan halaman baru

**Sudut lama yang saya sarankan sebelumnya — "Bikin undangannya dulu, bayar cuma kalau suka hasilnya" — BATAL. Jangan dipakai.** Itu mengiklankan produk yang tidak ada.

**Sudut utama yang jujur dan tetap kuat:**

> **"Undangannya kamu yang pegang. Bukan nunggu admin bales chat."**

Ini menang karena menyerang kompetitor di titik terlemah mereka: di pasar Indonesia, banyak jasa undangan digital dijalankan lewat WA dengan admin yang membuatkan dan revisi dibatasi. FinCards memberi kendali penuh ke pasangan, seketika, tanpa batas revisi — dan itu **benar**.

**Varian hook siap pakai** (voice terjaga: nol kata ganti orang, sapa "kamu"):

| # | Hook | Sudut |
|---|---|---|
| 1 | Undangannya kamu yang pegang. Bukan nunggu admin bales chat. | Kendali |
| 2 | Salah tanggal jam 11 malam? Ganti sendiri, detik itu juga. | Kendali (konkret) |
| 3 | Buka demo lengkapnya sekarang — tanpa daftar, tanpa isi form. | Transparansi |
| 4 | Bayar sekali. Bukan langganan bulanan yang lupa distop. | Kompetitor |
| 5 | Revisi tanpa batas, tanpa biaya tambahan, tanpa nunggu. | Kendali |
| 6 | Undangan? Ini lebih mirip film pendek. Demonya bisa dibuka sekarang. | Merek |

**Aturan tayang:**
- Landing page **harus** `fincards.land` langsung — hook menjanjikan "demo bisa dibuka", hero menepatinya
- CTA iklan: pakai **"Lihat Template"** persis — itu string tombol hero yang benar-benar tayang (`landing.ts`, `ctaPrimary`). Tombol CTA Meta sendiri cuma preset dropdown (pakai "Pelajari Selengkapnya"), jadi kecocokan katanya harus ada di teks utama/on-screen creative
- **Dilarang keras:** "coba gratis", "gratis", "trial", "bikin dulu bayar belakangan", "bayar saat siap sebar"

---

## Catatan akurasi klaim

Diperiksa terhadap kode:

- ✅ "Bayar sekali, tanpa langganan" — benar (Midtrans sekali bayar)
- ✅ "Demo lengkap tanpa daftar" — benar (slug `demo-*` publik)
- ✅ "Mulai Rp 199.999" — benar, dibaca dari `template_plans`
- ✅ "Data tamu terenkripsi" — benar (AES-GCM, `GUESTS_ENCRYPTION_KEY`)
- ✅ "Edit sendiri kapan saja setelah bayar" — benar (dashboard terbuka setelah `is_paid`)
- ❌ **"Rancang gratis / coba gratis / bayar saat siap sebar" — SALAH.** Editor terkunci `PaymentGate` sampai dibayar
- ⚠️ **Jangan** klaim "seumur hidup" secara umum — bergantung paket, digerakkan DB
- ⚠️ **Jangan** klaim buku tamu/QR di paket dasar — khusus Premium
- ⚠️ **Jangan** pasang badge garansi sampai jendela refund ditetapkan tertulis

## Dokumen iklan yang masih perlu dibersihkan

Kelima berkas ini ditulis sebelum koreksi dan mengandung klaim uji-coba-gratis:

- `ADS-HOOKS.md`
- `ADS-STRATEGY-wedding-saas-next.md`
- `ADS-INSTAGRAM-14-HARI.md`
- `ADS-CREATIVE-MINGGU-1-2.md`
- `1-7-day-plan-instagram-ads.md`

Sapu dengan: `grep -rniE "coba gratis|gratis|trial|bikin dulu|bayar saat|bayar kalau" *.md`
