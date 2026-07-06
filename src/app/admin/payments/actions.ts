// src/app/admin/payments/actions.ts
'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { resolvePlan } from '@/lib/payments/plans'
import { initialPurchaseAmount } from '@/lib/payments/quota'
import { getXenditInvoice, isPaidStatus, createXenditRefund } from '@/lib/payments/xendit'
import { publishPaidInvitation, applyPaidUpgrade, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { loadRefundSource, sourceHasOpenRefund, settleRefund, type RefundSourceType } from '@/lib/payments/refunds'
import { buildTransactions, transactionsToCsv } from '@/lib/payments/transactions'
import { fetchLedger } from './data'

type Result = { ok: boolean; error?: string }

async function guard(): Promise<{ email: string } | null> {
  try { return await requireAdmin() } catch { return null }
}

/** Export the full transaction ledger as CSV (financial fields only — no PII). */
export async function adminExportTransactionsCsv(): Promise<{ ok: boolean; csv?: string; error?: string }> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const ledger = await fetchLedger(db)
  const csv = transactionsToCsv(buildTransactions(ledger))
  await logAdminAction(admin.email, { action: 'payments.export_csv' })
  return { ok: true, csv }
}

/**
 * One-off: fill `paid_amount_idr` for legacy paid invitations that never captured
 * it (rows paid before Module 3A). comp → 0; else the locked expected amount, else
 * recompute plan price + quota add-on. Idempotent — only touches null rows.
 */
export async function adminBackfillPaidAmounts(): Promise<{ ok: boolean; updated?: number; skipped?: number; error?: string }> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: rows } = (await db
    .from('invitations')
    .select('id, plan, template_id, guest_quota_extra, paid_source, expected_amount_idr')
    .eq('is_paid', true)
    .is('paid_amount_idr', null)) as { data: any[] | null }

  let updated = 0
  let skipped = 0
  for (const r of rows ?? []) {
    let amount: number
    if (r.paid_source === 'comp') amount = 0
    else if (r.expected_amount_idr != null) amount = Number(r.expected_amount_idr)
    else {
      const resolved = await resolvePlan(r.template_id, r.plan)
      if (!resolved) { skipped++; continue }
      amount = initialPurchaseAmount(resolved.amountIDR, Number(r.guest_quota_extra ?? 0))
    }
    const { error } = await (db.from('invitations') as any).update({ paid_amount_idr: amount }).eq('id', r.id)
    if (error) { skipped++; continue }
    updated++
  }
  await logAdminAction(admin.email, { action: 'payments.backfill_amounts', meta: { updated, skipped } })
  revalidateInvitation()
  return { ok: true, updated, skipped }
}

type RecheckResult = Result & { status?: string; applied?: boolean }

/** Admin mirror of the owner recheckPayment — verify against Xendit + publish an
 *  initial purchase, for ANY invitation (not owner-scoped). Recovers a missed webhook. */
export async function adminRecheckPayment(invitationId: string): Promise<RecheckResult> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations')
    .select('id, plan, template_id, is_paid, xendit_invoice_id, guest_quota_extra, expected_amount_idr')
    .eq('id', invitationId).maybeSingle()) as { data: any | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  if (inv.is_paid) return { ok: true, applied: true, status: 'PAID' }
  if (!inv.xendit_invoice_id) return { ok: false, error: 'Belum ada transaksi Xendit' }
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  if (!resolved) return { ok: false, error: 'Plan tidak valid' }
  const expected = inv.expected_amount_idr ?? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))
  const snap = await getXenditInvoice(inv.xendit_invoice_id)
  if (!isPaidStatus(snap.status) || snap.amountIDR !== expected) return { ok: true, applied: false, status: snap.status }
  await publishPaidInvitation(admin, inv, Date.now(), { paidAmountIDR: expected, paidSource: 'xendit' })
  await logAdminAction(admin.email, { action: 'payments.recheck', targetType: 'invitation', targetId: invitationId, meta: { type: 'initial' } })
  revalidateInvitation()
  return { ok: true, applied: true, status: snap.status }
}

