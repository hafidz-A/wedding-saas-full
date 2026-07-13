# Solary navbar — pisahkan nama mempelai dari title SEO

> **⚠️ SUPERSEDED (2026-06-29)** oleh
> [`2026-06-29-couple-name-single-source-design.md`](2026-06-29-couple-name-single-source-design.md).
> Pemisahan navbar di sini menjadi bagian kecil dari desain yang lebih besar:
> nama pasangan jadi satu sumber kebenaran (`config.couple`) untuk semua template,
> dengan field section terkunci + override. Pakai spec baru sebagai acuan.

**Tanggal:** 2026-06-29
**Status:** Superseded
**Branch:** `feat/solary-editor`

## Masalah

Di tab **Meta** dashboard, field **TITLE** (`config.meta.title`) memikul dua tugas
sekaligus:

1. Judul SEO / share (judul tab browser, preview WhatsApp/sosial — `og:title`).
2. Sumber nama pasangan di **navbar Solary**.

Navbar tidak punya field sendiri; ia mem-parse string title:

```js
// Shell.jsx:128 dan InvitationPage.jsx:48
logo={config.meta?.title?.split('—')[0]?.trim() || 'Wedding'}
```

Jadi `"Raniii & Adi — Our Wedding"` → navbar menampilkan `"Raniii & Adi"`.
Satu kotak membebani dua makna, dan navbar rapuh karena bergantung pada tanda `—`.

Catatan: nama mempelai sebenarnya sudah dikumpulkan terpisah saat onboarding
(`bride`/`groom` → `coupleName = "${bride} & ${groom}"`, lihat
`src/lib/onboarding/seed-config.ts`) lalu di-denormalisasi ke section hero/footer/
gate dan ke `meta.title`. Tetapi MetaTab hanya mengedit `meta.title` mentah.

## Tujuan

Pisahkan nama mempelai menjadi **dua kotak input terpisah** (Mempelai 1 & Mempelai 2)
di MetaTab. Judul SEO disusun **otomatis** dari kedua nama + akhiran. Navbar membaca
field terstruktur, bukan lagi mem-parse `—`.

## Keputusan (dari brainstorming)

- **Dua kotak** terpisah: Mempelai 1 & Mempelai 2 (bukan satu kotak gabungan).
- Pemisah yang dipakai sistem: **` & `** (samakan dengan perilaku navbar saat ini).
- Title SEO **otomatis** dari nama + akhiran (bukan kotak manual terpisah).
- Nama field: **`coupleName1` / `coupleName2`** (+ `titleSuffix`).
- **Tanpa batas karakter** pada kotak nama & akhiran — tidak ada `maxLength`, tidak ada
  counter. Title turunan tidak ditruncate.

## Desain

### 1. Data — `config.meta`

Tambah tiga field. `title` tetap ada tetapi menjadi **turunan** (derived), sehingga
semua pembaca SEO yang sudah ada (`page.tsx` membaca `meta.title`) tetap jalan tanpa
perubahan.

| Field | Peran | Contoh |
|---|---|---|
| `meta.coupleName1` | Mempelai 1 (sumber kebenaran) | `Raniii` |
| `meta.coupleName2` | Mempelai 2 (sumber kebenaran) | `Adi` |
| `meta.titleSuffix` | Akhiran setelah `—` | `Our Wedding` |
| `meta.title` *(derived)* | `n1 & n2 — suffix` | `Raniii & Adi — Our Wedding` |

Aturan komposisi:

```
names = [coupleName1, coupleName2].map(trim).filter(Boolean).join(' & ')
title = titleSuffix?.trim() ? `${names} — ${titleSuffix.trim()}` : names
```

`config.meta` tidak di-whitelist per-key (API hanya `spread` lalu assign), jadi field
baru ini persist tanpa perubahan validasi.

### 2. MetaTab UI (`src/app/[template]/[slug]/dashboard/MetaTab.tsx`)

Ganti satu input TITLE dengan:

- **Mempelai 1** — input teks, tanpa `maxLength`, tanpa counter.
- **Mempelai 2** — input teks, tanpa `maxLength`, tanpa counter.
- **Akhiran judul** — input teks, tanpa `maxLength`, tanpa counter (placeholder
  contoh: `Our Wedding`).
- Baris bantu kecil: "Judul jadi: *Raniii & Adi — Our Wedding*" (preview title turunan).

