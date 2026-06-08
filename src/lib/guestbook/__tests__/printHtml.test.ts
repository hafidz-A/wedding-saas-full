import { describe, it, expect } from 'vitest'
import { buildPrintHtml } from '../printHtml'
import { type CsvLabels } from '../csvRows'

const L: CsvLabels = {
  name: 'Nama', source: 'Sumber', sourceRsvp: 'RSVP', sourceWalkin: 'Walk-in',
  guests: 'Jumlah', note: 'Catatan', arrived: 'Kehadiran', arrivedYes: 'Hadir', arrivedNo: 'Belum',
  souvenir: 'Souvenir', souvenirYes: 'Ya', souvenirNo: 'Tidak', table: 'Meja',
}
const row = {
  name: 'Budi', source: 'rsvp' as const, guest_count: 2, note: null,
  arrived_at: '2026-06-08T10:00:00Z', souvenir_taken: true, table_no: '12',
}

describe('buildPrintHtml', () => {
  it('renders a full HTML doc with the title and a row cell', () => {
    const html = buildPrintHtml([row], { title: 'Buku Tamu', souvenirEnabled: false, labels: L })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Buku Tamu')
    expect(html).toContain('<th>Nama</th>')
    expect(html).toContain('<td>Budi</td>')
  })
  it('escapes HTML special chars in cell content', () => {
    const html = buildPrintHtml(
      [{ ...row, name: '<script>&"x"' }],
      { title: 'T', souvenirEnabled: false, labels: L },
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;&amp;&quot;x&quot;')
  })
})
