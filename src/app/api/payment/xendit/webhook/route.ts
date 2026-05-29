import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidCallbackToken } from '@/lib/payments/xendit'
import { resolvePlan } from '@/lib/payments/plans'

/**
 * Xendit invoice webhook. Authenticated by the `x-callback-token` header
 * (set in the Xendit dashboard). On a PAID event it publishes the matching
 * invitation. Idempotent — a row already paid is left untouched.
 */
export async function POST(req: Request) {
  if (!isValidCallbackToken(req.headers.get('x-callback-token'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { status?: string; external_id?: string }
  if (body.status !== 'PAID' || !body.external_id) {
    return NextResponse.json({ ok: true })
  }

  const admin = createSupabaseAdminClient()
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, plan, template_id, is_paid')
    .eq('xendit_external_id', body.external_id)
    .maybeSingle()) as {
    data: { id: string; plan: string; template_id: string; is_paid: boolean } | null
  }
  if (!inv || inv.is_paid) return NextResponse.json({ ok: true }) // unknown or already processed

  const now = Date.now()
  const resolved = resolvePlan(inv.template_id, inv.plan)
  await (admin.from('invitations') as any)
    .update({
      is_paid: true,
      is_published: true,
      paid_at: new Date(now).toISOString(),
      expires_at: resolved ? resolved.expiresAt(now) : null,
    })
    .eq('id', inv.id)

  return NextResponse.json({ ok: true })
}
