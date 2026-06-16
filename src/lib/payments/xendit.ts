/**
 * Xendit Invoice API wrapper + webhook token check.
 * SERVER ONLY — never import from a 'use client' file (uses the secret key).
 */
import { timingSafeStrEqual } from '@/lib/security/timing'

export function isValidCallbackToken(received: string | null): boolean {
  const expected = process.env.XENDIT_CALLBACK_TOKEN
  if (!expected || !received) return false
  return timingSafeStrEqual(received, expected)
}

interface CreateInvoiceArgs {
  externalId: string
  amountIDR: number
  payerEmail?: string
  description: string
  successUrl: string
  failureUrl: string
}

export async function createXenditInvoice(
  a: CreateInvoiceArgs,
): Promise<{ id: string; invoiceUrl: string }> {
  const key = process.env.XENDIT_SECRET_KEY
  if (!key) throw new Error('XENDIT_SECRET_KEY is not set')

  const res = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    },
    body: JSON.stringify({
      external_id: a.externalId,
      amount: a.amountIDR,
      payer_email: a.payerEmail,
      description: a.description,
      currency: 'IDR',
      success_redirect_url: a.successUrl,
      failure_redirect_url: a.failureUrl,
    }),
  })

  if (!res.ok) {
    throw new Error(`Xendit invoice failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { id: string; invoice_url: string }
  return { id: json.id, invoiceUrl: json.invoice_url }
}

export interface XenditInvoiceSnapshot {
  id: string
  externalId: string
  status: string // PENDING | PAID | SETTLED | EXPIRED
  amountIDR: number
  paidAmountIDR: number | null
}

/**
 * Fetch a single invoice from Xendit by its id. Used as the authoritative
 * source of truth when verifying a webhook callback, and when a customer
 * manually rechecks ("Saya sudah bayar") after a missed/late webhook.
 */
export async function getXenditInvoice(invoiceId: string): Promise<XenditInvoiceSnapshot> {
  const key = process.env.XENDIT_SECRET_KEY
  if (!key) throw new Error('XENDIT_SECRET_KEY is not set')
  if (!invoiceId) throw new Error('getXenditInvoice: empty invoiceId')

  const res = await fetch(`https://api.xendit.co/v2/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: { authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
  })
  if (!res.ok) {
    throw new Error(`Xendit get invoice failed: ${res.status} ${await res.text()}`)
  }
  const j = (await res.json()) as {
    id: string
    external_id: string
    status: string
    amount: number
    paid_amount?: number
  }
  return {
    id: j.id,
    externalId: j.external_id,
    status: j.status,
    amountIDR: Number(j.amount),
    paidAmountIDR: j.paid_amount == null ? null : Number(j.paid_amount),
  }
}

/** Whether a Xendit invoice status counts as successfully paid. */
export function isPaidStatus(status: string): boolean {
  return status === 'PAID' || status === 'SETTLED'
}

/**
 * Best-effort expire an outstanding Xendit invoice. Called before creating a
 * replacement invoice for the same invitation so an abandoned-but-still-payable
 * invoice can't be paid later (which would take money for a product the webhook
 * can no longer correlate). Swallows errors — a failed expire must never block
 * a fresh checkout, and an already-paid/expired invoice returning 4xx is fine.
 */
export async function expireXenditInvoice(invoiceId: string): Promise<void> {
  const key = process.env.XENDIT_SECRET_KEY
  if (!key || !invoiceId) return
  try {
    await fetch(`https://api.xendit.co/invoices/${encodeURIComponent(invoiceId)}/expire!`, {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
    })
  } catch (e) {
    console.error('[xendit expire] failed (ignored):', e)
  }
}

/**
 * Extract the invitation id embedded in an external id we minted at checkout.
 * Format: `inv_<invitationId>_<timestamp>` (initial purchase) — the id is a
 * UUID, which contains hyphens but never underscores, so splitting on `_` is
 * unambiguous. Returns null for any other shape (e.g. `upg_…`).
 */
export function invitationIdFromExternalId(externalId: string | undefined | null): string | null {
  if (!externalId || !externalId.startsWith('inv_')) return null
  const parts = externalId.split('_')
  // ['inv', '<uuid>', '<ts>']
  if (parts.length < 3) return null
  const id = parts[1]
  return id && id.length > 0 ? id : null
}

/**
 * Extract the invitation id from a RENEWAL external id we minted at checkout.
 * Format: `ren_<invitationId>_<timestamp>`. Returns null for any other shape
 * (e.g. `inv_…` initial purchase or `upg_…` upgrade).
 */
export function renewalIdFromExternalId(externalId: string | undefined | null): string | null {
  if (!externalId || !externalId.startsWith('ren_')) return null
  const parts = externalId.split('_')
  // ['ren', '<uuid>', '<ts>']
  if (parts.length < 3) return null
  const id = parts[1]
  return id && id.length > 0 ? id : null
}
