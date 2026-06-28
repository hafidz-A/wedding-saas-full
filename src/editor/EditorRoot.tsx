'use client'

import { useEffect, useState } from 'react'
import { EditorProvider, type PageConfig } from './EditorProvider'
import SectionList from './SectionList'
import FieldEditor from './FieldEditor'
import FieldEditorSheet from './FieldEditorSheet'
import SaveBar, { RemoteChangeBanner } from './SaveBar'
import PreviewPane from './PreviewPane'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { migrateLovebirdsConfig } from '@/lib/config/migrate-lovebirds'
import { hashSections } from './lib/sectionsHash'
import styles from './EditorRoot.module.css'

interface Props {
  slug: string
  template: string
  initialConfig: PageConfig
  initialIsPublished: boolean
  /** invitation.updated_at at page load — used for optimistic-concurrency on save. */
  initialUpdatedAt?: string | null
  /** Live shared baseline from EditorWorkspace (bumped by sibling sub-tab saves). */
  liveUpdatedAt?: string | null
  /** Notifies EditorWorkspace of the real stored updated_at after a section save. */
  onSaved?: (savedAt: string) => void
}

export default function EditorRoot({ slug, template, initialConfig, initialIsPublished, initialUpdatedAt, liveUpdatedAt, onSaved }: Props) {
  // Concurrency baseline must match the sections AS STORED in the row, so hash
  // the RAW config BEFORE the lovebirds client-side migration rewrites it — the
  // server hashes the un-migrated stored sections, and they must agree on the
  // first save. (After that save the migrated form is what's stored, and the
  // server echoes the new fingerprint.)
  const initialSectionsHash = hashSections(initialConfig?.sections)

  // Lovebirds: fold registry→weddingGift + strip guestbook/countdown on load.
  const migrated =
    template === 'lovebirds' ? migrateLovebirdsConfig(initialConfig) : initialConfig
  const safeConfig: PageConfig = {
    meta: migrated?.meta ?? {},
    sections: Array.isArray(migrated?.sections) ? migrated.sections : [],
  }

  const [previewOpen, setPreviewOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isMobile = useIsMobile()
  const t = useDashboardDict().editor

  return (
    <EditorProvider slug={slug} initialConfig={safeConfig} initialUpdatedAt={initialUpdatedAt} initialSectionsHash={initialSectionsHash} initialIsPublished={initialIsPublished} liveUpdatedAt={liveUpdatedAt} onSaved={onSaved}>
      <RemoteChangeBanner />
      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <button
            type="button"
            onClick={() => setPreviewOpen((p) => !p)}
            className={styles.previewToggle}
            title={previewOpen ? t.hidePreviewTitle : t.showPreviewTitle}
          >
            {previewOpen ? t.hidePreview : t.showPreview}
          </button>
          <SaveBar />
        </div>

        <div className={styles.editorRow}>
          <div className={styles.sectionList}>
            <SectionList
              slug={slug}
              template={template}
              onSectionOpen={() => setSheetOpen(true)}
            />
          </div>
          <main className={styles.fieldPane}>
            {!isMobile && <FieldEditor slug={slug} template={template} />}
          </main>
        </div>

        {previewOpen && <PreviewPane slug={slug} template={template} />}

        {isMobile && (
          <FieldEditorSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title={t.editSectionTitle}
            closeLabel={t.sheetCloseAria}
          >
            <FieldEditor slug={slug} template={template} />
          </FieldEditorSheet>
        )}
      </div>

      {/* Second save bar, sticky to the viewport bottom so a scrolled-down
          owner still sees the save/publish controls. Shares state with the top
          one via EditorProvider. */}
      <div className={styles.bottomBar}>
        <SaveBar />
      </div>
    </EditorProvider>
  )
}

/** True on phone-width viewports — drives the field-editor bottom sheet. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

const previewToggle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--border-strong)',
  background: 'transparent',
  color: 'var(--text-primary)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
