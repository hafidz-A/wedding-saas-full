// src/app/admin/payments/actions.ts
'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { resolvePlan } from '@/lib/payments/plans'
import { initialPurchaseAmount } from '@/lib/payments/quota'
import { buildTransactions, transactionsToCsv } from '@/lib/payments/transactions'
import { fetchLedger } from './data'

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
