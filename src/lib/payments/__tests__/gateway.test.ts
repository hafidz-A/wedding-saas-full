import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import {
  mintOrderId, invitationIdFromOrderId, renewalIdFromOrderId,
  parseGrossAmount, isPaidStatus, verifySignature,
} from '../gateway'
import { canApiRefund } from '../refund-channels'

const UUID = '123e4567-e89b-12d3-a456-426614174000' // 36 chars

describe('mintOrderId', () => {
  it('stays within Midtrans 50-char limit for every prefix', () => {
    for (const p of ['inv', 'ren', 'upg', 'qta'] as const) {
      const id = mintOrderId(p, UUID, 1752480000000)
      expect(id.length).toBeLessThanOrEqual(50)
      expect(id.startsWith(`${p}_${UUID}_`)).toBe(true)
      expect(id).toMatch(/^[A-Za-z0-9._~-]+$/) // allowed charset only
    }
  })
})

describe('order-id parsers', () => {
  it('extracts the invitation id from an inv_ order id', () => {
    expect(invitationIdFromOrderId(mintOrderId('inv', UUID))).toBe(UUID)
  })
  it('extracts the invitation id from a ren_ order id', () => {
    expect(renewalIdFromOrderId(mintOrderId('ren', UUID))).toBe(UUID)
  })
  it('returns null for other prefixes / malformed input', () => {
    expect(invitationIdFromOrderId(mintOrderId('upg', UUID))).toBeNull()
    expect(invitationIdFromOrderId('inv_x')).toBeNull()
    expect(invitationIdFromOrderId(null)).toBeNull()
    expect(renewalIdFromOrderId(mintOrderId('inv', UUID))).toBeNull()
  })
})

describe('parseGrossAmount', () => {
  it('normalizes Midtrans decimal strings to integer IDR', () => {
    expect(parseGrossAmount('149000.00')).toBe(149000)
    expect(parseGrossAmount(149000)).toBe(149000)
  })
  it('returns NaN for junk', () => {
    expect(Number.isNaN(parseGrossAmount('abc'))).toBe(true)
    expect(Number.isNaN(parseGrossAmount(undefined))).toBe(true)
  })
})

describe('isPaidStatus', () => {
  it('settlement is paid', () => expect(isPaidStatus('settlement')).toBe(true))
  it('capture+accept is paid', () => expect(isPaidStatus('capture', 'accept')).toBe(true))
  it('capture without fraud_status is paid', () => expect(isPaidStatus('capture', null)).toBe(true))
  it('capture+challenge is NOT paid', () => expect(isPaidStatus('capture', 'challenge')).toBe(false))
  it('pending/deny/expire/cancel are NOT paid', () => {
    for (const s of ['pending', 'deny', 'expire', 'cancel', 'refund']) expect(isPaidStatus(s)).toBe(false)
  })
})

describe('verifySignature', () => {
  beforeEach(() => { process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-TEST' })
  const sig = (orderId: string, code: string, gross: string) =>
    createHash('sha512').update(`${orderId}${code}${gross}SB-Mid-server-TEST`).digest('hex')

  it('accepts a genuine notification', () => {
    expect(verifySignature({
      order_id: 'inv_abc_123', status_code: '200', gross_amount: '149000.00',
      signature_key: sig('inv_abc_123', '200', '149000.00'),
    })).toBe(true)
  })
  it('rejects a tampered amount', () => {
    expect(verifySignature({
      order_id: 'inv_abc_123', status_code: '200', gross_amount: '1.00',
      signature_key: sig('inv_abc_123', '200', '149000.00'),
    })).toBe(false)
  })
  it('rejects missing fields', () => {
    expect(verifySignature({})).toBe(false)
    expect(verifySignature({ order_id: 'x', status_code: '200', gross_amount: '1.00' })).toBe(false)
  })
})

describe('canApiRefund', () => {
  it('accepts every documented API-refundable channel', () => {
    for (const c of ['credit_card', 'gopay', 'shopeepay', 'dana', 'ovo', 'qris', 'kredivo', 'akulaku'])
      expect(canApiRefund(c)).toBe(true)
  })
  it('rejects VA/bank transfer, unknown, and missing channels', () => {
    expect(canApiRefund('bank_transfer')).toBe(false)
    expect(canApiRefund('echannel')).toBe(false)
    expect(canApiRefund(null)).toBe(false)
    expect(canApiRefund(undefined)).toBe(false)
  })
})
