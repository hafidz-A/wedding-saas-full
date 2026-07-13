# Lovebirds — Character System & Image-Generation Prompts

Sistem karakter + prompt produksi untuk mengganti seluruh foto placeholder (Unsplash) di
template **Lovebirds** dengan foto pasangan AI yang identitasnya konsisten dari awal sampai
akhir website.

- **Audit sumber:** `src/all-templates/lovebirds/defaultConfig.js` + `src/lib/demoImages.js`
- **Pasangan:** Rani (bride) & Adi (groom) — pasangan Indonesia modern
- **Arah visual terkunci:** Indonesia modern ~28–30 th · busana earth-tone · grade **bright & airy**, tapi **natural candid** (bukan editorial glossy)
- **Total:** 34 penempatan foto = **21 foto unik** yang perlu di-generate (sisanya reuse)

> **Versi humanized:** prompt sengaja menghindari kata pemicu tampilan-AI (*premium, editorial,
> cinematic, radiant, elegant, dreamy, flawless, high-key*) dan menambah tekstur manusia (pori,
> rambut lepas, asimetri natural) + karakter kamera asli, supaya hasilnya terasa difoto orang,
> bukan dirender.

---

## CARA PAKAI (baca dulu)

1. **Generate satu foto per satu prompt.** Setiap section "Prompt" di bawah adalah satu blok
   `text` yang sudah lengkap (identitas + scene + style + negative) — tinggal copy 1 blok,
   paste, generate. Tidak perlu menyambung-nyambung manual.
