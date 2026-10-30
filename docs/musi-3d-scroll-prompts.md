# Template Musi — prompt undangan 3D scroll: Limas ke Sungai Musi

Undangan pernikahan 3D yang digerakkan scroll: Rumah Limas → peta Sumatera Selatan →
menyusuri Sungai Musi → naik ke langit Palembang dengan kembang api.

Nama template: **Musi** (ID `musi`). Tagline galeri: *"Dari Rumah Limas, menyusuri Musi,
sampai kembang api di langit Palembang."*

Dibangun dalam dua tahap:

- **Prompt A (V1)** — prototipe satu file HTML untuk mencari tampilan dan gerak kamera.
  Datanya **sudah berbentuk config FinCards**, jadi port ke V2 tinggal mekanis.
- **Prompt B (V2)** — masuk ke repo `wedding-saas-full` sebagai template baru
  `src/all-templates/musi/`, bisa diedit pasangan di dashboard dan dijual lewat checkout.

## Yang berubah dari versi sebelumnya

| Sebelumnya | Sekarang | Alasan |
| --- | --- | --- |
| Objek `INVITE { pria, wanita, ... }` | `CONFIG.sections[]` (bentuk config FinCards) | Pasangan harus bisa mengedit isi di dashboard. Objek lepas = tidak bisa diedit. |
| 5 kartu | 11 section (sama dengan urutan Taman Bunga) | Countdown, ucapan, dan amplop sebelumnya hilang atau dititipkan. |
| `onRSVP()` callback | `POST /api/rsvp` + `/api/guestbook` dengan kode tamu | RSVP dan ucapan FinCards wajib pakai kode undangan sekali pakai. |
| Pulau Kemaro di ikon Bab 1 | Dihapus di semua tempat | Bertentangan dengan permintaan "jangan ada Kemaro". |
| Kartu "maksimal 3 baris" | Kamera berhenti selama kartu tampil; kartu panjang dapat jatah scroll lebih | Kartu mempelai/acara/galeri tidak muat 3 baris. |
| Peta Indonesia dari primitif | Garis pantai sederhana ditanam di kode (inline), lalu di-extrude | Pulau dari kotak/silinder akan terlihat aneh. |
| Bab 1: Limas → Nusantara → Sumsel → Palembang | Limas → Sumatera → Sumsel → Palembang | Terlalu padat di 25% scroll, terutama di HP. |
| "Bab 1 jalan otomatis" | Tombol menggulir halus ke progres 0,04 | Kamera tidak boleh dua sumber (auto + scroll) — bisa lompat. |
| Tombol musik sendiri | Pakai sistem musik FinCards (`config.music`) | Sudah ada, termasuk sumber YouTube. |
| "kota Sumatera Selatan" | "kota Palembang" | Sumsel itu provinsi. |
| Pintu Limas langsung jadi flash | Jelajah isi rumah: garang → lawang kipas → kekijing → gegajah → pangkeng → dapur → pelaminan, dengan kartu adat tiap ruang | Permintaan owner: sebelum peta, tamu melihat isi Rumah Limas dan keunikan adatnya. |
| Landmark sudah berdiri sejak awal | Perahu masuk frame → landmark pop-up dari tanah (Ampera dibangun dari dua sisi) → kartu kaca → landmark berikutnya | Permintaan owner: tiap landmark "datang" saat perahu tiba, baru kartunya tampil. |
| `three@0.160` | V1: `three@0.168.0` via importmap; V2: paket npm repo | Repo sudah memakai `three@^0.168` (Solary). |

## Keputusan sebelum membangun

- **Nama & ID template**: label **Musi**, ID `musi` (URL `/musi/<slug>`, DB `template_id`,
  folder `src/all-templates/musi/`, tipe section berawalan `musi*`). ID tidak bisa diganti
  lagi setelah ada baris di DB, jadi kunci sekarang.
- **Transisi Limas → peta**: pintu terbuka + flash putih-emas (dipertahankan).
- **Musik**: ikut sistem musik FinCards; default mati sampai tamu menekan "Buka Undangan".
- **HP kelas bawah**: tiga level kualitas otomatis (lihat Prompt A, bagian Performa).

---

## Prompt A — V1 prototipe HTML (tempel ke sesi baru)

