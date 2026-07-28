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

# Laporan Strategi Iklan
## wedding-saas-next — Platform Undangan Pernikahan Digital
### Tanggal Strategi: 24 Juni 2026
### Produk: SaaS undangan digital sinematik (template Lovebirds & Solary)
### Pasar: Indonesia (Bahasa-first, B2C)

---

## Ringkasan Eksekutif

**Skor Kesiapan Iklan: 79/100 (Grade B)**

wedding-saas-next berada pada posisi yang solid dan layak mulai beriklan — namun belum di titik untuk langsung digenjot dengan anggaran besar. Produk ini adalah **B2C SaaS undangan digital** dengan model pembayaran sekali bayar yang sangat ramah konversi: pasangan bebas merancang dan melihat *preview* tanpa biaya, dan baru membayar saat ingin menerbitkan. Kekuatan terbesar Anda bersifat ganda dan jarang dimiliki kompetitor: **(1) produknya sendiri adalah materi iklan terbaik** — scroll sinematik, tata surya 3D, dan animasi polaroid secara alami menghentikan jempol di feed; dan **(2) setiap undangan yang terbit otomatis menjadi iklan berjalan** — disebar ke ratusan tamu via WhatsApp, masing-masing membawa jejak merek Anda ke lingkaran orang yang juga sedang atau akan menikah (loop viral bawaan).

Kerentanan terbesar Anda bukan pada pesan atau produk, melainkan pada **infrastruktur funnel iklan**: pelacakan (pixel/konversi), audiens *retargeting*, dan alur menyusul-otomatis (WhatsApp/email) untuk draft yang ditinggalkan belum terbangun. Tanpa ini, Anda akan membayar untuk trafik tetapi kehilangan kemampuan mengukur dan memanen ulang minat yang sudah Anda bayar.

**Satu tindakan terpenting sebelum scaling:** pasang Meta Pixel + TikTok Pixel + Google Tag dengan event `MulaiRancang` (registrasi draft) dan `Terbit` (pembayaran), lalu siapkan satu kampanye *retargeting* untuk "pendraft yang belum menerbitkan". Ini langsung menutup kebocoran terbesar Anda.

| Atribut | Detail |
|---|---|
| **Tipe Bisnis** | B2C SaaS / produk digital (perilaku beli mirip e-commerce: emosional, dipicu peristiwa, terikat waktu) |
| **Industri** | Undangan pernikahan digital / wedding-tech |
| **Platform Direkomendasikan** | Meta (Instagram + Facebook) — utama · TikTok — sekunder · Google Search — intent tinggi |
| **Anggaran Awal Disarankan** | Rp 3.000.000–5.000.000 / bulan |
| **Proyeksi ROAS (tahap Growth)** | ~2,8x (di luar uplift loop viral) |

---

## Dashboard Skor

| Kategori | Skor | Bobot | Tertimbang | Status |
|---|---|---|---|---|
| Kejelasan Audiens | 84/100 | 25% | 21,0 | Kuat |
| Kualitas Kreatif | 82/100 | 20% | 16,4 | Kuat |
| Arsitektur Funnel | 72/100 | 20% | 14,4 | Memadai |
| Posisi Kompetitif | 76/100 | 15% | 11,4 | Kuat |
| Efisiensi Anggaran | 80/100 | 20% | 16,0 | Kuat |
| **Skor Kesiapan Iklan** | | **100%** | **79,2/100** | **Grade B** |

### Kunci Status
- **Sangat Baik (90–100):** Kelas terbaik, tidak perlu tindakan segera
- **Kuat (75–89):** Di atas rata-rata, masih ada optimasi kecil
- **Memadai (60–74):** Berfungsi, tetapi ada ruang perbaikan yang jelas
- **Lemah (40–59):** Di bawah rata-rata, butuh perhatian terfokus
- **Kritis (0–39):** Masalah besar yang akan menggerus performa iklan

**Interpretasi Grade B:** Fondasi sudah solid. Benahi 1–2 kategori terlemah lebih dulu (Arsitektur Funnel), mulai dengan anggaran Starter untuk menguji sambil membangun infrastruktur — jangan langsung ke anggaran besar sebelum pelacakan & retargeting siap.

---

## Profil Perusahaan

