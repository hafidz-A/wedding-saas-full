import { describe, it, expect } from 'vitest'
import {
  refundedKeySet, mapInitial, buildTransactions, summarize, jakartaYearMonth,
  monthlyTrend, conversion, transactionsToCsv, type InitialRow, type AddonUpgradeRow, type RefundRow,
} from '../transactions'

const init = (o: Partial<InitialRow> & { id: string; slug: string }): InitialRow => ({
  paid_amount_idr: 149000, paid_source: 'xendit', fee_idr: 0, paid_at: '2026-07-01T03:00:00Z', ...o,
})
const aux = (o: Partial<AddonUpgradeRow> & { id: string; invitation_id: string; slug: string }): AddonUpgradeRow => ({
  amount_idr: 50000, fee_idr: 0, paid_at: '2026-07-02T03:00:00Z', ...o,
})

describe('refundedKeySet', () => {
  it('includes only succeeded refunds with a source_id', () => {
    const refunds: RefundRow[] = [
      { source_type: 'initial', source_id: 'a', status: 'succeeded' },
      { source_type: 'addon', source_id: 'b', status: 'pending' },
      { source_type: 'initial', source_id: null, status: 'succeeded' },
    ]
    const s = refundedKeySet(refunds)
    expect(s.has('initial:a')).toBe(true)
    expect(s.has('addon:b')).toBe(false)
    expect(s.size).toBe(1)
  })
})

describe('mapInitial', () => {
  it('maps source + marks refunded by key', () => {
    const refunded = new Set(['initial:x'])
    expect(mapInitial(init({ id: 'x', slug: 's', paid_source: 'manual' }), refunded)).toMatchObject({
      key: 'initial:x', type: 'initial', source: 'manual', status: 'refunded', amountIDR: 149000,
    })
    expect(mapInitial(init({ id: 'y', slug: 's', paid_source: null }), refunded).source).toBe('xendit')
    expect(mapInitial(init({ id: 'z', slug: 's', paid_source: 'comp', paid_amount_idr: 0 }), refunded).status).toBe('paid')
  })
})

describe('buildTransactions', () => {
  it('unions 3 sources and sorts newest first', () => {
    const txns = buildTransactions({
      initials: [init({ id: 'i1', slug: 'a', paid_at: '2026-07-01T00:00:00Z' })],
      upgrades: [aux({ id: 'u1', invitation_id: 'i1', slug: 'a', paid_at: '2026-07-03T00:00:00Z' })],
      addons: [aux({ id: 'ad1', invitation_id: 'i1', slug: 'a', paid_at: '2026-07-02T00:00:00Z' })],
      refunds: [],
    })
    expect(txns.map((t) => t.type)).toEqual(['upgrade', 'addon', 'initial'])
    expect(txns.find((t) => t.type === 'upgrade')?.source).toBe('xendit')
  })
})

describe('summarize', () => {
  it('nets out comp + refunded, computes net = gross − fees, groups by source', () => {
    const txns = buildTransactions({
      initials: [
        init({ id: 'i1', slug: 'a', paid_amount_idr: 149000, paid_source: 'xendit', fee_idr: 4000 }),
        init({ id: 'i2', slug: 'b', paid_amount_idr: 200000, paid_source: 'manual', fee_idr: 0 }),
        init({ id: 'i3', slug: 'c', paid_amount_idr: 0, paid_source: 'comp' }),
        init({ id: 'i4', slug: 'd', paid_amount_idr: 149000, paid_source: 'xendit' }),
      ],
      upgrades: [], addons: [],
      refunds: [{ source_type: 'initial', source_id: 'i4', status: 'succeeded' }],
    })
    const s = summarize(txns)
    expect(s.grossIDR).toBe(349000)        // i1 + i2 (i3 comp, i4 refunded excluded)
    expect(s.feesIDR).toBe(4000)
    expect(s.netIDR).toBe(345000)
    expect(s.refundedIDR).toBe(149000)     // i4
    expect(s.compCount).toBe(1)
    expect(s.bySource.xendit).toBe(149000)
    expect(s.bySource.manual).toBe(200000)
    expect(s.count).toBe(2)
  })
})

describe('jakartaYearMonth', () => {
  it('shifts to WIB so a UTC-late-night payment counts in the WIB day/month', () => {
    // 2026-06-30 18:00 UTC = 2026-07-01 01:00 WIB → July
    expect(jakartaYearMonth('2026-06-30T18:00:00Z')).toBe('2026-07')
    expect(jakartaYearMonth('')).toBe('')
  })
})

describe('monthlyTrend', () => {
  it('returns n months oldest→newest with gross bucketed in WIB', () => {
    const now = Date.parse('2026-07-15T00:00:00Z')
    const txns = buildTransactions({
      initials: [
        init({ id: 'i1', slug: 'a', paid_amount_idr: 100000, paid_at: '2026-07-10T03:00:00Z' }),
        init({ id: 'i2', slug: 'b', paid_amount_idr: 50000, paid_at: '2026-06-10T03:00:00Z' }),
      ],
      upgrades: [], addons: [], refunds: [],
    })
    const trend = monthlyTrend(txns, now, 3)
    expect(trend.map((p) => p.month)).toEqual(['2026-05', '2026-06', '2026-07'])
    expect(trend[2].grossIDR).toBe(100000)
    expect(trend[1].grossIDR).toBe(50000)
    expect(trend[0].grossIDR).toBe(0)
  })
})

describe('conversion', () => {
  it('computes rate', () => {
    expect(conversion(3, 1)).toEqual({ paid: 3, drafts: 1, total: 4, ratePct: 75 })
    expect(conversion(0, 0).ratePct).toBe(0)
  })
})

describe('transactionsToCsv', () => {
  it('has a header + escapes commas/quotes', () => {
    const txns = buildTransactions({
      initials: [init({ id: 'i1', slug: 'a,b"c', paid_amount_idr: 149000 })],
      upgrades: [], addons: [], refunds: [],
    })
    const csv = transactionsToCsv(txns)
    const [header, row] = csv.split('\n')
    expect(header).toBe('slug,tipe,sumber,status,jumlah_idr,fee_idr,tanggal')
    expect(row).toContain('"a,b""c"')
    expect(row).toContain('149000')
  })
})
