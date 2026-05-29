import { describe, it, expect } from 'vitest'
import { activePeriodStatus } from '../active-period'

const now = Date.UTC(2026, 5, 1)

describe('activePeriodStatus', () => {
  it('draft when not paid', () => {
    expect(activePeriodStatus({ is_paid: false }, now).status).toBe('draft')
  })
  it('lifetime when paid and no expiry', () => {
    expect(activePeriodStatus({ is_paid: true, expires_at: null }, now).status).toBe('lifetime')
  })
  it('active when paid and expiry in the future', () => {
    const r = activePeriodStatus({ is_paid: true, expires_at: new Date(Date.UTC(2027, 0, 1)).toISOString() }, now)
    expect(r.status).toBe('active')
    expect(r.expiresAt).not.toBeNull()
  })
  it('expired when paid and expiry in the past', () => {
    expect(activePeriodStatus({ is_paid: true, expires_at: new Date(Date.UTC(2026, 0, 1)).toISOString() }, now).status).toBe('expired')
  })
})
