/**
 * One shared answer to "what does a guest see on this invitation right now?".
 *
 * The public page gates a guest on four columns plus a content check
 * (src/app/[template]/[slug]/page.tsx). Before this module existed that logic was
 * hand-rolled per surface, and /profile only ever checked two of them — so a
 * suspended or unpublished invitation still reported "Aktif seumur hidup".
 *
 * Pure on purpose: no I/O, no 'server-only'. The refund verdict lives in the
 * `refunds` ledger, so callers pass it in (they already batch-fetch it via
 * fetchRefundedMap / fetchRefundedAt).
 *
 * This does NOT replace activePeriodStatus. That one answers the billing question
 * (draft / active until / lifetime / expired); this one answers visibility. Both
 * are shown on the profile card.
 *
 * Not included, deliberately:
 * - `archived_at` — despite the 2026-07-04 spec listing it, archive does not affect
 *   public visibility (the public page never selects it; the admin copy describes it
 *   as list-hiding plus bookkeeping retention). If archive ever becomes a real
 *   takedown, THIS is the single place to add it.
 * - `pii_erased_at` — always written together with is_published=false, so
 *   'unpublished' already covers it, and owner_user_id is nulled so no owner sees
 *   the row at all.
 */

export type PublicStatus =
  | 'live'
  | 'refunded'
  | 'suspended'
  | 'expired'
  | 'unpaid'
  | 'unpublished'
  | 'not_ready'

export interface PublicStatusInput {
  is_paid?: boolean
  is_published?: boolean
  expires_at?: string | null
  suspended_at?: string | null
  config?: unknown
}

/** Same emptiness test the public page uses before rendering NotReadyInvitationView. */
function isConfigEmpty(config: unknown): boolean {
  if (!config || typeof config !== 'object') return true
  return Object.keys(config as Record<string, unknown>).length === 0
}

export function invitationPublicStatus(
  inv: PublicStatusInput,
  nowMs: number,
  opts?: { isRefunded?: boolean },
): PublicStatus {
  // Refund first: reverseEntitlement sets suspended_at on every refund, so without
  // this a refunded invitation would report as a plain admin takedown. The dashboard
  // already applies this same precedence.
  if (opts?.isRefunded) return 'refunded'

  // Expiry before suspension — that is the order the public page checks in, and an
  // expired page is what the guest actually gets.
  if (inv.expires_at && Date.parse(inv.expires_at) < nowMs) return 'expired'
  if (inv.suspended_at) return 'suspended'

  // The public gate is `is_published && is_paid`. Split here for the owner's benefit,
  // unpaid first because paying is the step that unblocks everything else.
  if (!inv.is_paid) return 'unpaid'
  if (!inv.is_published) return 'unpublished'

  if (isConfigEmpty(inv.config)) return 'not_ready'
  return 'live'
}

/**
 * Is this invitation administratively or permanently down — i.e. is every "spend
 * money on it" and "go look at it" action a dead end?
 *
 * Deliberately NOT derived from invitationPublicStatus(). That verdict answers
 * "what does a guest see", so it collapses a suspended-AND-expired invitation to
 * 'expired' (the public page checks expiry first, so an expired page is genuinely
 * what the guest gets). Gating the CTA on the collapsed value would offer a
 * renewal that cannot lift the suspension: startRenewal() checks only the period
 * and never reads suspended_at, so the owner would be charged for a renewal that
 * changes nothing — the dashboard's suspend gate still fires and the public page
 * still renders the takedown. Read the raw signal instead.
 */
export function invitationIsDown(
  inv: PublicStatusInput,
  opts?: { isRefunded?: boolean },
): boolean {
  return !!opts?.isRefunded || !!inv.suspended_at
}
