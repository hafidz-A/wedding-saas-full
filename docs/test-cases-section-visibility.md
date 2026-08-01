# Test Cases — Section on/off switch & kebijakan kunci section

> Suite uji untuk perubahan commit `03c8240` (`feat(editor): make section on/off a real switch,
> unlock all but opening & footer`). Pendamping [`test-cases-functional.md`](test-cases-functional.md)
> — bagian **F. Editor** di dokumen itu sekarang dibaca bersama dokumen ini.
> Desain di [`superpowers/specs/2026-08-01-section-visibility-switch-design.md`](superpowers/specs/2026-08-01-section-visibility-switch-design.md).

Legend: ✅ harus jalan · ⛔ harus ditolak · ♻️ reversible (jalankan maju lalu balik) ·
🤖 sudah ditutup automated test · 👁️ manual/visual saja.

---

## 0. Fixtures & prasyarat

```bash
node scripts/seed-dummy.mjs sw-lovebirds --template=lovebirds --plan=basic
node scripts/seed-dummy.mjs sw-solary   --template=solary   --plan=basic
npm run dev
```

Login: email fixture + password `DemoTutorial123!`. Editor ada di
`/<template>/<slug>/dashboard` → tab **Editor** → panel kiri **BAGIAN**.

Baris section sekarang: `[geser/🔒] [nama] [✏️] [TAMPIL|SEMBUNYI] [switch]`.

Section Lovebirds: Pembuka · Kutipan · Kisah Kami · Detail Acara · Mempelai · Gallery ·
Rangkaian Acara · RSVP · Gift · Footer.
Section Solary: Intro · 8 planet tengah (termasuk **Saturn = Gallery**) · Sun (footer).

---

## A. Tampilan switch & keterbacaan (👁️ — ini inti keluhan awal)

| ID | Langkah | Harapan |
|---|---|---|
| SW-1 | Buka tab Editor, lihat panel BAGIAN | Tiap baris punya switch sungguhan, bukan titik. Terbaca "bisa diklik" tanpa dijelaskan ✅ |
| SW-2 | Perhatikan kolom switch dari atas ke bawah | Semua switch **lurus satu kolom**, termasuk di baris terkunci ✅ |
| SW-3 | Baris aktif | Label `TAMPIL` hijau + switch ke kanan ✅ |
| SW-4 | Baris nonaktif | Label `SEMBUNYI` abu + switch ke kiri ✅ |
| SW-5 | Baris Pembuka & Footer | Label + switch tetap tampil tapi switch **redup & tidak bisa diklik**; tooltip "Bagian ini selalu tampil dan tidak bisa dimatikan." ✅ |
| SW-6 | Zoom 200% / layar sempit (panel mobile) | Nama section terpotong elipsis, label & switch **tidak** ikut terdorong keluar ✅ |
| SW-7 | Keyboard: Tab ke switch, tekan Space/Enter | Fokus terlihat (ring), status berubah ✅ 🤖 (`Switch.test.tsx` menutup peran & aria) |
| SW-8 | Screen reader / inspect | `role="switch"`, `aria-checked` ikut status ✅ 🤖 |
| SW-9 | Klik area switch | Hanya switch yang bereaksi — baris **tidak** ikut terpilih ✅ 🤖 |
| SW-10 | Klik nama section (bukan switch) | Baris terpilih, panel edit terbuka, status switch **tidak** berubah ✅ |
| SW-11 | Kontras label `TAMPIL` di layar terang | Terbaca jelas (pakai `--status-success-text`, bukan `--color-emerald` yang gagal AA sebagai teks) 👁️ |
| SW-12 | OS "reduce motion" aktif | Switch berpindah tanpa animasi ✅ |

---

## B. Matriks kunci per template (🤖 sebagian besar)

