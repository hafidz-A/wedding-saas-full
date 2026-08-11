# FinCards — Listing Shopee Siap Pakai

Dokumen operasional. Terakhir disusun: **29 Juli 2026**.

**Cara pakai dokumen ini:** Section 1-2 strategi & model fulfillment (baca duluan, ini yang menentukan apakah listingnya bisa jalan). Section 3-6 materi listing (judul, deskripsi, variasi, foto) — sebagian besar tinggal copy-paste ke Seller Centre. Section 7-9 taktik jualan & template chat. Section 10 checklist final + callout harga.

Legenda: ✅ boleh dipakai apa adanya · ⚠️ perlu dicek/disesuaikan sebelum publish · ⛔ jangan dipakai (berisiko jadi klaim palsu / melanggar TOS).

**Referensi cepat (harga placeholder per 28 Juli 2026 — WAJIB dicek ulang ke `/admin/templates` sebelum publish, lihat Section 10):**

| Paket | Harga |
|---|---|
| Solary Basic | Rp 199.999 |
| Lovebirds Basic | Rp 199.999 |
| Premium (Solary atau Lovebirds) | Rp 249.999, seumur hidup |
| Add-on 100 tamu | Rp 10.000 |

---

## 1. Kenapa Shopee

Orang yang ngetik "undangan digital" atau "undangan pernikahan online" di search bar Shopee itu bukan lagi tahap cari referensi — mereka udah dalam mode beli. Kategori undangan digital juga udah proven di Shopee (banyak toko sejenis: template Canva undangan, jasa desain undangan, dst), jadi search intent-nya sudah terbentuk, tinggal masuk.

Tapi ada satu kompleksitas yang beda dari toko Shopee kebanyakan: FinCards itu **bayar-dulu, self-serve, sekali bayar via Midtrans di website sendiri** (fincards.land), bukan produk fisik yang tinggal dikirim pakai kurir, dan bukan juga produk digital yang otomatis ke-generate begitu pembayaran masuk. Supaya buyer nggak dibikin bayar dua kali (sekali ke Shopee, sekali lagi ke Midtrans), alur fulfillment-nya perlu diakalin secara manual. Itu isi Section 2 — dan ini bagian paling penting sebelum listing tayang.

---

## 2. Model Fulfillment di Shopee

### Opsi A — REKOMENDASI: jual "Slot/Kode Undangan Digital"

Alurnya:
1. Buyer checkout & bayar di Shopee seperti belanja biasa (pakai metode pembayaran Shopee, bukan Midtrans).
2. Setelah order masuk, kirim via **Shopee Chat**: link onboarding fincards.land, kode/nomor pesanan Shopee sebagai bukti klaim, dan instruksi singkat cara isi data (nama pasangan, tanggal, pilih template & paket sesuai yang dibeli).
3. Buyer bikin akun sendiri dan isi form onboarding sendiri (self-serve, boleh dipandu langkah demi langkah lewat chat kalau butuh bantuan).
4. **Catatan ops internal (bukan untuk buyer):** karena buyer sudah bayar lewat Shopee, invitation-nya jangan sampai diminta bayar lagi lewat Midtrans di web. Aktifkan manual dari sisi admin (pakai jalur comp/bootstrap invitation yang sudah ada di `/admin/invitations/new` atau `scripts/create-invitation.mjs`) setelah kode pesanan Shopee dicocokkan — supaya buyer langsung tembus ke dashboard editor, bukan kena `PaymentGate`.

**Trade-off:**
- (+) Cocok sama arsitektur pay-first yang sudah ada, nggak perlu bongkar alur pembayaran situs.
- (+) Pengalaman checkout terasa native ala marketplace buat buyer.
- (–) Ada langkah manual ekstra di admin tiap order (cocokkan kode → aktifkan) — belum otomatis/instan.
- (–) Ada jeda waktu antara "bayar di Shopee" dan "editor kebuka", tergantung SLA balas chat + kecepatan aktivasi admin. Ekspektasi ini harus dikomunikasikan jelas di deskripsi & chat (lihat Section 4 & 9) supaya nggak jadi komplain "kok belum aktif-aktif".

### Opsi B — "Paket Dibantu Setup"

Tier terpisah (boleh markup harga lebih tinggi buat effort ekstra): setelah bayar, buyer kirim data dasar lewat chat (nama pasangan, tanggal, lokasi, foto). Admin bantu isikan **langkah-langkah awal** di dashboard, lalu akses diserahkan ke buyer buat lanjut edit sendiri.