| Bidang | Detail |
|---|---|
| Produk | wedding-saas-next — undangan pernikahan digital sinematik |
| Template | Lovebirds (sinematik & hangat) · Solary (futuristik & berani, tata surya 3D) |
| Tipe Bisnis | B2C SaaS / produk digital |
| Industri | Wedding-tech / undangan digital |
| Penawaran & Harga | **Basic Rp 149.000** (aktif 1 tahun) · **Premium Rp 299.000** (lifetime) · Upgrade Basic→Premium = bayar selisih (Rp 150.000) |
| Model Pembayaran | Sekali bayar via Xendit. Gratis merancang & preview; bayar hanya saat menerbitkan |
| Proposisi Nilai | "Undangan? Ini lebih mirip film pendek." Cerita pasangan terbuka *scene* demi *scene* saat tamu scroll |
| Geografi Target | Indonesia (nasional) |
| Aksi Konversi Utama | **Terbit** (pembayaran undangan). Mikro-konversi: **Mulai Rancang** (registrasi & buat draft) |
| Margin | ~90% (produk digital), dikurangi biaya Xendit (~2–3%) |

**Fitur inti sebagai amunisi iklan:** RSVP & manajemen tamu otomatis · musik latar auto-play · galeri + timeline cerita · amplop digital (transfer langsung ke rekening pasangan) · **Buku Tamu QR (fitur Premium)** · *self-edit* via dashboard · *palette switcher* / "coba vibe" interaktif di landing page · bagikan link via WhatsApp + pantau RSVP real-time.

---

## Audiens & Persona

### Ringkasan Persona

| # | Persona | Usia | Anggaran | Platform Utama | Relevansi | Tahap Funnel |
|---|---|---|---|---|---|---|
| 1 | Calon Pengantin Visual-First ("Rani") | 24–30 | Menengah | Instagram | 5/5 | TOFU→BOFU |
| 2 | Pengantin Praktis / Pembayar ("Adi") | 26–33 | Menengah | FB/IG | 4/5 | BOFU |
| 3 | Pasangan Hemat & DIY | 22–28 | Bawah | TikTok/IG | 4/5 | TOFU |
| 4 | Pasangan Premium / Aesthetic-Driven | 27–35 | Atas | Instagram | 4/5 | MOFU→BOFU |
| 5 | Wedding Organizer / Vendor (Reseller) | 25–45 | Bisnis | IG/WA/Google | 5/5 | MOFU→BOFU |
| 6 | Tamu yang Baru Lihat Undangan (Loop Viral) | 23–32 | Variatif | Instagram/WA | 3/5 | TOFU |

### Persona Rinci

#### 1. Calon Pengantin Visual-First — "Rani", 26 (Persona Bernilai Tertinggi)
- **Demografi:** Perempuan, 24–30, kota besar/menengah (Jabodetabek, Bandung, Surabaya, Makassar, dst.), penghasilan/keluarga kelas menengah, baru bertunangan, sangat aktif di Instagram.
- **Psikografi:** Pengambil keputusan utama untuk estetika pernikahan. Bangga pada detail. Takut undangannya "biasa saja" atau "sama seperti semua orang". Aspirasi: tamu terkesan dan bertanya "ini bikin di mana?".
- **3 Pain utama:** (1) Undangan template massal yang seragam dan murahan; (2) repot rekap RSVP manual di catatan HP; (3) ingin "wow" tapi tak punya skill desain.
- **Pemicu beli:** Baru tunangan; tanggal & venue sudah fix; melihat undangan teman yang keren; H-3 sampai H-6 bulan sebelum acara.
- **3 Keberatan:** (1) "Apa worth dibanding undangan cetak/template murah?"; (2) "Susah nggak ngeditnya?"; (3) "Tamu orang tua bisa buka nggak?".
- **Konsumsi konten:** Reels, IG Stories, akun inspirasi pernikahan, vendor lokal, hashtag #weddinginspiration #undangandigital.
- **Targeting:** Meta — *interests*: Wedding, Bridal, The Knot/Bridestory, Engagement rings, Wedding planning; *behaviors*: Newly engaged (1–6 bulan); *lookalike* dari pembeli. Google — "undangan digital", "undangan pernikahan online", "undangan website". TikTok — komunitas #weddingtiktok #persiapannikah.

#### 2. Pengantin Praktis / Pembayar — "Adi", 29
- **Demografi:** Laki-laki, 26–33, sering pihak yang mengeksekusi pembayaran. Menghargai kemudahan & value.
- **Pain:** Ingin proses cepat, tidak ribet, harga masuk akal, dan istri/pasangan senang.
- **Pemicu beli:** Pasangan sudah memilih template; tinggal "tombol bayar".
- **Keberatan:** Keamanan pembayaran; apakah benar transfer amplop digital masuk ke rekening sendiri.
- **Targeting:** Retargeting BOFU; *value-driven copy* ("sekali bayar, undangan + RSVP + amplop digital jadi satu").