| ID | Template | Section | Geser | Ganti tipe | On/off |
|---|---|---|---|---|---|
| LK-1 | Lovebirds | Pembuka (hero) | ⛔ | ⛔ | ⛔ |
| LK-2 | Lovebirds | Footer | ⛔ | ⛔ | ⛔ |
| LK-3 | Lovebirds | RSVP | ✅ | ✅ | ✅ (+konfirmasi) |
| LK-4 | Lovebirds | Gift | ✅ | ✅ | ✅ (+konfirmasi) |
| LK-5 | Lovebirds | Kisah Kami, Detail Acara, Mempelai, Rangkaian | ✅ | ✅ | ✅ |
| LK-6 | Lovebirds | Gallery | ✅ | ✅ hanya Masonry↔SpringCoil | ✅ |
| LK-7 | Solary | Intro | ⛔ | ⛔ | ⛔ |
| LK-8 | Solary | Sun (footer) | ⛔ | ⛔ | ⛔ |
| LK-9 | Solary | **Saturn (Gallery)** | ⛔ | ⛔ | **✅** ← pengecualian sengaja |
| LK-10 | Solary | RSVP, Gift | ✅ | ✅ | ✅ (+konfirmasi) |
| LK-11 | Keduanya | Tombol Tambah/Hapus section | ⛔ tidak ada sama sekali | | |

**LK-12** 👁️ — baris yang tidak bisa digeser menampilkan 🔒 di kolom kiri; yang bisa menampilkan ⠿.
Sesudah perubahan ini 🔒 hanya di **Pembuka, Footer** (Lovebirds) dan **Intro, Saturn, Sun** (Solary).

---

## C. Toggle on/off + persist (♻️)

| ID | Langkah | Harapan |
|---|---|---|
| ON-1 | Matikan "Kisah Kami" → Simpan → reload dashboard | Tetap `SEMBUNYI` ✅ |
| ON-2 | Buka undangan publik | Section Kisah Kami tidak dirender ✅ |
| ON-3 | Cek navbar mengambang (Lovebirds) | Entri "Kisah Kami" ikut hilang dari nav ✅ |
| ON-4 | ♻️ Nyalakan lagi → Simpan → reload | Kembali `TAMPIL`, **isi teks & foto utuh** — mematikan menyembunyikan, bukan menghapus ✅ |
| ON-5 | Matikan 3 section sekaligus lalu Simpan sekali | Ketiganya tersimpan ✅ |
| ON-6 | Matikan section **tanpa** Simpan lalu reload | Kembali ke kondisi tersimpan (tidak auto-save) ✅ |
| ON-7 | **Config lama** (undangan yang `enabled` belum pernah diset) — klik switch sekali | Langsung jadi `SEMBUNYI`. Dulu klik pertama tidak melakukan apa-apa ✅ 🤖 (`editor-reducer.test.ts`) |
| ON-8 | ♻️ ON-7 diklik lagi | Kembali `TAMPIL` ✅ 🤖 |
| ON-9 | Matikan semua section yang bisa dimatikan | Undangan tetap render: Pembuka + Footer saja ✅ |

---

## D. Konfirmasi khusus RSVP & Gift (`confirmDisableTypes`)

| ID | Langkah | Harapan |
|---|---|---|
| CF-1 | Matikan RSVP | Muncul dialog: "Kalau bagian ini dimatikan, tamu tidak bisa mengisinya di undangan. Data yang sudah masuk tetap aman dan masih terlihat di dashboard. Matikan sekarang?" ✅ |
| CF-2 | Di dialog CF-1 pilih **Batal** | Section **tetap** `TAMPIL`, tidak ada perubahan ✅ |
| CF-3 | Di dialog CF-1 pilih **Ya** | Jadi `SEMBUNYI` ✅ |
| CF-4 | ♻️ Nyalakan RSVP lagi | **Tidak ada dialog** — menyalakan tidak pernah konfirmasi ✅ |
| CF-5 | Ulangi CF-1..CF-4 untuk Gift | Sama ✅ |
| CF-6 | Matikan Kisah Kami / Gallery / Detail Acara | **Tidak ada dialog** — hanya RSVP & Gift ✅ 🤖 (`needsDisableConfirm` diuji persis 4 tipe) |
| CF-7 | Ulangi CF-1 di **Solary** (rsvpPlanet & giftPlanet) | Dialog muncul sama ✅ |
| CF-8 | Tekan Escape saat dialog terbuka | Dialog tertutup, section tidak berubah (= Batal) ✅ |

