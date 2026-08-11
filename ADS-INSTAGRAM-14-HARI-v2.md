# Rencana Iklan Instagram 14 Hari v2 — FinCards
### Fase Go-To-Market · Instagram ONLY · Disusun 28 Juli 2026

> **Dokumen ini menggantikan `ADS-INSTAGRAM-14-HARI.md`.** Versi lama dibangun di atas USP yang
> tidak ada di produk — "gratis merancang, bayar saat terbit" — dan sekarang diarsipkan dengan
> penanda STOP di bagian atasnya. **FinCards bayar dulu**: editor terkunci `PaymentGate` sampai
> lunas (`src/app/[template]/[slug]/dashboard/page.tsx`). Pemilik yang belum bayar cuma bisa
> *melihat* undangannya sendiri yang belum terbit — tidak bisa mengedit, tidak ada uji coba.
> Satu-satunya yang benar-benar gratis: **demo publik** di landing, tanpa daftar.
>
> **Dokumen pendamping (baca dulu kalau ada yang meragukan):**
> [ADS-HOOKS-v2.md](ADS-HOOKS-v2.md) — 20 hook siap pakai, sumber semua kode hook di dokumen ini ·
> [ADS-LANDING.md](ADS-LANDING.md) — audit landing page, positioning jujur, dan status deploy.
>
> Semua klaim di bawah diverifikasi ke kode & tabel `template_plans` per 28 Juli 2026. Kata
> "gratis merancang", "coba gratis", "trial", "bikin dulu bayar belakangan", "bayar saat terbit"
> **tidak muncul** di dokumen ini kecuali untuk menyebut larangannya sendiri.

---

## 0. ⛔ Prasyarat memblokir — jangan keluarkan satu rupiah pun sebelum ini beres

**Perbaikan landing page (copy jujur, trust bar, jangkar harga, FAQ, dan perbaikan performa besar
yang menurunkan First Contentful Paint dari ~3,2 detik ke di bawah 1 detik di HP) sudah selesai
DI LOKAL — tapi BELUM ter-deploy.** Situs yang live hari ini di `fincards.land` masih memuat janji
"coba gratis" yang salah dan masih lambat di HP (tempat 95%+ trafik iklan mendarat).

**Sebelum kampanye apa pun dinyalakan:**

1. Deploy perubahan landing (lihat `ADS-LANDING.md` §"Yang sudah diperbaiki" untuk daftar lengkap).
2. Buka `fincards.land` di HP sungguhan, verifikasi: kicker berbunyi "DEMO LENGKAP, TANPA DAFTAR",
   tombol hero berbunyi **"Lihat Template"** (satu tombol saja), trust bar tampil di bawah hero, FAQ tampil sebelum
   CTA penutup, dan jangkar harga "Mulai Rp 199.999" (atau harga termurah hari itu) tampil di hero.
3. Jalankan sapuan kata terlarang ke situs yang sudah live (bukan cuma ke dokumen): buka tiap
   section dan pastikan nol kata "gratis" yang berdiri sendiri di luar konteks demo, nol "Anda".
4. Baru setelah 1–3 lolos, lanjut ke §1 dan seterusnya.

Mengiklankan halaman lama = mengiklankan produk yang tidak ada, plus membakar budget ke landing
yang lambat. Ini bukan saran, ini gerbang keras.

---

## 1. Tujuan & definisi sukses (14 hari, tanpa satu pun social proof)

**Tujuan utama bukan volume penjualan — tujuannya adalah sinyal.** FinCards masuk siklus ini
dengan nol testimoni asli, nol data pixel, dan model bayar-dulu yang secara struktural lebih sulit
dikonversi daripada produk yang menawarkan masa percobaan tanpa risiko (lihat §11 Risiko). Mengharapkan volume "Terbit" besar
di 14 hari pertama tidak realistis dan akan terasa seperti kegagalan padahal yang sebenarnya
terjadi adalah proses kalibrasi.

**Sukses di hari ke-14 berarti tercapai semua ini:**

- Sinyal hook yang **bisa dibaca**, bukan cuma tayang — minimal satu ad TOFU menembus ±Rp100rb
  spend dengan hook rate & CTR yang bisa dibandingkan head-to-head (lihat §8 pengujian).
- Meta Pixel terpasang **dan terbukti akurat** — bukan cuma "sudah dipasang", tapi minimal satu
  event `Purchase` tervalidasi manual terhadap dashboard admin/Midtrans (lihat §6 dan §9).
- Diagnosis tertulis kalau performa jelek: masalahnya di hook, di landing, di harga, atau memang
  di produk (pay-first tanpa social proof) — lihat §11.
- **Kalau ada 1–2 pelanggan bayar sungguhan dari sumber iklan:** langsung jalankan SOP minta
  testimoni H+3 dari `ADS-HOOKS-v2.md` §Social Proof. Ini yang membuka gembok social-proof untuk
  siklus iklan berikutnya — dan justru karena modelnya bayar-dulu, bukti ini lebih berharga
  daripada di produk manapun yang punya masa percobaan tanpa risiko.
