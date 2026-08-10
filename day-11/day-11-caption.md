# Day 11 — Carousel FAQ (Jawab Objection)

**Aset:** [day-11.html](day-11.html) — 6 slide, 1080×1350 (4:5).
Screenshot per slide lewat selector `[data-screen-label]`.

Semua angka di bawah diambil dari `template_plans` (DB produksi) + `BLOCK_SIZE`
di `src/lib/payments/quota.ts` per 2026-08-10. Kalau harga/kuota diubah lewat
`/admin/templates`, caption ini ikut direvisi.

---

## Caption utama

> Lima pertanyaan yang paling sering masuk soal FinCards — dijawab langsung, tanpa muter-muter. Geser 👉
>
> 💰 **Harga** — Basic Rp199.999 (dari Rp299.999), Premium Rp249.999 (dari Rp349.999). Selisihnya cuma Rp50.000, dan itu yang bikin undangan tersimpan seumur hidup.
>
> ⚡ **Proses** — begitu selesai bayar dan isi data, undangan langsung online. Full self-serve, ga pakai antre admin.
>
> ✏️ **Edit** — bisa kapan aja selama masa aktif, tanpa biaya revisi. Baru sadar salah tanggal jam 11 malam? Tinggal benerin sendiri.
>
> 📅 **Masa aktif** — Basic 1 tahun. Premium seumur hidup.
>
> 👥 **Tamu** — Basic sampai 400, Premium sampai 500. Masih kurang? Tambah 50 tamu cuma Rp10.000.
>
> Ada yang belum kejawab? Drop di komen atau DM — dijawab langsung 💬

**Hashtag:**

```
#undangandigital #undangandigitalpernikahan #undangannikah #undanganonline
#undangandigitalpremium #calonpengantin #pernikahan #weddingindonesia
#savethedate #bukutamudigital #qrcheckin #fincards
```

---

## Caption pendek (alt — buat Story / repost)

> 5 pertanyaan yang paling sering ditanya soal FinCards, dijawab langsung 👇
>
> Mulai Rp199.999 · langsung online begitu bayar · edit sendiri tanpa biaya revisi · Premium seumur hidup.
>
> Sisanya ada di carousel. Belum kejawab? DM aja 💬

---

## Caption komentar-pinned (opsional)

Dipakai kalau mau memancing tanya-jawab di kolom komen — pin ini di komentar
pertama begitu posting naik:

> Pertanyaan paling sering nomor berapa yang paling kepikiran buat kamu? Tulis nomornya, dijawab satu-satu 👇

---

## Catatan akurasi (jangan diubah tanpa cek ulang)

| Klaim | Sumber kebenaran |
|---|---|
| Basic Rp199.999 (coret Rp299.999) | `template_plans.price_idr` / `compare_at_price_idr` |
| Premium Rp249.999 (coret Rp349.999) | `template_plans.price_idr` / `compare_at_price_idr` |
| Basic 1 tahun · Premium seumur hidup | `template_plans.duration_days` = 365 / NULL |
| Basic s/d 400 · Premium s/d 500 | `template_plans.base_guest_quota` |
| +50 tamu = Rp10.000 | `BLOCK_SIZE` + `BLOCK_PRICE_IDR` di `src/lib/payments/quota.ts` |
| "langsung online begitu bayar" | webhook Midtrans set `is_paid` + `is_published` (`src/lib/payments/publish.ts`) |
| "ga pakai antre admin" | `app_settings.payment.mode = "gateway"` (bukan `manual`) |

**⚠️ Blok add-on lagi mau naik dari 50 → 100 tamu** (perubahan masih di working
tree, belum di-commit, dan migrasi `2026-08-06_guest_quota_400_500_block_100.sql`
masih untracked). Caption + slide 6 sekarang pakai **50** karena itu yang berlaku
di produksi. Begitu perubahan itu ter-deploy, ganti jadi **+100 tamu = Rp10.000**
di dua tempat: slide 6 aset ini dan tabel di atas.

**Aturan copy:** nol kata ganti orang (tanpa gue/saya/kami), pembaca disapa
"kamu". Dilarang menulis "coba gratis" / "bikin dulu bayar belakangan" — editor
terkunci `PaymentGate` sampai dibayar.