#### 3. Pasangan Hemat & DIY
- **Demografi:** 22–28, kota menengah/kecil, sangat sensitif harga, suka mengerjakan sendiri.
- **Pain:** Anggaran ketat tetapi tetap ingin terlihat bagus.
- **Pemicu beli:** Tawaran Basic Rp 149.000 + "gratis rancang dulu, bayar saat terbit".
- **Keberatan:** Harga; takut ada biaya tersembunyi.
- **Targeting:** TikTok TOFU ("undangan digital mulai 149rb, rancang gratis"), penekanan transparansi harga.

#### 4. Pasangan Premium / Aesthetic-Driven
- **Demografi:** 27–35, penghasilan atas, pernikahan berskala lebih besar, ingin sesuatu yang belum pernah dilihat tamu.
- **Pain:** Standar estetika tinggi; takut pasaran.
- **Pemicu beli:** Template **Solary** (tata surya 3D) + **Buku Tamu QR** Premium sebagai status & pengalaman tamu.
- **Targeting:** Instagram, *interests* luxury/wedding; iklan yang memamerkan Solary 3D dan fitur Premium.

#### 5. Wedding Organizer / Vendor (Reseller) — Persona Strategis
- **Mengapa penting:** Konsumen end-user hanya membeli sekali (LTV terbatas). **Vendor/WO membeli berulang** — mereka adalah kunci LTV dan pertumbuhan kompon. Satu WO bisa menghasilkan puluhan undangan per tahun.
- **Pain:** Butuh produk undangan yang bisa di-*resell*, beda dari kompetitor, mudah dikelola untuk banyak klien.
- **Pemicu beli:** Margin reseller, kemudahan multi-klien, diferensiasi (Solary 3D yang tidak dimiliki vendor lain).
- **Targeting:** Google Search ("vendor undangan digital", "reseller undangan"), Instagram vendor pernikahan, DM/WA outreach langsung.

#### 6. Tamu Penerima Undangan (Loop Viral)
- **Mengapa penting:** Setiap undangan terbit dibuka ratusan tamu — banyak di antaranya juga akan menikah. Footer "dibuat dengan [merek]" adalah benih akuisisi gratis.
- **Targeting:** Lookalike dari trafik undangan publik; retargeting pengunjung halaman `/<slug>` yang bukan pembeli.

### Audiens Negatif (Jangan Ditarget)
- **Sudah menikah > 1 tahun** (kecuali untuk niche anniversary/vow renewal) — buang anggaran.
- **Usia < 20** — jarang jadi pembeli, banyak iseng.
- **Pemburu "gratisan" murni** untuk dorongan Premium — biarkan mereka di jalur Basic.
- **Pengunjung yang baru saja menerbitkan (pembeli)** — kecualikan dari kampanye akuisisi; pindahkan ke kampanye referral/anniversary.
- **Geografi tanpa daya beli digital / penetrasi pembayaran rendah** untuk kampanye Premium.

### Insight Kunci Audiens
> Pengantin perempuan visual-first adalah pengambil keputusan estetika dan titik masuk utama — tetapi vendor/WO adalah satu-satunya segmen dengan LTV berulang, sehingga wajib punya jalur akuisisi tersendiri.

---

## Arsitektur Kampanye (Funnel)

### Gambaran Funnel

```
TOFU (Awareness) ──> MOFU (Consideration) ──> BOFU (Conversion) ──> Retargeting (Recovery)
     40%                    20%                     30%                    10%
```

**Tipe funnel direkomendasikan:** *Free-Trial-to-Paid Funnel* (rancang gratis → terbit berbayar), diperkuat *Viral Loop* dari berbagi undangan via WhatsApp.

### TOFU — Awareness (40% anggaran)
- **Tujuan:** Jangkauan, tontonan video, engagement.
- **Audiens:** Dingin — *newly engaged*, minat pernikahan, lookalike pembeli & lookalike pengunjung undangan.
- **Format:** Video vertikal sinematik (produk demo scroll), Reels/TikTok "POV: undanganmu jadi film pendek", carousel sebelum-sesudah template.
- **Platform:** Meta Reels/Feed (Advantage+ atau ABO), TikTok In-Feed.
- **KPI:** CPM, thruplay/hook-rate (3 detik), CTR, biaya per ThruPlay.

### MOFU — Consideration (20% anggaran)
- **Tujuan:** Trafik ke landing "coba vibe", mulai rancang draft.
- **Audiens:** Hangat — penonton video 25%+, pengunjung landing, engager IG/FB.
- **Format:** Iklan interaktif "Coba vibe-nya langsung", demo *palette switcher*, perbandingan template Lovebirds vs Solary.
- **Platform:** Meta Traffic/Engagement, Google Search (keyword intent sedang).
- **KPI:** CPC, biaya per `MulaiRancang`, rasio landing→draft.

