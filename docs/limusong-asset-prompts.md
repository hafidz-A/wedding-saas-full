# Limusong (Songket · Limas · Musi) — Prompt Aset

> Template adat Palembang / Sumatera Selatan yang mengikuti alur kampanye Moooi
> "A Life Extraordinary" (dicek dari rekaman layar, bukan ditebak). Prototipe:
> `docs/prototypes/songket-limas-musi.html`.

## Konsep (dari rekaman Moooi)

- **Pembuka:** latar gelap, beberapa objek cut-out di pojok kanan atas dan kiri bawah, judul di
  tengah, tombol "Enter". Saat ditekan, judulnya membesar menembus layar.
- **Bab-bab berurutan, satu gulir = satu langkah.** Tiap bab:
  1. **Gerbang motif**: satu motif kain/ornamen memenuhi layar dengan judul bab di tengahnya.
     Cara masuk dan keluarnya beda-beda tiap bab:
     - menutup dari tepi dengan lubang organik di tengah (Moooi "Double Bubble")
     - pintu geser kiri-kanan (Moooi "Monster Garden")
     - lingkaran membesar/mengecil
     - tumbuh dari tepi lalu mengecil menjadi panel di ruangan (Moooi "Tokyo Blue")
     - masuk lewat lubang lalu "terbang" menembusnya
  2. **Ruang**: panggung gelap tanpa dinding. Objek cut-out berdiri di bawah sorot lampu, lampu
     menyala satu per satu, dan motif yang sama muncul lagi sebagai panel/material di ruangan
     itu.
- Pembagian bab di prototipe:

  | Bab | Motif | Cara buka |
  |---|---|---|
  | Mempelai | songket lepus | lubang organik |
  | Acara | ukiran Palembang | pintu geser |
  | Galeri | jumputan | lingkaran |
  | Konfirmasi | bunga tabur | mengecil jadi panel |
  | Penutup | riak Sungai Musi | lubang, lalu terbang menembus |

Jadi asetnya ada **dua jenis**:
- **A. Motif seamless** (tile yang bisa diulang tanpa sambungan terlihat): 5 buah.
- **B. Objek cut-out** untuk pembuka dan ruang-ruang.

## Cara pakai

1. Satu prompt = blok gaya (**[STYLE-A]** untuk motif, **[STYLE-B]** untuk objek) + **[BG]**
   (khusus objek) + isi per aset + **[NEG]**. Tempel apa adanya dalam bahasa Inggris.
2. Generate **A1 (songket)** dan **B1 (Rumah Limas)** dulu. Kalau sudah cocok, lampirkan
   keduanya sebagai referensi di prompt berikutnya, lalu tambahkan kalimat:
   `Match the exact style, colours and level of detail of the attached images.`
3. Kirim hasilnya ke chat ini, cukup sebut nomornya (mis. "A3 jumputan"). Saya yang
   merapikan sambungan tile, memotong latar objek, mengecilkan ke `.webp`, lalu memasangnya.

### ChatGPT atau Gemini?

| | ChatGPT | Gemini |
|---|---|---|
| Latar transparan (objek B) | **Bisa langsung** | Tidak bisa. Kalau diminta "transparent", sering menggambar **papan catur palsu**, jadi pakai latar hijau polos. |
| Tile seamless (motif A) | Sering ada sambungan tipis | Sering ada sambungan tipis |
| Konsistensi gaya dengan referensi | Cukup baik | **Sangat baik** |

Untuk motif, sambungan tile yang kurang rapi tidak masalah; itu saya perbaiki.

---

## Blok yang dipakai ulang

