# Design — Template adat Palembang (Sumatera Selatan)

Status: **UJI COBA — Fase 2 selesai di branch `claude/vibrant-newton-esdvox`, belum di `main`** · Tanggal: 2026-10-12

## 0. Status & keputusan (diperbarui 2026-10-12)

**Keputusan pemilik:** nama **Songket** (id `songket`), busana default **Aesan Gede**, ornamen awal
berupa **siluet** buatan sendiri, konsultan = teman pemilik, musik dan harga diputuskan di akhir.
Jangan masuk `main` dulu.

**Arah diubah pemilik (2026-10-12): "konsepnya sama kaya Lovebirds, cuma ornamen, background, dll
dibuat adat Sumsel".** Versi pertama (section buatan sendiri: gerbang lawang, tenong buka-tutup, dst.)
diganti. Songket sekarang **fork dari Lovebirds**: alur, section, animasi (hero play-once + photo
blast, kartu cerita bertumpuk, dua gaya galeri, navbar, musik, panel 🎨, device preview) dan kontrak
editor **identik**; yang diganti hanya lapisan visual:

| Lapisan Lovebirds | Versi Songket |
|---|---|
| 10 palet (warmCream…) | 5 palet adat (usulan pemilik: merah-emas, hijau zamrud, ungu royal): **Merah Emas, Hijau Zamrud, Ungu Royal, Hitam Lak, Gading Songket**, ditambah 6 palet terang atas permintaan pemilik: **Emas Pagi, Merah Jambu, Hijau Pupus, Ungu Lembut, Biru Musi, Jingga Senja** (`config/themes.js`; semua lolos tes kontras AA) |
| Ornamen burung / kupu-kupu / bertengger | melati (jatuh), kilau emas (bintang songket), kunang-kunang (`components/Ornaments.jsx`) |
| BotanicalBorder (sketsa bunga di tepi) | SongketBorder: rel ganda, tumpal pucuk rebung, rantai bintang berantai, sulur simbar — tetap dengan animasi "tergambar" |
| Bunga & kelopak warna-warni (hero, latar, mempelai) | kembang goyang, melati, bintang, daun sirih, tanjung (`components/adat/AdatPetals.jsx`) |
| Sudut lengkung warna-warni | sudut ukiran simbar |
| Accent coral/emerald/purple/sky | dipetakan ulang ke amber prada / hijau limas / tembaga khusus di route Songket |
| Font judul Montserrat | Cinzel |
| Teks UI Inggris | Bahasa Indonesia |
| — | tambahan: Rumah Limas di hero, tepak sirih di ayat, tenong di hadiah, Ampera + perahu di penutup |
| — | **motif songket dari referensi pemilik** (`components/adat/motifGeometry.mjs` → `scripts/gen-songket-motifs.mjs` → `public/songket/motifs/*-v1.svg`): kain lepus di latar, kepala kain di hero & tiap section, pita anyaman di tepi, roset anyaman untuk kilau emas, kain emas bermotif marun di RSVP & penutup |
| Foto demo mempelai | potret siluet Aesan Gede (`public/songket/demo/*.svg`); foto demo lain masih placeholder Lovebirds |

### Ragam motif kain (paralel, dipilih lewat 🎨 → "Motif Badan Kain" + "Motif Kepala Kain")

Permintaan pemilik: motif yang sudah ada **ditetapkan** (tidak dihapus) sebagai **Motif Awal**, lalu
enam ragam songket dibuat **berdampingan** supaya bisa dibandingkan. Teknisnya: `config/motifs.js`
→ `body[data-sk-motif]` → aturan CSS di `styles/theme.css`; ubin dari `scripts/gen-songket-motifs.mjs`.
Saat ini hanya bisa dipilih di demo (panel 🎨); `config.theme.motif` (badan) dan `config.theme.kepala`
(kepala) sudah dibaca sebagai default, tetapi belum ada kontrol di dashboard/admin untuk menyimpannya.

