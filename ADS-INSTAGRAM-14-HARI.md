> # ⛔ STOP — BACA SEBELUM MEMAKAI DOKUMEN INI
>
> **Dokumen ini dibangun di atas USP yang TIDAK ADA di produk.**
>
> Klaim "gratis merancang & preview, bayar hanya saat menerbitkan" / "rancang gratis,
> bayar saat terbit" / "bikin dulu, bayar belakangan" — **SEMUANYA SALAH.**
>
> Yang benar, terverifikasi di `src/app/[template]/[slug]/dashboard/page.tsx`:
> **FinCards bayar dulu.** Pemilik yang belum bayar kena `PaymentGate` ("Bayar Dulu")
> dan **tidak bisa masuk editor sama sekali** — hanya bisa *melihat* undangannya yang
> belum terbit. Tidak ada uji coba gratis.
>
> Satu-satunya yang gratis: **demo publik di landing** (slug `demo-*`), tanpa daftar.
>
> **Konsekuensinya:** setiap hook, brief, caption, dan baris tabel di bawah yang
> memakai sudut "gratis/bayar-belakangan" **batal** — termasuk hook **C3 "Bikin dulu,
> bayar belakangan"** beserta brief kreatifnya. Jangan tayangkan. Mengiklankan uji coba
> yang tidak ada berisiko hukum dan memicu tuntutan refund.
>
> **Sudut pengganti yang sah** (lihat `ADS-LANDING.md`):
> *"Undangannya kamu yang pegang. Bukan nunggu admin bales chat."* — kendali penuh +
> revisi tanpa batas, ditambah demo lengkap tanpa daftar sebagai penurun risiko.
>
> Dokumen ini butuh **penulisan ulang**, bukan cari-ganti — beberapa brief runtuh
> seluruhnya tanpa premis palsu itu.
>
> **Harga di dokumen ini juga salah.** Tertulis Basic Rp 149.000 / Premium Rp 299.000.
> Harga sebenarnya (dibaca dari `template_plans`, 28 Juli 2026): Solary Basic
> **Rp 149.999** · Lovebirds Basic **Rp 199.999** · Premium **Rp 249.999** (keduanya,
> seumur hidup). Selalu cek `/admin/templates` sebelum tayang.
>
> ➡️ **Pengganti untuk hook: lihat `ADS-HOOKS-v2.md`** — 20 hook baru, semua klaim
> sudah diverifikasi ke kode & DB. Direvisi 2026-07-28.

# FinCards — Instagram Ads Plan (7–14 Hari)
### Fase Go-To-Market · Instagram ONLY · Disusun 17 Juli 2026

> **Posisi dokumen ini:** turunan taktis dari [ADS-STRATEGY-wedding-saas-next.md](ADS-STRATEGY-wedding-saas-next.md)
> (funnel TOFU 40 / MOFU 20 / BOFU 30 / Retarget 10) + [ADS-HOOKS.md](ADS-HOOKS.md), di-update ke era
> **Midtrans** dan brand **FinCards** (www.fincards.land), dan di-restyle ke **design system Warm Clean**
> yang sudah kamu masukkan ke Claude Design. Dokumen ini menggantikan `1-7-day-plan-instagram-ads.md`
> (draft lama yang masih generik).
>
> **Relasi dengan plan organik:** [fincards-organic-content-plan-14hari.md](fincards-organic-content-plan-14hari.md)
> jalan bersamaan sebagai feed organik. Ads di dokumen ini TIDAK duplikat konten organik — ads fokus
> ke 3 pesan penjual terkuat (demo sinematik, "gratis rancang dulu", Buku Tamu QR) dan retargeting.
> Konten organik Day 2 / Day 9 / Day 14 yang perform bagus bisa di-boost jadi ad tambahan.

---

## 1. Ringkasan Strategi (baca 2 menit)

**Insight dari knowledge graph proyek** (graphify-out, 2026-07-16):