⚠️ Hati-hati di copy: ini "dibantu setup langkah awal", BUKAN "dibuatin penuh dari nol". Jangan dipromosikan sebagai jasa desain undangan lengkap — itu janji yang belum ada produknya dan bisa jadi over-promise.

**Trade-off:**
- (+) Cocok buat buyer yang gaptek/nggak mau ribet isi form sendiri, bisa dijual lebih mahal.
- (–) Effort admin jauh lebih besar per order, nggak scalable kalau order lagi ramai.
- (–) Risiko ekspektasi "dibuatin semua" kalau batasannya nggak dikomunikasikan tegas di chat.

### Opsi C — jangka panjang, belum prioritas: produk digital otomatis

Shopee punya kategori/mode untuk produk tanpa pengiriman fisik (biasa dipakai buat voucher game, pulsa, jasa digital) yang nggak butuh resi kurir. ⚠️ Perlu dicek langsung di Seller Centre apakah toko sudah punya akses ke kategori ini, karena UI dan syaratnya bisa berubah — kalau ada, closing order bisa lebih ringkas (nggak perlu input resi), tapi proses "aktivasi invitation setelah bayar" tetap manual seperti Opsi A selama belum ada integrasi otomatis kode-redeem di sisi fincards.land. Untuk tahap awal, jalankan Opsi A dulu; Opsi C baru relevan kalau volume order sudah cukup besar untuk membenarkan investasi otomatisasi.

### Hal lain yang perlu diperhitungkan

- **Biaya Shopee:** ada potongan biaya admin + biaya layanan (persentase beda-beda tergantung kategori & program toko — Reguler/Star/Star+), plus biaya proses pembayaran. ⚠️ Cek angka pasti di Seller Centre → Pusat Edukasi Penjual → Biaya sebelum menetapkan harga jual final, supaya margin nggak habis kepotong fee.
- **Dobel-handling pembayaran:** karena pembayaran nyata terjadi di Shopee (bukan di Midtrans web), invitation HARUS diaktifkan manual dari admin. Jangan sampai buyer diarahkan bayar lagi di web — itu double charge dan berisiko jadi keluhan/refund request di Shopee.
- **Ekspektasi buyer marketplace:** pembeli Shopee terbiasa chat dulu sebelum & sesudah beli, dan mengharapkan respons cepat. Perlu SLA balas chat yang jelas (contoh: maks 1x24 jam kerja, Senin–Sabtu 09.00–20.00 WIB) dicantumkan di deskripsi listing, supaya rating "kecepatan respons chat" toko nggak jatuh.

---

## 3. Judul Produk

Tiga varian, keyword-optimized ala Shopee (padat keyword, dipisah spasi). Panjang dihitung manual per karakter — sesuaikan lagi dengan counter asli di Seller Centre (limit judul Shopee umumnya di kisaran 100 karakter, bisa beda tergantung kategori).

**Varian 1 — REKOMENDASI (±92 karakter)**
> Undangan Pernikahan Digital Online Website Undangan Nikah RSVP Buku Tamu QR Checkin FinCards

Alasan direkomendasikan: membuka dengan frasa yang paling wajar diketik orang ("undangan pernikahan digital online"), lalu menyusul frasa sekunder (website undangan, RSVP, buku tamu, QR checkin) buat nangkep long-tail search. Catatan: ini estimasi berdasarkan pola umum, bukan data volume pencarian live Shopee — validasi lagi lewat Shopee Ads → Riset Kata Kunci sebelum final.

**Varian 2 — fokus "website undangan" (±91 karakter)**
> Website Undangan Nikah Pernikahan Online Digital RSVP QR Checkin Buku Tamu Digital FinCards

Cocok kalau riset kata kunci nunjukin "website undangan" / "undangan website" lebih sering dicari daripada "undangan digital" di traffic toko kamu.

**Varian 3 — menonjolkan sisi sinematik/premium (±94 karakter)**
> Undangan Nikah Online Digital Pernikahan Website Sinematik RSVP Buku Tamu QR Check In FinCards

Cocok kalau mau diferensiasi dari kompetitor template-Canva biasa — kata "Sinematik" menegaskan bahwa ini animasi, bukan gambar statis.

---

## 4. Deskripsi Produk

Siap copy-paste ke kolom deskripsi Shopee. Sudah dijaga supaya nggak ada klaim gratis-editor / dibuatin-penuh yang melanggar ketentuan produk (lihat Fact Pack — pay-first, no free trial).

