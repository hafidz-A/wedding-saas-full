import { describe, it, expect, beforeEach, vi } from 'vitest'

const getUser = vi.fn()
const getAAL = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser, mfa: { getAuthenticatorAssuranceLevel: getAAL } },
  }),
}))

import { requireAdmin, AdminAuthError } from '../is-admin'

describe('requireAdmin', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'boss@x.com'
    getUser.mockReset(); getAAL.mockReset()
  })
  it('returns the email for an allowlisted, AAL2 session', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'boss@x.com' } } })
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal2' } })
    await expect(requireAdmin()).resolves.toEqual({ email: 'boss@x.com' })
  })
  it('throws not-admin for a non-allowlisted email', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'x@y.com' } } })
    await expect(requireAdmin()).rejects.toMatchObject({ reason: 'not-admin' })
  })
  it('throws mfa-required when the session is only AAL1', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'boss@x.com' } } })
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal1' } })
    await expect(requireAdmin()).rejects.toMatchObject({ reason: 'mfa-required' })
  })
})