1. **Produkmu adalah iklannya.** Scroll sinematik Lovebirds + tata surya Solary = hook visual yang
   kompetitor template statis tidak bisa tiru. Semua reels ads harus menampilkan REKAMAN PRODUK ASLI,
   desain grafis hanya membingkai (cover + end card).
2. **"Gratis rancang, bayar saat terbit"** = penetral keberatan harga terkuat. Ini headline utama
   di semua tahap funnel. (Model draft-first → Midtrans Snap → publish on settlement.)
3. **Kohort terpanas = pendraft yang belum menerbitkan.** Satu ad set retargeting kecil ke kohort ini
   biasanya jadi ROAS tertinggi seluruh akun.
4. **Wedge unik kelas harga ini = Buku Tamu QR** (Premium Rp 299rb) — pengalaman tamu hari-H yang
   belum digarap kompetitor.
5. **Loop viral WhatsApp:** tiap undangan terbit disebar ke ratusan tamu. Footer brand di undangan
   publik = akuisisi gratis; jangan targetkan ulang pembeli di kampanye akuisisi.

**Persona utama iklan:** "Rani" — perempuan 24–30, baru tunangan, visual-first, takut undangannya
pasaran (persona bernilai tertinggi di ADS-STRATEGY). Persona kedua: "Adi" — pasangan praktis yang
mengeksekusi pembayaran (kena di retargeting).

**Aset yang sudah kamu punya (jangan produksi ulang dari nol):**
- Klip vertikal produk di `marketing-assets/` (hasil Playwright capture, akun demo `iklan-lovebirds`
  / `iklan-solary` Premium). Reels ads = klip ini + cover/end card dari Claude Design.
- Design system Warm Clean sudah ter-load di Claude Design → semua brief §5 tinggal paste.

---

## 2. Spesifikasi Ukuran Instagram (WAJIB — kanvas Claude Design)

| Placement | Rasio | Ukuran nominal | Catatan safe zone |
|---|---|---|---|
| **Feed Carousel / Single post** | 4:5 | **1080 × 1350 px** | Konten kunci di area tengah; grid profil sekarang crop 3:4, jadi jangan taruh teks penting < 90 px dari tepi atas/bawah. Wordmark FinCards ≥ 60 px dari tepi. |
| **Reels (video ad)** | 9:16 | **1080 × 1920 px** | **Atas 220 px** dan **bawah 420 px** dipakai UI Instagram (username, caption, CTA, ikon kanan). Semua teks & logo di area aman tengah **1080 × 1280 px**. |
| **Story (image/video ad)** | 9:16 | **1080 × 1920 px** | Kosongkan **±250 px atas** dan **±250 px bawah** (profile bar + swipe/CTA). Durasi video story ad efektif ≤ 15 dtk. |
| Cover Reels (thumbnail) | 9:16 | 1080 × 1920 px | Tetap terbaca saat di-crop 1:1 di grid → judul di tengah frame. |

**Spesifikasi teks iklan Meta (Instagram):**
- Primary text: tampil ±125 karakter pertama sebelum "…more" → kalimat pertama = hook.
- Headline ≤ 40 karakter · Description ≤ 30 karakter (jarang tampil di IG, tetap isi).
- Video: MP4/MOV, H.264, max 4GB; reels ideal 7–15 detik; 3 detik pertama = hook visual.
- Carousel ad: 2–10 kartu, semua 1080×1350, ukuran file ≤ 30 MB/gambar.

**Aturan desain (dari design system — berlaku untuk SEMUA aset):**
- Hanya 8 warna palette. Cream `#FDF6EC` mendominasi; terracotta `#E8553E` HANYA tombol/aksen;
  gold `#F5C842` jangan jadi background penuh; teks utama dark brown `#2A2118`.
- Montserrat Bold (judul) · Biryani (body) · Great Vibes wordmark "FinCards" halus di pojok tiap desain
  · Tangerine untuk aksen dekoratif. Sentence case, bukan ALL CAPS.