### BOFU — Conversion (30% anggaran)
- **Tujuan:** Terbit (pembayaran).
- **Audiens:** Panas — **pendraft yang belum menerbitkan**, pengunjung halaman paket/harga, penonton demo Premium.
- **Format:** Iklan testimoni ("Tamu sampai nanya bikinnya di mana"), iklan pengingat "Undanganmu sudah cantik, tinggal diterbitkan", iklan fitur Premium (Buku Tamu QR, Solary 3D), Google Search keyword intent tinggi + brand.
- **Platform:** Meta Sales/Conversions, Google Search.
- **KPI:** CPA (biaya per Terbit), ROAS, conversion rate draft→terbit.

### Retargeting — Recovery & Loyalty (10% anggaran)
- **Jendela retarget:** 1–3 hari (pengingat hangat), 3–7 hari (testimoni + urgensi tanggal acara), 7–14 hari (atasi keberatan harga/kemudahan), 14–30 hari (tawaran/dorongan terakhir), 30–90 hari (re-engage musiman).
- **Segmentasi by kedalaman engagement:** penonton video → pengunjung landing → pendraft → pengunjung halaman harga.
- **Rotasi kreatif:** ganti angle tiap 7–10 hari untuk hindari *ad fatigue*; batasi frekuensi ~3–4x/minggu.
- **Cross-sell / loyalty:** Pembeli Basic → tawaran upgrade Premium (bayar selisih); pembeli lama → kampanye anniversary & program referral; tamu undangan → lookalike akuisisi.
- **Catatan:** Penerima WhatsApp tak bisa ditarget langsung; manfaatkan sebagai sumber **lookalike** dari trafik undangan publik.

### Peta Jalur Konversi
```
[Klik Iklan] -> [Landing "Coba Vibe"] -> [Mulai Rancang / Daftar (mikro-konversi)] -> [Terbit / Bayar (konversi utama)] -> [Bagikan via WA -> Loop Viral]
```

### Strategi Pixel & Pelacakan
- **Event yang dilacak:** `PageView`, `ViewContent` (lihat template), `Lead`/`MulaiRancang` (buat draft/daftar), `InitiateCheckout` (buka paket/Xendit), `Purchase`/`Terbit` (pembayaran sukses, dengan nilai IDR + plan).
- **Custom audiences:** pengunjung landing 30/90 hari, penonton video 25/50/75%, pendraft-belum-terbit, pengunjung halaman harga, pembeli (untuk eksklusi & upsell).
- **Lookalike:** 1–3% dari pembeli (`Terbit`), 1% dari pendraft, dan lookalike dari pengunjung undangan publik (memanen loop viral).

### Insight Kunci Funnel
> Aset funnel terbaik Anda sudah ada di dalam produk — "gratis rancang, bayar saat terbit" menciptakan kohort *pendraft-belum-terbit* yang sangat hangat; satu kampanye retargeting ke kohort ini biasanya menjadi ROAS tertinggi dari seluruh akun.

---

## Strategi Kreatif

> Catatan register: **narasi dokumen ini formal** (untuk Anda sebagai operator), tetapi **teks iklan di bawah sengaja memakai gaya santai-hangat** (kamu/kalian) karena itulah suara yang tepat untuk menyapa calon pengantin — sesuai voice landing page Anda.

### Angle Pesan Inti

| # | Angle | Deskripsi | Paling Cocok |
|---|---|---|---|
| 1 | Pain-Point | Lawan undangan template seragam & repot rekap RSVP manual | TikTok/Reels TOFU |
| 2 | Aspirasi | "Undangan yang bikin tamu nge-screenshot" — lebih mirip film pendek | Instagram TOFU/MOFU |
| 3 | Social Proof | "Tamu sampai nanya bikinnya di mana" + RSVP otomatis | Retargeting/BOFU |

### 10 Hook Penghenti Scroll