```
💍 UNDANGAN PERNIKAHAN DIGITAL — WEBSITE UNDANGAN SINEMATIK, EDIT SENDIRI KAPAN AJA

Bukan template Canva pasaran. FinCards adalah website undangan pernikahan digital dengan animasi sinematik — bisa diedit sendiri tanpa nunggu admin, tinggal share link-nya ke WA tamu, tamu nggak perlu install apa pun.

✨ YANG KAMU DAPAT
- Website undangan pernikahan digital bertema sinematik — pilih Solary (dramatis, dark gold) atau Lovebirds (soft & hangat)
- Edit sendiri kapan aja lewat dashboard sendiri — ganti nama, foto, tanggal, cerita kalian, TANPA biaya revisi tambahan
- RSVP real-time — tamu konfirmasi hadir dari HP, dipantau langsung dari dashboard
- Galeri foto berdua
- Peta lokasi acara (Google Maps) — tamu tinggal tap, langsung diarahkan
- Buku tamu ucapan — tamu bisa tulis doa & ucapan di website undangan
- Amplop digital / hadiah pernikahan online
- Musik latar (backsound) yang bisa diatur sendiri
- Kuota s/d 400 tamu (paket Basic), aktif 1 tahun
- Tanpa watermark, di semua paket
- Link gampang dishare lewat WA — tamu langsung buka dari browser HP, nggak perlu install apa pun

⭐ PAKET PREMIUM — ADA BUKU TAMU QR CHECK-IN
Naik ke Premium buat hari-H yang lebih rapi:
- Semua fitur Basic, PLUS
- Buku Tamu Digital + QR Check-In (beda dari buku ucapan tamu di atas — ini alat bantu tuan rumah buat absensi hari-H): tamu scan QR pas datang, nama otomatis tercatat di daftar hadir, lengkap statistik + bisa diekspor CSV/dicetak
- Kuota naik ke s/d 500 tamu
- Aktif SEUMUR HIDUP, nggak perlu perpanjang tahunan

🔍 CARA PESAN (3 LANGKAH)
1. Checkout paket di Shopee sesuai template & tier yang dipilih
2. Link onboarding + instruksi klaim dikirim ke chat Shopee (estimasi maks 1x24 jam kerja) — data pernikahan diisi sendiri di website (nama pasangan, tanggal, cerita, foto), dipandu step-by-step kalau butuh bantuan
3. Undangan aktif → edit sepuasnya → publish → share link ke tamu lewat WA

Belum yakin? Cek dulu DEMO PUBLIKnya di fincards.land — tanpa daftar, tanpa isi data apa pun, langsung kelihatan tampilan aslinya.

💰 PAKET & HARGA
- Solary Basic — Rp 199.999
- Lovebirds Basic — Rp 199.999
- Premium (Solary/Lovebirds) — Rp 249.999, seumur hidup
- Tambah kuota 100 tamu — Rp 10.000
(Harga sewaktu-waktu bisa berubah — versi terbaru selalu di fincards.land)

❓ FAQ SINGKAT
Bisa direvisi berkali-kali kalau ada salah ketik?
Bisa — edit sendiri kapan aja dari dashboard, tanpa biaya revisi tambahan, tanpa antre admin.

Tamu harus install aplikasi dulu?
Nggak. Tinggal buka link dari chat WA, langsung tampil di browser HP.

Bedanya Basic sama Premium apa?
Premium nambahin Buku Tamu QR Check-In (absensi hari-H via scan QR + rekap/cetak), kuota naik ke 500 tamu, aktif seumur hidup.

Setelah tamu scan QR, ada pesan otomatis balik ke tamu?
Nggak ada. QR check-in cuma mencatat kehadiran ke daftar hadir tuan rumah, bukan sistem pesan otomatis ke tamu.

Galerinya bisa upload video?
Untuk saat ini galeri khusus foto.

📩 Ada yang mau ditanyain? Chat dulu sebelum checkout, dijawab sampai jelas — atau intip dulu demo publiknya di fincards.land.
```

⚠️ Sebelum publish: cek ulang 4 angka harga di atas terhadap `/admin/templates`.

---

## 5. Struktur Variasi/Paket di Shopee

Shopee membatasi maksimal 2 jenis variasi per listing. Rekomendasi: **Variasi 1 = Template, Variasi 2 = Paket**, jadi satu listing menampung 4 kombinasi SKU sekaligus.