**Pasangan (kombinasi badan × kepala).** Badan kain dan kepala kain bisa diambil dari ragam yang
berbeda, mis. badan Lepus + kepala Tretes Mender. Kepala `Sama` = satu ragam saja. Karena perannya
berbeda (badan ≠ kepala), ini **permutasi**: 7 × 7 = 49 tampilan, 7 di antaranya ragam tunggal dan 42
pasangan. Teknisnya `body[data-sk-motif]` (badan) + `body[data-sk-kepala]` (kepala, ikut badan bila
`Sama`); aturan kepala wajib memakai `data-sk-kepala` (dijaga test).

**Dua warna (emas + warna palet).** Tiap ubin emas punya pasangan `-isi-` (motif yang ditebalkan dan
diisi rongganya). Ubin isi dicat `--motif-isi` (warna palet) di BAWAH benang emas, sebagai dua lapis
terpisah, jadi emasnya tetap emas dan warna palet muncul di pinggir dan isi motif, tidak tercampur
jadi krem pucat.

**Lepus v2:** sel diperbesar 48 → 96 px dengan garis tetap halus supaya kotaknya besar dan tidak
ramai (`lepus-padat-v2.svg`).

| Ragam | Ciri yang diterapkan | Badan kain | Kepala kain |
|---|---|---|---|
| **Motif Awal** | set pertama (dari gambar referensi pemilik) | tumpal bertombak + bunga tabur | pucuk rebung bersulur |
| **Lepus** | benang emas menutupi hampir seluruh kain | sel nampan perak rapat dalam kisi belah ketupat | tumpal rapat |
| **Tabur** | motif kecil ditabur berjarak, dasar kain terlihat | bunga tabur + bintang kecil berselang | bunga tabur kecil (bingkai tipis) |
| **Bunga-Bunga** | motif bunga naturalis | sulur diagonal: mawar, bunga kecil, daun | sulur bergelombang dengan mawar |
| **Limar** (Bunga Cogan) | songket berpadu tenun ikat pakan | bidang ikat berwarna `--limar` berujung lembut + Bunga Cogan emas | zigzag + bunga cogan |
| **Tretes Mender** | badan polos, motif hanya di pinggir & ujung | — (polos) | tumpal besar + deret tumpal kecil (paling kaya) |
| **Rumpak** | motif berbaris, berselang jalur polos | baris petak bergeser setengah langkah | deret petak |

⚠️ **Perlu dicek ke sumber adat** (teman konsultan/perias/penenun): ciri di atas disusun dari
pengetahuan umum. Yang paling tidak pasti: bentuk **Bunga Cogan**, dan apakah **Rumpak** memang
"berbaris/berpetak berselang polos". Lepus, Tabur, Limar (ikat), dan Tretes Mender (badan polos,
motif di pinggir) relatif lebih pasti.

**Sengaja BELUM (supaya tidak bisa dibeli selama uji coba):** `templateCatalog.js`, tabel DB
`templates` + `template_plans`, form admin create, galeri marketing (`vibeData.ts`), tutorial
dashboard. Konsekuensinya: tab Palet di dashboard masih membaca `vibeData.ts`, jadi untuk undangan
Songket sungguhan (comp) tab itu belum menampilkan palet Songket. Ini bagian Fase 4.

**Cara melihat:** `npm run dev`, lalu buka `/songket/demo-songket` (tambahkan `?to=Nama` untuk sapaan
tamu, `?noframe=1` di desktop yang meniru HP).


Template ketiga FinCards dan template **adat** pertama. Tujuannya: undangan yang terasa seperti
masuk ke Rumah Limas saat *munggah*. Warnanya merah lak, emas prada, dan songket, tapi tetap
sinematik dan ringan di HP seperti Lovebirds dan Solary.

> Catatan akurasi: daftar budaya di bawah disusun dari pengetahuan umum, **belum** diverifikasi ahli.
> Butir bertanda ⚠️ wajib dicek ke perias pengantin adat Palembang atau budayawan Sumsel sebelum aset
> digambar (lihat Fase 0). Salah menempatkan atribut adat lebih merusak kepercayaan daripada tidak
> memakainya sama sekali.

---

