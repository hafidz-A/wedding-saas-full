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

### Plan B2 — Stepper kuota di kartu + onboarding

**T1.5 — Stepper +/- di kartu depan**
1. Buka beranda `/` → bagian "Coba Vibe" → template Lovebirds → klik **"Beli Undangan"**.
2. Di kartu paket ada tombol **− [angka] +** dengan **harga total** di sebelahnya.
3. Klik **+** beberapa kali.
- **Harusnya terlihat:** angka naik **per 50** (mis. 300 → 350 → 400), dan **harga total naik Rp 10.000 tiap +50**. Tombol **−** mati (abu-abu) saat sudah di angka dasar.

**T1.6 — Pilihan kuota terbawa ke onboarding**
1. Di kartu Premium, naikkan kuota **+100** (klik + dua kali) → klik **"Pilih paket ini"**.
2. (Kalau diminta login/daftar, lanjutkan — atau kamu sudah login.)
- **Harusnya terlihat:** halaman onboarding terbuka dengan stepper kuota **sudah di angka dasar + 100** (mis. 400 untuk Premium), plus baris **"Total: Rp …"** = harga paket + tambahan kuota.

---

## Modul 2 — Invitations control center

> Modul ini punya 4 bagian: **2A** aksi dasar (comp/lunas, terbit/sembunyi, ganti
> plan, +kuota) · **2B** blokir/arsip/hapus + halaman publik & dashboard klien
> menghormatinya · **2C** buat undangan untuk klien (bikin akun + kode
> atur-password) · **2D** view Aktivitas. T2.1–T2.5 menguji 2A; T2.6–T2.12 adalah
> **satu rangkaian** (buat → blokir → arsip → hapus → cek jejak) — kerjakan urut.

### Bagian 2A — aksi dasar

**T2.1 — Lihat semua undangan**
1. `/admin` → klik **"Undangan"** (atau `/admin/invitations`).
- **Harusnya terlihat:** daftar SEMUA undangan (dari semua akun). Tiap baris: `slug · template · plan`, lalu `email · status · sumber bayar`. Ada kotak **Cari**.

**T2.2 — Cari**
1. Ketik sebagian slug atau email di kotak → tekan Enter.
- **Harusnya terlihat:** daftar tersaring.

**T2.3 — Comp (gratiskan) / Lunas manual**
1. Cari undangan berstatus **"Belum bayar"** → klik **"Comp (gratis)"**.
- **Harusnya terlihat:** halaman reload; undangan jadi **Aktif/Seumur hidup**, sumber bayar **comp**, dan jadi tayang.
2. Atau klik **"Lunas manual"** → masukkan nominal (mis. `149000`).
- **Harusnya terlihat:** jadi aktif, sumber bayar **manual**.

**T2.4 — Sembunyikan / Terbitkan**
1. Klik **"Sembunyikan"** pada undangan yang tayang → reload → buka link publik `/…/slug`.
- **Harusnya terlihat:** halaman publik TIDAK tayang. Klik **"Terbitkan"** lagi → tayang lagi.

**T2.5 — Ganti plan / Tambah kuota**
1. Ubah dropdown plan (basic ↔ premium). → **Harusnya:** reload, plan berubah di baris.
2. Klik **"+50 kuota"**. → **Harusnya:** reload, muncul "+50 kuota" (atau bertambah) di baris.

### Bagian 2C — buat undangan untuk klien (mulai rangkaian di sini)

> Pakai email uji yang **belum pernah** dipakai, mis. `tes-klien+01@contoh.com`,
> dan slug unik `tes-klien-01`. Ini akan jadi bahan tes 2B & 2D di bawah.

**T2.6 — Buat undangan (akun baru + langsung comp)**
1. `/admin/invitations` → klik **＋ Buat undangan**.
2. Isi: **Email klien** (yang belum ada akun), **Template** Lovebirds, **Plan** basic,
   nama pengantin wanita & pria, tanggal & lokasi, **Slug** `tes-klien-01`.
   **Pembayaran** = **Comp — gratiskan**, **Masa aktif** = Ikut durasi plan → **Buat undangan**.
- **Harusnya terlihat:** panel **"Undangan dibuat ✓"** + link *lihat publik* / *dashboard klien*,
  lalu blok **"Akun baru dibuat"** berisi **kode 6 digit**, link `/reset-password`, dan status email.
  *(Status email kemungkinan "⚠ email otomatis belum aktif — salin manual" karena domain email
  belum diverifikasi. Itu normal — kodenya tetap valid untuk dipakai/dikirim manual.)*
