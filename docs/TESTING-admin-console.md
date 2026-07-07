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

## Modul 3 — Pembayaran & Pendapatan

> Modul ini dipotong 5: **3A** pondasi angka (simpan nominal asli tiap bayar) ·
> **3B** layar `/admin/payments` (ringkasan, tren, tabel, CSV) · **3C** cocokkan &
> cek-ulang · **3D** refund operator (manual + Xendit) · **3E** ajukan-refund
> (pasangan → operator setujui). **Yang butuh Xendit sungguhan (refund otomatis,
> webhook refund, chargeback) hanya bisa dites di sandbox saat go-live** — lihat
> `docs/DEPLOYMENT-CHECKLIST.md`. Yang di bawah ini bisa dites SEKARANG tanpa uang asli.

> **Siapkan bahan:** kamu butuh minimal satu undangan **berbayar manual** (bukan comp,
> karena comp = gratis, tak bisa direfund). Cara cepat: `/admin/invitations` →
> pilih satu draft → **Lunas manual** → nominal `149000`. (Atau **＋ Buat undangan**
> untuk klien dengan Pembayaran = *Lunas manual*.)

**T3.1 — Layar pendapatan (3A+3B)**
1. Buka `/admin` → **Pembayaran** (`/admin/payments`).
2. Kalau muncul kotak merah **“N undangan berbayar belum tercatat nominalnya”** → klik
   **“Isi angka lama”** (di bagian Transaksi) → konfirmasi.
- **Harusnya terlihat:** kartu **Masuk kotor**, **Bersih (kotor − fee)**, **Bulan ini (WIB)**,
  **Direfund**; baris **Xendit / Manual**; **Conversion draft→bayar**; **grafik batang 12 bulan**;
  lalu tabel **Transaksi**. Undangan yang tadi kamu *Lunas manual* muncul: sumber **manual**,
  jumlah **Rp 149.000**, status **lunas**. Comp (mis. `tes-klien-01`) TIDAK menambah kotor.
3. Klik **Ekspor CSV** → file `transaksi-YYYY-MM-DD.csv` terunduh (hanya kolom keuangan, tanpa data tamu).

**T3.2 — Refund langsung oleh operator (3D, jalur manual)**
1. Di tabel Transaksi, cari baris **manual** tadi (status *lunas*) → klik **Refund**.
2. Muncul konfirmasi “tandai refund manual … pastikan sudah transfer balik” → **OK** → isi alasan → OK.
- **Harusnya terlihat:** halaman reload; baris jadi **direfund** (redup), **Masuk kotor turun**,
  **Direfund naik**. Buka `/admin/invitations` → undangan itu **tidak lagi tayang** (refund = produk turun).
  *(Membuktikan: uang balik ⇄ entitlement ikut dibalik.)*
3. *(Reversibel)* mau kembalikan untuk tes lain? Terbitkan lagi via `/admin/invitations` → **Terbitkan**.

**T3.3 — Ajukan refund: pasangan → operator (3E)**
> Butuh login sebagai **klien** (bukan admin). Paling gampang: buat undangan klien berbayar manual
> lewat **＋ Buat undangan** (Pembayaran = Lunas manual), lalu login klien di **jendela incognito**.
1. **Sebagai klien** buka dashboard undangannya → di bawah header ada tautan **“Ajukan pengembalian dana”** → klik.
2. Pilih alasan (mis. *Bayar dobel*), isi rekening tujuan (karena bayar manual) → **Kirim permintaan**.
- **Harusnya terlihat:** “✓ Permintaan … terkirim”.
3. **Sebagai admin** buka `/admin/payments` → panel merah **“Permintaan refund (1)”** di atas.
- **Harusnya terlihat:** baris berisi slug, nominal, alasan, ringkasan pemakaian, dan **badge verdikt**
  (mis. *Masih layak* hijau, atau *Tidak layak — sudah dipakai* merah kalau sudah ada tamu/RSVP).
4. Klik **Setujui** → (manual) konfirmasi → reload.
- **Harusnya terlihat:** permintaan hilang dari panel; transaksinya jadi **direfund**; undangan **tidak tayang**.
  Coba **Tolak** pada permintaan lain → hilang juga (tercatat sebagai ditolak).

**T3.4 — Cocokkan dengan Xendit (3C)**
1. Di `/admin/payments` klik **“Cocokkan sekarang”**.
- **Harusnya terlihat (tanpa pembayaran Xendit nyangkut):** **“✓ Cocok semua…”**. Kalau ada pembayaran
  Xendit yang LUNAS tapi belum masuk (webhook kelewat), muncul barisnya + tombol **Terapkan**.

