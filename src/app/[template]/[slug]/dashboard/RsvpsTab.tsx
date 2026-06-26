'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsv, omitColumns } from './lib/csv'
import { useDashboardDict } from './DashboardI18nProvider'
import { useAlert } from '@/components/dashboard/DialogProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import tabs from './dashboardTabs.module.css'
import ctrl from './dashboardControls.module.css'

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
            className={ctrl.btnGhost}
            title="Refetch from Supabase"
          >
            {refreshing ? '…' : tc.refresh}
          </button>
          <button
            type="button"
            onClick={async () => { if (downloadCsv(`rsvps-${new Date().toISOString().slice(0, 10)}.csv`, omitColumns(rsvps as unknown as Record<string, unknown>[], ['id', 'created_at']))) fb.ok(fm.csvDownloaded); else await showAlert({ message: tc.nothingToExport }) }}
            className={ctrl.btnPrimary}
          >
            {tc.downloadCsv}
          </button>
        </div>
      </header>

      <div className={tabs.statsRow}>
        <Stat label={t.statResponses} value={String(rsvps.length)} />
        <Stat label={t.statAttending} value={String(yesCount)} accent="var(--color-emerald)" />
        <Stat label={t.statDeclined} value={String(noCount)} accent="#999" />
        <Stat label={t.statGuests} value={String(totalGuests)} accent="var(--interactive-primary)" />
      </div>

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={ctrl.input}
        />
        <div className={ctrl.seg}>
          {(['all', 'yes', 'no'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`${ctrl.segBtn} ${filter === f ? ctrl.segBtnActive : ''}`}
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

function Stat({ label, value, accent = 'var(--text-primary)' }: { label: string; value: string; accent?: string }) {
  return (
    <div style={statBox}>
      <p style={statLabel}>{label}</p>
      <p style={{ ...statValue, color: accent }}>{value}</p>
    </div>
  )
}

const statBox: React.CSSProperties = { background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid var(--border-subtle)' }
const statLabel: React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }
const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 26 }
const pillYes: React.CSSProperties = { padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--status-success-surface)', color: 'var(--color-emerald)', fontSize: 11, fontWeight: 500 }
const pillNo: React.CSSProperties = { padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }
