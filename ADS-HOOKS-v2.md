# Hook Penghenti Scroll v2 — FinCards

> **Menggantikan `ADS-HOOKS.md`** (24 Juni 2026), yang dibangun di atas USP palsu
> "gratis merancang, bayar saat terbit". Dokumen lama diarsipkan dengan penanda STOP.
>
> Disusun 28 Juli 2026 · 20 hook · 5 angle · **semua klaim diverifikasi ke kode & DB**

---

## ⚠️ Pagar yang tidak boleh dilanggar

**FinCards bayar dulu.** Editor terkunci `PaymentGate` sampai pembayaran lunas. Verifikasi: `src/app/[template]/[slug]/dashboard/page.tsx`.

**Kata terlarang di semua iklan:** "coba gratis" · "trial" · "rancang gratis" · "bikin dulu bayar belakangan" · "bayar saat terbit" · "gratis" (kecuali merujuk **demo publik** di landing).

**Yang gratis hanya satu:** demo lengkap di `fincards.land`, tanpa daftar, tanpa isi form.

---

## Hook Foundation

**Produk:** FinCards — undangan pernikahan digital sinematik. Template **Lovebirds** (hangat, polaroid, botanical) & **Solary** (tata surya 3D, perjalanan antar-planet).

**Target audiens:** calon pengantin perempuan 23–30, menikah 2–4 bulan lagi, aktif di Instagram, pengambil keputusan estetika pernikahan.

**Core pain:** takut undangannya pasaran; repot rekap RSVP & amplop manual; **dan — yang paling sering tidak diucapkan — takut tergantung pada admin yang lambat membalas chat saat ada perubahan mendadak.**

**Core desire:** undangan yang bikin tamu bertanya "bikin di mana?", sekaligus bisa diurus sendiri tanpa drama.

**USP sebenarnya (semua terverifikasi):**
- **Kendali penuh di tangan pasangan** — fitur `Self-edit (palette and ornament switcher included) via dashboard` tercatat di tiap paket. Revisi tanpa batas, tanpa biaya tambahan, tanpa antre balasan admin.
- **Demo lengkap tanpa daftar** — bukan screenshot, undangan sungguhan yang bisa di-scroll.
- **Bayar sekali, tanpa langganan bulanan.**
- **Amplop digital** langsung ke rekening · **galeri unlimited** · **backsound bebas atur**.
- **Buku tamu + QR check-in** (Premium saja).
- **Data tamu terenkripsi** (AES-GCM, patuh PDP) — hampir tidak ada kompetitor yang bisa klaim ini.
- **10 palette + ornament switcher** bisa diganti sendiri kapan saja.

**Harga (dibaca dari `template_plans`, 28 Juli 2026 — SELALU cek ulang sebelum tayang):**

| Template | Paket | Harga | Coret | Kuota | Masa aktif |
|---|---|---|---|---|---|
| Solary | Basic | Rp 199.999 | Rp 299.999 | 400 tamu | 1 tahun |
| Lovebirds | Basic | Rp 199.999 | Rp 299.999 | 400 tamu | 1 tahun |
| Keduanya | Premium | Rp 249.999 | Rp 349.999 | 500 tamu | **seumur hidup** |

⚠️ Harga digerakkan DB lewat `/admin/templates`. **Jangan hardcode di materi iklan** tanpa mengecek ulang hari itu juga.
⚠️ Harga coret aktif permanen. Kalau tidak pernah benar-benar dijual di harga coret itu, **hapus** — diskon semu berisiko ditolak platform iklan dan melanggar aturan perlindungan konsumen.

**Proof points:** ⚠️ **belum ada testimoni asli** (DB dibersihkan untuk go-live). Semua hook social proof di bawah **terkunci** sampai ada pelanggan sungguhan.

**Platform prioritas:** Instagram/Meta · TikTok · Google Search.

**Register:** teks hook santai-hangat, sapa **"kamu"**. Nol kata ganti orang pertama (tidak ada "kami"/"saya"). Narasi impersonal atau FinCards sebagai subjek.

---

## Angle 1 — Kendali (angle utama, pengganti sudut "gratis")

Ini pembeda paling tajam yang benar-benar dimiliki. Banyak jasa undangan digital di Indonesia dijalankan lewat WA: pesan ke admin, admin yang membuatkan, revisi dibatasi 2–3 kali, tiap perubahan menunggu balasan. FinCards membalik itu.

