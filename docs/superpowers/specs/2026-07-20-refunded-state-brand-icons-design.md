# Refunded-state labeling, refund email revamp, FinCards brand icons — design

Date: 2026-07-20 · Status: approved by owner (chat) · Branch: off `feat/manual-payment-fallback`

Out of scope (owner decision): legal copy updates (`/refund`, `/terms`) — on hold pending
the owner's legal counsel.

## Background

When a refund settles, `reverseEntitlement` unpublishes the invitation and sets
`suspended_at`. The owner then sees the generic `SuspendedNotice` ("ditangguhkan") — wrong
message, and nothing anywhere is labeled "sudah direfund". The refund-decision emails are
bare one-liners. The site has no global favicon at all; the only icon is the per-couple
monogram SVG route. The owner supplied the official FinCards logo
(`C:\Users\arifi\Downloads\Gemini_Generated_Image_huk37hhuk37hhuk3.png`, 2048×2048 rose-gold
script on cream paper) and wants it as the icon of every page, no exceptions.

## Module 1 — "Sudah direfund" status (client + admin)

**Detection (no schema change).** An invitation is *refunded* iff `refunds` has a row with
`status='succeeded'` and `source_type='initial'` for it. New server-only helper
`src/lib/payments/refunded.ts`:

- `fetchRefundedAt(db, invitationId): Promise<string | null>` — single check (dashboard).
- `fetchRefundedMap(db, invitationIds): Promise<Map<string, string>>` — one batched query
  (`.in('invitation_id', ids)`) for profile and admin lists. Value = `confirmed_at`.

Upgrade/addon refunds do NOT mark the invitation refunded (only the initial purchase does);
renewal refunds already map to `source_type='initial'` in the webhook, so they count.

**Client dashboard (full gate — owner picked "Opsi A").** In
`src/app/[template]/[slug]/dashboard/page.tsx`, before the existing suspended check (step
3a): if refunded → render new `RefundedNotice` (new file next to `SuspendedNotice`), showing:

- Title "Undangan ini sudah direfund" + refund date (localized, from `confirmed_at`).
- Copy: dana sudah dikembalikan; undangan dinonaktifkan permanen dan tidak bisa diterbitkan
  ulang; data tidak bisa diubah lagi.
- Link back to `/profile` + a hint that a new invitation can be made from onboarding.
- i18n: add keys to both ID and EN dashboard dictionaries (dict-parity test exists).

Non-refund suspensions keep the existing `SuspendedNotice`. Editor/tabs unreachable —
same gate pattern as `PaymentGate`.

**Profile (`/profile`).** For refunded invitations the card shows a danger-tinted badge
"Sudah direfund" (pill, `--status-danger` scale) and hides pay/renew/upgrade/manage and
`ProfileRefundControl`. The card itself (name, template, plan) stays visible.

**Admin (label only, actions untouched).** "Refunded" badge + date:

- `/admin/invitations` list rows (`InvitationRow`) — via `fetchRefundedMap`.
- `/admin/payments` transactions table — the ledger already loads `refunds`; reuse it to
  badge refunded initial rows (upgrades/addons already display refund state per source).

## Module 2 — Profile refund form parity (bug fix)

Root cause: `ProfileRefundControl` computes `needsDestination = paidSource === 'manual'`
only and never receives `paidChannel`, so Midtrans VA/bank-transfer payers aren't asked for
a destination → server rejects ("Isi bank, nomor rekening…"). It also lacks the dashboard's
bank/e-wallet destination toggle and the pending-state warning copy.

Fix by sharing one source of truth:

1. `src/lib/payments/refund-channels.ts` gains
   `needsRefundDestination(paidSource, paidChannel)` (client-safe, pure) =
   `paidSource === 'manual' || (paidSource === 'midtrans' && !canApiRefund(paidChannel))`.
   `requestRefund` (server), `RefundRequestButton`, and `ProfileRefundControl` all use it.
2. Extract the form fields (reason select, detail textarea, bank/e-wallet toggle +
   destination inputs) into a shared client component
   `src/components/refund/RefundRequestFields.tsx` used by both the dashboard button and
   the profile modal. Presentation shells (inline card vs modal) stay separate.
3. `/profile` page passes `paid_channel` down (add to its invitations select if absent).
4. Pending state in profile shows the same "jangan mengubah undangan / bisa ditolak kalau
   dipakai" warning as the dashboard.

## Module 3 — Refund decision emails

New helper `src/lib/email/refund-emails.ts` exporting
`refundApprovedEmailHtml({ method, amountIDR?, destinationHint? })` and
`refundRejectedEmailHtml({ note? })`; `adminApproveRefund` / `adminRejectRefund` use them
instead of inline HTML. Copy in Bahasa, brand voice (no personal pronouns for the brand,
address reader as "kamu"), structure:

- Branded header: FinCards logo `<img>` (absolute URL
  `${SITE_URL}/images/brand/fincards-logo-email.png`, rendered ~240px wide, retina 480px
  asset), cream background block.
- Approved: konfirmasi disetujui + metode (gateway → "kembali ke metode pembayaran asal,
  estimasi 3–14 hari kerja tergantung channel"; manual → "ditransfer ke rekening yang kamu
  berikan"), catatan undangan dinonaktifkan permanen, kontak bantuan (balas email ini).
- Rejected: empatik, alasan operator (escaped), ajakan balas email untuk diskusi.
- Free text stays HTML-escaped (reuse existing `escapeHtml`).

## Module 4 — FinCards logo as icon everywhere

Assets (generated once by `scripts/generate-brand-icons.mjs` using `sharp`, committed):

- `public/images/brand/fincards-logo.png` — master copy of the source file.
- `public/images/brand/fincards-logo-email.png` — 480px-wide rescale for email.
- `src/app/icon.png` (512×512), `src/app/apple-icon.png` (180×180), `src/app/favicon.ico`
  (16+32+48) — tight square crop centered on the script lettering. Next App Router
  conventions make these the icon for every route automatically.
- Per-invitation icon route `src/app/[template]/[slug]/icon/route.ts`: replaced — now
  returns the FinCards icon PNG (same URL shape, long edge-cache) instead of the couple
  monogram SVG. Owner explicitly chose "semua tanpa terkecuali".

Known accepted tradeoff: at 16–32px the script is not legible; the owner was warned and
still wants the official logo mark everywhere.

## Testing

- Unit (vitest): `fetchRefundedAt`/`fetchRefundedMap` (supabase fake),
  `needsRefundDestination` matrix (manual / midtrans+VA / midtrans+gopay / comp),
  refund email HTML (escaping, method branches).
- Existing suites must stay green: typecheck, vitest (incl. dict parity), `check:tokens`.
- One module-wide manual pass at the end (owner preference): refund an invitation in dev →
  dashboard gate, profile badge, admin badges, email HTML preview, favicon on marketing /
  login / dashboard / admin / invitation pages.
