'use client'

import { useState } from 'react'
import { useEditor } from './EditorProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'

interface Props {
  slug: string
  initialIsPublished: boolean
}

export default function SaveBar({ slug, initialIsPublished }: Props) {
  const t = useDashboardDict().editor
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const { isDirty, isSaving, saveError, save, lastSavedAt } = useEditor()
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishErr, setPublishErr] = useState<string | null>(null)

  async function togglePublish() {
    const next = !isPublished
    setPublishBusy(true)
    setPublishErr(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setPublishErr(err.error || `HTTP ${res.status}`)
        fb.fail(fm.publishFail)
        return
      }
      setIsPublished(next)
      fb.ok(next ? fm.published : fm.setToDraft)
    } finally {
      setPublishBusy(false)
    }
  }

  return (
    <div style={wrap}>
      <div style={status}>
        {isSaving ? (
          <span style={savingTxt}>{t.saving}</span>
        ) : isDirty ? (
          <span style={dirtyTxt}>{t.unsaved}</span>
        ) : lastSavedAt ? (
          <span style={savedTxt}>{t.savedPrefix} {new Date(lastSavedAt).toLocaleTimeString()}</span>
        ) : (
          <span style={savedTxt}>{t.upToDate}</span>
        )}
        {saveError && <span style={errTxt}>{saveError}</span>}
        {publishErr && <span style={errTxt}>{publishErr}</span>}
      </div>

      <button
        type="button"
        disabled={publishBusy}
        onClick={togglePublish}
        style={isPublished ? pillOn : pillOff}
      >
        {isPublished ? t.published : t.draft}
      </button>

      <button
        type="button"
        disabled={!isDirty || isSaving}
        onClick={save}
        style={{ ...saveBtn, opacity: !isDirty || isSaving ? 0.4 : 1, cursor: !isDirty || isSaving ? 'default' : 'pointer' }}
      >
        {t.save}
      </button>
    </div>
  )
}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const status: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }
const dirtyTxt: React.CSSProperties = { fontSize: 12, color: '#E8553E' }
const savedTxt: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.55)' }
const savingTxt: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.65)' }
const errTxt:   React.CSSProperties = { fontSize: 11, color: '#E8553E' }
const pillOn:  React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: '#2D8C4E', color: '#fff', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const pillOff: React.CSSProperties = { padding: '8px 14px', borderRadius: 999, background: 'rgba(42,33,24,0.15)', color: '#2A2118', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const saveBtn: React.CSSProperties = { padding: '10px 22px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none' }
