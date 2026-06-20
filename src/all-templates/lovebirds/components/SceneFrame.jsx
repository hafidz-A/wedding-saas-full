'use client'

import { SHAPES } from './Ornaments.jsx'
import { useTheme } from './ThemeProvider.jsx'

/**
 * SceneFrame — turns a full-width section into a gently illustrated scene that
 * the content card floats above, instead of a wide empty container.
 *
 * Layer order (back → front):
 *   1. the section's own full-width background (untouched)
 *   2. the couple's saved ornament motif clustered down the LEFT & RIGHT edges,
 *      tinted to the palette accent — so the sides read as intentional artwork
 *   3. a soft central haze/mist that fades the ornaments out before they reach
 *      the content, so the card never collides with the artwork (no hard edge)
 *
 * Drop it as the FIRST child of a `position: relative; overflow: hidden`
 * section, then give the content wrapper `position: relative; z-index: 2`.
 * Purely decorative (aria-hidden, pointer-events none).
 *
 * Responsive: artwork is clearly visible on desktop, narrows on tablet, and
 * softens right down on phones so it stays atmospheric without cluttering.
 */
export default function SceneFrame() {
  const { ornamentType } = useTheme()
  const shape = SHAPES[ornamentType] || SHAPES.birds

  // Three motifs staggered down each edge column (160×360 viewBox), largest at
  // the reading band — a calm vertical drift rather than a busy flock.
  const motifs = [
    { x: 34, y: 54, s: 1.6, o: 0.92, delay: '0s' },
    { x: 2, y: 150, s: 1.1, o: 0.64, delay: '1.4s' },
    { x: 66, y: 252, s: 0.82, o: 0.48, delay: '2.4s' },
  ]

  const Side = ({ side }) => (
    <div className={`lb-scene__side lb-scene__side--${side}`}>
      <svg viewBox="0 0 160 360" preserveAspectRatio="xMidYMid meet" aria-hidden>
        {motifs.map((m, i) => (
          <g key={i} className="lb-scene__motif" style={{ opacity: m.o, animationDelay: m.delay }}>
            <g transform={`translate(${m.x} ${m.y}) scale(${m.s})`} dangerouslySetInnerHTML={{ __html: shape }} />
          </g>
        ))}
      </svg>
    </div>
  )

  return (
    <div className="lb-scene" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: SCENE_CSS }} />
      <Side side="left" />
      <Side side="right" />
      <div className="lb-scene__haze" />
    </div>
  )
}

const SCENE_CSS = `
.lb-scene { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }

.lb-scene__side {
  position: absolute;
  top: 50%;
  height: min(88%, 540px);
  width: clamp(120px, 19vw, 280px);
  transform: translateY(-50%);
}
.lb-scene__side--left  { left: 0; }
.lb-scene__side--right { right: 0; transform: translateY(-50%) scaleX(-1); }
.lb-scene__side svg {
  width: 100%; height: 100%; display: block;
  fill: var(--accent, #E8553E);
  color: var(--accent, #E8553E);
}
.lb-scene__motif {
  transform-box: fill-box;
  transform-origin: center;
  animation: lb-scene-bob 6.5s ease-in-out infinite;
}
@keyframes lb-scene-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-11px); } }

/* Central mist: brightest where the card sits, fading to nothing before the
   edge artwork, so the card floats on a soft halo with no hard boundary. */
.lb-scene__haze {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 58% 76% at 50% 48%,
    color-mix(in srgb, var(--button-fg, #ffffff) 16%, transparent) 0%,
    transparent 60%
  );
}

@media (max-width: 900px) {
  .lb-scene__side { width: clamp(82px, 15vw, 160px); }
  .lb-scene__motif { animation: none; }
}
@media (max-width: 600px) {
  .lb-scene__side { width: 78px; opacity: 0.42; }
  .lb-scene__haze {
    background: radial-gradient(
      ellipse 82% 70% at 50% 46%,
      color-mix(in srgb, var(--button-fg, #ffffff) 12%, transparent) 0%,
      transparent 66%
    );
  }
}
@media (prefers-reduced-motion: reduce) { .lb-scene__motif { animation: none; } }
`
