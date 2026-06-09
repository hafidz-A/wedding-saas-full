'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardDict } from './DashboardI18nProvider'
import { useConfirm, useAlert } from '@/components/dashboard/DialogProvider'
import {
  setArrived,
  updateAttendanceMeta,
  setSouvenirTracking,
  deleteAttendance,
} from './guestbook/actions'
import { type AttendanceRow } from './guestbook/types'
import WalkInDialog from './guestbook/WalkInDialog'
import StatsRow from './guestbook/StatsRow'
import LedgerTable from './guestbook/LedgerTable'
import { downloadCsv } from './lib/csv'
import { toCsvRows, type CsvLabels } from '@/lib/guestbook/csvRows'
import { attendanceCategory } from '@/lib/guestbook/category'
import { buildPrintHtml } from '@/lib/guestbook/printHtml'
import {
  sub, ghostBtn, primaryBtn, filterBtn, filterBtnActive, searchInput,
} from './guestbook/styles'
import tabs from './dashboardTabs.module.css'

interface Props {
  slug: string
  attendances: AttendanceRow[]
  souvenirEnabled: boolean
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

export default function GuestbookTab({ slug, attendances, souvenirEnabled }: Props) {
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
  const [filter, setFilter] = useState<'all' | 'rsvp' | 'walkin' | 'unlisted'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'arrived' | 'not'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [souvenirOn, setSouvenirOn] = useState(souvenirEnabled)
  useEffect(() => { setSouvenirOn(souvenirEnabled) }, [souvenirEnabled])
  const [refreshing, startRefresh] = useTransition()
  const [showDialog, setShowDialog] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return sortLedger(
      rows.filter((r) => {
        if (statusFilter === 'arrived' && !r.arrived_at) return false
        if (statusFilter === 'not' && r.arrived_at) return false
        if (filter !== 'all' && attendanceCategory(r) !== filter) return false
        if (!q) return true
        return r.name.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q)
      }),
    )
  }, [rows, query, filter, statusFilter])

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

  async function onToggleArrived(row: AttendanceRow) {
    const next = row.arrived_at ? null : new Date().toISOString()
    setBusyId(row.id)
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, arrived_at: next } : r)))
    const res = await setArrived(slug, row.id, !!next)
    if (!res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, arrived_at: row.arrived_at } : r)))
      await showAlert({ message: res.error || t.networkError })
    }
    setBusyId(null)
  }

  async function onToggleSouvenir(row: AttendanceRow) {
    const next = !row.souvenir_taken
    setBusyId(row.id)
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, souvenir_taken: next } : r)))
    const res = await updateAttendanceMeta(slug, row.id, { souvenirTaken: next })
    if (!res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, souvenir_taken: row.souvenir_taken } : r)))
      await showAlert({ message: res.error || t.networkError })
    }
    setBusyId(null)
  }

  async function onTableChange(id: string, value: string) {
    const trimmed = value.trim().slice(0, 24) || null
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, table_no: trimmed } : r)))
    const res = await updateAttendanceMeta(slug, id, { tableNo: trimmed })
    if (!res.ok) await showAlert({ message: res.error || t.networkError })
  }

  async function onToggleSouvenirTracking() {
    const next = !souvenirOn
    setSouvenirOn(next)
    const res = await setSouvenirTracking(slug, next)
    if (!res.ok) {
      setSouvenirOn(!next)
      await showAlert({ message: res.error || t.networkError })
    }
  }

  const csvLabels: CsvLabels = {
    name: t.colName, source: t.colSource, sourceRsvp: t.sourceRsvp, sourceWalkin: t.sourceWalkin,
    guests: t.colGuests, note: t.colNote, arrived: t.colArrived,
    arrivedYes: t.exportArrivedYes, arrivedNo: t.exportArrivedNo,
    souvenir: t.colSouvenir, souvenirYes: t.souvenirYes, souvenirNo: t.souvenirNo, table: t.colTable,
  }

  function onExportCsv() {
    const records = toCsvRows(filtered, { souvenirEnabled: souvenirOn, labels: csvLabels })
    if (!downloadCsv(`buku-tamu-${new Date().toISOString().slice(0, 10)}.csv`, records)) {
      void showAlert({ message: tc.nothingToExport })
    }
  }

  function onPrint() {
    const html = buildPrintHtml(filtered, { title: t.printTitle, souvenirEnabled: souvenirOn, labels: csvLabels })
    const w = window.open('', '_blank')
    if (!w) { void showAlert({ message: tc.nothingToExport }); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!id) id = setInterval(() => router.refresh(), 15000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop())
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [router])

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
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={souvenirOn} onChange={onToggleSouvenirTracking} />
            {t.souvenirToggle}
          </label>
          <button type="button" onClick={onExportCsv} style={ghostBtn}>{tc.downloadCsv}</button>
          <button type="button" onClick={onPrint} style={ghostBtn}>{t.printBtn}</button>
          <button type="button" onClick={() => setShowDialog(true)} style={primaryBtn}>
            {t.addBtn}
          </button>
        </div>
      </header>

      <StatsRow
        rows={rows}
        labels={{ statTotal: t.statTotal, statArrived: t.statArrived, statAttendeesArrived: t.statAttendeesArrived, statNotArrived: t.statNotArrived, statWalkins: t.statWalkins }}
      />

      <div className={tabs.filterRow}>
        <input
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'rsvp', 'walkin', 'unlisted'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={filter === f ? filterBtnActive : filterBtn}
            >
              {f === 'all' ? t.filterAll : f === 'rsvp' ? t.filterRsvp : f === 'walkin' ? t.filterWalkin : t.filterUnlisted}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'arrived', 'not'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setStatusFilter(f)} style={statusFilter === f ? filterBtnActive : filterBtn}>
              {f === 'all' ? t.filterAll : f === 'arrived' ? t.filterArrived : t.filterNotArrived}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={tabs.empty}>{t.emptyNone}</div>
      ) : filtered.length === 0 ? (
        <div className={tabs.empty}>{t.emptyFilter}</div>
      ) : (
        <LedgerTable
          rows={filtered}
          souvenirEnabled={souvenirOn}
          labels={{
            colName: t.colName, colSource: t.colSource, colGuests: t.colGuests, colNote: t.colNote,
            colArrived: t.colArrived, colActions: t.colActions, colSouvenir: t.colSouvenir, colTable: t.colTable,
            sourceRsvp: t.sourceRsvp, sourceWalkin: t.sourceWalkin, sourceUnlisted: t.sourceUnlisted,
            checkInBtn: t.checkInBtn, undoCheckIn: t.undoCheckIn, tablePlaceholder: t.tablePlaceholder,
            deleteAria: t.deleteAria,
          }}
          busyId={busyId}
          deletingId={deletingId}
          onToggleArrived={onToggleArrived}
          onToggleSouvenir={onToggleSouvenir}
          onTableChange={onTableChange}
          onDelete={onDelete}
        />
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