- Mockup HP/laptop dengan drop shadow lembut di atas cream — isi layar mockup pakai **screenshot asli
  produk**, bukan hasil AI (lebih dipercaya calon pembeli).

---

## 3. Struktur Kampanye (Meta Ads Manager, placement Instagram only)

Matikan placement Facebook/Audience Network/Messenger — centang hanya: **IG Feed, IG Reels, IG Stories,
IG Explore**.

```
Kampanye 1 — TOFU "Kenalan" (Awareness→Traffic)  ...... 55% budget
├── Ad Set A: Cold — perempuan 23–34, ID kota besar,
│   interest: Wedding, Engagement, Wedding planning, Bridestory
│   ├── Ad A1  Reels  "POV film"            (hook C1)
│   ├── Ad A2  Carousel "Biasa vs Kamu"     (hook P1)
│   └── Ad A3  Reels  "Ini undangan atau tata surya?" (Solary)
│
Kampanye 2 — MOFU "Yakinkan" (Traffic→Lead)  ........... 25% budget
├── Ad Set B: Warm — video viewers 25%+, IG engagers 30 hari,
│   visitor landing 30 hari
│   ├── Ad B1  Reels  "Gratis rancang dulu, bayar pas terbit" (hook C3)
│   ├── Ad B2  Carousel "Dua dunia: Solary × Lovebirds"
│   └── Ad B3  Reels/Story "Buku Tamu QR" (hook C5)
│
Kampanye 3 — BOFU "Panen" (Conversions)  ............... 20% budget
└── Ad Set C: Hot — pendraft belum terbit (event MulaiRancang,
    exclude Terbit), pengunjung halaman paket 14 hari
    ├── Ad C1  Story  "Tanggal nikahmu nggak bisa mundur" (hook U1)
    └── Ad C2  Carousel "Paket & harga + jawab keberatan" (hook X3)
```

**Prasyarat sebelum tayang (hari 0 — jangan skip):**
- [ ] IG akun bisnis + tersambung Meta Business Suite.
- [ ] **Meta Pixel terpasang** di fincards.land dengan event: `PageView`, `ViewContent` (lihat template),
      `MulaiRancang` (draft dibuat — map ke event `Lead`), `InitiateCheckout` (buka Midtrans Snap),
      `Terbit` (webhook settlement — map ke `Purchase` + nilai IDR). Tanpa ini, Kampanye 3 tidak bisa jalan
      → mulai dengan Kampanye 1–2 saja dan pasang pixel di minggu yang sama.
- [ ] Custom audiences dibuat: video viewers, IG engagers, web visitors, pendraft-belum-terbit, pembeli (exclude).
- [ ] Landing fincards.land dicek mobile-speed (trafik iklan 95%+ HP).

**Budget (pilih salah satu, bisa naik di hari ke-8):**

| Skenario | Harian | 14 hari | Ekspektasi realistis |
|---|---|---|---|
| Hemat | Rp 100rb | Rp 1,4 jt | ~600–900 klik, 3–8 Terbit — cukup untuk validasi hook |
| **Direkomendasikan** | **Rp 200rb** | **Rp 2,8 jt** | ~1.200–1.800 klik, 8–18 Terbit, data cukup untuk keputusan scaling |
| Agresif | Rp 350rb | Rp 4,9 jt | Hanya jika pixel + retargeting sudah siap dari hari 1 |

Break-even sangat rendah (margin ~90%, AOV blended ~Rp 210rb → break-even ROAS ~1,1x). Target sehat:
**CPA Terbit < Rp 90rb**, biaya per MulaiRancang < Rp 15rb, hook rate (3 dtk) > 25%, CTR > 1%.

---

## 4. Kalender Tayang 14 Hari (flighting)

Iklan bukan konten harian — aset dibuat di awal, lalu DITAYANGKAN terus dan dirotasi. Kalender ini
mengatur kapan menyalakan, mengecek, dan mengganti.

