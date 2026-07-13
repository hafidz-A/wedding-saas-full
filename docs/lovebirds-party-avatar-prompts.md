# Bridal-Party Avatar Prompts — watercolor-ink illustration

Prompt produksi untuk 6 avatar **bridal party** (3 bridesmaids + 3 groomsmen)
dengan gaya **ilustrasi cat air + tinta** yang SAMA dengan set pasangan
Rani & Adi (lihat `docs/lovebirds-character-system.md` untuk format & karakter
pasangan). Dipakai bersama oleh Lovebirds (`weddingParty`) dan Solary
(`teamPlanet`) lewat registry key yang sama.

> **Status sekarang:** 6 avatar ini masih fallback ke Unsplash (foto). Begitu
> ke-6 ilustrasi ini di-generate, simpan lokal dan wiring-nya menyusul (lihat
> bagian **Wiring** di bawah) — supaya satu deret dengan avatar gaya ilustrasi.

---

## Cara pakai (baca dulu)

1. **Satu blok = satu avatar.** Copy satu blok `text`, generate.
2. **Kunci gaya pakai reference image.** Pakai **Gemini 2.5 Flash Image (Nano
   Banana)**: upload salah satu ilustrasi pasangan sebagai **style reference**
   (mis. `public/templates/lovebirds/demo/bridePortrait.jpg` +
   `coupleClassic.jpg`) dan tulis *"match this hand-painted watercolor-and-ink
   illustration style exactly, but a different person"*. Teks saja akan drift.
3. **Ini ORANG BERBEDA dari Rani & Adi** — tiru **gaya lukisannya**, bukan
   wajah pasangannya.
4. **Rasio 1:1 (kotak).** Avatar dirender dalam lingkaran kecil → wajah di tengah
   dengan sedikit ruang di atas kepala (head-and-shoulders).
5. **Negative** sudah ditulis sebagai `Avoid: …`. Di AI Studio/Imagen, pindahkan
   ke field `negativePrompt`.
6. **Variasi sengaja** biar tidak seragam: Putri berhijab, Aldi berkacamata,
   jenggot/rambut groomsmen dibedakan — tapi semua tetap Indonesia, earth-tone,
   senada dengan palet pasangan.

---

## Palet & medium (acuan tunggal — tertanam di tiap blok)

- **Medium:** cat air + tinta, garis tinta gelap rapi + sapuan watercolor lembut,
  shading painterly halus (bukan flat), pencahayaan terang & airy.
- **Latar:** kertas watercolor putih-gading bertepi *deckle* halus + sapuan
  abstrak lembut (hint dedaunan hijau sage) di belakang subjek.
- **Kulit:** sawo matang hangat (golden undertone), khas Indonesia.
- **Warna busana:** coral lembut / terracotta / sage-olive / krem, aksen emas.

**Style block** (sama persis di tiap prompt):

```text
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching
the reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender,
elegant storybook wedding-illustration look.
```

**Avoid block** (sama persis di tiap prompt):

```text
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, copying the reference couple's exact faces.
```

---

## 👰 Bridesmaids

### 1. `partyMaidOfHonor` — Maya (Maid of Honor)
- **AR:** 1:1 · **Framing:** head-and-shoulders, menghadap kamera, senyum hangat terbuka.

```text
A single head-and-shoulders portrait illustration of one young woman, centered and
facing the viewer with a warm, open, genuine smile, framed for a small round avatar
with a little headroom above the hair.
Subject: "Maya", an Indonesian woman in her late 20s, warm tan (sawo matang) skin
with a golden undertone, long straight black hair with subtle warm-brown tones
parted softly to one side and falling over one shoulder, a soft round face with
bright dark almond eyes and natural full eyebrows, small gold stud earrings, wearing
a dusty-coral / terracotta dress with thin straps and a delicate thin gold necklace;
warm, lively and friendly.
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching the
reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender, elegant
storybook wedding-illustration look.
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, copying the reference couple's exact faces.
```

### 2. `partyBridesmaid2` — Sasha (Bridesmaid)
- **AR:** 1:1 · **Framing:** head-and-shoulders, senyum tertutup lembut, tenang.

```text
A single head-and-shoulders portrait illustration of one young woman, centered and
facing the viewer with a gentle, warm closed-lip smile, framed for a small round
avatar with a little headroom.
Subject: "Sasha", an Indonesian woman in her mid 20s, warm tan skin, shoulder-length
dark-brown wavy hair with soft layers and a subtle lighter balayage, an oval face
with calm dark eyes, soft natural brows and a small beauty mark, a single thin gold
hoop earring, wearing a sage-green / soft-olive dress with a softly draped neckline;
calm, elegant and serene.
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching the
reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender, elegant
storybook wedding-illustration look.
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, copying the reference couple's exact faces.
```

### 3. `partyBridesmaid3` — Putri (Bridesmaid, berhijab)
- **AR:** 1:1 · **Framing:** head-and-shoulders, senyum manis hangat.

```text
A single head-and-shoulders portrait illustration of one young woman wearing a soft
modern hijab, centered and facing the viewer with a sweet, warm smile, framed for a
small round avatar with a little headroom.
Subject: "Putri", an Indonesian woman in her late 20s, warm tan skin, wearing a soft
modern hijab in warm cream/blush draped neatly around a soft round face with kind
dark eyes and gentle natural brows, wearing a muted terracotta / dusty-rose modest
outfit with a small subtle gold brooch; modest, sweet and warm.
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching the
reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender, elegant
storybook wedding-illustration look.
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, copying the reference couple's exact faces.
```

