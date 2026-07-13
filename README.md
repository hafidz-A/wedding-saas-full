# FinCards — Next.js

Multi-tenant SaaS undangan pernikahan digital. **Beberapa** template cinematic, banyak pasangan — tiap
pasangan punya URL slug, akun pemilik, dashboard editor, dan database RSVP / Gift / Tamu sendiri.
Model bisnis: **self-serve, bayar sekali** (couple daftar → pilih template → edit preview gratis →
bayar via Xendit untuk terbit).

```
fincards.land/                          ← marketing
fincards.land/signup · /login           ← akun pemilik (Supabase Auth)
fincards.land/onboarding                ← pilih template + slug + data → buat draft
fincards.land/[template]/[slug]         ← undangan publik (mis. /lovebirds/adi-rani)
fincards.land/[template]/[slug]/dashboard ← editor + data (khusus pemilik)
fincards.land/[template]/[slug]/checkin ← check-in QR/manual (buku tamu, Premium)
fincards.land/admin                     ← konsol operator (allowlist email)
```

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| UI | CSS Modules + CSS variables (tanpa Tailwind/UI library) |
| Animasi | motion 12 + GSAP 3.15 + lenis; Solary + three.js |
| Backend | Supabase (Postgres + Storage + RLS) |
| Auth | Supabase Auth (email+password, verifikasi email, reset password, MFA TOTP opsional) |
| Payments | Xendit (invoice + webhook) |
| Email | Resend |
| Hosting | Vercel |

> Arsitektur multi-template dijelaskan lengkap di [tutorial-multi.md](tutorial-multi.md).
> Konteks arsitektur untuk sesi Claude: [CLAUDE.md](CLAUDE.md).

---

## First-time setup

### 1. Install

```powershell
npm install
```

### 2. Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan `supabase/schema.sql` (base), lalu **semua** file di
   `supabase/migrations/` **berurutan sesuai tanggal**. (Base saja tidak cukup — kolom seperti
   `owner_user_id`, `is_paid`, `xendit_*`, kolom `*_enc`, tabel `guests`/`attendances`/`template_plans`/
   `refund_requests` semuanya datang dari migration.)
3. **Storage** → pastikan bucket `invitation-media` ada + public (dibuat oleh `schema.sql`).
4. Isi harga tiap template di tabel `template_plans` (atau lewat `/admin` → Templates → Plans).

### 3. Resend (email reset password / notifikasi)

Sign up di [resend.com](https://resend.com) → API Keys → Create. (Opsional untuk dev — lihat catatan di
`.env.local.example`.)

### 4. `.env.local`

```powershell
cp .env.local.example .env.local
```

Isi (lihat komentar di file example untuk cara dapat tiap nilai):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # server-only

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # production: https://www.fincards.land

# Enkripsi data-at-rest (WAJIB — tanpa ini RSVP/gift/tamu tak bisa didekripsi)
APP_ENCRYPTION_KEY=...        # 32-byte hex, untuk config PII + RSVP/gift
GUESTS_ENCRYPTION_KEY=...     # 32-byte hex, untuk tabel guests + token RSVP

# Pembayaran (Xendit)
XENDIT_SECRET_KEY=...
XENDIT_CALLBACK_TOKEN=...     # verifikasi webhook

# Konsol admin — email yang boleh buka /admin (pisahkan koma)
ADMIN_EMAILS=you@example.com

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev
```

Generate kunci hex cepat: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 5. Jalankan

```powershell
npm run dev
```

- Marketing: http://localhost:3000
- Demo undangan (tanpa DB row): http://localhost:3000/lovebirds/demo-lovebirds · /solary/demo-solary

---

## 📖 SOP operator (untuk Anda sebagai pemilik SaaS)

### A. Alur normal: pasangan mendaftar sendiri (self-serve)

Ini jalur utama — **Anda tidak perlu melakukan apa-apa** untuk onboarding biasa:

1. Pasangan **/signup** (buat akun, verifikasi email).
2. **/onboarding** — pilih template, slug, isi nama + tanggal + venue, pilih plan (+ kuota tamu ekstra).
   Sistem membuat **draft belum bayar**.
3. Mereka edit preview gratis di dashboard, lalu **bayar via Xendit** untuk menerbitkan.
4. Webhook Xendit otomatis mem-*publish*. (Kalau webhook telat, tombol "Saya sudah bayar — cek ulang"
   di dashboard memaksa verifikasi ulang.)

### B. Onboarding manual / undangan gratis (comp)

Untuk kasus khusus (giveaway, testing, bantu customer non-teknis), pakai salah satu:

- **CLI:**
  ```powershell
  node scripts/create-invitation.mjs budi-sari pass123aman `
    --bride="Sari Wulandari" --groom="Budi Hartono" `
    --date=2026-08-20T16:00 --venue="Hotel Grand Hyatt, Jakarta" `
    --email=budi.hartono@gmail.com --plan=premium `
    --template=lovebirds --full
  ```
  Script ini membuat **akun Supabase Auth** (email + password) lalu insert invitation dengan
  `owner_user_id` ke akun itu. Flag `--full` = seed 14 section penuh (Lovebirds); tanpa `--full` = 6
  section starter.
- **UI admin:** `/admin` → Invitations → **New** (buat comp invitation dari konsol).

### C. Yang bisa dilakukan pasangan sendiri (tanpa Anda)

Edit semua teks & foto (upload ke Supabase Storage), reorder section (drag-drop), atur palette/ornament/
musik/meta, kelola tamu (import CSV, kirim link WhatsApp), lihat RSVP/Gift + export CSV, buku tamu +
QR check-in (Premium), reset password sendiri via **/forgot-password**, kelola akun & data di **/profile**.

### D. Customer support recipes

- **"Lupa password"** → arahkan ke **/forgot-password** (Supabase Auth kirim email reset). Auth sekarang
  berbasis akun Supabase, **bukan** lagi password per-slug/bcrypt.
- **"Save gagal di dashboard"** → DevTools → Network → cek `PUT /api/invitation/<slug>/config`:
  401/403 = sesi login habis (login ulang); 409 = ada tab lain menyimpan (banner reload muncul); 500 =
  cek log server / Vercel.
- **"Upload foto gagal"** → file < 5 MB, format JPG/PNG/GIF/WEBP, bucket `invitation-media` masih ada +
  public, quota Storage belum penuh.
- **"Ganti email pemilik"** → Supabase → Auth (user) + kolom `invitations.email`.
- **"Refund / batal"** → pasangan ajukan lewat dashboard/`/refund`; Anda putuskan di `/admin` → Payments
  → Refund requests (operator yang memutuskan, bukan otomatis). Takedown cepat: `/admin` set
  `suspended_at` (sembunyikan halaman dari semua orang).
- **"Perpanjang / upgrade / tambah kuota tamu"** → dari dashboard pasangan sendiri (checkout Xendit
  terpisah: renewal, upgrade pay-the-difference ke Premium, add-on kuota per blok 50 tamu).

### E. Data & monitoring (SQL cepat)

```sql
-- Semua undangan
select slug, template_id, plan, is_paid, is_published, expires_at, created_at
from invitations order by created_at desc;