| Nama Variasi | Opsi |
|---|---|
| **Template** | Solary (Dark Gold, Dramatis) · Lovebirds (Soft & Hangat) |
| **Paket** | Basic (s/d 400 tamu, aktif 1 tahun) · Premium (s/d 500 tamu + QR Check-In, seumur hidup) |

Matriks harga (⚠️ placeholder, cek `/admin/templates`):

| Template | Paket | Harga |
|---|---|---|
| Solary | Basic | Rp 199.999 |
| Solary | Premium | Rp 249.999 |
| Lovebirds | Basic | Rp 199.999 |
| Lovebirds | Premium | Rp 249.999 |

**Add-on kuota 100 tamu (Rp 10.000):** jangan dipaksakan jadi variasi ke-3 (Shopee cuma izinkan 2 jenis variasi, dan ini juga cuma relevan buat pembeli yang SUDAH punya undangan aktif). Jadikan **listing terpisah**, misalnya "FinCards — Tambah Kuota 100 Tamu (Add-on)", dengan catatan di deskripsi: "khusus pelanggan FinCards yang sudah punya undangan aktif — cantumkan slug/nomor pesanan undangan kamu pas checkout via chat."

⚠️ Catatan penting: harga di Shopee **tidak auto-sync** dengan harga di database FinCards. Tiap kali harga berubah di `/admin/templates`, variasi & harga di listing Shopee ini harus di-update manual juga.

---

## 6. 5 Foto Produk (spec)

Rasio disarankan **1:1** (persegi) sesuai standar Shopee. Pakai HANYA 8 warna official palette FinCards — jangan eyeball tint sendiri. Referensi warna & font resmi ada di `docs/design/AUDIT-COLOR-FONT-PALETTE.html` dan `docs/design/PALETTE-CHEATSHEET.html`. Untuk foto yang menampilkan pasangan, ikuti arahan art-direction yang sudah dipakai di aset FinCards lain: porsi pasangan 20-40%, sisanya suasana/atmosfer — kesan editorial premium, bukan foto produk generik.

| # | Isi Foto | Sumber |
|---|---|---|
| 1. Cover/Hero | Mockup HP menampilkan hero section undangan (nama pasangan, tanggal), background sesuai tema (dark gold utk Solary / soft cream utk Lovebirds), logo FinCards kecil di pojok, headline overlay singkat ("Undangan Pernikahan Digital — Edit Sendiri") | ✅ REUSE — cek slide cover di `fincards-organic-content-plan-14hari.md` / versi `.docx`, crop ke 1:1 kalau formatnya masih landscape |
| 2. Showcase Fitur | Kolase/grid 5-6 ikon+label fitur utama: RSVP Real-Time, Buku Tamu, Peta Lokasi, Musik, Galeri Foto, QR Check-In (tandai khusus Premium) | ✅ REUSE — cek slide "fitur" di plan organik yang sama |
| 3. Tabel Paket & Harga | Kartu perbandingan Basic vs Premium, harga & fitur berdampingan. Highlight jelas: Premium = "Buku Tamu QR Check-In" (alat absensi tuan rumah) — **beda** dari "Buku Tamu Ucapan" yang sudah ada di Basic, supaya calon pembeli nggak salah paham cuma baca sepintas | ⚠️ BUAT BARU — breakdown se-detail ini kemungkinan belum ada di aset lama |
| 4. Demo/Preview + cara akses | Screenshot landing fincards.land dengan panah/step menunjuk tombol "Coba Demo Tanpa Daftar" → hasil demo. Teks pendukung: "tampilan asli produk, bukan mockup" | ✅ REUSE sebagian (screenshot demo lama) atau ambil screenshot baru dari landing terkini |
| 5. Cara Pesan / Langkah | Infografis 3 langkah alur Shopee: Checkout di Shopee → Terima link + instruksi via chat → Isi data & publish sendiri. Angka besar 1-2-3, ikon simpel | ⚠️ BUAT BARU — alur ini spesifik Shopee, belum ada di aset marketing manapun |

Tip: kalau butuh screenshot/mockup baru dari tampilan produk asli (bukan ilustrasi), ada tool capture section-by-section yang sudah tersedia di project (`scripts/capture.mjs`) — lebih konsisten daripada screenshot manual satu-satu.

---

## 7. Taktik Review (mesin social proof Shopee)

