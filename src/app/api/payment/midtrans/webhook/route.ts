import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  verifySignature, getTransactionStatus, isPaidStatus, parseGrossAmount,
  invitationIdFromOrderId, renewalIdFromOrderId,
} from '@/lib/payments/gateway'
import { resolvePlan } from '@/lib/payments/plans'
import { initialPurchaseAmount } from '@/lib/payments/quota'
import { publishPaidInvitation, applyPaidUpgrade, extendActivePeriod, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { settleRefund, sourceHasOpenRefund, type RefundSourceType } from '@/lib/payments/refunds'
import { logAdminAction } from '@/lib/admin/log'

/**
 * Midtrans payment-notification webhook (ALL lifecycle events arrive here:
 * payments, refunds, chargebacks). Authenticated by the sha512 signature_key.
 * On a paid event it re-fetches the transaction from Midtrans and confirms the
 * amount equals the locked/expected price, then applies the matching flow by
 * order_id prefix (inv_ publish · ren_ extend · upg_ upgrade · qta_ quota).
 * Idempotent — already-applied rows are left untouched. Always ACKs 200 for
 * authenticated-but-unappliable events so Midtrans doesn't retry forever; the
 * owner can self-serve via the "cek ulang" actions.
 */
interface MidtransNotification {
  order_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
  transaction_status?: string
  fraud_status?: string
  transaction_id?: string
  payment_type?: string
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as MidtransNotification
  if (!verifySignature(body)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const orderId = body.order_id ?? ''
  const status = body.transaction_status ?? ''

  // 'refund' = the FULL amount came back — the ledger models refunds as
  // all-or-nothing, so this settles the row + reverses entitlement.
  // 'partial_refund' = Midtrans dashboard did a PARTIAL refund. We have no
  // partial-refund accounting (amount_idr / entitlement reversal both assume
  // 100%), so treat it as informational only: log it for the operator and ACK
  // 200 (don't retry), but do NOT settle the row or touch entitlement — doing
  // so would falsely mark the source fully refunded and take a still-partially
  // -paid invitation down.
  if (status === 'refund') return handleRefundEvent(admin, orderId)
  if (status === 'partial_refund') return handlePartialRefund(admin, orderId)
  if (status === 'chargeback') return handleChargeback(admin, orderId)
  if (!isPaidStatus(status, body.fraud_status)) return NextResponse.json({ ok: true }) // pending/deny/cancel/expire

  if (orderId.startsWith('upg_')) return handleUpgrade(admin, body)
  if (orderId.startsWith('ren_')) return handleRenewal(admin, body)
  if (orderId.startsWith('qta_')) return handleQuotaAddon(admin, body)
  return handleInitial(admin, body)
}

/**
 * Apply a verified PAID initial-purchase notification: re-verify the payment
 * against Midtrans (paid + amount equals the locked/plan+quota price), then
 * flip the invitation to paid+published via publishPaidInvitation. Idempotent
 * (already-paid rows are skipped). Always ACKs 200.
 */
async function handleInitial(admin: ReturnType<typeof createSupabaseAdminClient>, body: MidtransNotification) {
  const invId = invitationIdFromOrderId(body.order_id)
  if (!invId) {
    console.error('[midtrans webhook] unparseable order_id', body.order_id)
    return NextResponse.json({ ok: true })
  }
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, is_paid, gateway_order_id, guest_quota_extra, expected_amount_idr')
    .eq('id', invId)
    .maybeSingle()) as { data: {
      id: string; plan: string; template_id: string; is_paid: boolean
      gateway_order_id: string | null; guest_quota_extra: number | null; expected_amount_idr: number | null
    } | null }
  if (!inv || inv.is_paid) return NextResponse.json({ ok: true }) // unknown or already processed

  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) {
    console.error('[midtrans webhook] unknown plan', inv.template_id, inv.plan)
    return NextResponse.json({ ok: true })
  }
  const expected = inv.expected_amount_idr ?? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))

  // Authoritative verification: re-fetch THE ORDER THAT FIRED THIS WEBHOOK
  // (body.order_id — the customer may have re-opened checkout, so it can
  // differ from the row's stored gateway_order_id). Falls back to the
  // signature-authenticated body amount if the re-fetch fails.
  let verified = false
  let channel: string | null = body.payment_type ?? null
  let txnId: string | null = body.transaction_id ?? null
  try {
    const snap = await getTransactionStatus(body.order_id ?? '')
    verified = snap.orderId === body.order_id && isPaidStatus(snap.status, snap.fraudStatus) && snap.grossAmountIDR === expected
    channel = snap.paymentType ?? channel
    txnId = snap.transactionId ?? txnId
    if (!verified) console.error('[midtrans webhook] verification failed', { order_id: body.order_id, snapStatus: snap.status, snapAmount: snap.grossAmountIDR, expected })
  } catch (e) {
    verified = parseGrossAmount(body.gross_amount) === expected
    console.error('[midtrans webhook] re-fetch failed, used body amount', e)
  }
  if (!verified) return NextResponse.json({ ok: true }) // ack, but do not publish

  await publishPaidInvitation(admin, inv, Date.now(), {
    paidAmountIDR: expected, paidSource: 'midtrans', feeIDR: null,
    paidChannel: channel, gatewayTxnId: txnId,
  })
  // Keep the row's order id pointing at the order that actually got paid.
  await (admin.from('invitations') as any).update({ gateway_order_id: body.order_id }).eq('id', inv.id)
  return NextResponse.json({ ok: true })
}