- Satu rekomendasi tertulis untuk bulan ke-2: hook/angle pemenang, kombinasi targeting paling
  efisien, dan skenario budget mana yang layak dinaikkan.

**Yang secara sengaja TIDAK dijanjikan dokumen ini:** ROAS matang, CPA final, atau lookalike
audience yang berfungsi (lihat §6 — belum ada data historis untuk itu).

---

## 2. Ringkasan produk & audiens (recap singkat — detail lengkap di `ADS-HOOKS-v2.md`)

| | |
|---|---|
| **Produk** | Undangan pernikahan digital sinematik. Dua template: **Lovebirds** (hangat, polaroid, botanical) & **Solary** (tata surya 3D). |
| **Audiens target** | Perempuan 23–30, menikah 2–4 bulan lagi, aktif Instagram, pengambil keputusan estetika. |
| **USP inti (angle utama)** | Kendali penuh di tangan pasangan — self-edit lewat dashboard, revisi tanpa batas, tanpa nunggu admin. Pembeda tertajam dari kompetitor jasa-WA-admin. |
| **USP pendukung** | Demo lengkap tanpa daftar · bayar sekali tanpa langganan · amplop digital · galeri unlimited · backsound bebas · 10 palette + ornament, bisa diganti kapan saja · data tamu terenkripsi AES-GCM (PDP). |
| **Premium-only** | Buku tamu + QR check-in. **Selalu diberi label "Premium"** di setiap kreatif yang menyebutnya. |

**Harga (dibaca dari `template_plans`, 28 Juli 2026 — cek ulang di `/admin/templates` di hari
kreatif dibuat DAN di hari tayang, bukan cuma sekali):**

| Template | Paket | Harga | Coret | Kuota | Masa aktif |
|---|---|---|---|---|---|
| Solary | Basic | Rp 199.999 | Rp 299.999 | 400 tamu | 1 tahun |
| Lovebirds | Basic | Rp 199.999 | Rp 299.999 | 400 tamu | 1 tahun |
| Keduanya | Premium | Rp 249.999 | Rp 349.999 | 500 tamu | **seumur hidup** |

⚠️ **"Seumur hidup" hanya untuk Premium.** Jangan pernah menempelkannya ke Basic — Basic aktif 1 tahun.

⚠️ **Harga coret aktif permanen di semua paket.** Kalau harga coret itu tidak pernah benar-benar
dijual, kreatif apa pun yang menampilkannya berisiko ditolak Meta (klaim diskon palsu) dan
melanggar aturan perlindungan konsumen. Putuskan status harga coret **sebelum** memproduksi kreatif
apa pun yang menampilkan angka (lihat §12 checklist).

---

## 3. Struktur Kampanye (Meta Ads Manager, placement Instagram only)

Matikan placement Facebook/Audience Network/Messenger. Placement dicentang manual: **IG Feed, IG
Reels, IG Stories, IG Explore.**

```
Kampanye 1 — TOFU "Kenalan" (objective: Traffic, sebagian ad set ThruPlay)
├── Ad Set A — Dingin: perempuan 23–30, kota tier-1 pernikahan ID
│   (Jabodetabek, Bandung, Surabaya, Yogyakarta, Semarang, Denpasar),
│   Life Event "Baru bertunangan (3 bulan)" ATAU interest Wedding /
│   Wedding planner / Wedding invitations / Bridestory / Weddingku
│   ├── T1  Reel      K1      "Undangannya kamu yang pegang"
│   ├── T2  Reel      C1      "POV: tamu buka undanganmu"
│   ├── T3  Reel      K2      "Salah tanggal jam 11 malam?"
│   ├── T4  Reel      K4/C4   Palette switcher — 10 palette live
│   ├── T5  Carousel  P1      "Undangan biasa vs undanganmu"
│   └── T6  Reel      C2      "Ini undangan atau tata surya?" (Solary)
│
Kampanye 2 — MOFU "Yakinkan" (objective: Traffic → geser ke Conversions/ViewContent
│                              setelah pixel akumulasi cukup event)
├── Ad Set B — Hangat: video viewer ≥25% Kampanye 1 + IG engager 30 hari
│   (custom audience native Instagram — TIDAK butuh pixel, bisa langsung
│   dipakai) + web visitor 30 hari begitu pixel sudah jalan
│   ├── M1  Reel/Story  C3   "Buka demo lengkap, tanpa daftar, tanpa form"
│   ├── M2  Static      X1   "Bayar sekali. Bukan langganan bulanan."
│   ├── M3  Static      P3   "Nomor HP keluarga disimpan di mana?" (angle belum tergarap)
│   └── M4  Static      K3   "Revisi tanpa batas. Tanpa biaya tambahan."
│
Kampanye 3 — Retargeting "Tutup" (objective: Conversions → Purchase;
│                                  fallback InitiateCheckout kalau volume Purchase
│                                  masih terlalu kecil untuk dioptimasi)
└── Ad Set C — Panas: pengunjung situs 14–30 hari (pixel) minus pembeli
    + pembuka demo + [kalau tersedia] mulai-checkout-belum-bayar
    ├── R1  Story    U1   "Mulai Rp 199.999 · sekali bayar"
    ├── R2  Story    X4   "Tante nggak perlu install apa-apa"
    ├── R3  Static   U2   "Premium: seumur hidup + buku tamu QR" (label Premium wajib)
    ├── R5  Story    X3   "Dilihat ratusan orang. Sekali."
    └── R4  Story    U4   "Kuota nambah per 100, kapan saja" — CADANGAN, lihat §5
```

