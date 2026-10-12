'use client'

/* ============================================================================
   Adat petal set — the Songket replacement for Lovebirds' coral / gold /
   emerald / purple petals. One component, named motifs, all painted from the
   palette (--accent = gold on the dark palettes, maroon on Gading; --accent-soft
   = light gold), so every motif re-themes with the palette switcher.

     kembang  → kembang goyang (the trembling gold flower of the Karsuhun crown)
     melati   → jasmine
     bintang  → eight-point songket star
     sirih    → betel leaf (daun sirih, the tepak sirih offering)
     tanjung  → bunga tanjung, a small star-flower of the ukiran repertoire

   Unknown names (e.g. Lovebirds petal names in an old config) fall back to
   `kembang`, so a stale `petals` array never renders blank.
   ============================================================================ */
import React from 'react'

const GOLD = 'var(--accent, #D4AF37)'
const SOFT = 'var(--accent-soft, #ECD27E)'
const IVORY = '#FBF6E8'

const MOTIFS = {
  kembang: (
    <g transform="translate(50 50)">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
        <ellipse key={r} cx="0" cy="-24" rx="8" ry="17" fill={GOLD} transform={`rotate(${r})`} />
      ))}
      <circle r="13" fill={SOFT} />
      <circle r="6" fill={GOLD} />
    </g>
  ),
  melati: (
    <g transform="translate(50 50)">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="0" cy="-20" rx="11" ry="20" fill={IVORY} stroke={SOFT} strokeWidth="1.5" transform={`rotate(${r})`} />
      ))}
      <circle r="8" fill={SOFT} />
    </g>
  ),
  bintang: (
    <g transform="translate(50 50)">
      <path d="M0 -42 L8 -10 L42 0 L8 10 L0 42 L-8 10 L-42 0 L-8 -10 Z" fill={GOLD} />
      <path d="M0 -26 L18 -18 L26 0 L18 18 L0 26 L-18 18 L-26 0 L-18 -18 Z" fill="none" stroke={SOFT} strokeWidth="2" />
      <circle r="6" fill={SOFT} />
    </g>
  ),
  sirih: (
    <g transform="translate(50 50)">
      <path d="M0 40 C-30 20 -34 -14 -14 -30 C-6 -36 0 -34 0 -24 C0 -34 6 -36 14 -30 C34 -14 30 20 0 40 Z" fill={GOLD} />
      <path d="M0 36 V-20 M0 10 L-14 -4 M0 10 L14 -4 M0 22 L-12 12 M0 22 L12 12" stroke={SOFT} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  ),
  tanjung: (
    <g transform="translate(50 50)">
      {Array.from({ length: 12 }, (_, i) => i * 30).map((r) => (
        <path key={r} d="M0 -8 L4 -34 L0 -40 L-4 -34 Z" fill={GOLD} transform={`rotate(${r})`} />
      ))}
      <circle r="10" fill={SOFT} />
    </g>
  ),
}

export const ADAT_PETAL_NAMES = Object.keys(MOTIFS)

export function AdatPetal({ name, className, style }) {
  const motif = MOTIFS[name] ?? MOTIFS.kembang
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} style={style} aria-hidden="true">
      {motif}
    </svg>
  )
}

/** Ukiran corner (simbar curls + double rail), drawn for the TOP-LEFT corner in
 *  a 200×200 box; mirror with CSS for the other three. Stroke = palette gold. */
export function UkiranCornerArt({ className, style }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style} aria-hidden="true"
      fill="none" stroke={GOLD} strokeLinecap="round">
      <path d="M8 8 H186 M8 8 V186" strokeWidth="2" opacity="0.85" />
      <path d="M20 20 H150 M20 20 V150" strokeWidth="1" opacity="0.6" />
      <path d="M26 26 C70 26 100 46 104 76 C107 98 90 110 77 100 C67 92 74 79 84 84" strokeWidth="1.8" />
      <path d="M26 26 C26 70 46 100 76 104 C98 107 110 90 100 77 C92 67 79 74 84 84" strokeWidth="1.8" />
      <path d="M26 26 C46 42 56 56 60 70" strokeWidth="1.3" opacity="0.8" />
      <g fill={GOLD} stroke="none">
        <path d="M118 20 c10 -10 24 -10 34 0 c-10 10 -24 10 -34 0 Z" opacity="0.8" />
        <path d="M20 118 c-10 10 -10 24 0 34 c10 -10 10 -24 0 -34 Z" opacity="0.8" />
        <circle cx="166" cy="20" r="3.5" />
        <circle cx="20" cy="166" r="3.5" />
        <circle cx="46" cy="46" r="3.2" fill={SOFT} />
      </g>
    </svg>
  )
}

/** Horizontal songket thread (bintang berantai) — replaces the sweep curves. */
export function SongketThread({ className, style }) {
  const stars = [60, 150, 240, 330, 420, 510]
  return (
    <svg viewBox="0 0 600 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style} aria-hidden="true">
      <path d="M0 20 H600" stroke={GOLD} strokeWidth="1" opacity="0.6" />
      <path d="M0 26 H600" stroke={SOFT} strokeWidth="0.6" opacity="0.45" />
      {stars.map((x) => (
        <path key={x} d={`M${x} 10 L${x + 4} 20 L${x} 30 L${x - 4} 20 Z`} fill={GOLD} opacity="0.75" />
      ))}
    </svg>
  )
}

/** Simbar fern line-art — replaces Lovebirds' botanical line-art accents. */
export function SimbarLineArt({ className, style, innerRef }) {
  return (
    <svg ref={innerRef} className={className} style={style} viewBox="0 0 120 180" fill="none" stroke={GOLD} strokeLinecap="round" aria-hidden="true">
      <path d="M10 172 C30 140 40 110 52 70 C60 44 72 26 90 12" strokeWidth="1.4" />
      <path d="M30 128 C14 122 10 104 22 98 C32 93 38 106 30 116" strokeWidth="1.1" />
      <path d="M44 96 C62 92 68 76 58 70 C50 66 44 76 50 84" strokeWidth="1.1" />
      <path d="M52 64 C38 56 38 40 48 36 C57 33 60 44 54 50" strokeWidth="1.1" />
      <path d="M70 34 C86 32 92 18 84 12 C77 8 71 16 76 23" strokeWidth="1.1" />
      <circle cx="90" cy="12" r="3" fill={SOFT} stroke="none" />
    </svg>
  )
}
