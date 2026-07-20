/**
 * Which Midtrans payment channels support the direct Refund API.
 * Everything else (notably bank_transfer/VA, echannel, cstore) can only be
 * refunded by a manual bank transfer recorded in the admin console.
 * Client-safe: no secrets — the dashboard RefundRequestButton imports this.
 * Source: docs.midtrans.com "Refund transaction is supported only for …".
 */
export const API_REFUNDABLE_CHANNELS = [
  'credit_card', 'gopay', 'shopeepay', 'dana', 'ovo', 'qris', 'kredivo', 'akulaku',
] as const

export function canApiRefund(paymentType: string | null | undefined): boolean {
  return !!paymentType && (API_REFUNDABLE_CHANNELS as readonly string[]).includes(paymentType)
}

/**
 * True when refund money cannot go back automatically, so the couple must
 * supply a destination account up front: manual/offline payments, and
 * Midtrans channels without Direct Refund API support (VA / bank transfer).
 * Single source of truth for requestRefund (server) and both refund forms.
 */
export function needsRefundDestination(
  paidSource: string | null | undefined,
  paidChannel: string | null | undefined,
): boolean {
  if (paidSource === 'manual') return true
  return paidSource === 'midtrans' && !canApiRefund(paidChannel)
}