### Catatan lookalike — kenapa tidak dipakai siklus ini

Lookalike butuh benih (*seed*) berkualitas — idealnya 100–1.000+ event sumber (pembeli, atau
minimal `ViewContent` bervolume tinggi). FinCards masuk siklus ini dengan **nol riwayat pixel**,
jadi tidak ada benih yang layak dipakai di hari 1. Satu jalan pintas yang teknis tersedia tanpa
pixel: Lookalike dari **custom audience engager profil Instagram** (Meta tidak mensyaratkan pixel
untuk ini) — tapi itu pun perlu pool ratusan engager dulu, yang baru mulai terkumpul dari Kampanye 1.

**Keputusan:** lookalike **tidak** dijadwalkan di 14 hari ini. Kalau pool engager IG dari Kampanye 1
tembus ±500 di hari 10, boleh dicoba sebagai eksperimen kecil terpisah dari budget utama — bukan
prasyarat. Lookalike pembeli sungguhan masuk agenda **bulan ke-2**, setelah ≥100 event `Purchase`
nyata terkumpul (lihat §14).

### Pixel & pelacakan — status hari ini: BELUM terpasang

Sapuan kode (`grep` di `src/app`, `src/components`) tidak menemukan `fbq(`, Meta Pixel, atau
`gtag` apa pun di landing. Ini prasyarat teknis yang belum selesai, bukan asumsi:

- Pasang Meta Pixel di `fincards.land` dengan event: `PageView` · `ViewContent` (demo dibuka —
  di explorer `/#vibe`, `previewOpen`) · `InitiateCheckout` (Midtrans Snap dibuka) · `Purchase`
  (pembayaran lunas).
- Settlement pembayaran terjadi lewat **webhook server-to-server** (`/api/payment/midtrans/webhook`
  per `CLAUDE.md`), bukan redirect klien yang pasti kelihatan pengunjung. Event `Purchase` yang
  hanya bergantung pixel client-side berisiko meleset (ad-blocker, tab ditutup sebelum redirect,
  sinyal iOS 14.5+ yang memang berkurang). **Disarankan** kirim event `Purchase` juga lewat **Meta
  Conversions API (server-side)** langsung dari handler webhook — ini kerja engineering, alokasikan
  sebelum Hari 1, bukan sesuatu yang bisa ditambal di tengah jalan.
- Tanpa pixel, Kampanye 2 masih bisa jalan (custom audience IG-native tidak butuh pixel) tapi
  Kampanye 3 (retargeting berbasis pengunjung situs) **tidak bisa jalan** sampai pixel terpasang
  dan punya beberapa hari data. Kalender §7 sudah mengasumsikan urutan ini.

---

## 4. Spesifikasi ukuran & placement Instagram

| Placement | Rasio | Ukuran | Safe zone |
|---|---|---|---|
| Feed Carousel / Single post | 4:5 | 1080×1350 px | Teks penting >90px dari tepi atas/bawah (grid profil crop 3:4). |
| Reels (video) | 9:16 | 1080×1920 px | Kosongkan 220px atas & 420px bawah (UI Instagram: username, caption, CTA, ikon). |
| Story (image/video) | 9:16 | 1080×1920 px | Kosongkan ±250px atas & bawah (profile bar + swipe/CTA). Durasi efektif ≤15 detik. |

**Teks iklan Meta:** Primary text tampil ±125 karakter sebelum "…more" — kalimat pertama = hook.
Headline ≤40 karakter. Video MP4/MOV H.264, Reels ideal 7–15 detik, 3 detik pertama = hook visual.
Carousel 2–10 kartu, ≤30MB/gambar.

---

## 5. Inventaris kreatif (15 aset — diproduksi di Hari 0)

