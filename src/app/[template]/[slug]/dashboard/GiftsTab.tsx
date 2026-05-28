'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsv } from './lib/csv'
import tabs from './dashboardTabs.module.css'

export interface GiftRow {
  id: string
  guest_name: string
  account_used: string
  amount: number | null
  currency: string | null
  message: string | null
  created_at: string
}

const fmtAmount = (n: number | null, currency: string | null) => {
  if (n == null) return '—'
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n} ${currency || ''}`.trim()
  }
}

export default function GiftsTab({ gifts }: { gifts: GiftRow[] }) {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return gifts
    return gifts.filter(
      (g) =>
        g.guest_name.toLowerCase().includes(q) ||
        g.account_used.toLowerCase().includes(q) ||
        (g.message || '').toLowerCase().includes(q),
    )
  }, [gifts, query])

  const totalAmount = gifts.reduce((sum, g) => sum + (g.amount || 0), 0)

  return (
    <div className={tabs.card}>
      <header className={tabs.headerRow}>
        <h2>Konfirmasi Hadiah</h2>
        <div className={tabs.headerActions}>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            style={ghostBtn}
          >
            {refreshing ? '…' : '↻ Refresh'}
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(`gifts-${new Date().toISOString().slice(0, 10)}.csv`, gifts as unknown as Record<string, unknown>[])}
            style={primaryBtn}
          >
            Download CSV
          </button>
        </div>
      </header>

      <div className={tabs.statsRow}>
        <Stat label="Konfirmasi" value={String(gifts.length)} />
        <Stat label="Total disclosed" value={fmtAmount(totalAmount || null, 'IDR')} accent="#E8553E" />
      </div>

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder="Cari nama, akun, atau pesan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
        />
      </div>

      {gifts.length === 0 ? (
        <div className={tabs.empty}>Belum ada konfirmasi hadiah.</div>
      ) : filtered.length === 0 ? (
        <div className={tabs.empty}>Tidak ada konfirmasi yang cocok.</div>
      ) : (
        <div className={tabs.tableWrap}>
          <table className={tabs.table}>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Akun</th>
                <th>Jumlah</th>
                <th>Pesan</th>
                <th>Diterima</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id}>
                  <td data-label="Nama">{g.guest_name}</td>
                  <td data-label="Akun">{g.account_used}</td>
                  <td data-label="Jumlah">{fmtAmount(g.amount, g.currency)}</td>
                  <td data-label="Pesan" className={tabs.tdEllipsis} title={g.message || ''}>{g.message || '—'}</td>
                  <td data-label="Diterima">{new Date(g.created_at).toLocaleString('id-ID')}</td>
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
const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 22 }
const searchInput: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
