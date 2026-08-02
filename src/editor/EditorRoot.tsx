'use client'

import React, { useEffect, useRef, useState } from 'react'
import { EditorProvider, type PageConfig } from './EditorProvider'
import CouplePanel from './CouplePanel'
import SectionList from './SectionList'
import FieldEditor from './FieldEditor'
import FieldEditorSheet from './FieldEditorSheet'
import SaveBar, { RemoteChangeBanner } from './SaveBar'
import PreviewPane from './PreviewPane'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { migrateLovebirdsConfig } from '@/lib/config/migrate-lovebirds'
import { deriveCoupleFromConfig } from '@/lib/meta/couple'
import { hashSections } from './lib/sectionsHash'
import {
  SECTION_LIST_WIDTH_DEFAULT,
  SECTION_LIST_WIDTH_MIN,
  SECTION_LIST_WIDTH_MAX,
  SECTION_LIST_WIDTH_KEY,
  clampSectionListWidth,
  fitSectionListWidth,
  parseStoredWidth,
} from './lib/sectionListWidth'
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
    couple: deriveCoupleFromConfig(migrated),
    sections: Array.isArray(migrated?.sections) ? migrated.sections : [],
  }

  const [previewOpen, setPreviewOpen] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isMobile = useIsMobile()
  const t = useDashboardDict().editor

  // Resizable section-list panel. Starts at the default on every render (server
  // and first client paint must match — reading localStorage during render
  // would desync from the server-rendered markup and trip a hydration
  // mismatch), then a mount-only effect swaps in the saved width if any.
  const [listWidth, setListWidth] = useState(SECTION_LIST_WIDTH_DEFAULT)
  const [resizing, setResizing] = useState(false)
  // Mirrors `listWidth` synchronously so the pointerup/keydown handlers can
  // persist the just-committed value without depending on a stale closure.
  const widthRef = useRef(SECTION_LIST_WIDTH_DEFAULT)
  // The width the user actually chose. Kept separate from the displayed width
  // because a value picked on a wide monitor is capped for display on a narrow
  // one (fitSectionListWidth) but must NOT be overwritten in storage — going
  // back to the wide screen should restore the original choice.
  const preferredRef = useRef(SECTION_LIST_WIDTH_DEFAULT)
  const dragStartRef = useRef<{ x: number; width: number } | null>(null)

  useEffect(() => {
    try {
      const stored = parseStoredWidth(localStorage.getItem(SECTION_LIST_WIDTH_KEY))
      if (stored !== null) preferredRef.current = stored
    } catch {
      // Storage unavailable (Safari private mode, etc.) — keep the default.
    }
    // Fit the (possibly foreign-monitor) preference to this viewport, and keep
    // refitting it while the window is resized.
    function applyFit() {
      const fitted = fitSectionListWidth(preferredRef.current, window.innerWidth)
      widthRef.current = fitted
      setListWidth(fitted)
    }
    applyFit()
    window.addEventListener('resize', applyFit)
    return () => window.removeEventListener('resize', applyFit)
  }, [])

  function persistWidth(width: number) {
    try {
      localStorage.setItem(SECTION_LIST_WIDTH_KEY, String(width))
    } catch {
      // Storage unavailable — the width just won't survive a reload.
    }
  }

  // A width the user picks HERE is fitted to this viewport first, so dragging
  // can never push the field editor into an unusable sliver — and the fitted
  // value is what gets stored, since it reflects the screen they chose it on.
  function updateWidth(next: number) {
    const fitted = fitSectionListWidth(clampSectionListWidth(next), window.innerWidth)
    widthRef.current = fitted
    preferredRef.current = fitted
    setListWidth(fitted)
    return fitted
  }

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = { x: e.clientX, width: listWidth }
    setResizing(true)
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return
    updateWidth(dragStartRef.current.width + (e.clientX - dragStartRef.current.x))
  }

  function endResizeDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragStartRef.current = null
    setResizing(false)
    persistWidth(widthRef.current)
  }

  function handleResizeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null
    if (e.key === 'ArrowLeft') next = listWidth - 16
    else if (e.key === 'ArrowRight') next = listWidth + 16
    else if (e.key === 'Home') next = SECTION_LIST_WIDTH_MIN
    else if (e.key === 'End') next = SECTION_LIST_WIDTH_MAX
    if (next === null) return
    e.preventDefault()
    const clamped = updateWidth(next)
    persistWidth(clamped)
  }

  function handleResizeDoubleClick() {
    const clamped = updateWidth(SECTION_LIST_WIDTH_DEFAULT)
    persistWidth(clamped)
  }

  return (
    <EditorProvider slug={slug} initialConfig={safeConfig} initialUpdatedAt={initialUpdatedAt} initialSectionsHash={initialSectionsHash} initialIsPublished={initialIsPublished} liveUpdatedAt={liveUpdatedAt} onSaved={onSaved}>
      <RemoteChangeBanner />
      <div className={styles.wrap}>
        <CouplePanel />
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

        <div className={styles.editorRow} style={resizing ? { userSelect: 'none' } : undefined}>
          <div className={styles.sectionList} style={!isMobile ? { width: listWidth } : undefined}>
            <SectionList
              slug={slug}
              template={template}
              onSectionOpen={() => setSheetOpen(true)}
            />
          </div>
          {!isMobile && (
            <div
              className={styles.resizeHandle}
              role="separator"
              aria-orientation="vertical"
              tabIndex={0}
              aria-label={t.resizeSectionList}
              aria-valuenow={listWidth}
              aria-valuemin={SECTION_LIST_WIDTH_MIN}
              aria-valuemax={SECTION_LIST_WIDTH_MAX}
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={endResizeDrag}
              onPointerCancel={endResizeDrag}
              onKeyDown={handleResizeKeyDown}
              onDoubleClick={handleResizeDoubleClick}
            />
          )}
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
