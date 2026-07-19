import { describe, it, expect } from 'vitest'
import { buildManualMessage, buildManualLinks, type ManualPayContext } from '../manual-pay'

const dict = {
  order: { intro: 'Halo FinCards, saya mau beli undangan:', plan: 'Paket', template: 'Template',
    couple: 'Mempelai', date: 'Tanggal', venue: 'Lokasi', url: 'URL', guests: 'Jumlah tamu', lang: 'Bahasa' },
  existing: { 'pay-draft': 'Halo FinCards, saya mau menyelesaikan pembayaran undangan {{slug}} (paket {{plan}}).',
    renew: 'perpanjang {{slug}}', upgrade: 'upgrade {{slug}}', quota: 'kuota {{slug}}' },
  subject: { new: 'Pesanan undangan', 'pay-draft': 'Pembayaran {{slug}}', renew: 'Perpanjang {{slug}}',
    upgrade: 'Upgrade {{slug}}', quota: 'Kuota {{slug}}' },
}

const newCtx: ManualPayContext = { kind: 'new', templateLabel: 'Lovebirds', planName: 'Premium',
  priceLabel: 'Rp299.000', guestTotal: 300, bride: 'Apan', groom: 'Apin', dateLabel: '12/08/2026 16:00',
  venue: 'Mason Pine', slug: 'apan-apin', lang: 'en' }

describe('buildManualMessage', () => {
  it('new order includes every typed field', () => {
    const { plain } = buildManualMessage(newCtx, dict as any)
    for (const s of ['Premium', 'Rp299.000', 'Lovebirds', 'Apan', 'Apin', 'Mason Pine', 'apan-apin', '300'])
      expect(plain).toContain(s)
  })
  it('existing-invitation kind fills slug + plan', () => {
    const { plain } = buildManualMessage({ kind: 'pay-draft', templateLabel: '', planName: 'Basic',
      priceLabel: '', slug: 'adi-rani' }, dict as any)
    expect(plain).toContain('adi-rani'); expect(plain).toContain('Basic')
  })
})

describe('buildManualLinks', () => {
  it('builds a safe wa.me url and a mailto', () => {
    const { waUrl, mailtoUrl, emailAddress } = buildManualLinks(
      { whatsapp: '6285110553938', email: 'fincardsland@gmail.com' }, newCtx, dict as any)
    expect(waUrl.startsWith('https://wa.me/6285110553938?text=')).toBe(true)
    expect(mailtoUrl.startsWith('mailto:fincardsland@gmail.com?')).toBe(true)
    expect(emailAddress).toBe('fincardsland@gmail.com')
  })
  it('empty whatsapp → wa.me contact picker', () => {
    const { waUrl } = buildManualLinks({ whatsapp: '', email: 'x@y.com' }, newCtx, dict as any)
    expect(waUrl.startsWith('https://wa.me/?text=')).toBe(true)
  })
})
