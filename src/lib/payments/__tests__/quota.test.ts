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
    expect(DEFAULT_BASE_QUOTA).toEqual({ basic: 200, premium: 300 })
  })
})

describe('blocks / quotaAddonAmount', () => {
  it('counts 50-guest blocks (round UP)', () => {
    expect(blocks(0)).toBe(0)
    expect(blocks(50)).toBe(1)
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
    expect(effectiveQuota(200, 0)).toBe(200)
    expect(effectiveQuota(300, 150)).toBe(450)
  })
  it('adds the add-on price onto the plan price', () => {
    expect(initialPurchaseAmount(149_000, 0)).toBe(149_000)
    expect(initialPurchaseAmount(149_000, 100)).toBe(169_000) // +2 blocks
    expect(initialPurchaseAmount(299_000, 50)).toBe(309_000)
  })
})

describe('clampQuotaExtra', () => {
  it('snaps UP to 50 and never exceeds cap - base', () => {
    expect(clampQuotaExtra(200, 0)).toBe(0)
    expect(clampQuotaExtra(200, 137)).toBe(150)   // ceil 137 -> 150
    expect(clampQuotaExtra(200, 999999)).toBe(4800) // cap 5000 - base 200
    expect(clampQuotaExtra(300, 999999)).toBe(4700)
    expect(clampQuotaExtra(200, -50)).toBe(0)     // never negative
  })
})

describe('snapQuotaToBlock', () => {
  it('rounds UP to the next 50, clamped to [min,max]', () => {
    expect(snapQuotaToBlock(237, 200, 5000)).toBe(250)
    expect(snapQuotaToBlock(222, 200, 5000)).toBe(250)  // ceil, not 200
    expect(snapQuotaToBlock(250, 200, 5000)).toBe(250)  // exact multiple stays
    expect(snapQuotaToBlock(1043, 200, 5000)).toBe(1050)
    expect(snapQuotaToBlock(1111, 200, 5000)).toBe(1150) // ceil, not 1100
    expect(snapQuotaToBlock(2139, 200, 5000)).toBe(2150)
    expect(snapQuotaToBlock(12456, 200, 5000)).toBe(5000) // cap
    expect(snapQuotaToBlock(10, 200, 5000)).toBe(200)     // below min
    expect(snapQuotaToBlock(NaN, 200, 5000)).toBe(200)    // garbage -> min
  })
})

describe('formatIDR', () => {
  it('formats with id-ID thousands separators', () => {
    expect(formatIDR(169000)).toBe('Rp 169.000')
  })
})