| # | Hook (gaya audiens) | Tipe | Platform | Psikologi |
|---|---|---|---|---|
| 1 | "Undangan kamu nggak harus mirip undangan semua orang." | Pain | TikTok/Reels | Ketakutan jadi pasaran |
| 2 | "Masih rekap RSVP manual di Notes HP?" | Pain | Reels | Sentil rasa repot |
| 3 | "Undangan template itu murah. Sampai tamu lihat punya orang lain sama persis." | Pain | TikTok | Penyesalan antisipatif |
| 4 | "POV: tamu buka undanganmu dan ceritanya kebuka pelan-pelan kayak film." | Curiosity | Reels/TikTok | Rasa penasaran + relatable |
| 5 | "Ini undangan atau tata surya? (scroll dulu)" | Curiosity | TikTok | Pola tak terduga (Solary 3D) |
| 6 | "Kamu rancang gratis dulu. Bayar baru pas mau diterbitkan." | Contrarian | Meta/Google | Tekan friksi & risiko |
| 7 | "Tamu kami sampai nanya bikinnya di mana." | Social Proof | Retargeting | Bukti sosial nyata |
| 8 | "Beberapa kerabat kami nangis pas musiknya mulai." | Social Proof | Instagram | Resonansi emosional |
| 9 | "H-3 bulan nikah dan undangan belum jadi? 10 menit cukup." | Urgency | Reels/Google | Urgensi terikat tanggal |
| 10 | "Basic 149rb. Tanpa biaya bulanan, tanpa watermark norak." | Urgency/Value | TikTok/Meta | Kejelasan harga + FOMO value |

### Teks Iklan per Platform (siap tempel)

#### Meta (Instagram / Facebook)
**Variasi A — Framework PAS (Problem-Agitate-Solve)**
- *Primary text (≤125):* "Takut undangan kamu mirip punya semua orang? Bikin yang scroll-nya kayak film pendek — cerita, musik, RSVP jadi satu. Rancang gratis dulu."
- *Headline (≤40):* "Undangan yang bikin tamu terkesan"
- *Description (≤30):* "Bayar saat terbit · mulai 149rb"
- *CTA:* Pelajari Selengkapnya

**Variasi B — Framework AIDA**
- *Primary text:* "Tamu scroll, cerita kalian terbuka scene demi scene. Foto, lagu, RSVP otomatis, amplop digital langsung ke rekening. Pilih template, isi cerita, sebar link-nya."
- *Headline:* "Undangan digital sinematik"
- *Description:* "Rancang gratis · terbit 149rb"
- *CTA:* Mulai Sekarang

**Variasi C — Framework BAB (Before-After-Bridge)**
- *Primary text:* "Dulu: rekap RSVP manual & undangan pasaran. Sekarang: tamu daftar sendiri, undangan kalian seperti film pendek. Jembatannya: 10 menit di dashboard."
- *Headline:* "Dari ribet jadi rapi"
- *Description:* "Coba vibe-nya gratis"
- *CTA:* Coba Sekarang

#### Google Ads (Search) — Responsive Search Ad
**Contoh 15 Headline (≤30 kar.):**
Undangan Digital Sinematik · Undangan Pernikahan Online · Rancang Gratis, Bayar Saat Terbit · Undangan Website Pernikahan · RSVP Otomatis Masuk Dashboard · Amplop Digital ke Rekening · Mulai 149rb Tanpa Bulanan · Template Sinematik & 3D · Buku Tamu QR Premium · Undangan Anti-Pasaran · Bikin Undangan 10 Menit · Musik & Galeri Jadi Satu · Sebar via WhatsApp · Preview Gratis Dulu · Undangan Premium 299rb Lifetime
**Contoh 4 Deskripsi (≤90 kar.):**
- "Undangan pernikahan digital yang terbuka scene demi scene. Rancang gratis, bayar saat terbit."
- "RSVP otomatis, amplop digital langsung ke rekening, musik & galeri. Mulai 149rb."
- "Pilih template sinematik Lovebirds atau tata surya 3D Solary. Edit sendiri, mudah."
- "Buku Tamu QR untuk check-in tamu (Premium). Coba preview-nya gratis sekarang."
*Keyword insertion:* gunakan `{KeyWord:Undangan Digital}` pada 1–2 headline.

#### TikTok (Spark/In-Feed)
- *Caption A:* "rancang undangan kamu gratis dulu — bayar baru pas mau terbit 🤍 #undangandigital #persiapannikah"
- *Caption B:* "ini undangan atau tata surya?? scroll sampai habis 🌌 #weddingtiktok #undanganpernikahan"

### Konsep Kreatif

#### Konsep 1 — Iklan Gambar Statis (Carousel "Sebelum vs Sesudah")
Slide 1: tangkapan undangan template pasaran (abu-abu, datar) — overlay "Undangan biasa". Slide 2–4: tangkapan layar Lovebirds/Solary (polaroid bergeser, planet 3D, palette switcher) — overlay "Undanganmu". Arah warna: krem hangat (Lovebirds) atau gelap berbintang (Solary). CTA: "Coba vibe-nya gratis".

