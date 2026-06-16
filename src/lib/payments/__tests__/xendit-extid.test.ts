import { describe, it, expect } from 'vitest'
import { invitationIdFromExternalId, renewalIdFromExternalId } from '../xendit'

const UUID = '0f3c5a1e-2b4d-4c6f-8a90-1234567890ab'

describe('invitationIdFromExternalId', () => {
  it('parses inv_ ids and ignores others', () => {
    expect(invitationIdFromExternalId(`inv_${UUID}_1700000000000`)).toBe(UUID)
    expect(invitationIdFromExternalId(`ren_${UUID}_1700000000000`)).toBeNull()
    expect(invitationIdFromExternalId(`upg_${UUID}_1`)).toBeNull()
    expect(invitationIdFromExternalId('garbage')).toBeNull()
    expect(invitationIdFromExternalId(null)).toBeNull()
  })
})

describe('renewalIdFromExternalId', () => {
  it('parses ren_ ids and ignores others', () => {
    expect(renewalIdFromExternalId(`ren_${UUID}_1700000000000`)).toBe(UUID)
    expect(renewalIdFromExternalId(`inv_${UUID}_1`)).toBeNull()
    expect(renewalIdFromExternalId(`upg_${UUID}_1`)).toBeNull()
    expect(renewalIdFromExternalId('ren_')).toBeNull()
    expect(renewalIdFromExternalId(undefined)).toBeNull()
  })
})
