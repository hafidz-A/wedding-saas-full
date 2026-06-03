import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { encryptField } from '@/lib/crypto/app'
import { enforceRateLimit } from '@/lib/security/rate-limit'

/**
 * POST /api/gift
 * Body: { slug, guest_name, account_used, amount?, currency?, message? }
 *
 * Mirrors /api/rsvp. Inserts into gift_confirmations on behalf of the guest.
 */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'gift', { windowMs: 60_000, max: 10 })
  if (limited) return limited

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, guest_name, account_used, amount, currency, message } = body || {}

  if (!slug || !guest_name || !account_used) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, guest_name, account_used' },
      { status: 400 },
    )
  }

  const supabase = createSupabaseAdminClient()

  const { data: invitation, error: invErr } = (await supabase
    .from('invitations')
    .select('id, is_published, is_paid')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean } | null; error: any }

  if (invErr || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  // Match the public page gate: only accept submissions for a LIVE invitation
  // (published AND paid).
  if (!invitation.is_published || !invitation.is_paid) {
    return NextResponse.json({ error: 'Invitation not published' }, { status: 403 })
  }

  // Normalize amount — strip thousand separators, allow empty
  let normalizedAmount: number | null = null
  if (amount !== undefined && amount !== null && String(amount).trim() !== '') {
    const cleaned = String(amount).replace(/[^\d.]/g, '')
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    normalizedAmount = parsed
  }

  const { error } = await (supabase.from('gift_confirmations') as any).insert({
    invitation_id: invitation.id,
    guest_name_enc: encryptField(String(guest_name).slice(0, 120)),
    account_used: String(account_used).slice(0, 120), // plaintext — couple's own account label
    amount_enc: encryptField(normalizedAmount != null ? String(normalizedAmount) : null),
    currency: (currency ? String(currency) : 'IDR').slice(0, 8),
    message_enc: encryptField(message ? String(message).slice(0, 500) : null),
  })

  if (error) {
    console.error('[gift insert]', error)
    return NextResponse.json({ error: 'Failed to record gift confirmation' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