| ID | Hook | Angle | Format | Funnel | Sumber visual | Hari tayang |
|---|---|---|---|---|---|---|
| T1 | K1 | Kendali | Reel | TOFU | rekam layar: ganti jam acara di dashboard, live seketika | H1 |
| T2 | C1 | Curiosity | Reel | TOFU | rekam scroll penuh Lovebirds dari demo publik, tanpa potongan | H1 |
| T3 | K2 | Kendali | Reel | TOFU | rekam layar: edit teks, refresh link, tanpa musik dramatis | H3 |
| T4 | K4 / C4 | Kendali / Curiosity | Reel | TOFU | rekam palette switcher + coach mark di explorer `/#vibe` | H3 |
| T5 | P1 | Pain | Carousel | TOFU | desain: grid undangan generik → potong ke hero Lovebirds | H2 |
| T6 | C2 | Curiosity | Reel | TOFU | rekam perjalanan antar-planet Solary, akun demo Premium | H6 |
| M1 | C3 | Curiosity | Reel/Story | MOFU | remix footage T2, overlay teks diganti jadi ajakan buka demo | H4 |
| M2 | X1 | Contrarian | Static | MOFU | desain 2 kolom: bayar sekali vs langganan bulanan | H4 |
| M3 | P3 | Pain (belum tergarap) | Static | MOFU | desain tenang, tanpa hiperbola, tanpa rekaman | H6 |
| M4 | K3 | Kendali | Static | MOFU | 3 baris teks besar, headline-style | H9 |
| R1 | U1 | Urgency | Story | Retargeting | desain harga + syarat, Basic Rp 199.999 (sama di dua template) | H7 |
| R2 | X4 | Contrarian | Story | Retargeting | desain ringan, humor "tante nggak install app" | H7 |
| R3 | U2 | Urgency | Static | Retargeting | perbandingan Basic vs Premium, label "Premium" wajib | H9 |
| R5 | X3 | Contrarian | Story | Retargeting | reframe "dilihat ratusan orang, sekali" — caption-led | H12 |
| R4 | U4 | Urgency | Story | Retargeting | kuota nambah per 100 — **cadangan**, dipakai kalau kuota jadi keberatan nyata di DM/komentar, atau sebagai materi rotasi H10+ | cadangan |

⚠️ Setiap aset yang menampilkan **angka rupiah** (T5 tidak, tapi R1/R3 ya) wajib dicek ulang ke
`/admin/templates` pagi hari sebelum render final — bukan cuma sekali di Hari 0. Simpan angka harga
di **primary text**, bukan dibakar ke dalam video/gambar, kalau memungkinkan — primary text bisa
diedit tanpa upload ulang aset; overlay yang sudah dirender tidak bisa.

---

## 6. Produksi kreatif — apa yang direkam/didesain, dan apa yang sudah ada

**Yang TIDAK ada lagi dan perlu diproduksi ulang:** folder `marketing-assets/` yang disebut di
dokumen lama sebagai sumber klip siap pakai **tidak ada di checkout ini saat ini**. Jangan
asumsikan footage sudah tersedia — alokasikan waktu produksi di Hari 0.

**Dua aset terkuat, dan keduanya bisa direkam hari ini dari produk yang sudah live:**

1. **Palette switcher + coach mark (T4).** Fitur ini baru saja dikerjakan di branch
   `feat/live-preview-discoverability-part-2` (commit `b0d5b1e`, `1cc854b`) — coach mark mengarah
   ke tombol palette 🎨, dan sejak `1cc854b`, demo yang dibuka dari explorer membawa palette yang
   dipilih pengunjung lewat `?theme=`. Ini konten paling memuaskan ditonton dari seluruh produk
   (per `ADS-HOOKS-v2.md` K4) — rekam siklusnya utuh: ketuk 🎨 → 10 palette bergani cepat →
   "Buka undangan lengkap" → demo terbuka dalam palette yang sama persis.
2. **Scroll sinematik penuh (T2, C1).** Rekam demo publik Lovebirds dari atas ke bawah tanpa
   potongan editing — janji hooknya ("kayak film") harus benar-benar ditepati di detik pertama.