Review = kunci ranking & kepercayaan di Shopee, tapi hati-hati: Shopee melarang insentif yang **disyaratkan** pada tindakan kasih ulasan/rating (termasuk "kasih foto biar dapat bonus") — ini masuk kategori manipulasi ulasan dan bisa kena penalti sampai suspend listing/toko. Jadi taktik di bawah ini dijaga supaya bonusnya TIDAK ditukar langsung dengan review:

- **Follow-up chat sopan** beberapa hari setelah invitation aktif (bukan janji apa pun, cuma nanya "semua lancar? ada yang mau dibantu?") — ini touchpoint natural yang bikin buyer inget buat kasih rating, tanpa diminta eksplisit.
- **Bonus untuk SEMUA buyer di periode tertentu, lepas dari review** — misalnya "bonus tambahan 25 kuota tamu buat pemesan minggu pertama toko buka" atau promo early-bird. Ini boleh, karena syaratnya waktu pembelian, bukan "kasih review dulu baru dapat bonus".
- **Respons ke setiap review** (termasuk yang bintang 3-4, bukan cuma 5) secara hangat dan profesional — ini yang paling ningkatin kepercayaan pembeli baru yang baca-baca review sebelum checkout.
- **Jaga SLA & kualitas chat** — karena review buyer sering nyebut soal kecepatan respons dan kejelasan instruksi klaim, bukan cuma produknya sendiri. Pengalaman ordering yang mulus adalah lever review terbesar, bukan iming-iming.
- **Kejar status Star/Star+ Seller** (kriteria umumnya termasuk response rate, rating, tingkat penyelesaian pesanan) — status ini sendiri jadi sinyal kepercayaan tambahan di listing dan ningkatin exposure organik.

---

## 8. Shopee Ads (iklan dalam Shopee)

**Kata kunci yang layak di-bid** (high-intent, urut dari yang paling spesifik/relevan):
- undangan pernikahan digital
- undangan digital
- undangan pernikahan online
- undangan nikah online
- undangan nikah digital
- website undangan
- undangan website
- buku tamu digital
- QR check in pernikahan / QR check in wedding
- undangan wedding online

**Tips hemat bid:**
- Mulai dari kata kunci long-tail spesifik ("undangan pernikahan digital online") dulu, bukan kata generik pendek ("undangan" doang) — kata pendek lebih mahal dan narik traffic nggak relevan (undangan ulang tahun, undangan cetak, dll).
- Pasang negative keyword buat istilah yang jelas nggak relevan (misal "undangan cetak", "percetakan", "kartu undangan fisik") kalau kelihatan ada traffic nyasar ke sana.
- Set budget harian kecil dulu buat masa uji 3-7 hari, pantau ACOS (biaya iklan dibanding omzet) sebelum naikin budget.
- Angka CPC/CPM aktual nggak dicantumkan di sini karena berubah-ubah dan beda per akun — cek langsung di dashboard Shopee Ads pas mulai jalanin kampanye.

**Produk yang di-boost:** kalau strukturnya satu listing gabungan (Template × Paket sebagai variasi, sesuai Section 5), iklan otomatis mengarah ke listing itu untuk semua kombinasi — cukup fokuskan anggaran ke listing ini dan biarkan buyer memilih variasi setelah masuk. SKU dengan harga entry termurah (Solary Basic, Rp 199.999) biasanya paling efektif jadi "pintu masuk" karena friksi harga paling rendah buat klik pertama; upsell ke Premium/Lovebirds terjadi begitu buyer sudah di halaman produk atau lewat chat.

Catatan buat nanti: kalau volume order sudah cukup besar dan mau targeting lebih presisi per template (audiens Solary yang suka dramatis vs Lovebirds yang suka soft-romantic bisa jadi beda kata kunci), bisa dipertimbangkan pecah jadi listing terpisah per template — trade-off-nya review & rating jadi kepecah dua tempat, jadi lebih baik dibangun dulu social proof di satu listing gabungan sebelum dipecah.

---

## 9. Template Balasan Shopee Chat

Voice di template ini natural ala customer service marketplace (pakai "kak"/"kami"), beda dari copy landing yang impersonal di Section 4 — ini percakapan 1:1, bukan copy publik.

**(a) Sapaan / nanya harga**
> Halo kak, terima kasih udah mampir ke FinCards! 🙏 Undangan pernikahan digital ada 2 template — Solary (dark gold, dramatis) & Lovebirds (soft & hangat), masing-masing ada paket Basic & Premium. Kakak udah ada bayangan tanggal acara & template yang disuka yang mana? Biar bisa dibantu rekomendasiin paket yang pas ya kak 😊 Kalau mau lihat tampilan aslinya dulu, ada demo tanpa daftar di fincards.land.

