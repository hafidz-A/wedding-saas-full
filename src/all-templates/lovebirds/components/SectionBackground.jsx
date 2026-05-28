'use client'

import styles from './SectionBackground.module.css'

/**
 * Decorative corner ornaments matched to the Hero gate aesthetic.
 * Renders 2 SVGs absolutely positioned in the parent section's
 * top-left and bottom-right corners. Parent must be `position: relative`.
 *
 * Pass `tone` to flavour the line colour for the section's accent:
 *   'warm'    (default) — gold + coral
 *   'cool'             — emerald + purple
 *   'mixed'            — gold/coral + emerald/purple
 *   'muted'            — soft charcoal-light lines
 */
export default function SectionBackground({ tone = 'mixed' }) {
  const palette = TONE_PALETTES[tone] || TONE_PALETTES.mixed
  return (
    <div className={styles.bg} aria-hidden="true">
      <svg className={styles.topLeft} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 12 100 Q 60 100 100 60 T 188 12"
          stroke={palette.tlLine1}
          strokeWidth="0.9"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M 12 130 Q 70 130 120 80 T 188 40"
          stroke={palette.tlLine2}
          strokeWidth="0.7"
          fill="none"
          opacity="0.35"
        />
        <circle cx="12"  cy="100" r="3"   fill={palette.tlDot1} />
        <circle cx="100" cy="60"  r="2"   fill={palette.tlDot2} />
        <circle cx="188" cy="12"  r="2.5" fill={palette.tlDot3} />
        <circle cx="60"  cy="80"  r="1.4" fill={palette.tlDot2} opacity="0.7" />
        <circle cx="140" cy="35"  r="1.2" fill={palette.tlDot3} opacity="0.6" />
      </svg>

      <svg className={styles.bottomRight} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 188 100 Q 130 100 100 140 T 12 188"
          stroke={palette.brLine1}
          strokeWidth="0.9"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M 188 70 Q 120 70 90 120 T 12 160"
          stroke={palette.brLine2}
          strokeWidth="0.7"
          fill="none"
          opacity="0.35"
        />
        <circle cx="188" cy="100" r="3"   fill={palette.brDot1} />
        <circle cx="100" cy="140" r="2"   fill={palette.brDot2} />
        <circle cx="12"  cy="188" r="2.5" fill={palette.brDot3} />
        <circle cx="140" cy="125" r="1.4" fill={palette.brDot2} opacity="0.7" />
        <circle cx="60"  cy="160" r="1.2" fill={palette.brDot3} opacity="0.6" />
      </svg>
    </div>
  )
}

const TONE_PALETTES = {
  warm: {
    tlLine1: '#C89A1F', tlLine2: '#E8553E',
    tlDot1:  '#F5C842', tlDot2:  '#E8553E', tlDot3: '#C89A1F',
    brLine1: '#C89A1F', brLine2: '#E8553E',
    brDot1:  '#F5C842', brDot2:  '#E8553E', brDot3: '#C89A1F',
  },
  cool: {
    tlLine1: '#2D8C4E', tlLine2: '#6B35A8',
    tlDot1:  '#2D8C4E', tlDot2:  '#6B35A8', tlDot3: '#3D9BC1',
    brLine1: '#2D8C4E', brLine2: '#6B35A8',
    brDot1:  '#2D8C4E', brDot2:  '#6B35A8', brDot3: '#3D9BC1',
  },
  mixed: {
    tlLine1: '#C89A1F', tlLine2: '#E8553E',
    tlDot1:  '#F5C842', tlDot2:  '#E8553E', tlDot3: '#C89A1F',
    brLine1: '#2D8C4E', brLine2: '#6B35A8',
    brDot1:  '#2D8C4E', brDot2:  '#6B35A8', brDot3: '#2D8C4E',
  },
  muted: {
    tlLine1: '#5C4A3A', tlLine2: '#5C4A3A',
    tlDot1:  '#5C4A3A', tlDot2:  '#5C4A3A', tlDot3: '#5C4A3A',
    brLine1: '#5C4A3A', brLine2: '#5C4A3A',
    brDot1:  '#5C4A3A', brDot2:  '#5C4A3A', brDot3: '#5C4A3A',
  },
}
