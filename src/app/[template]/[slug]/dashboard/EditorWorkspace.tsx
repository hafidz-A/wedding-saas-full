'use client'

import { useState } from 'react'
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

  // Single shared concurrency baseline for THIS tab. Every editing surface (the
  // section editor + the sub-tabs) writes the same invitation row and bumps its
  // updated_at; tracking the latest here — and feeding it to the always-mounted
  // section editor — keeps that editor from going stale when a sub-tab saves,
  // which previously caused a false 409 on the next section save.
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(invitation.updated_at ?? null)

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
        {/* The section editor stays mounted across sub-tab switches (only hidden)
            so its in-progress edits AND concurrency baseline survive — switching
            to Palette and back no longer reverts content or trips a false 409. */}
        <div hidden={sub !== 'section'}>
          <EditorRoot
            slug={slug}
            template={template}
            initialConfig={invitation.config ?? { sections: [] }}
            initialIsPublished={!!invitation.is_published}
            initialUpdatedAt={invitation.updated_at ?? null}
            liveUpdatedAt={liveUpdatedAt}
            onSaved={setLiveUpdatedAt}
          />
        </div>
        {sub === 'palette' && (
          <PaletteTab
            slug={slug}
            template={template}
            initial={invitation.config?.theme?.defaultPalette}
            coupleName={coupleName}
            weddingDate={weddingDate}
            onSaved={setLiveUpdatedAt}
          />
        )}
        {sub === 'music' && <MusicTab slug={slug} initial={invitation.config?.music ?? null} onSaved={setLiveUpdatedAt} />}
        {sub === 'meta' && (
          <MetaTab slug={slug} template={template} initial={invitation.config?.meta ?? null} onSaved={setLiveUpdatedAt} />
        )}
        {sub === 'ornament' && (
          <OrnamentTab
            slug={slug}
            initial={invitation.config?.theme?.ornamentType}
            palette={invitation.config?.theme?.defaultPalette}
            onSaved={setLiveUpdatedAt}
          />
        )}
      </div>
    </div>
  )
}