2. **Mulai dari 2 potret dulu:** generate `bridePortrait` (#2) dan `groomPortrait` (#3),
   pilih wajah yang paling pas dan paling natural.
3. **Kunci wajah pakai reference image.** Untuk konsistensi nyata, gunakan **Gemini 2.5 Flash
   Image (Nano Banana)**: di setiap scene berikutnya **upload kedua potret itu sebagai
   referensi** dan tulis "use the exact same couple as the reference images". Teks prompt saja
   pasti drift (wajah berubah-ubah).
4. **Negative prompt:**
   - Di **Gemini app** (gemini.google.com): negative sudah saya tulis sebagai kalimat `Avoid: …`
     di dalam blok — biarkan saja, model membacanya.
   - Di **Google AI Studio / Imagen API**: pindahkan teks setelah `Avoid:` ke field
     `negativePrompt`, dan set `aspectRatio` + `seed` lewat parameter (lebih presisi).
5. **Biar makin manusiawi:** kalau hasil masih kerasa AI, tambahkan di akhir prompt:
   *"slightly imperfect candid snapshot, real photo"*, dan JANGAN tambahkan kata seperti
   *stunning / perfect / flawless / cinematic* — itu menarik balik ke tampilan AI.
6. **Camera / Lens / Lighting / Pose** sudah dijahit ke teks prompt; baris metadata di atas tiap
   blok adalah ringkasan + acuan kalau mau memperketat manual.
7. **Foto reuse cukup di-generate 1×**, lalu crop ke rasio target (lihat Peta Reuse di bawah).

---

## 1. CHARACTER BIBLE

### 👰 WANITA — Rani (Bride)

| Atribut | Spesifikasi (DIKUNCI — jangan diubah) |
|---|---|
| Umur | 28 tahun |
| Bentuk wajah | Oval-hati lembut, rahang halus, dagu sedikit meruncing, pipi penuh halus |
| Warna kulit | Sawo matang hangat / warm tan, undertone golden, merata |
| Rambut | Hitam-kecokelatan gelap, panjang melewati bahu, bergelombang lembut (soft waves) |
| Tinggi badan | 165 cm |
| Bentuk tubuh | Ramping-proporsional, bahu sempit, postur anggun |
| Ciri khas | Mata almond cokelat gelap; alis natural tebal-lembut; tahi lalat kecil di pipi kiri bawah; lesung pipi tipis |
| Gaya berpakaian | Earth-tone elegan — krem, coral lembut, emerald; kain flowy, kebaya modern/dress; perhiasan emas minimalis |

### 🤵 PRIA — Adi (Groom)

| Atribut | Spesifikasi (DIKUNCI — jangan diubah) |
|---|---|
| Umur | 30 tahun |
| Bentuk wajah | Persegi lembut, rahang tegas, dagu kokoh |
| Warna kulit | Sawo matang hangat, sedikit lebih gelap/olive dari Rani, undertone golden-olive |
| Rambut | Hitam, pendek rapi; jenggot tipis terawat (light short beard) |
| Tinggi badan | 178 cm (≈13 cm lebih tinggi dari Rani — selisih wajib konsisten) |
| Bentuk tubuh | Atletis-ramping, bahu lebar proporsional, tegap |
| Ciri khas | Alis tebal; mata cokelat gelap; tahi lalat kecil dekat alis kanan; senyum tenang |
| Gaya berpakaian | Earth-tone — blazer krem/emerald gelap, kemeja linen, beskap modern (formal); jam tangan tali kulit cokelat |

---

## 2. MASTER IDENTITY + STYLE + NEGATIVE (referensi)

Blok-blok ini sudah **otomatis tertanam** di setiap prompt scene di bagian 3. Disimpan di sini
sebagai rujukan tunggal kalau ingin diedit (edit di sini → sinkronkan ke semua scene).

**Identitas pasangan (humanized):**

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw and slightly pointed chin, dark almond-brown eyes, full soft eyebrows, a small
beauty mark on her lower-left cheek, dark brown-black wavy hair past the shoulders, slim build,
165 cm. GROOM "Adi": Indonesian man, 30, warm tan olive skin with the same realistic texture,
soft square face with defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a
well-groomed light short beard, a small mole near his right eyebrow, athletic build, 178 cm (about
13 cm taller than Rani). Keep their faces, skin tones, hair and relative heights identical in
every photo — one real couple, natural Indonesian features, real human skin, no plastic/CGI look.
```

**Style (humanized):**

```text
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 35-50mm prime lens — natural available light with realistic soft shadows
and gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
```

**Negative (humanized):**

```text
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
different people, face swap, changing face, whitened skin, deformed face, crossed or misaligned
eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime, watermark, text, logo, blurry,
duplicate or cloned faces.
```

---

## 3. PROMPT PER FOTO (self-contained — copy 1 blok per generate)

### 🅰️ Kategori A — WAJIB pasangan sama

---

### 1. `coupleGate` — Hero Gate (foto utama website)
- **Tujuan:** Foto pembuka full-screen; kesan pertama & anchor identitas pasangan.
- **AR:** 4:5 (alt 9:16) · **Camera:** eye-level, head-on · **Lens:** 50mm prime · **Lighting:** natural soft daylight · **Pose:** Rani di depan menyandar ke Adi, tangan Adi di pinggang, menatap kamera santai.
- **Dipakai di:** Hero gate image.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw and slightly pointed chin, dark almond-brown eyes, full soft eyebrows, a small
beauty mark on her lower-left cheek, dark brown-black wavy hair past the shoulders, slim build,
165 cm. GROOM "Adi": Indonesian man, 30, warm tan olive skin with the same realistic texture,
soft square face with defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a
well-groomed light short beard, a small mole near his right eyebrow, athletic build, 178 cm (about
13 cm taller than Rani). Keep their faces, skin tones, hair and relative heights identical — one
real couple, natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid full-length to three-quarter photo of Rani and Adi as a wedding couple,
standing close — Rani slightly in front leaning gently into Adi who stands tall behind her with
a hand at her waist, both glancing toward the camera with relaxed genuine expressions and faint
natural smiles; Rani in a flowing cream-and-soft-coral gown with small gold jewelry, Adi in a
tailored cream blazer over a linen shirt; simple uncluttered light background with generous empty
space above their heads for a text overlay.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 50mm prime lens — natural available light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
different people, face swap, changing face, whitened skin, deformed face, crossed or misaligned
eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime, watermark, text, logo, blurry,
duplicate or cloned faces.
```

---

### 2. `bridePortrait` — Bride Solo Portrait (anchor wajah)
- **Tujuan:** Mendefinisikan wajah pengantin wanita; jadikan REFERENCE untuk scene lain.
- **AR:** 4:5 · **Camera:** eye-level, 3/4 wajah · **Lens:** 85mm prime · **Lighting:** natural window light · **Pose:** bahu 3/4, kepala menoleh ke kamera, senyum natural tertangkap.
- **Dipakai di:** Hero blast · Bride & Groom card · Footer polaroid.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. Keep this exact face
identical in every photo.
Scene: a candid, unposed photo of Rani alone, head and shoulders, caught mid soft genuine smile
while glancing toward the camera, hair slightly loose and natural, wearing a simple cream blouse
with small gold earrings; everyday indoor spot near a window, creamy soft background.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with an 85mm prime lens — natural window light with realistic soft shadows,
bright and airy but true-to-life colors, genuine skin texture with visible pores and subtle
unevenness, shallow depth of field, subtle lens vignette, fine natural film grain. Not
AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like face,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, heavy makeup,
different person, face swap, changing face, whitened skin, deformed face, crossed eyes, cartoon,
anime, watermark, text, logo, second person, blurry.
```

---

### 3. `groomPortrait` — Groom Solo Portrait (anchor wajah)
- **Tujuan:** Mendefinisikan wajah pengantin pria; jadikan REFERENCE untuk scene lain.
- **AR:** 4:5 · **Camera:** eye-level, 3/4 · **Lens:** 85mm prime · **Lighting:** natural window light · **Pose:** bahu menyerong, kepala ke kamera, ekspresi tenang.
- **Dipakai di:** Bride & Groom card · Footer polaroid.

```text
The same Indonesian couple in every photo, faces strictly identical. GROOM "Adi": Indonesian
man, 30, warm tan (sawo matang) olive skin with realistic texture — visible pores, faint natural
fine lines, subtle natural asymmetry; soft square face with defined jaw and strong chin, dark
brown eyes, thick eyebrows, neat short black hair, a well-groomed light short beard, a small mole
near his right eyebrow, athletic build with broad shoulders, 178 cm. Keep this exact face
identical in every photo.
Scene: a candid, unposed photo of Adi alone, head and shoulders at a slight angle, calm relaxed
expression with a faint genuine smile, neat short black hair and light short beard with a little
natural texture, the small mole near his right eyebrow visible; wearing an emerald-toned blazer
over a cream linen shirt; everyday indoor spot near a window, creamy soft background.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with an 85mm prime lens — natural window light with realistic soft shadows,
bright and airy but true-to-life colors, genuine skin texture with visible pores and subtle
unevenness, shallow depth of field, subtle lens vignette, fine natural film grain. Not
AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like face,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, clean-shaven,
long hair, different person, face swap, changing face, whitened skin, deformed face, crossed eyes,
cartoon, anime, watermark, text, logo, second person, blurry.
```

---

### 4. `coupleClassic` — Wedding Day Classic
- **Tujuan:** Momen hari-H yang ceria di galeri & blast.
- **AR:** 4:5 · **Camera:** eye-level, candid · **Lens:** 50mm prime · **Lighting:** open shade / soft daylight · **Pose:** bergandeng tangan, gerak memutar lembut, tawa lepas.
- **Dipakai di:** Hero blast · Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw and slightly pointed chin, dark almond-brown eyes, full soft eyebrows, a small
beauty mark on her lower-left cheek, dark brown-black wavy hair past the shoulders, slim build,
165 cm. GROOM "Adi": Indonesian man, 30, warm tan olive skin with the same realistic texture,
soft square face with defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a
well-groomed light short beard, a small mole near his right eyebrow, athletic build, 178 cm (about
13 cm taller than Rani). Keep their faces, skin tones, hair and relative heights identical — one
real couple, natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid three-quarter photo of Rani and Adi on their wedding day, laughing naturally as
Adi gently holds her hand and spins her slightly mid-motion; Rani in a flowing cream bridal
gown holding a soft coral bouquet, Adi in a cream suit; outdoor garden with a soft green
background, real daylight.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 50mm prime lens — natural available light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
stiff frozen pose, different people, face swap, changing face, whitened skin, deformed face,
crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime, watermark,
text, logo, blurry, duplicate or cloned faces.
```

---

### 5. `coupleCasual` — Just Us, Casual Outdoors
- **Tujuan:** Sisi santai & nyata pasangan di galeri.
- **AR:** 4:5 · **Camera:** eye-level candid · **Lens:** 35mm prime · **Lighting:** soft overcast daylight · **Pose:** jalan berdampingan, saling menyandar, tawa natural.
- **Dipakai di:** Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid photo of Rani and Adi walking outdoors in casual earth-tone clothes (Rani in a
soft coral knit, Adi in a cream linen shirt), caught mid-laugh leaning into each other with
hands almost touching; everyday park or street with a soft background; unposed everyday moment.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 35mm prime lens — natural available light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
formal gown, studio backdrop, different people, face swap, changing face, whitened skin, deformed
face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime,
watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 6. `storyFirstMeet` — Chapter 1: The First Meeting (Café)
- **Tujuan:** Kartu cerita pembuka di Our Story.
- **AR:** 3:4 · **Camera:** eye-level, environmental · **Lens:** 35mm prime · **Lighting:** natural window daylight · **Pose:** duduk di meja kecil, sedikit condong, senyum malu pertama sambil ngopi.
- **Dipakai di:** Hero blast · Our Story.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid photo of Rani and Adi at their first meeting in a cozy sunlit café, sitting at
a small wooden table sharing a first shy laugh over two cups of coffee, leaning slightly toward
each other; warm wood interior with potted plants and soft window light, a few softly blurred
patrons in the background; light casual earth-tone clothing; an unposed, slightly awkward-sweet
first-meeting moment.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 35mm prime lens — natural window light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
dark dim café, crowded busy background, different people, face swap, changing face, whitened skin,
deformed face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon,
anime, watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 7. `storyHoliday` — Chapter 3: Our Holiday Together
- **Tujuan:** Kartu cerita liburan di Our Story.
- **AR:** 3:4 · **Camera:** eye-level, environmental · **Lens:** 24–35mm · **Lighting:** soft early-morning daylight · **Pose:** berdiri rapat, lengan saling memeluk, menghadap pemandangan.
- **Dipakai di:** Our Story · Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid travel photo of Rani and Adi on holiday at a scenic viewpoint, arms around each
other smiling and squinting a little in the daylight, looking out at rolling green hills with
distant hot-air balloons in a pale morning sky; casual earth-tone travel clothes; relaxed and
happy.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 24-35mm lens — natural available light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, subtle lens vignette, fine
natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
cramped framing, dark moody sky, different people, face swap, changing face, whitened skin,
deformed face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon,
anime, watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 8. `storyProposal` — Chapter 4: The Proposal
- **Tujuan:** Klimaks emosional Our Story.
- **AR:** 3:4 · **Camera:** eye-level, sedikit dari sisi · **Lens:** 50mm prime · **Lighting:** soft daylight, gentle flare · **Pose:** Adi berlutut menengadah, Rani tangan menutup mulut haru.
- **Dipakai di:** Our Story · Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid, emotional photo of a proposal — Adi on one knee holding a ring and looking up
at Rani, who covers her mouth with happy tears and a real smile; soft smart-casual earth-tone
outfits; outdoor setting with a soft background and gentle daylight; raw genuine emotion.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 50mm prime lens — natural available light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
flat expression, dark scene, different people, face swap, changing face, whitened skin, deformed
face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime,
watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 9. `galleryFirstDance` — First Dance
- **Tujuan:** Momen tarian pertama di galeri.
- **AR:** 4:5 · **Camera:** eye-level, sedikit close · **Lens:** 50mm prime · **Lighting:** soft warm reception light, gentle bokeh · **Pose:** berdansa rapat, dahi bersentuhan, mata terpejam tenang.
- **Dipakai di:** Hero blast · Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid photo of Rani and Adi during their first dance, foreheads close, Adi's hand
on her waist and Rani's hand on his shoulder, eyes softly closed with small natural smiles; cream
gown and cream suit; reception space with soft warm background lights; an intimate real moment.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 50mm prime lens — natural soft light with realistic soft shadows, bright
and airy but true-to-life colors, genuine skin texture with visible pores and subtle
imperfections, unposed natural expressions, shallow depth of field, subtle lens vignette, fine
natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
dark club lighting, harsh spotlights, different people, face swap, changing face, whitened skin,
deformed face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon,
anime, watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 10. `galleryCooking` — Cooking Together at Home
- **Tujuan:** Momen domestik hangat & nyata.
- **AR:** 4:5 · **Camera:** eye-level candid · **Lens:** 35mm prime · **Lighting:** natural window daylight · **Pose:** berdiri berdampingan di counter, Adi menyuapi cicipan, Rani tertawa.
- **Dipakai di:** Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid photo of Rani and Adi cooking together in an everyday kitchen, laughing as
Adi offers Rani a taste from a spoon, casual rolled-sleeve home clothes, maybe a little flour
around; white kitchen with soft window light and real ingredients on the counter; messy-in-a-good-
way everyday intimacy.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 35mm prime lens — natural window light with realistic soft shadows and
gentle highlight roll-off, bright and airy but true-to-life colors, genuine skin texture with
visible pores and subtle imperfections, unposed natural expressions, shallow depth of field,
subtle lens vignette, fine natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
dark kitchen, restaurant, different people, face swap, changing face, whitened skin, deformed
face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime,
watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 🅱️ Kategori B — boleh konsisten (wajah jauh/siluet, tetap pasangan sama)

---

### 11. `storyFirstDate` — Chapter 2: Our First Date (Bonfire)
- **Tujuan:** Kartu cerita kencan pertama di Our Story.
- **AR:** 3:4 · **Camera:** eye-level, sedikit wide · **Lens:** 35mm prime · **Lighting:** soft firelight + pale dusk sky (dijaga natural, tidak gelap) · **Pose:** duduk rapat berselimut, saling pandang tertawa pelan.
- **Dipakai di:** Our Story · Gallery.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid photo of Rani and Adi sitting close on a beach at dusk beside a small bonfire,
wrapped in a light blanket sharing a quiet laugh, soft earth-tone casual clothes; warm firelight
on their faces against a pale gold-and-blush evening sky, kept bright and natural rather than
dark; a cozy real moment.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 35mm prime lens — natural soft firelight and ambient dusk light with
realistic soft shadows, true-to-life colors, genuine skin texture with visible pores and subtle
imperfections, unposed natural expressions, shallow depth of field, subtle lens vignette, fine
natural film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
pitch-black night, scary fire, different people, face swap, changing face, whitened skin, deformed
face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon, anime,
watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 12. `storyWedding` — Chapter 5: The Wedding Day (Ceremony)
- **Tujuan:** Penutup Our Story / momen altar.
- **AR:** 3:4 · **Camera:** eye-level, sedikit low untuk arch · **Lens:** 35mm prime · **Lighting:** natural outdoor daylight, soft backlight · **Pose:** berhadapan di bawah arch, kedua tangan bertaut, saling tatap.
- **Dipakai di:** Hero blast · Our Story.

```text
The same Indonesian couple in every photo, faces strictly identical. BRIDE "Rani": Indonesian
woman, 28, warm tan (sawo matang) skin with golden undertone and realistic texture — visible
pores, faint natural fine lines, a few flyaway hairs, subtle natural asymmetry; soft oval face
with gentle jaw, dark almond-brown eyes, full soft eyebrows, a small beauty mark on her lower-left
cheek, dark brown-black wavy hair past the shoulders, slim build, 165 cm. GROOM "Adi":
Indonesian man, 30, warm tan olive skin with the same realistic texture, soft square face with
defined jaw, dark brown eyes, thick eyebrows, neat short black hair, a well-groomed light short
beard, a small mole near his right eyebrow, athletic build, 178 cm (about 13 cm taller than
Rani). Keep their faces, skin tones, hair and relative heights identical — one real couple,
natural Indonesian features, real human skin, no plastic/CGI look.
Scene: a candid photo of Rani and Adi at their ceremony, standing beneath a floral arch holding
both hands and looking at each other about to kiss; cream gown with soft coral-and-emerald
florals, cream suit; open-air garden with a few petals in the air, real daylight; a happy genuine
moment.
Style: looks like a real candid photograph taken by a human photographer on a full-frame
mirrorless camera with a 35mm prime lens — natural outdoor daylight with soft backlight and
realistic soft shadows, bright and airy but true-to-life colors, genuine skin texture with visible
pores and subtle imperfections, unposed natural expressions, subtle lens vignette, fine natural
film grain. Not AI-generated, not retouched, not a 3D render.
Avoid: AI-generated look, CGI, 3D render, digital painting, airbrushed, overprocessed, plastic or
waxy skin, over-smoothed poreless skin, perfect flawless symmetry, mannequin or doll-like faces,
beauty/instagram filter, HDR, oversaturated, overly sharp, glossy stock-photo look, fake bokeh,
empty arch with no people, dark church, different people, face swap, changing face, whitened skin,
deformed face, crossed or misaligned eyes, extra fingers, mutated hands, bad anatomy, cartoon,
anime, watermark, text, logo, blurry, duplicate or cloned faces.
```

---

### 13. `gallerySunsetWalk` — Sunset Walk (Silhouette)
- **Tujuan:** Momen siluet di galeri (identitas tak terlihat).
- **AR:** 3:2 (landscape) · **Camera:** eye-level, wide · **Lens:** 35mm · **Lighting:** backlit sunset, pastel sky · **Pose:** bergandeng tangan jalan menyamping, selisih tinggi terlihat jelas.
- **Dipakai di:** Gallery.

```text
A real candid silhouette photo of a couple, the groom clearly taller than the bride (about 13 cm
difference).
Scene: a wide silhouette of the couple holding hands and walking along a beach at sunset against a
pale pastel sky of soft peach, gold and lilac with a glowing low sun; their forms are natural dark
silhouettes (faces not detailed); a calm real moment.
Style: looks like a real photograph taken on a full-frame mirrorless camera with a 35mm lens,
natural backlight, true-to-life pastel sky, subtle lens vignette, fine natural film grain. Not
AI-generated, not a 3D render, not overprocessed.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, fake bokeh, detailed
faces, deformed silhouette, extra limbs, bad anatomy, pure-black crushed shadows, cartoon, anime,
watermark, text, logo, blurry, duplicate figures.
```

---

### 🅲 Kategori C — objek / lanskap (TANPA pasangan)

---

### 14. `galleryRoadTrip` — Road Trip, Open Road
- **Tujuan:** Selingan lanskap "petualangan" di galeri.
- **AR:** 3:2 · **Camera:** eye-level wide · **Lens:** 24mm · **Lighting:** natural daylight · **Pose:** —

```text
A real candid photo of a scenic empty winding road through green hills under a soft pale-blue sky,
a vintage car parked at the roadside. No people. Wide 24mm lens.
Style: looks like a real photograph on a full-frame mirrorless camera, natural available light,
bright and airy but true-to-life colors, true textures, subtle lens vignette, fine natural film
grain. Not AI-generated, not a 3D render, not an overprocessed stock photo.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, overly sharp, glossy
stock-photo look, people, faces, text, watermark, logo, dark stormy sky, traffic, clutter, blurry.
```

---

### 15. `galleryCoffee` — Coffee Mornings
- **Tujuan:** Detail still-life hangat.
- **AR:** 1:1 · **Camera:** top-down 90° · **Lens:** 50mm · **Lighting:** morning window light · **Pose:** —

```text
A real candid flat-lay photo of two latte cups with simple latte art on a wooden café table beside
a small vase of soft coral flowers, morning window light. No people. Top-down 90-degree view, 50mm
lens.
Style: looks like a real photograph on a full-frame mirrorless camera, natural window light,
bright and airy but true-to-life colors, true textures, fine natural film grain. Not AI-generated,
not a 3D render, not an overprocessed stock photo.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, overly sharp, glossy
stock-photo look, people, hands, faces, text, watermark, logo, dark, cluttered, blurry.
```

---

### 16. `gallerySunrise` — Sunrise Sky
- **Tujuan:** Selingan tekstur langit lembut.
- **AR:** 3:2 · **Camera:** eye-level/menengadah · **Lens:** 35mm · **Lighting:** soft sunrise · **Pose:** —

```text
A real photo of a soft pastel sunrise sky in pale peach, lilac and gold with gentle clouds, calm
and minimal. No people. 35mm lens.
Style: looks like a real photograph on a full-frame mirrorless camera, natural soft light,
true-to-life colors, fine natural film grain. Not AI-generated, not a 3D render, not overprocessed.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, people, text,
watermark, logo, dark night, harsh sun flare, blurry.
```

---

### 17. `galleryCityLights` — City Lights
- **Tujuan:** Selingan urban malam (dijaga tetap lembut).
- **AR:** 3:2 · **Camera:** eye-level · **Lens:** 50mm (bokeh) · **Lighting:** blue-hour soft glow · **Pose:** —

```text
A real photo of soft city lights as gentle bokeh in warm tones at blue hour, luminous but natural
rather than dark. No people. 50mm lens, shallow depth of field.
Style: looks like a real photograph on a full-frame mirrorless camera, natural ambient light,
true-to-life colors, subtle lens vignette, fine natural film grain. Not AI-generated, not a 3D
render, not overprocessed.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, fake bokeh, people,
faces, text, watermark, logo, harsh neon, pitch black, gritty, blurry.
```

---

### 18. `galleryRings` — The Rings
- **Tujuan:** Detail simbolik cincin.
- **AR:** 1:1 · **Camera:** top-down / 45° macro · **Lens:** 100mm macro · **Lighting:** soft diffused natural light · **Pose:** —

```text
A real close-up photo of two gold wedding rings resting on soft cream fabric with a few tiny coral
petals, soft natural light with a little real sparkle. No people. 100mm macro lens.
Style: looks like a real photograph on a full-frame mirrorless camera, soft diffused natural light,
true-to-life colors and metal reflections, shallow depth of field, fine natural film grain. Not
AI-generated, not a 3D render, not overprocessed.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, glossy stock-photo
look, people, hands, text, watermark, logo, dark background, cheap plastic look, blurry.
```

---

### 19. `galleryBeach` — Beach Escape
- **Tujuan:** Lanskap pantai cerah.
- **AR:** 3:2 · **Camera:** eye-level wide · **Lens:** 24mm · **Lighting:** natural daylight · **Pose:** —

```text
A real photo of a bright tropical beach with turquoise water, soft white sand and a pale clear sky,
calm and inviting. No people. Wide 24mm lens.
Style: looks like a real photograph on a full-frame mirrorless camera, natural daylight, bright and
airy but true-to-life colors, true textures, fine natural film grain. Not AI-generated, not a 3D
render, not an overprocessed stock photo.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, overly sharp, glossy
stock-photo look, people, faces, text, watermark, logo, storm, crowds, dark, blurry.
```

---

### ⚪ Borderline — objek dominan (orang opsional, tanpa wajah jelas)

---

### 20. `galleryBirthday` — Birthday Surprise
- **Tujuan:** Momen perayaan hangat.
- **AR:** 4:5 · **Camera:** eye-level/45° · **Lens:** 50mm · **Lighting:** warm candle glow + natural fill · **Pose:** tangan/siluet di belakang kue (opsional).

```text
A real candid photo of a birthday cake with small glowing candles and a sparkler on a wooden table
with coral-and-gold decor, a warm everyday room with a soft background; faint out-of-focus hands,
no clear faces. 50mm lens.
Style: looks like a real photograph on a full-frame mirrorless camera, warm candle glow with
natural fill light, true-to-life colors, shallow depth of field, fine natural film grain. Not
AI-generated, not a 3D render, not an overprocessed stock photo.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, glossy stock-photo
look, clear faces of strangers, text, watermark, logo, dark room, messy clutter, blurry.
```

> Opsi dengan pasangan: tambahkan blok identitas Rani & Adi (lihat scene #1) dan ubah scene
> jadi "Rani and Adi behind the cake mid-laugh, faces visible".

---

### 21. `galleryFamilyDinner` — Family Dinner
- **Tujuan:** Kehangatan kebersamaan (top-down, tanpa wajah).
- **AR:** 1:1 · **Camera:** top-down 90° · **Lens:** 35mm · **Lighting:** natural soft overhead daylight · **Pose:** tangan ber-toast di atas meja (tanpa wajah).
- **Dipakai di:** Hero blast · Gallery.

```text
A real candid overhead photo of a shared dinner table full of food, with several pairs of hands
reaching in and toasting glasses, faces out of frame. An everyday warm setting, cream linens,
earth-tone tableware. Top-down 90-degree view, 35mm lens.
Style: looks like a real photograph on a full-frame mirrorless camera, natural soft overhead light,
true-to-life colors, true food textures, fine natural film grain. Not AI-generated, not a 3D
render, not an overprocessed stock photo.
Avoid: AI-generated look, CGI, 3D render, overprocessed, HDR, oversaturated, glossy stock-photo
look, visible faces, text, watermark, logo, dark restaurant, clutter, blurry.
```

---

## 4. PETA REUSE & PEMETAAN FILE

34 penempatan → **21 generate**. Saran nama file output (untuk wiring ke `demoImages.js` /
config nanti):

| # | Generate (`demoImg` key) | Saran nama file | Kategori | Dipakai di (penempatan) |
|---|---|---|---|---|
| 1 | `coupleGate` | `couple-gate.jpg` | A | Hero gate |
| 2 | `bridePortrait` | `bride-portrait.jpg` | A | Hero blast · Bride&Groom · Footer |
| 3 | `groomPortrait` | `groom-portrait.jpg` | A | Bride&Groom · Footer |
| 4 | `coupleClassic` | `couple-classic.jpg` | A | Hero blast · Gallery |
| 5 | `coupleCasual` | `couple-casual.jpg` | A | Gallery |
| 6 | `storyFirstMeet` | `story-first-meet.jpg` | A | Hero blast · Our Story |
| 7 | `storyHoliday` | `story-holiday.jpg` | A | Our Story · Gallery |
| 8 | `storyProposal` | `story-proposal.jpg` | A | Our Story · Gallery |
| 9 | `galleryFirstDance` | `gallery-first-dance.jpg` | A | Hero blast · Gallery |
| 10 | `galleryCooking` | `gallery-cooking.jpg` | A | Gallery |
| 11 | `storyFirstDate` | `story-first-date.jpg` | B | Our Story · Gallery |
| 12 | `storyWedding` | `story-wedding.jpg` | B | Hero blast · Our Story |
| 13 | `gallerySunsetWalk` | `gallery-sunset-walk.jpg` | B | Gallery |
| 14 | `galleryRoadTrip` | `gallery-road-trip.jpg` | C | Hero blast · Gallery |
| 15 | `galleryCoffee` | `gallery-coffee.jpg` | C | Hero blast · Gallery |
| 16 | `gallerySunrise` | `gallery-sunrise.jpg` | C | Gallery |
| 17 | `galleryCityLights` | `gallery-city-lights.jpg` | C | Gallery |
| 18 | `galleryRings` | `gallery-rings.jpg` | C | Gallery |
| 19 | `galleryBeach` | `gallery-beach.jpg` | C | Gallery |
| 20 | `galleryBirthday` | `gallery-birthday.jpg` | borderline | Gallery |
| 21 | `galleryFamilyDinner` | `gallery-family-dinner.jpg` | borderline | Hero blast · Gallery |

**Urutan generate yang disarankan:** #2 & #3 dulu (anchor wajah) → sisa Kategori A → B → C.
Review wajah tiap batch sebelum lanjut.

---

## 5. CHECKLIST KONSISTENSI (jangan dilanggar)

- [ ] Wajah identik di semua scene (pakai reference image #2 & #3)
- [ ] Warna kulit identik — tidak menjadi lebih cerah/putih
- [ ] Bentuk wajah, rambut, dan ciri khas (tahi lalat) identik
- [ ] Selisih tinggi Adi > Rani (~13 cm) konsisten
- [ ] Terlihat seperti **foto asli** — ada tekstur kulit/pori, bukan kulit plastik/gloss AI
- [ ] Grade bright & airy + busana earth-tone di semua scene
- [ ] Foto reuse di-generate sekali, lalu crop ke rasio target
