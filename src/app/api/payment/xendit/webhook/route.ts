import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidCallbackToken, getXenditInvoice, isPaidStatus } from '@/lib/payments/xendit'
import { resolvePlan } from '@/lib/payments/plans'
import { publishPaidInvitation, applyPaidUpgrade } from '@/lib/payments/publish'

/**
 * Xendit invoice webhook. Authenticated by the `x-callback-token` header
 * (set in the Xendit dashboard). On a PAID event it verifies the payment is
 * genuine — re-fetching the invoice from Xendit and confirming the amount
 * equals the plan price — then publishes the matching invitation.
 *
 * Idempotent — a row already paid is left untouched. We always ACK (200) so a
 * genuine-but-unpublishable callback (mismatch) isn't retried forever; the
 * owner can still self-serve via the "recheck payment" action.
 */
export async function POST(req: Request) {
  if (!isValidCallbackToken(req.headers.get('x-callback-token'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string
    status?: string
    external_id?: string
    amount?: number
    paid_amount?: number
  }
  if (body.status !== 'PAID' || !body.external_id) {
    return NextResponse.json({ ok: true })
  }

  const admin = createSupabaseAdminClient()

  // Plan upgrade (pay-the-difference) callbacks are keyed by an `upg_` external
  // id and recorded in plan_upgrades, separate from the initial purchase. Handle
  // them here: verify + bump the invitation's plan WITHOUT touching publish state.
  if (body.external_id.startsWith('upg_')) {
    return handleUpgrade(admin, body)
  }

  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, is_paid, xendit_invoice_id')
    .eq('xendit_external_id', body.external_id)
    .maybeSingle()) as {
    data: {
      id: string
      plan: string
      template_id: string
      is_paid: boolean
      xendit_invoice_id: string | null
    } | null
  }
  if (!inv || inv.is_paid) return NextResponse.json({ ok: true }) // unknown or already processed

  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) {
    console.error('[xendit webhook] unknown plan', inv.template_id, inv.plan)
    return NextResponse.json({ ok: true })
  }

  // Authoritative verification: re-fetch the invoice from Xendit rather than
  // trusting the webhook body alone. Confirms it is genuinely paid AND that the
  // amount equals the plan price (defends against tampered/mismatched callbacks
  // and against a plan-price change between checkout and payment).
  let verified = false
  try {
    const snap = await getXenditInvoice(inv.xendit_invoice_id ?? body.id ?? '')
    verified =
      snap.externalId === body.external_id &&
      isPaidStatus(snap.status) &&
      snap.amountIDR === resolved.amountIDR
    if (!verified) {
      console.error('[xendit webhook] verification failed', {
        external_id: body.external_id,
        snapStatus: snap.status,
        snapAmount: snap.amountIDR,
        expected: resolved.amountIDR,
      })
    }
  } catch (e) {
    // If the re-fetch fails (Xendit API/network blip), fall back to the
    // signed webhook body amount so a transient outage doesn't strand a
    // paying customer. The body is trusted only because the callback token
    // already authenticated this request.
    const reported = body.paid_amount ?? body.amount
    verified = reported === resolved.amountIDR
    console.error('[xendit webhook] re-fetch failed, used body amount', e)
  }

  if (!verified) return NextResponse.json({ ok: true }) // ack, but do not publish

  await publishPaidInvitation(admin, inv)
  return NextResponse.json({ ok: true })
}

/**
 * Apply a verified PAID plan-upgrade callback. Looks up the pending
 * plan_upgrades row by external id, re-verifies the payment against Xendit
 * (paid + amount equals the recorded difference), then bumps the invitation's
 * plan + expiry via applyPaidUpgrade. Idempotent (rows already `paid` are
 * skipped). Always ACKs 200 so genuine-but-unappliable callbacks aren't retried
 * forever; the owner can self-serve via recheckUpgrade.
 */
async function handleUpgrade(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  body: { id?: string; external_id?: string; amount?: number; paid_amount?: number },
) {
  const { data: upg } = (await admin
    .from('plan_upgrades')
    .select('id, invitation_id, to_plan, amount_idr, xendit_invoice_id, status')
    .eq('xendit_external_id', body.external_id as string)
    .maybeSingle()) as {
    data: {
      id: string
      invitation_id: string
      to_plan: string
      amount_idr: number
      xendit_invoice_id: string | null
      status: string
    } | null
  }
  if (!upg || upg.status === 'paid') return NextResponse.json({ ok: true })

  // Need the invitation's template to resolve the target plan's expiry rule.
  const { data: inv } = (await admin
    .from('invitations')
    .select('template_id')
    .eq('id', upg.invitation_id)
    .maybeSingle()) as { data: { template_id: string } | null }
  if (!inv) return NextResponse.json({ ok: true })

  const expected = Number(upg.amount_idr)
  let verified = false
  try {
    const snap = await getXenditInvoice(upg.xendit_invoice_id ?? body.id ?? '')
    verified =
      snap.externalId === body.external_id &&
      isPaidStatus(snap.status) &&
      snap.amountIDR === expected
    if (!verified) {
      console.error('[xendit webhook] upgrade verification failed', {
        external_id: body.external_id,
        snapStatus: snap.status,
        snapAmount: snap.amountIDR,
        expected,
      })
    }
  } catch (e) {
    const reported = body.paid_amount ?? body.amount
    verified = reported === expected
    console.error('[xendit webhook] upgrade re-fetch failed, used body amount', e)
  }

  if (!verified) return NextResponse.json({ ok: true })

  await applyPaidUpgrade(admin, {
    id: upg.id,
    invitation_id: upg.invitation_id,
    to_plan: upg.to_plan,
    template_id: inv.template_id,
  })
  return NextResponse.json({ ok: true })
}