-- RSVP / gift / tamu per undangan (kolom PII terenkripsi di DB — angka agregat aman dilihat)
select i.slug,
       count(distinct r.id) as rsvp, count(distinct g.id) as gifts, count(distinct gu.id) as guests
from invitations i
left join rsvps r on r.invitation_id = i.id
left join gift_confirmations g on g.invitation_id = i.id
left join guests gu on gu.invitation_id = i.id
group by i.slug order by rsvp desc;
```

Sebagian besar tugas monitoring/revenue kini ada di **/admin** (Invitations, Payments & revenue,
Activity). Cek quota service di dashboard masing-masing (Supabase Usage, Resend, Vercel, Xendit).

### F. Harga & plan

Harga **tidak** di-hardcode — tersimpan di tabel `template_plans` per template, diedit lewat `/admin` →
Templates → Plans. Plan: `basic` / `premium`; **Premium** membuka buku tamu (ledger kehadiran + QR
check-in). `duration_days` NULL = seumur hidup, N = aktif N hari lalu perlu diperpanjang.

---

## Project structure

```
wedding-saas-next/
├── src/
│   ├── app/
│   │   ├── page.tsx · layout.tsx                 ← marketing
│   │   ├── signup · login · verify-signup · forgot-password · reset-password
│   │   ├── onboarding · profile · terms · privacy · refund
│   │   ├── [template]/[slug]/                    ← undangan publik + phone-frame
│   │   │   ├── page.tsx · InvitationView.tsx
│   │   │   ├── checkin/                          ← QR / manual check-in
│   │   │   └── dashboard/                        ← editor + tab RSVP/Gifts/Guests/BukuTamu/Tutorial + PaymentGate
│   │   ├── admin/                                ← konsol operator
│   │   └── api/                                  ← rsvp, gift, guestbook, checkin, upload, auth/*, payment/xendit/webhook, invitation/[slug]/{config,publish,meta,music,theme}
│   ├── all-templates/<id>/                       ← lovebirds, solary (sections/config/Shell)
│   ├── config/                                   ← templateIndex.js, templateCatalog.js
│   ├── editor/                                   ← block editor (schemas, fields, EditorRoot)
│   ├── lib/                                      ← supabase, auth, crypto, guests, payments, admin, i18n, email, security …
│   └── components/ · hooks/ · styles/ · utils/
├── scripts/                                      ← create-invitation, seed-full-config, capture, diag-*, backfill/encrypt
└── supabase/                                     ← schema.sql (base) + migrations/ (30+ .sql)
```

---

## Deploy ke Vercel

1. Push repo ke GitHub → Import di Vercel.
2. Tambah **semua** env var (sama seperti `.env.local`, termasuk kunci enkripsi & Xendit).
3. Set `NEXT_PUBLIC_SITE_URL` ke URL production (penting untuk OG tag, link reset, dan URL sukses/gagal
   Xendit).
4. Set webhook Xendit ke `https://<domain>/api/payment/xendit/webhook` dengan callback token yang sama
   dengan `XENDIT_CALLBACK_TOKEN`.
5. (Opsional) custom domain di Vercel → Domains.

---

## Testing

```powershell
npm run typecheck        # tsc --noEmit
npm run test             # vitest (unit + integrasi)
npm run test:e2e         # Playwright
npm run test:all         # typecheck + unit + e2e
npm run check:tokens     # guardrail design token
npm run verify:security  # enkripsi PII at-rest + RLS anon = 0 baris
```

Kontrak cakupan: [TEST-MATRIX.md](TEST-MATRIX.md) · laporan: [TEST-REPORT.md](TEST-REPORT.md) · bug produk
nyata: [BUG-LEDGER.md](BUG-LEDGER.md).