/**
 * Apply a verified PAID plan-upgrade notification. Looks up the pending
 * plan_upgrades row by order id, re-verifies the payment against Midtrans
 * (paid + amount equals the recorded difference), then bumps the invitation's
 * plan + expiry via applyPaidUpgrade. Idempotent (rows already `paid` are
 * skipped). Always ACKs 200 so genuine-but-unappliable events aren't retried
 * forever; the owner can self-serve via recheckUpgrade.
 */
async function handleUpgrade(admin: ReturnType<typeof createSupabaseAdminClient>, body: MidtransNotification) {
  const { data: upg } = (await admin
    .from('plan_upgrades')
    .select('id, invitation_id, to_plan, amount_idr, gateway_order_id, status')
    .eq('gateway_order_id', body.order_id as string)
    .maybeSingle()) as { data: {
      id: string; invitation_id: string; to_plan: string; amount_idr: number
      gateway_order_id: string | null; status: string
    } | null }
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
    const snap = await getTransactionStatus(body.order_id ?? '')
    verified = isPaidStatus(snap.status, snap.fraudStatus) && snap.grossAmountIDR === expected
    if (!verified) {
      console.error('[midtrans webhook] upgrade verification failed', {
        order_id: body.order_id, snapStatus: snap.status, snapAmount: snap.grossAmountIDR, expected,
      })
    }
  } catch (e) {
    verified = parseGrossAmount(body.gross_amount) === expected
    console.error('[midtrans webhook] upgrade re-fetch failed, used body amount', e)
  }
  if (!verified) return NextResponse.json({ ok: true })

  await applyPaidUpgrade(admin, {
    id: upg.id,
    invitation_id: upg.invitation_id,
    to_plan: upg.to_plan,
    template_id: inv.template_id,
  })
  await (admin.from('plan_upgrades') as any)
    .update({ paid_channel: body.payment_type ?? null, gateway_txn_id: body.transaction_id ?? null })
    .eq('id', upg.id)
  return NextResponse.json({ ok: true })
}

/**
 * Apply a verified PAID renewal notification: re-verify the payment against
 * Midtrans (paid + amount equals the CURRENT plan price), then extend the
 * invitation's active period via extendActivePeriod (no plan/is_paid change).
 * Always ACKs 200.
 */
async function handleRenewal(admin: ReturnType<typeof createSupabaseAdminClient>, body: MidtransNotification) {
  const invId = renewalIdFromOrderId(body.order_id)
  if (!invId) {
    console.error('[midtrans webhook] unparseable renewal order_id', body.order_id)
    return NextResponse.json({ ok: true })
  }

  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, gateway_order_id')
    .eq('id', invId)
    .maybeSingle()) as { data: { id: string; plan: string; template_id: string; gateway_order_id: string | null } | null }
  if (!inv) return NextResponse.json({ ok: true })

  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) {
    console.error('[midtrans webhook] unknown plan (renewal)', inv.template_id, inv.plan)
    return NextResponse.json({ ok: true })
  }

  let verified = false
  try {
    const snap = await getTransactionStatus(body.order_id ?? '')
    verified = isPaidStatus(snap.status, snap.fraudStatus) && snap.grossAmountIDR === resolved.amountIDR
    if (!verified) {
      console.error('[midtrans webhook] renewal verification failed', {
        order_id: body.order_id, snapStatus: snap.status, snapAmount: snap.grossAmountIDR, expected: resolved.amountIDR,
      })
    }
  } catch (e) {
    verified = parseGrossAmount(body.gross_amount) === resolved.amountIDR
    console.error('[midtrans webhook] renewal re-fetch failed, used body amount', e)
  }
  if (!verified) return NextResponse.json({ ok: true })

  await extendActivePeriod(admin, inv)
  return NextResponse.json({ ok: true })
}

