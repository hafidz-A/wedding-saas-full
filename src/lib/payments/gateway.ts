/**
 * Midtrans gateway wrapper (Snap redirect + Core API v2) + webhook signature
 * verification. SERVER ONLY — never import from a 'use client' file (uses the
 * server key). Client-safe channel helpers live in ./refund-channels.ts.
 *
 * Replaces the former Xendit wrapper. Key differences from Xendit:
 *  - everything is keyed by OUR order_id (not the gateway's invoice id);
 *  - webhook auth = sha512 signature_key (no callback-token header);
 *  - gross_amount arrives as a decimal string ("149000.00").
 */
import { createHash } from 'crypto'
import { timingSafeStrEqual } from '@/lib/security/timing'

export { canApiRefund, API_REFUNDABLE_CHANNELS } from './refund-channels'

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key) throw new Error('MIDTRANS_SERVER_KEY is not set')
  return key
}
const authHeader = () => `Basic ${Buffer.from(`${serverKey()}:`).toString('base64')}`
const isProd = () => process.env.MIDTRANS_IS_PRODUCTION === 'true'
const snapBase = () => (isProd() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com')
const coreBase = () => (isProd() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com')

/**
 * Mint an order id: `<prefix>_<uuid>_<epochMs base36>` = 49 chars, inside
 * Midtrans's 50-char limit and its [A-Za-z0-9._~-] charset. The timestamp is
 * only a uniqueness salt (never parsed back), so base36 is free. The UUID
 * contains hyphens but never underscores, so splitting on `_` is unambiguous.
 */
export function mintOrderId(
  prefix: 'inv' | 'ren' | 'upg' | 'qta',
  invitationId: string,
  nowMs: number = Date.now(),
): string {
  return `${prefix}_${invitationId}_${nowMs.toString(36)}`
}

/** Invitation id embedded in an `inv_` order id; null for any other shape. */
export function invitationIdFromOrderId(orderId: string | undefined | null): string | null {
  if (!orderId || !orderId.startsWith('inv_')) return null
  const parts = orderId.split('_') // ['inv', '<uuid>', '<salt>']
  if (parts.length < 3) return null
  return parts[1] && parts[1].length > 0 ? parts[1] : null
}

/** Invitation id embedded in a `ren_` (renewal) order id; null otherwise. */
export function renewalIdFromOrderId(orderId: string | undefined | null): string | null {
  if (!orderId || !orderId.startsWith('ren_')) return null
  const parts = orderId.split('_')
  if (parts.length < 3) return null
  return parts[1] && parts[1].length > 0 ? parts[1] : null
}

/** Midtrans reports money as decimal strings ("149000.00") — normalize to int IDR. */
export function parseGrossAmount(x: unknown): number {
  const n = Number(x)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

/**
 * Whether a Midtrans transaction_status counts as successfully paid.
 * `settlement` = money received. `capture` (cards) = paid, but only when
 * fraud_status is absent or 'accept' — 'challenge' must NOT publish.
 */
export function isPaidStatus(status: string, fraudStatus?: string | null): boolean {
  if (status === 'settlement') return true
  return status === 'capture' && (fraudStatus == null || fraudStatus === 'accept')
}

/**
 * Verify a webhook notification's signature_key:
 * sha512(order_id + status_code + gross_amount + SERVER_KEY).
 * This is the ONLY authentication Midtrans notifications carry.
 */
export function verifySignature(b: {
  order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string
}): boolean {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key || !b.order_id || !b.status_code || !b.gross_amount || !b.signature_key) return false
  const expected = createHash('sha512')
    .update(`${b.order_id}${b.status_code}${b.gross_amount}${key}`)
    .digest('hex')
  return timingSafeStrEqual(expected, b.signature_key)
}

export interface SnapTransactionArgs {
  orderId: string
  amountIDR: number
  payerEmail?: string
  /** Shown on the Snap page + Midtrans dashboard (≤50 chars enforced here). */
  itemName: string
  /** Where Snap redirects after a FINISHED payment (success path). */
  finishUrl: string
}

/**
 * Create a Snap transaction and return the hosted-payment redirect URL —
 * the drop-in replacement for the old hosted Xendit invoice URL.
 */
export async function createSnapTransaction(
  a: SnapTransactionArgs,
): Promise<{ token: string; redirectUrl: string }> {
  const res = await fetch(`${snapBase()}/snap/v1/transactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: authHeader() },
    body: JSON.stringify({
      transaction_details: { order_id: a.orderId, gross_amount: a.amountIDR },
      item_details: [{ id: a.orderId.slice(0, 8), price: a.amountIDR, quantity: 1, name: a.itemName.slice(0, 50) }],
      ...(a.payerEmail ? { customer_details: { email: a.payerEmail } } : {}),
      callbacks: { finish: a.finishUrl },
    }),
  })
  if (!res.ok) throw new Error(`Midtrans snap failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as { token: string; redirect_url: string }
  return { token: j.token, redirectUrl: j.redirect_url }
}

export interface GatewayTxnSnapshot {
  orderId: string
  /** Midtrans's own transaction id — stored for audit as gateway_txn_id. */
  transactionId: string | null
  status: string // settlement | capture | pending | deny | cancel | expire | refund | partial_refund | …
  fraudStatus: string | null
  grossAmountIDR: number
  /** Payment channel (bank_transfer | qris | gopay | credit_card | …) — drives refund routing. */
  paymentType: string | null
}

/**
 * Fetch a transaction from Midtrans by OUR order_id. The authoritative source
 * of truth when verifying a webhook, and for the "saya sudah bayar — cek
 * ulang" manual fallback.
 */
export async function getTransactionStatus(orderId: string): Promise<GatewayTxnSnapshot> {
  if (!orderId) throw new Error('getTransactionStatus: empty orderId')
  const res = await fetch(`${coreBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { accept: 'application/json', authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`Midtrans get status failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as Record<string, unknown>
  // Midtrans can return HTTP 200 with an error status_code in the body (e.g. 404).
  if (j.status_code && Number(j.status_code) >= 400) {
    throw new Error(`Midtrans status ${j.status_code}: ${String(j.status_message ?? '')}`)
  }
  return {
    orderId: String(j.order_id ?? orderId),
    transactionId: j.transaction_id != null ? String(j.transaction_id) : null,
    status: String(j.transaction_status ?? ''),
    fraudStatus: j.fraud_status != null ? String(j.fraud_status) : null,
    grossAmountIDR: parseGrossAmount(j.gross_amount),
    paymentType: j.payment_type != null ? String(j.payment_type) : null,
  }
}

/**
 * Best-effort expire an outstanding (pending) transaction. Called before
 * creating a replacement order for the same invitation so an abandoned-but-
 * still-payable order can't be paid later. Swallows errors — a failed expire
 * must never block a fresh checkout; an already-paid/expired order 4xx is fine.
 */
export async function expireTransaction(orderId: string): Promise<void> {
  if (!orderId) return
  try {
    if (!process.env.MIDTRANS_SERVER_KEY) return
    await fetch(`${coreBase()}/v2/${encodeURIComponent(orderId)}/expire`, {
      method: 'POST',
      headers: { accept: 'application/json', authorization: authHeader() },
    })
  } catch (e) {
    console.error('[midtrans expire] failed (ignored):', e)
  }
}

export interface GatewayRefundResult {
  /** Midtrans refund_chargeback_id when returned; stored as gateway_refund_id. */
  refundId: string | null
  status: string
}

/**
 * Refund a paid transaction via the Midtrans Direct Refund API. Only the
 * channels in API_REFUNDABLE_CHANNELS support this — bank_transfer/VA money
 * must go through the manual-transfer route in the admin console.
 * `refundKey` is OUR idempotency key: retrying with the same key within 7 days
 * can never double-refund. Money returns to the original payment method only.
 */
export async function createGatewayRefund(
  orderId: string,
  amountIDR: number,
  refundKey: string,
  reason = 'Permintaan refund pelanggan',
): Promise<GatewayRefundResult> {
  if (!orderId) throw new Error('createGatewayRefund: empty orderId')
  const res = await fetch(`${coreBase()}/v2/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: authHeader() },
    body: JSON.stringify({ refund_key: refundKey, amount: amountIDR, reason: reason.slice(0, 255) }),
  })
  if (!res.ok) throw new Error(`Midtrans refund failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as Record<string, unknown>
  if (j.status_code && Number(j.status_code) >= 400) {
    throw new Error(`Midtrans refund ${j.status_code}: ${String(j.status_message ?? '')}`)
  }
  return {
    refundId: j.refund_chargeback_id != null ? String(j.refund_chargeback_id) : null,
    status: String(j.transaction_status ?? 'refund'),
  }
}
