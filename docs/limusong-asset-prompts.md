# Limusong (Songket · Limas · Musi) — Prompt Aset

> Template adat Palembang / Sumatera Selatan, gaya **clean minimalist yang luwes**: latar
> gading polos, objek cut-out melayang, bingkai bulat/lengkung, motif songket sebagai garis
> emas tipis. Prototipe tata letak & gerak: `docs/prototypes/songket-limas-musi.html`.
>
> Dokumen ini hanya untuk objek **cut-out** yang di-generate. Garis songket (pucuk rebung),
> bingkai Rumah Limas versi garis, sungai, dan bulan digambar dengan kode — tidak perlu aset.
> Foto mempelai datang dari pengantin, jadi **tidak** di-generate.

## Cara pakai

1. Satu prompt = **[STYLE]** + **[BG]** (sesuai tool) + isi per aset + **[NEG]**. Tempel semua
   blok apa adanya, dalam bahasa Inggris (hasil gambarnya biasanya lebih konsisten).
2. **Mulai dari aset #1 (kain songket).** Kalau sudah cocok, lampirkan gambar itu sebagai
   referensi di setiap prompt berikutnya, lalu tambahkan kalimat:
   `Match the exact illustration style, colours and level of detail of the attached image.`
   Cara ini yang menjaga semua aset terlihat satu keluarga.
3. Minta 2–4 variasi, pilih satu. Ukuran: ambil resolusi paling besar yang ditawarkan.
4. Kirim hasilnya ke chat ini (attach). Saya yang memotong latarnya, merapikan tepi, mengecilkan
   ke `.webp`, dan memasangnya. Nama file tidak penting, cukup sebut nomornya (mis. "#5 kipas").

### ChatGPT atau Gemini?

| | ChatGPT | Gemini |
|---|---|---|
| Latar transparan | **Bisa langsung** (PNG transparan) | Tidak bisa. Kalau diminta "transparent", sering menggambar **papan catur palsu**. Pakai latar hijau polos. |
| Konsistensi gaya pakai gambar referensi | Cukup baik | **Sangat baik** |
| Saran | Paling praktis untuk objek satuan | Bagus kalau mau gaya antar-aset benar-benar seragam |

Keduanya bisa dipakai, bahkan dicampur, asalkan aset #1 dijadikan referensi gaya.

---

## Blok yang dipakai ulang

