import { useState } from 'react'
import type React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { type AttendanceRow } from './types'
import { badgeRsvp, badgeWalkin, badgeUnlisted } from './styles'
import ctrl from '../dashboardControls.module.css'
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
    <>
      {/* Desktop / Tablet View */}
      <div className={`${tabs.tableWrap} ${tabs.desktopOnly}`}>
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
                      className={ctrl.btnDelete}
                      aria-label={t.deleteAria}
                      title={t.deleteAria}
                    >
                      {deletingId === r.id ? '…' : (
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block' }}>
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Accordion Cards View */}
      <div className={tabs.mobileOnly}>
        {rows.map((r) => (
          <LedgerMobileCard
            key={r.id}
            r={r}
            souvenirEnabled={souvenirEnabled}
            labels={t}
            busyId={busyId}
            deletingId={deletingId}
            onToggleArrived={onToggleArrived}
            onToggleSouvenir={onToggleSouvenir}
            onTableChange={onTableChange}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  )
}

function LedgerMobileCard({
  r, souvenirEnabled, labels: t, busyId, deletingId,
  onToggleArrived, onToggleSouvenir, onTableChange, onDelete,
}: {
  r: AttendanceRow
  souvenirEnabled: boolean
  labels: Labels
  busyId: string | null
  deletingId: string | null
  onToggleArrived: (row: AttendanceRow) => void
  onToggleSouvenir: (row: AttendanceRow) => void
  onTableChange: (id: string, value: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const arrived = !!r.arrived_at
  const cat = attendanceCategory(r)

  return (
    <div
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(42, 33, 24, 0.04)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Compact Shrink Header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
          background: open ? 'rgba(42, 33, 24, 0.02)' : 'transparent',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</strong>
            <span style={cat === 'unlisted' ? badgeUnlisted : cat === 'walkin' ? badgeWalkin : badgeRsvp}>
              {cat === 'unlisted' ? t.sourceUnlisted : cat === 'walkin' ? t.sourceWalkin : t.sourceRsvp}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            aria-pressed={arrived}
            disabled={busyId === r.id}
            onClick={(e) => { e.stopPropagation(); onToggleArrived(r) }}
            title={arrived ? t.undoCheckIn : t.checkInBtn}
            style={{ ...checkBtn(arrived), height: 32, padding: '0 12px', fontSize: 12 }}
          >
            {arrived
              ? `✓ ${new Date(r.arrived_at as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : t.checkInBtn}
          </button>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Open Content with Motion */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '12px 14px 16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'grid',
                gap: 10,
                fontSize: 13,
                background: 'rgba(42, 33, 24, 0.01)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span style={mobileLbl}>{t.colGuests}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.guest_count}</span>
                </div>
                <div>
                  <span style={mobileLbl}>{t.colNote}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{r.note || '—'}</span>
                </div>
              </div>

              {souvenirEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
                  <div>
                    <span style={mobileLbl}>{t.colSouvenir}</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={r.souvenir_taken}
                        disabled={busyId === r.id}
                        onChange={() => onToggleSouvenir(r)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <span>{r.souvenir_taken ? 'Sudah Ambil' : 'Belum Ambil'}</span>
                    </label>
                  </div>
                  <div>
                    <span style={mobileLbl}>{t.colTable}</span>
                    <input
                      type="text"
                      defaultValue={r.table_no || ''}
                      placeholder={t.tablePlaceholder}
                      maxLength={24}
                      onBlur={(e) => onTableChange(r.id, e.target.value)}
                      style={{ width: '100%', maxWidth: 110, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(42,33,24,0.16)', fontSize: 13 }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  disabled={deletingId === r.id}
                  className={ctrl.btnGhostDanger}
                  style={{ height: 32, padding: '0 14px', fontSize: 12 }}
                  aria-label={t.deleteAria}
                  title={t.deleteAria}
                >
                  {deletingId === r.id ? 'Mengecek…' : 'Hapus Entry'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const mobileLbl: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'rgba(42, 33, 24, 0.5)',
  marginBottom: 2,
  fontWeight: 500,
}

function checkBtn(arrived: boolean): React.CSSProperties {
  return {
    minWidth: 84, height: 36, padding: '1px 16px 0 16px', borderRadius: '999px', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
    border: arrived ? '1px solid #2D8C4E' : '1px solid var(--border-strong)',
    background: arrived ? 'rgba(45,140,78,0.12)' : 'var(--surface-raised)',
    color: arrived ? '#2D8C4E' : 'var(--text-primary)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  }
}