---

## E. Saturn — kunci posisi/tipe + on/off + peta planet (Solary)

| ID | Langkah | Harapan |
|---|---|---|
| ST-1 | Coba geser baris Saturn (mode GESER) | ⛔ tidak bergerak, 🔒 di kolom kiri ✅ 🤖 |
| ST-2 | Mode TUKAR: tukar planet lain dengan Saturn | ⛔ ditolak, muncul pesan "tidak bisa ditukar" ✅ 🤖 |
| ST-3 | Pilih Saturn, lihat panel edit | **Tidak ada** dropdown "Ganti tipe section"; ada hint 🔒 ✅ |
| ST-4 | Klik switch Saturn | ✅ bisa dimatikan (inilah bedanya dengan Intro/Sun) |
| ST-5 | Matikan Saturn → Simpan → buka undangan publik | Scroll 3D **melompati** Saturn: uranus → jupiter ✅ 🤖 (`normalizeConfig.test.js`) |
| ST-6 | Pada ST-5, perhatikan tata surya | Planet Saturn **tetap ada** di scene, hanya tidak jadi perhentian ✅ 👁️ |
| ST-7 | Pada ST-5, cek section sesudahnya (Countdown dsb.) | **Tidak** ada satu pun section yang pindah ke planet Saturn ✅ 🤖 |
| ST-8 | ♻️ Nyalakan Saturn lagi | Kembali jadi perhentian di Saturn, foto ring muncul lagi, urutan planet section lain kembali seperti semula ✅ |
| ST-9 | Matikan Saturn, lalu geser dua planet lain, Simpan, reload | Saturn tetap di indeks-nya; nonaktif tidak membuatnya bisa digeser ✅ |

---

## F. Reorder & swap sesudah `mandatoryTypes` dihapus (♻️)

| ID | Langkah | Harapan |
|---|---|---|
| RS-1 | Lovebirds, mode GESER: pindahkan RSVP ke atas Gallery → Simpan → buka publik | Urutan berubah sesuai ✅ |
| RS-2 | ♻️ Kembalikan RSVP ke posisi semula | Kembali persis ✅ |
| RS-3 | Geser section ke **atas** Pembuka | ⛔ ditahan, Pembuka tetap pertama ✅ |
| RS-4 | Geser section ke **bawah** Footer | ⛔ ditahan, Footer tetap terakhir ✅ |
| RS-5 | Mode TUKAR: tukar Kutipan ↔ Rangkaian yang terhalang RSVP | ✅ berhasil, RSVP tetap di indeksnya |
| RS-6 | Panel edit RSVP → "Ganti tipe section" | Dropdown **muncul** (dulu tidak, karena mandatory) ✅ |
| RS-7 | Ganti tipe RSVP → Akomodasi → Simpan | ✅ tersimpan; undangan publik tidak lagi punya form RSVP |
| RS-8 | ♻️ Ganti balik Akomodasi → RSVP | ✅ bisa kembali — `rsvp` ada di pool, bukan pintu satu arah |
| RS-9 | Setelah RS-7, buka tab RSVP di dashboard | Tab tetap ada, data lama tetap terlihat ✅ |
| RS-10 | Gallery: Masonry → Spring Coil → ♻️ balik | ✅ dua-duanya bisa, dan **tidak pernah** ada 2 gallery sekaligus |
| RS-11 | Solary: tukar rsvpPlanet dengan planet lain | ✅ boleh (dulu ⛔ karena mandatory) 🤖 |

---

## G. Dampak ke halaman publik & data tamu

| ID | Langkah | Harapan |
|---|---|---|
| PB-1 | RSVP dimatikan → buka link tamu personal (bertoken) | Halaman tetap terbuka normal, hanya tanpa form RSVP ✅ — tidak error/404 |
| PB-2 | RSVP dimatikan → cek tab RSVP dashboard | Data lama tetap utuh & terbaca ✅ |
| PB-3 | Gift dimatikan → cek tab Hadiah | Data lama tetap utuh ✅ |
| PB-4 | Premium: RSVP dimatikan → cek Buku Tamu | Baris attendance lama tetap ada ✅ |
| PB-5 | ♻️ Nyalakan RSVP lagi → tamu submit | Masuk normal ke tab RSVP ✅ |
| PB-6 | Section dimatikan lalu undangan di-publish | Tamu tidak melihat section itu ✅ |