```markdown
Buat prototipe undangan pernikahan 3D interaktif berbasis scroll dengan Three.js.
Satu file HTML mandiri, satu canvas WebGL, kamera bergerak di jalur sinematik yang
progresnya dikendalikan scroll (0 sampai 1). Bahasa UI: Indonesia.
Tema: Palembang, Sumatera Selatan. Prototipe ini nanti di-port ke Next.js, jadi patuhi
KONTRAK DATA di bawah persis.

=== TEKNIS ===
- three@0.168.0 via importmap CDN (versi dipin, cdn.jsdelivr.net atau unpkg).
- Semua objek 3D prosedural dari primitif/geometry (tanpa file gambar/model).
  Pengecualian: garis pantai pulau (lihat Bab 1) boleh berupa data koordinat inline.
- Scroll: halaman tinggi ~700vh, progres = scrollY / (tinggi - viewport), dihaluskan
  (damping) supaya kamera tidak patah. Dukung touch dan wheel.
- Kamera: posisi di CatmullRomCurve3 + titik lookAt yang juga diinterpolasi. Jalur
  dibagi 4 bab, sambungan memakai smoothstep. Kamera tidak boleh menembus objek.
- SATU sumber gerak kamera: progres scroll. Tidak ada animasi kamera yang jalan
  sendiri di luar scroll (kecuali goyang kapal, idle, dan "napas" kecil).
- Gaya: low-poly flat-shaded, rounded box, ACES tone mapping, hemisphere light +
  matahari/bulan dengan soft shadow, fog. Palet: marun #8f1d21, emas #d6a43a,
  krem #f1e6cf, daun #5f8f4e, Musi #a58b63, malam #0e1630.
- Semua warna palet ditaruh di satu objek PALETTE di atas file (nanti jadi palet
  yang bisa dipilih pasangan).

=== PERFORMA (wajib) ===
- pixelRatio <= 1.5, InstancedMesh untuk pohon/gedung/orang/perahu, draw call < 150.
- Tiga level kualitas: high / medium / low. Pilih awal dari devicePixelRatio,
  hardwareConcurrency, dan lebar layar; turunkan otomatis bila rata-rata frame > 24ms
  selama 2 detik. Low = tanpa bayangan, tamu 20, tanpa backdrop-filter (kartu pakai
  latar gelap transparan biasa), kembang api lebih sedikit partikel.
- Berhenti render saat tab tersembunyi. Pesan fallback bila WebGL gagal.
- prefers-reduced-motion: kamera berpindah antar-bab dengan cross-fade (bukan terbang),
  kapal tidak goyang, kembang api statis.
- Debug: ?fps=1 menampilkan FPS + level kualitas di pojok.

=== KONTRAK DATA (jangan diubah bentuknya) ===
Taruh di atas file. Semua teks yang tampil di layar diambil dari sini, tidak ada teks
yang di-hardcode di kode scene.

const CONFIG = {
  couple: { name1: 'Nama Wanita', name2: 'Nama Pria' },   // name1 = wanita, name2 = pria
  sections: [
    { id: 'cover',    type: 'musiCover',    enabled: true, props: { eyebrow, greeting, guestFallback, openLabel } },
    { id: 'quote',    type: 'musiQuote',    enabled: true, props: { label, text, source } },
    { id: 'couple',   type: 'musiCouple',   enabled: true, props: { groomLabel, groomNickname, groomFullName, groomParents, groomPhoto,
                                                                   brideLabel, brideNickname, brideFullName, brideParents, bridePhoto } },
    { id: 'story',    type: 'musiStory',    enabled: true, props: { label, moments: [{ id, year, title, body }] } },
    { id: 'saveDate', type: 'musiSaveDate', enabled: true, props: { label, date /* 'YYYY-MM-DDTHH:mm' */, timezone, showCountdown, calendarLabel } },
    { id: 'events',   type: 'musiEvents',   enabled: true, props: { label, events: [{ id, title, time }], venue, address, mapUrl, mapLabel, liveUrl, liveLabel } },
    { id: 'gallery',  type: 'musiGallery',  enabled: true, props: { title, hint, photos: [{ src, alt }] } },
    { id: 'rsvp',     type: 'musiRsvp',     enabled: true, props: { label, title, subtitle, maxGuests } },
    { id: 'wishes',   type: 'guestbook',    enabled: true, props: { label, title, subtitle, initialNotes: [{ id, name, message, color }] } },
    { id: 'gift',     type: 'musiGift',     enabled: true, props: { label, title, intro, accounts: [{ id, type /* bank|ewallet */, name, accountNumber, accountHolder }], giftAddress } },
    { id: 'closing',  type: 'musiClosing',  enabled: true, props: { label, text, couplePhoto } },
  ],
}

Aturan:
- Urutan section = urutan perjalanan, tetap. Section dengan enabled:false tidak tampil
  dan JATAH SCROLL-NYA DIPERAS (jalur kamera memendek), bukan meninggalkan celah.
  cover dan closing selalu ada.
- Nama tamu dari ?to=Nama (fallback props.guestFallback).
- Untuk V1, RSVP dan ucapan cukup simulasi sukses (tampilkan pesan terima kasih), tapi
  formnya sudah punya kolom "Kode undangan" (wajib diisi) karena V2 memakainya.
- Isi CONFIG dengan data demo yang masuk akal (nama Palembang, acara di Palembang,
  foto placeholder dari picsum.photos).

=== BAB 0: PEMBUKA — section cover (progres 0) ===
Rumah Limas megah di tengah: rumah panggung, atap limas bertingkat marun, lantai
bertingkat (kekijing), lis dan ukiran emas, tangga depan, tiang kayu, pagar, lampion,
melati, kain songket, tenda pelaminan. Halaman ramai: tamu berbusana adat (jumlah
sesuai level kualitas: 80 / 45 / 20), musisi, anak-anak, sebagian bergerak pelan
(bobbing, berjalan ke rumah). Dua tangga di kiri dan kanan garang; dinding depan
tertutup (lawang kipas). Siang hangat, kamera rendah menghadap fasad, parallax kecil
mengikuti pointer/gyro.
UI kaca: eyebrow + nama pasangan, greeting + nama tamu, tombol openLabel.
Selama cover tampil, scroll TERKUNCI dan posisi scroll selalu dipaksa ke 0 (termasuk
saat reload/restore). Tombol ditekan → cover memudar, scroll dibuka, halaman digulir
halus ke progres 0,04 (kamera mulai maju), musik mulai.

=== BAB 0,5: MENJELAJAHI RUMAH LIMAS (sebelum peta) ===
Tamu masuk dan menjelajahi isi rumah, ruang demi ruang, dengan jatah scroll panjang
(boleh luas, seakan-akan bereksplorasi). Tiap ruang punya kartu kecil yang menjelaskan
nama dan makna adatnya. Urutan:
  1. Garang — naik lewat salah satu dari DUA tangga (kiri/kanan) ke teras depan
     berpagar kayu berukir; tamu duduk santai di sini. Rumah panggung 1,5–2 m di atas
     tiang; kolongnya dulu untuk menyimpan perahu.
  2. Lawang kipas — dinding depan terlipat ke atas lalu ditopang seperti kipas;
     rumah terbuka menjadi satu aula besar.
  3. Kekijing — lantai berundak (3 undakan + gegajah), makin ke dalam makin tinggi.
     Undakan bawah: tamu umum & anak muda; makin atas: tetua, alim ulama. Semua
     lesehan di atas tikar/permadani, hampir tanpa kursi.
  4. Gegajah — ruang utama, lantai tertinggi: ukiran prada merah-hitam-emas (motif
     bunga), lemari ukir berisi keramik & songket, tepak sirih, lampu gantung, amben
     tempat tetua. Pelaminan dengan kedua mempelai (Aesan Gede) dipasang di sini.
  5. Pangkeng — kamera melirik ke bilik di sisi kiri/kanan, bersekat kayu berukir.
  6. Dapur — kamera melirik ke belakang: lantai turun lagi, dapur dengan tungku dan
     tangga belakang sendiri.
  7. Pelaminan — kamera menghadap mempelai, lalu flash putih-emas → peta.

=== BAB 1: LIMAS KE PETA — section quote (progres 0,00–0,20) ===
Dari pelaminan: flash putih-emas singkat, lalu kamera naik cepat, Limas mengecil, awan tipis lewat.
Tampak Pulau Sumatera dari ketinggian (laut biru, Jawa dan Bangka-Belitung terlihat
di tepi). Garis pantai: data koordinat sederhana inline (cukup ~150 titik per pulau,
mis. disederhanakan dari Natural Earth yang berlisensi public domain), di-extrude
low-poly. Sumatera Selatan menyala (outline emas), kamera turun ke Palembang.
Kartu quote muncul saat Sumsel menyala.
JANGAN tampilkan Pulau Kemaro atau pagodanya di bab mana pun.

=== BAB 2: MENYUSURI SUNGAI MUSI (progres 0,20–0,70) ===
Kamera di haluan perahu ketek/perahu hias, bergerak MENGIKUTI KURVA SUNGAI (posisi di
kurva = progres; scroll mundur = perahu mundur). Goyang halus (roll/pitch), riak,
jejak ombak, burung, perahu lain lalu-lalang. Waktu berjalan siang → senja → malam
(lampu jalan dan jendela menyala bertahap).
Landmark berurutan dan section yang muncul di dekatnya:
  - Jembatan Ampera (perahu lewat di bawahnya; LED menyala mulai senja) → couple
  - Benteng Kuto Besak + promenade                                       → story
  - Masjid Agung                                                         → saveDate (countdown)
  - Deretan Rumah Limas + rumah rakit                                    → events
  - LRT layang, warung pempek, kampung adat                              → gallery
Landmark tidak harus di tepi sungai; kamera boleh menoleh lembut ke landmark saat dekat.

URUTAN WAJIB DI SETIAP LANDMARK (penting, jangan diubah):
  1. Perahu masuk frame: perahu melaju sampai landmark terbingkai di layar
     (landmark BELUM ada — tanahnya kosong).
  2. Landmark MUNCUL dari tanah: pop-up lucu seperti jeli jatuh — memantul sekali
     (overshoot ±20%) lalu cepat mantap, JANGAN terlalu letoy/bergoyang lama.
     KECUALI Jembatan Ampera: Ampera DIBANGUN — kedua menara naik dari sungai, lalu
     dek jembatan memanjang dari tepi kanan dan tepi kiri, bertemu di tengah, dan
     menyambung menjadi Ampera utuh (sedikit getar jeli saat menyambung).
  3. Kartu kaca section itu tampil sampai selesai, sementara perahu melambat.
  4. Perahu lanjut ke landmark berikutnya → ulangi 1–3.
  ... → akhir: kamera naik dan memperlihatkan kota Palembang dari atas dengan kembang api.
Pop-up dipicu saat scroll melewati titiknya (animasinya berjalan dengan waktu, bukan
di-scrub scroll); scroll mundur melewati titik itu → landmark tenggelam lagi.
Satu segmen dengan beberapa landmark (Limas + rakit; LRT + pempek + kampung)
memunculkannya berurutan.

Saat sebuah kartu tampil, perahu MELAMBAT/BERHENTI (progres perjalanan diam sementara
scroll tetap jalan) supaya kartu bisa dibaca. Jatah scroll tiap kartu sebanding dengan
isinya: story dapat jatah per momen, gallery per foto.
Gallery: kartu kaca dengan carousel foto (geser + ketuk untuk perbesar). Foto TIDAK
dijadikan tekstur WebGL (hindari masalah CORS dari storage).

=== BAB 3: LANGIT KOTA (progres 0,70–1,00) ===
Perahu memudar. Kamera terangkat dengan lengkung panjang lalu menoleh menghadap kota
Palembang malam dari ketinggian: kota bercahaya, Musi berkilau, Ampera menyala,
bintang dan bulan. Kamera "bernapas" pelan (drift + zoom kecil).
Kartu rsvp, wishes, gift muncul bergantian di atas pemandangan ini (kamera hampir diam).
Setiap ucapan yang berhasil dikirim meluncurkan satu kembang api.
Kartu closing muncul paling akhir bersama puncak KEMBANG API: Points + additive glow,
pola peony / willow / ring / hati, warna emas/marun/putih, pantulan samar di air,
jeda acak. Closing punya tombol "Kembali ke awal".

=== KARTU KACA (overlay HTML/CSS di atas canvas) ===
- Latar putih 14–22%, blur 16–24px (hanya level high/medium), border putih 25%, radius
  16px, bayangan lembut. Judul serif emas, isi sans krem. Fade in/out sesuai progres.
- Kontras: kartu tampil di atas siang, senja, dan malam — beri lapisan gelap tipis di
  belakang teks, cek terbaca di ketiga kondisi.
- HP: satu kolom, lebar maks 88vw, tinggi maks 72svh (isi panjang boleh scroll di dalam
  kartu), tombol tinggi minimal 44px.

=== INTERAKSI TAMBAHAN ===
- Indikator progres tipis di kanan + label bab.
- Tombol "Lewati ke akhir" (gulir halus ke closing).
- Tombol musik on/off (V1 cukup dummy; V2 memakai sistem musik FinCards).

=== VERIFIKASI (wajib sebelum selesai) ===
Playwright: klik "Buka Undangan", lalu set progres 0, 0,1, 0,2, 0,3, 0,45, 0,6, 0,8,
0,95, 1,0 dan screenshot di desktop 1280x800 dan HP 390x844. Tambah satu rekaman
beruntun (frame tiap ~150ms) saat melewati titik Ampera dan satu landmark lain untuk
membuktikan urutan: kosong → muncul (Ampera: menara lalu dek dari dua sisi) → kartu.
Cek: console bersih, semua kartu terbaca, kamera tidak menembus bangunan, sambungan
antar-bab mulus, section enabled:false (coba matikan story dan gallery) tidak
meninggalkan celah, tidak ada Pulau Kemaro.
Catatan: Chromium headless memakai WebGL software, jadi FPS di sana TIDAK mewakili HP.
Laporkan FPS sebagai "perlu dicek di perangkat asli" dan sediakan ?fps=1 untuk itu.
Perbaiki semua temuan sebelum menyerahkan.

=== OUTPUT ===
Satu file HTML mandiri + ringkasan singkat: daftar keyframe kamera per bab, jatah
progres tiap section, dan apa saja yang diturunkan di tiap level kualitas.
```

