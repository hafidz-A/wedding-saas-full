'use client'

import EditorRoot from '@/editor/EditorRoot'
import PaletteTab from './PaletteTab'
import MusicTab from './MusicTab'
import MetaTab from './MetaTab'
import OrnamentTab from './OrnamentTab'
import { useDashboardDict } from './DashboardI18nProvider'

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

  return (
    <div>
      <nav style={subnav} role="tablist" aria-label={labels.editor}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={sub === k}
            onClick={() => onSubChange(k)}
            style={sub === k ? subBtnActive : subBtn}
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
          <PaletteTab slug={slug} template={template} initial={invitation.config?.theme?.defaultPalette} />
        )}
        {sub === 'music' && <MusicTab slug={slug} initial={invitation.config?.music ?? null} />}
        {sub === 'meta' && (
          <MetaTab slug={slug} template={template} initial={invitation.config?.meta ?? null} />
        )}
        {sub === 'ornament' && (
          <OrnamentTab slug={slug} initial={invitation.config?.theme?.ornamentType} />
        )}
      </div>
    </div>
  )
}

const subnav: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: 6,
  background: 'rgba(42,33,24,0.05)',
  borderRadius: 999,
  width: 'fit-content',
  maxWidth: '100%',
}
const subBtn: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 999,
  border: 'none',
  background: 'transparent',
  color: 'rgba(42,33,24,0.6)',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.15s ease, color 0.15s ease',
}
const subBtnActive: React.CSSProperties = {
  ...subBtn,
  background: '#2A2118',
  color: '#F5EFE3',
}
