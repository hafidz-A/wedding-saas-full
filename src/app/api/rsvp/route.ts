import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { encryptField } from '@/lib/crypto/app'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { consumeGuestTokenForRsvp, markGuestRsvpSubmitted } from '@/lib/guests/tokenGate'

/**
 * POST /api/rsvp
 * Body: { slug, guest_name, attending, guest_count, meal_choice?, message? }
 *
 * Uses the admin (service_role) client so RLS bypass is intentional —
 * we want guests to submit RSVPs without auth, but ONLY for their own
 * invitation. Slug is resolved here on the server, never trusted from
 * the client.
 */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'rsvp', { windowMs: 60_000, max: 10 })
  if (limited) return limited

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, guest_name, attending, guest_count, meal_choice, message, token } = body || {}

  if (!slug || !guest_name || typeof attending !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing required fields: slug, guest_name, attending' },
      { status: 400 },
    )
  }

  const supabase = createSupabaseAdminClient()

  // Resolve slug → invitation_id server-side
  const { data: invitation, error: invErr } = (await supabase
    .from('invitations')
    .select('id, is_published, is_paid')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean } | null; error: any }

  if (invErr || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  // Match the public page gate: a guest may only submit to a LIVE invitation
  // (published AND paid). Blocks writes to a draft/unpaid row reached directly.
  if (!invitation.is_published || !invitation.is_paid) {
    return NextResponse.json({ error: 'Invitation not published' }, { status: 403 })
  }

  // Single-use token gate + duplicate-RSVP guard. Consume only if the code is
  // valid, unused, AND the guest hasn't already RSVP'd. Generic 403 (no
  // wrong-vs-used oracle); friendly 409 for a guest who already submitted (e.g.
  // the owner regenerated their code). Preview/demo never reaches here (the
  // form simulates).
  let check
  try {
    check = await consumeGuestTokenForRsvp(supabase, invitation.id, String(token || ''))
  } catch (e) {
    console.error('[rsvp token]', e)
    return NextResponse.json({ error: 'Couldn’t verify your code. Please try again.' }, { status: 500 })
  }
  if (check.result === 'already_rsvped') {
    return NextResponse.json({ error: 'You’ve already submitted your RSVP.' }, { status: 409 })
  }
  if (check.result !== 'ok') {
    return NextResponse.json(
      { error: 'Invalid or already-used code. Ask the couple for a new one.' },
      { status: 403 },
    )
  }

  const cleanName = String(guest_name).slice(0, 120)
  // No product-level max — couples decide how many companions a guest may
  // bring. 999 is only an abuse guard against absurd payloads.
  const cleanCount = Math.min(999, Math.max(1, Number(guest_count) || 1))
  const cleanMessage = message ? String(message).slice(0, 500) : null

  const { data: rsvp, error } = (await (supabase.from('rsvps') as any)
    .insert({
      invitation_id: invitation.id,
      guest_name_enc: encryptField(cleanName),
      attending,
      guest_count: cleanCount,
      meal_choice: meal_choice ? String(meal_choice).slice(0, 80) : null,
      message_enc: encryptField(cleanMessage),
    })
    .select('id')
    .single()) as { data: { id: string } | null; error: any }

  if (error || !rsvp) {
    console.error('[rsvp insert]', error)
    return NextResponse.json({ error: 'Failed to record RSVP' }, { status: 500 })
  }

  // Auto-populate the Buku Tamu (attendance ledger) for guests who are
  // coming. The unique index on attendances(rsvp_id) keeps this dup-free
  // across retries; a missing table (migration not yet applied) or a
  // duplicate must NOT fail the guest-facing RSVP submission.
  if (attending) {
    const { error: attErr } = await (supabase.from('attendances') as any).insert({
      invitation_id: invitation.id,
      rsvp_id: rsvp.id,
      guest_id: null,
      name_enc: encryptField(cleanName),
      guest_count: cleanCount,
      source: 'rsvp',
      note_enc: encryptField(cleanMessage),
      arrived_at: null,
    })
    if (attErr) {
      console.warn('[rsvp→attendance]', attErr.message ?? attErr)
    }
  }

  // Permanent RSVP-completed marker — set AFTER the row is safely inserted so a
  // failed insert above (which returns 500 earlier) stays recoverable via token
  // regenerate. Blocks a duplicate RSVP even if the owner later regenerates the
  // guest's code.
  await markGuestRsvpSubmitted(supabase, check.guestId)

  return NextResponse.json({ ok: true })
}
