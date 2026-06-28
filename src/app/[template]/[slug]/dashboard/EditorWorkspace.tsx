'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import EditorRoot from '@/editor/EditorRoot'
import PaletteTab from './PaletteTab'
import MusicTab from './MusicTab'
import MetaTab from './MetaTab'
import OrnamentTab from './OrnamentTab'
import { coupleDisplay } from '@/lib/meta/couple'
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

const containerVariants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.25,
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
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
  const coupleName: string | undefined = coupleDisplay(invitation.config?.couple) || hero?.coupleName
  const weddingDate: string | undefined = hero?.weddingDate

  // Single shared concurrency baseline for THIS tab. Every editing surface (the
  // section editor + the sub-tabs) writes the same invitation row and bumps its
  // updated_at; tracking the latest here — and feeding it to the always-mounted
  // section editor — keeps that editor from going stale when a sub-tab saves,
  // which previously caused a false 409 on the next section save.
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(invitation.updated_at ?? null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        className={styles.mobileAccordionToggle}
        onClick={() => setMobileNavOpen((o) => !o)}
        aria-expanded={mobileNavOpen}
      >
        <span style={{ flex: 1, textAlign: 'center' }}>Modul Editor: <strong>{labels[sub]}</strong></span>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{mobileNavOpen ? '▲' : '▼'}</span>
      </button>

      {/* Desktop nav view */}
      <nav className={`${styles.subnav} ${styles.desktopSubnavOnly}`} role="tablist" aria-label={labels.editor}>
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

      {/* Mobile animated accordion view (kipas lipat vertikal perlahan 1 per 1) */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.nav
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformOrigin: 'top center', overflow: 'hidden' }}
            className={`${styles.subnav} ${styles.subnavOpen}`}
            role="tablist"
          >
            {keys.map((k) => (
              <motion.button
                key={k}
                variants={itemVariants}
                type="button"
                role="tab"
                aria-selected={sub === k}
                onClick={() => {
                  onSubChange(k)
                  setMobileNavOpen(false)
                }}
                className={`${styles.subBtn} ${sub === k ? styles.subBtnActive : ''}`}
              >
                {labels[k]}
              </motion.button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

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
          <MetaTab slug={slug} template={template} initial={invitation.config?.meta ?? null} couple={invitation.config?.couple ?? null} onSaved={setLiveUpdatedAt} />
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

