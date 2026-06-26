'use client'

import EditorRoot from '@/editor/EditorRoot'
import PaletteTab from './PaletteTab'
import MusicTab from './MusicTab'
import MetaTab from './MetaTab'
import OrnamentTab from './OrnamentTab'
import { useDashboardDict } from './DashboardI18nProvider'
import styles from './EditorWorkspace.module.css'

export type EditorSubTab = 'section' | 'palette' | 'music' | 'meta' | 'ornament'

/** Editor sub-tab keys, in nav order. Ornament is lovebirds-only (solary draws
 *  its own Three.js backdrop, so there's nothing to swap). */
export function editorSubTabs(template: string): EditorSubTab[] {
  const keys: EditorSubTab[] = ['section', 'palette', 'music', 'meta']
  if (template !== 'solary') keys.push('ornament')
  return keys
}

/**
 * Unified editing surface. Everything the couple can edit — the section editor,
 * palette, music, title & description, and (lovebirds) ornament — lives here
 * under one sub-nav, instead of scattered across top-level dashboard tabs.
 */
export default function EditorWorkspace({
  slug,
  template,
  invitation,
  sub,
  onSubChange,
}: {
  slug: string
  template: string
  invitation: any
  sub: EditorSubTab
  onSubChange: (s: EditorSubTab) => void
}) {
  const labels = useDashboardDict().chrome.tabs
  const keys = editorSubTabs(template)

  // Couple's real names + date (from the hero section) so the Palette preview
  // shows their actual card instead of placeholder copy.
  const hero = invitation.config?.sections?.find((s: any) => s.type === 'hero')?.props
  const coupleName: string | undefined = hero?.coupleName
  const weddingDate: string | undefined = hero?.weddingDate

  return (
    <div>
      <nav className={styles.subnav} role="tablist" aria-label={labels.editor}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={sub === k}
            onClick={() => onSubChange(k)}
            className={`${styles.subBtn} ${sub === k ? styles.subBtnActive : ''}`}
          >
            {labels[k]}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 18 }}>
        {sub === 'section' && (
          <EditorRoot
            slug={slug}
            template={template}
            initialConfig={invitation.config ?? { sections: [] }}
            initialIsPublished={!!invitation.is_published}
            initialUpdatedAt={invitation.updated_at ?? null}
          />
        )}
        {sub === 'palette' && (
          <PaletteTab
            slug={slug}
            template={template}
            initial={invitation.config?.theme?.defaultPalette}
            coupleName={coupleName}
            weddingDate={weddingDate}
          />
        )}
        {sub === 'music' && <MusicTab slug={slug} initial={invitation.config?.music ?? null} />}
        {sub === 'meta' && (
          <MetaTab slug={slug} template={template} initial={invitation.config?.meta ?? null} />
        )}
        {sub === 'ornament' && (
          <OrnamentTab
            slug={slug}
            initial={invitation.config?.theme?.ornamentType}
            palette={invitation.config?.theme?.defaultPalette}
          />
        )}
      </div>
    </div>
  )
}

