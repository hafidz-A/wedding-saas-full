# OTP Auth Setup: Resend → Supabase → Vercel

Step-by-step setup untuk auth flow yang lengkap, dari Resend dulu, lalu Supabase, lalu deploy.

---

## A. Setup Resend (paling sering jadi pain point)

### A.1 Buat API key yang benar

1. Buka https://resend.com/api-keys
2. Klik **"Create API Key"**
3. **Name**: `wedding-saas-prod` (atau apapun)
4. **Permission**: **Full access** ← penting, jangan pilih "Sending access" yang scoped
5. **Domain**: pilih **"All domains"** ← biar bisa kirim dari `onboarding@resend.dev` juga
6. Klik **Create**
7. **Copy** API key yang muncul (cuma sekali kelihatan!) — formatnya `re_xxxx...`
8. Replace `RESEND_API_KEY` di `.env.local` dengan yang baru ini

### A.2 Verifikasi sender — pilih SALAH SATU

**Opsi 1 (cepat, untuk testing):** Pakai `onboarding@resend.dev` — sender default Resend, tidak perlu verify domain. **Tapi**: di Resend free tier, kamu cuma bisa kirim ke email yang sama dengan email akun Resend kamu. Cek di **Resend dashboard → Settings → Account** apakah email-nya sama dengan yang mau kamu daftarin di signup.

**Opsi 2 (production-ready):** Verify domain kamu sendiri.
1. Resend → **Domains** → **Add Domain**
2. Masukkan domain kamu (mis. `kawinin.id`)
3. Resend kasih DNS records (TXT, MX, CNAME)
4. Tambahin ke DNS provider domain kamu (Cloudflare/Namecheap/dll)
5. Tunggu Resend verify (biasanya < 5 menit)
6. Setelah verified, kamu bisa kirim dari `noreply@kawinin.id` ke email **manapun**

### A.3 Test API key

Sebelum lanjut, pastikan API key beneran jalan:

```powershell
# di PowerShell project root
$env:RESEND_API_KEY = "re_xxxx..."  # paste key baru
curl -X POST 'https://api.resend.com/emails' `
  -H "Authorization: Bearer $env:RESEND_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{ "from": "onboarding@resend.dev", "to": "EMAIL_AKUN_RESEND_KAMU@gmail.com", "subject": "Test", "html": "Halo" }'
```

Kalau response 200 + ada `id` → key valid ✓
Kalau response 4xx → baca error message, biasanya jelas (key invalid / domain not verified / quota habis).

---

## B. Setup Supabase Custom SMTP

### B.1 Konfigurasi SMTP

**Supabase Dashboard → Project Settings → Auth → SMTP Settings** → toggle **Enable Custom SMTP**.

| Field | Value |
|---|---|
| Sender email | `onboarding@resend.dev` *(atau domain kamu sendiri kalau udah verified di A.2 Opsi 2)* |
| Sender name | `Wedding Invitation` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Minimum interval per user | `0` |
| Username | `resend` |
| Password | `re_xxxx...` *(API key dari A.1)* |

Klik **Save changes**.

### B.2 Update email template "Confirm signup"

**Authentication → Email Templates → "Confirm signup"** → ganti Subject + Body:

**Subject:**
```
Kode verifikasi - {{ .SiteURL }}
```

**Body (Source mode, hapus existing content):**
```html
<h2>Verifikasi email kamu</h2>
<p>Halo,</p>
<p>Kode verifikasi 6 digit untuk daftar akun:</p>
<h1 style="font-family: monospace; letter-spacing: 0.3em; font-size: 36px; background: #f5efe3; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">{{ .Token }}</h1>
<p>Masukkan kode ini di halaman verifikasi. Kode berlaku 1 jam.</p>
<p style="color: #999; font-size: 12px; margin-top: 32px;">
  Kalau kamu tidak meminta ini, abaikan email ini.
