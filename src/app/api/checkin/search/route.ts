import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { decryptField as decryptGuest } from '@/lib/guests/crypto'
import { decryptField as decryptApp } from '@/lib/crypto/app'
import { matchCheckinNames, type CheckinCandidate } from '@/lib/checkin/match'
import { timingSafeStrEqual } from '@/lib/security/timing'

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'checkin-search', { windowMs: 60_000, max: 30 })
  if (limited) return limited

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ matches: [] }) }
  const slug = String(body?.slug || '').trim()
  const token = String(body?.token || '').trim()
  const q = String(body?.q || '').trim()
  if (!slug || !token || q.length < 3) return NextResponse.json({ matches: [] })

  const admin = createSupabaseAdminClient()
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, is_published, is_paid, checkin_token')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean; checkin_token: string | null } | null }
  // Token-gate: no token match → no names, ever.
  if (!inv || !inv.is_published || !inv.is_paid || !inv.checkin_token || !timingSafeStrEqual(inv.checkin_token, token)) {
    return NextResponse.json({ matches: [] })
  }

  const [{ data: guests }, { data: rsvps }, { data: links }] = (await Promise.all([
    admin.from('guests').select('id, name_enc, group_label').eq('invitation_id', inv.id),
    admin.from('rsvps').select('id, guest_name_enc').eq('invitation_id', inv.id),
    // Ledger rows that tie an RSVP to its invited guest (written by /api/rsvp).
    admin.from('attendances').select('rsvp_id').eq('invitation_id', inv.id)
      .not('rsvp_id', 'is', null).not('guest_id', 'is', null),
  ])) as any

  // An RSVP already linked to its guest is the same person: list the guest
  // only (confirming by guest_id stamps that same ledger row), so the matcher's
  // same-name grouping isn't fooled into showing them twice.
  const linkedRsvp = new Set<string>((links || []).map((l: { rsvp_id: string }) => l.rsvp_id))

  const candidates: CheckinCandidate[] = []
  for (const g of guests || []) {
    const name = decryptGuest(g.name_enc) ?? ''
    if (name) candidates.push({ kind: 'guest', id: g.id, name, label: g.group_label || null })
  }
  for (const r of rsvps || []) {
    if (linkedRsvp.has(r.id)) continue
    const name = decryptApp(r.guest_name_enc) ?? ''
    if (name) candidates.push({ kind: 'rsvp', id: r.id, name })
  }

  return NextResponse.json({ matches: matchCheckinNames(q, candidates) })
}