## 1. Konsep & nama

**Konsep:** *"Lawang ke Munggah"*. Tamu "membuka pintu" (lawang) ukiran Rumah Limas, lalu dibawa
menyusuri alur adat sampai puncak acara (munggah/resepsi). Penutupnya Sungai Musi dan Jembatan Ampera
di malam hari.

**Usulan nama** (id template = huruf kecil, dipakai di URL `/<id>/<slug>`):

| Nama | Kelebihan | Kekurangan |
|---|---|---|
| **Songket** (rekomendasi) | Langsung dikenali, cocok dengan visual utama, bisa jadi "keluarga" (Songket Minang, dst.) | Generik, songket juga ada di daerah lain |
| Limas | Khas Palembang, terdengar elegan | Kurang dikenal di luar Sumsel |
| Sriwijaya | Megah, punya nilai sejarah | Berat, berkesan "kerajaan/politik" |
| Musi | Pendek dan modern | Kesan adatnya lemah |

Untuk seri adat ke depan, bisa juga dipakai pola `adat-<daerah>` (mis. `palembang`), yang lebih
mudah dikembangkan menjadi katalog per daerah. **Keputusan ada di pemilik.** Dokumen ini memakai
`<id>` sebagai placeholder.

---

## 2. Arah visual

### Palet (usulan, dimasukkan ke palette allowlist)

| Nama palet | Dasar | Aksen | Teks | Rasa |
|---|---|---|---|---|
| **Merah Lak** (default) | merah marun `#6E1423` | emas prada `#C9A227` | krem gading `#F6EBD3` | klasik Aesan Gede |
| Hitam Lak | hitam lak `#1A1210` | emas `#D4AF37` + merah `#8B1E2D` | gading | malam, mewah |
| Gading Songket | gading `#F4E9D2` | emas tua `#6E5310` + marun `#7A1626` | coklat tua `#2A1A12` | terang, untuk siang/akad (emas digelapkan supaya lolos AA) |
| Hijau Limas | hijau tua `#1F3B2D` | emas | gading | alternatif, nuansa kayu dan daun |

⚠️ **Aksesibilitas:** teks emas di atas merah biasanya **gagal** kontras WCAG AA. Emas dipakai untuk
ornamen dan judul besar saja. Teks isi memakai gading di atas merah, atau coklat tua di atas gading.
Ikuti pola guard kontras yang sudah ada (`a11y.spec.ts` memeriksa rasio ≥ 4.5, bukan hex).

### Tipografi
Judul memakai serif berkarakter "prasasti" (kandidat Google Fonts: *Cinzel*, *Marcellus*,
*Cormorant Garamond*), isi memakai sans yang ramah (Biryani sudah ada), dan aksen script tetap
memakai *Tangerine* atau *Great Vibes* yang sudah ter-load. Font baru dimuat lewat `next/font` di
`src/app/layout.tsx` dan diberi token `--<id>-font-*` di `src/styles/tokens.css`, mengikuti pola
Lovebirds dan Solary.

### Gaya ilustrasi
Flat-ornamental: garis emas di atas bidang merah/hitam, seperti lak Palembang. **Bukan foto dari
internet** (hak cipta). Karakter pasangan berbusana adat memakai pendekatan sistem karakter yang
sama dengan `docs/lovebirds-character-system.md`.

---

## 3. DAFTAR ORNAMEN YANG PERLU DISIAPKAN

Prioritas: **P0** = wajib untuk rilis demo · **P1** = rilis berbayar · **P2** = pemanis/versi berikutnya.
Format: **SVG** untuk pola/border/sudut (satu warna, `currentColor`, supaya otomatis ikut palet);
**WebP** untuk ilustrasi penuh (lebar 2×, target ≤ 200 KB per file).

### A. Motif songket Palembang (pola dan border)

