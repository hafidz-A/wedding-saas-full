'use client'

import { useEffect, useRef, useState } from 'react'
import './Ornaments.css'
import { resolveOrnamentTheme } from '../config/ornamentThemes.js'
import { useTheme } from './ThemeProvider.jsx'

// SVG path sets — copied verbatim from style-guide-lovebirds.html lines 2310-2331.
// Exported so other sections (e.g. the gallery frame) can reuse the couple's
// chosen ornament motif instead of an unrelated decoration.
export const SHAPES = {
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

const BG_BIRDS = [5, 6, 7, 8, 9]
const FG_BIRDS = [1, 2, 3]
// Phones get a lighter flock: every flapping bird re-rasters its SVG layer
// continuously, and 8 of them was a measured FPS sink on mid-range devices.
const BG_BIRDS_MOBILE = [5, 6, 7]
const FG_BIRDS_MOBILE = [1, 2]

// Hydration-safe breakpoint: MUST start false on both server and first
// client render (same pattern as GlobalBackground's useBreakpoint), then
// reads the real value after mount. A decorative layer trimming its bird
// count a frame later is invisible; a hydration mismatch is not.
function useIsNarrow(maxWidth = 768) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const sync = (e) => setNarrow(e.matches ?? mql.matches)
    setNarrow(mql.matches)
    mql.addEventListener?.('change', sync)
    return () => mql.removeEventListener?.('change', sync)
  }, [maxWidth])
  return narrow
}

export default function Ornaments() {
  // Live values from ThemeProvider — in demo these change as the guest switches
  // palette/ornament; on a published invitation they stay locked to the
  // couple's saved defaults. The flying SVG birds inherit colour via CSS
  // (var(--accent)); the perched canvas resolves its palette below.
  const { theme: paletteKey, ornamentType } = useTheme()
  const isNarrow = useIsNarrow()
  const isPerched = ornamentType === 'perched'
  const inner = SHAPES[ornamentType] || SHAPES.birds
  const bgBirds = isNarrow ? BG_BIRDS_MOBILE : BG_BIRDS
  const fgBirds = isNarrow ? FG_BIRDS_MOBILE : FG_BIRDS

  return (
    <div className="lovebirds-ornament-root" aria-hidden="true">
      {!isPerched && (
        <>
          <div className="lovebirds-fly-zone-bg">
            {bgBirds.map((n) => (
              <div key={n} className={`lovebird-parallax-wrap p-wrap-${n}`}>
                <svg className={`lovebird lovebird-${n}`} viewBox="0 0 64 64"
                     dangerouslySetInnerHTML={{ __html: inner }} />
              </div>
            ))}
          </div>
          <div className="lovebirds-fly-zone-fg">
            {fgBirds.map((n) => (
              <div key={n} className={`lovebird-parallax-wrap p-wrap-${n}`}>
                <svg className={`lovebird lovebird-${n}`} viewBox="0 0 64 64"
                     dangerouslySetInnerHTML={{ __html: inner }} />
              </div>
            ))}
          </div>
        </>
      )}
      <PerchedCanvas active={isPerched} paletteKey={paletteKey} />
    </div>
  )
}