/** Admin mirror of recheckUpgrade — apply a paid pending upgrade for any invitation. */
export async function adminRecheckUpgrade(invitationId: string): Promise<RecheckResult> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations').select('id, template_id').eq('id', invitationId).maybeSingle()) as { data: any | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  const { data: upg } = (await db.from('plan_upgrades')
    .select('id, invitation_id, to_plan, amount_idr, xendit_invoice_id, status')
    .eq('invitation_id', invitationId).eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()) as { data: any | null }
  if (!upg || !upg.xendit_invoice_id) return { ok: false, error: 'Tidak ada upgrade menunggu bayar' }
  const snap = await getXenditInvoice(upg.xendit_invoice_id)
  if (!isPaidStatus(snap.status) || snap.amountIDR !== Number(upg.amount_idr)) return { ok: true, applied: false, status: snap.status }
  await applyPaidUpgrade(admin, { id: upg.id, invitation_id: upg.invitation_id, to_plan: upg.to_plan, template_id: inv.template_id })
  await logAdminAction(admin.email, { action: 'payments.recheck', targetType: 'invitation', targetId: invitationId, meta: { type: 'upgrade' } })
  revalidateInvitation()
  return { ok: true, applied: true, status: snap.status }
}

/** Admin mirror of recheckQuotaAddon — apply a paid pending add-on for any invitation. */
export async function adminRecheckQuotaAddon(invitationId: string): Promise<RecheckResult> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: addon } = (await db.from('quota_addons')
    .select('id, invitation_id, qty_guests, amount_idr, xendit_invoice_id, status')
    .eq('invitation_id', invitationId).eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()) as { data: any | null }
  if (!addon || !addon.xendit_invoice_id) return { ok: false, error: 'Tidak ada pembelian kuota menunggu bayar' }
  const snap = await getXenditInvoice(addon.xendit_invoice_id)
  if (!isPaidStatus(snap.status) || snap.amountIDR !== Number(addon.amount_idr)) return { ok: true, applied: false, status: snap.status }
  await applyPaidQuotaAddon(admin, { id: addon.id, invitation_id: addon.invitation_id, qty_guests: Number(addon.qty_guests) })
  await logAdminAction(admin.email, { action: 'payments.recheck', targetType: 'invitation', targetId: invitationId, meta: { type: 'addon' } })
  revalidateInvitation()
  return { ok: true, applied: true, status: snap.status }
}

export interface ReconcileMismatch {
  invitationId: string
  slug: string
  type: 'initial' | 'upgrade' | 'addon'
  issue: string
  canApply: boolean
}

/**
 * On-demand "Cocokkan sekarang": find payments Xendit considers PAID that our DB
 * hasn't applied (missed webhooks), across the three sources. Report-only — the
 * operator clicks "Terapkan" (adminRecheck*) to apply a matching one. Never trusts
 * a flag; every row is re-fetched from Xendit here.
 */
