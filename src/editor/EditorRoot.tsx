'use client'

import { useState } from 'react'
import { EditorProvider, type PageConfig } from './EditorProvider'
import SectionList from './SectionList'
import FieldEditor from './FieldEditor'
import SaveBar from './SaveBar'
import PreviewPane from './PreviewPane'
import styles from './EditorRoot.module.css'

interface Props {
  slug: string
  template: string
  initialConfig: PageConfig
  initialIsPublished: boolean
}

export default function EditorRoot({ slug, template, initialConfig, initialIsPublished }: Props) {
  const safeConfig: PageConfig = {
    meta: initialConfig?.meta ?? {},
    sections: Array.isArray(initialConfig?.sections) ? initialConfig.sections : [],
  }

  const [previewOpen, setPreviewOpen] = useState(true)

  return (
    <EditorProvider slug={slug} initialConfig={safeConfig}>
      <div className={styles.wrap}>
        <div className={styles.topBar}>
          <button
            type="button"
            onClick={() => setPreviewOpen((p) => !p)}
            style={previewToggle}
            title={previewOpen ? 'Hide preview' : 'Show preview'}
          >
            {previewOpen ? '▲ Hide preview' : '▼ Show preview'}
          </button>
          <SaveBar slug={slug} initialIsPublished={initialIsPublished} />
        </div>

        <div className={styles.editorRow}>
          <div className={styles.sectionList}>
            <SectionList slug={slug} template={template} />
          </div>
          <main className={styles.fieldPane}>
            <FieldEditor slug={slug} />
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