**[STYLE-A] — motif**
> A flat, seamless, edge-to-edge repeating textile pattern tile, viewed straight on, filling
> the whole square canvas. Refined and elegant, evenly spaced, no focal point, no perspective,
> no lighting, no fabric folds. Fine gold-thread look where gold is used (soft antique gold
> #C9A25E to #E3CC9A, never bright yellow).

**[STYLE-B] — objek**
> A single isolated object for a premium Palembang (South Sumatra) wedding invitation,
> photographed like a luxury product on a dark stage: lit by one warm spotlight from above,
> soft rich shadows on the object itself, refined realistic-illustrative finish. Colours:
> deep maroon (#6B1626), antique gold, warm ivory, a little deep green. The object is
> complete and centred, not cropped, with generous empty margin on every side.

**[BG] — ChatGPT:** `Transparent background (PNG with alpha). No floor, no cast shadow on the ground.`

**[BG] — Gemini:** `Place the object on a perfectly flat, uniform pure chroma-green background (#00FF00), no gradient, no shadow on the ground. Do not draw a checkerboard pattern.`
*(Untuk objek yang ada warna hijaunya — B2 tepak sirih, B6 teratai — ganti dengan magenta `#FF00FF`.)*

**[NEG]**
> Avoid: text, letters, logo, watermark, border or frame, people, faces, hands, neon or
> saturated colours, bright yellow gold, glossy plastic 3D render, blur, low resolution,
> JPEG artifacts, cropped edges.

---

## A · Motif seamless (rasio 1:1, resolusi terbesar)

**A1 · Songket lepus** — gerbang & panel bab Mempelai
> Palembang songket lepus: deep maroon silk ground almost entirely covered with gold-thread
> weaving: small diamond-shaped flower motifs (bunga) in an even grid, linked by fine gold
> lines, tiny gold dots between them.

**A2 · Ukiran Palembang** — pintu geser & panel bab Acara
> Traditional Palembang lacquered wood carving (ukiran) as a flat pattern: flowing gold
> floral vines, curling tendrils and lotus buds on deep maroon-black lacquer, carved relief
> suggested only by subtle gold shading.

**A3 · Jumputan** — gerbang bab Galeri
> Palembang jumputan tie-dye cloth: a deep plum-maroon ground with small ivory dots arranged
> in rings and diamond clusters, soft slightly irregular dye edges, a few gold-cream accents.

**A4 · Bunga tabur** — gerbang & panel bab Konfirmasi (mengecil jadi panel)
> A scattered floral pattern of jasmine (melati), lotus and cempaka blossoms in ivory, dusty
> rose and soft gold with slender leaves, on a deep green-black ground. Painterly, elegant,
> generous spacing between flowers.

**A5 · Riak Sungai Musi** — gerbang bab Penutup
> Overlapping scallops of concentric arcs like stylised river ripples, in ivory-gold lines on
> a near-black ground, rows offset by half a scallop, precise and calm.

## B · Objek cut-out

**B1 · Rumah Limas** (3:2) — ruang Acara
> A traditional Palembang Rumah Limas stilt house, seen from the front at a slight angle:
> tiered floors (kekijing), steep pyramidal limasan roof with small curved simbar ornaments on
> the ridge, carved maroon-and-gold wooden walls, slender pillars, a central staircase.

**B2 · Tepak sirih** (4:3) — ruang Konfirmasi · *Gemini: latar magenta*
> A Palembang tepak sirih ceremonial betel box: lacquered deep maroon wood with fine gold
> carved ornaments, a gold lid edge, a few fresh green betel leaves on top.

**B3 · Perahu kajang** (2:1) — ruang Penutup
> A traditional Musi river boat (perahu kajang) seen from the side: slim curved dark-maroon
> wooden hull with a thin gold line and an arched woven-bamboo roof (kajang) in the middle.
> No people, no water.

**B4 · Lampu gantung** (1:2, tegak) — ruang Mempelai & Konfirmasi
> A slim hanging pendant lamp inspired by Palembang brass craft: a small pierced brass shade
> with fine floral cut-outs, glowing warm from inside, hanging on a thin dark cord from the top
> edge of the image.

**B5 · Kain songket melambai** (3:2) — pembuka, pojok kanan atas
> A long strip of maroon-and-gold Palembang songket cloth floating in the air in a soft
> S-shaped wave, a short gold fringe (tretes) at one end.

**B6 · Teratai** (4:3) — pembuka, pojok kiri bawah · *Gemini: latar magenta*
> A lotus flower in dusty rose and ivory on one deep-green lily pad, seen at a slight angle.

**B7 · Kipas** (4:3) — pembuka
> A traditional Palembang hand fan, half open, lacquered ribs, maroon fan face with fine gold
> motifs and a thin gold edge.

**B8 · Tanjak** (3:2) — pembuka
> A Palembang tanjak (men's folded songket headcloth), maroon with gold thread, crisply
> folded into its peaked shape, shown alone as an object. No head, no person.

**B9 · Melati** (1:1) — pembuka
> A single fresh jasmine flower with one closed bud on a short stem, ivory petals, tiny pale
> gold centre.

---

## Belum diputuskan

- **Mempelai di ruang bab Mempelai.** Di prototipe ini cut-out pengantin ber-Aesan Gede.
  Di template asli fotonya dari pengantin, dan foto upload biasa tidak bisa otomatis jadi
  cut-out yang rapi. Pilihannya: foto ditaruh di dalam panel lengkung (aman untuk semua
  foto), atau pengantin diminta foto dengan latar polos.

## Catatan teknis (saat memasang)

- Tile motif: 1024px → dirapikan sambungannya → `.webp` ~512–768px. Objek: lebar maks. 1200px
  (melati 400px), `.webp` kualitas ~82, tepi dibersihkan dari sisa hijau/magenta.
- Semua file baru di `public/templates/...` harus **di-upload ke R2 sebelum deploy** yang
  memakainya (CLAUDE.md gotcha 11). Ganti gambar = ganti nama file.
