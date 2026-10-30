'use client'

/* ============================================================================
   VibeBackdrop — renders each template's REAL backdrop behind the explorer,
   recoloured live by the selected palette.

     • Lovebirds → the real perched-bird canvas (Ornaments/PerchedCanvas, driven
       by the lovebirds palette key) + the real BotanicalSketchLayer flower
       sketches on the left & right edges.
     • Solary    → the shared <AndromedaBackdrop> (ported Three.js Andromeda
       texture + starfield), tinted from the palette tokens.
     • Taman Bunga → the template's own painted garden, with a palette-tinted
       lantern glow (the painting never re-colours in the template either).
     • Musi      → a code-drawn night skyline: the Ampera towers over the river
       and a few fireworks, in the palette's gold (no images, like the
       template itself).

   Everything is `aria-hidden` and pointer-events:none; nothing writes to
   <body>, so it can't leak onto the rest of the marketing page.
   ============================================================================ */
import { PerchedCanvas } from '@/all-templates/lovebirds/components/Ornaments.jsx'
import { BotanicalSketchLayer } from '@/all-templates/lovebirds/components/BotanicalBorder'
import { AndromedaBackdrop } from '@/components/preview/AndromedaBackdrop'
import { SCENE } from '@/all-templates/taman-bunga/config/assets.js'
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

/* ---------- Taman Bunga ---------- */
function TamanBungaBackdrop({ palette }: { palette: PaletteVibe }) {
  return (
    <div className={styles.tamanBunga} aria-hidden="true">
      <div className={styles.garden} style={{ backgroundImage: `url(${SCENE.gardenWide})` }} />
      <div
        className={styles.glow}
        style={{ background: `radial-gradient(50% 40% at 50% 70%, ${palette.accent}40 0%, transparent 70%)` }}
      />
    </div>
  )
}

/* ---------- Musi ---------- */
function MusiBackdrop({ palette }: { palette: PaletteVibe }) {
  const gold = palette.accent
  const roof = palette.swatches[1] || gold
  return (
    <div className={styles.musi} aria-hidden="true">
      <svg className={styles.skyline} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice">
        {/* fireworks */}
        {[
          [260, 90, 46],
          [880, 70, 58],
          [620, 120, 34],
        ].map(([cx, cy, r], i) => (
          <g key={i} stroke={i === 1 ? roof : gold} strokeWidth="2" strokeLinecap="round" opacity="0.7">
            {Array.from({ length: 14 }, (_, k) => {
              const a = (k / 14) * Math.PI * 2
              return (
                <line
                  key={k}
                  x1={cx + Math.cos(a) * r * 0.35}
                  y1={cy + Math.sin(a) * r * 0.35}
                  x2={cx + Math.cos(a) * r}
                  y2={cy + Math.sin(a) * r}
                />
              )
            })}
          </g>
        ))}
        {/* city blocks */}
        <path
          d="M0 330 V290 h60 v-30 h40 v40 h50 v-55 h36 v55 h70 v-25 h44 v-40 h30 v65 h80 v-20 h60 v35 h500 v-30 h50 v-50 h40 v50 h60 v-25 h46 v40 h34 V330 Z"
          fill="rgba(0,0,0,0.35)"
        />
        {/* Ampera: two towers and the deck */}
        <g fill={roof}>
          <rect x="520" y="160" width="16" height="170" />
          <rect x="548" y="160" width="16" height="170" />
          <rect x="636" y="160" width="16" height="170" />
          <rect x="664" y="160" width="16" height="170" />
          <rect x="516" y="168" width="52" height="8" />
          <rect x="632" y="168" width="52" height="8" />
          <rect x="300" y="268" width="600" height="10" />
        </g>
        <rect x="300" y="280" width="600" height="2" fill={gold} opacity="0.9" />
        {/* the river */}
        <rect x="0" y="330" width="1200" height="70" fill="rgba(165,139,99,0.35)" />
        <rect x="300" y="340" width="600" height="2" fill={gold} opacity="0.35" />
      </svg>
    </div>
  )
}

export function VibeBackdrop({ template, palette }: { template: TemplateId; palette: PaletteVibe }) {
  if (template === 'taman-bunga') return <TamanBungaBackdrop palette={palette} />
  if (template === 'musi') return <MusiBackdrop palette={palette} />
  return template === 'solary' ? (
    <SolaryBackdrop palette={palette} />
  ) : (
    <LovebirdsBackdrop palette={palette} />
  )
}
