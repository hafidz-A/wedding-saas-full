'use client'

import { readableOn } from '@/lib/color'
import type { PaletteVibe, TemplateId } from './vibeData'
import styles from './PreviewMock.module.css'

/**
 * Themed invitation preview card. Shared by the marketing Vibe Explorer
 * (`VibeExploration`) and the dashboard Palette tab so both render an identical
 * mockup. The caller supplies the copy (`eyebrow`, `names`, `date`) so the
 * marketing page can show placeholder text while the dashboard shows the
 * couple's real names + date.
 */
export function PreviewMock({
  templateId,
  palette,
  eyebrow,
  names,
  date,
}: {
  templateId: TemplateId | string
  palette: PaletteVibe
  eyebrow: string
  names: string
  date: string
}) {
  const isSolary = templateId === 'solary'
  return (
    <div
      className={styles.mock}
      style={{
        background: palette.surface,
        borderColor: palette.surfaceBorder,
        color: palette.fg,
      }}
    >
      {/* Template-specific ambient ornament */}
      {isSolary ? (
        <svg className={styles.mockOrbits} viewBox="0 0 240 240" aria-hidden="true">
          <circle cx="120" cy="120" r="58" fill="none" stroke={palette.accent} strokeWidth="0.8" opacity="0.35" />
          <circle cx="120" cy="120" r="92" fill="none" stroke={palette.accent} strokeWidth="0.6" opacity="0.22" />
          <circle cx="120" cy="62" r="4" fill={palette.accent} />
          <circle cx="212" cy="120" r="2.5" fill={palette.swatches[1]} />
        </svg>
      ) : (
        <>
          <span className={`${styles.mockLeaf} ${styles.mockLeafL}`} style={{ color: palette.fgMuted }} aria-hidden="true">
            ❧
          </span>
          <span className={`${styles.mockLeaf} ${styles.mockLeafR}`} style={{ color: palette.fgMuted }} aria-hidden="true">
            ❧
          </span>
        </>
      )}

      <div className={styles.mockGlow} style={{ background: `radial-gradient(circle, ${palette.accent}33 0%, transparent 65%)` }} />

      <div className={styles.mockBody}>
        <span className={styles.mockEyebrow} style={{ color: palette.fgMuted }}>
          {eyebrow}
        </span>
        <span className={styles.mockNames} style={{ color: palette.fg }}>
          {names}
        </span>
        <span className={styles.mockRule} aria-hidden="true">
          <span style={{ background: palette.surfaceBorder }} />
          <span className={styles.mockRuleDot} style={{ background: palette.accent }} />
          <span style={{ background: palette.surfaceBorder }} />
        </span>
        <span className={styles.mockDate} style={{ color: palette.fgMuted }}>
          {date}
        </span>
        <span
          className={styles.mockPill}
          style={{ background: palette.accent, color: readableOn(palette.accent) }}
        >
          RSVP
        </span>
      </div>
    </div>
  )
}

export default PreviewMock
