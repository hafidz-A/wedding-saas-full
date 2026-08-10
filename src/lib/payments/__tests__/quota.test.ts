import { describe, it, expect } from 'vitest'
import {
  BLOCK_SIZE, BLOCK_PRICE_IDR, QUOTA_CAP, DEFAULT_BASE_QUOTA,
  blocks, quotaAddonAmount, effectiveQuota, initialPurchaseAmount,
  clampQuotaExtra, snapQuotaToBlock, formatIDR,
} from '../quota'

describe('quota constants', () => {
  it('are the agreed values', () => {
    expect(BLOCK_SIZE).toBe(50)
    expect(BLOCK_PRICE_IDR).toBe(10_000)
    expect(QUOTA_CAP).toBe(5000)
    expect(DEFAULT_BASE_QUOTA).toEqual({ basic: 400, premium: 500 })
  })
})

describe('blocks / quotaAddonAmount', () => {
  it('counts 50-guest blocks (round UP)', () => {
    expect(blocks(0)).toBe(0)
    expect(blocks(50)).toBe(1)
    expect(blocks(25)).toBe(1)    // a partial block is a whole paid block
    expect(blocks(150)).toBe(3)
  })
  it('prices each block at Rp10k', () => {
    expect(quotaAddonAmount(0)).toBe(0)
    expect(quotaAddonAmount(50)).toBe(10_000)
    expect(quotaAddonAmount(300)).toBe(60_000)
  })
})

describe('effectiveQuota / initialPurchaseAmount', () => {
  it('adds base + extra', () => {
    expect(effectiveQuota(400, 0)).toBe(400)
    expect(effectiveQuota(500, 200)).toBe(700)
  })
  it('adds the add-on price onto the plan price', () => {
    expect(initialPurchaseAmount(199_999, 0)).toBe(199_999)
    expect(initialPurchaseAmount(199_999, 200)).toBe(239_999) // +4 blocks
    expect(initialPurchaseAmount(249_999, 100)).toBe(269_999) // +2 blocks
  })
})

describe('clampQuotaExtra', () => {
  it('snaps UP to 50 and never exceeds cap - base', () => {
    expect(clampQuotaExtra(400, 0)).toBe(0)
    expect(clampQuotaExtra(400, 137)).toBe(150)     // ceil 137 -> 150
    expect(clampQuotaExtra(400, 999999)).toBe(4600) // cap 5000 - base 400
    expect(clampQuotaExtra(500, 999999)).toBe(4500)
    expect(clampQuotaExtra(400, -100)).toBe(0)      // never negative
  })
})

describe('snapQuotaToBlock', () => {
  it('rounds UP to the next 50, clamped to [min,max]', () => {
    expect(snapQuotaToBlock(437, 400, 5000)).toBe(450)
    expect(snapQuotaToBlock(422, 400, 5000)).toBe(450)  // ceil, not 400
    expect(snapQuotaToBlock(500, 400, 5000)).toBe(500)  // exact multiple stays
    expect(snapQuotaToBlock(1043, 400, 5000)).toBe(1050)
    expect(snapQuotaToBlock(1111, 400, 5000)).toBe(1150) // ceil, not 1100
    expect(snapQuotaToBlock(2139, 400, 5000)).toBe(2150)
    expect(snapQuotaToBlock(12456, 400, 5000)).toBe(5000) // cap
    expect(snapQuotaToBlock(10, 400, 5000)).toBe(400)     // below min
    expect(snapQuotaToBlock(NaN, 400, 5000)).toBe(400)    // garbage -> min
  })
})

describe('formatIDR', () => {
  it('formats with id-ID thousands separators', () => {
    expect(formatIDR(169000)).toBe('Rp 169.000')
  })
})