/**
 * Apply a verified PAID quota add-on notification. Looks up the pending
 * quota_addons row by order id, re-verifies the payment against Midtrans
 * (paid + amount equals the recorded amount_idr), then bumps the invitation's
 * guest_quota_extra via applyPaidQuotaAddon. Idempotent (rows already `paid`
 * are skipped). Always ACKs 200 so genuine-but-unappliable events aren't
 * retried forever; the owner can self-serve via recheckQuotaAddon.
 */
async function handleQuotaAddon(admin: ReturnType<typeof createSupabaseAdminClient>, body: MidtransNotification) {
  const { data: addon } = (await admin
    .from('quota_addons')
    .select('id, invitation_id, qty_guests, amount_idr, gateway_order_id, status')
    .eq('gateway_order_id', body.order_id as string)
    .maybeSingle()) as { data: {
      id: string; invitation_id: string; qty_guests: number; amount_idr: number
      gateway_order_id: string | null; status: string
    } | null }
  if (!addon || addon.status === 'paid') return NextResponse.json({ ok: true })

  const expected = Number(addon.amount_idr)
  let verified = false
  try {
    const snap = await getTransactionStatus(body.order_id ?? '')
    verified = isPaidStatus(snap.status, snap.fraudStatus) && snap.grossAmountIDR === expected
    if (!verified) {
      console.error('[midtrans webhook] quota addon verification failed', {
        order_id: body.order_id, snapStatus: snap.status, snapAmount: snap.grossAmountIDR, expected,
      })
    }
  } catch (e) {
    verified = parseGrossAmount(body.gross_amount) === expected
    console.error('[midtrans webhook] quota addon re-fetch failed, used body amount', e)
  }
  if (!verified) return NextResponse.json({ ok: true })

  await applyPaidQuotaAddon(admin, {
    id: addon.id,
    invitation_id: addon.invitation_id,
    qty_guests: Number(addon.qty_guests),
  })
  await (admin.from('quota_addons') as any)
    .update({ paid_channel: body.payment_type ?? null, gateway_txn_id: body.transaction_id ?? null })
    .eq('id', addon.id)
  return NextResponse.json({ ok: true })
}

/** Resolve which refundable source an order id belongs to. */
async function sourceFromOrderId(admin: any, orderId: string):
  Promise<{ sourceType: RefundSourceType; sourceId: string; invitationId: string } | null> {
  // A refunded RENEWAL payment has no dedicated ledger row of its own — it nets
  // the invitation's initial paid_amount_idr and takes the invitation down, same
  // as a refund of the original purchase. This is a deliberate, defensive choice:
  // we only support FULL refunds today, so "the whole thing came back" is the
  // correct (if slightly conservative) accounting for a renewal chargeback/refund.
  const invId = invitationIdFromOrderId(orderId) ?? renewalIdFromOrderId(orderId)
  if (invId) return { sourceType: 'initial', sourceId: invId, invitationId: invId }
  const table = orderId.startsWith('upg_') ? 'plan_upgrades' : orderId.startsWith('qta_') ? 'quota_addons' : null
  if (!table) return null
  const { data } = await admin.from(table).select('id, invitation_id').eq('gateway_order_id', orderId).maybeSingle()
  if (!data) return null
  return { sourceType: table === 'plan_upgrades' ? 'upgrade' : 'addon', sourceId: data.id, invitationId: data.invitation_id }
}

/**
 * The amount a refund/chargeback against `src` should net out of revenue.
 * 'initial' nets the invitation's stored paid_amount_idr; 'upgrade'/'addon' net
 * their OWN recorded amount_idr — NOT the invitation's initial purchase amount,
 * which would silently corrupt the ledger for upgrade/add-on chargebacks.
 * Mirrors loadRefundSource's `Number(x ?? 0)` coercion.
 */