| # | Ornamen | Makna / asal | Dipakai di | Format | Prio |
|---|---|---|---|---|---|
| A1 | **Songket Lepus** (latar benang emas penuh) | songket paling mewah, benang emas menutup hampir seluruh kain | tekstur latar hero dan penutup (opacity rendah) | SVG pola tile | P0 |
| A2 | **Pucuk Rebung** (tumpal segitiga) | harapan tumbuh dan berkembang; kepala kain | border atas/bawah setiap section | SVG border repeat-x | P0 |
| A3 | **Bunga Tabur / Tabur Bintang** | bunga kecil bertebaran; kemakmuran | latar section isi (sangat halus) | SVG pola tile | P0 |
| A4 | **Bintang Berantai** | rangkaian bintang; persatuan dua keluarga | pembatas (divider) antarsection | SVG | P0 |
| A5 | **Nampan Perak** | medalion/bingkai | bingkai foto mempelai | SVG bingkai | P0 |
| A6 | Songket Limar / Tretes / Bungo Pacik | ragam songket Palembang lain | variasi pola per palet | SVG pola tile | P2 |
| A7 | Kain Jumputan (pelangi) Palembang | kain ikat-celup khas | aksen palet "Gading" | SVG/WebP | P2 |

⚠️ Pastikan nama dan bentuk motif cocok (mis. Bintang Berantai dan Nampan Perak sering tertukar di
sumber online). Minta 1–2 foto kain asli sebagai rujukan untuk ilustrator.

### B. Ukiran & lak Palembang (bingkai, sudut, tekstur)

| # | Ornamen | Makna / asal | Dipakai di | Format | Prio |
|---|---|---|---|---|---|
| B1 | **Ukiran sudut motif Simbar** (sulur pakis) | motif ukiran khas Palembang | 4 sudut kartu/section | SVG (1 sudut, di-mirror via CSS) | P0 |
| B2 | **Motif Tanjung & Teratai** | bunga tanjung dan teratai pada ukiran; kesucian | ornamen tengah judul section | SVG | P0 |
| B3 | **Tekstur lak merah/hitam + prada emas** | kerajinan lak Palembang | permukaan kartu (glass-card versi lak) | WebP tile kecil / CSS gradient | P0 |
| B4 | **Pintu (lawang) ukiran Rumah Limas** — 2 daun pintu terpisah | pintu masuk rumah adat | animasi pembuka (pintu terbuka) | WebP/SVG, 2 layer kiri-kanan | P0 |
| B5 | Motif Melati ukiran | kesucian | ornamen kecil RSVP/ucapan | SVG | P1 |

### C. Arsitektur & ikon kota

| # | Ornamen | Dipakai di | Format | Prio |
|---|---|---|---|---|
| C1 | **Fasad Rumah Limas** (atap limas + ornamen simbar/tanduk di bubungan, lantai berundak *kekijing*) | latar hero setelah pintu terbuka | WebP berlapis (atap, badan, tangga) untuk parallax | P0 |
| C2 | **Jembatan Ampera + Sungai Musi malam** | footer/penutup | WebP berlapis (langit, jembatan, air) | P0 |
| C3 | Perahu (bidar / kajang / ketek) di Sungai Musi | animasi kecil di footer (melintas) | SVG | P1 |
| C4 | Rumah Rakit | variasi ilustrasi peta/lokasi | SVG | P2 |
| C5 | Masjid Agung Palembang | hanya opsional untuk section akad | SVG | P2 ⚠️ |

C5: bangunan ibadah, jadi pakai hanya bila pasangan memilih. Default tidak ditampilkan.

### D. Busana & aksesori pengantin (sebagai ikon dan ilustrasi karakter)

| # | Ornamen | Dipakai di | Prio |
|---|---|---|---|
| D1 | **Mahkota Karsuhun** (pengantin wanita, Aesan Gede) + kembang goyang | ikon mempelai wanita, favicon, logo template | P0 ⚠️ |
| D2 | **Penutup kepala pengantin pria Aesan Gede** (kopiah/songkok emas, sering disebut *kopiah cuplak*) | ikon mempelai pria | P0 ⚠️ |
| D3 | **Ilustrasi pasangan berbusana Aesan Gede** (merah-emas) | hero/mempelai | P1 ⚠️ |
| D4 | Ilustrasi pasangan **Aesan Paksangko** (varian) | pilihan alternatif di editor | P2 ⚠️ |
| D5 | Aksesori: kalung *kebo munggah*, *teratai* (penutup dada/bahu), *selempang sawit*, *pending* (pending emas), gelang | ikon-ikon kecil detail acara | P1 ⚠️ |
| D6 | **Tanggai** (kuku emas penari Tari Tanggai) | ornamen tangan "menyambut" di section salam | P1 |
| D7 | Keris (pengantin pria) | ikon kecil, opsional | P2 |