| Hari | Aksi | Detail |
|---|---|---|
| **0** | Produksi + setup | Semua aset §5 jadi (1 sesi Claude Design + 1 sesi CapCut). Pixel + audiences + kampanye dibuat, review Meta bisa 24 jam. |
| **1** | 🚀 Nyalakan Kampanye 1 | A1 + A2 + A3 tayang. Jangan sentuh 72 jam (learning phase). |
| **2–3** | Pantau pasif | Cek CPM, hook rate, CTR per ad — catat saja, belum ada keputusan. |
| **4** | 🚀 Nyalakan Kampanye 2 | Audiens warm mulai terkumpul dari K1. B1 + B2 tayang (B3 menyusul hari 6). |
| **5** | Keputusan #1 | Matikan ad TOFU dengan hook rate < 15% ATAU CTR < 0,5%. Sisakan minimal 2 ad. |
| **6** | Tambah B3 (Buku Tamu QR) | Wedge premium masuk saat audiens warm sudah ada. |
| **7** | 🚀 Nyalakan Kampanye 3 + review minggu | Pendraft mulai terkumpul → C1 + C2 tayang. Hitung: biaya/MulaiRancang, CPA kalau sudah ada Terbit. |
| **8** | Keputusan #2 (scaling) | Ad pemenang TOFU: naikkan budget ad set-nya +20–30% (jangan lebih, reset learning). |
| **9–10** | Rotasi kreatif | Buat 1 variasi baru dari ad pemenang (ganti hook/cover, konten sama) — lawan ad fatigue. |
| **11** | Boost organik terbaik | 1 post organik dengan engagement tertinggi (biasanya Day 2 wow-factor atau Day 9 QR) di-boost ke audiens warm. |
| **12–13** | Dorongan BOFU | Frekuensi C1/C2 boleh naik ke 3–4x/minggu ke pendraft. Kalau ada testimoni pembeli asli masuk → screenshot → jadikan ad C3 dadakan (social proof asli > semua desain). |
| **14** | 📊 Review penuh | Hitung CPA & ROAS aktual per kampanye. Putuskan: scale (CPA < 90rb stabil), lanjut testing (CPA 90–150rb), atau benahi landing/offer (CPA > 150rb). Dokumentasikan hook pemenang. |

> Versi 7 hari saja? Jalankan hari 0–7 di atas, tapi nyalakan Kampanye 2 di hari 3 dan Kampanye 3 di
> hari 5 (kalau pixel sudah terpasang sebelumnya). Aset yang dibuat tetap sama.

---

## 5. Paket Aset + Brief Claude Design (siap paste)

Semua brief di bawah mengasumsikan design system FinCards sudah ter-load di Claude Design.
8 aset — bisa diproduksi dalam 1–2 sesi.

---

### A1 — Reels TOFU · "POV: undanganmu kebuka kayak film" (hook C1 ⭐)
**Format:** video 9:16, 1080×1920, 12–15 dtk · **Bahan:** klip scroll Lovebirds dari `marketing-assets/` + 2 gambar dari Claude Design.

Alur video (rakitan CapCut): 0–2 dtk cover → 2–10 dtk rekaman scroll asli (polaroid bergeser, nama muncul)
→ 10–15 dtk end card. Overlay teks: "POV: tamu buka undanganmu" (0 dtk) → "ceritanya kebuka pelan-pelan…"
(5 dtk) → "kayak film 🤍" (9 dtk). Musik: piano sinematik lembut (tren CapCut).