---

## 🤵 Groomsmen

### 4. `partyBestMan` — Rio (Best Man)
- **AR:** 1:1 · **Framing:** head-and-shoulders, senyum percaya diri hangat.

```text
A single head-and-shoulders portrait illustration of one young man, centered and
facing the viewer with a warm, confident smile, framed for a small round avatar with
a little headroom.
Subject: "Rio", an Indonesian man around 30, warm tan-olive skin, neat short black
hair, a well-groomed light short beard with a little stubble, a soft square friendly
face with dark eyes and thick eyebrows, wearing a sand / beige linen suit jacket over
an open-collar cream shirt; confident, warm and easygoing.
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching the
reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender, elegant
storybook wedding-illustration look.
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, copying the reference couple's exact faces.
```

### 5. `partyGroomsman2` — Aldi (Groomsman, berkacamata)
- **AR:** 1:1 · **Framing:** head-and-shoulders, senyum ramah santai.

```text
A single head-and-shoulders portrait illustration of one young man wearing glasses,
centered and facing the viewer with a friendly, easy grin, framed for a small round
avatar with a little headroom.
Subject: "Aldi", an Indonesian man in his late 20s, warm tan skin, short slightly
wavy black hair, clean-shaven with a hint of light stubble, a slim face with kind
dark eyes, wearing thin rounded tortoiseshell glasses and an olive-green button shirt;
friendly, smart and approachable.
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching the
reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender, elegant
storybook wedding-illustration look.
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, glasses with distorted lenses, copying the reference
couple's exact faces.
```

### 6. `partyGroomsman3` — Bima (Groomsman)
- **AR:** 1:1 · **Framing:** head-and-shoulders, senyum lebar hangat.

```text
A single head-and-shoulders portrait illustration of one young man, centered and
facing the viewer with a hearty, broad warm smile, framed for a small round avatar
with a little headroom.
Subject: "Bima", an Indonesian man around 31, slightly deeper warm tan skin, short
cropped black hair, a full neatly-trimmed short beard, a rounder strong face with
warm dark eyes and thick brows, wearing a rust / terracotta button shirt with the
collar slightly open; jovial, warm and hearty.
Style: a hand-painted watercolor-and-ink portrait illustration, exactly matching the
reference couple images — confident clean dark-ink linework with soft, loosely
brushed watercolor washes and gentle painterly shading (not flat), warm bright airy
lighting, naturalistic warm-tan (sawo matang) Indonesian skin, set on a warm
off-white watercolor-paper background with a subtle deckled paper edge and a loose
abstract wash behind the subject (a soft hint of sage-green foliage). Tender, elegant
storybook wedding-illustration look.
Avoid: photoreal photograph, 3D render, CGI, anime, manga, chibi, cel-shaded or
thick-outline cartoon, flat vector clip-art, oversaturated neon colors, harsh
shadows, plastic or waxy skin, heavy glam makeup, deformed face, crossed or
misaligned eyes, extra fingers, bad anatomy, text, watermark, logo, busy cluttered
background, dark moody tones, copying the reference couple's exact faces.
```

---

## Wiring (setelah ke-6 ilustrasi jadi)

1. Simpan tiap output ke `public/templates/lovebirds/demo/<key>.jpg`:

| Registry key | Nama | Peran | File output |
|---|---|---|---|
| `partyMaidOfHonor` | Maya | Maid of Honor | `partyMaidOfHonor.jpg` |
| `partyBridesmaid2` | Sasha | Bridesmaid | `partyBridesmaid2.jpg` |
| `partyBridesmaid3` | Putri | Bridesmaid | `partyBridesmaid3.jpg` |
| `partyBestMan` | Rio | Best Man | `partyBestMan.jpg` |
| `partyGroomsman2` | Aldi | Groomsman | `partyGroomsman2.jpg` |
| `partyGroomsman3` | Bima | Groomsman | `partyGroomsman3.jpg` |

2. Tambah ke-6 key ke `LOVEBIRDS_PHOTOS`
   (`src/all-templates/lovebirds/demoImages.js`) **dan** `SOLARY_LOCAL`
   (`src/all-templates/solary/demoImages.js`). Setelah itu avatar di kedua
   template otomatis pindah dari Unsplash ke ilustrasi lokal.
3. Pindahkan ke-6 key dari daftar `FALLBACK_KEYS` ke validasi lokal di
   `scripts/check-solary-images.mjs`, lalu jalankan
   `node scripts/check-lovebirds-images.mjs` dan
   `node scripts/check-solary-images.mjs`.

## Checklist konsistensi

- [ ] Medium watercolor-ink + latar kertas ivory deckle + wash sage-green — sama dgn set pasangan
- [ ] Kulit sawo matang Indonesia; busana earth-tone (coral/terracotta/sage/olive) + aksen emas
- [ ] Head-and-shoulders, di tengah, senyum hangat, kotak 1:1
- [ ] 6 orang berbeda; BUKAN wajah Rani/Adi
- [ ] Variasi terjaga: hijab (Putri), kacamata (Aldi), variasi jenggot/rambut groomsmen