⚠️ **Jebakan paling umum:** Karsuhun (Palembang) sering tertukar dengan **Siger** (Lampung) dan
**Suntiang** (Minang). Ilustrator wajib memakai foto rujukan Aesan Gede asli. Nama tiap aksesori
juga harus dicek ke perias pengantin adat sebelum dipakai sebagai label.

### E. Benda upacara & tradisi

| # | Ornamen | Makna | Dipakai di | Prio |
|---|---|---|---|---|
| E1 | **Tepak sirih Palembang** | lambang penghormatan dan penyambutan tamu (Tari Tepak/Gending Sriwijaya) | section salam/pembuka setelah pintu | P0 |
| E2 | **Tenong lak** (wadah bulat bertingkat) | wadah seserahan/hantaran | section **Hadiah** (tutup tenong terbuka, nomor rekening muncul) | P0 |
| E3 | **Payung pengantin** (payung kebesaran, kuning/emas) | arak-arakan pengantin | section acara/resepsi | P1 |
| E4 | Kipas pengantin | aksesori pelaminan | ornamen RSVP | P2 |
| E5 | Hidangan *ngobeng* (nasi minyak, pindang, kue maksuba, kue 8 jam) | tradisi jamuan | ornamen kecil bagian resepsi | P2 |

### F. Ornamen animasi (pengganti burung/kupu-kupu Lovebirds)

Template ini **punya** pemilih ornamen (beda dengan Solary). Tiga opsi, didaftarkan di
`TEMPLATE_ORNAMENTS`:

| key | Label UI | Deskripsi | Prio |
|---|---|---|---|
| `melati` | Hujan melati | kelopak melati dan cempaka jatuh perlahan, sedikit, di tepi layar | P0 |
| `kilauEmas` | Kilau benang emas | kilau berjalan menyusuri garis songket pada border | P0 |
| `kunang` | Kunang-kunang Musi | titik cahaya hangat melayang (paling cocok dengan palet Hitam Lak) | P1 |

Kembang goyang yang "bergetar" di sudut mahkota juga bisa menjadi mikro-animasi tetap di hero.
Semuanya memakai CSS/GSAP/motion yang sudah ada di stack, tanpa library baru, dan wajib menghormati
`prefers-reduced-motion`.

### G. Audio

Musik latar default **harus berlisensi**. Lagu "Gending Sriwijaya" (ciptaan era 1940-an) dan
rekamannya kemungkinan masih dilindungi hak cipta. Lagu daerah seperti "Cuk Mak Ilang" dan
"Dek Sangke" tergolong tradisional, tetapi **rekaman** orang lain tetap berhak cipta. Opsi aman:
pesan instrumental baru (gambus/akordeon Melayu atau gamelan Palembang) ke musisi lokal dengan
hak penuh, atau gunakan musik royalty-free bernuansa Melayu. Pasangan tetap bisa mengganti lagu
lewat tab Musik yang sudah ada.

---

## 4. Susunan section (dipetakan ke alur adat)

Memakai **tipe section dan bentuk data yang sama dengan Lovebirds** (lihat §5), dengan visual baru.

