'use client'

import type React from 'react'
import { type AttendanceRow } from './types'
import { badgeRsvp, badgeWalkin, badgeUnlisted, deleteBtn } from './styles'
import { attendanceCategory } from '@/lib/guestbook/category'
import tabs from '../dashboardTabs.module.css'

interface Labels {
  colName: string; colSource: string; colGuests: string; colNote: string
  colArrived: string; colActions: string; colSouvenir: string; colTable: string
  sourceRsvp: string; sourceWalkin: string; sourceUnlisted: string
  checkInBtn: string; undoCheckIn: string; tablePlaceholder: string
  deleteAria: string
}

interface Props {
  rows: AttendanceRow[]
  souvenirEnabled: boolean
  labels: Labels
  busyId: string | null
  deletingId: string | null
  onToggleArrived: (row: AttendanceRow) => void
  onToggleSouvenir: (row: AttendanceRow) => void
  onTableChange: (id: string, value: string) => void
  onDelete: (id: string) => void
}

export default function LedgerTable({
  rows, souvenirEnabled, labels: t, busyId, deletingId,
  onToggleArrived, onToggleSouvenir, onTableChange, onDelete,
}: Props) {
  return (
    <div className={tabs.tableWrap}>
      <table className={tabs.table}>
        <thead>
          <tr>
            <th>{t.colName}</th>
            <th>{t.colSource}</th>
            <th>{t.colGuests}</th>
            <th>{t.colNote}</th>
            <th>{t.colArrived}</th>
            {souvenirEnabled && <th>{t.colSouvenir}</th>}
            {souvenirEnabled && <th>{t.colTable}</th>}
            <th>{t.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const arrived = !!r.arrived_at
            const cat = attendanceCategory(r)
            return (
              <tr key={r.id}>
                <td data-label={t.colName}><strong style={{ color: 'var(--text-primary)' }}>{r.name}</strong></td>
                <td data-label={t.colSource}>
                  <span style={cat === 'unlisted' ? badgeUnlisted : cat === 'walkin' ? badgeWalkin : badgeRsvp}>
                    {cat === 'unlisted' ? t.sourceUnlisted : cat === 'walkin' ? t.sourceWalkin : t.sourceRsvp}
                  </span>
                </td>
                <td data-label={t.colGuests}>{r.guest_count}</td>
                <td data-label={t.colNote} className={tabs.tdEllipsis} title={r.note || ''}>{r.note || '—'}</td>
                <td data-label={t.colArrived}>
                  <button
                    type="button"
                    aria-pressed={arrived}
                    disabled={busyId === r.id}
                    onClick={() => onToggleArrived(r)}
                    title={arrived ? t.undoCheckIn : t.checkInBtn}
                    style={checkBtn(arrived)}
                  >
                    {arrived
                      ? `✓ ${new Date(r.arrived_at as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                      : t.checkInBtn}
                  </button>
                </td>
                {souvenirEnabled && (
                  <td data-label={t.colSouvenir}>
                    <input
                      type="checkbox"
                      checked={r.souvenir_taken}
                      disabled={busyId === r.id}
                      onChange={() => onToggleSouvenir(r)}
                      aria-label={t.colSouvenir}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                  </td>
                )}
                {souvenirEnabled && (
                  <td data-label={t.colTable}>
                    <input
                      type="text"
                      defaultValue={r.table_no || ''}
                      placeholder={t.tablePlaceholder}
                      maxLength={24}
                      onBlur={(e) => onTableChange(r.id, e.target.value)}
                      style={{ width: 90, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 13 }}
                    />
                  </td>
                )}
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function checkBtn(arrived: boolean): React.CSSProperties {
  return {
    minWidth: 84, minHeight: 36, padding: '6px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
    border: arrived ? '1px solid #2D8C4E' : '1px solid var(--border-strong)',
    background: arrived ? 'rgba(45,140,78,0.12)' : 'var(--surface-raised)',
    color: arrived ? '#2D8C4E' : 'var(--text-primary)',
  }
}
