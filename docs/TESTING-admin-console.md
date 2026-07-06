# Panduan Tes Manual — Admin Console (FinCards)

Cara pakai: jalankan server (`npm run dev`), buka di browser, ikuti tiap langkah,
lalu cocokkan dengan **"Harusnya terlihat"**. Kalau ada yang tidak cocok, catat
langkah + apa yang muncul — itu bug. Dokumen ini bertambah tiap modul baru.

> Login admin: `fincardsland@gmail.com` (sudah punya 2FA). Kalau sesi habis, login
> ulang + masukkan kode dari aplikasi authenticator.

---

## Modul 0 — Pondasi (masuk admin + 2FA)

**T0.1 — Masuk sebagai admin**
1. Buka `/login` → masuk dengan email admin + password. Kalau diminta **6 digit
   kode**, buka authenticator di HP → ketik kodenya.
2. Buka `/admin`.
- **Harusnya terlihat:** panel admin terbuka dengan menu di kiri (Ringkasan,
  Template & Harga, Undangan, Pembayaran, Akun & Data) + ringkasan jumlah undangan.

**T0.2 — Gate menolak yang bukan admin**
1. Buka `/admin` di jendela **penyamaran/incognito** (belum login).
- **Harusnya terlihat:** langsung dilempar ke beranda (`/`), panel admin TIDAK terbuka.

---

## Modul 1 — Template & Harga

### Plan A — Editor harga (`/admin/templates`)

**T1.1 — Lihat & simpan perubahan**
1. Di `/admin` klik **"Template & Harga"** (atau buka `/admin/templates`).
2. Lihat kartu tiap paket (Basic & Premium) untuk Lovebirds & Solary.
3. Ubah salah satu — misal **harga** Basic Lovebirds jadi `149000`, **kuota** `200`,
   **fitur** (satu per baris) → klik **Simpan**.
- **Harusnya terlihat:** muncul **"Tersimpan ✓"** (hijau).
4. **Refresh** halaman.
- **Harusnya terlihat:** perubahanmu **tetap ada** (tersimpan di database).

**T1.2 — Sistem menolak input ngawur (validasi)**
1. Isi **harga coret** lebih KECIL dari harga (mis. harga `149000`, coret `100000`) → Simpan.
- **Harusnya terlihat:** pesan merah "Harga coret harus lebih besar dari harga jual…". TIDAK tersimpan.
2. Isi **kuota** `237` (bukan kelipatan 50) → Simpan.
- **Harusnya terlihat:** pesan merah "Kuota harus kelipatan 50…". TIDAK tersimpan.
3. Kosongkan **nama paket** → Simpan.
- **Harusnya terlihat:** pesan merah "Nama paket wajib diisi".

### Plan B1 — Halaman depan ikut database

**T1.3 — Kartu depan menampilkan data dari editor**
1. Di `/admin/templates`, set Basic Lovebirds: harga `149000`, **harga coret** `199000`,
   kuota `200` → Simpan.
2. Buka beranda `/` → scroll ke bagian **"Coba Vibe-nya Langsung di Halaman Ini"** →
   pastikan template **Lovebirds** yang terpilih → klik tombol **"Beli Undangan"**.
- **Harusnya terlihat:** kartu paket muncul. Basic menampilkan **~~Rp 199.000~~ Rp 149.000**
  (harga coret dicoret), baris **"200 tamu undangan"**, dan daftar fitur **tanpa "Buku tamu"**.
  Premium menampilkan **"300 tamu undangan"** dan fitur **termasuk "Buku tamu"**.
  *(Kalau masih harga lama, refresh sekali — ada jeda cache ±1 menit.)*

**T1.4 — Rantai editor → tampilan (bukti nyambung)**
1. Balik ke `/admin/templates` → ubah harga Basic Lovebirds jadi angka lain (mis. `169000`) → Simpan.
2. Buka beranda `/` lagi + **refresh** → buka kartu paket Lovebirds.
- **Harusnya terlihat:** harga Basic ikut jadi angka baru. Artinya editor admin ↔ tampilan depan
  benar-benar tersambung.

---

## Belum dites (belum dibangun) — jangan dicari dulu

- **Plan B2** — tombol +/- tambah kuota langsung di kartu depan (ditunda).
- **Modul 2** — kelola semua undangan (comp, suspend, buatkan untuk klien).
- **Modul 3–5** — pembayaran/refund, metadata template, akun & data.
- Catatan "Aktivitas" (log admin) belum ditampilkan — datanya sudah dicatat, tampilannya menyusul.
