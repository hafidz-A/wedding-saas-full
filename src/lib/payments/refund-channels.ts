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
