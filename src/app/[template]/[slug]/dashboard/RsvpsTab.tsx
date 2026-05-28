'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsv } from './lib/csv'
import tabs from './dashboardTabs.module.css'

export interface RsvpRow {
  id: string
  guest_name: string
  attending: boolean
  guest_count: number | null
  meal_choice: string | null
  message: string | null
  created_at: string
}

export default function RsvpsTab({ rsvps }: { rsvps: RsvpRow[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'yes' | 'no'>('all')
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return rsvps.filter((r) => {
      if (filter === 'yes' && !r.attending) return false
      if (filter === 'no' && r.attending) return false
      if (!q) return true
      return (
        r.guest_name.toLowerCase().includes(q) ||
        (r.meal_choice || '').toLowerCase().includes(q) ||
        (r.message || '').toLowerCase().includes(q)
      )
    })
  }, [rsvps, query, filter])

  const yesCount = rsvps.filter((r) => r.attending).length
  const noCount = rsvps.length - yesCount
  const totalGuests = rsvps
    .filter((r) => r.attending)
    .reduce((sum, r) => sum + (r.guest_count || 1), 0)

  return (
    <div className={tabs.card}>
      <header className={tabs.headerRow}>
        <h2>RSVPs</h2>
        <div className={tabs.headerActions}>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            style={ghostBtn}
            title="Refetch from Supabase"
          >
            {refreshing ? '…' : '↻ Refresh'}
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(`rsvps-${new Date().toISOString().slice(0, 10)}.csv`, rsvps as unknown as Record<string, unknown>[])}
            style={primaryBtn}
          >
            Download CSV
          </button>
        </div>
      </header>

      <div className={tabs.statsRow}>
        <Stat label="Responses" value={String(rsvps.length)} />
        <Stat label="Attending" value={String(yesCount)} accent="#2D8C4E" />
        <Stat label="Declined" value={String(noCount)} accent="#999" />
        <Stat label="Est. guests" value={String(totalGuests)} accent="#E8553E" />
      </div>

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder="Cari nama, meal, atau pesan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
        />
        <div style={filterTabs}>
          {(['all', 'yes', 'no'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={filter === f ? tabActive : tabBtn}
            >
              {f === 'all' ? 'Semua' : f === 'yes' ? 'Hadir' : 'Tidak'}
            </button>
          ))}
        </div>
      </div>

      {rsvps.length === 0 ? (
        <div className={tabs.empty}>Belum ada RSVP. Tamu yang submit form akan muncul di sini.</div>
      ) : filtered.length === 0 ? (
        <div className={tabs.empty}>Tidak ada RSVP yang cocok dengan filter.</div>
      ) : (
        <div className={tabs.tableWrap}>
          <table className={tabs.table}>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Hadir</th>
                <th>Tamu</th>
                <th>Meal</th>
                <th>Pesan</th>
                <th>Diterima</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td data-label="Nama">{r.guest_name}</td>
                  <td data-label="Hadir">
                    <span style={r.attending ? pillYes : pillNo}>
                      {r.attending ? 'Ya' : 'Tidak'}
                    </span>
                  </td>
                  <td data-label="Jumlah tamu">{r.attending ? r.guest_count ?? 1 : '—'}</td>
                  <td data-label="Meal">{r.meal_choice || '—'}</td>
                  <td data-label="Pesan" className={tabs.tdEllipsis} title={r.message || ''}>{r.message || '—'}</td>
                  <td data-label="Diterima">{new Date(r.created_at).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent = '#2A2118' }: { label: string; value: string; accent?: string }) {
  return (
    <div style={statBox}>
      <p style={statLabel}>{label}</p>
      <p style={{ ...statValue, color: accent }}>{value}</p>
    </div>
  )
}

const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }
const primaryBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 999, border: 'none', background: '#2A2118', color: '#F5EFE3', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }
const statBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 14, border: '1px solid rgba(42,33,24,0.06)' }
const statLabel: React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,33,24,0.55)' }
const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 26 }
const searchInput: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
const filterTabs: React.CSSProperties = { display: 'flex', gap: 4, background: 'rgba(42,33,24,0.06)', borderRadius: 999, padding: 4 }
const tabBtn: React.CSSProperties = { padding: '6px 14px', borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(42,33,24,0.65)' }
const tabActive: React.CSSProperties = { ...tabBtn, background: '#fff', color: '#2A2118', fontWeight: 500 }
const pillYes: React.CSSProperties = { padding: '3px 10px', borderRadius: 999, background: '#E0F2E5', color: '#2D8C4E', fontSize: 11, fontWeight: 500 }
const pillNo: React.CSSProperties = { padding: '3px 10px', borderRadius: 999, background: 'rgba(42,33,24,0.08)', color: 'rgba(42,33,24,0.6)', fontSize: 11, fontWeight: 500 }
