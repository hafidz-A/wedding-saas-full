'use client'

import { useEditor } from './EditorProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import styles from './SaveBar.module.css'

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
    <div className={styles.wrap}>
      <div className={styles.status}>
        {isSaving ? (
          <span className={styles.savingTxt}>{t.saving}</span>
        ) : isDirty ? (
          <span className={styles.dirtyTxt}>{t.unsaved}</span>
        ) : lastSavedAt ? (
          <span className={styles.savedTxt}>{t.savedPrefix} {new Date(lastSavedAt).toLocaleTimeString()}</span>
        ) : (
          <span className={styles.savedTxt}>{t.upToDate}</span>
        )}
        {saveError && <span className={styles.errTxt}>{saveError}</span>}
        {publishError && <span className={styles.errTxt}>{publishError}</span>}
      </div>

      <button
        type="button"
        disabled={publishBusy}
        onClick={togglePublish}
        className={`${styles.pill} ${isPublished ? styles.pillOn : styles.pillOff}`}
      >
        {isPublished ? t.published : t.draft}
      </button>

      <button
        type="button"
        disabled={!isDirty || isSaving}
        onClick={save}
        className={styles.saveBtn}
      >
        {t.save}
      </button>
    </div>
  )
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
    <div className={styles.bannerWrap} role="status" aria-live="polite">
      <div className={styles.bannerCard}>
        <span className={styles.bannerDot} aria-hidden="true" />
        <p className={styles.bannerText}>{isDirty ? t.remoteBannerTextDirty : t.remoteBannerText}</p>
        <button type="button" className={styles.bannerReload} onClick={() => window.location.reload()}>
          {t.conflictReload}
        </button>
        <button
          type="button"
          className={styles.bannerDismiss}
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
