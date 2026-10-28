import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { decryptField as decryptGuest } from '@/lib/guests/crypto'
import { decryptField as decryptApp, encryptField as encryptApp } from '@/lib/crypto/app'
import { timingSafeStrEqual } from '@/lib/security/timing'

const SAVE_FAILED = 'Gagal mencatat kehadiran. Coba lagi.'

/** A malformed id (Postgres 22P02, not a uuid) is "not found", not an outage. */
function isOutage(error: unknown): boolean {
  return !!error && (error as { code?: string }).code !== '22P02'
}

/**
 * Stamp arrival on the ledger row for this person (matched by rsvp_id or
 * guest_id), inserting one if none exists. Returns false on ANY database
 * failure so the guest never sees "tercatat" for an arrival that wasn't saved.
 * A unique-index conflict (23505) means a concurrent confirm inserted the row
 * first — that row is then stamped instead of failing.
 */
async function markArrived(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invitationId: string,
  col: 'rsvp_id' | 'guest_id',
  value: string,
  insertRow: Record<string, unknown>,
): Promise<boolean> {
  const nowIso = new Date().toISOString()
  const stamp = async (): Promise<boolean> => {
    const { data: existing, error } = (await admin
      .from('attendances').select('id').eq('invitation_id', invitationId).eq(col, value).maybeSingle()) as { data: { id: string } | null; error: unknown }
    if (error || !existing) return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await (admin.from('attendances') as any)
      .update({ arrived_at: nowIso }).eq('id', existing.id).eq('invitation_id', invitationId)
    return !upErr
  }

  const { data: existing, error: selErr } = (await admin
    .from('attendances').select('id').eq('invitation_id', invitationId).eq(col, value).maybeSingle()) as { data: { id: string } | null; error: unknown }
  if (selErr) return false
  if (existing) return stamp()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (admin.from('attendances') as any).insert({ ...insertRow, arrived_at: nowIso })
  if (!insErr) return true
  if ((insErr as { code?: string }).code === '23505') return stamp()
  console.error('[checkin confirm]', insErr)
  return false
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'checkin-confirm', { windowMs: 60_000, max: 15 })
  if (limited) return limited

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const slug = String(body?.slug || '').trim()
  const token = String(body?.token || '').trim()
  const kind = body?.kind === 'rsvp' ? 'rsvp' : body?.kind === 'guest' ? 'guest' : null
  const id = String(body?.id || '').trim()
  if (!slug || !token || !kind || !id) return NextResponse.json({ error: 'Permintaan tidak lengkap' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, is_published, is_paid, checkin_token')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean; checkin_token: string | null } | null }
  if (!inv || !inv.is_published || !inv.is_paid || !inv.checkin_token || !timingSafeStrEqual(inv.checkin_token, token)) {
    return NextResponse.json({ error: 'Link tidak valid' }, { status: 403 })
  }

  if (kind === 'rsvp') {
    const { data: rsvp, error } = (await admin
      .from('rsvps').select('id, invitation_id, guest_name_enc, guest_count')
      .eq('id', id).maybeSingle()) as { data: { id: string; invitation_id: string; guest_name_enc: string; guest_count: number | null } | null; error: unknown }
    if (isOutage(error)) return NextResponse.json({ error: SAVE_FAILED }, { status: 500 })
    if (!rsvp || rsvp.invitation_id !== inv.id) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    const name = decryptApp(rsvp.guest_name_enc) ?? ''
    const ok = await markArrived(admin, inv.id, 'rsvp_id', rsvp.id, {
      invitation_id: inv.id, rsvp_id: rsvp.id, guest_id: null,
      name_enc: encryptApp(name), guest_count: rsvp.guest_count ?? 1, source: 'rsvp',
    })
    if (!ok) return NextResponse.json({ error: SAVE_FAILED }, { status: 500 })
    return NextResponse.json({ ok: true, name })
  }

  // kind === 'guest'
  const { data: guest, error } = (await admin
    .from('guests').select('id, invitation_id, name_enc').eq('id', id).maybeSingle()) as { data: { id: string; invitation_id: string; name_enc: string } | null; error: unknown }
  if (isOutage(error)) return NextResponse.json({ error: SAVE_FAILED }, { status: 500 })
  if (!guest || guest.invitation_id !== inv.id) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  const name = decryptGuest(guest.name_enc) ?? ''
  const ok = await markArrived(admin, inv.id, 'guest_id', guest.id, {
    invitation_id: inv.id, guest_id: guest.id, rsvp_id: null,
    name_enc: encryptApp(name), guest_count: 1, source: 'walkin',
  })
  if (!ok) return NextResponse.json({ error: SAVE_FAILED }, { status: 500 })
  return NextResponse.json({ ok: true, name })
}
