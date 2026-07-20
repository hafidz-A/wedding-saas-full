import { describe, it, expect } from 'vitest'
import { refundApprovedEmail, refundRejectedEmail } from '../refund-emails'

describe('refundApprovedEmail', () => {
  it('gateway method mentions automatic return + ETA', () => {
    const { subject, html } = refundApprovedEmail({ method: 'gateway' })
    expect(subject).toContain('disetujui')
    expect(html).toContain('metode pembayaran')
    expect(html).toContain('hari kerja')
    expect(html).toContain('/images/brand/fincards-logo-email.png')
  })
  it('manual method mentions the provided account', () => {
    expect(refundApprovedEmail({ method: 'manual' }).html).toContain('rekening')
  })
  it('states the invitation is permanently deactivated', () => {
    expect(refundApprovedEmail({ method: 'gateway' }).html).toContain('permanen')
  })
})

describe('refundRejectedEmail', () => {
  it('escapes the operator note', () => {
    const { html } = refundRejectedEmail({ note: '<script>x</script> & "quotes"' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
  it('renders without a note', () => {
    expect(refundRejectedEmail({}).html).toContain('balas email ini')
  })
})