export async function adminReconcileXendit(): Promise<{ ok: boolean; error?: string; mismatches?: ReconcileMismatch[] }> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const out: ReconcileMismatch[] = []

  const { data: drafts } = (await db.from('invitations')
    .select('id, slug, plan, template_id, xendit_invoice_id, guest_quota_extra, expected_amount_idr')
    .eq('is_paid', false).not('xendit_invoice_id', 'is', null).limit(200)) as { data: any[] | null }
  for (const inv of drafts ?? []) {
    try {
      const snap = await getXenditInvoice(inv.xendit_invoice_id)
      if (!isPaidStatus(snap.status)) continue
      const resolved = await resolvePlan(inv.template_id, inv.plan)
      const expected = inv.expected_amount_idr ?? (resolved ? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0)) : null)
      const match = expected != null && snap.amountIDR === expected
      out.push({ invitationId: inv.id, slug: inv.slug, type: 'initial', canApply: match, issue: match ? 'Xendit LUNAS tapi belum diterapkan' : `Nominal beda (kita ${expected ?? '?'}, Xendit ${snap.amountIDR})` })
    } catch { /* skip a row Xendit can't return */ }
  }

  const slugFor = async (invId: string): Promise<string> => {
    const { data } = (await db.from('invitations').select('slug').eq('id', invId).maybeSingle()) as { data: { slug: string } | null }
    return data?.slug ?? invId
  }
  const { data: ups } = (await db.from('plan_upgrades')
    .select('id, invitation_id, amount_idr, xendit_invoice_id').eq('status', 'pending').not('xendit_invoice_id', 'is', null).limit(200)) as { data: any[] | null }
  for (const u of ups ?? []) {
    try {
      const snap = await getXenditInvoice(u.xendit_invoice_id)
      if (!isPaidStatus(snap.status)) continue
      const match = snap.amountIDR === Number(u.amount_idr)
      out.push({ invitationId: u.invitation_id, slug: await slugFor(u.invitation_id), type: 'upgrade', canApply: match, issue: match ? 'Upgrade LUNAS tapi belum diterapkan' : `Nominal beda (kita ${u.amount_idr}, Xendit ${snap.amountIDR})` })
    } catch {}
  }
  const { data: ads } = (await db.from('quota_addons')
    .select('id, invitation_id, amount_idr, xendit_invoice_id').eq('status', 'pending').not('xendit_invoice_id', 'is', null).limit(200)) as { data: any[] | null }
  for (const a of ads ?? []) {
    try {
      const snap = await getXenditInvoice(a.xendit_invoice_id)
      if (!isPaidStatus(snap.status)) continue
      const match = snap.amountIDR === Number(a.amount_idr)
      out.push({ invitationId: a.invitation_id, slug: await slugFor(a.invitation_id), type: 'addon', canApply: match, issue: match ? 'Kuota LUNAS tapi belum diterapkan' : `Nominal beda (kita ${a.amount_idr}, Xendit ${snap.amountIDR})` })
    } catch {}
  }

  await logAdminAction(admin.email, { action: 'payments.reconcile', meta: { found: out.length } })
  return { ok: true, mismatches: out }
}

/**
 * MANUAL refund: the operator already returned the money externally (offline
 * transfer, or a channel Xendit can't reverse). Records a succeeded refunds row +
 * reverses the entitlement. Works for any source EXCEPT comp (nothing to refund).
 * The amount is always the STORED paid amount (never client-supplied).
 */
export async function adminRefund(
  sourceType: RefundSourceType, sourceId: string, reason?: string,
  destination?: { bank?: string; account_no?: string; holder?: string },
): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const src = await loadRefundSource(db, sourceType, sourceId)
  if (!src) return { ok: false, error: 'Sumber tidak ditemukan / belum dibayar' }
  if (src.paidSource === 'comp') return { ok: false, error: 'Comp (gratis) tidak bisa direfund' }
  if (await sourceHasOpenRefund(db, sourceType, sourceId)) return { ok: false, error: 'Sumber ini sudah punya refund' }
  const { data: inserted, error } = await (db.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: sourceType, source_id: sourceId,
    amount_idr: src.amountIDR, method: 'manual', status: 'pending',
    destination: destination ?? null, reason: reason ?? null, admin_email: admin.email,
  }).select('id').single()
  if (error || !inserted) return { ok: false, error: 'Gagal mencatat refund' }
  // Operator already moved the money → settle now + reverse entitlement.
  await settleRefund(db, (inserted as { id: string }).id)
  await logAdminAction(admin.email, { action: 'refund.manual', targetType: 'invitation', targetId: src.invitationId, meta: { sourceType, amount: src.amountIDR } })
  revalidateInvitation()
  return { ok: true }
}

/**
 * XENDIT refund: calls the Xendit Refund API (returns to the original payment
 * method — can't be diverted). Records a PENDING row first, then fires the API;
 * the refund.succeeded webhook flips it to succeeded + reverses the entitlement.
 * xendit sources only — offline/manual money must use adminRefund.
 */