**Brief Claude Design (2 gambar):**
```
Buatkan 2 kanvas 1080×1920 untuk iklan Instagram Reels FinCards.
Area aman: semua teks dan wordmark di dalam zona tengah — kosongkan 220px teratas
dan 420px terbawah.

KANVAS 1 — Cover reels:
- Background cream dominan, banyak ruang napas.
- Mockup satu HP di tengah (drop shadow lembut), layar HP dikosongkan polos beige
  #F7EBD7 (nanti saya tempel screenshot produk asli sendiri).
- Eyebrow kecil di atas mockup: "undangan digital sinematik"
- Hero title Montserrat Bold, dark brown: "POV: tamu buka undanganmu"
- Sub-teks Biryani: "dan ceritanya kebuka pelan-pelan… kayak film"
- Wordmark FinCards (Great Vibes) halus di pojok.

KANVAS 2 — End card:
- Background cream polos, sangat tenang.
- Tengah: "Elegan. Cepat. Tanpa Batas." (Montserrat Bold) dengan aksen kata
  "Tanpa Batas" warna terracotta.
- Di bawahnya, Biryani: "Rancang gratis. Bayar saat mau terbit."
- Tombol pill terracotta, teks cream: "Coba gratis sekarang"
- Baris kecil paling bawah zona aman: "mulai Rp 149rb · fincards.land"
- Wordmark FinCards halus di pojok.
```

**Copy iklan:** Primary text: "Tamu scroll, cerita kalian kebuka scene demi scene — foto, musik, RSVP
jadi satu. Rancang gratis dulu, bayar cuma pas mau terbit. 🤍" · Headline: "Undangan yang bikin tamu
terkesan" · CTA: **Pelajari Selengkapnya** → fincards.land

---

### A2 — Carousel TOFU · "Undangan biasa vs undanganmu" (hook P1)
**Format:** carousel 5 kartu, 1080×1350. 100% dari Claude Design (tanpa rekaman).

**Brief Claude Design:**
```
Buatkan carousel Instagram 5 kartu, masing-masing 1080×1350, untuk iklan FinCards.
Ini iklan kontras "undangan pasaran vs undanganmu". Konsisten Warm Clean, teks
penting minimal 90px dari tepi atas/bawah.

KARTU 1 (hook, sengaja "datar"):
- Background beige #F7EBD7 (bukan abu-abu — tetap dalam palette), komposisi kaku.
- Grid 4 kotak undangan generik yang seragam (wireframe sederhana garis muted brown).
- Judul Montserrat Bold: "Undangan biasa."
- Sub Biryani, muted brown: "sama kayak punya semua orang."

KARTU 2 (transisi):
- Background cream, hampir kosong, sangat lega.
- Satu kalimat besar di tengah, Montserrat Bold: "Undanganmu nggak harus gitu."
- Aksen kecil Tangerine di bawahnya: "lihat bedanya →"

KARTU 3 (reveal Lovebirds):
- Background cream. Mockup HP besar sedikit miring, drop shadow lembut, layar
  dikosongkan beige (saya isi screenshot Lovebirds asli).
- Label peach kecil: "Lovebirds — lembut & hangat"
- Teks: "Cerita kalian kebuka kayak film."

KARTU 4 (reveal Solary):
- Background cream, mockup HP kedua arah miring berlawanan, layar dikosongkan
  dark brown #2A2118 (saya isi screenshot Solary asli).
- Label gold kecil: "Solary — dramatis & berkilau"
- Teks: "Tamu sampai nanya: ini bikin di mana?"

KARTU 5 (CTA):
- Background cream. Judul: "Punya versi kamu."
- 3 baris kecil Biryani dengan bullet aksen gold: "rancang gratis" /
  "edit sendiri kapan aja" / "bayar cuma pas terbit"
- Tombol pill terracotta: "Mulai dari Rp 149rb"
- Wordmark FinCards halus di pojok tiap kartu.
```

**Copy iklan:** Primary text: "Takut undanganmu mirip punya semua orang? Geser — ini bedanya. Rancang
gratis dulu, bayar pas mau terbit." · Headline: "Undangan anti-pasaran" · CTA: **Pelajari Selengkapnya**

---

### A3 — Reels TOFU · "Ini undangan atau tata surya?" (Solary wow)
**Format:** video 9:16, 10–12 dtk · **Bahan:** klip Solary (planet/3D) dari `marketing-assets/` + cover & end card.

