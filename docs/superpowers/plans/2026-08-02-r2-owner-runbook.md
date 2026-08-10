# Runbook Pemilik — Task 1 & 2 Migrasi R2

> **Untuk AI:** dokumen ini untuk **pemilik**, bukan untuk agent. Saat pemilik meminta
> "kerjakan R2", **tampilkan isi runbook ini apa adanya kepada mereka**, lalu kerjakan Task 3–5
> dari `2026-08-02-r2-media-migration.md` secara paralel. Task 1 & 2 **tidak bisa dikerjakan agent** —
> keduanya butuh login ke Cloudflare dan registrar domain, dan memasukkan kredensial akun bukan
> sesuatu yang boleh dilakukan agent. Jangan mengklaim bisa mengerjakannya.
>
> Setelah pemilik melapor "Task 1 selesai" / "Task 2 selesai", verifikasi dengan perintah di bagian
> **Verifikasi** sebelum melanjutkan ke Task 6.

Dokumen pendamping:
- Desain: [2026-08-02-r2-media-migration-design.md](../specs/2026-08-02-r2-media-migration-design.md)
- Rencana teknis: [2026-08-02-r2-media-migration.md](2026-08-02-r2-media-migration.md)

---

## Yang kamu kerjakan vs yang AI kerjakan

| | Kamu | AI |
|---|---|---|
| Task 1 — pindah DNS | ✅ | ❌ butuh login registrar |
| Task 2 — setup R2 | ✅ | ❌ butuh login Cloudflare |
| Task 3–5 — semua kode | ❌ | ✅ bisa jalan paralel, tidak perlu menunggumu |
| Task 6 — salin file lama | ❌ | ✅ setelah Task 2 selesai |
| Task 7 — cutover | bareng | bareng |

**Task 3–5 tidak menunggu kamu.** Tesnya memakai mock, jadi AI bisa menulis seluruh kodenya sebelum bucket R2 ada.

---

# TASK 1 — Pindah DNS ke Cloudflare

⏱️ **30–45 menit** termasuk menunggu propagasi.

## Kondisi awal (snapshot 2026-08-02)

Ini acuan pembanding. Kalau ada yang berubah sejak tanggal ini, pakai kondisi terbaru.

```
fincards.land        NS     ns1.vercel-dns.com · ns2.vercel-dns.com
fincards.land        A      64.29.17.1 · 216.198.79.65
fincards.land        CAA    0 issue "sectigo.com" · "pki.goog" · "letsencrypt.org"
www                  A      216.198.79.1 · 64.29.17.65
send                 TXT    v=spf1 include:amazonses.com ~all
send                 MX     10 feedback-smtp.ap-northeast-1.amazonses.com
resend._domainkey    TXT    p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDF8v5T101FwrAw47LWJ21X…
```

## ⚠️ Empat record yang berbahaya kalau hilang

| Record | Kalau hilang |
|---|---|
| `send` **TXT** (SPF) | Email masuk spam |
| `send` **MX** | Bounce tidak terlacak |
| `resend._domainkey` **TXT** (DKIM) | **Email ditolak / masuk spam** — string panjang, salin-tempel, jangan diketik |
| `fincards.land` **CAA** | **Sertifikat HTTPS gagal terbit** |

Kegagalan email **tidak terlihat** — situs tetap hidup, jadi kamu bisa tidak sadar berhari-hari. Itu sebabnya ada uji kirim email sungguhan di akhir.

## Langkah

**1.1** Buka Vercel → project → **Settings → Domains → `fincards.land`** → lihat DNS Records.
**Screenshot atau salin semua baris.** Jangan mengandalkan ingatan.

> 🔎 Perhatikan apakah ada record **wildcard** (`*`). Kalau ada, catat — nanti `media` harus menunjuk ke R2, bukan ikut wildcard.

**1.2** Cloudflare → **Add a site** → ketik `fincards.land` → pilih paket **Free**.

**1.3** Cloudflare memindai record lama otomatis. **Cocokkan hasilnya baris per baris** dengan daftar di atas — dokumentasi Cloudflare menyatakan pemindaiannya *"tidak dijamin menemukan semua"*. Yang tidak ada, **tambahkan manual**.

**1.4** Set record `fincards.land` dan `www` ke **"DNS only"** — awan **abu-abu**, bukan oranye.

> Vercel sendiri menyarankan situsnya **jangan** diproksi lewat Cloudflare. Hanya `media` nanti yang oranye.

**1.5** Cloudflare → **SSL/TLS → Overview** → pilih **Full (strict)**.

**1.6** Cloudflare memberi 2 nameserver. Buka **registrar tempat kamu beli domain** → ganti nameserver dari `ns1/ns2.vercel-dns.com` ke milik Cloudflare.

