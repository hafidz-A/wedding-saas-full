import { describe, it, expect } from 'vitest'
import { anonymizedInvitationPatch } from '../pdp'

describe('anonymizedInvitationPatch', () => {
  const p = anonymizedInvitationPatch('abcd1234-5678-9012', '2026-07-09T00:00:00.000Z')

  it('strips every personal identifier', () => {
    expect(p.email).toBeNull()
    expect(p.owner_email).toBeNull()
    expect(p.owner_user_id).toBeNull()
    expect(p.config).toEqual({})
    expect(p.slug).toBe('deleted-abcd1234') // name-bearing slug replaced
    expect(p.is_published).toBe(false)
  })

  it('sets the erased + archived markers', () => {
    expect(p.pii_erased_at).toBe('2026-07-09T00:00:00.000Z')
    expect(p.archived_at).toBe('2026-07-09T00:00:00.000Z')
  })

  it('does NOT touch the financial columns (kept by omission)', () => {
    // The patch must never set is_paid / paid_amount_idr / paid_source / plan —
    // those survive so the row stays a valid financial record.
    for (const k of ['is_paid', 'paid_amount_idr', 'paid_source', 'plan', 'template_id']) {
      expect(k in p).toBe(false)
    }
  })
})