**Brief Claude Design:** sama pola A1, ganti teks cover jadi: eyebrow "yang ini beda", hero
"Ini undangan… atau tata surya? 🌌", sub "scroll dulu baru percaya". End card sama persis A1 (reuse).

**Copy iklan:** Primary text: "Bukan template. Ini pengalaman — tata surya yang nyeritain kalian
berdua. Coba demo-nya gratis." · Headline: "Undangan digital sinematik" · CTA: **Pelajari Selengkapnya**

---

### B1 — Reels MOFU · "Gratis rancang dulu, bayar pas terbit" (hook C3)
**Format:** video 9:16, 12–15 dtk · **Bahan:** screen-record dashboard editor (pilih template → isi nama
→ ganti foto, tanpa paywall) + kartu 3 langkah.

**Brief Claude Design (1 gambar, dipakai sebagai end card / bisa juga jadi story ad statis):**
```
Buatkan kanvas 1080×1920 iklan Instagram FinCards (zona aman reels: kosongkan
220px atas, 420px bawah).
- Background cream. Judul atas Montserrat Bold: "Rancang dulu. Bayar pas mau terbit."
- 3 langkah vertikal, tiap langkah: lingkaran nomor kecil beige berisi angka
  terracotta + teks Biryani:
  1. Pilih template — gratis
  2. Isi cerita & foto kalian — gratis
  3. Terbitkan — baru bayar (mulai Rp 149rb)
- Di samping langkah-langkah, elemen dekoratif tipis warna gold (garis lengkung halus).
- Tombol pill terracotta: "Coba rancang gratis"
- Wordmark FinCards halus di pojok.
```

**Copy iklan:** Primary text: "Nggak perlu bayar dulu buat tahu cocok atau nggak. Rancang sampai jadi,
lihat hasilnya, baru putuskan. 🤍" · Headline: "Gratis rancang, bayar saat terbit" · CTA: **Coba Sekarang**

---

### B2 — Carousel MOFU · "Dua dunia: Solary × Lovebirds"
**Format:** carousel 4 kartu, 1080×1350. Selaras dengan organik Day 5 tapi angle iklan (pilih vibe-mu).

**Brief Claude Design:**
```
Buatkan carousel Instagram 4 kartu 1080×1350 untuk iklan FinCards,
tema "dua kepribadian, satu platform".

KARTU 1: Background split diagonal lembut cream ↔ beige. Judul: "Kamu tim yang mana?"
Sub: "dua gaya, dua dunia — dua-duanya bisa kamu edit sendiri."
KARTU 2 (Lovebirds): background cream + aksen peach. Mockup HP layar kosong beige
(diisi screenshot asli). Judul "Lovebirds", sub: "lembut, hangat, kayak album
kenangan yang hidup." 3 chip kecil beige: "polaroid story" · "musik" · "RSVP".
KARTU 3 (Solary): background cream + aksen gold & dark brown. Mockup HP layar kosong
dark brown (diisi screenshot asli). Judul "Solary", sub: "dramatis, berkilau,
tamu bakal inget lama." 3 chip: "tata surya 3D" · "galeri" · "countdown".
KARTU 4 (CTA): "Dua-duanya: RSVP otomatis, galeri, amplop digital, edit kapan aja."
Tombol terracotta: "Lihat demo dua-duanya". Wordmark FinCards di tiap kartu.
```

**Copy iklan:** Primary text: "Lembut kayak Lovebirds, atau dramatis kayak Solary? Coba demo dua-duanya
gratis — tinggal pilih yang paling 'kalian'." · Headline: "Pilih vibe undanganmu" · CTA: **Pelajari Selengkapnya**

---

### B3 — Reels/Story MOFU→BOFU · "Buku Tamu QR" (hook C5, wedge Premium)
**Format:** video 9:16, 10–15 dtk · **Bahan:** rekam demo check-in QR (halaman `/checkin` + dashboard
buku tamu) + kartu fitur.