| # | Section (type) | Tampilan adat | Isi default (bisa diedit) |
|---|---|---|---|
| 1 | `hero` (terkunci di awal) | **Lawang**: pintu ukir terbuka (play-once, tanpa scroll-lock, seperti hero Lovebirds), lalu fasad Rumah Limas + nama pasangan | nama, tanggal |
| 2 | `quote` | **Kato Pembuko**: tepak sirih + salam; ayat Ar-Rum 21 opsional | salam pembuka |
| 3 | `brideGroom` | foto dalam bingkai **Nampan Perak**, ikon Karsuhun dan penutup kepala pria | nama, orang tua |
| 4 | `ourStory` | **Lini masa adat**: timeline dengan border pucuk rebung | contoh tahapan: Madik → Menyenggung → Ngebet → Berasan → Mutuske Kato → Nganterke Belanjo → Akad → Munggah ⚠️ |
| 5 | `eventDetails` + `schedule` | **Akad & Munggah/Resepsi**, payung pengantin | waktu, tempat, peta |
| 6 | `galleryMasonry` (satu galeri) | galeri berbingkai songket ("tabur") | foto |
| 7 | `weddingGift` | **Tenong** terbuka, rekening terenkripsi | rekening |
| 8 | `rsvp` | kartu lak dengan ornamen melati | — |
| 9 | `footer` (terkunci di akhir) | **Ampera & Sungai Musi malam**, perahu melintas, "Terima kasih" | penutup |

Isi tahapan adat di #4 hanya contoh. Tidak semua keluarga menjalankan semua tahap, dan nama tahap
perlu dicek (⚠️). Pasangan bebas mengubah atau menghapus.

**Bahasa:** default memakai Bahasa Indonesia, dengan sisipan frasa Palembang hanya yang sudah
diverifikasi penutur asli (mis. semboyan *"Wong Kito Galo"* di footer). Jangan mengarang kalimat
*baso Pelembang alus*.

---

## 5. Arsitektur teknis

### Keputusan inti: data seperti Lovebirds, visual baru

Template baru memakai **bentuk config yang sama dengan Lovebirds** (tipe section dan nama prop
seperti `accountNumber` / `accountHolder`). Keuntungannya:

- **Editor langsung jalan.** Skema di `src/editor/schemas/` (yang generik) dipakai ulang; tidak
  perlu folder skema khusus seperti `schemas/solary/`.
- **Enkripsi rekening otomatis.** `src/lib/crypto/config.ts` mengenali rekening dari nama key:
  `accountNumber` berarti bentuk Lovebirds. Kalau template baru memakai nama key lain, nomor
  rekening bisa **tersimpan tanpa enkripsi**. Wajib ada test yang memastikannya.
- RSVP, gift, tamu, buku tamu, dan pembayaran tidak disentuh sama sekali.

Yang baru hanya isi `src/all-templates/<id>/`: Shell, sections, components, styles, dan aset.

### Daftar file yang harus disentuh (hasil audit kode, lebih lengkap dari resep di `tutorial-multi.md`)

**Inti (tanpa ini template tidak tampil):**
1. `src/all-templates/<id>/` — `Shell.jsx`, `registry.js`, `defaultConfig.js` (plain data), `sections/`, `components/`, `styles/`, `demoImages.js`
2. `src/config/templateIndex.js` — daftarkan `{ label, config }`
3. `src/config/templateCatalog.js` — kartu galeri template
4. `src/app/[template]/[slug]/InvitationView.tsx` — `dynamic()` import Shell
5. `src/middleware.ts` — tambahkan `<id>` ke **dua** alternasi `:template(lovebirds|solary)`. Tanpa ini preview pemilik untuk undangan yang belum terbit akan rusak tanpa pesan error.

**Wajib, dan berbahaya kalau lupa** (tidak ada di resep `tutorial-multi.md`):
6. `src/lib/templates/appearance.ts` — `TEMPLATE_ORNAMENTS[<id>] = [melati, kilauEmas, kunang]`. Template yang **tidak terdaftar** dianggap "legacy" dan menerima semua ornamen Lovebirds (burung/kupu-kupu).
7. `src/lib/config/palette-allowlist.ts` — daftar palet template
8. `src/lib/crypto/config.ts` — tidak diubah, tetapi **tambah test** bahwa rekening di `defaultConfig` template baru ikut terenkripsi
9. `src/editor/schemas/index.ts` — registry skema untuk `<id>` (turunan registry Lovebirds)
10. `src/editor/templatePolicy.ts` — policy: hero/footer terkunci, satu galeri, jumlah section maksimal

