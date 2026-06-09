'use client'

import { useEffect, useState } from 'react'
import { useDashboardDict } from '../DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import { addWalkInAttendance, addUnlistedAttendance, searchWalkInGuests, type WalkInGuestHit } from './actions'
import { type AttendanceRow } from './types'
import {
  overlay, modal, modalHeader, modalClose, searchInput, dialogHint, resultList,
  resultRow, resultMeta, pickedCard, ghostBtn, fieldLabel, errorText, primaryBtn,
} from './styles'

export default function WalkInDialog({
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
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
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

  function startManual() {
    setManualName(q.trim())
    setError(null)
    setManualMode(true)
  }

  async function onSaveUnlisted() {
    const name = manualName.trim()
    if (!name) { setError(t.unlistedNameRequired); return }
    const ok = await confirmDialog({ message: t.unlistedConfirm.replace('{name}', name), tone: 'danger' })
    if (!ok) return
    setSaving(true)
    setError(null)
    try {
      const res = await addUnlistedAttendance({ slug, name, count, note })
      if (res.ok && res.row) {
        onAdded(res.row)
        return
      }
      setError(res.error || t.errGeneric)
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

        {picked ? (
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
        ) : manualMode ? (
          <>
            <label style={fieldLabel}>{t.unlistedNameLabel}</label>
            <input
              autoFocus
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              maxLength={120}
              style={{ ...searchInput, width: '100%' }}
            />

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
              <button type="button" style={ghostBtn} onClick={() => { setManualMode(false); setError(null) }} disabled={saving}>
                {t.dialogCancel}
              </button>
              <button type="button" style={primaryBtn} onClick={onSaveUnlisted} disabled={saving}>
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
            {q.trim() !== '' && !searching && (
              <button
                type="button"
                style={{ ...ghostBtn, width: '100%', marginTop: 10 }}
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
