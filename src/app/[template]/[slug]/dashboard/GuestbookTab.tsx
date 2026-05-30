'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardDict } from './DashboardI18nProvider'
import {
  addWalkInAttendance,
  deleteAttendance,
  searchWalkInGuests,
  type WalkInGuestHit,
} from './guestbook/actions'
import { type AttendanceRow } from './guestbook/types'
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
    if (!confirm(t.deleteConfirm)) return
    setDeletingId(id)
    try {
      const res = await deleteAttendance(slug, id)
      if (!res.ok) {
        alert(res.error || t.deleteFailed)
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      alert(e?.message || t.networkError)
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

/* ──────────────── Walk-in dialog ──────────────── */

function WalkInDialog({
  slug,
  onClose,
  onAdded,
}: {
  slug: string
  onClose: () => void
  onAdded: (row: AttendanceRow) => void
}) {
  const t = useDashboardDict().tabs.guestbook
  const [q, setQ] = useState('')
  const [results, setResults] = useState<WalkInGuestHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [picked, setPicked] = useState<WalkInGuestHit | null>(null)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced typeahead — only while no guest is picked yet.
  useEffect(() => {
    if (picked) return
    const term = q.trim()
    if (!term) {
      setResults([])
      setSearched(false)
      return
    }
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const hits = await searchWalkInGuests(slug, term)
        setResults(hits)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
        setSearched(true)
      }
    }, 200)
    return () => clearTimeout(handle)
  }, [q, slug, picked])

  async function onSave() {
    if (!picked) return
    setSaving(true)
    setError(null)
    try {
      const res = await addWalkInAttendance({ slug, guestId: picked.id, count, note })
      if (res.ok && res.row) {
        onAdded(res.row)
        return
      }
      setError(
        res.code === 'duplicate'
          ? t.errDuplicate
          : res.code === 'not_found'
          ? t.errNotFound
          : res.error || t.errGeneric,
      )
    } catch (e: any) {
      setError(e?.message || t.errGeneric)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <header style={modalHeader}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 22 }}>
            {t.dialogTitle}
          </h3>
          <button type="button" onClick={onClose} style={modalClose} aria-label={t.dialogCancel}>
            ×
          </button>
        </header>

        {!picked ? (
          <>
            <input
              autoFocus
              type="search"
              placeholder={t.dialogSearchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ ...searchInput, width: '100%' }}
            />
            <div style={{ marginTop: 10 }}>
              {searching ? (
                <p style={dialogHint}>{t.dialogSearching}</p>
              ) : searched && results.length === 0 ? (
                <p style={dialogHint}>{t.dialogNoResults}</p>
              ) : (
                <ul style={resultList}>
                  {results.map((g) => (
                    <li key={g.id}>
                      <button type="button" style={resultRow} onClick={() => setPicked(g)}>
                        <span style={{ fontWeight: 600, color: '#2A2118' }}>{g.name}</span>
                        <span style={resultMeta}>
                          {[g.group_label, g.phone_masked].filter(Boolean).join(' · ') || ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={pickedCard}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#2A2118' }}>{picked.name}</p>
                {picked.group_label && <p style={resultMeta}>{picked.group_label}</p>}
              </div>
              <button type="button" style={ghostBtn} onClick={() => setPicked(null)}>
                {t.dialogChange}
              </button>
            </div>

            <label style={fieldLabel}>{t.dialogCountLabel}</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              style={{ ...searchInput, width: 120 }}
            />

            <label style={fieldLabel}>{t.dialogNoteLabel}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.dialogNotePlaceholder}
              rows={2}
              style={{ ...searchInput, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            />

            {error && <p style={errorText}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" style={ghostBtn} onClick={onClose} disabled={saving}>
                {t.dialogCancel}
              </button>
              <button type="button" style={primaryBtn} onClick={onSave} disabled={saving}>
                {saving ? t.dialogSaving : t.dialogSave}
              </button>
            </div>
          </>
        )}
      </div>
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

// ── Styles ──
const sub: React.CSSProperties = { margin: '4px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)', maxWidth: 540, lineHeight: 1.5 }
const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em' }
const primaryBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 999, border: 'none', background: '#2A2118', color: '#F5EFE3', cursor: 'pointer', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }
const filterBtn: React.CSSProperties = { padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.16)', background: 'transparent', cursor: 'pointer', fontSize: 12 }
const filterBtnActive: React.CSSProperties = { ...filterBtn, background: '#2A2118', color: '#F5EFE3', borderColor: '#2A2118' }
const statBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 14, border: '1px solid rgba(42,33,24,0.06)' }
const statLabel: React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,33,24,0.55)' }
const statValue: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 22 }
const searchInput: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.16)', fontSize: 14, outline: 'none', background: '#fff' }
const badgeRsvp: React.CSSProperties = { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, background: 'rgba(45,140,78,0.12)', color: '#2D8C4E', whiteSpace: 'nowrap' }
const badgeWalkin: React.CSSProperties = { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, background: 'rgba(232,85,62,0.12)', color: '#E8553E', whiteSpace: 'nowrap' }
const deleteBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(196,63,42,0.25)', background: 'transparent', color: '#C43F2A', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'grid', placeItems: 'center' }

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(42,33,24,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const modal: React.CSSProperties = { width: 'min(440px, 100%)', background: '#F5EFE3', borderRadius: 18, padding: 24, boxShadow: '0 24px 70px rgba(42,33,24,0.3)', maxHeight: '85vh', overflowY: 'auto' }
const modalHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }
const modalClose: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(42,33,24,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 20, lineHeight: 1 }
const dialogHint: React.CSSProperties = { margin: 0, fontSize: 13, color: 'rgba(42,33,24,0.6)', lineHeight: 1.5, padding: '8px 0' }
const resultList: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }
const resultRow: React.CSSProperties = { width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(42,33,24,0.1)', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }
const resultMeta: React.CSSProperties = { fontSize: 11, color: 'rgba(42,33,24,0.55)' }
const pickedCard: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid rgba(42,33,24,0.1)', marginBottom: 14 }
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, color: 'rgba(42,33,24,0.7)', margin: '12px 0 6px', letterSpacing: '0.04em' }
const errorText: React.CSSProperties = { margin: '12px 0 0', fontSize: 13, color: '#C43F2A' }