**T3.5 — Aktivitas mencatat refund**
1. Buka `/admin` → **Aktivitas**.
- **Harusnya terlihat:** entri **“Menyetujui refund …”**, **“Comp/lunas …”**, dll dengan email admin + waktu.

> **Bersih-bersih:** undangan yang direfund jadi tidak tayang — terbitkan lagi atau arsipkan/ hapus
> lewat `/admin/invitations` sesuai kebutuhan.

---

## Modul 4 — Katalog & Tampilan Template

> Dipotong 3: **4A** pondasi DB (tabel `templates` + seed) · **4B** editor "Tampilan"
> di `/admin/templates` (nyala/mati, nama, kategori, tagline, dll) · **4C** halaman
> depan & onboarding baca DB. T4.1–T4.5 satu rangkaian (edit → lihat di depan →
> matikan → nyalakan lagi). Ingat: **mematikan template TIDAK merusak undangan yang
> sudah ada** — cuma menyembunyikan dari halaman depan + pilihan onboarding.

**T4.1 — Halaman editor gabungan**
1. `/admin` → **Template & Harga** (`/admin/templates`).
- **Harusnya terlihat:** tiap template (Lovebirds, Solary) jadi **satu kartu** berisi:
  baris **"N undangan berbayar · pendapatan Rp …"**, bagian **Tampilan** (form + **preview kartu** di kanan),
  lalu bagian **Paket & Harga** (kartu paket seperti Modul 1).

**T4.2 — Edit Tampilan & simpan**
1. Di Lovebirds → ubah **Tagline (ID)** jadi `Sinematik & mewah`, **Tagline (EN)** jadi `Cinematic & luxe`,
   ganti **Warna aksen**, naikkan **Urutan** kalau mau → **Simpan Tampilan**.
- **Harusnya terlihat:** **"Tersimpan ✓"** (hijau) + **preview kartu** ikut berubah. **Refresh** → tetap tersimpan.

**T4.3 — Validasi menolak input ½ jadi**
1. Isi **Tagline (ID)** saja, **Tagline (EN)** dikosongkan → Simpan. → **Harusnya:** merah "Tagline wajib diisi untuk ID dan EN".
2. Isi **Warna aksen** = `merah` (bukan hex) → Simpan. → **Harusnya:** merah "Warna aksen harus hex…".
3. Kosongkan **Nama** → Simpan. → **Harusnya:** merah "Nama template wajib diisi".

**T4.4 — Halaman depan ikut berubah**
1. Buka beranda `/` → bagian **"Coba Vibe"** → template Lovebirds.
- **Harusnya terlihat:** tagline/aksennya = yang barusan kamu simpan di T4.2. *(Kalau masih lama, refresh — ada jeda cache ±1 menit.)*

**T4.5 — Matikan template (reversibel) — bukti tak merusak undangan**
1. Di `/admin/templates` → Solary → **hilangkan centang "Aktif"** → **Simpan Tampilan**.
2. Buka beranda `/` → **Coba Vibe**. → **Harusnya:** Solary **tidak muncul** lagi di carousel (hanya Lovebirds).
3. Buka `/onboarding?template=solary` (atau tombol Beli). → **Harusnya:** pilihan template **tanpa Solary**.
4. **Tapi** buka demo lama `/solary/demo-solary`. → **Harusnya:** **tetap terbuka & jalan** (mematikan hanya menyembunyikan dari etalase, bukan mematikan undangan).
5. Balik ke `/admin/templates` → **centang "Aktif"** Solary lagi → Simpan → beranda: Solary **muncul lagi**.

**T4.6 — Aktivitas mencatat**
1. `/admin` → **Aktivitas**. → **Harusnya:** ada entri **"Ubah tampilan template …"** (tiap simpan Tampilan) dan **"Ubah harga/paket …"** (tiap simpan paket).

---

## Belum dites (belum dibangun) — jangan dicari dulu

- **Refund via Xendit + webhook refund + chargeback (3C/3D)** — perlu **sandbox Xendit** saat
  go-live (aktifkan refund + webhook `refund.succeeded/failed`); ada di `docs/DEPLOYMENT-CHECKLIST.md`.
- **Modul 5** — akun & data (PDP: cari/hapus akun, ekspor data).
