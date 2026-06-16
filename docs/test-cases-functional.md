# Test Cases — Functional & Interrelated (Solary + Lovebirds)

> Suite uji fungsional menyeluruh untuk template **Solary** & **Lovebirds**, semua plan
> (basic / premium) dan semua state pembayaran (draft / live / expired). Bukan cuma
> alur satu arah — bagian **CHAIN** menguji keterkaitan antar fitur yang bisa
> **dibolak-balik** (reversible). Dipakai bareng `docs/...` lain + unit test di `src/**/__tests__`.

Legend status: ✅ harus jalan · ⛔ harus ditolak · 🔒 terkunci (butuh Premium) · ♻️ reversible.

---

## 0. Fixtures (akun & state)

Dibuat via `scripts/seed-dummy.mjs` (paid 365 hari, default). `.env.local` harus ada
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY`, `GUESTS_ENCRYPTION_KEY`.

| Fixture | Perintah | Guna |
|---|---|---|
| **Basic Solary** (sudah ada) | `node scripts/seed-dummy.mjs basic-solary --template=solary --plan=basic --no-seed --email=basic-solary@example.com` | user baru beli basic, dashboard kosong |
| **Basic Lovebirds** (sudah ada) | `node scripts/seed-dummy.mjs basic-lovebirds --template=lovebirds --plan=basic --no-seed --email=basic-lovebirds@example.com` | idem |
| Basic + data | tambah tanpa `--no-seed` | tab RSVP/Hadiah/Ucapan terisi |
| **Premium** (untuk Buku Tamu) | `node scripts/seed-dummy.mjs prem-solary --template=solary --plan=premium` | dashboard premium + data |
| **Draft / belum bayar** | `node scripts/seed-dummy.mjs draft-test --draft` atau `node scripts/mark-paid.mjs <slug> --draft` | uji payment gate |
| **Expired** | `node scripts/mark-paid.mjs <slug> --days=-1` | uji kedaluwarsa |
| **Lifetime** | `... --lifetime` | tanpa expiry |

Login semua: email fixture + password `DemoTutorial123!`. Public `/<template>/<slug>`, dashboard `/<template>/<slug>/dashboard`.

Prasyarat: `npm run dev` di `localhost:3000`.

Tab dashboard (label ID): **RSVP · Hadiah · Tamu · Buku Tamu · Editor · Palette · Musik · Ornamen · Judul & Deskripsi · Tutorial**.

---

## A. Lifecycle akun & state machine (♻️ reversible)

State undangan: `draft (unpaid)` → `live (paid, !expired)` → `expired`. Plan: `basic` → `premium` (tak ada downgrade).

| ID | Langkah | Harapan |
|---|---|---|
| A1 | Onboarding bikin undangan baru | Tersimpan sbg draft: `is_paid=false`, `is_published=false` |
| A2 | Buka dashboard saat draft | Tampil **PaymentGate** (bukan editor) |
| A3 | Buka public saat draft | Halaman tertutup / not-found, bukan undangan |
| A4 | Bayar (Xendit) / `mark-paid <slug>` | `is_paid=true`, `is_published=true` → live |
| A5 | Buka dashboard saat live | Editor + semua tab muncul |
| A6 | `mark-paid <slug> --days=-1` (expired) | Public tertutup (layar expired); dashboard → PaymentGate (expired) |
| A7 ♻️ | `mark-paid <slug>` lagi (renew) | Kembali live, **data lama utuh** (RSVP/gift/ucapan tidak hilang) |
| A8 | Basic → upgrade Premium (bayar selisih) | `plan=premium`; Buku Tamu kebuka; **data attendance yang sudah terkumpul langsung tampil** |
| A9 ⛔ | Coba "downgrade" premium → basic | Tidak ada alur ini (tidak boleh) |
| A10 | Onboarding: bikin >10 draft belum bayar | ⛔ ditolak anti-abuse |

**Catatan keterkaitan:** A6→A7 dan A4↔A6 buktiin transisi state bolak-balik tidak merusak data. A8 buktiin attendance yang diam-diam terkumpul saat basic (lihat D & H) muncul setelah upgrade.

---

## B. Auth & isolasi multi-tenant

| ID | Langkah | Harapan |
|---|---|---|
| B1 | Login email+password fixture | Masuk dashboard |
| B2 | Akses dashboard tanpa login | ⛔ redirect ke login |
| B3 | Login akun A (basic-solary) → buka URL dashboard akun B (basic-lovebirds) | ⛔ ditolak (`verifyOwnership`) |
| B4 ⛔ | `PUT /api/invitation/<slugB>/config` pakai sesi A | 403 Unauthorized |
| B5 ⛔ | Panggil server action Buku Tamu/Tamu untuk invitation B | Forbidden (bukan owner) |
| B6 | Lupa password → `/forgot-password` | Email reset terkirim (Supabase Auth) |
| B7 | IDOR: kirim `id` attendance/rsvp milik invitation lain ke action delete/update | No-op (ter-scope `invitation_id`) |

---

## C. Render publik (Solary & Lovebirds)

| ID | Template | Harapan |
|---|---|---|
| C1 | Solary | Semua planet section ke-render; intro pertama, sun terakhir; tidak ada skeleton nyangkut |
| C2 | Lovebirds | hero pertama, footer terakhir; semua section ter-render |
| C3 | Keduanya | Reduced-motion (`prefers-reduced-motion`) → animasi berat di-skip, konten tetap tampil |
| C4 | Keduanya | Favicon/monogram & judul tab sesuai meta |
| C5 | Mobile viewport | Layout responsif, tidak overflow |

---

## D. Alur tamu (RSVP · Hadiah · Buku Ucapan) + lifecycle kode (♻️)

Kode tamu = 6 digit, **sekali pakai**. RSVP **atau** ucapan mengonsumsi kode yang sama.

| ID | Langkah | Harapan |
|---|---|---|
| D1 | Owner (tab Tamu) buat tamu + generate kode | Kode 6 digit muncul |
| D2 | Tamu isi RSVP "hadir" pakai kode | ✅ tersimpan; muncul di tab RSVP |
| D3 | RSVP "hadir" → otomatis isi **attendances** (Buku Tamu) | Baris attendance dibuat **untuk semua plan** (tampil hanya jika premium — lihat H) |
| D4 ⛔ | Tamu yang sama submit RSVP lagi | 409 "already submitted" |
| D5 | Tamu pakai kode untuk **ucapan** (bukan RSVP) | ✅ ucapan tampil di dinding publik |
| D6 ⛔ | Pakai ulang kode yang sudah dikonsumsi | 403 "kode sudah dipakai" |
| D7 ♻️ | Owner **regenerate** kode tamu yang sudah RSVP | Kode lama mati; kode baru **hanya** untuk ucapan, **tidak** bisa RSVP lagi (anti isian ganda) |
| D8 | Tamu konfirmasi transfer (Hadiah) pakai rekening yang tampil | ✅ muncul di tab Hadiah |
| D9 | RSVP "tidak hadir" | ✅ tersimpan; **tidak** bikin attendance |
| D10 ⛔ | Kode ngaco / kosong | 403 generic (tak bocorin valid-vs-used) |

**Keterkaitan:** D2→D3→(H) RSVP hadir mengisi Buku Tamu. D7 menunjukkan kode bisa "dimatikan & diganti" tapi status RSVP permanen. D2/D5/D6 tunjukkan satu kode = satu aksi.

---

## E. Tab data dashboard (turunan dari D)

| ID | Langkah | Harapan |
|---|---|---|
| E1 | Tab RSVP setelah D2 | Submission muncul; total hadir terhitung |
| E2 | Tab RSVP, export CSV | File CSV berisi data ter-decrypt |
| E3 | Tab Hadiah setelah D8 | Konfirmasi muncul; total nominal terjumlah |
| E4 | Tab Tamu | Daftar tamu + status kode (terpakai/belum), tombol regenerate |
| E5 | Tab RSVP saat kosong (akun baru) | Empty state, tanpa error |
| E6 | Buku Ucapan (publik) menampilkan D5 | Note tampil dengan warna terpilih |

---

## F. Editor — kebijakan template (♻️ reorder/swap/disable bolak-balik)

Editor **tersedia penuh di basic** (bukan fitur premium).

### F-Solary (fixed planet sections)
| ID | Langkah | Harapan |
|---|---|---|
| FS1 | Cari tombol "Tambah/Hapus section" | ⛔ tidak ada (fixedSections) |
| FS2 | Drag `intro` / `saturn` / `sun` | ⛔ tidak bisa pindah (locked) |
| FS3 | Ganti tipe / disable `intro`/`saturn`/`sun` | ⛔ ditolak |
| FS4 ⛔ | Hapus/disable `rsvpPlanet` / `giftPlanet` | ⛔ mandatory |
| FS5 ♻️ | Swap planet swappable (story/countdown/details/team/quote/schedule/faq…) lalu swap balik | ✅ urutan kembali seperti semula |
| FS6 | Simpan → reload public | Urutan planet sesuai editor |

### F-Lovebirds (fixed count, cap 10)
| ID | Langkah | Harapan |
|---|---|---|
| FL1 | Tambah/Hapus section | ⛔ tidak bisa (lockSectionCount) |
| FL2 | Ganti tipe / pindah `hero` / `footer` | ⛔ locked (anchor) |
| FL3 ⛔ | Hapus/disable `rsvp` / `weddingGift` | ⛔ mandatory |
| FL4 ♻️ | Swap galeri `galleryMasonry` ⇄ `gallerySpringCoil` lalu balik | ✅ bisa, tapi **tidak** bisa bikin 2 galeri sekaligus |
| FL5 ♻️ | Disable satu section → public sembunyikan → enable lagi → muncul | ✅ reversible |
| FL6 ♻️ | Reorder beberapa section lalu reorder balik | ✅ kembali; anchor tetap di ujung |

### F-Concurrency & integritas simpan
| ID | Langkah | Harapan |
|---|---|---|
| FC1 ⛔ | Edit di 2 tab; simpan tab lama (updated_at basi) | 409 "muat ulang dulu" |
| FC2 | Edit teks di Editor sementara Musik diubah di tab lain, lalu simpan Editor | Nilai Musik **tidak** ke-revert (PRESERVE_KEYS) |
| FC3 ⛔ | `PUT config` payload >512KB | 413 |
| FC4 ⛔ | `PUT config` `sections` bukan array | 400 |

---

## G. Palette · Musik · Ornamen · Meta (persist + interplay)

| ID | Langkah | Harapan |
|---|---|---|
| G1 ♻️ | Ganti Palette → simpan → public berubah → balik ke palette awal | ✅ reversible |
| G2 | Upload/ubah Musik → simpan | Pemutar musik publik pakai trek baru |
| G3 | Ubah Ornamen | Ornamen publik berubah |
| G4 | Ubah Judul & Deskripsi | Tab browser / preview share update |
| G5 | Save Editor **tidak** menimpa Palette/Musik/Meta yang baru diubah (lihat FC2) | ✅ |

---

## H. Entitlement Premium — Buku Tamu (🔒) + upgrade

| ID | Plan | Langkah | Harapan |
|---|---|---|---|
| H1 | basic | Klik tab Buku Tamu | 🔒 kartu **"Buku Tamu terkunci"** + tombol **"Upgrade ke Premium — Rp(selisih)"** + "cek ulang" |
| H2 | basic | Klik "Upgrade ke Premium" | Redirect checkout Xendit untuk **selisih** harga |
| H3 ⛔ | basic | **Bypass:** panggil server action `addUnlistedAttendance`/`addWalkInAttendance`/`setArrived`/`deleteAttendance`/`ensureCheckinToken` langsung (DevTools, sesi basic) | **Ditolak server-side** — "Buku Tamu requires the Premium plan" (FIX). Tidak ada baris ditulis |
| H4 ⛔ | basic | Recheck upgrade tanpa benar-benar bayar | Tetap basic (invoice belum PAID / amount mismatch) |
| H5 | premium | Buka tab Buku Tamu | Ledger kehadiran tampil; bisa walk-in, check-in QR, souvenir/meja |
| H6 | premium | Tamu RSVP hadir (D3) | Baris attendance source=`rsvp` muncul otomatis |
| H7 | premium | Tambah walk-in tak terdaftar | Baris source=`walkin`, guest_id null |
| H8 ⛔ | premium | Tambah walk-in milik invitation lain (guestId asing) | not_found (di-scope invitation) |
| H9 | premium | Walk-in dobel (guest sama) | "sudah ada di Buku Tamu" (unique) |
| H10 | basic→premium | Setelah upgrade (A8), buka Buku Tamu | **Data attendance dari fase basic langsung tampil** (tidak ada yang hilang) |

---

## I. Negatif / abuse / bypass (sebagian sudah di-FIX)

| ID | Serangan | Harapan |
|---|---|---|
| I1 ⛔ | Spam RSVP >10/menit/IP | 429 Retry-After |
| I2 ⛔ | Spam guestbook >8/menit/IP | 429; + per-(slug,IP) <30 dtk → 429 |
| I3 ⛔ | RSVP/guestbook POST ke slug **draft/unpaid/expired** | 403 / 404 (bukan live) |
| I4 | RSVP `guest_count`=99999 | Di-clamp ke 999 |
| I5 ⛔ | Guestbook nama >40 / pesan >240 | 400 |
| I6 | XSS `<script>` di nama/pesan/RSVP | Tersimpan terenkripsi sbg teks, dirender ter-escape, **tidak** dieksekusi |
| I7 | `color` di luar allowlist | Fallback `gold` |
| I8 ⛔ | Body bukan JSON | 400 |
| I9 ⛔ | **FIX** — `PUT config` hapus mandatory (rsvp/gift) | **422 ditolak** (validasi policy server-side) |
| I10 ⛔ | **FIX** — `PUT config` Lovebirds 30 section / ubah jumlah | **422 ditolak** (count_changed) |
| I11 ⛔ | **FIX** — entitlement Buku Tamu via action langsung (= H3) | **Forbidden server-side** |
| I12 ⛔ | Bikin >10 draft belum bayar | Ditolak |
| I13 ⛔ | Daftar dengan password lemah | Ditolak password policy |
| I14 ⛔ | Slug duplikat saat onboarding | "Slug sudah dipakai" |
| I15 | Cek DB at-rest: `rsvps`/`gift_confirmations`/`guestbook_notes`/`guests`/`attendances` | Kolom `*_enc` ciphertext base64; nama/pesan/nominal/telepon **bukan** plaintext |
| I16 ⛔ | `startCheckout`/`startUpgradeCheckout` untuk invitation bukan milik sendiri | Ditolak |
| I17 | `recheckPayment` saat sudah paid | Idemponten, balas PAID |

---

## J. CHAIN — skenario keterkaitan end-to-end (jalankan + balik arah)

Tiap CHAIN menguji beberapa fitur yang saling memengaruhi. Jalankan maju **lalu mundur** untuk pastikan tidak ada efek samping permanen yang salah.

### CHAIN-1 — Beli → isi → tamu → lihat (basic, happy path penuh)
1. Onboarding draft (A1) → bayar (A4) → live.
2. Editor: ubah nama mempelai, tanggal, venue → simpan (F).
3. Palette + Musik + Meta diubah → simpan (G).
4. Tab Tamu: buat 3 tamu + kode (D1).
5. Tamu #1 RSVP hadir, #2 RSVP tidak hadir, #3 ucapan (D2/D9/D5).
6. Cek tab RSVP (E1) + Buku Ucapan publik (E6).
7. Buku Tamu → 🔒 terkunci (H1).
> **Reverse:** kembalikan palette/teks ke semula (G1, ♻️) → public balik seperti awal; status RSVP tamu tetap (permanen by design).

### CHAIN-2 — RSVP ↔ kode ↔ Buku Tamu (lifecycle kode)
1. Premium fixture. Tamu RSVP hadir (D2) → attendance otomatis (H6).
2. Owner regenerate kode tamu itu (D7).
3. Tamu coba RSVP lagi pakai kode baru → ⛔ 409 (D4) — hanya boleh ucapan.
4. Tamu kirim ucapan pakai kode baru → ✅ (D5).
> **Cek silang:** baris Buku Tamu dari langkah 1 tetap ada walau kode di-rotate.

### CHAIN-3 — Upgrade membuka data yang sudah terkumpul
1. Basic live. Beberapa tamu RSVP hadir → attendances terisi diam-diam (D3, untuk semua plan).
2. Buku Tamu masih 🔒 (H1). Coba bypass action → ⛔ (H3/I11).
3. Upgrade ke Premium (A8/H2).
4. Buka Buku Tamu → **semua attendance dari fase basic langsung tampil** (H10).
> Menegaskan: kunci hanya di akses (UI **dan** server), data tetap terkumpul; upgrade non-destruktif.

### CHAIN-4 — State pembayaran bolak-balik (♻️ non-destruktif)
1. Live + ada data (RSVP/gift/ucapan).
2. Expire (`--days=-1`): public tertutup, dashboard PaymentGate (A6); RSVP/guestbook POST ⛔ (I3).
3. Renew (`mark-paid`): live lagi (A7) → **semua data masih ada**, public normal.
> Ulangi expire↔renew 2x; tidak boleh ada data hilang/duplikat.

### CHAIN-5 — Editor reversible + integritas multi-tab
1. Lovebirds: disable section galeri → public sembunyi (FL5).
2. Swap galeri ke tipe lain → swap balik (FL4, ♻️).
3. Reorder 3 section → reorder balik (FL6, ♻️).
4. Sementara itu di tab lain ubah Musik; simpan Editor → Musik tidak ter-revert (FC2).
5. Buka 2 tab, edit beda, simpan yang basi → ⛔ 409 (FC1).
6. Enable lagi section galeri → muncul lagi di public.
> Akhirnya config harus identik dengan kondisi awal langkah 1 (kecuali Musik yang sengaja diubah).

### CHAIN-6 — Isolasi tenant menyeluruh
1. Login akun A (basic-solary).
2. Tiap endpoint owner untuk slug B (config PUT, guestbook actions, checkout) → ⛔ 403/Forbidden (B3–B5, H8, I16).
3. RSVP publik ke slug B tetap boleh (endpoint publik, ter-scope server-side) — pastikan nyangkut ke invitation B, bukan A.

### CHAIN-7 — Anti-abuse beruntun
1. Spam RSVP & guestbook → 429 (I1/I2).
2. XSS + payload oversize + JSON rusak → 400/escape (I5/I6/I8).
3. `PUT config` 30 section + drop mandatory → 422 (I9/I10).
4. Bypass Buku Tamu via action → Forbidden (I11).
> Semua ditolak **tanpa** menulis data; undangan tetap online & berfungsi.

---

## Ringkasan cakupan

- **Template:** Solary (planet/fixed) + Lovebirds (cinematic/cap-10) — kebijakan editor masing-masing (F).
- **Plan:** basic (Buku Tamu 🔒) + premium (Buku Tamu penuh) + alur upgrade (H, A8).
- **State:** draft / live / expired / lifetime, bolak-balik non-destruktif (A, CHAIN-4).
- **Keterkaitan:** kode↔RSVP↔Buku Tamu (CHAIN-2), upgrade↔data (CHAIN-3), editor reversible↔public (CHAIN-5), tenant isolation (CHAIN-6).
- **Keamanan:** rate-limit, token sekali pakai, IDOR, enkripsi at-rest, + 2 gap entitlement/policy yang sudah di-FIX (I9–I11).