**Brief Claude Design (1 gambar — cover/story statis):**
```
Buatkan kanvas 1080×1920 iklan Instagram Story FinCards (kosongkan 250px atas & bawah).
- Background cream. Eyebrow: "fitur Premium"
- Ilustrasi flat sederhana palette-only: meja penerima tamu dengan kartu QR berdiri
  (kode QR digambar dark brown di kartu beige), satu tangan memegang HP mengarah
  ke QR. Gaya minimal, bukan foto realistis.
- Judul Montserrat Bold: "Tamu check-in tinggal scan."
- Sub Biryani: "tanpa pulpen, tanpa antri, langsung tercatat rapi."
- Chip gold kecil: "Buku Tamu Digital + QR"
- Tombol terracotta: "Lihat cara kerjanya"
- Wordmark FinCards halus di pojok.
```

**Copy iklan:** Primary text: "Yang bikin tamu inget bukan cuma undangannya — pas dateng, mereka
check-in cukup scan QR. Kamu dapat daftar hadir rapi real-time." · Headline: "Buku tamu QR di hari-H"
· CTA: **Pelajari Selengkapnya**

---

### C1 — Story BOFU (retargeting) · "Tanggal nikahmu nggak bisa mundur" (hook U1)
**Format:** story statis 1080×1920. Target: pendraft belum terbit. 100% Claude Design.

**Brief Claude Design:**
```
Buatkan kanvas 1080×1920 iklan Instagram Story FinCards, nada lembut tapi sedikit
mendesak (kosongkan 250px atas & bawah).
- Background cream. Ilustrasi kalender minimal: grid kalender garis muted brown,
  satu tanggal dilingkari bentuk hati warna terracotta.
- Judul Montserrat Bold: "Tanggal nikahmu nggak bisa mundur."
- Sub Biryani: "tapi undanganmu bisa jadi hari ini — draft-mu udah nunggu."
- Tombol terracotta: "Terbitkan sekarang"
- Baris kecil: "cuma butuh beberapa menit · mulai Rp 149rb"
- Wordmark FinCards halus di pojok.
```

**Copy iklan:** Primary text: "Undanganmu udah cantik di draft. Tinggal satu langkah: terbitkan, dan
sebar ke semua orang tersayang." · Headline: "Draft-mu udah nunggu" · CTA: **Selesaikan Pembelian**

---

### C2 — Carousel BOFU · "Paket, harga, dan jawaban keraguanmu" (hook X3)
**Format:** carousel 5 kartu, 1080×1350. Target: warm + pendraft. Jawab 3 keberatan utama persona Rani/Adi.

**Brief Claude Design:**
```
Buatkan carousel Instagram 5 kartu 1080×1350 untuk iklan FinCards, gaya tenang
dan meyakinkan (bagian menjawab keraguan).

KARTU 1: Background cream. Judul: "Masih mikir-mikir? Wajar." Sub: "ini jawaban
buat 3 hal yang paling sering ditanya."
KARTU 2 ("susah nggak ngeditnya?"): Judul kecil pertanyaan dalam kutip, jawaban
besar: "Desainnya udah cantik. Kamu tinggal isi cerita kalian." Dua kartu foto
polaroid kecil miring sebagai hiasan sudut (bingkai beige). Baris kecil:
"edit sendiri kapan aja, bahkan setelah terbit."
KARTU 3 ("tamu orang tua bisa buka nggak?"): Jawaban: "Cukup klik link WhatsApp.
Nggak perlu install apa-apa." Ilustrasi minimal gelembung chat WA (pakai warna
palette, bukan hijau WA — outline muted brown).
KARTU 4 (harga): Dua kartu paket berdampingan di atas cream:
- Kartu "Basic" (beige): Rp 149rb — aktif 1 tahun · RSVP · galeri · musik · amplop digital
- Kartu "Premium" (dark brown, teks cream, chip gold "paling lengkap"): Rp 299rb —
  lifetime · semua fitur Basic · Buku Tamu QR check-in
KARTU 5 (CTA): "Rancang gratis dulu. Suka? Baru terbitkan." Tombol terracotta:
"Mulai sekarang". Baris kecil: "pembayaran aman via Midtrans". Wordmark FinCards
di tiap kartu.
```