**Alat produksi:**
- **Screen-record produk asli** (T1, T2, T3, T4, T6, M1): `scripts/capture.mjs` untuk walkthrough
  sinematik frame-by-frame yang rapi, ATAU alur OBS (rekam landscape) → ffmpeg (potong & crop ke
  bingkai layar HP) untuk nuansa rekaman-layar-asli yang dibutuhkan hook K2 ("Tanpa musik dramatis
  — biarkan kecepatannya yang bicara"). Pakai akun demo Premium yang sudah ada untuk memastikan
  fitur Premium (buku tamu/QR) hanya muncul di materi yang memang diberi label Premium.
- **Desain statis/carousel** (T5, M2, M3, M4, R1, R2, R3, R4, R5): proyek FinCards Design System
  di claude.ai (lihat memory operator — akses via DesignSync/`/design-sync`). Palette 8 warna resmi
  saja — cream `#FDF6EC` dominan, terracotta `#E8553E` hanya aksen/tombol, gold `#F5C842` jangan
  jadi background penuh, teks utama dark brown `#2A2118`. Montserrat Bold untuk judul, Biryani
  untuk body, wordmark "FinCards" (Great Vibes) halus di pojok. Mockup HP/laptop diisi **screenshot
  produk asli**, bukan hasil AI — kredibilitas > kenyamanan produksi.
- **Nol testimoni di kreatif apa pun.** Kalau ada dorongan menambah kalimat seperti "disukai banyak
  pasangan" — itu karangan, dan dilarang keras (lihat §1 dan `ADS-HOOKS-v2.md` §Social Proof).

---

## 7. Kalender Tayang 14 Hari

Legenda: 🚀 aset baru tayang · ▶ aset lanjut tayang (jangan disentuh) · 🔍 hari keputusan · 🔄 rotasi
kreatif · 📊 review penuh.

| Hari | Yang tayang | Hook | Format | Funnel | Yang dicek hari itu |
|---|---|---|---|---|---|
| 1 | 🚀 T1 + T2 nyala | K1, C1 | Reel | TOFU | Kedua ad lolos review & delivering; belum ada flag "learning limited". |
| 2 | ▶ T1+T2 lanjut (jangan sentuh — learning phase) · 🚀 tambah T5 | K1, C1, P1 | Reel + Carousel | TOFU | Hook rate 3-detik per ad — dicatat, belum dieksekusi apa-apa. |
| 3 | 🚀 tambah T3 + T4 (Round 2 TOFU) | K2, K4/C4 | Reel | TOFU | T1 vs T2 sudah lewat 72 jam — ambil baca arah pertama Round 1 (lihat §8). |
| 4 | 🚀 Kampanye 2 nyala: M1 + M2 ke audiens hangat | C3, X1 | Reel/Story + Static | MOFU | Ukuran audiens hangat (video viewer + IG engager) ≥ kira-kira 1.000 sebelum berharap delivery stabil. |
| 5 | 🔍 Keputusan #1 — kill rule ke ad TOFU | — | Reel + Carousel (live, dievaluasi) | TOFU | Sisa minimal 2 ad TOFU aktif; catat pemenang Round 1 (K1 vs C1) tertulis. |
| 6 | 🚀 tambah T6 (Solary) ke TOFU · tambah M3 ke MOFU | C2, P3 | Reel + Static | TOFU/MOFU | Cost per `ViewContent` (buka demo) M1 vs M2 — mana yang lebih murah. |
| 7 | 🚀 Kampanye 3 nyala JIKA audiens ≥100: R1 + R2 | U1, X4 | Story | Retargeting | Gerbang ukuran audiens; verifikasi event `Purchase`/`InitiateCheckout` benar tercatat (test manual kalau perlu). |
| 8 | 🔍 Keputusan #2 (scaling) — naikkan budget ad set TOFU pemenang +20–30% | — | Semua (live, dievaluasi) | TOFU | Learning phase tidak ke-reset; CPA retargeting kalau sudah ada data. |
| 9 | 🚀 tambah M4 ke MOFU · tambah R3 ke Retargeting | K3, U2 | Static | MOFU/Retargeting | Frequency ad set Retargeting tetap di bawah ±4x/minggu/orang. |
| 10 | 🔄 refresh kreatif — varian baris hook baru dari ad TOFU pemenang, footage sama | (A/B dari hook pemenang) | Reel | TOFU | Frequency & CPM ad TOFU lama mulai naik?; varian baru lolos review sebelum yang lama dimatikan. |
| 11 | 🔍 rollup tengah minggu-2 — rekonsiliasi manual `Purchase` vs dashboard admin/Midtrans | — | Semua (live) | Semua | Sudah ada pelanggan bayar sungguhan? Kalau ya, mulai SOP minta testimoni WA H+3 hari itu juga. |
| 12 | 🚀 tambah R5 ke Retargeting; frequency retargeting naik ke 3–4x/minggu | X3 | Story | Retargeting | Audit ulang tiap kreatif berharga vs `/admin/templates` pagi itu + label "Premium" masih benar di semua materi QR/buku tamu. |
| 13 | 🔍 konsolidasi — matikan ad yang hanya bertahan karena spend belum cukup kena kill rule | — | Semua (live, dievaluasi) | Semua | Sisa budget skenario vs hari tersisa, supaya Hari 14 tidak overspend. |
| 14 | 📊 Review penuh — hitung CPA/ROAS per kampanye & per hook, jalankan keputusan scale/lanjut-testing/benahi-landing, cek syarat lookalike (≥100 event `Purchase`?) | — | Semua (live, dievaluasi) | Semua | Keputusan didokumentasikan tertulis sebelum ada satu ad pun disentuh lagi. |

> **Versi 7 hari saja?** Jalankan Hari 1–7 di atas apa adanya, tapi geser Kampanye 2 ke Hari 3 dan
> Kampanye 3 ke Hari 5 — hanya kalau pixel sudah terpasang sejak sebelum Hari 1. Set aset tetap sama.

---

## 8. Rencana pengujian (A/B) — urutan dan alasannya

| Ronde | Diuji | Funnel | Hari aktif | Kenapa urutan ini | Metrik penentu | Aksi setelah menang |
|---|---|---|---|---|---|---|
| 1 | **K1 vs C1** (Kendali vs Curiosity) | TOFU | H1–H5 | Rekomendasi eksplisit `ADS-HOOKS-v2.md`: keduanya TOFU tapi menyerang motivasi beda (frustrasi vs kekaguman). Pemenang menentukan nada seluruh akun untuk sisa siklus. | Hook rate 3-detik + CTR, dibaca setelah ±Rp100rb spend/ad | Angle pemenang jadi prioritas produksi bulan ke-2; angle kalah tetap dirotasi minor, tidak dihapus total. |
| 2 | **K2 vs T4 (K4/C4)** — variasi dalam angle pemenang Ronde 1 | TOFU | H3–H8 | Setelah tahu angle mana yang menang (kendali atau curiosity), uji apakah framing **konkret/skenario** (K2: "jam 11 malam") mengalahkan framing **visual/abstrak** (palette switcher) di dalam angle yang sama. | Hook rate + CTR | Format pemenang (konkret vs visual) jadi pola default brief kreatif berikutnya. |
| 3 | **C3 vs X1** (Transparansi demo vs Kontra-langganan) | MOFU | H4–H9 | Audiens hangat sudah kenal produk dari TOFU — pertanyaannya bergeser dari "apa ini?" ke "kenapa harus lanjut?". C3 menjawab dengan penurun risiko (demo tanpa daftar), X1 menjawab dengan pembanding harga. | Cost per `ViewContent` (buka demo) | Pesan pemenang jadi primary text default untuk semua ad MOFU baru. |
| 4 | **U1 vs X4** (Kejelasan harga vs Jawab keberatan tamu tua) | Retargeting | H7–H14 | Audiens panas sudah lihat produk & (mungkin) sudah lihat harga — ujian terakhir adalah apa yang menahan mereka: harga itu sendiri, atau kekhawatiran teknis (tamu orang tua). | Cost per `InitiateCheckout`, lalu CPA `Purchase` kalau volume cukup | Pemenang jadi hook utama retargeting bulan ke-2; yang kalah tetap standby untuk audiens yang jelas menunjukkan objection berbeda (mis. komentar soal instalasi app → tayangkan X4 spesifik ke mereka). |

**Catatan metodologi:** jangan baca hasil ronde mana pun sebelum ±Rp100rb spend per ad (floor yang
sama dipakai di kill rule §9) — di bawah itu, perbedaan hook rate/CTR biasanya noise, bukan sinyal.
M3 (P3, angle enkripsi data) sengaja **tidak** diadu head-to-head — ini angle eksploratif yang belum
pernah digarap kompetitor, dijalankan mandiri untuk dilihat apakah dapat traksi sama sekali sebelum
diikutsertakan dalam ronde pengujian formal di bulan ke-2.

---

## 9. KPI, benchmark, dan aturan kill/scale

**Semua angka di bawah adalah ancar-ancar niche pernikahan Meta Indonesia, bukan janji.** Operator
menetapkan sendiri skenario budget aktual di §10 — ini cuma alat baca cepat.

| Metrik | Benchmark sehat | Dipakai sebagai |
|---|---|---|
| CPM (Instagram, niche wedding ID) | Rp 20.000–45.000 / 1.000 impresi — Reels di ujung bawah, Feed/Story di ujung atas | Baca tren, bukan ambang aksi |
| CTR (klik tautan) | >1% kuat · 0,5–1% cukup · <0,5% lemah | **Ambang kill** |
| Hook rate (video 3 detik) | >25% kuat · 15–25% cukup · <15% lemah | **Ambang kill** |
| CPC | Rp 1.500–4.000 | Baca tren |
| Cost per `ViewContent` (buka demo) | Rp 3.000–8.000 | Ambang baca performa MOFU |
| Cost per `InitiateCheckout` | Rp 15.000–40.000 — **wajar jika sedikit**, ini titik gesekan terbesar produk bayar-dulu | Baca tren, jangan panik kalau kecil |
| CPA per `Purchase` (siklus pertama, nol testimoni) | Rp 90.000–180.000 — **lebih tinggi dari target akun matang** karena belum ada social proof | **Ambang scale** |
| Frequency (Retargeting) | Jaga <4x/minggu/orang | Ambang turunkan budget/ganti kreatif |

**Kill rule:** ad menembus ±Rp100rb spend DAN (hook rate <15% ATAU CTR <0,5%) → matikan. Sisakan
minimal 2 ad aktif per kampanye yang sedang berjalan. Jangan menilai ad dengan spend di bawah
±Rp100rb — sampelnya belum cukup.

**Scale rule:** ad set menahan CPA `Purchase` <Rp180rb stabil ≥3 hari, ATAU (kalau volume Purchase
masih terlalu kecil untuk dinilai) cost per `ViewContent` di rentang sehat + CTR >1% stabil 3 hari
→ naikkan budget +20–30%. Jangan digandakan, jangan diutak-atik lagi dalam 72 jam setelah naik
(reset learning phase).

**Jangan sentuh ad set dalam 72 jam pertama setelah tayang atau setelah budget dinaikkan** — ini
aturan tunggal paling sering dilanggar dan paling mahal kalau dilanggar.

---

## 10. Alokasi budget — skenario, bukan angka final

Tabel ini adalah titik awal untuk operator menetapkan sendiri, bukan rekomendasi yang harus diikuti
persis. Break-even secara teori rendah (produk digital margin ~90%, ROAS impas ~1,1–1,3x) — tapi
**14 hari pertama bukan target break-even**, sampelnya terlalu kecil untuk baca ROAS asli. Anggap
ini biaya riset hook + kalibrasi tracking, bukan biaya akuisisi matang.

| Skenario | Harian | 14 hari | Ancar-ancar klik | Ancar-ancar buka demo | Ancar-ancar `Purchase` nyata |
|---|---|---|---|---|---|
| Hemat | Rp 100rb | Rp 1,4jt | ~450–650 | ~250–400 | ~1–4 — cukup baca arah hook, BELUM cukup untuk keputusan CPA yang solid |
| Direkomendasikan | Rp 200rb | Rp 2,8jt | ~900–1.300 | ~500–800 | ~3–9 — baru di titik ini kill/scale rule punya data yang cukup dipercaya |
| Agresif | Rp 350rb | Rp 4,9jt | ~1.600–2.300 | ~900–1.400 | ~6–16 — HANYA masuk akal kalau pixel + CAPI + audiens sudah beres sejak Hari 1 |

**Split TOFU / MOFU / Retargeting, dan cara bergesernya antar-minggu** (di skenario mana pun):

| Minggu | TOFU | MOFU | Retargeting | Alasan |
|---|---|---|---|---|
| Minggu 1 (H1–H7) | 65% | 25% | 10% (sebagian besar belum spend — nunggu audiens & pixel) | Belum ada audiens hangat/panas untuk dibelanjai; hampir semua budget membangun jangkauan dingin + pool custom audience. |
| Minggu 2 (H8–H14) | 40% | 30% | 30% | Pool hangat & panas sudah cukup besar; kill rule sudah memangkas TOFU yang lemah, sisa budget bisa dipindah ke tahap yang lebih dekat ke `Purchase`. |

---

## 11. Risiko dan yang bisa salah

**1. Ini produk bayar-dulu, tanpa masa uji coba, tanpa testimoni — konversi cold-traffic akan
lebih rendah dari benchmark umum.** Standar industri e-commerce untuk cold-traffic-ke-pembelian
sering di kisaran 1–3%; untuk produk yang baru bisa dirasakan penuh **setelah** bayar, dan tanpa
satu pun bukti sosial, realistis mengasumsikan angka itu jauh di bawah 1% di siklus pertama. Ini
bukan kegagalan eksekusi — ini bentuk struktural produk saat ini. Pekerjaan 14 hari ini adalah
menghasilkan sinyal `ViewContent`/`InitiateCheckout` yang bisa dibaca, bukan mengejar volume beli.

**2. Landing lama masih live sampai di-deploy.** Kalau ada yang tergesa menyalakan iklan sebelum
§0 selesai, budget mengarah ke halaman yang masih menjanjikan "coba gratis" — risiko hukum
(iklan menjual produk yang tidak ada) plus permintaan refund dari pembeli yang merasa ditipu.

**3. Pixel belum terpasang (terverifikasi hari ini, bukan asumsi).** Kalau instalasi pixel +
Conversions API molor dari Hari 0, Kampanye 3 tertunda mundur seluruhnya, dan CPA `Purchase` yang
dibaca di §9 tidak bisa dipercaya (sinyal hilang, bukan performa buruk).

**4. Harga coret permanen berisiko ditolak Meta.** Ad review Meta bisa menandai diskon yang terlihat
tidak pernah benar-benar berlaku sebagai klaim menyesatkan. Keputusan soal harga coret ini harus
diambil **sebelum** produksi kreatif R1/R3, bukan sesudah ditolak review.

**5. Ukuran audiens custom mungkin terlalu kecil untuk Kampanye 3 tepat waktu.** Kalau trafik dari
Kampanye 1–2 tidak cukup untuk membentuk pool ≥100 di Hari 7, Retargeting harus ditunda — jangan
paksa nyalakan ad set yang tidak akan delivery, itu cuma membakar sisa learning budget dengan sia-sia.

**6. Label Premium bisa lolos tanpa sengaja di kreatif buku tamu/QR** kalau produksi terburu-buru
(terutama saat rotasi H10/H12). Checklist §12 dan cek harian §7 Hari 12 ada untuk menangkap ini.

**7. Solo operator, waktu terbatas.** Hari-hari keputusan (5, 8, 11, 13, 14) butuh lebih dari 5
menit — ada perhitungan dan keputusan tertulis, bukan cuma lihat dashboard. Kalau waktu benar-benar
mepet, prioritaskan Hari 1, 5, 8, dan 14 di atas hari-hari penambahan kreatif (2, 3, 6, 9, 10, 12)
— lebih baik telat menambah varian daripada telat mematikan ad yang boros.

---

## 12. Keselarasan dengan landing page

- **URL tujuan:** `https://www.fincards.land/#vibe` — anchor ini benar-benar ada
  (`src/components/marketing/VibeExploration.tsx:161`) dan dituju baik oleh tombol hero maupun CTA
  penutup di kode saat ini. Jangan arahkan ke halaman lain atau ke akar situs tanpa anchor.
- **Tombol hero sungguhan berbunyi "Lihat Demo Lengkap"** (`ctaPrimary` di
  `src/lib/i18n/dictionaries/landing.ts:8`), bukan "Lihat Demo" pendek — pakai string persis ini di
  teks on-screen/end-card kreatif yang mengarahkan ke demo, supaya yang dijanjikan iklan = yang
  dilihat pengunjung sedetik setelah klik. (`ADS-LANDING.md` menyingkatnya jadi "Lihat Demo" di
  bagian aturan tayang — dokumen ini memakai string persis dari kode.)
- **Tombol CTA Meta Ads Manager itu sendiri adalah dropdown preset**, bukan teks bebas — tidak ada
  opsi literal "Lihat Demo". Yang realistis dipakai: **"Pelajari Selengkapnya"** (Learn More) untuk
  TOFU & MOFU. Ketepatan pesan dijaga lewat *primary text* dan *on-screen text* kreatif, bukan lewat
  tombol CTA platform.
- **Reassurance line yang konsisten di kode:** "Bayar sekali, tanpa langganan bulanan" (muncul di
  hero, trust bar, dan CTA penutup). Pakai kalimat ini kalau kreatif butuh satu baris kepastian
  singkat — sudah teruji cocok dengan nada halaman.
- **UTM:** `?utm_source=ig&utm_medium=paid&utm_campaign=ig14v2&utm_content=<id-aset>#vibe` — query
  string dulu, `#vibe` di paling akhir (apa pun setelah `#` tidak ikut terkirim ke server, urutan
  ini wajib).
- **FAQ item pertama di landing** ("Bisa lihat contohnya dulu sebelum bayar?") sudah menjawab
  langsung keberatan bayar-dulu — kreatif MOFU/Retargeting boleh mengarahkan orang untuk scroll ke
  FAQ (`#faq`) kalau formatnya carousel/statis dengan CTA sekunder "lihat FAQ".

---

## 13. Checklist pra-tayang

- [ ] Landing versi baru **ter-deploy** dan diverifikasi langsung di HP (§0).
- [ ] Sapuan kata terlarang dijalankan ke **file ini sendiri** sebelum dipakai:
      `grep -rniE "coba gratis|gratis|trial|bikin dulu|bayar saat|bayar kalau" ADS-INSTAGRAM-14-HARI-v2.md`
      — hasil yang valid hanya baris yang menyebut larangan itu sendiri atau "gratis" yang jelas
      merujuk demo publik.
- [ ] Harga dicek ulang di `/admin/templates` di hari kreatif diproduksi **dan** di hari tayang.
- [ ] Keputusan harga coret (pertahankan atau hapus) sudah diambil sebelum render R1/R3.
- [ ] Klaim buku tamu/QR (R3) diberi label **"Premium"** — dicek ulang, bukan diasumsikan.
- [ ] Klaim "seumur hidup" hanya menempel ke Premium, tidak pernah ke Basic.
- [ ] Nol testimoni/angka pengguna karangan di kreatif apa pun.
- [ ] Meta Pixel terpasang + event `PageView`/`ViewContent`/`InitiateCheckout`/`Purchase` terverifikasi
      lewat Meta Events Manager (test event, bukan asumsi kode sudah benar).
- [ ] Conversions API dari webhook Midtrans (disarankan, lihat §3) — kalau belum sempat sebelum
      Hari 1, catat sebagai utang teknis dan andalkan rekonsiliasi manual di Hari 11.
- [ ] IG akun bisnis tersambung Meta Business Suite; placement dibatasi Instagram only.
- [ ] Custom audiences dibuat: video viewer, IG engager 30 hari (siap dari Hari 1, tidak butuh pixel).
- [ ] Nomor WhatsApp di trust bar (`BRAND_WHATSAPP_URL`) benar-benar dipantau — trust bar mengarahkan
      keraguan langsung ke sana.
- [ ] Skenario budget (§10) dipilih dan dicatat sebagai starting point, bukan angka mati.
- [ ] SOP minta testimoni H+3 sudah siap dijalankan **detik itu juga** kalau ada `Purchase` pertama masuk.

---

## 14. Setelah Hari 14

Dokumentasikan tertulis: hook pemenang tiap ronde (§8), CPA/ROAS aktual per kampanye, dan apakah
syarat lookalike pembeli (≥100 event `Purchase` asli) sudah terpenuhi. Kalau belum, lookalike tetap
ditunda dan siklus bulan ke-2 mengulang pola interest+life-event yang sama dengan kreatif yang
sudah divalidasi menang. Kalau testimoni asli sudah masuk, angle social-proof yang terkunci di
`ADS-HOOKS-v2.md` dibuka duluan — sudut itu diperkirakan jadi yang terkuat begitu tersedia, karena
untuk produk bayar-dulu, bukti dari pasangan nyata adalah pengganti satu-satunya dari uji coba yang
tidak dimiliki.
