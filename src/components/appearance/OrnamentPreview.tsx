'use client'

import React from 'react'
import { PerchedCanvas } from '@/all-templates/lovebirds/components/Ornaments.jsx'

/** Ornament preview scene — moved VERBATIM out of the dashboard `OrnamentTab`
 *  so the admin appearance dialog can render the exact same visual instead of
 *  a simplified lookalike (house rule: previews reuse the real component).
 *  `OrnamentTab` keeps its i18n, save wiring, and layout — only the scene
 *  (motif paths, flight layout, preview CSS) lives here now. */

export type OrnamentType = 'birds' | 'butterflies' | 'perched'

export const ORNAMENT_PREVIEW_PATHS: Record<OrnamentType, string> = {
  birds: `<path class="wing-back" d="M28 33 C29 22, 26 12, 18 6 C15 4, 13 7, 15 13 C13 10, 9 14, 12 21 C10 18, 6 22, 9 29 C7 26, 3 30, 7 37 C5 34, 2 38, 6 42 C12 44, 22 41, 28 33 Z" />
              <path class="bird-body" d="M4 32 L4 38 L20 38 C26 42, 34 43, 40 40 C44 38, 48 35, 58 32 C52 30, 49 28, 46 26 C43 24, 40 25, 36 29 C32 32, 27 33, 22 33 L4 32 Z" />
              <path class="wing-front" d="M30 33 C31 22, 28 10, 20 4 C17 2, 15 5, 17 11 C15 8, 11 12, 14 19 C12 16, 8 20, 11 27 C9 24, 5 28, 9 35 C7 32, 4 36, 8 41 C14 43, 24 41, 30 33 Z" />`,
  butterflies: `<path class="wing-back" d="M30 32 C23 20, 15 13, 9 17 C6 20, 8 28, 15 32 C12 37, 9 46, 12 48 C14 49, 18 43, 22 39 C25 42, 27 41, 28 38 Z" />
              <path class="bird-body" d="M31 32 C33 30, 36 27, 37 27 C38 27, 39 28, 38 29 C37 31, 34 34, 32 34 C31 34, 30 33, 31 32 Z M37 27 C38 26, 39 25, 39 24 C39 23, 38 22, 37 22 C36 22, 35 23, 35 24 C35 25, 36 26, 37 27 Z M31 33 C29 35, 26 39, 22 43 C21 44, 20 44, 21 43 C23 39, 27 35, 30 32 Z M37 23 C41 19, 44 14, 45 13 C46 12, 45 11, 44 12 C41 15, 39 19, 37 23 Z M36 24 Q39 18, 41 12 Q42 11, 41 10 Q40 9, 39 10 Q40 11, 39 12 Q37 18, 35 23 Z M36 24 C39 18, 41 12, 42 11 C43 10, 42 9, 41 10 C39 12, 37 18, 36 24 Z" />
              <path class="wing-front" d="M32 32 C24 16, 15 8, 10 13 C7 16, 12 28, 22 32 C17 38, 12 48, 15 50 C18 52, 24 46, 29 36 C31 38, 32 36, 32 32 Z" />`,
  perched: `<path class="branch-twig" d="M10 44 L54 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path class="tail-feathers" d="M22 38 L14 48 C13 49 15 50 16 48 L25 40 Z" fill="currentColor" opacity="0.8" />
              <path class="feet" d="M32 38 L30 44 M36 38 L38 44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path class="bird-body" d="M22 32 C22 25, 26 20, 32 20 C38 20, 42 25, 42 32 C42 38, 38 40, 32 40 C26 40, 22 38, 22 32 Z" fill="currentColor" />
              <circle class="bird-head" cx="37" cy="16" r="8" fill="currentColor" />
              <circle cx="39" cy="14" r="1.5" fill="#000" />
              <path class="beak" d="M45 14 L49 16 L45 18 Z" fill="currentColor" />
              <path class="wing-front" d="M26 30 C26 26, 32 26, 35 32 C38 38, 32 38, 29 36 Z" fill="currentColor" opacity="0.9" />`,
}