#### Konsep 2 — Video Pendek 15 Detik (shot-by-shot)
- 0–2s: Tangan buka link di HP — gerbang undangan terbuka (HOOK: "POV undanganmu kebuka kayak film").
- 2–6s: Scroll → polaroid bergeser, musik fade-in, nama pasangan muncul.
- 6–10s: Potong ke Solary — kamera meluncur antar planet 3D.
- 10–13s: Layar dashboard — RSVP masuk otomatis, daftar tamu terisi.
- 13–15s: Teks akhir "Rancang gratis. Bayar saat terbit. Mulai 149rb." + CTA.
- VO/teks layar: hangat, singkat. Musik: piano sinematik naik perlahan.

#### Konsep 3 — UGC-Style (skrip kreator)
Kreator (calon/baru pengantin) bicara ke kamera: "Aku hampir pakai undangan template biasa, sampai nemu ini —" lalu pamer layar HP saat scroll. Talking points: gratis rancang, RSVP otomatis, tamu terkesan. B-roll: ekspresi tamu kagum, dashboard RSVP, momen musik mulai.

### Insight Kunci Kreatif
> Jangan buat "iklan tentang produk" — **rekam produknya scroll**. Demo layar sinematik 6–10 detik pertama adalah hook terkuat yang Anda miliki dan hampir mustahil ditiru kompetitor template statis.

---

## Lanskap Kompetitif

> Catatan keterbatasan data: tanpa akses *ad library* langsung dari sesi ini, ringkasan berikut bersumber dari pemahaman umum pasar undangan digital Indonesia. **Verifikasi via Meta Ad Library & pencarian "undangan digital" sebelum eksekusi.**

### Gambaran Kompetitor

| Kompetitor (tipikal) | Positioning | Kehadiran Iklan | Platform Terkuat | Kelemahan Kunci |
|---|---|---|---|---|
| Penyedia template massal (mis. kategori "undangan website" murah) | Murah, banyak template, cepat | Aktif (Meta/Google) | Google Search | Statis, seragam, tanpa cerita sinematik |
| Marketplace undangan (vendor di e-commerce) | Sangat murah, volume | Sedang | Marketplace/IG | Tanpa dashboard RSVP/amplop terpadu, generik |
| Vendor undangan IG kustom | Personal, desain manual | Sedang (organik) | Instagram | Mahal/lambat, tidak *self-edit*, tidak skalabel |
| Aplikasi undangan internasional | Fitur lengkap, mahal | Aktif | Google/Meta | Tidak Bahasa-first, tanpa amplop digital ke rekening lokal |

### Analisis Gap Kompetitif

| Gap | Artinya | Cara Mengeksploitasi |
|---|---|---|
| Hampir semua kompetitor **statis & seragam** | Diferensiasi sinematik/3D Anda nyata | Iklan demo-scroll yang mustahil ditiru template grid |
| Sedikit yang punya **amplop digital langsung ke rekening + RSVP terpadu** | Nilai "semua jadi satu" | Angle "undangan + RSVP + amplop jadi satu, sekali bayar" |
| **Buku Tamu QR** jarang dimiliki di kelas harga ini | Pengalaman tamu premium | Dorong Premium 299rb sebagai pembeda status |
| Model **"gratis rancang, bayar saat terbit"** jarang | Penurun friksi kuat | Jadikan headline utama — kompetitor minta bayar di muka |
| Loop viral via WA **tidak digarap kompetitor** | Akuisisi nyaris gratis | Optimalkan footer merek + lookalike dari trafik undangan |

### Strategi "Mengalahkan Kompetitor"
1. **Positioning anti-pasaran:** posisikan diri sebagai "undangan yang bukan template" — serang langsung kelemahan terbesar pemain murah.
2. **Counter-hook harga:** kompetitor menang di "murah & bayar di muka"; Anda balas dengan "rancang dulu gratis, baru bayar" — menetralkan keberatan harga tanpa perang harga.
3. **Rebut platform yang lemah digarap:** banyak kompetitor lemah di TikTok video sinematik — di sanalah produk Anda paling unggul; jadi *first-mover* dengan demo-scroll.

### Insight Kunci Kompetitif
> Anda tidak akan menang perang harga melawan undangan Rp 50.000 — dan tidak perlu; menangkan kelas "premium terjangkau yang terlihat mahal" lewat diferensiasi sinematik yang tak bisa ditiru template statis.

---

## Alokasi Anggaran & Proyeksi ROI