3. Klik **lihat publik** → **Harusnya:** undangan **tayang** (comp = langsung lunas + terbit).

**T2.7 — Klien pakai kode untuk atur password** *(opsional, buktikan akun nyambung)*
1. Buka link `/reset-password?email=…` dari panel. Masukkan **email klien** + **kode 6 digit** +
   password baru → submit.
- **Harusnya terlihat:** sukses lalu diarahkan ke **dashboard** undangan klien. *(Sesudah ini kamu
  login sebagai klien — untuk lanjut sebagai admin, buka `/admin` di jendela incognito atau logout.)*

**T2.8 — Email yang SUDAH punya akun → ditautkan (bukan akun baru)**
1. ＋ Buat undangan lagi, pakai **email yang sama** seperti T2.6, slug baru `tes-klien-02`,
   **Pembayaran = Biarkan draft**.
- **Harusnya terlihat:** panel sukses dengan blok **"Ditautkan ke akun yang sudah ada"**
  (TIDAK ada kode baru). Baris `tes-klien-02` muncul berstatus **Belum bayar**.

### Bagian 2B — blokir (takedown), arsip, hapus

**T2.9 — Blokir (suspend) = takedown kuat**
1. Cari `tes-klien-01` → klik **Blokir** → (boleh isi alasan) → OK.
- **Harusnya terlihat:** reload; baris punya chip merah **diblokir**.
2. Buka publik `/lovebirds/tes-klien-01` → **Harusnya:** halaman **"Undangan dinonaktifkan sementara"** (tidak tayang), walau tadinya sudah lunas + terbit.
3. Masih di daftar admin, klik **Terbitkan** pada baris yang diblokir → **Harusnya:** pesan merah
   **"Undangan sedang diblokir (suspend)…"** — tidak bisa diterbitkan (bukti takedown mengunci).
4. *(Opsional, butuh login klien di jendela lain)* buka `/lovebirds/tes-klien-01/dashboard` sebagai
   klien → **Harusnya:** notis "Undangan dinonaktifkan sementara", editor tidak terbuka.
5. Klik **Buka blokir** → reload, chip hilang; buka publik lagi → **tayang lagi**.

**T2.10 — Arsip (undangan berbayar tidak bisa dihapus)**
1. Pada `tes-klien-01` (berbayar/comp) → perhatikan tombolnya **Arsipkan** (bukan Hapus).
   Klik **Arsipkan** → konfirmasi.
- **Harusnya terlihat:** reload; baris **hilang** dari daftar utama. Klik **Lihat arsip →** → baris ada
  di sana (redup). Klik **Keluarkan arsip** → kembali ke daftar utama. *(Data + riwayat bayar tetap.)*

**T2.11 — Hapus (hanya draft belum bayar) + ketik-untuk-konfirmasi**
1. Cari `tes-klien-02` (draft) → klik **Hapus** → di prompt ketik slug **yang salah** (`xxx`) → OK.
- **Harusnya terlihat:** pesan merah "Ketik slug persis…", baris **tidak** terhapus.
2. Klik **Hapus** lagi → ketik `tes-klien-02` **persis** → OK.
- **Harusnya terlihat:** reload; baris **hilang permanen**.

### Bagian 2D — Aktivitas (jejak audit)

**T2.12 — Semua tindakan tercatat**
1. Buka **Aktivitas** (menu kiri, atau `/admin/activity`).
- **Harusnya terlihat (terbaru di atas):** "Hapus undangan tes-klien-02", "Arsipkan undangan tes-klien-01",
  "Buka blokir…", "Blokir (suspend)…", "Buat undangan tes-klien-01 untuk klien (akun baru)", dst —
  masing-masing dengan **email admin + waktu**. Membuktikan setiap aksi terekam.

> **Bersih-bersih (opsional):** `tes-klien-01` masih ada (terarsip). Akun uji `tes-klien+01@contoh.com`
> juga masih ada. Kalau mau hapus tuntas: `node scripts/delete-account.mjs tes-klien+01@contoh.com --yes`.

---

## Belum dites (belum dibangun) — jangan dicari dulu

- **Modul 3–5** — pembayaran/refund, metadata template, akun & data.
