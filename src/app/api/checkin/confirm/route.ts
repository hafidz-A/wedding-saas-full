import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { decryptField as decryptGuest } from '@/lib/guests/crypto'
import { decryptField as decryptApp, encryptField as encryptApp } from '@/lib/crypto/app'

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
  if (!inv || !inv.is_published || !inv.is_paid || !inv.checkin_token || inv.checkin_token !== token) {
    return NextResponse.json({ error: 'Link tidak valid' }, { status: 403 })
  }

  const nowIso = new Date().toISOString()

  if (kind === 'rsvp') {
    const { data: rsvp } = (await admin
      .from('rsvps').select('id, invitation_id, guest_name_enc, guest_count')
      .eq('id', id).maybeSingle()) as { data: { id: string; invitation_id: string; guest_name_enc: string; guest_count: number | null } | null }
    if (!rsvp || rsvp.invitation_id !== inv.id) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    const name = decryptApp(rsvp.guest_name_enc) ?? ''
    const { data: existing } = (await admin
      .from('attendances').select('id').eq('invitation_id', inv.id).eq('rsvp_id', rsvp.id).maybeSingle()) as { data: { id: string } | null }
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('attendances') as any).update({ arrived_at: nowIso }).eq('id', existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('attendances') as any).insert({
        invitation_id: inv.id, rsvp_id: rsvp.id, guest_id: null,
        name_enc: encryptApp(name), guest_count: rsvp.guest_count ?? 1, source: 'rsvp', arrived_at: nowIso,
      })
    }
    return NextResponse.json({ ok: true, name })
  }

  // kind === 'guest'
  const { data: guest } = (await admin
    .from('guests').select('id, invitation_id, name_enc').eq('id', id).maybeSingle()) as { data: { id: string; invitation_id: string; name_enc: string } | null }
  if (!guest || guest.invitation_id !== inv.id) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  const name = decryptGuest(guest.name_enc) ?? ''
  const { data: existing } = (await admin
    .from('attendances').select('id').eq('invitation_id', inv.id).eq('guest_id', guest.id).maybeSingle()) as { data: { id: string } | null }
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('attendances') as any).update({ arrived_at: nowIso }).eq('id', existing.id)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('attendances') as any).insert({
      invitation_id: inv.id, guest_id: guest.id, rsvp_id: null,
      name_enc: encryptApp(name), guest_count: 1, source: 'walkin', arrived_at: nowIso,
    })
  }
  return NextResponse.json({ ok: true, name })
}
