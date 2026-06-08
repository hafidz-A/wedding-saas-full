export interface CsvLabels {
  name: string; source: string; sourceRsvp: string; sourceWalkin: string
  guests: string; note: string; arrived: string; arrivedYes: string; arrivedNo: string
  souvenir: string; souvenirYes: string; souvenirNo: string; table: string
}

export interface CsvInputRow {
  name: string
  source: 'rsvp' | 'walkin'
  guest_count: number
  note: string | null
  arrived_at: string | null
  souvenir_taken: boolean
  table_no: string | null
}

export function toCsvRows(
  rows: CsvInputRow[],
  opts: { souvenirEnabled: boolean; labels: CsvLabels },
): Record<string, string>[] {
  const { souvenirEnabled, labels: L } = opts
  return rows.map((r) => {
    const out: Record<string, string> = {
      [L.name]: r.name,
      [L.source]: r.source === 'walkin' ? L.sourceWalkin : L.sourceRsvp,
      [L.guests]: String(r.guest_count),
      [L.note]: r.note ?? '',
      [L.arrived]: r.arrived_at ? L.arrivedYes : L.arrivedNo,
    }
    if (souvenirEnabled) {
      out[L.souvenir] = r.souvenir_taken ? L.souvenirYes : L.souvenirNo
      out[L.table] = r.table_no ?? ''
    }
    return out
  })
}
