import { describe, it, expect } from 'vitest'
import { toCsvRows, type CsvLabels } from '../csvRows'

const L: CsvLabels = {
  name: 'Nama', source: 'Sumber', sourceRsvp: 'RSVP', sourceWalkin: 'Walk-in',
  guests: 'Jumlah', note: 'Catatan', arrived: 'Kehadiran', arrivedYes: 'Hadir', arrivedNo: 'Belum',
  souvenir: 'Souvenir', souvenirYes: 'Ya', souvenirNo: 'Tidak', table: 'Meja',
}
const row = {
  name: 'Budi', source: 'rsvp' as const, guest_count: 2, note: null,
  arrived_at: '2026-06-08T10:00:00Z', souvenir_taken: true, table_no: '12',
}

describe('toCsvRows', () => {
  it('omits souvenir/table columns when disabled', () => {
    const out = toCsvRows([row], { souvenirEnabled: false, labels: L })
    expect(Object.keys(out[0])).toEqual(['Nama', 'Sumber', 'Jumlah', 'Catatan', 'Kehadiran'])
    expect(out[0]).toMatchObject({ Nama: 'Budi', Sumber: 'RSVP', Jumlah: '2', Catatan: '', Kehadiran: 'Hadir' })
  })
  it('includes souvenir/table columns when enabled', () => {
    const out = toCsvRows([row], { souvenirEnabled: true, labels: L })
    expect(out[0].Souvenir).toBe('Ya')
    expect(out[0].Meja).toBe('12')
  })
  it('maps not-arrived + walk-in + null table', () => {
    const out = toCsvRows(
      [{ ...row, source: 'walkin', arrived_at: null, souvenir_taken: false, table_no: null }],
      { souvenirEnabled: true, labels: L },
    )
    expect(out[0]).toMatchObject({ Sumber: 'Walk-in', Kehadiran: 'Belum', Souvenir: 'Tidak', Meja: '' })
  })
})
