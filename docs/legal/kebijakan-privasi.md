# Kebijakan Privasi

> **DRAF — wajib ditinjau oleh penasihat hukum sebelum dipublikasikan.**
> Mengacu pada UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
> Ganti placeholder `[…]`. Tanggal berlaku: `[TANGGAL]`.

## 1. Pengendali Data
`[NAMA USAHA]`, `[ALAMAT]`, kontak `[EMAIL]`, bertindak sebagai **Pengendali Data Pribadi** untuk Layanan undangan digital di `[DOMAIN]`.

## 2. Data yang Kami Proses
**Dari Pengguna (pemesan):**
- Identitas akun: email, kata sandi (disimpan dalam bentuk hash, tidak pernah polos).
- Data acara: nama pasangan, tanggal, lokasi, dan konten yang Anda isi.
- Data rekening bank / e-wallet untuk fitur hadiah (**dienkripsi** saat disimpan).
- Metadata pembayaran dari Xendit (status, ID transaksi). Kami **tidak** menyimpan nomor kartu.

**Dari Tamu:**
- Nama, kehadiran (RSVP), pesan/ucapan, konfirmasi hadiah, nomor WhatsApp (jika diisi).
- Data sensitif Tamu (nama, telepon, catatan, RSVP, konfirmasi hadiah) **dienkripsi** saat disimpan (AES-256-GCM).

**Teknis:** alamat IP, jenis perangkat/peramban, dan log akses untuk keamanan & pencegahan penyalahgunaan.

## 3. Dasar & Tujuan Pemrosesan
- **Pelaksanaan kontrak:** menayangkan undangan dan mengumpulkan RSVP/ucapan/hadiah.
- **Kepentingan sah:** keamanan, pencegahan abuse (rate limiting), pencegahan penipuan.
- **Persetujuan:** untuk data yang Anda/Tamu berikan secara sukarela.
- **Kewajiban hukum:** penyimpanan catatan transaksi bila diwajibkan.

## 4. Persetujuan Tamu
Saat **Anda (Pengguna) memasukkan data Tamu**, Anda menyatakan telah memperoleh izin Tamu tersebut. Saat **Tamu mengisi sendiri** formulir RSVP/ucapan, pengisian dianggap sebagai persetujuan pemrosesan untuk tujuan acara.

## 5. Pembagian Data ke Pihak Ketiga (Prosesor)
- **Xendit** — pemrosesan pembayaran.
- **Supabase** — basis data & penyimpanan berkas.
- **Vercel** — hosting aplikasi.
- **Resend** — pengiriman email transaksional.

Kami tidak menjual data pribadi. Pemrosesan oleh pihak ketiga tunduk pada kebijakan masing-masing.

## 6. Penyimpanan & Retensi
- Data undangan & Tamu disimpan selama masa aktif undangan dan `[X HARI]` setelahnya, lalu dapat dihapus/dianonimkan.
- Catatan transaksi disimpan sesuai kewajiban hukum/akuntansi.
- Permintaan penghapusan lebih awal: lihat §8.

## 7. Keamanan
Kami menerapkan enkripsi data sensitif saat disimpan, hash kata sandi, akses basis data terbatas (service role), pembatasan laju (rate limiting), serta sesi dengan batas idle. Tidak ada sistem yang 100% aman; kami berupaya secara wajar melindungi data Anda.

## 8. Hak Subjek Data (Pengguna & Tamu)
Sesuai UU PDP, Anda berhak: mengakses, memperbaiki, menghapus, menarik persetujuan, membatasi/menolak pemrosesan, dan memperoleh salinan data. Ajukan ke `[EMAIL PRIVASI]`; kami merespons dalam waktu wajar sesuai ketentuan.

## 9. Insiden Data
Bila terjadi kebocoran yang berisiko terhadap subjek data, kami akan memberitahukan pihak terdampak dan otoritas terkait sesuai ketentuan UU PDP.

## 10. Anak di Bawah Umur
Layanan tidak ditujukan untuk pengguna di bawah `[UMUR]` tahun.

## 11. Perubahan Kebijakan
Kebijakan dapat diperbarui; versi terbaru berlaku sejak dipublikasikan.

## 12. Kontak Pelindungan Data
`[NAMA/EMAIL PETUGAS/KONTAK PDP]`.