---

## H. Bahasa (ID & EN)

| ID | Langkah | Harapan |
|---|---|---|
| I18-1 | Dashboard bahasa ID | `TAMPIL` / `SEMBUNYI` ✅ |
| I18-2 | Dashboard bahasa EN | `VISIBLE` / `HIDDEN` ✅ |
| I18-3 | Tooltip switch terkunci, ID & EN | Terterjemah, bukan key mentah ✅ |
| I18-4 | Dialog konfirmasi RSVP, ID & EN | Terterjemah ✅ |
| I18-5 | Tab Tutorial → cari kalimat soal section terkunci | **Tidak lagi** menyebut RSVP/Hadiah sebagai terkunci; hanya Pembuka & Footer ✅ |
| I18-6 | Tab Tutorial → tips | Ada tips soal switch on/off di tiap baris ✅ |
| I18-7 | `npm run test` | dict-parity ID/EN hijau ✅ 🤖 |

---

## I. Regresi komponen bersama (`<Switch>`)

| ID | Langkah | Harapan |
|---|---|---|
| RG-1 | Tab **Musik** → toggle "Aktif" & "Loop" | Masih berfungsi & tersimpan ✅ (sekarang pakai `<Switch>` yang sama) |
| RG-2 | Bandingkan switch di Musik vs di daftar section | Bentuk & ukuran identik ✅ 👁️ |
| RG-3 | `npm run check:tokens` | Hijau — tidak ada `999px`, hex mentah, atau tinggi kontrol di luar skala ✅ 🤖 |

---

## J. Negatif / abuse / bypass (⛔ — "rusak-rusakin")

| ID | Langkah | Harapan |
|---|---|---|
| NG-1 | `PUT /api/invitation/<slug>/config` — kirim sections tanpa `hero` (Lovebirds) | ⛔ ditolak `missing_locked_type` / `count_changed` ✅ 🤖 |
| NG-2 | Idem tanpa `footer` | ⛔ ditolak ✅ 🤖 |
| NG-3 | Idem tanpa slot `intro` / `sun` (Solary) | ⛔ ditolak `missing_locked_slot` ✅ 🤖 |
| NG-4 | Idem tanpa slot `saturn` | ⛔ ditolak — Saturn tetap terkunci by id ✅ 🤖 |
| NG-5 | Kirim jumlah section bertambah/berkurang | ⛔ ditolak `count_changed` ✅ 🤖 |
| NG-6 | Kirim config dengan `saturn` hanya `enabled:false` | ✅ **diterima** — menonaktifkan bukan menghapus 🤖 |
| NG-7 | Kirim `rsvp` dihapus dari Lovebirds | ⛔ ditolak `count_changed` (bukan lagi `missing_mandatory`, kode itu sudah tidak ada) ✅ 🤖 |
| NG-8 | Akun lain coba PUT config slug bukan miliknya | ⛔ 403/404 ✅ 🤖 |
| NG-9 | Buka dua tab editor, matikan section berbeda di masing-masing, Simpan dua-duanya | Tab kedua dapat banner "konten berubah, muat ulang" — tidak menimpa diam-diam ✅ |
| NG-10 | Kirim `enabled: "false"` (string) lewat API | Tidak membuat section hilang secara tak terduga; nilai non-boolean tidak diperlakukan sebagai `false` 👁️ |

---

## K. CHAIN — skenario end-to-end (jalankan maju **lalu balik**)

