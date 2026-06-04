'use client'

/* ============================================================================
   VibeBackdrop — renders each template's REAL backdrop behind the explorer,
   recoloured live by the selected palette.

     • Lovebirds → the real perched-bird canvas (Ornaments/PerchedCanvas, driven
       by the lovebirds palette key) + the real BotanicalSketchLayer flower
       sketches on the left & right edges.
     • Solary    → a faithful port of the Three.js Andromeda texture
       (galacticScene.js makeAndromedaTexture) + a starfield, drawn on a 2D
       canvas and tinted from the palette tokens.

   Everything is `aria-hidden` and pointer-events:none; nothing writes to
   <body>, so it can't leak onto the rest of the marketing page.
   ============================================================================ */
import { useEffect, useRef } from 'react'
import { PerchedCanvas } from '@/all-templates/lovebirds/components/Ornaments.jsx'
import { BotanicalSketchLayer } from '@/all-templates/lovebirds/components/BotanicalBorder'
import type { PaletteVibe, TemplateId } from './vibeData'
import styles from './VibeBackdrop.module.css'

/* ---------- colour helpers ---------- */
function hx(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
}
function rgba([r, g, b]: number[], a: number) {
  return `rgba(${r},${g},${b},${a})`
}
/* Deterministic hash-noise (same trick the galactic scene uses) → stable stars. */
function noise(i: number, j: number) {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
}

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

/* ---------- Solary (ported Andromeda + starfield) ---------- */
function SolaryBackdrop({ palette }: { palette: PaletteVibe }) {
  const starsRef = useRef<HTMLCanvasElement>(null)
  const galaxyRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const stars = starsRef.current
    const galaxy = galaxyRef.current
    if (!stars || !galaxy) return

    const dark = palette.mode === 'dark'
    const A = hx(palette.accent)
    const S = hx(palette.swatches[1] || palette.accent) // "sun"/secondary
    const ST = hx(palette.fg)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function size(cv: HTMLCanvasElement) {
      const r = cv.parentElement!.getBoundingClientRect()
      cv.width = Math.max(1, Math.round(r.width * dpr))
      cv.height = Math.max(1, Math.round(r.height * dpr))
      cv.style.width = `${r.width}px`
      cv.style.height = `${r.height}px`
      return { w: r.width, h: r.height, ctx: cv.getContext('2d')! }
    }

    function drawStars() {
      const { w, h, ctx } = size(stars!)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const count = Math.min(460, Math.floor((w * h) / 4200))
      for (let i = 0; i < count; i++) {
        const x = noise(i, 1.3) * w
        const y = noise(i, 2.7) * h
        const r = noise(i, 3.1)
        const sz = r > 0.93 ? 2.1 : r > 0.72 ? 1.3 : 0.8
        const alpha = (dark ? 0.35 : 0.22) + noise(i, 4.4) * (dark ? 0.65 : 0.4)
        const col = r > 0.86 ? (dark ? [255, 255, 255] : ST) : r > 0.6 ? S : A
        ctx.fillStyle = rgba(col, alpha)
        ctx.fillRect(x, y, sz, sz)
      }
    }

    function drawGalaxy() {
      const { w, h, ctx } = size(galaxy!)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const cx = w * 0.5
      const cy = h * 0.42
      const R = Math.min(w, h) * 0.62

      // Outer halo (screen space)
      const halo = ctx.createRadialGradient(cx, cy, R * 0.06, cx, cy, R * 1.5)
      halo.addColorStop(0, rgba(S, dark ? 0.32 : 0.26))
      halo.addColorStop(0.18, rgba(A, dark ? 0.16 : 0.14))
      halo.addColorStop(0.45, rgba(A, 0.05))
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, w, h)

      // Flattened, tilted disk + spiral arms
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-0.35)
      ctx.scale(1, 0.42)

      const dg = ctx.createRadialGradient(0, 0, R * 0.02, 0, 0, R)
      dg.addColorStop(0, rgba(dark ? [255, 245, 225] : S, 0.95))
      dg.addColorStop(0.15, rgba(S, 0.6))
      dg.addColorStop(0.55, rgba(A, 0.16))
      dg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fill()

      const armPoints = window.innerWidth < 700 ? 700 : 1300
      for (let arm = 0; arm < 2; arm++) {
        const armPhase = arm * Math.PI
        for (let i = 0; i < armPoints; i++) {
          const t = i / armPoints
          const r = R * (0.1 + t * 0.92)
          const theta = armPhase + t * Math.PI * 3.2 + (noise(arm, i) - 0.5) * 0.5
          const sx = Math.cos(theta) * r
          const sy = Math.sin(theta) * r
          const star = noise(i, arm + 5)
          ctx.fillStyle =
            star > 0.85
              ? rgba(dark ? [255, 250, 235] : ST, 0.95)
              : star > 0.6
                ? rgba(S, 0.7)
                : rgba(A, 0.42)
          ctx.globalAlpha = 0.5 + noise(i, arm + 1) * 0.5
          const sz = star > 0.9 ? 2.4 : star > 0.6 ? 1.4 : 0.85
          ctx.fillRect(sx + (noise(i, arm + 13) - 0.5) * 22, sy + (noise(i, arm + 7) - 0.5) * 15, sz, sz)
        }
      }
      ctx.globalAlpha = 1
      ctx.restore()

      // Bright nucleus (screen space)
      const nuc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.12)
      nuc.addColorStop(0, rgba(dark ? [255, 250, 228] : S, 1))
      nuc.addColorStop(0.4, rgba(S, 0.9))
      nuc.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = nuc
      ctx.fillRect(cx - R * 0.12, cy - R * 0.12, R * 0.24, R * 0.24)
    }

    function redraw() {
      drawStars()
      drawGalaxy()
    }
    redraw()

    const ro = new ResizeObserver(redraw)
    if (stars.parentElement) ro.observe(stars.parentElement)
    return () => ro.disconnect()
  }, [palette])

  return (
    <div className={styles.solary} aria-hidden="true">
      <canvas ref={starsRef} className={styles.starCanvas} />
      <canvas ref={galaxyRef} className={styles.galaxyCanvas} />
      {/* A few CSS-twinkling stars for life */}
      {TWINKLES.map((s, i) => (
        <span
          key={i}
          className={styles.twinkle}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            background: palette.fg,
            animationDelay: `${s.d}s`,
          }}
        />
      ))}
    </div>
  )
}

const TWINKLES = [
  { x: 12, y: 18, r: 3, d: 0 },
  { x: 84, y: 14, r: 2, d: 1.1 },
  { x: 22, y: 72, r: 2.5, d: 2.2 },
  { x: 76, y: 66, r: 3, d: 0.6 },
  { x: 50, y: 8, r: 2, d: 1.7 },
  { x: 90, y: 44, r: 2.5, d: 2.8 },
  { x: 8, y: 50, r: 2, d: 0.3 },
]

export function VibeBackdrop({ template, palette }: { template: TemplateId; palette: PaletteVibe }) {
  return template === 'solary' ? (
    <SolaryBackdrop palette={palette} />
  ) : (
    <LovebirdsBackdrop palette={palette} />
  )
}