---

## Prompt B — V2 integrasi ke `wedding-saas-full` (setelah V1 disetujui)

```markdown
Repo: wedding-saas-full (FinCards). Baca dulu CLAUDE.md lalu tutorial-multi.md
(terutama §10 Resep, §11 Template 3D ssr:false, §12 Jebakan CSS global, §14 Checklist,
§16 i18n).

Tambahkan template baru `musi` dari prototipe V1 (file HTML terlampir). Pakai
src/all-templates/taman-bunga sebagai acuan UTAMA — strukturnya paling mirip (satu
adegan terkoreografi, urutan section dikunci, kartu RSVP/ucapan/amplop). Pakai
src/all-templates/solary sebagai acuan cara memakai three.js di Next.

=== ACUAN DARI TAMAN BUNGA (buka file-file ini dulu) ===
Yang dicontoh adalah CARA template nyambung ke produk, BUKAN tampilannya.
Semua path relatif ke src/all-templates/taman-bunga/.

a) Waktu & jatah scroll — config/timeline.js
   - SEGMENTS: tiap section punya potongan jalur nominal T [from, to].
   - buildTimeline(enabledTypes, { gallerySteps }): section yang dimatikan diperas ke
     SKIPPED_WEIGHT (0,2) dari panjangnya, tidak dihapus → kamera tidak lompat.
   - BEATS: jendela teks [mulai muncul, penuh, mulai hilang, hilang] per kartu.
   - storyBeats(count) dan easelSteps(prints): jatah scroll ikut jumlah isi.
   → Buat versi Musi dengan segmen per landmark (Ampera, BKB, Masjid Agung, ...).

b) Kunci cover & scroll — Shell.jsx (sekitar baris 160 dan 194)
   - history.scrollRestoration = 'manual' + scrollTo(0, 0) saat mount.
   - Selama cover tampil, setiap scroll dipaksa kembali ke 0 (CLAUDE.md gotcha 13l).

c) Kartu RSVP / ucapan / amplop — sections/Sheets.jsx
   - RsvpSheet → POST /api/rsvp, WishesSheet → POST /api/guestbook, keduanya dengan
     kode undangan 6 digit (CODE_RE, CodeField).
   - Prop `simulated` (Shell: `simulated = !slug || preview`): demo dan pratinjau
     dashboard pura-pura sukses, kode tamu tidak terpakai.
   - WishesSheet onSent → memicu efek di scene (di sini lampion; di Musi kembang api).
   - GiftSheet: daftar accounts + tombol salin + giftAddress.

d) Bentuk data — defaultConfig.js + seed.js
   - Samakan nama props (groomFullName, groomParents, events[], mapUrl, accounts[],
     couplePhoto, ...). accounts dengan accountNumber/accountHolder otomatis dienkripsi
     src/lib/crypto/config.ts (deteksi berdasarkan bentuk data).
   - Section type 'guestbook' otomatis diisi ucapan tersimpan oleh page.tsx.
   - Foto penutup bernama couplePhoto, BUKAN photo (fillEmptyImages; gotcha 13c).
   - seed.js (buildTamanBungaSeedConfig): salin demo, isi nama/tanggal/tempat pasangan,
     KOSONGKAN data pasangan demo (orang tua, kisah, rekening, foto). Buat
     buildMusiSeedConfig yang sama dan daftarkan di src/lib/onboarding/seed-config.ts.

e) Utilitas tamu & tanggal — utils/invite.js
   - readGuestName (?to=), readPreviewMode, readThemeParam, parseEventDate /
     formatEventDate (WIB/WITA/WIT), calendarLink, safeUrl, initials.
   - Boleh disalin ke musi/utils/ (template self-contained, jangan import silang).

f) Shell & integrasi dashboard — Shell.jsx
   - Signature: Shell({ config, slug, isDemo, embed, embedSwitcher }).
   - Musik: resolveMusicSource (@/lib/music/source) + useYouTubePlayer.
   - Pratinjau editor: postMessage { source: 'fincards-preview', kind: 'theme' } untuk
     ganti palet live, kirim { kind: 'ready' } ke parent; DeviceStage +
     getDevice (@/lib/preview/devicePresets) untuk bingkai perangkat.
   - visibilitychange: musik di-pause saat tab tersembunyi, lanjut saat kembali.
     (Engine TB tidak mem-pause render secara eksplisit — rAF browser yang berhenti
     sendiri. Untuk Musi, engine three.js WAJIB pause loop-nya sendiri.)
   - Ucapan terkirim: onWishSent menambah catatan ke daftar lalu memanggil
     engineRef.current.launchLantern(nama) — pola yang sama untuk kembang api.
   - Badge "Contoh undangan" di demo.

g) Palet — config/palettes.js
   - Beberapa palet bernama + PALETTE_ORDER + DEFAULT_*_PALETTE + fungsi getter.
   - Warna malam per palet (palette.night) dikirim Shell ke engine (engine.setNight).
   → Musi: palet default marun-emas + 2–3 alternatif; daftarkan di
     palette-allowlist.ts dan appearance.ts.

h) Engine — engine/scene.js (POLANYA saja)
   - mountScene(root, opts) mengembalikan objek dengan setter + destroy().
   - readScroll() dari listener scroll pasif, satu loop requestAnimationFrame.
   - prefers-reduced-motion dibaca di dalam engine.

i) Editor — src/editor/templatePolicy.ts (tamanBungaPolicy) +
   src/editor/schemas/taman-bunga/index.ts
   - fixedSections, pinnedFirstId 'cover', pinnedLastId 'closing', semua section
     lockType + lockPosition, cover/closing juga lockDisable, swappablePool [],
     confirmDisableTypes untuk RSVP dan Gift. Label schema { id, en }.

j) Rasa penutup — gotcha 13g
   - Akhir perjalanan harus terasa PERAYAAN, bukan sepi (versi sepi pernah terbaca
     seperti suasana duka). Tetap malam, tidak ada lompatan ke pagi.

JANGAN dicontoh (khas lukisan Taman Bunga, tidak relevan untuk three.js):
mesin canvas 2.5D, ukuran-ukuran di config/art.js, assets.js/gambar .webp, nightOf/
warmOf/bareOf, parchment, easel galeri, gazebo, LineFrame/ornaments.js, atribut
data-tb-*. Untuk scene 3D-nya, acuan adalah solary (three/galacticScene.js, Shell
yang di-dynamic import dengan ssr:false).

1. Folder src/all-templates/musi/: Shell.jsx, registry.js, defaultConfig.js,
   config/{timeline,palettes}.js, engine/ (scene three.js), sections/, styles/.
   - defaultConfig.js = CONFIG dari V1, plain data saja (tidak import three/komponen).
   - Semua file client diawali 'use client'; file .tsx/.jsx baru import React eksplisit.
   - Boot scene di useEffect, bersihkan saat unmount. Pakai paket npm `three` milik repo.
   - Jatah scroll per section di config/timeline.js; section yang dimatikan memeras
     jatahnya (lihat buildTimeline Taman Bunga).
   - Cover: selama tampil, scroll dipaksa ke 0 (sama seperti Taman Bunga).
2. Data nyata, bukan simulasi:
   - RSVP → POST /api/rsvp, ucapan → POST /api/guestbook, dengan kode tamu (lihat
     taman-bunga/sections/Sheets.jsx). Di preview/demo, pakai mode simulasi yang sama.
   - Ucapan tersimpan disuntik server ke section `guestbook` (initialNotes) — sudah
     otomatis lewat page.tsx selama type-nya `guestbook`.
   - Rekening di musiGift memakai bentuk accounts yang sama, jadi otomatis terenkripsi.
   - Nama tamu: readGuestName (?to=) seperti Taman Bunga.
   - Musik: resolveMusicSource + useYouTubePlayer seperti Shell Taman Bunga.
   - Pratinjau editor: DeviceStage / embed seperti Taman Bunga.
3. Daftarkan di semua titik sambung (checklist §14 tutorial-multi.md), termasuk:
   templateIndex.js (label 'Musi'), templateCatalog.js (label 'Musi', tagline
   "Dari Rumah Limas, menyusuri Musi, sampai kembang api di langit Palembang." +
   versi EN), InvitationView.tsx (dynamic, ssr:false),
   src/middleware.ts (kedua matcher + test-nya), src/editor/schemas/musi/ +
   index.ts, templatePolicy.ts (urutan dikunci seperti tamanBungaPolicy; cover dan
   closing tidak bisa dimatikan; confirmDisableTypes: ['musiRsvp', 'musiGift']),
   src/lib/templates/appearance.ts (ornamen []), palette-allowlist.ts, vibeData.ts +
   VibeBackdrop.tsx, dictionaries landing.ts & templates.ts, seedConfigForTemplate,
   tutorial dashboard, scripts/create-invitation.mjs.
4. Label schema editor ditulis { id, en }; dict-parity harus hijau.
5. Migrasi baru supabase/migrations/<tanggal>_musi_template.sql: baris `templates`
   + `template_plans` (basic & premium). Harga diisi dari /admin, jangan di-hardcode di
   komponen. Migrasi ini hanya INSERT ke tabel yang sudah ada — tidak perlu GRANT baru.
   (Migrasi dijalankan manual oleh owner; commit tidak menyentuh produksi.)
6. CSS di-scope ke body.musi-route; token radius/tinggi kontrol ikut tokens.css;
   jalankan npm run check:tokens.
7. Verifikasi: npm run typecheck, npm run test, npm run check:tokens, npm run build;
   buka /musi/demo-musi di 390px / 768px / 1280px, console bersih, ulangi
   screenshot progres seperti V1. Coba juga dari dashboard: matikan story/gallery,
   ganti palet, simpan, pratinjau.

Batasan: jangan ubah template lain, auth, payment, atau API. Tidak ada file gambar baru
di public/ (semua prosedural), jadi tidak perlu upload R2 — kalau ternyata ada,
unggah ke R2 DULU sebelum deploy (CLAUDE.md gotcha 11).
```

---

## Status implementasi

Sudah dibangun langsung di repo (tanpa tahap V1 HTML terpisah, atas permintaan owner):
`src/all-templates/musi/` — engine three.js di `engine/`, timeline + titik pop-up di
`config/timeline.js` (`RIVER_STOPS`, `LANDMARKS`, `APPEAR`, `BEATS`). Prompt A dan B di
atas tetap jadi spesifikasi acuannya.

## Cara memakai

1. Tempel **Prompt A** ke sesi baru. Lampirkan diorama Palembang V1 yang sudah jadi
   sebagai referensi gaya dan kode landmark (Ampera, BKB, Masjid Agung, Limas, rumah
   rakit, LRT bisa dipakai ulang — kecuali Pulau Kemaro).
2. Cek hasilnya di HP asli (buka dengan `?fps=1`), bukan cuma screenshot.
3. Setelah V1 oke, tempel **Prompt B** di sesi yang memegang repo `wedding-saas-full`,
   lampirkan file HTML V1.
