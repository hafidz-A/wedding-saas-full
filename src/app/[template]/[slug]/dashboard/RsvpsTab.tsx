'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsv, omitColumns } from './lib/csv'
import { useDashboardDict } from './DashboardI18nProvider'
import { useAlert } from '@/components/dashboard/DialogProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
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
  const dd = useDashboardDict()
  const t = dd.tabs.rsvps
  const tc = dd.tabs.common
  const fm = dd.feedback
  const fb = useFeedback()
  const showAlert = useAlert()
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
        <h2>{t.title}</h2>
        <div className={tabs.headerActions}>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            style={ghostBtn}
            title="Refetch from Supabase"
          >
            {refreshing ? '…' : tc.refresh}
          </button>
          <button
            type="button"
            onClick={async () => { if (downloadCsv(`rsvps-${new Date().toISOString().slice(0, 10)}.csv`, omitColumns(rsvps as unknown as Record<string, unknown>[], ['id', 'created_at']))) fb.ok(fm.csvDownloaded); else await showAlert({ message: tc.nothingToExport }) }}
            style={primaryBtn}
          >
            {tc.downloadCsv}
          </button>
        </div>
      </header>

      <div className={tabs.statsRow}>
        <Stat label={t.statResponses} value={String(rsvps.length)} />
        <Stat label={t.statAttending} value={String(yesCount)} accent="#2D8C4E" />
        <Stat label={t.statDeclined} value={String(noCount)} accent="#999" />
        <Stat label={t.statGuests} value={String(totalGuests)} accent="#E8553E" />
      </div>

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder={t.searchPlaceholder}
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
              {f === 'all' ? t.filterAll : f === 'yes' ? t.filterYes : t.filterNo}
            </button>
          ))}
        </div>
      </div>

      {rsvps.length === 0 ? (
        <div className={tabs.empty}>{t.emptyNone}</div>
      ) : filtered.length === 0 ? (
        <div className={tabs.empty}>{t.emptyFilter}</div>
      ) : (
        <div className={tabs.tableWrap}>
          <table className={tabs.table}>
            <thead>
              <tr>
                <th>{t.colName}</th>
                <th>{t.colAttending}</th>
                <th>{t.colGuests}</th>
                <th>{t.colMeal}</th>
                <th>{t.colMessage}</th>
                <th>{t.colReceived}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td data-label={t.colName}>{r.guest_name}</td>
                  <td data-label={t.colAttending}>
                    <span style={r.attending ? pillYes : pillNo}>
                      {r.attending ? t.yes : t.no}
                    </span>
                  </td>
                  <td data-label={t.colGuests}>{r.attending ? r.guest_count ?? 1 : '—'}</td>
                  <td data-label={t.colMeal}>{r.meal_choice || '—'}</td>
                  <td data-label={t.colMessage} className={tabs.tdEllipsis} title={r.message || ''}>{r.message || '—'}</td>
                  <td data-label={t.colReceived}>{new Date(r.created_at).toLocaleString('id-ID')}</td>
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

const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'transparent', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }
const primaryBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 'var(--radius-pill)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }
const statBox: React.CSSProperties = { background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid var(--border-subtle)' }
const statLabel: React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }
const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 26 }
const searchInput: React.CSSProperties = { padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)' }
const filterTabs: React.CSSProperties = { display: 'flex', gap: 4, background: 'var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: 4 }
const tabBtn: React.CSSProperties = { padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(42,33,24,0.65)' }
const tabActive: React.CSSProperties = { ...tabBtn, background: 'var(--surface-raised)', color: 'var(--text-primary)', fontWeight: 500 }
const pillYes: React.CSSProperties = { padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: '#E0F2E5', color: 'var(--color-emerald)', fontSize: 11, fontWeight: 500 }
const pillNo: React.CSSProperties = { padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }
