import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { decryptField as decryptGuest } from '@/lib/guests/crypto'
import { decryptField as decryptApp } from '@/lib/crypto/app'
import { matchCheckinNames, type CheckinCandidate } from '@/lib/checkin/match'
import { timingSafeStrEqual } from '@/lib/security/timing'

const SEARCH_FAILED = 'Gagal mencari nama. Coba lagi.'

export async function POST(req: Request) {
  // Per IP, and a whole venue on one WiFi shares one IP: sized for a rush of
  // arrivals (each guest types a few debounced searches), not for one person.
  const limited = await enforceRateLimit(req, 'checkin-search', { windowMs: 60_000, max: 120 })
  if (limited) return limited

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ matches: [] }) }
  const slug = String(body?.slug || '').trim()
  const token = String(body?.token || '').trim()
  const q = String(body?.q || '').trim()
  if (!slug || !token || q.length < 3) return NextResponse.json({ matches: [] })

  const admin = createSupabaseAdminClient()
  const { data: inv, error: invErr } = (await admin
    .from('invitations')
    .select('id, is_published, is_paid, checkin_token')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean; checkin_token: string | null } | null; error: unknown }
  // An outage must not read as "Nama tidak ditemukan" on the guest's screen.
  if (invErr) return NextResponse.json({ error: SEARCH_FAILED }, { status: 500 })
  // Token-gate: no token match → no names, ever.
  if (!inv || !inv.is_published || !inv.is_paid || !inv.checkin_token || !timingSafeStrEqual(inv.checkin_token, token)) {
    return NextResponse.json({ matches: [] })
  }

  const [{ data: guests, error: gErr }, { data: rsvps, error: rErr }, { data: links, error: lErr }] = (await Promise.all([
    // fetchAllRows: a plain select stops at 1000 rows — guest #1001 would be "not found".
    fetchAllRows(() => admin.from('guests').select('id, name_enc, group_label', { count: 'exact' })
      .eq('invitation_id', inv.id).order('id')),
    fetchAllRows(() => admin.from('rsvps').select('id, guest_name_enc', { count: 'exact' })
      .eq('invitation_id', inv.id).order('id')),
    // Ledger rows that tie an RSVP to its invited guest (written by /api/rsvp).
    fetchAllRows(() => admin.from('attendances').select('rsvp_id', { count: 'exact' }).eq('invitation_id', inv.id)
      .not('rsvp_id', 'is', null).not('guest_id', 'is', null).order('id')),
  ])) as any

  if (gErr || rErr || lErr) return NextResponse.json({ error: SEARCH_FAILED }, { status: 500 })

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
