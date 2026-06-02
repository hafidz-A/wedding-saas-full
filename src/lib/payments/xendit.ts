/**
 * Xendit Invoice API wrapper + webhook token check.
 * SERVER ONLY — never import from a 'use client' file (uses the secret key).
 */

export function isValidCallbackToken(received: string | null): boolean {
  const expected = process.env.XENDIT_CALLBACK_TOKEN
  return !!expected && !!received && received === expected
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
