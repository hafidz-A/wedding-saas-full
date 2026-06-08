'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardDict } from './DashboardI18nProvider'
import { useConfirm, useAlert } from '@/components/dashboard/DialogProvider'
import {
  deleteAttendance,
} from './guestbook/actions'
import { type AttendanceRow } from './guestbook/types'
import WalkInDialog from './guestbook/WalkInDialog'
import {
  sub, ghostBtn, primaryBtn, filterBtn, filterBtnActive, statBox, statLabel,
  statValue, searchInput, badgeRsvp, badgeWalkin, deleteBtn,
} from './guestbook/styles'
import tabs from './dashboardTabs.module.css'

interface Props {
  slug: string
  attendances: AttendanceRow[]
}

/** arrived_at desc, nulls last; then created_at desc as the tiebreaker. */
function sortLedger(rows: AttendanceRow[]): AttendanceRow[] {
  return [...rows].sort((a, b) => {
    if (a.arrived_at && b.arrived_at) return b.arrived_at.localeCompare(a.arrived_at)
    if (a.arrived_at) return -1
    if (b.arrived_at) return 1
    return b.created_at.localeCompare(a.created_at)
  })
}

export default function GuestbookTab({ slug, attendances }: Props) {
  const t = useDashboardDict().tabs.guestbook
  const tc = useDashboardDict().tabs.common
  const confirmDialog = useConfirm()
  const showAlert = useAlert()
  const router = useRouter()

  // Local mirror so add/delete reflect immediately without re-decrypting the
  // whole dashboard tree (same approach as GuestsTab). Prop sync catches
  // external refreshes.
  const [rows, setRows] = useState<AttendanceRow[]>(attendances)
  useEffect(() => { setRows(attendances) }, [attendances])

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'rsvp' | 'walkin'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()
  const [showDialog, setShowDialog] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return sortLedger(
      rows.filter((r) => {
        if (filter !== 'all' && r.source !== filter) return false
        if (!q) return true
        return r.name.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q)
      }),
    )
  }, [rows, query, filter])

  const totalGuests = rows.reduce((sum, r) => sum + (r.guest_count || 0), 0)
  const walkinCount = rows.filter((r) => r.source === 'walkin').length

  async function onDelete(id: string) {
    if (!(await confirmDialog({ message: t.deleteConfirm, tone: 'danger' }))) return
    setDeletingId(id)
    try {
      const res = await deleteAttendance(slug, id)
      if (!res.ok) {
        await showAlert({ message: res.error || t.deleteFailed })
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      await showAlert({ message: e?.message || t.networkError })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={tabs.card}>
      <header className={tabs.headerRow}>
        <div>
          <h2>{t.title}</h2>
          <p style={sub}>{t.subtitle}</p>
        </div>
        <div className={tabs.headerActions}>
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={refreshing}
            style={ghostBtn}
          >
            {refreshing ? '…' : tc.refresh}
          </button>
          <button type="button" onClick={() => setShowDialog(true)} style={primaryBtn}>
            {t.addBtn}
          </button>
        </div>
      </header>

      <div className={tabs.statsRow}>
        <Stat label={t.statTotal} value={String(rows.length)} />
        <Stat label={t.statGuests} value={String(totalGuests)} accent="#E8553E" />
        <Stat label={t.statWalkins} value={String(walkinCount)} />
      </div>

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'rsvp', 'walkin'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={filter === f ? filterBtnActive : filterBtn}
            >
              {f === 'all' ? t.filterAll : f === 'rsvp' ? t.filterRsvp : t.filterWalkin}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={tabs.empty}>{t.emptyNone}</div>
      ) : filtered.length === 0 ? (
        <div className={tabs.empty}>{t.emptyFilter}</div>
      ) : (
        <div className={tabs.tableWrap}>
          <table className={tabs.table}>
            <thead>
              <tr>
                <th>{t.colName}</th>
                <th>{t.colSource}</th>
                <th>{t.colGuests}</th>
                <th>{t.colNote}</th>
                <th>{t.colArrived}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td data-label={t.colName}>
                    <strong style={{ color: '#2A2118' }}>{r.name}</strong>
                  </td>
                  <td data-label={t.colSource}>
                    <span style={r.source === 'walkin' ? badgeWalkin : badgeRsvp}>
                      {r.source === 'walkin' ? t.sourceWalkin : t.sourceRsvp}
                    </span>
                  </td>
                  <td data-label={t.colGuests}>{r.guest_count}</td>
                  <td data-label={t.colNote} className={tabs.tdEllipsis} title={r.note || ''}>
                    {r.note || '—'}
                  </td>
                  <td data-label={t.colArrived}>
                    {r.arrived_at
                      ? new Date(r.arrived_at).toLocaleString('id-ID')
                      : new Date(r.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td data-label={t.colActions}>
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      disabled={deletingId === r.id}
                      style={deleteBtn}
                      aria-label={t.deleteAria}
                      title={t.deleteAria}
                    >
                      {deletingId === r.id ? '…' : '×'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDialog && (
        <WalkInDialog
          slug={slug}
          onClose={() => setShowDialog(false)}
          onAdded={(row) => {
            setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)])
            setShowDialog(false)
          }}
        />
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