</p>
```

**Save**.

### B.3 (Optional) Update template "Reset Password"

Sama caranya, ganti dengan body mirip yang di atas tapi judul "Reset password".

### B.4 Test email kirim

1. `npm run dev`
2. Buka `http://localhost:3000/signup`
3. Daftar pakai **email yang sama dengan akun Resend kamu** (kalau A.2 Opsi 1) atau email manapun (kalau A.2 Opsi 2)
4. Cek **Resend logs**: https://resend.com/emails — harus muncul entry baru
5. Cek **email inbox + spam** — kode 6 digit harus masuk

Kalau Resend logs gak muncul entry sama sekali → SMTP Supabase config salah (cek password lagi)
Kalau Resend logs status "Failed" → klik entry-nya, baca error spesifik
Kalau Resend logs status "Delivered" tapi email gak masuk → cek spam folder

---

## C. Deploy ke Vercel

### C.1 Push ke GitHub

Sudah otomatis kalau kamu pakai `git push`. Project ini udah di `github.com/hafidz-A/wedding_invitation_1`.

### C.2 Import ke Vercel

1. Buka https://vercel.com/new
2. Login dengan GitHub
3. Pilih repo `wedding_invitation_1`
4. Vercel auto-detect: **Framework: Next.js** ← biarkan
5. **JANGAN klik Deploy dulu** — set env vars dulu (langkah berikutnya)

### C.3 Set environment variables

Di Vercel project page → **Settings → Environment Variables**. Paste satu-satu dari `.env.local`:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uknpuynhixrdqgsgmynl.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_V51YMkYIgTkWZEleYlMLHw_JmhfOItF` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` *(value lengkap dari .env.local)* | Production, Preview, Development |
| `ADMIN_SESSION_SECRET` | `0ff1bd61b...` | Production, Preview, Development |
| `RESEND_API_KEY` | `re_xxxx...` *(yang baru dari A.1)* | Production, Preview, Development |
| `RESEND_FROM` | `onboarding@resend.dev` | Production, Preview, Development |
| `GUESTS_ENCRYPTION_KEY` | `1LA0OGAvEeRQVZc0S3PGVYjJlXZG89mF/gn97p05gYg=` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-url>` *(ganti setelah deploy)* | Production |

⚠️ **PENTING:**
- `GUESTS_ENCRYPTION_KEY` harus **EXACT SAMA** dengan yang di `.env.local`. Kalau beda, data tamu yang udah di-encrypt di lokal gak bisa di-decrypt di production.
- `SUPABASE_SERVICE_ROLE_KEY` dan `RESEND_API_KEY` — **JANGAN** centang "Expose to client" (server-only).

### C.4 Deploy

Klik **Deploy** di Vercel. Tunggu ~2 menit. Vercel akan kasih URL `https://wedding-invitation-1-xxxx.vercel.app`.

### C.5 Update Supabase URL Configuration

Setelah deploy berhasil, kembali ke **Supabase Dashboard → Authentication → URL Configuration**:

| Field | Value |
|---|---|
| Site URL | `https://wedding-invitation-1-xxxx.vercel.app` *(URL dari Vercel)* |
| Redirect URLs (additional) | `http://localhost:3000/**` *(buat dev)* + `https://wedding-invitation-1-xxxx.vercel.app/**` |

**Save**.

### C.6 Update `NEXT_PUBLIC_SITE_URL` di Vercel

Kembali ke Vercel → Settings → Environment Variables → edit `NEXT_PUBLIC_SITE_URL` ke URL Vercel kamu. Klik **Redeploy** di Deployments tab supaya env baru ter-pickup.

### C.7 Apply DB migration di Supabase production

**Supabase Dashboard → SQL Editor → New query** → paste isi `supabase/migrations/20260527_guests.sql` → Run.

Verify: `select count(*) from guests;` harus return `0`.

### C.8 Test end-to-end di production