### CHAIN-A — Sembunyikan RSVP lalu pulihkan (Lovebirds, ♻️ penuh)
1. Fixture `sw-lovebirds` live. Tamu kirim 2 RSVP → tab RSVP terisi (PB-2).
2. Editor → matikan RSVP → dialog muncul (CF-1) → **Ya** → Simpan.
3. Publik: form RSVP hilang; link tamu personal tetap terbuka (PB-1).
4. Dashboard: 2 RSVP lama tetap terbaca (PB-2).
> **Balik:** nyalakan RSVP lagi (tanpa dialog, CF-4) → Simpan → tamu ke-3 submit → masuk normal.
> **Harus:** tidak ada data lama yang hilang di sepanjang jalur ini.

### CHAIN-B — Saturn dimatikan tidak menggeser peta planet (Solary, ♻️)
1. Fixture `sw-solary`. Catat planet tiap section di undangan publik (urutan kanonik: neptune, uranus, saturn, jupiter, mars, earth, venus, mercury).
2. Editor → matikan Saturn → Simpan.
3. Publik: journey uranus → jupiter (ST-5); Saturn tetap tampak di tata surya (ST-6).
4. Bandingkan planet section lain dengan langkah 1 → **harus identik**, tidak ada yang naik ke Saturn (ST-7).
> **Balik:** nyalakan Saturn → peta planet kembali persis seperti langkah 1, foto ring muncul lagi.
> **Ini yang dulu salah:** sebelum perbaikan, Countdown naik ke Saturn di langkah 3.

### CHAIN-C — Ganti tipe RSVP dan pulihkan (bukti bukan pintu satu arah, ♻️)
1. Lovebirds. Panel RSVP → Ganti tipe → Akomodasi → Simpan (RS-7).
2. Publik: tidak ada form RSVP; ada section Akomodasi.
3. Tab RSVP dashboard tetap ada + data lama (RS-9).
> **Balik:** Ganti tipe Akomodasi → RSVP → Simpan → form kembali, tamu bisa submit lagi (RS-8).
> **Harus:** `rsvp` selalu tersedia di dropdown, jadi selalu ada jalan pulang.

### CHAIN-D — Config lama + urutan + on/off bersamaan (♻️)
1. Undangan yang `enabled`-nya belum pernah diset (config lama / demo).
2. Klik switch Kisah Kami **sekali** → langsung `SEMBUNYI` (ON-7 — dulu butuh 2 klik).
3. Geser Detail Acara ke atas Mempelai → Simpan → reload.
4. Kedua perubahan bertahan bersamaan.
> **Balik:** nyalakan Kisah Kami + kembalikan urutan → Simpan → reload → persis kondisi awal.

### CHAIN-E — Batas kunci diuji dari dua arah
1. Coba geser Pembuka (RS-3) ⛔ · Footer (RS-4) ⛔ · Saturn (ST-1) ⛔.
2. Coba matikan Pembuka & Footer lewat UI → switch redup, tidak bisa (SW-5).
3. Coba lakukan hal yang sama lewat API langsung (NG-1..NG-5) → semua ⛔.
> **Sisi positif:** semua section lain di kedua template **bisa** dimatikan (LK-3..LK-6, LK-10) dan Saturn **bisa** dimatikan meski posisinya terkunci (ST-4).

---

## Ringkasan cakupan

| Area | Automated 🤖 | Manual 👁️ |
|---|---|---|
| Kebijakan kunci (policy) | `templatePolicy.test.ts`, `template-policy.test.ts` — 44 test | LK-12 (ikon 🔒) |
| Peta planet Solary | `normalizeConfig.test.js` — 9 test | ST-6 (planet tetap di scene) |
| Reducer toggle | `editor-reducer.test.ts` | — |
| Komponen `<Switch>` | `Switch.test.tsx` — 4 test | SW-1..SW-6, SW-11, RG-2 |
| Guard server config | `config/__tests__/route.test.ts` | NG-9, NG-10 |
| i18n | dict-parity | I18-1..I18-6 |

Gerbang otomatis: `npm run typecheck` · `npm run test` · `npm run check:tokens` — semuanya hijau
pada `03c8240` (109 file / 785 test).

**Belum diverifikasi sama sekali:** seluruh kolom 👁️ — perlu dijalankan di aplikasi berjalan
dengan fixture di bagian 0.
