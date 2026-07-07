import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidCallbackToken, getXenditInvoice, isPaidStatus, invitationIdFromExternalId, renewalIdFromExternalId } from '@/lib/payments/xendit'
import { resolvePlan } from '@/lib/payments/plans'
import { initialPurchaseAmount } from '@/lib/payments/quota'
import { publishPaidInvitation, applyPaidUpgrade, extendActivePeriod, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { settleRefund } from '@/lib/payments/refunds'

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
    event?: string
    data?: { id?: string; status?: string }
  }

  const admin = createSupabaseAdminClient()

  // Refund events (net-new). Xendit delivers these as { event, data } — distinct
  // from the flat invoice callback below. Match our refunds row by the stored
  // xendit_refund_id and settle/fail it idempotently. `settleRefund` reverses the
  // entitlement exactly once (compare-and-set), so a re-sent event is a no-op.
  // The exact envelope must be confirmed against the live account at go-live.
  if (body.event && body.event.startsWith('refund.')) {
    const rid = body.data?.id
    if (rid) {
      const { data: row } = (await admin.from('refunds').select('id, status').eq('xendit_refund_id', rid).maybeSingle()) as { data: { id: string; status: string } | null }
      if (row) {
        if (body.event === 'refund.succeeded' || body.data?.status === 'SUCCEEDED') {
          await settleRefund(admin, row.id)
        } else if (body.event === 'refund.failed' || body.data?.status === 'FAILED') {
          await (admin.from('refunds') as any).update({ status: 'failed' }).eq('id', row.id).neq('status', 'succeeded')
        }
      }
    }
    return NextResponse.json({ ok: true })
  }

  if (body.status !== 'PAID' || !body.external_id) {
    return NextResponse.json({ ok: true })
  }

  // Plan upgrade (pay-the-difference) callbacks are keyed by an `upg_` external
  // id and recorded in plan_upgrades, separate from the initial purchase. Handle
  // them here: verify + bump the invitation's plan WITHOUT touching publish state.
  if (body.external_id.startsWith('upg_')) {
    return handleUpgrade(admin, body)
  }

  // Renewal callbacks are keyed by a `ren_` external id. The invitation is
  // already paid, so the initial-purchase path below (which refuses paid rows)
  // would skip it — handle here by EXTENDING the active period instead.
  if (body.external_id.startsWith('ren_')) {
    return handleRenewal(admin, body)
  }

  // Quota add-on (top-up guest quota) callbacks are keyed by a `qta_` external
  // id and recorded in quota_addons, separate from plan + publish state. Handle
  // here: verify + bump guest_quota_extra WITHOUT touching plan/is_paid.
  if (body.external_id.startsWith('qta_')) {
    return handleQuotaAddon(admin, body)
  }

  // Correlate by the invitation id embedded in OUR external id, NOT by the
  // invitation's currently-stored xendit_external_id. If the owner opened
  // checkout twice, the row stores only the latest invoice; paying an earlier
  // one would otherwise never match. The id-prefix is stable across retries.
  const invIdFromExt = invitationIdFromExternalId(body.external_id)
  if (!invIdFromExt) {
    console.error('[xendit webhook] unparseable external_id', body.external_id)
    return NextResponse.json({ ok: true })
  }
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, is_paid, xendit_invoice_id, guest_quota_extra, expected_amount_idr')
    .eq('id', invIdFromExt)
    .maybeSingle()) as {
    data: {
      id: string
      plan: string
      template_id: string
      is_paid: boolean
      xendit_invoice_id: string | null
      guest_quota_extra: number | null
      expected_amount_idr: number | null
    } | null
  }
  if (!inv || inv.is_paid) return NextResponse.json({ ok: true }) // unknown or already processed

  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) {
    console.error('[xendit webhook] unknown plan', inv.template_id, inv.plan)
    return NextResponse.json({ ok: true })
  }

  // Prefer the amount LOCKED at checkout-start (`expected_amount_idr`), so a price
  // or promo change mid-checkout can't reject a legit payment. Fall back to the
  // recomputed plan+quota amount for invitations whose checkout predates that lock.
  const expectedAmount = inv.expected_amount_idr ?? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))

  // Authoritative verification: re-fetch THE INVOICE THAT FIRED THIS WEBHOOK
  // (body.id) rather than the row's stored invoice — they can differ if the
  // owner re-opened checkout. Confirms it is genuinely paid AND that the amount
  // equals the plan price (defends against tampered/mismatched callbacks and a
  // plan-price change between checkout and payment).
  let verified = false
  let feeIDR = 0
  try {
    const snap = await getXenditInvoice(body.id ?? inv.xendit_invoice_id ?? '')
    verified =
      snap.externalId === body.external_id &&
      isPaidStatus(snap.status) &&
      snap.amountIDR === expectedAmount
    feeIDR = snap.feeIDR
    if (!verified) {
      console.error('[xendit webhook] verification failed', {
        external_id: body.external_id,
        snapStatus: snap.status,
        snapAmount: snap.amountIDR,
        expected: expectedAmount,
      })
    }
  } catch (e) {
    // If the re-fetch fails (Xendit API/network blip), fall back to the
    // signed webhook body amount so a transient outage doesn't strand a
    // paying customer. The body is trusted only because the callback token
    // already authenticated this request.
    const reported = body.paid_amount ?? body.amount
    verified = reported === expectedAmount
    console.error('[xendit webhook] re-fetch failed, used body amount', e)
  }

  if (!verified) return NextResponse.json({ ok: true }) // ack, but do not publish

  // Capture the actual charge + channel + gateway fee so revenue (gross & net) is
  // never recomputed later.
  await publishPaidInvitation(admin, inv, Date.now(), { paidAmountIDR: expectedAmount, paidSource: 'xendit', feeIDR: feeIDR || null })
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