1. Buka URL Vercel kamu
2. Klik **"Book Invitation Wedding"** → `/signup`
3. Daftar pakai email + password
4. Cek email → kode 6 digit
5. Paste di `/verify-signup`
6. Onboarding → isi 5 field
7. Preview undangan → buka di tab baru
8. Dashboard → cek tab "Tamu" → bisa add guest

Done.

---

## D. Custom domain (`www.fincards.land`)

Domain sudah nempel di Vercel dan production live di `https://www.fincards.land`.
Setelah domain aktif, **semua URL canonical harus pakai `www`** — jangan campur apex
(`fincards.land`) dan `www`, nanti cookie/redirect bisa mismatch. Set apex →
redirect 308 ke `www` di Vercel → Settings → Domains.

Checklist yang HARUS diselaraskan ke domain baru:

### D.1 Vercel env
- `NEXT_PUBLIC_SITE_URL` = `https://www.fincards.land` (Production).
  NEXT_PUBLIC_* di-inline saat build → **Redeploy** setelah diubah.

### D.2 Supabase → Authentication → URL Configuration
| Field | Value |
|---|---|
| Site URL | `https://www.fincards.land` |
| Redirect URLs | `https://www.fincards.land/**` + `http://localhost:3000/**` (dev) |

Tanpa ini, link konfirmasi/reset di email ditolak Supabase.

### D.3 Midtrans (mode LIVE)
- Payment Notification URL → `https://www.fincards.land/api/payment/midtrans/webhook`
  (Dashboard → Settings → Configuration).
- `MIDTRANS_SERVER_KEY` = production Server Key (`Mid-server-...`, dari Settings →
  Access Keys), `MIDTRANS_IS_PRODUCTION=true`.
- Redirect finish Snap otomatis ikut `NEXT_PUBLIC_SITE_URL` lewat
  `src/lib/site-url.ts` — tidak perlu hardcode.

### D.4 Resend (email branded)
- Domains → Add Domain `fincards.land` → pasang DNS (SPF/DKIM/DMARC).
- Setelah verified: `RESEND_FROM` → `noreply@fincards.land`, dan update Sender
  email di Supabase Custom SMTP (B.1) ke alamat yang sama.

### D.5 Verifikasi
- `https://www.fincards.land/robots.txt` & `/sitemap.xml` → host = www.fincards.land.
- Signup akun baru → link email mengarah ke www.fincards.land (bukan localhost/.vercel.app).
- Checkout Midtrans kecil → webhook menandai paid.

> Catatan kode: tidak ada localhost yang di-hardcode di jalur produksi. Fallback
> `'http://localhost:3000'` di `layout.tsx`, `sitemap.ts`, `robots.ts` hanya
> aktif kalau `NEXT_PUBLIC_SITE_URL` kosong — di Vercel var ini selalu di-set.

---

## Troubleshooting "Error sending confirmation email" (HTTP 500)

Kalau error ini muncul saat klik "Daftar":

1. **Resend logs kosong** → SMTP password (API key) salah. Bikin API key baru di Resend dengan **Full access + All domains**, replace di Supabase SMTP settings.

2. **Resend logs Status "Failed - 422"** → sender email gak verified. Kalau pakai domain sendiri (kawinin.id), pastikan domain verified di Resend. Atau ganti sender ke `onboarding@resend.dev`.

3. **Resend logs Status "Failed - You can only send testing emails to your own email address"** → Resend lagi di test mode. Kamu pakai akun baru, cuma bisa kirim ke email yang dipakai daftar Resend. Workaround: daftar di app pakai email yang sama dengan akun Resend, ATAU verify domain dulu (A.2 Opsi 2).

4. **Resend logs Status "Delivered" tapi email gak masuk** → cek spam folder. Tambahin sender ke contacts kamu.

5. **Semua benar tapi tetap error** → cek Supabase logs: **Project → Logs → Auth Logs** → cari error message dari signup attempt. Biasanya kasih clue lebih spesifik.