// Perched-bird Canvas 2D engine — ported faithfully from
// style-guide-lovebirds.html (lines ~2481–3082). All former module globals
// are now effect-locals; all `currentTheme.*` reads become the resolved
// `theme` for this paletteKey.
// Exported so the marketing "Vibe Explorer" can reuse the real perched birds
// as a palette-driven backdrop (scoped to a section via absolute positioning).
export function PerchedCanvas({ active, paletteKey, contained = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const theme = resolveOrnamentTheme(paletteKey)
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // --- Engine state (were module globals in the style guide) ---
    let W = 0, H = 0
    let branchScale = 1.0
    let raf = null
    const startTime = performance.now()
    const CYCLE_DURATION = 12000 // ms for full flight cycle

    // Heart particles state
    let hearts = []
    let lastHeartTime = 0

    // Flight path state
    let prevFlightX = 0, prevFlightY = 0
    let smoothScaleX = -1     // continuous: -1 = face left (toward partner), 1 = face right
    let smoothRotation = 0
    let smoothBanking = 0     // banking tilt for 3D turn feel
    let prevDx = 0, prevDy = 0 // previous velocity for banking calculation

    function resizeCanvas() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      if (contained) {
        // Scoped preview: size the scene to the canvas's OWN box, not the window,
        // so the exact same perched animation renders inside the dashboard panel.
        const rect = canvas.getBoundingClientRect()
        W = Math.max(1, Math.round(rect.width))
        H = Math.max(1, Math.round(rect.height))
      } else {
        W = window.innerWidth
        H = window.innerHeight
      }
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Calculate branchScale based on viewport and clamp it to avoid micro/giant assets
      branchScale = Math.min(W / 500, H / 350) * 0.85
      branchScale = Math.max(contained ? 0.78 : 0.65, Math.min(1.4, branchScale))
    }

    function getCycleProgress(time) {
      return ((time - startTime) % CYCLE_DURATION) / CYCLE_DURATION
    }

    // DRAWING HELPERS
    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${alpha})`
    }

    function lerpColor(c1, c2, t) {
      const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16)
      const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16)
      const r = Math.round(r1 + (r2 - r1) * t)
      const g = Math.round(g1 + (g2 - g1) * t)
      const b = Math.round(b1 + (b2 - b1) * t)
      return `rgb(${r},${g},${b})`
    }

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    }

    // BRANCH DRAWING
    function drawBranch(cx, cy, scale) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)

      // Main thick branch
      ctx.beginPath()
      ctx.moveTo(-180, 10)
      ctx.bezierCurveTo(-130, -8, -60, 5, 0, -2)
      ctx.bezierCurveTo(60, -10, 130, 2, 190, -5)
      ctx.lineWidth = 14
      ctx.strokeStyle = theme.branch
      ctx.lineCap = 'round'
      ctx.stroke()

      // Branch shadow/depth line
      ctx.beginPath()
      ctx.moveTo(-180, 14)
      ctx.bezierCurveTo(-130, -2, -60, 10, 0, 4)
      ctx.bezierCurveTo(60, -4, 130, 8, 190, 1)
      ctx.lineWidth = 10
      ctx.strokeStyle = theme.branchDark
      ctx.stroke()

      // Top highlight
      ctx.beginPath()
      ctx.moveTo(-170, 5)
      ctx.bezierCurveTo(-120, -14, -55, -1, 5, -8)
      ctx.bezierCurveTo(65, -16, 125, -4, 185, -10)
      ctx.lineWidth = 4
      ctx.strokeStyle = hexToRgba(theme.branch, 0.5)
      ctx.stroke()

      // Small twig right
      ctx.beginPath()
      ctx.moveTo(140, -2)
      ctx.bezierCurveTo(155, -20, 170, -28, 180, -35)
      ctx.lineWidth = 4
      ctx.strokeStyle = theme.branch
      ctx.lineCap = 'round'
      ctx.stroke()

      // Small twig left
      ctx.beginPath()
      ctx.moveTo(-120, 5)
      ctx.bezierCurveTo(-135, -12, -148, -18, -155, -26)
      ctx.lineWidth = 3.5
      ctx.strokeStyle = theme.branch
      ctx.stroke()

      // Leaf on right twig
      ctx.beginPath()
      ctx.moveTo(175, -32)
      ctx.bezierCurveTo(182, -44, 196, -42, 190, -30)
      ctx.bezierCurveTo(184, -22, 175, -32, 175, -32)
      ctx.fillStyle = hexToRgba(theme.accent, 0.35)
      ctx.fill()

      ctx.restore()
    }

    // BIRD DRAWING
    function drawBird(x, y, scale, scaleX, wingAngle, bodyTilt, colors) {
      ctx.save()
      ctx.translate(x, y)
      // scaleX is continuous: 1 = face right, -1 = face left, 0 = edge-on (3D turn)
      ctx.scale(scale * scaleX, scale)
      ctx.rotate(bodyTilt)

      const { body: bodyColor, bodyLight, belly, beak, eye, wing: wingColor, wingInner, cheek, tail: tailColor } = colors

      // Tail feathers
      ctx.save()
      ctx.rotate(0.1)
      ctx.beginPath()
      ctx.moveTo(-18, 8)
      ctx.bezierCurveTo(-32, 14, -40, 24, -36, 30)
      ctx.bezierCurveTo(-30, 30, -22, 20, -14, 12)
      ctx.fillStyle = tailColor
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(-16, 5)
      ctx.bezierCurveTo(-28, 8, -38, 18, -34, 24)
      ctx.bezierCurveTo(-28, 24, -20, 16, -12, 8)
      ctx.fillStyle = bodyColor
      ctx.fill()
      ctx.restore()

      // Back wing (behind body)
      ctx.save()
      ctx.translate(-2, -4)
      ctx.rotate(wingAngle * 0.7)
      ctx.beginPath()
      ctx.ellipse(0, 0, 18, 10, -0.3, 0, Math.PI * 2)
      ctx.fillStyle = wingInner
      ctx.fill()
      ctx.restore()

      // Body (plump round shape)
      ctx.beginPath()
      ctx.ellipse(0, 4, 20, 18, 0, 0, Math.PI * 2)
      ctx.fillStyle = bodyColor
      ctx.fill()

      // Belly highlight
      ctx.beginPath()
      ctx.ellipse(2, 10, 14, 12, 0.1, 0, Math.PI * 2)
      ctx.fillStyle = belly
      ctx.fill()

      // Head
      ctx.beginPath()
      ctx.arc(10, -12, 14, 0, Math.PI * 2)
      ctx.fillStyle = bodyColor
      ctx.fill()

      // Face lighter area
      ctx.beginPath()
      ctx.arc(13, -10, 10, 0, Math.PI * 2)
      ctx.fillStyle = bodyLight
      ctx.fill()

      // Cheek blush
      ctx.beginPath()
      ctx.arc(8, -6, 5, 0, Math.PI * 2)
      ctx.fillStyle = cheek
      ctx.fill()

      // Eye
      ctx.beginPath()
      ctx.arc(15, -14, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(16, -14.5, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = eye
      ctx.fill()
      ctx.beginPath()
      ctx.arc(16.5, -15.2, 0.7, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      // Beak
      ctx.beginPath()
      ctx.moveTo(22, -12)
      ctx.lineTo(30, -10)
      ctx.lineTo(22, -8)
      ctx.closePath()
      ctx.fillStyle = beak
      ctx.fill()

      // Front wing
      ctx.save()
      ctx.translate(0, -2)
      ctx.rotate(wingAngle)
      ctx.beginPath()
      ctx.ellipse(0, 0, 20, 11, -0.2, 0, Math.PI * 2)
      ctx.fillStyle = wingColor
      ctx.fill()

      // Wing feather lines
      ctx.beginPath()
      ctx.moveTo(-8, 3)
      ctx.lineTo(-18, 7)
      ctx.moveTo(-4, 5)
      ctx.lineTo(-14, 10)
      ctx.moveTo(0, 6)
      ctx.lineTo(-10, 12)
      ctx.lineWidth = 1
      ctx.strokeStyle = hexToRgba(bodyColor, 0.4)
      ctx.stroke()
      ctx.restore()

      // Feet
      ctx.beginPath()
      ctx.moveTo(-4, 20)
      ctx.lineTo(-6, 28)
      ctx.moveTo(-4, 20)
      ctx.lineTo(-2, 28)
      ctx.moveTo(4, 20)
      ctx.lineTo(2, 28)
      ctx.moveTo(4, 20)
      ctx.lineTo(6, 28)
      ctx.lineWidth = 2
      ctx.strokeStyle = theme.branchDark
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.restore()
    }

    function getBirdColors() {
      return {
        body: theme.accent,
        bodyLight: theme.accentSoft,
        belly: hexToRgba(theme.accentSoft, 0.6),
        // Darkened shade of the bird's own colour so the beak stays visible on
        // every palette (a fixed orange blended into gold/yellow/orange accents).
        beak: lerpColor(theme.accent, '#2A1A0A', 0.52),
        eye: '#1a1a1a',
        wing: theme.accent,
        wingInner: theme.accentSoft,
        cheek: hexToRgba(theme.accentSoft, 0.5),
        tail: lerpColor(theme.accent, '#333333', 0.3)
      }
    }

    // HEART PARTICLES
    function spawnHeart(x, y) {
      hearts.push({
        x, y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 1,
        size: Math.random() * 6 + 4,
        life: 1,
        decay: Math.random() * 0.015 + 0.008
      })
    }

    function drawHeart(x, y, size, alpha) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(size / 16, size / 16)
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(0, -4)
      ctx.bezierCurveTo(0, -8, -8, -12, -8, -6)
      ctx.bezierCurveTo(-8, -2, 0, 4, 0, 8)
      ctx.bezierCurveTo(0, 4, 8, -2, 8, -6)
      ctx.bezierCurveTo(8, -12, 0, -8, 0, -4)
      ctx.fillStyle = theme.accent
      ctx.fill()
      ctx.restore()
    }

    function updateHearts() {
      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i]
        h.x += h.vx
        h.y += h.vy
        h.vy *= 0.98
        h.life -= h.decay
        if (h.life <= 0) hearts.splice(i, 1)
      }
    }

    // SPLINE METHODS
    function catmullRom(p0, p1, p2, p3, t) {
      const t2 = t * t
      const t3 = t2 * t
      return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      )
    }

    function catmullRomDerivative(p0, p1, p2, p3, t) {
      const t2 = t * t
      return 0.5 * (
        (-p0 + p2) +
        (4 * p0 - 10 * p1 + 8 * p2 - 2 * p3) * t +
        (-3 * p0 + 9 * p1 - 9 * p2 + 3 * p3) * t2
      )
    }

    function getFlightWaypoints() {
      const bx = W * 0.5 + 28 * branchScale
      const by = H * 0.58 - 22 * branchScale
      return [
        { x: bx,            y: by },
        { x: bx + W * 0.12, y: by - H * 0.15 },
        { x: W * 0.82,      y: H * 0.22 },
        { x: W * 0.70,      y: H * 0.12 },
        { x: W * 0.35,      y: H * 0.10 },
        { x: W * 0.15,      y: H * 0.25 },
        { x: W * 0.20,      y: H * 0.48 },
        { x: W * 0.40,      y: H * 0.55 },
        { x: W * 0.65,      y: H * 0.38 },
        { x: W * 0.75,      y: H * 0.20 },
        { x: W * 0.55,      y: H * 0.18 },
        { x: W * 0.35,      y: H * 0.30 },
        { x: bx + W * 0.08, y: by - H * 0.08 },
        { x: bx,            y: by },
      ]
    }

    function updateOrientation(dx, dy) {
      const targetScaleX = dx > 0 ? 1 : -1
      smoothScaleX += (targetScaleX - smoothScaleX) * 0.04

      const flightAngle = Math.atan2(dy, Math.abs(dx)) * 0.35
      const correctedTilt = smoothScaleX >= 0 ? flightAngle : -flightAngle
      smoothRotation += (correctedTilt - smoothRotation) * 0.08

      const prevAngle = Math.atan2(prevDy, prevDx)
      const currAngle = Math.atan2(dy, dx)
      let angleDiff = currAngle - prevAngle
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
      const bankTarget = -angleDiff * 2.5
      smoothBanking += (bankTarget - smoothBanking) * 0.06
      smoothBanking = Math.max(-0.4, Math.min(0.4, smoothBanking))

      prevDx = dx
      prevDy = dy
    }

    function getFlightPosition(t, time) {
      const branchX = W * 0.5
      const branchY = H * 0.58
      const perchX = branchX + 28 * branchScale
      const perchY = branchY - 22 * branchScale

      const PERCH_END = 0.35
      const TAKEOFF_END = 0.42
      const FLY_END = 0.88
      const LAND_END = 0.94

      if (t < PERCH_END) {
        const bob = Math.sin(t * Math.PI * 12) * 1.5
        prevFlightX = perchX
        prevFlightY = perchY + bob
        smoothScaleX = -1
        smoothRotation = 0
        smoothBanking = 0
        prevDx = 0; prevDy = 0
        return { x: perchX, y: perchY + bob, rotation: 0, banking: 0, wingSpeed: 0, scale: 1, perched: true, scaleX: -1 }
      }

      if (t < TAKEOFF_END) {
        const p = (t - PERCH_END) / (TAKEOFF_END - PERCH_END)
        const ep = easeInOut(p)
        const waypoints = getFlightWaypoints()
        const x = perchX + (waypoints[1].x - perchX) * ep
        const y = perchY + (waypoints[1].y - perchY) * ep

        const dx = x - prevFlightX || 0.01
        const dy = y - prevFlightY
        updateOrientation(dx, dy)
        prevFlightX = x
        prevFlightY = y

        return {
          x, y,
          rotation: smoothRotation,
          banking: smoothBanking,
          wingSpeed: 6 + ep * 14,
          scale: 1 - ep * 0.12,
          perched: false,
          scaleX: smoothScaleX
        }
      }

      if (t < FLY_END) {
        const waypoints = getFlightWaypoints()
        const flyP = (t - TAKEOFF_END) / (FLY_END - TAKEOFF_END)

        const numSegments = waypoints.length - 3
        const totalP = flyP * numSegments
        const segIdx = Math.min(Math.floor(totalP), numSegments - 1)
        const segT = totalP - segIdx

        const i = segIdx + 1
        const p0 = waypoints[Math.max(0, i - 1)]
        const p1 = waypoints[i]
        const p2 = waypoints[Math.min(waypoints.length - 1, i + 1)]
        const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)]

        const x = catmullRom(p0.x, p1.x, p2.x, p3.x, segT)
        const y = catmullRom(p0.y, p1.y, p2.y, p3.y, segT)

        const dx = catmullRomDerivative(p0.x, p1.x, p2.x, p3.x, segT)
        const dy = catmullRomDerivative(p0.y, p1.y, p2.y, p3.y, segT)

        updateOrientation(dx, dy)

        const heightRatio = y / H
        const flyScale = 0.78 + heightRatio * 0.15

        prevFlightX = x
        prevFlightY = y

        return {
          x, y,
          rotation: smoothRotation,
          banking: smoothBanking,
          wingSpeed: 16,
          scale: flyScale,
          perched: false,
          scaleX: smoothScaleX
        }
      }

      if (t < LAND_END) {
        const p = (t - FLY_END) / (LAND_END - FLY_END)
        const ep = easeInOut(p)

        const landStartX = prevFlightX
        const landStartY = prevFlightY
        const x = landStartX + (perchX - landStartX) * ep
        const y = landStartY + (perchY - landStartY) * ep

        const dx = x - prevFlightX || 0.01
        const dy = y - prevFlightY
        updateOrientation(dx, dy)

        smoothScaleX += (-1 - smoothScaleX) * 0.05
        smoothRotation *= (1 - ep * 0.15)
        smoothBanking *= (1 - ep * 0.15)
        prevFlightX = x
        prevFlightY = y

        return {
          x, y,
          rotation: smoothRotation,
          banking: smoothBanking * (1 - ep),
          wingSpeed: 14 * (1 - p * p),
          scale: 0.88 + 0.12 * ep,
          perched: false,
          scaleX: smoothScaleX
        }
      }

      // Settling
      const p = (t - LAND_END) / (1.0 - LAND_END)
      const dampBob = Math.sin(p * Math.PI * 3) * 3 * (1 - p)
      smoothScaleX = -1
      smoothRotation = 0
      smoothBanking = 0
      prevDx = 0; prevDy = 0
      prevFlightX = perchX
      prevFlightY = perchY + dampBob
      return { x: perchX, y: perchY + dampBob, rotation: 0, banking: 0, wingSpeed: Math.max(0, 4 * (1 - p * 2)), scale: 1, perched: true, scaleX: -1 }
    }

    // RENDER CANVAS
    function renderCanvas(time) {
      const t = getCycleProgress(time)

      // Clear transparently
      ctx.clearRect(0, 0, W, H)

      // Subtle radial glow behind birds
      const glow = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.35)
      glow.addColorStop(0, hexToRgba(theme.accent, 0.08))
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      const branchCX = W * 0.5
      const branchCY = H * 0.58

      // Draw branch
      drawBranch(branchCX, branchCY, branchScale)

      const colors = getBirdColors()

      // Left bird (always perched, facing right toward partner)
      const leftBob = Math.sin(time * 0.002) * 1.5
      const leftWingBreath = Math.sin(time * 0.003) * 0.06
      drawBird(
        branchCX - 30 * branchScale,
        branchCY - 22 * branchScale + leftBob,
        branchScale * 0.9,
        1,           // scaleX: 1 = face right
        leftWingBreath,
        Math.sin(time * 0.0015) * 0.03,
        colors
      )

      // Right bird (flies away and returns)
      const flight = getFlightPosition(t, time)
      const wingAngle = flight.wingSpeed > 0
        ? Math.sin(time * flight.wingSpeed * 0.01) * 0.55
        : Math.sin(time * 0.003) * 0.06

      // Combine body rotation with banking tilt for natural 3D feel
      const totalTilt = flight.rotation + (flight.banking || 0)

      drawBird(
        flight.x,
        flight.y,
        branchScale * 0.9 * flight.scale,
        flight.scaleX,   // continuous scaleX for smooth 3D turns
        wingAngle,
        totalTilt,
        colors
      )

      // Hearts when both perched
      if (flight.perched && t < 0.30) {
        if (time - lastHeartTime > 800) {
          spawnHeart(branchCX * 1.0, branchCY - 45 * branchScale)
          lastHeartTime = time
        }
      }
      updateHearts()
      hearts.forEach(h => drawHeart(h.x, h.y, h.size, h.life))
    }

    let lastRenderTime = 0
    function loop(time) {
      if (reduce) return
      
      raf = requestAnimationFrame(loop)
      
      // Pause completely if tab is hidden or if gallery is active (CSS hides it anyway)
      if (document.hidden || document.body.classList.contains('lb-gallery-active')) {
        return
      }
      
      // Throttle to ~30fps on mobile to save CPU/GPU (30ms = ~33 FPS)
      if (W <= 768 && time - lastRenderTime < 30) {
        return
      }

      lastRenderTime = time
      renderCanvas(time)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [active, paletteKey, contained])

  return (
    <canvas
      ref={canvasRef}
      className="lovebirds-bird-canvas"
      style={
        contained
          ? {
              // Override the global fixed/dimmed watermark styling so the canvas
              // fills (and is clipped to) its preview box at full vibrancy.
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: active ? 'block' : 'none',
              opacity: 1,
            }
          : { display: active ? 'block' : 'none' }
      }
    />
  )
}
