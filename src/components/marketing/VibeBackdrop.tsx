'use client'

/* ============================================================================
   VibeBackdrop — renders each template's REAL backdrop behind the explorer,
   recoloured live by the selected palette.

     • Lovebirds → the real perched-bird canvas (Ornaments/PerchedCanvas, driven
       by the lovebirds palette key) + the real BotanicalSketchLayer flower
       sketches on the left & right edges.
     • Solary    → the shared <AndromedaBackdrop> (ported Three.js Andromeda
       texture + starfield), tinted from the palette tokens.

   Everything is `aria-hidden` and pointer-events:none; nothing writes to
   <body>, so it can't leak onto the rest of the marketing page.
   ============================================================================ */
import { PerchedCanvas } from '@/all-templates/lovebirds/components/Ornaments.jsx'
import { BotanicalSketchLayer } from '@/all-templates/lovebirds/components/BotanicalBorder'
import { AndromedaBackdrop } from '@/components/preview/AndromedaBackdrop'
import type { PaletteVibe, TemplateId } from './vibeData'
import styles from './VibeBackdrop.module.css'

/* ---------- Lovebirds ---------- */
function LovebirdsBackdrop({ palette }: { palette: PaletteVibe }) {
  return (
    <div className={styles.lovebirds} aria-hidden="true">
      <BotanicalSketchLayer
        key={palette.key}
        seed={20260603}
        fixed={false}
        animateOnScroll={false}
        color={palette.accent}
        desktopOpacity={palette.mode === 'dark' ? 0.5 : 0.55}
        tabletOpacity={0.42}
        mobileOpacity={0.3}
        zIndex={1}
      />
      <div className={styles.birds}>
        <PerchedCanvas active paletteKey={palette.key} />
      </div>
    </div>
  )
}

/* ---------- Solary ---------- */
function SolaryBackdrop({ palette }: { palette: PaletteVibe }) {
  return (
    <div className={styles.solary} aria-hidden="true">
      <AndromedaBackdrop
        accent={palette.accent}
        sun={palette.swatches[1] || palette.accent}
        fg={palette.fg}
        dark={palette.mode === 'dark'}
      />
    </div>
  )
}

export function VibeBackdrop({ template, palette }: { template: TemplateId; palette: PaletteVibe }) {
  return template === 'solary' ? (
    <SolaryBackdrop palette={palette} />
  ) : (
    <LovebirdsBackdrop palette={palette} />
  )
}
