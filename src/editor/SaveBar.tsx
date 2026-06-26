'use client'

import { useEffect, useRef } from 'react'
import { useEditor } from './EditorProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'

/**
 * Status + publish + save controls. Stateless about publish/conflict — those
 * live in EditorProvider so a top and a bottom SaveBar render the same thing.
 * Can be rendered more than once.
 */
export default function SaveBar() {
  const t = useDashboardDict().editor
  const {
    isDirty, isSaving, saveError, save, lastSavedAt,
    isPublished, publishBusy, publishError, togglePublish,
  } = useEditor()

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
        {publishError && <span style={errTxt}>{publishError}</span>}
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

/**
 * Watches for a 409 save conflict and shows ONE reload dialog. Mounted once
 * (in EditorRoot), separate from SaveBar which may render multiple times.
 */
export function SaveConflictDialog() {
  const { saveConflict, clearSaveConflict } = useEditor()
  const t = useDashboardDict().editor
  const confirmDialog = useConfirm()
  const firing = useRef(false)

  useEffect(() => {
    if (!saveConflict || firing.current) return
    firing.current = true
    void (async () => {
      const reload = await confirmDialog({
        title: t.conflictTitle,
        message: t.conflictBody,
        confirmLabel: t.conflictReload,
        cancelLabel: t.conflictDismiss,
        tone: 'danger',
      })
      clearSaveConflict()
      firing.current = false
      if (reload) window.location.reload()
    })()
  }, [saveConflict, confirmDialog, clearSaveConflict, t])

  return null
}

/**
 * Proactive, non-blocking notice that another tab/device just saved newer
 * SECTION content (learned live via BroadcastChannel — see editorSync). Lets a
 * stale tab reload BEFORE the user keeps editing a version that can no longer be
 * saved, instead of only hitting the hard 409 dialog at save time. Mounted once.
 */
export function RemoteChangeBanner() {
  const { remoteChange, dismissRemoteChange, isDirty } = useEditor()
  const t = useDashboardDict().editor
  if (!remoteChange) return null
  return (
    <div style={bannerWrap} role="status" aria-live="polite">
      <style>{BANNER_KEYFRAMES}</style>
      <div style={bannerCard}>
        <span style={bannerDot} aria-hidden="true" />
        <p style={bannerText}>{isDirty ? t.remoteBannerTextDirty : t.remoteBannerText}</p>
        <button type="button" style={bannerReload} onClick={() => window.location.reload()}>
          {t.conflictReload}
        </button>
        <button
          type="button"
          style={bannerDismiss}
          onClick={dismissRemoteChange}
          aria-label={t.conflictDismiss}
          title={t.conflictDismiss}
        >
          ×
        </button>
      </div>
    </div>
  )
}

const BANNER_KEYFRAMES = `
@keyframes lb-remote-banner-in {
  from { opacity: 0; transform: translate(-50%, -16px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes lb-remote-dot {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%      { transform: scale(1.5); opacity: 0.5; }
}`

const bannerWrap: React.CSSProperties = {
  position: 'fixed',
  top: 14,
  left: '50%',
  transform: 'translate(-50%, 0)',
  zIndex: 1000,
  animation: 'lb-remote-banner-in 320ms cubic-bezier(0.16, 1, 0.3, 1)',
  maxWidth: 'min(580px, 94vw)',
  width: 'max-content',
}
const bannerCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '11px 12px 11px 16px',
  background: 'var(--surface-warm, #fff)',
  border: '1px solid var(--border-strong, rgba(42,33,24,0.18))',
  borderLeft: '3px solid var(--interactive-primary, #b8553e)',
  borderRadius: 14,
  boxShadow: '0 12px 34px rgba(42,33,24,0.20)',
}
const bannerDot: React.CSSProperties = {
  flex: '0 0 auto',
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--interactive-primary, #b8553e)',
  animation: 'lb-remote-dot 1.6s ease-in-out infinite',
}
const bannerText: React.CSSProperties = {
  margin: 0,
  flex: 1,
  fontSize: 12.5,
  lineHeight: 1.4,
  color: 'var(--text-primary, #2a2118)',
}
const bannerReload: React.CSSProperties = {
  flex: '0 0 auto',
  padding: '8px 14px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-charcoal)',
  color: 'var(--surface-warm)',
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const bannerDismiss: React.CSSProperties = {
  flex: '0 0 auto',
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const status: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }
const dirtyTxt: React.CSSProperties = { fontSize: 12, color: 'var(--interactive-primary)' }
const savedTxt: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' }
const savingTxt: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.65)' }
const errTxt:   React.CSSProperties = { fontSize: 11, color: 'var(--interactive-primary)' }
const pillOn:  React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--color-emerald)', color: '#fff', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const pillOff: React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--radius-pill)', background: 'rgba(42,33,24,0.15)', color: 'var(--text-primary)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const saveBtn: React.CSSProperties = { padding: '10px 22px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none' }