> ⚠️ **JANGAN hapus zona DNS di Vercel.** Itu jalan pulangmu.

**1.7** Tunggu propagasi — biasanya 15 menit sampai 2 jam.

## Verifikasi Task 1

```bash
node -e "['NS','A','CAA'].forEach(t=>fetch('https://dns.google/resolve?name=fincards.land&type='+t).then(r=>r.json()).then(j=>console.log(t.padEnd(5),(j.Answer||[]).map(a=>a.data).join(' | ')||'KOSONG')))"
```
Ditunggu: NS sudah `*.ns.cloudflare.com`, A dan CAA masih terisi.

```bash
node -e "[['send.fincards.land','TXT'],['send.fincards.land','MX'],['resend._domainkey.fincards.land','TXT']].forEach(([n,t])=>fetch('https://dns.google/resolve?name='+n+'&type='+t).then(r=>r.json()).then(j=>console.log(t.padEnd(4),n.padEnd(34),(j.Answer||[]).map(a=>a.data.slice(0,60)).join(' | ')||'❌ HILANG')))"
```
**Ketiganya wajib terisi.** Kalau ada `❌ HILANG`, tambahkan di Cloudflare sebelum lanjut.

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -L https://www.fincards.land/
```
Harus `200`.

**Uji terakhir dan paling penting:** buka `/forgot-password`, minta reset password ke email yang bisa kamu cek. **Emailnya harus benar-benar sampai.** DNS bisa terlihat benar padahal pengiriman rusak.

---

# TASK 2 — Siapkan R2

⏱️ **15 menit.** Baru bisa dimulai setelah Task 1 selesai.

**2.1** Cloudflare → **R2** → **Create bucket** → nama: **`invitation-media`**

> Harus sama persis dengan nama bucket di Supabase, supaya nama file tidak berubah dan skrip penyalin tinggal jalan.

**2.2** Bucket → **Settings → Custom Domains → Connect Domain** → `media.fincards.land`

Cloudflare membuat record DNS-nya sendiri (oranye/proxied). Tunggu status **Active**.

**2.3** Bucket → **Settings → CORS Policy** → tempel:

```json
[
  {
    "AllowedOrigins": [
      "https://www.fincards.land",
      "https://fincards.land",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> ⚠️ Kalau ini terlewat, **semua upload dari browser ditolak** sebelum sampai ke R2.

**2.4** R2 → **Manage R2 API Tokens → Create API Token**
- Permission: **Object Read & Write**
- Scope: **hanya bucket `invitation-media`**

Simpan **Access Key ID** dan **Secret Access Key**. Secret-nya **hanya ditampilkan sekali**.

**2.5** Catat **Account ID** (ada di halaman R2 Overview atau di URL dashboard).

**2.6** Tulis ke `.env.local`:

```bash
R2_ACCOUNT_ID=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=invitation-media
R2_PUBLIC_HOST=https://media.fincards.land
```

> **Jangan** set `MEDIA_REWRITE_LEGACY` dulu — itu sakelar cutover di Task 7.

**2.7** Pasang **metode pembayaran** di Cloudflare.

> Ini bukan karena kamu akan ditagih — jatah gratisnya muat ~1.250 undangan tersimpan dan ~1.650 undangan/bulan lalu lintas. Tapi tanpa kartu, kuota jebol = **layanan dihentikan**. Dengan kartu, kuota jebol = **tagihan puluhan ribu rupiah**. Untuk undangan pelanggan yang sudah bayar, ditagih jauh lebih baik daripada dimatikan.

## Verifikasi Task 2

Upload file kecil apa saja lewat UI bucket, namai `smoke-test.txt`, lalu:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://media.fincards.land/smoke-test.txt
```

Harus `200`. Kalau `404`/`522`, custom domain belum jalan — beresi dulu sebelum AI menyentuh kode. Setelah OK, hapus file itu.

---

# Kalau ada yang salah

**Situs mati atau email rusak:** balikkan nameserver di registrar ke `ns1.vercel-dns.com` dan `ns2.vercel-dns.com`. Zona Vercel masih utuh, semuanya kembali seperti semula.

**Tidak ada yang permanen di Task 1 dan 2.** Bucket R2 yang kosong tidak merusak apa pun kalau ditinggalkan.

---

# Setelah selesai

Bilang ke AI: **"Task 1 selesai"** atau **"Task 2 selesai"**. Kalau ada langkah yang macet, sebutkan nomor langkah dan pesan errornya.

🔒 **Jangan pernah menempelkan Secret Access Key ke chat.** Simpan sendiri di `.env.local`. AI tidak perlu melihatnya, dan memang tidak boleh.
