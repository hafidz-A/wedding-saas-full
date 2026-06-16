import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../plans', () => ({ resolvePlan: vi.fn() }))
import { resolvePlan } from '../plans'
import { extendActivePeriod } from '../publish'

function fakeAdmin() {
  const calls: { value: any; col: string; val: unknown }[] = []
  const update = vi.fn((value: any) => ({
    eq: vi.fn((col: string, val: unknown) => {
      calls.push({ value, col, val })
      return Promise.resolve({ error: null })
    }),
  }))
  return { from: vi.fn(() => ({ update })), _calls: calls }
}

beforeEach(() => { vi.clearAllMocks() })

describe('extendActivePeriod', () => {
  it('sets a fresh expiry from the plan duration and republishes, without touching plan/is_paid', async () => {
    vi.mocked(resolvePlan).mockResolvedValue({
      planId: 'basic',
      amountIDR: 100000,
      expiresAt: (ms: number) => new Date(ms + 86_400_000).toISOString(),
    } as any)
    const admin = fakeAdmin()
    const now = 1_700_000_000_000
    await extendActivePeriod(admin as any, { id: 'inv-1', plan: 'basic', template_id: 'solary' }, now)

    expect(admin._calls).toHaveLength(1)
    expect(admin._calls[0].value.is_published).toBe(true)
    expect(admin._calls[0].value.expires_at).toBe(new Date(now + 86_400_000).toISOString())
    expect(admin._calls[0].value).not.toHaveProperty('is_paid')
    expect(admin._calls[0].value).not.toHaveProperty('plan')
    expect(admin._calls[0].col).toBe('id')
    expect(admin._calls[0].val).toBe('inv-1')
  })

  it('lifetime plan (null duration) clears expiry', async () => {
    vi.mocked(resolvePlan).mockResolvedValue({
      planId: 'premium',
      amountIDR: 200000,
      expiresAt: () => null,
    } as any)
    const admin = fakeAdmin()
    await extendActivePeriod(admin as any, { id: 'inv-2', plan: 'premium', template_id: 'solary' })
    expect(admin._calls[0].value.expires_at).toBeNull()
    expect(admin._calls[0].value.is_published).toBe(true)
  })
})