### K1 — "Undangannya kamu yang pegang. Bukan nunggu admin bales chat."
**A/B:** "Gedungnya pindah H-3. Mau nunggu admin online, atau ganti sendiri sekarang?"
**Karakter:** 58 · **Platform:** Instagram Reels, TikTok · **Funnel:** TOFU
**Kenapa jalan:** Menyerang pengalaman buruk yang hampir semua orang pernah alami, bukan menjual fitur. Menciptakan musuh bersama (admin lambat) tanpa menyebut merek kompetitor.
**Cara pakai:** Video split-screen — kiri chat "halo kak, admin lagi offline" centang satu; kanan dashboard FinCards, jam acara diganti, langsung live.

### K2 — "Salah tanggal jam 11 malam? Ganti sendiri, detik itu juga."
**A/B:** "Typo nama mertua di undangan. Panik? Nggak usah — tinggal edit."
**Karakter:** 52 · **Platform:** TikTok, Reels · **Funnel:** TOFU
**Kenapa jalan:** Skenario spesifik jam 11 malam bikin nyata. Ketakutan typo di nama keluarga itu universal di pernikahan Indonesia.
**Cara pakai:** Rekam layar asli: buka dashboard, ubah teks, refresh link, selesai. Tanpa musik dramatis — biarkan kecepatannya yang bicara.

### K3 — "Revisi tanpa batas. Tanpa biaya tambahan. Tanpa nunggu."
**A/B:** "Berapa kali boleh revisi? Sebanyak yang kamu mau."
**Karakter:** 51 · **Platform:** Instagram Feed, Google Search · **Funnel:** MOFU
**Kenapa jalan:** Menjawab langsung batasan paling umum di jasa undangan berbasis admin.
**Cara pakai:** Statis dengan tiga baris besar. Cocok jadi headline Google Search untuk keyword "jasa undangan digital revisi".

### K4 — "Palette-nya nggak cocok sama dekorasi? Ganti sendiri, 10 pilihan."
**A/B:** "Warna undangan harus samaan sama pelaminan. Sekarang bisa kamu atur sendiri."
**Karakter:** 62 · **Platform:** Reels, TikTok · **Funnel:** TOFU
**Kenapa jalan:** Menyentuh obsesi nyata calon pengantin soal keselarasan warna, sekaligus mendemonstrasikan fitur yang bisa dilihat langsung di demo.
**Cara pakai:** Rekam palette switcher di landing — 10 palette berganti cepat di undangan yang sama. Ini konten paling memuaskan ditonton dari seluruh produk.

---

## Angle 2 — Pain / Problem

### P1 — "Undangan kamu nggak harus mirip undangan semua orang."
**A/B:** "Capek lihat undangan digital yang bentuknya itu-itu lagi?"
**Karakter:** 53 · **Platform:** TikTok, Reels · **Funnel:** TOFU
**Kenapa jalan:** Mengaktifkan ketakutan jadi pasaran. Kalimat pendek yang memicu "iya juga ya" pada audiens visual-first.
**Cara pakai:** Buka dengan grid undangan template generik, lalu potong keras ke hero sinematik Lovebirds.

### P2 — "Rekap RSVP di grup keluarga = 200 chat, 0 kepastian."
**A/B:** "Masih hitung tamu manual dari chat WA satu-satu?"
**Karakter:** 49 · **Platform:** Reels, Facebook · **Funnel:** TOFU
**Kenapa jalan:** Kekacauan rekap manual itu penderitaan yang sangat spesifik dan sangat dikenali.
**Cara pakai:** Screenshot grup WA berantakan → potong ke dashboard RSVP yang rapi terurut.

### P3 — "Nomor HP ratusan keluarga kamu, disimpan di mana?"
**A/B:** "Daftar tamu itu data pribadi. Diperlakukan seperti itu juga di sini."
**Karakter:** 47 · **Platform:** Instagram Feed, Google Search · **Funnel:** MOFU
**Kenapa jalan:** Sudut yang **belum ada kompetitor pakai**, padahal datanya nyata: daftar tamu dienkripsi at-rest. Menyentuh kecemasan yang belum diucapkan siapa pun di kategori ini.
**Cara pakai:** Statis, tenang, tanpa hiperbola. Cocok juga jadi konten edukasi organik.

### P4 — "Hari-H, penerima tamu masih coret-coret nama di kertas."
**A/B:** "Buku tamu kertas itu hilang. Yang QR nggak."
**Karakter:** 55 · **Platform:** Reels, TikTok · **Funnel:** MOFU
**Kenapa jalan:** Memvisualkan momen kacau yang sudah dibayangkan calon pengantin.
**Cara pakai:** Rekam check-in QR sungguhan di `/checkin`. ⚠️ **Wajib sebut "fitur Premium"** — jangan iklankan di paket dasar.

---

## Angle 3 — Curiosity

