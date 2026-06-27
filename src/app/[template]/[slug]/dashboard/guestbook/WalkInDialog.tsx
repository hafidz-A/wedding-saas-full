'use client'

import { useEffect, useState } from 'react'
import { useDashboardDict } from '../DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import { addWalkInAttendance, addUnlistedAttendance, searchWalkInGuests, type WalkInGuestHit } from './actions'
import { type AttendanceRow } from './types'
import {
  overlay, modal, modalHeader, modalClose, dialogHint, resultList,
  resultRow, resultMeta, pickedCard, fieldLabel, errorText,
} from './styles'
import ctrl from '../dashboardControls.module.css'

export default function WalkInDialog({
  slug,
  existingRows = [],
  onClose,
  onAdded,
}: {
  slug: string
  /** Names/ids already in the ledger — used to warn that a pick will reconcile. */
  existingRows?: { guest_id: string | null; name: string }[]
  onClose: () => void
  onAdded: (row: AttendanceRow) => void
}) {
  const t = useDashboardDict().tabs.guestbook
  const [q, setQ] = useState('')
  const [results, setResults] = useState<WalkInGuestHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [picked, setPicked] = useState<WalkInGuestHit | null>(null)
  const [count, setCount] = useState<number | ''>(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const confirmDialog = useConfirm()

  // Debounced typeahead — only while no guest is picked yet.
  useEffect(() => {
    if (picked || manualMode) return
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
    const c = count === '' ? 0 : count
    if (c < 1) { setError(t.countMin); return }
    setSaving(true)
    setError(null)
    try {
      const res = await addWalkInAttendance({ slug, guestId: picked.id, count: c, note })
      if (res.ok && res.row) {
        fb.ok(fm.walkinAdded)
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
      fb.fail(fm.updateFail)
    } catch (e: any) {
      setError(e?.message || t.errGeneric)
      fb.fail(fm.updateFail)
    } finally {
      setSaving(false)
    }
  }

  function startManual() {
    setManualName(q.trim())
    setError(null)
    setManualMode(true)
  }

  async function onSaveUnlisted() {
    const name = manualName.trim()
    if (!name) { setError(t.unlistedNameRequired); return }
    const c = count === '' ? 0 : count
    if (c < 1) { setError(t.countMin); return }
    const ok = await confirmDialog({ message: t.unlistedConfirm.replace('{name}', name), tone: 'danger' })
    if (!ok) return
    setSaving(true)
    setError(null)
    try {
      const res = await addUnlistedAttendance({ slug, name, count: c, note })
      if (res.ok && res.row) {
        fb.ok(fm.guestAdded)
        onAdded(res.row)
        return
      }
      setError(res.error || t.errGeneric)
      fb.fail(fm.updateFail)
    } catch (e: any) {
      setError(e?.message || t.errGeneric)
      fb.fail(fm.updateFail)
    } finally {
      setSaving(false)
    }
  }

  const pickedInBook =
    !!picked &&
    existingRows.some(
      (r) =>
        (picked.id && r.guest_id === picked.id) ||
        r.name.trim().toLowerCase() === picked.name.trim().toLowerCase(),
    )

  return (
    <div style={overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <header style={modalHeader}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 22 }}>
            {t.dialogTitle}
          </h3>
          <button type="button" onClick={onClose} style={modalClose} aria-label={t.dialogCancel}>
            ×
          </button>
        </header>

        {picked ? (
          <>
            <div style={pickedCard}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{picked.name}</p>
                {picked.group_label && <p style={resultMeta}>{picked.group_label}</p>}
              </div>
              <button type="button" className={ctrl.btnGhost}onClick={() => setPicked(null)}>
                {t.dialogChange}
              </button>
            </div>

            {pickedInBook && (
              <p
                style={{
                  margin: '10px 0 0',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(232,85,62,0.08)',
                  border: '1px solid rgba(232,85,62,0.25)',
                  color: 'var(--interactive-primary-hover)',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {t.alreadyInBook}
              </p>
            )}

            <label style={fieldLabel}>{t.dialogCountLabel}</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={count}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') { setCount(''); return }
                const n = Math.floor(Number(v))
                if (!Number.isNaN(n)) setCount(Math.min(20, Math.max(1, n)))
              }}
              className={ctrl.input}
              style={{ width: 120 }}
            />

            <label style={fieldLabel}>{t.dialogNoteLabel}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.dialogNotePlaceholder}
              rows={2}
              className={ctrl.input}
              style={{ resize: 'vertical' }}
            />

            {error && <p style={errorText}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" className={ctrl.btnGhost}onClick={onClose} disabled={saving}>
                {t.dialogCancel}
              </button>
              <button type="button" className={ctrl.btnPrimary}onClick={onSave} disabled={saving}>
                {saving ? t.dialogSaving : t.dialogSave}
              </button>
            </div>
          </>
        ) : manualMode ? (
          <>
            <label style={fieldLabel}>{t.unlistedNameLabel}</label>
            <input
              autoFocus
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              maxLength={120}
              className={ctrl.input}
            />

            <label style={fieldLabel}>{t.dialogCountLabel}</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={count}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') { setCount(''); return }
                const n = Math.floor(Number(v))
                if (!Number.isNaN(n)) setCount(Math.min(20, Math.max(1, n)))
              }}
              className={ctrl.input}
              style={{ width: 120 }}
            />

            <label style={fieldLabel}>{t.dialogNoteLabel}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.dialogNotePlaceholder}
              rows={2}
              className={ctrl.input}
              style={{ resize: 'vertical' }}
            />

            {error && <p style={errorText}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" className={ctrl.btnGhost}onClick={() => { setManualMode(false); setError(null) }} disabled={saving}>
                {t.dialogCancel}
              </button>
              <button type="button" className={ctrl.btnPrimary}onClick={onSaveUnlisted} disabled={saving}>
                {saving ? t.dialogSaving : t.dialogSave}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              autoFocus
              type="search"
              placeholder={t.dialogSearchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={ctrl.input}
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
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
                        <span style={resultMeta}>
                          {[g.group_label, g.phone_masked].filter(Boolean).join(' · ') || ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {q.trim() !== '' && !searching && (
              <button
                type="button"
                className={ctrl.btnGhost}
                style={{ width: '100%', marginTop: 10 }}
                onClick={startManual}
              >
                {t.addUnlistedBtn.replace('{q}', q.trim())}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