async function refundableAmountFor(
  admin: any,
  src: { sourceType: RefundSourceType; sourceId: string; invitationId: string },
): Promise<number> {
  if (src.sourceType === 'upgrade') {
    const { data } = await admin.from('plan_upgrades').select('amount_idr').eq('id', src.sourceId).maybeSingle()
    return Number((data as any)?.amount_idr ?? 0)
  }
  if (src.sourceType === 'addon') {
    const { data } = await admin.from('quota_addons').select('amount_idr').eq('id', src.sourceId).maybeSingle()
    return Number((data as any)?.amount_idr ?? 0)
  }
  const { data } = await admin.from('invitations').select('paid_amount_idr').eq('id', src.invitationId).maybeSingle()
  return Number((data as any)?.paid_amount_idr ?? 0)
}

/**
 * Refund events (net-new + refunds fired straight from the Midtrans dashboard).
 * Resolves the refunded source from the order-id prefix, settles the matching
 * pending row we created when the admin fired the refund, or — defensively —
 * records a dashboard-initiated refund we didn't start so money and
 * entitlement can't drift apart.
 */
async function handleRefundEvent(admin: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  const src = await sourceFromOrderId(admin, orderId)
  if (!src) return NextResponse.json({ ok: true })
  // Settle the pending refund row we created when the admin fired the refund.
  const { data: rows } = await (admin.from('refunds') as any)
    .select('id, status').eq('source_type', src.sourceType).eq('source_id', src.sourceId)
    .neq('status', 'failed').order('created_at', { ascending: false }).limit(1)
  const row = rows?.[0]
  if (row) {
    if (row.status !== 'succeeded') await settleRefund(admin, row.id)
    return NextResponse.json({ ok: true })
  }
  // No row → the refund was fired from the Midtrans dashboard directly.
  // Record it so money and entitlement can't drift apart.
  const amountIDR = await refundableAmountFor(admin, src)
  const { data: inserted } = await (admin.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: src.sourceType, source_id: src.sourceId,
    amount_idr: amountIDR, method: 'gateway', status: 'pending',
    reason: 'Refund dari dashboard Midtrans',
  }).select('id').single()
  if (inserted) await settleRefund(admin, (inserted as { id: string }).id)
  await logAdminAction('system (midtrans)', { action: 'refund.gateway_initiated', targetType: 'invitation', targetId: src.invitationId })
  return NextResponse.json({ ok: true })
}

/**
 * Partial refund notifications (an operator refunded LESS than the full
 * amount from the Midtrans dashboard). The ledger only models full refunds —
 * settling here would wrongly zero out entitlement for a still-partially-paid
 * invitation. So: resolve which source it belongs to (for a useful audit
 * log), log it as ignored, and ACK 200 without touching `refunds` or
 * entitlement. An operator who needs to fully refund the rest can do so
 * normally afterward (that fires a real 'refund' event).
 */
async function handlePartialRefund(admin: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  const src = await sourceFromOrderId(admin, orderId)
  await logAdminAction('system (midtrans)', {
    action: 'refund.partial_ignored', targetType: 'invitation', targetId: src?.invitationId,
    meta: { orderId },
  })
  return NextResponse.json({ ok: true })
}

/**
 * Chargebacks / disputes (a bank forcibly pulled the money back). Records a
 * 'chargeback' refund so it nets out of revenue + takes the invitation down
 * (settleRefund → reverseEntitlement), and logs it for the operator. Never
 * double-nets a source that already has a refund.
 */
async function handleChargeback(admin: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  const src = await sourceFromOrderId(admin, orderId)
  if (!src) return NextResponse.json({ ok: true })
  if (await sourceHasOpenRefund(admin, src.sourceType, src.sourceId)) return NextResponse.json({ ok: true })
  const amountIDR = await refundableAmountFor(admin, src)
  const { data: row } = await (admin.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: src.sourceType, source_id: src.sourceId,
    amount_idr: amountIDR, method: 'chargeback', status: 'pending',
    reason: 'Chargeback / dispute bank',
  }).select('id').single()
  if (row) await settleRefund(admin, (row as { id: string }).id)
  await logAdminAction('system (midtrans)', { action: 'payment.chargeback', targetType: 'invitation', targetId: src.invitationId })
  return NextResponse.json({ ok: true })
}