Field **Deskripsi** dan **foto share (og:image)** tidak berubah. Bagian "Share preview"
tetap memakai title turunan.

State internal MetaTab: `coupleName1`, `coupleName2`, `titleSuffix` menggantikan
`title`. Title turunan dihitung saat render untuk preview dan dikirim ke API.

### 3. API `PUT /api/invitation/[slug]/meta`

- Terima body baru: `coupleName1?`, `coupleName2?`, `titleSuffix?` (string).
- Jika salah satu dari ketiganya hadir → komposisikan `title` dari ketiganya dan simpan
  keempat field (`coupleName1`, `coupleName2`, `titleSuffix`, `title` turunan).
- **Backward-compat:** jika `title` dikirim langsung (tanpa field nama) → tetap simpan
  `title` apa adanya seperti sekarang. Ini menjaga pemanggil lama & test eksisting.
- `description` / `ogImage` tidak berubah.
- Normalisasi: trim + collapse whitespace pada nama/akhiran. Tidak ada truncation
  panjang (sesuai keputusan "tanpa batas karakter").
- Validasi "minimal satu field hadir" diperluas untuk mengenali field nama.

### 4. Navbar Solary

`Shell.jsx:128` dan `InvitationPage.jsx:48` diubah membaca field terstruktur dengan
fallback ke parsing lama (untuk undangan yang belum punya field nama):

```js
const navName =
  [config.meta?.coupleName1, config.meta?.coupleName2]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' & ')
  || config.meta?.title?.split('—')[0]?.trim()
  || 'Wedding';
```

(InvitationPage memakai fallback akhir `'Galactic'` sesuai aslinya — pertahankan
perbedaan kecil itu.)

### 5. Backward-compat / prefill di MetaTab

Undangan lama hanya punya `meta.title`. Saat MetaTab mount tanpa `coupleName1/2`:

```
[namesPart, ...rest] = (initial.title || '').split('—')
titleSuffix = rest.join('—').trim()
parts = namesPart.split('&').map(trim).filter(Boolean)
coupleName1 = parts[0] || ''
coupleName2 = parts.slice(1).join(' & ')   // gabung sisa kalau nama mengandung > 1 '&'
```

Best-effort, hanya untuk mengisi awal kotak. Saat user menyimpan, field terstruktur
ikut tertulis sehingga parsing tidak lagi diperlukan pada kunjungan berikutnya.

## Di luar scope (sengaja)

`coupleName` pada section hero/footer/gate tetap diedit lewat editor section
masing-masing. Spec ini **tidak** menyatukannya dengan kotak nama meta — hanya navbar
yang dialihkan ke field meta baru. Penyatuan denormalisasi adalah pekerjaan terpisah.

**Lovebirds:** rewire navbar **hanya Solary**. Lovebirds `FloatingNavbar` adalah nav
pill antar-section tanpa brand nama pasangan dan tidak pernah mem-parse `meta.title`,
jadi tak ada navbar Lovebirds yang diubah. Namun MetaTab + route meta + helper bersifat
*template-agnostic*, sehingga perubahan dua-kotak tetap berlaku untuk Lovebirds (judul
tab browser & preview share). Diverifikasi di Task 6.

## Test

- `src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`:
  - Test baru: PUT `{coupleName1, coupleName2, titleSuffix}` → `config.meta.title`
    tersusun benar + ketiga field tersimpan.
  - Test eksisting (PUT `title` langsung) tetap hijau (jalur backward-compat).
- Test prefill-parsing (unit kecil pada helper parse, mis. diekstrak agar bisa diuji
  tanpa render): `"A & R — Our Wedding"` → `{n1:'A', n2:'R', suffix:'Our Wedding'}`;
  nama dengan `&` ganda → sisa digabung ke `coupleName2`.

## Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `src/app/[template]/[slug]/dashboard/MetaTab.tsx` | Dua kotak nama + akhiran, prefill, preview title turunan |
| `src/app/api/invitation/[slug]/meta/route.ts` | Terima & simpan field nama, komposisi title, backward-compat |
| `src/all-templates/solary/Shell.jsx` | Navbar baca field terstruktur + fallback |
| `src/all-templates/solary/components/InvitationPage.jsx` | Idem |
| `src/app/api/invitation/[slug]/meta/__tests__/route.test.ts` | Test komposisi + backward-compat |
| (helper parse + testnya) | Ekstrak fungsi parse title → nama untuk prefill & unit test |
