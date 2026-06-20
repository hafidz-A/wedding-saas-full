'use client'

import { useState, useRef, useEffect } from 'react'

/* ---------------------------------------------------------------------------
   Shared device-orientation source (touch devices).

   One window listener feeds every mounted ThreeDTilt. The neutral pose is a
   slowly-drifting baseline of how the phone is currently held, so tilting the
   device nudges the cards gently and they re-center on their own within a
   couple of seconds — deliberately subtle, never seasickness-inducing.

   iOS 13+ gates deviceorientation behind a permission that MUST be requested
   from a user gesture, so we ask once on the first touch. Android (and older
   iOS) just works without a prompt.
--------------------------------------------------------------------------- */
const GYRO_RANGE_DEG = 18 // device tilt (deg from baseline) that maps to full card tilt

const gyroSubs = new Set()
let gyroListening = false
let gyroRequested = false
let gyroBase = null
let gyroRaf = 0
let gyroTilt = { x: 0, y: 0 } // normalized -1..1

function onDeviceOrientation(e) {
  if (e.beta == null || e.gamma == null) return
  if (!gyroBase) gyroBase = { beta: e.beta, gamma: e.gamma }
  // Low-pass the baseline toward the current pose: a new holding angle
  // becomes the new neutral, so the offset is always a gentle delta.
  gyroBase.beta += (e.beta - gyroBase.beta) * 0.04
  gyroBase.gamma += (e.gamma - gyroBase.gamma) * 0.04
  const clamp = (v) => Math.max(-GYRO_RANGE_DEG, Math.min(GYRO_RANGE_DEG, v))
  gyroTilt = {
    x: clamp(e.beta - gyroBase.beta) / GYRO_RANGE_DEG,
    y: clamp(e.gamma - gyroBase.gamma) / GYRO_RANGE_DEG,
  }
  if (!gyroRaf) {
    gyroRaf = requestAnimationFrame(() => {
      gyroRaf = 0
      gyroSubs.forEach((fn) => fn(gyroTilt))
    })
  }
}

function startGyro() {
  if (gyroListening) return
  gyroListening = true
  window.addEventListener('deviceorientation', onDeviceOrientation)
}

function stopGyro() {
  if (!gyroListening) return
  gyroListening = false
  window.removeEventListener('deviceorientation', onDeviceOrientation)
  if (gyroRaf) {
    cancelAnimationFrame(gyroRaf)
    gyroRaf = 0
  }
  gyroBase = null
  // gyroRequested intentionally stays true — the iOS permission was already
  // granted/denied once; re-asking on the next mount would be noise.
}

function requestGyro() {
  if (gyroRequested) {
    // Permission flow already ran once this session — just (re)attach the
    // listener (no-op while it's still active). On iOS without permission
    // the listener simply receives no events.
    startGyro()
    return
  }
  gyroRequested = true
  const DOE = typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : null
  if (DOE && typeof DOE.requestPermission === 'function') {
    const ask = () => {
      DOE.requestPermission()
        .then((state) => { if (state === 'granted') startGyro() })
        .catch(() => {})
    }
    window.addEventListener('touchend', ask, { once: true, passive: true })
  } else {
    startGyro()
  }
}

function subscribeGyro(fn) {
  gyroSubs.add(fn)
  requestGyro()
  return () => {
    gyroSubs.delete(fn)
    // Last card gone (e.g. SPA nav off the invitation) → release the global
    // listener instead of leaking it for the rest of the session.
    if (gyroSubs.size === 0) stopGyro()
  }
}

/**
 * ThreeDTilt — Reusable component to apply dynamic 3D tilt effect.
 * Desktop: card follows the cursor on hover. Touch devices: card leans
 * gently with the device orientation (capped well below the hover max).
 * Automatically disables itself if prefers-reduced-motion is active.
 */
export default function ThreeDTilt({
  children,
  className = '',
  max = 10,
  perspective = 1000,
  scale = 1.03,
  style = {},
}) {
  const cardRef = useRef(null)
  const touchRef = useRef(false) // hover-less device → gyro owns the transform
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mql.matches)
    const onChange = (e) => setReduceMotion(e.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  // Gyro tilt on hover-less (touch) devices. Writes transform straight to the
  // DOM node — orientation fires ~60Hz and going through setState would
  // re-render every card on every reading.
  useEffect(() => {
    if (reduceMotion) return
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (!window.matchMedia('(hover: none)').matches) return
    touchRef.current = true
    const el = cardRef.current
    if (!el) return
    const gyroMax = Math.min(max, 6) // keep it gentle regardless of hover max
    el.style.transition = 'transform 0.3s ease-out'
    const unsub = subscribeGyro(({ x, y }) => {
      el.style.transform =
        `perspective(${perspective}px) rotateX(${(-x * gyroMax).toFixed(2)}deg) rotateY(${(y * gyroMax).toFixed(2)}deg)`
    })
    return () => {
      unsub()
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [reduceMotion, max, perspective])

  // Desktop hover: write the transform STRAIGHT to the DOM node (not through
  // React state). The old code called setState on every mousemove (~60-120Hz),
  // re-rendering the whole card + all its children each frame — that was the
  // hover "glitch". Direct style writes keep it buttery, mirroring the gyro
  // path above. React never owns `transform`, so re-renders never clobber it.
  const handleMouseMove = (e) => {
    if (reduceMotion || touchRef.current) return // taps emulate mousemove — let the gyro own it
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left // x position within the element
    const y = e.clientY - rect.top  // y position within the element

    const xc = rect.width / 2
    const yc = rect.height / 2

    // rotateX depends on Y coordinate, rotateY depends on X coordinate
    const angleX = ((yc - y) / yc) * max
    const angleY = ((x - xc) / xc) * max

    card.style.transition = 'transform 0.12s cubic-bezier(0.25, 1, 0.5, 1)'
    card.style.transform =
      `perspective(${perspective}px) rotateX(${angleX.toFixed(2)}deg) rotateY(${angleY.toFixed(2)}deg) scale(${scale})`
  }

  const handleMouseLeave = () => {
    if (reduceMotion || touchRef.current) return
    const card = cardRef.current
    if (!card) return
    card.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
    card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  )
}
