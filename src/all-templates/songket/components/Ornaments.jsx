'use client'

import React, { useEffect, useState } from 'react'
import './Ornaments.css'
import { useTheme } from './ThemeProvider.jsx'

/* Adat ornament motifs (64×64 viewBox, inner SVG markup). Exported so other
   layers (SceneFrame's side columns) reuse the couple's chosen motif — the same
   contract Lovebirds' bird shapes had. Paint with currentColor so the palette
   accent tints them. Keys must match src/lib/templates/appearance.ts (songket). */
export const SHAPES = {
  // Melati: five rounded petals around a gold heart.
  melati: [0, 72, 144, 216, 288]
    .map((r) => `<ellipse cx="32" cy="19" rx="8" ry="13" transform="rotate(${r} 32 32)" fill="currentColor" />`)
    .join('') + '<circle cx="32" cy="32" r="5.5" fill="var(--accent-soft, #ECD27E)" />',
  // Kilau benang emas: an eight-point songket star.
  kilauEmas:
    '<path d="M32 4 L37 24 L58 18 L42 32 L58 46 L37 40 L32 60 L27 40 L6 46 L22 32 L6 18 L27 24 Z" fill="currentColor" />' +
    '<circle cx="32" cy="32" r="4" fill="var(--accent-soft, #ECD27E)" />',
  // Kunang-kunang: a small glowing body with two soft wings.
  kunang:
    '<ellipse cx="22" cy="26" rx="10" ry="6" transform="rotate(-25 22 26)" fill="currentColor" opacity="0.45" />' +
    '<ellipse cx="42" cy="26" rx="10" ry="6" transform="rotate(25 42 26)" fill="currentColor" opacity="0.45" />' +
    '<circle cx="32" cy="34" r="9" fill="currentColor" />',
}

// Deterministic slots (no Math.random) so SSR and hydration agree.
const FALLING = [
  { left: '4%', delay: 0, dur: 16, size: 20 },
  { left: '13%', delay: 7, dur: 19, size: 14 },
  { left: '88%', delay: 2, dur: 17, size: 22 },
  { left: '95%', delay: 10, dur: 21, size: 15 },
  { left: '28%', delay: 13, dur: 23, size: 12 },
  { left: '72%', delay: 5, dur: 20, size: 16 },
  { left: '54%', delay: 16, dur: 24, size: 11 },
]
const SPOTS = [
  ['6%', '16%', 0], ['18%', '62%', 1.4], ['82%', '22%', 2.2], ['93%', '70%', 0.6],
  ['44%', '10%', 3.1], ['62%', '84%', 1.9], ['10%', '88%', 2.7], ['74%', '48%', 3.6],
  ['32%', '36%', 4.2], ['88%', '92%', 1.1],
]

// Hydration-safe breakpoint (starts false on server + first client render).
function useIsNarrow(maxWidth = 768) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const sync = () => setNarrow(mql.matches)
    sync()
    mql.addEventListener?.('change', sync)
    return () => mql.removeEventListener?.('change', sync)
  }, [maxWidth])
  return narrow
}

const Shape = ({ name, className, style }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" dangerouslySetInnerHTML={{ __html: SHAPES[name] }} />
)

/**
 * The ambient adat layer behind the page (Lovebirds' flying-bird slot). Reads
 * the live ornament from ThemeProvider: demo guests can switch it, published
 * invitations stay on the couple's saved choice. Phones get fewer pieces.
 */
export default function Ornaments() {
  const { ornamentType } = useTheme()
  const isNarrow = useIsNarrow()
  const type = SHAPES[ornamentType] ? ornamentType : 'melati'

  return (
    <div className="songket-ornament-root" aria-hidden="true">
      {type === 'melati' &&
        (isNarrow ? FALLING.slice(0, 4) : FALLING).map((p, i) => (
          <Shape
            key={i}
            name="melati"
            className={`sk-orn-fall ${i < 2 ? 'sk-orn-front' : ''}`}
            style={{ left: p.left, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
          />
        ))}
      {type === 'kilauEmas' &&
        (isNarrow ? SPOTS.slice(0, 6) : SPOTS).map(([left, top, delay], i) => (
          <Shape
            key={i}
            name="kilauEmas"
            className="sk-orn-twinkle"
            style={{ left, top, animationDelay: `${delay}s`, animationDuration: `${3.4 + (i % 3)}s` }}
          />
        ))}
      {type === 'kunang' &&
        (isNarrow ? SPOTS.slice(0, 6) : SPOTS).map(([left, top, delay], i) => (
          <span
            key={i}
            className="sk-orn-firefly"
            style={{ left, top, animationDelay: `${delay}s`, animationDuration: `${6 + (i % 4)}s` }}
          />
        ))}
    </div>
  )
}