// Flying flock layout (birds / butterflies): each motif crosses the panel on a
// left→right or right→left path while its wings flap — the SAME motion the real
// invitation uses (flap keyframes ported from Ornaments.css; flight re-scoped to
// the panel via animating `left` instead of the viewport-unit `vw` paths).
export const ORNAMENT_PREVIEW_FLOCK = [
  { top: '12%', size: 58, dur: 9, delay: '0s', dir: 'r' as const },
  { top: '30%', size: 40, dur: 12, delay: '-4s', dir: 'l' as const },
  { top: '48%', size: 74, dur: 8, delay: '-2s', dir: 'r' as const },
  { top: '60%', size: 34, dur: 13, delay: '-7s', dir: 'l' as const },
  { top: '74%', size: 30, dur: 11, delay: '-5s', dir: 'r' as const },
]

export const ORNAMENT_PREVIEW_CSS = `
.ornp { position: absolute; inset: 0; }
.ornp-bird { position: absolute; will-change: left, transform; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.14)); }
.ornp-bird .wing-back { fill: var(--orn-soft); transform-origin: 28px 33px; animation: ornp-flap-back .7s ease-in-out infinite alternate; }
.ornp-bird .wing-front { transform-origin: 30px 33px; animation: ornp-flap-front .7s ease-in-out infinite alternate; }
@keyframes ornp-flap-front { 0% { transform: scaleY(-0.7) rotate(-15deg); } 100% { transform: scaleY(1.1) rotate(20deg); } }
@keyframes ornp-flap-back  { 0% { transform: scaleY(-0.6) rotate(-5deg);  } 100% { transform: scaleY(1.0) rotate(25deg);  } }
@keyframes ornp-fly-r {
  0%   { left: -16%; opacity: 0; transform: translateY(0) rotate(8deg); }
  8%   { opacity: .95; }
  50%  { transform: translateY(-16px) rotate(-4deg); }
  92%  { opacity: .95; }
  100% { left: 112%; opacity: 0; transform: translateY(8px) rotate(6deg); }
}
@keyframes ornp-fly-l {
  0%   { left: 112%; opacity: 0; transform: scaleX(-1) translateY(0) rotate(8deg); }
  8%   { opacity: .9; }
  50%  { transform: scaleX(-1) translateY(14px) rotate(-4deg); }
  92%  { opacity: .9; }
  100% { left: -16%; opacity: 0; transform: scaleX(-1) translateY(-6px) rotate(6deg); }
}
.ornp-bird--r { animation: ornp-fly-r linear infinite; }
.ornp-bird--l { animation: ornp-fly-l linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .ornp-bird, .ornp-bird .wing-back, .ornp-bird .wing-front { animation: none !important; }
}
`

export function OrnamentPreviewStyle() {
  return <style dangerouslySetInnerHTML={{ __html: ORNAMENT_PREVIEW_CSS }} />
}

export function OrnamentPreviewScene({
  type,
  accent,
  accentSoft,
  paletteKey,
}: {
  type: OrnamentType
  accent: string
  accentSoft: string
  paletteKey: string
}) {
  if (type === 'perched') {
    // Reuse the REAL perched-bird canvas — the exact component the live
    // invitation renders — scoped to the preview box. Same animation: one bird
    // flies off and returns over a shared branch, with hearts.
    return <PerchedCanvas active paletteKey={paletteKey} contained />
  }
  return (
    <div className="ornp">
      {ORNAMENT_PREVIEW_FLOCK.map((m, i) => (
        <svg
          key={i}
          className={`ornp-bird ornp-bird--${m.dir}`}
          viewBox="0 0 64 64"
          width={m.size}
          height={m.size}
          aria-hidden
          style={{
            top: m.top,
            fill: accent,
            color: accent,
            ['--orn-soft' as any]: accentSoft,
            animationDuration: `${m.dur}s`,
            animationDelay: m.delay,
          }}
          dangerouslySetInnerHTML={{ __html: ORNAMENT_PREVIEW_PATHS[type] }}
        />
      ))}
    </div>
  )
}
