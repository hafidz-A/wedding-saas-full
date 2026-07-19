import type { PaymentSettings, PaymentMode } from './payment-settings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Pure validator for the admin payment-mode patch. Lives in a plain module (NOT
 * the `'use server'` actions file, whose every export must be async) so it can be
 * a synchronous, unit-testable function. `gateway` allows blank contacts (Midtrans
 * doesn't need them). `manual` requires a WhatsApp number (digits only, a leading
 * `0` normalized to the `62` country code — mirrors how a business line is usually
 * typed locally) and a plausible email, since both are the only hand-off channels
 * once the gateway is bypassed.
 */
export function validatePaymentPatch(
  input: unknown,
): { ok: true; value: PaymentSettings } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Data tidak valid' }
  const v = input as Record<string, unknown>
  const mode = v.mode
  if (mode !== 'gateway' && mode !== 'manual') return { ok: false, error: 'Mode pembayaran tidak dikenal' }

  const rawWhatsapp = typeof v.whatsapp === 'string' ? v.whatsapp : ''
  const rawEmail = typeof v.email === 'string' ? v.email : ''

  if (mode === 'gateway') {
    return { ok: true, value: { mode, whatsapp: rawWhatsapp.trim(), email: rawEmail.trim() } }
  }

  let whatsapp = rawWhatsapp.replace(/\D/g, '')
  if (whatsapp.startsWith('0')) whatsapp = `62${whatsapp.slice(1)}`
  if (!whatsapp) return { ok: false, error: 'Nomor WhatsApp wajib diisi' }

  const email = rawEmail.trim()
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Format email tidak valid' }

  return { ok: true, value: { mode: mode as PaymentMode, whatsapp, email } }
}