### C1 — "POV: tamu buka undanganmu, ceritanya kebuka pelan-pelan kayak film."
**A/B:** "Undangan? Ini lebih mirip film pendek."
**Karakter:** 66 · **Platform:** TikTok, Reels · **Funnel:** TOFU
**Kenapa jalan:** Format POV mendominasi konten pernikahan. Janji sinematiknya ditepati produk — jadi tidak ada rasa tertipu setelah klik.
**Cara pakai:** Rekam layar scroll penuh tanpa potongan. Hook terkuat di dokumen ini.

### C2 — "Scroll-nya bukan ke bawah. Tapi ke luar angkasa."
**A/B:** "Ada undangan yang tamunya jalan-jalan antar planet dulu."
**Karakter:** 46 · **Platform:** TikTok · **Funnel:** TOFU
**Kenapa jalan:** Solary itu benar-benar tidak biasa untuk kategori undangan — ketidaklaziman itu sendiri yang menghentikan scroll.
**Cara pakai:** Rekam perjalanan antar-planet Solary. Jangan jelaskan di 3 detik pertama; biarkan penasaran.

### C3 — "Buka demo lengkapnya sekarang. Nggak perlu daftar, nggak perlu isi form."
**A/B:** "Lihat dulu undangannya beneran kayak apa — tanpa daftar."
**Karakter:** 68 · **Platform:** Semua · **Funnel:** MOFU
**Kenapa jalan:** Penurun friksi yang **jujur**. Kebanyakan kompetitor minta chat admin dulu baru dikirim contoh; di sini langsung bisa dibuka.
**Cara pakai:** CTA ke `fincards.land`. Gunakan kata "demo", bukan "gratis" — hindari kesan uji coba produk.

### C4 — "Undangannya bisa disetel sesuai warna dekorasi kamu."
**A/B:** "Satu undangan, sepuluh mood berbeda."
**Karakter:** 48 · **Platform:** Reels · **Funnel:** TOFU
**Kenapa jalan:** Rasa penasaran visual yang langsung terpuaskan dalam 5 detik.
**Cara pakai:** Sama seperti K4 — rekam palette switcher.

---

## Angle 4 — Contrarian

### X1 — "Bayar sekali. Bukan langganan bulanan yang lupa distop."
**A/B:** "Undangan buat sehari, kenapa bayarnya tiap bulan?"
**Karakter:** 52 · **Platform:** Instagram Feed, Google Search · **Funnel:** MOFU
**Kenapa jalan:** Menyerang model langganan langsung. **Benar** — Midtrans sekali bayar.
**Cara pakai:** Perbandingan dua kolom sederhana. Jangan sebut nama kompetitor.

### X2 — "Undangan digital termurah biasanya kelihatan termurah."
**A/B:** "Ada harga, ada tamu yang bilang 'bikin di mana?'"
**Karakter:** 54 · **Platform:** Instagram Feed · **Funnel:** MOFU
**Kenapa jalan:** Membingkai harga sebagai sinyal kualitas — memindahkan percakapan dari murah ke pantas. Berguna khusus karena modelnya bayar-dulu.
**Cara pakai:** Statis, tipografi tebal. Pasangkan dengan visual paling premium yang dimiliki.

### X3 — "Undangan pernikahan itu dilihat ratusan orang. Sekali."
**A/B:** "Sekali sebar, nggak bisa ditarik. Pastikan yang disebar itu bagus."
**Karakter:** 51 · **Platform:** Semua · **Funnel:** MOFU
**Kenapa jalan:** Membingkai ulang taruhannya. Menaikkan nilai keputusan tanpa menakut-nakuti.
**Cara pakai:** Cocok jadi baris pembuka caption panjang.

### X4 — "Nggak perlu install apa-apa. Tamu tinggal buka link."
**A/B:** "Tante kamu nggak akan install aplikasi. Untung nggak perlu."
**Karakter:** 49 · **Platform:** Facebook, Reels · **Funnel:** BOFU
**Kenapa jalan:** Menjawab keberatan nyata dari calon pengantin yang memikirkan tamu berusia lebih tua.
**Cara pakai:** Humor ringan. Bagus untuk retargeting.

---

## Angle 5 — Urgency / Offer

⚠️ Semua hook di bawah menyebut harga. **Cek `/admin/templates` di hari penayangan.**

### U1 — "Mulai Rp 199.999. Bayar sekali, undangan aktif setahun."
**A/B:** "Rp 199.999 sekali bayar — bukan per bulan."
**Karakter:** 53 · **Platform:** Google Search, Instagram Feed · **Funnel:** BOFU
**Kenapa jalan:** Harga + kejelasan syarat. Untuk produk bayar-dulu, transparansi harga menurunkan friksi lebih besar daripada menyembunyikannya.
**Cara pakai:** Retargeting untuk yang sudah buka demo. Harga Basic sama di dua template (Rp 199.999), jadi tidak perlu sebut template tertentu.