**Dashboard & konten:**
11. `src/app/[template]/[slug]/dashboard/tutorial/content.ts` + `src/lib/i18n/dictionaries/dashboard.ts` (ID+EN, test `dict-parity` harus hijau) + screenshot tutorial (`npm run capture:tutorial`)
12. `src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx` — sudah membaca registry ornamen; cukup diverifikasi

**Marketing & admin:**
13. `src/components/marketing/` — `vibeData.ts`, `VibeBackdrop`, `PreviewMock`, `VibeExploration`; `src/components/preview/DeviceStage.tsx`
14. `src/lib/i18n/dictionaries/landing.ts` + `templates.ts` — copy template. Ikuti aturan **bayar dulu**: jangan menulis "coba gratis".
15. `src/app/admin/invitations/new/CreateInvitationForm.tsx` — pastikan template baru muncul sebagai pilihan
16. `scripts/create-invitation.mjs`, `seed-dummy.mjs`, `capture*.mjs` — dukung `--template=<id>`

**Database (migrasi baru, bertanggal):**
17. `supabase/migrations/<tanggal>_template_<id>.sql` — insert ke katalog `templates` (mengikuti `2026-07-08_templates_catalog.sql`) + baris `template_plans` basic/premium beserta `features`. Harga final diatur di `/admin` → Plans, bukan di-hardcode.

**Aset & hosting:**
18. Aset di `public/<id>/` dalam format `.webp`/`.svg`, diunggah ke R2 lewat `scripts/upload-static-assets.mjs`, dan dibaca melalui `staticAsset()`. Ingat gotcha 11: **mengganti gambar = mengganti nama file** (tanpa cache-busting).
19. `src/styles/tokens.css` + `src/app/layout.tsx` — token font template

**Dokumentasi:**
20. `tutorial-multi.md` §10/§14 — tambahkan langkah 6–10 di atas ke resep, supaya template berikutnya (adat lain) tidak terjebak. `CLAUDE.md` — tambahkan template ke daftar.

### Performa
Target sama dengan Lovebirds: lancar di HP kelas menengah dalam phone-frame iframe. Ornamen
latar harus ringan; hindari layer dekoratif berat yang remount per section (lihat gotcha 5,
BotanicalBorder). Pola songket memakai SVG tile kecil di `background-image`, bukan ribuan node DOM.
Ilustrasi berlapis untuk parallax cukup 3–4 layer.

---

## 6. Fase kerja

| Fase | Isi | Hasil | Perkiraan |
|---|---|---|---|
| **0. Riset & validasi** | moodboard; foto rujukan kain songket, Aesan Gede, Rumah Limas, lak; konsultasi 1 perias pengantin adat Palembang/budayawan; kunci nama template dan palet | daftar ornamen final (butir ⚠️ terjawab), moodboard | 1 minggu |
| **1. Aset P0** | ilustrator mengerjakan A1–A5, B1–B4, C1–C2, D1–D2, E1–E2 + ikon | file SVG/WebP sesuai spesifikasi §3 | 2–3 minggu (paralel dengan Fase 2) |
| **2. Kerangka teknis** | folder template, wiring file 1–10, demo `/<id>/demo-<id>` dengan placeholder, test enkripsi + appearance | demo jalan, test hijau | 3–5 hari |
| **3. Visual section** | 9 section + animasi pintu + 3 ornamen + palet | demo lengkap | 2–3 minggu |
| **4. Dashboard & konten** | tutorial, i18n, screenshot, copy marketing | editor siap untuk pasangan | 1 minggu |
| **5. DB, QA, rilis** | migrasi katalog dan plan; uji 320/768/1024 px; kontras; performa HP; review budaya terakhir oleh konsultan | rilis demo dulu, lalu dijual | 1 minggu |

Total kira-kira **6–8 minggu**. Faktor penentunya kecepatan ilustrator. Bagian kode bisa berjalan
sambil menunggu aset karena memakai placeholder.