export async function adminRefundViaXendit(sourceType: RefundSourceType, sourceId: string, reason?: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const src = await loadRefundSource(db, sourceType, sourceId)
  if (!src) return { ok: false, error: 'Sumber tidak ditemukan / belum dibayar' }
  if (src.paidSource !== 'xendit') return { ok: false, error: 'Refund via Xendit hanya untuk pembayaran Xendit. Untuk manual/offline: transfer balik lalu "Tandai refund".' }
  if (!src.xenditInvoiceId) return { ok: false, error: 'Invoice Xendit tidak ditemukan untuk sumber ini' }
  if (await sourceHasOpenRefund(db, sourceType, sourceId)) return { ok: false, error: 'Sumber ini sudah punya refund' }
  const { data: inserted, error } = await (db.from('refunds') as any).insert({
    invitation_id: src.invitationId, source_type: sourceType, source_id: sourceId,
    amount_idr: src.amountIDR, method: 'xendit', status: 'pending', reason: reason ?? null, admin_email: admin.email,
  }).select('id').single()
  if (error || !inserted) return { ok: false, error: 'Gagal mencatat refund' }
  const refundRowId = (inserted as { id: string }).id
  let refund
  try {
    refund = await createXenditRefund(src.xenditInvoiceId, src.amountIDR)
  } catch (e) {
    await (db.from('refunds') as any).update({ status: 'failed', reason: `${reason ?? ''} [gagal: ${String(e).slice(0, 120)}]` }).eq('id', refundRowId)
    return { ok: false, error: 'Refund Xendit gagal (channel ini mungkin tak dukung refund API). Transfer balik manual lalu "Tandai refund".' }
  }
  await (db.from('refunds') as any).update({ xendit_refund_id: refund.id }).eq('id', refundRowId)
  // Some responses are SUCCEEDED synchronously; otherwise the webhook settles it.
  if (refund.status === 'SUCCEEDED') await settleRefund(db, refundRowId)
  await logAdminAction(admin.email, { action: 'refund.xendit', targetType: 'invitation', targetId: src.invitationId, meta: { sourceType, amount: src.amountIDR, xenditRefundId: refund.id, status: refund.status } })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Approve a user refund REQUEST → fire the matching refund path (which reverses
 * the entitlement + unpublishes an initial-purchase refund), then mark the request
 * approved. If the refund itself fails, the request stays pending (operator can
 * retry or switch to manual) — we never mark it approved without moving money.
 */
export async function adminApproveRefund(requestId: string, opts: { method: 'manual' | 'xendit'; note?: string }): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: req } = (await db.from('refund_requests')
    .select('id, invitation_id, source_type, source_id, status, usage_snapshot')
    .eq('id', requestId).maybeSingle()) as { data: any | null }
  if (!req) return { ok: false, error: 'Permintaan tidak ditemukan' }
  if (req.status !== 'pending') return { ok: false, error: 'Permintaan sudah diproses' }
  const sourceType = (req.source_type || 'initial') as RefundSourceType
  const sourceId = req.source_id || req.invitation_id
  const destination = req.usage_snapshot?.destination ?? undefined
  const refundRes = opts.method === 'xendit'
    ? await adminRefundViaXendit(sourceType, sourceId, 'Disetujui dari permintaan refund')
    : await adminRefund(sourceType, sourceId, 'Disetujui dari permintaan refund', destination)
  if (!refundRes.ok) return refundRes // leave request pending if the refund didn't go through
  await (db.from('refund_requests') as any)
    .update({ status: 'approved', decided_by: admin.email, decision_note: opts.note ?? null, decided_at: new Date().toISOString() })
    .eq('id', requestId)
  await logAdminAction(admin.email, { action: 'refund.approve', targetType: 'invitation', targetId: req.invitation_id, meta: { method: opts.method } })
  revalidateInvitation()
  return { ok: true }
}

/** Reject a user refund request with a reason (policy §7). No money moves. */
export async function adminRejectRefund(requestId: string, note?: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: req } = (await db.from('refund_requests').select('id, invitation_id, status').eq('id', requestId).maybeSingle()) as { data: any | null }
  if (!req) return { ok: false, error: 'Permintaan tidak ditemukan' }
  if (req.status !== 'pending') return { ok: false, error: 'Permintaan sudah diproses' }
  await (db.from('refund_requests') as any)
    .update({ status: 'rejected', decided_by: admin.email, decision_note: note ?? null, decided_at: new Date().toISOString() })
    .eq('id', requestId)
  await logAdminAction(admin.email, { action: 'refund.reject', targetType: 'invitation', targetId: req.invitation_id, meta: { note: note ?? null } })
  return { ok: true }
}
