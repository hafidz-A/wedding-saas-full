import { describe, it, expect } from 'vitest'
import { canApiRefund, needsRefundDestination } from '../refund-channels'

describe('needsRefundDestination', () => {
  it('manual payments always need a destination', () => {
    expect(needsRefundDestination('manual', null)).toBe(true)
    expect(needsRefundDestination('manual', 'gopay')).toBe(true)
  })
  it('midtrans VA/bank transfer needs a destination (no Direct Refund API)', () => {
    expect(needsRefundDestination('midtrans', 'bank_transfer')).toBe(true)
    expect(needsRefundDestination('midtrans', 'echannel')).toBe(true)
    expect(needsRefundDestination('midtrans', null)).toBe(true)
  })
  it('midtrans API-refundable channels do not need a destination', () => {
    expect(needsRefundDestination('midtrans', 'gopay')).toBe(false)
    expect(needsRefundDestination('midtrans', 'credit_card')).toBe(false)
  })
  it('comp/unknown sources need no destination (nothing to transfer back)', () => {
    expect(needsRefundDestination('comp', null)).toBe(false)
    expect(needsRefundDestination(null, null)).toBe(false)
  })
  it('canApiRefund stays consistent', () => {
    expect(canApiRefund('qris')).toBe(true)
    expect(canApiRefund('bank_transfer')).toBe(false)
  })
})
