# Go-Live / Deployment Checklist — FinCard

Practical steps to take the app + the admin console to production on
**fincards.land**. Work top-to-bottom; each item says *what to do* and *why*.

> Domain: `fincards.land` (canonical **www.fincards.land**) · Contact + admin
> email: `fincardsland@gmail.com` · Business phone: **belum ada** (needed for
> Midtrans KYC — see below).

---

## 1. Environment variables (set ALL in Vercel → Project → Settings → Environment Variables, "Production")

| Variable | Value / source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page | public |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (service_role) | **secret — never `NEXT_PUBLIC_`** |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fincards.land` | **redeploy after change** (inlined at build) |
| `GUESTS_ENCRYPTION_KEY` | your backed-up key | **secret — see §2** |
| `APP_ENCRYPTION_KEY` | your backed-up key | **secret — see §2** |
| `MIDTRANS_SERVER_KEY` | Midtrans → Settings → Access Keys (**production** `Mid-server-…`) | secret |
| `MIDTRANS_IS_PRODUCTION` | `true` | anything else = sandbox API base |
| `RESEND_API_KEY` | resend.com → API Keys | secret |
| `RESEND_FROM` | e.g. `undangan@fincards.land` | **must be a verified fincards.land sender**, not `resend.dev` |
| `ADMIN_EMAILS` | `fincardsland@gmail.com` | who can enter `/admin` |

Rule: anything secret must **NOT** start with `NEXT_PUBLIC_` (that prefix ships the
value to the browser).

## 2. Encryption keys — the most important thing to protect

Two keys (`GUESTS_ENCRYPTION_KEY`, `APP_ENCRYPTION_KEY`) encrypt ALL personal data
(guest names/phones, gift amounts, bank numbers). They are the **master keys to the
safe**: lose them and every encrypted row is unrecoverable forever.

- [ ] **Back up both keys** in a password manager (out-of-band, not only in Vercel).
- [ ] Use the **same values** in local `.env.local` and Vercel.
- [ ] **Never change them** without a data re-encryption migration.

## 3. Domain (Vercel)

- [ ] `fincards.land` added to the Vercel project; **www.fincards.land** is the
      canonical (apex redirects to www).
- [ ] `NEXT_PUBLIC_SITE_URL=https://www.fincards.land` set → **redeploy** (otherwise
      the Midtrans Snap finish redirect + email links point at the wrong host).

## 4. Midtrans (payments)

- [ ] Switch to **production** Access Keys (`Mid-server-…`, Settings → Access Keys)
      + set `MIDTRANS_IS_PRODUCTION=true`.
- [ ] Midtrans Dashboard → Settings → Configuration → **Payment Notification URL** =
      `https://www.fincards.land/api/payment/midtrans/webhook`. (The same endpoint
      also receives refund + chargeback notifications — module 3.)
- [ ] **Business KYC** — Midtrans requires business verification to go live and to
      disburse refunds. A **business phone** is usually required → obtain one, then
      fill it into the legal docs (§7).
- [ ] Do one **real small live payment** end-to-end before launch.

## 5. Supabase

- [ ] Region `ap-southeast-1` (Singapore) — good for Indonesia. ✓
- [ ] Apply all migrations **in order** (module 0/1 → 2 → 3 → 4 → 5). The build plan
      lists them; each adds tables/columns with RLS = service-role only.
- [ ] Turn on **automatic backups** (money + PII data).
- [ ] For branded auth emails (verify / reset), set Supabase Auth SMTP to Resend +
      customize the templates (optional but nicer than the default).
- [ ] **Verify the `fincards.land` domain in Resend** — add the SPF / DKIM / DMARC
      DNS records Resend gives you — so invite + notification emails don't land in
      spam. Until verified, keep `RESEND_FROM` on `resend.dev`.

## 6. Admin console

- [ ] Create the Supabase Auth user `fincardsland@gmail.com` with a **strong
      password**.
- [ ] **Enrol TOTP MFA** (authenticator app — free). `/admin` requires an
      MFA-verified session.
- [ ] Confirm `ADMIN_EMAILS` contains that email; log in and reach `/admin`.

## 7. Legal + contact

- [ ] Refund / Terms / Privacy show `fincardsland@gmail.com` ✓ and reference
      `fincards.land`.
- [x] **Business phone** in the legal docs is the live FinCards line
      (`0851-1055-3938`), set on WhatsApp + Telepon rows of Terms / Refund / Privacy.

## 8. Pre-launch smoke test

- [ ] Buy a real invitation (small live amount) → it publishes.
- [ ] Add a guest, send a WhatsApp invite, submit an RSVP.
- [ ] Open `/admin` → see the sale in Payments; try comp / suspend on a test row.
- [ ] Trigger a refund request → approve it → confirm the money path.
