'use client'

import { useState } from 'react'
import { EditorProvider, type PageConfig } from './EditorProvider'
import SectionList from './SectionList'
import FieldEditor from './FieldEditor'
import SaveBar from './SaveBar'
import PreviewPane from './PreviewPane'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { migrateLovebirdsConfig } from '@/lib/config/migrate-lovebirds'
import styles from './EditorRoot.module.css'

interface Props {
  slug: string
  template: string
  initialConfig: PageConfig
  initialIsPublished: boolean
  /** invitation.updated_at at page load — used for optimistic-concurrency on save. */
  initialUpdatedAt?: string | null
}

export default function EditorRoot({ slug, template, initialConfig, initialIsPublished, initialUpdatedAt }: Props) {
  // Lovebirds: fold registry→weddingGift + strip guestbook/countdown on load.
  const migrated =
    template === 'lovebirds' ? migrateLovebirdsConfig(initialConfig) : initialConfig
  const safeConfig: PageConfig = {
    meta: migrated?.meta ?? {},
    sections: Array.isArray(migrated?.sections) ? migrated.sections : [],
  }

  const [previewOpen, setPreviewOpen] = useState(true)
  const t = useDashboardDict().editor

  return (
    <EditorProvider slug={slug} initialConfig={safeConfig} initialUpdatedAt={initialUpdatedAt}>
      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <button
            type="button"
            onClick={() => setPreviewOpen((p) => !p)}
            style={previewToggle}
            title={previewOpen ? t.hidePreviewTitle : t.showPreviewTitle}
          >
            {previewOpen ? t.hidePreview : t.showPreview}
          </button>
          <SaveBar slug={slug} initialIsPublished={initialIsPublished} />
        </div>

        <div className={styles.editorRow}>
          <div className={styles.sectionList}>
            <SectionList slug={slug} template={template} />
          </div>
          <main className={styles.fieldPane}>
            <FieldEditor slug={slug} template={template} />
          </main>
        </div>

        {previewOpen && <PreviewPane slug={slug} template={template} />}
      </div>
    </EditorProvider>
  )
}

const previewToggle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid rgba(42,33,24,0.2)',
  background: 'transparent',
  color: '#2A2118',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
