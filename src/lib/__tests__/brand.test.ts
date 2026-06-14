import { describe, it, expect } from 'vitest'
import { BRAND, BRAND_PARTS } from '../brand'

describe('brand', () => {
  it('customer-facing brand is FinCards', () => {
    expect(BRAND).toBe('FinCards')
  })

  it('BRAND_PARTS compose to BRAND (guards against lead/tail desync)', () => {
    expect(BRAND_PARTS.lead + BRAND_PARTS.tail).toBe(BRAND)
  })
})