**[STYLE]**
> A single isolated object illustration for a premium South Sumatran (Palembang) wedding
> invitation. Clean, modern, minimalist gouache-and-ink style: soft even studio light from the
> upper left, gentle volumetric shading, fine refined detail but never busy. Palette strictly
> limited to deep maroon (#6B1626), soft antique gold (#B48A45 to #DCC394 — never bright
> yellow), warm ivory (#F5EEE6) and a small touch of deep green (#2E4A3F). The object is
> complete and centred, not cropped, with generous empty margin on every side.

**[BG] — ChatGPT**
> Transparent background (PNG with alpha). No floor, no cast shadow, no reflection.

**[BG] — Gemini**
> Place the object on a perfectly flat, uniform pure chroma-green background (#00FF00) with
> no gradient, texture, vignette or shadow. Do not draw a checkerboard pattern.

*(Untuk aset yang ada warna hijaunya — #4 teratai dan #8 tepak sirih — ganti hijau dengan
magenta polos `#FF00FF`.)*

**[NEG]**
> Avoid: photorealistic 3D render, glossy plastic look, neon or saturated colours, bright
> yellow gold, busy background, extra objects, people, faces, hands, text, letters, logo,
> watermark, border or frame, drop shadow on the ground, cropped edges, blur, low resolution,
> JPEG artifacts.

---

## Daftar aset

Urutan = urutan prioritas. #1–#6 sudah cukup untuk versi pertama template.

### 1 · Kain songket melambai — `songket-ribbon-a`
Rasio **3:2 (landscape)** · dipakai di cover, di belakang foto bulat
> A long narrow strip of Palembang songket cloth floating in the air and curving gently in a
> soft S-shaped wave, as if lifted by a breeze. Deep maroon silk densely woven with fine
> gold-thread motifs: small lozenge flowers across the body (songket lepus style) and a border
> of small pucuk rebung (bamboo-shoot triangle) motifs along both long edges. A short gold
> fringe (tretes) at one end. Light, airy, elegant drape, the fabric slightly turning to show
> its sheen.

### 2 · Kain songket melingkar — `songket-ribbon-b`
Rasio **1:1** · dipakai di bagian RSVP / penutup
> The same Palembang songket cloth as a loose, open loop that curls once around itself like a
> ribbon in the wind, both ends free, one end with a short gold fringe. Deep maroon with fine
> gold-thread lozenge motifs and a pucuk rebung border.

### 3 · Melati — `melati`
Rasio **1:1** · bunga kecil yang melayang di banyak section
> A single fresh jasmine (melati) flower seen from the front, five to eight soft ivory-white
> petals with a faint warm cream tint, a tiny pale gold centre, plus one closed bud on a short
> stem beside it. Delicate and minimal.

Variasi opsional `melati-ronce`: *a short string of jasmine buds threaded together (ronce
melati, as worn by Palembang brides), hanging in a soft curve.*

### 4 · Teratai — `teratai`
Rasio **4:3** · bagian salam / ayat · **pakai latar magenta untuk Gemini**
> A single lotus flower in soft dusty rose and ivory, petals gently opening, resting on one
> flat round deep-green lily pad seen at a slight angle. Calm and minimal.

### 5 · Kipas — `kipas`
Rasio **4:3** · cover
> A traditional Palembang hand fan, half-open, made of lacquered wooden ribs, the fan face in
> deep maroon with fine gold songket-style motifs and a thin gold edge, a small gold tassel
> hanging from the pivot. Shown at a slight three-quarter angle.

### 6 · Tanjak — `tanjak`
Rasio **3:2** · cover
> A Palembang tanjak (traditional men's folded headcloth) made of maroon songket with gold
> thread motifs, crisply folded into its characteristic peaked shape, shown on its own as an
> object at a three-quarter front view. Empty: no head, no person, no mannequin.

### 7 · Tepak sirih — `tepak-sirih`
Rasio **4:3** · bagian RSVP · **pakai latar magenta untuk Gemini**
> A Palembang tepak sirih (betel-leaf ceremonial box): a small lacquered wooden box in deep
> maroon with fine gold carved floral ornaments and a gold lid edge, a few fresh green betel
> leaves resting on top. Three-quarter front view.

### 8 · Siluet Rumah Limas — `limas-front`
Rasio **16:9** · bingkai acara (di belakang garis emas yang digambar kode)
> The front elevation of a traditional Palembang Rumah Limas stilt house: tiered floors
> (kekijing) stepping up toward the centre, a tall steep pyramidal limasan roof with small
> curved simbar horn ornaments along the ridge, slender wooden pillars, a central staircase.
> Perfectly frontal, symmetrical, flat orthographic view. Rendered very softly in pale ivory
> and antique-gold tones with only light maroon accents, so it can sit quietly behind text.

### 9 · Perahu kajang — `perahu-kajang`
Rasio **2:1** · bagian rangkaian adat & penutup (Sungai Musi)
> A traditional Musi river boat (perahu kajang) seen from the side: a slim curved maroon hull
> with a thin gold line along it and an arched woven-bamboo roof (kajang) in warm natural gold
> in the middle. No people, no water, no oars.

### 10 · Mahkota Aesan Gede (opsional) — `karsuhun`
Rasio **1:1** · aksen untuk bagian mempelai
> The golden bridal crown (karsuhun) of the Palembang Aesan Gede wedding attire, standing on
> its own as an object: tall layered gold filigree with small gold flower picks (kembang
> goyang) rising from it. Seen from the front, softly lit, refined. No person, no head, no
> mannequin.

*(Bentuk mahkota adat sering digambar AI kurang tepat. Cek dulu dengan foto asli Aesan Gede
sebelum dipakai.)*

### 11 · Siluet Jembatan Ampera (opsional) — `ampera`
Rasio **3:1** · cakrawala jauh di penutup
> A minimal, soft silhouette of Palembang's Ampera Bridge seen from the side across the river:
> the two tall towers and the long span, flat colour in muted maroon with a faint gold
> highlight, no river, no sky, no buildings.

---

## Catatan teknis (saat memasang)

- Target: lebar maks. 1200px (objek kecil seperti melati 400px), `.webp` kualitas ~82, tepi
  dibersihkan dari sisa warna hijau/magenta.
- Semua file baru di `public/templates/...` harus **di-upload ke R2 sebelum deploy** yang
  memakainya (CLAUDE.md gotcha 11). Ganti gambar = ganti nama file.