**Copy iklan:** Primary text: "Nggak perlu jago desain, nggak perlu bayar di muka, dan tamu tinggal
klik link. Basic Rp 149rb · Premium Rp 299rb — sekali bayar, tanpa biaya bulanan." · Headline:
"Sekali bayar, semua jadi satu" · CTA: **Mulai Sekarang**

> ⚠️ Harga di kartu 4 = snapshot `template_plans` hari ini (Basic 149rb / Premium 299rb). Cek /admin
> Plans dulu sebelum produksi — harga DB-driven, jangan sampai iklan beda dengan landing.

---

## 6. Ringkasan Produksi

| ID | Format | Ukuran | Sumber visual | Claude Design bikin | Funnel |
|---|---|---|---|---|---|
| A1 ⭐ | Reels 12–15s | 1080×1920 | klip Lovebirds `marketing-assets/` | cover + end card | TOFU |
| A2 | Carousel 5 | 1080×1350 | — | 5 kartu penuh | TOFU |
| A3 | Reels 10–12s | 1080×1920 | klip Solary `marketing-assets/` | cover (end card reuse A1) | TOFU |
| B1 | Reels 12–15s | 1080×1920 | screen-record editor | kartu 3 langkah | MOFU |
| B2 | Carousel 4 | 1080×1350 | screenshot produk | 4 kartu penuh | MOFU |
| B3 | Reels/Story | 1080×1920 | rekam demo QR checkin | kartu ilustrasi QR | MOFU→BOFU |
| C1 | Story statis | 1080×1920 | — | gambar penuh | BOFU |
| C2 | Carousel 5 | 1080×1350 | — | 5 kartu penuh | BOFU |

**Urutan kerja hari 0:**
1. Kumpulkan footage: pakai klip `marketing-assets/` yang sudah ada; rekam tambahan (editor untuk B1,
   checkin QR untuk B3) via akun demo `iklan-lovebirds` / `iklan-solary`.
2. Satu sesi Claude Design: generate 8 set aset (§5, urut A1→C2).
3. Tempel screenshot produk asli ke layar mockup yang sengaja dikosongkan (Canva/Figma).
4. Rakit 4 video di CapCut (cover → footage → overlay → end card → musik).
5. Upload ke Ads Manager sesuai struktur §3 (placement Instagram only) → submit review.

---

## 7. Aturan Main Selama Tayang

- **Jangan edit ad set 72 jam pertama** (learning phase reset kalau diutak-atik).
- **Kill rule:** hook rate < 15% atau CTR < 0,5% setelah ±Rp 100rb spend → matikan.
- **Scale rule:** CPA Terbit < Rp 90rb stabil 3+ hari → naikkan budget +20–30%, jangan dobel.
- **Rotasi kreatif tiap 7–10 hari** (ganti cover/hook, isi boleh sama); frekuensi retargeting max 3–4x/minggu.
- **Exclude pembeli** (`Terbit`) dari semua kampanye akuisisi.
- Testimoni di iklan HARUS asli (dari testimonials yang sudah dimoderasi admin) — jangan pakai placeholder demo.
- Semua link pakai UTM: `?utm_source=ig&utm_medium=paid&utm_campaign=gtm14&utm_content=<id-aset>`.

**Metrics harian yang dicatat (5 menit/hari):** spend · CPM · hook rate · CTR · MulaiRancang · Terbit ·
CPA. Template: kolom per ad ID di spreadsheet.

**Setelah hari 14:** hook pemenang jadi fondasi bulan berikutnya (lihat roadmap 90 hari di
ADS-STRATEGY §Rencana Implementasi — Bulan 2: lookalike pembeli, jalur vendor/WO, MOFU penuh).