**Gerbang kualitas tiap fase:** `npm run typecheck && npm run test && npm run check:tokens`.
Sebelum rilis: `npm run build` dan uji visual demo.

---

## 7. Paket aset untuk ilustrator (ringkas)

- Gaya: flat-ornamental, garis emas, bidang merah/hitam lak; **bukan** realistis atau foto
- SVG pola: tileable mulus, satu warna (`currentColor`), viewBox kecil (≤ 200 px), tanpa teks
- Sudut ukiran: satu sudut saja (kiri-atas); sisanya di-mirror lewat CSS
- Ilustrasi berlapis (Rumah Limas, Ampera): PNG transparan per layer, nanti dikonversi ke WebP; lebar 2400 px untuk desktop + versi 1200 px untuk HP
- Pintu lawang: dua daun pintu sebagai file terpisah (untuk animasi buka)
- Karakter: pose depan dan 3/4, wajah netral/generik (bukan wajah orang nyata)
- Sertakan rujukan foto asli dari Fase 0 di brief, dan minta **penyerahan hak cipta penuh** dalam kontrak

---

## 8. Risiko

| Risiko | Mitigasi |
|---|---|
| Atribut adat salah atau tercampur daerah lain (Karsuhun vs Siger/Suntiang) | Fase 0 konsultasi + review budaya sebelum rilis |
| Hak cipta (foto internet, rekaman lagu, font) | ilustrasi pesanan sendiri + kontrak hak cipta, musik berlisensi, font Google (OFL) |
| Kontras emas di atas merah gagal aksesibilitas | emas hanya untuk ornamen dan judul besar; test rasio kontras |
| Rekening tidak terenkripsi karena bentuk data berbeda | pakai bentuk data Lovebirds + test enkripsi (file 8) |
| Ornamen Lovebirds bocor ke template baru | daftarkan di `appearance.ts` (file 6) + test |
| Berat di HP | SVG tile, layer parallax terbatas, ukur dengan spec perf yang ada |
| Konten agama dipaksakan | ayat/masjid bersifat opsional, default netral |

---

## 8b. Rekomendasi mencari ilustrator

1. **Cari yang lokal Sumsel dulu.** Detail Aesan Gede, songket, dan ukiran lebih aman di tangan orang
   yang melihatnya langsung. Cari di Instagram/Behance dengan kata kunci "ilustrator Palembang",
   "vector ornamen songket", "ilustrasi pengantin Palembang", atau lewat mahasiswa/alumni DKV kampus
   di Palembang.
2. **Kalau belum ketemu:** marketplace freelance Indonesia (Projects.co.id, Sribulancer, Fastwork)
   dengan brief §7 + foto rujukan.
3. **Uji kecil berbayar dulu** (mis. 1 ukiran sudut + 1 siluet pasangan) sebelum kontrak paket P0.
   Minta 2–3 penawaran harga karena tarif freelance sangat bervariasi.
4. **Kontrak:** penyerahan hak cipta penuh, file vektor sumber (SVG/AI), revisi terbatas yang jelas.
5. **AI image generator:** boleh untuk moodboard, **jangan** untuk aset final (akurasi adat sering
   salah dan status hak ciptanya tidak jelas).

Komponen di `components/ornaments.jsx` sudah berupa slot. Aset final cukup menggantikan isi
komponen; section tidak perlu disentuh.

## 9. Keputusan yang dibutuhkan dari pemilik

1. **Nama dan id template**: Songket / Limas / Sriwijaya / Musi / `adat-palembang`?
2. **Busana default**: Aesan Gede (merah-emas, paling ikonik), dengan Paksangko sebagai varian di P2?
3. **Ilustrator**: freelancer lokal Sumsel (lebih paham detail) atau ilustrator yang sudah pernah dipakai?
4. **Konsultan budaya**: ada kenalan perias pengantin atau sanggar di Palembang?
5. **Musik**: pesan instrumental baru, atau pakai royalty-free dulu?
6. **Harga**: sama dengan template lain atau lebih tinggi (premium adat)? Diatur di `/admin` → Plans.