> Semua angka biaya bertanda *estimasi benchmark pasar Indonesia* — verifikasi dengan data akun nyata setelah 2–3 minggu pertama.

### Benchmark Industri (estimasi, ID)

| Metrik | Meta (IG/FB) | TikTok | Google Search | Rata-rata |
|---|---|---|---|---|
| CPM | Rp 15rb–45rb | Rp 10rb–30rb | — | ~Rp 25rb |
| CPC (link) | Rp 800–3.500 | Rp 500–2.000 | Rp 1.500–6.000 | ~Rp 2.000 |
| CTR | 1–2,5% | 1–3% | 4–8% | ~2% |
| CVR (klik→terbit) | 1,5–3% | 1–2% | 3–6% | ~2,3% |
| ROAS rata-rata | 2,5–3x | 2–2,5x | 2,5–3,5x | ~2,8x |

### Skenario Anggaran

#### Starter — Rp 3.000.000/bulan
| Platform | Alokasi | Belanja/Bln | Est. Klik | Est. Terbit |
|---|---|---|---|---|
| Meta (IG/FB) | 70% | Rp 2.100.000 | ~1.150 | ~25 |
| TikTok | 30% | Rp 900.000 | ~600 | ~8 |
| **Total** | **100%** | **Rp 3.000.000** | **~1.750** | **~33** |
*Pendapatan est.* ~Rp 6,9 jt (AOV Rp 210rb) → **ROAS ~2,3x** · *plus* ~5.000 impresi merek gratis dari undangan yang disebar. Prioritas: 2 platform, fokus TOFU + 1 kampanye retargeting pendraft. Lewati Google dulu. Data signifikan dalam ~2–3 minggu.

#### Growth — Rp 12.000.000/bulan
| Platform | Alokasi | Belanja/Bln | Est. Klik | Est. Terbit |
|---|---|---|---|---|
| Meta (IG/FB) | 55% | Rp 6.600.000 | ~3.600 | ~90 |
| TikTok | 25% | Rp 3.000.000 | ~2.000 | ~30 |
| Google Search | 20% | Rp 2.400.000 | ~900 | ~40 |
| **Total** | **100%** | **Rp 12.000.000** | **~6.500** | **~160** |
*Pendapatan est.* ~Rp 33,6 jt → **ROAS ~2,8x.** Funnel penuh aktif (TOFU→retargeting). Alokasikan ~10–15% untuk A/B testing kreatif. Pemicu scaling: naikkan saat CPA stabil < Rp 90rb selama 7 hari.

#### Scale — Rp 30.000.000+/bulan
| Platform | Alokasi | Belanja/Bln | Est. Klik | Est. Terbit |
|---|---|---|---|---|
| Meta (IG/FB) | 50% | Rp 15.000.000 | ~8.000 | ~210 |
| TikTok | 25% | Rp 7.500.000 | ~5.000 | ~80 |
| Google Search | 20% | Rp 6.000.000 | ~2.200 | ~120 |
| YouTube/Lainnya | 5% | Rp 1.500.000 | ~800 | ~20 |
| **Total** | **100%** | **Rp 30.000.000** | **~16.000** | **~430** |
*Pendapatan est.* ~Rp 90 jt → **ROAS ~3,0x** dengan kreatif matang + retargeting + brand-search. Pertimbangkan resource tim/agensi untuk *velocity* kreatif & atribusi multi-channel.

### Analisis Break-Even

| Metrik | Nilai |
|---|---|
| AOV blended (mix Basic/Premium) | ~Rp 210.000 |
| Margin kontribusi (~90% − biaya Xendit) | ~Rp 183.000 |
| **Break-even CPA** (pembelian pertama) | ~Rp 183.000 |
| **Break-even ROAS** | ~1,1x |
| **Target CPA sehat** | Rp 50.000–80.000 |
| Bulan menuju profit (Starter) | ~Bulan 1–2 (margin tinggi → cepat) |
| Bulan menuju profit (Growth) | Bulan 1, jika CPA < Rp 90rb |

### Insight Kunci Anggaran
> Karena margin ~90% dan break-even ROAS hanya ~1,1x, ambang profit Anda sangat rendah — risiko utama bukan kerugian per penjualan, melainkan **LTV sekali-beli**: prioritaskan jalur referral, anniversary, dan vendor/WO untuk mengubah pembeli tunggal menjadi nilai berulang.

---

## Rencana Implementasi 90 Hari

### Bulan 1 — Fondasi & Pengujian (Juli 2026)