/**
 * Apply a verified PAID renewal callback: re-verify the payment against Xendit
 * (paid + amount equals the CURRENT plan price), then extend the invitation's
 * active period via extendActivePeriod (no plan/is_paid change). Always ACKs 200.
 */
async function handleRenewal(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  body: { id?: string; external_id?: string; amount?: number; paid_amount?: number },
) {
  const invId = renewalIdFromExternalId(body.external_id)
  if (!invId) {
    console.error('[xendit webhook] unparseable renewal external_id', body.external_id)
    return NextResponse.json({ ok: true })
  }

  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, xendit_invoice_id')
    .eq('id', invId)
    .maybeSingle()) as {
    data: { id: string; plan: string; template_id: string; xendit_invoice_id: string | null } | null
  }
  if (!inv) return NextResponse.json({ ok: true })

  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) {
    console.error('[xendit webhook] unknown plan (renewal)', inv.template_id, inv.plan)
    return NextResponse.json({ ok: true })
  }

  let verified = false
  try {
    const snap = await getXenditInvoice(body.id ?? inv.xendit_invoice_id ?? '')
    verified =
      snap.externalId === body.external_id &&
      isPaidStatus(snap.status) &&
      snap.amountIDR === resolved.amountIDR
    if (!verified) {
      console.error('[xendit webhook] renewal verification failed', {
        external_id: body.external_id,
        snapStatus: snap.status,
        snapAmount: snap.amountIDR,
        expected: resolved.amountIDR,
      })
    }
  } catch (e) {
    const reported = body.paid_amount ?? body.amount
    verified = reported === resolved.amountIDR
    console.error('[xendit webhook] renewal re-fetch failed, used body amount', e)
  }

  if (!verified) return NextResponse.json({ ok: true })

  await extendActivePeriod(admin, inv)
  return NextResponse.json({ ok: true })
}

/**
 * Apply a verified PAID quota add-on callback. Looks up the pending quota_addons
 * row by external id, re-verifies the payment against Xendit (paid + amount
 * equals the recorded amount_idr), then bumps the invitation's guest_quota_extra
 * via applyPaidQuotaAddon. Idempotent (rows already `paid` are skipped). Always
 * ACKs 200 so genuine-but-unappliable callbacks aren't retried forever; the
 * owner can self-serve via recheckQuotaAddon.
 */
async function handleQuotaAddon(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  body: { id?: string; external_id?: string; amount?: number; paid_amount?: number },
) {
  const { data: addon } = (await admin
    .from('quota_addons')
    .select('id, invitation_id, qty_guests, amount_idr, xendit_invoice_id, status')
    .eq('xendit_external_id', body.external_id as string)
    .maybeSingle()) as {
    data: {
      id: string
      invitation_id: string
      qty_guests: number
      amount_idr: number
      xendit_invoice_id: string | null
      status: string
    } | null
  }
  if (!addon || addon.status === 'paid') return NextResponse.json({ ok: true })

  const expected = Number(addon.amount_idr)
  let verified = false
  try {
    const snap = await getXenditInvoice(addon.xendit_invoice_id ?? body.id ?? '')
    verified =
      snap.externalId === body.external_id &&
      isPaidStatus(snap.status) &&
      snap.amountIDR === expected
    if (!verified) {
      console.error('[xendit webhook] quota addon verification failed', {
        external_id: body.external_id,
        snapStatus: snap.status,
        snapAmount: snap.amountIDR,
        expected,
      })
    }
  } catch (e) {
    const reported = body.paid_amount ?? body.amount
    verified = reported === expected
    console.error('[xendit webhook] quota addon re-fetch failed, used body amount', e)
  }

  if (!verified) return NextResponse.json({ ok: true })

  await applyPaidQuotaAddon(admin, {
    id: addon.id,
    invitation_id: addon.invitation_id,
    qty_guests: Number(addon.qty_guests),
  })
  return NextResponse.json({ ok: true })
}
