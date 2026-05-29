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