**(b) Cara kerja & bedanya dari undangan cetak**
> Beda dari undangan cetak kak, ini website undangan pernikahan digital — tamu tinggal buka link dari WA (nggak perlu install apa-apa), langsung lihat foto, cerita kalian, RSVP, sampai lokasi acara di Google Maps. Kakak juga bisa edit sendiri isinya kapan aja lewat dashboard sendiri — mau ganti foto/teks/tanggal tinggal edit sendiri, nggak perlu order ulang atau nunggu revisi dari toko. Setelah checkout di Shopee, link + instruksi buat isi data sendiri dikirim ke chat ini ya kak.

**(c) Beda Basic vs Premium**
> Basic udah lengkap kak — edit sendiri, RSVP real-time, galeri foto, lokasi Maps, buku ucapan tamu (tamu bisa tulis doa/ucapan di website undangan kalian), amplop digital, musik, kuota 400 tamu, aktif 1 tahun. Nah Premium nambahin fitur beda lagi namanya Buku Tamu Digital + QR Check-In — khusus buat hari-H, tamu tinggal scan QR pas datang, nama otomatis kecatat di daftar hadir kakak (ada statistik + bisa diekspor/dicetak buat panduan di pintu masuk). Jadi ini beda sama buku ucapan tadi ya kak, ini alat bantu absensi kehadiran. Kuota Premium juga naik ke 500 tamu, dan aktifnya seumur hidup, nggak perlu perpanjang.

**(d) Cara klaim setelah bayar**
> Setelah pesanan kakak dibayar/selesai di Shopee, link onboarding fincards.land + kode pesanan Shopee sebagai bukti klaim dikirim ke chat ini (estimasi dibalas maks 1x24 jam kerja, Senin–Sabtu). Kakak tinggal buka link-nya, buat akun sendiri, terus isi data pernikahan kalian (nama, tanggal, cerita, foto) — nanti dibantu aktifin dari sisi sistem biar kakak nggak diminta bayar dua kali. Kalau ada yang bingung pas isi form, tinggal chat lagi, dipandu kok kak.

**(e) "Bisa direvisi nggak kalau ada yang salah?"**
> Bisa banget kak, malah nggak ada batasnya. Undangan kakak bisa diedit sendiri kapan aja lewat dashboard (ganti foto, teks, tanggal, dll), tanpa biaya revisi tambahan dan tanpa harus nunggu toko. Jadi kalau ada salah ketik atau mau update H-1, tinggal buka dashboard, edit, publish ulang — beres sendiri kak.

---

## 10. Checklist Go-Live

- [ ] Cek harga terbaru di `/admin/templates` — JANGAN pakai angka placeholder di dokumen ini mentah-mentah tanpa verifikasi
- [ ] Samakan harga Shopee dengan harga di fincards.land (jangan sampai beda tanpa alasan jelas)
- [ ] Setup variasi produk (Template × Paket) sesuai Section 5
- [ ] Buat listing terpisah untuk add-on kuota 100 tamu
- [ ] Upload 5 foto sesuai spec Section 6 (rasio 1:1)
- [ ] Paste deskripsi dari Section 4 (cek ulang placeholder harga sebelum publish)
- [ ] Pilih 1 dari 3 judul di Section 3, sesuaikan limit karakter di Seller Centre
- [ ] Set SLA & jam balas chat, aktifkan auto-reply Shopee kalau fiturnya tersedia
- [ ] Simpan 5 template chat (Section 9) di catatan/quick reply Shopee
- [ ] Tes alur end-to-end sekali secara manual sebelum listing tayang publik: checkout dummy → terima chat → klaim → aktivasi admin — pastikan nggak ada langkah yang macet
- [ ] Pasang reminder buat cek ulang harga tiap kali ada perubahan di `/admin/templates`, karena Shopee TIDAK auto-sync harga dengan database FinCards

> ⚠️ **CALLOUT HARGA:** Semua angka di dokumen ini (Basic Rp 199.999 dua template, Premium Rp 249.999 seumur hidup, kuota 400/500, add-on 100 tamu Rp 10.000) diverifikasi ke `template_plans` **6 Agustus 2026**. Pricing di FinCards DB-driven lewat `template_plans` — sumber kebenaran ada di `/admin/templates`, bukan dokumen ini. Cek ulang sebelum listing tayang, dan tiap kali harga berubah di admin, update manual juga listing Shopee-nya.