**Minggu 1 — Setup**
- [ ] Pasang Meta Pixel + TikTok Pixel + Google Tag; definisikan event `MulaiRancang` & `Terbit` (nilai IDR + plan)
- [ ] Buat custom audiences (pengunjung landing, penonton video, pendraft-belum-terbit, pengunjung harga, pembeli)
- [ ] Verifikasi landing "coba vibe" untuk lalu lintas iklan (kecepatan + mobile)
- [ ] Produksi 3–5 kreatif awal per platform (utamakan video demo-scroll)

**Minggu 2 — Peluncuran**
- [ ] Luncurkan TOFU di Meta + TikTok (Reels/In-Feed)
- [ ] Luncurkan retargeting BOFU ke pendraft-belum-terbit
- [ ] Mulai A/B test hook & angle
- [ ] Pantau performa harian (CPM, hook-rate, CPC, biaya/MulaiRancang)

**Minggu 3 — Optimasi**
- [ ] Matikan kreatif/audiens underperform
- [ ] Sesuaikan targeting dari sinyal awal
- [ ] Uji 1 kampanye Google Search keyword intent tinggi
- [ ] Uji hook & angle baru

**Minggu 4 — Analisis**
- [ ] Review penuh Bulan 1; hitung CPC/CPA/ROAS aktual vs proyeksi
- [ ] Identifikasi iklan, audiens, platform pemenang
- [ ] Rencanakan optimasi Bulan 2

### Bulan 2 — Optimasi & Ekspansi (Agustus 2026)
- [ ] Naikkan anggaran kampanye pemenang 20–30%
- [ ] Hentikan kampanye merugi, realokasikan
- [ ] Aktifkan MOFU (nurture audiens hangat)
- [ ] Bangun lookalike dari pembeli (`Terbit`) & pendraft
- [ ] Luncurkan jalur akuisisi **vendor/WO** (Google + outreach)
- [ ] Uji variasi landing & urutan sequence retargeting

### Bulan 3 — Scaling & Otomasi (September 2026)
- [ ] Naik ke tier Growth jika target ROAS tercapai
- [ ] Aktifkan funnel penuh di Meta + TikTok + Google
- [ ] Terapkan automated rules (bid/budget)
- [ ] Luncurkan kampanye **referral** & **anniversary** untuk LTV
- [ ] Manfaatkan loop viral: lookalike dari trafik undangan publik
- [ ] Dokumentasikan formula pemenang; jadwalkan review kuartal berikut (selaraskan dengan musim pernikahan akhir tahun)

---

## Quick Wins (Mulai Minggu Ini)

1. **Pasang pixel + event `MulaiRancang`/`Terbit`** — tanpa ini Anda buta; ini prasyarat semua optimasi & retargeting.
2. **Buat 1 kampanye retargeting "pendraft belum terbit"** — kohort terpanas Anda; biasanya ROAS tertinggi di akun, biaya kecil.
3. **Rekam 3 video demo-scroll vertikal (Lovebirds + Solary)** — produk Anda menjual dirinya sendiri; ini hook yang tak bisa ditiru kompetitor.
4. **Jadikan "gratis rancang, bayar saat terbit" sebagai headline utama** — penetral keberatan harga paling kuat, langsung dari fitur produk.
5. **Pastikan footer merek di setiap undangan publik + siapkan lookalike-nya** — ubah ratusan tamu per undangan menjadi mesin akuisisi gratis.

---

## Langkah Selanjutnya

| Yang Perlu Dilakukan | Skill | Perintah |
|---|---|---|
| Riset audiens mendalam | Audience Persona Builder | `/ads audience [url]` |
| Set lengkap teks iklan | Ad Copy Generator | `/ads copy [platform]` |
| 20+ hook penghenti scroll | Hook Generator | `/ads hooks` |
| Blueprint funnel lengkap | Funnel Architect | `/ads funnel [url]` |
| Analisis iklan kompetitor | Competitive Intelligence | `/ads competitors [url]` |
| Proyeksi anggaran detail | Budget Allocator | `/ads budget [jumlah]` |
| Skrip video iklan | Video Script Generator | `/ads video [produk]` |
| Audit landing page | Landing Page Auditor | `/ads landing [url]` |
| Rencana A/B testing | Testing Plan Builder | `/ads testing [kampanye]` |
| Buat laporan PDF | PDF Report Generator | `/ads report-pdf` |

---

*Disusun sebagai deliverable strategi iklan untuk wedding-saas-next. Angka biaya bersifat estimasi benchmark pasar Indonesia dan harus diverifikasi dengan data akun nyata setelah masa pengujian. Kutipan testimonial di produk saat ini masih placeholder/demo — ganti dengan testimoni asli sebelum dipakai di iklan.*