### U2 — "Premium: seumur hidup, plus buku tamu QR."
**A/B:** "Undangannya nggak hangus setahun. Premium aktif selamanya."
**Karakter:** 44 · **Platform:** Instagram Feed · **Funnel:** BOFU
**Kenapa jalan:** "Seumur hidup" itu **benar** untuk Premium (`duration_days` NULL) dan jadi pembeda kuat dari Basic.
**Cara pakai:** Perbandingan Basic vs Premium. Jangan pernah menempelkan klaim seumur hidup ke Basic.

### U3 — "Undangan disebar H-30. Mundur terus? Waktunya makin mepet."
**A/B:** "Makin dekat hari-H, makin sedikit waktu buat mikirin undangan."
**Karakter:** 58 · **Platform:** Reels, Google Search · **Funnel:** BOFU
**Kenapa jalan:** Urgensi yang **nyata dan tidak dibuat-buat** — tenggatnya memang ada, tidak perlu diskon palsu.
**Cara pakai:** Targetkan audiens dengan tanggal pernikahan 1–3 bulan lagi.

### U4 — "Kuota tamu 400. Kurang? Tambah per 100, kapan saja."
**A/B:** "Daftar tamu membengkak? Kuotanya ikut, tanpa bikin ulang."
**Karakter:** 50 · **Platform:** Instagram Feed · **Funnel:** BOFU
**Kenapa jalan:** Menghapus keberatan "nanti kalau tamunya nambah gimana". Terverifikasi: add-on kuota per blok 100.
**Cara pakai:** Retargeting untuk yang sudah lihat harga tapi belum beli.

---

## 🔒 Social Proof — TERKUNCI

**Belum ada testimoni pelanggan asli.** Tidak ada satu pun hook social proof yang boleh tayang sampai ada.

**Jangan pernah** mengarang testimoni, jumlah pengguna, atau rating. Selain melanggar aturan platform iklan dan hukum perlindungan konsumen, sekali ketahuan, merek premium tidak bisa pulih.

**Begitu ada 3–5 pelanggan asli**, minta lewat WhatsApp H+3 setelah acara (saat emosinya masih hangat), publikasikan lewat `/admin/testimonials`, lalu tulis hook berpola:
- "Tamu-tamu nanya terus 'bikin di mana?'" — *[nama], menikah [bulan]*
- Screenshot chat asli tamu yang memuji (dengan izin tertulis)
- Rekaman layar buku tamu QR di hari-H sungguhan

Sudut ini akan jadi yang **terkuat** begitu tersedia — justru karena modelnya bayar-dulu, bukti dari pasangan nyata adalah pengganti satu-satunya dari uji coba yang tidak dimiliki.

---

## Prioritas penayangan

| Prioritas | Hook | Angle | Perkiraan dampak | Platform |
|---|---|---|---|---|
| 1 | **K1** Undangannya kamu yang pegang | Kendali | Tinggi | Reels, TikTok |
| 2 | **C1** POV: tamu buka undanganmu | Curiosity | Tinggi | TikTok, Reels |
| 3 | **K2** Salah tanggal jam 11 malam | Kendali | Tinggi | TikTok |
| 4 | **C3** Buka demo, tanpa daftar | Curiosity | Sedang–Tinggi | Semua |
| 5 | **X1** Bayar sekali, bukan langganan | Contrarian | Sedang | Feed, Google |
| 6 | **P3** Nomor HP keluarga disimpan di mana | Pain | Sedang (belum tergarap) | Feed, Google |
| 7 | **U1** Mulai Rp 199.999 | Urgency | Sedang (BOFU) | Retargeting |
| 8 | **K4/C4** Palette switcher | Kendali | Sedang | Reels |

**Urutan uji yang disarankan:** jalankan K1 vs C1 lebih dulu — keduanya TOFU tapi menyerang motivasi berbeda (frustrasi vs kekaguman). Pemenangnya menentukan nada seluruh akun.

---

## Checklist sebelum tayang

- [ ] Nol kata "gratis" kecuali merujuk demo publik
- [ ] Harga dicek ulang di `/admin/templates` hari itu juga
- [ ] Klaim buku tamu/QR selalu diberi label **Premium**
- [ ] Klaim "seumur hidup" hanya untuk Premium
- [ ] Nol testimoni/angka karangan
- [ ] Landing page tujuan: `fincards.land` (pastikan sudah ter-deploy versi terbaru)
- [ ] CTA memakai kata yang sama dengan tombol hero: **"Lihat Template"**
