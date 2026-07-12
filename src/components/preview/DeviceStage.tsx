'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DevicePreset } from '@/lib/preview/devicePresets'
import styles from './DeviceStage.module.css'

/**
 * Renders the live invitation inside a device bezel (phone/tablet) for the
 * demo "inspect" preview. The invitation is loaded in an <iframe> of the SAME
 * page + `?embed=1` so its GSAP/ScrollTrigger/Lenis scroll behaviour runs
 * natively at the device's real viewport width (scaling a pinned cinematic
 * page inline would break the scroll). The themed backdrop (palette colour +
 * ornaments) is rendered by the caller behind this fixed, transparent stage.
 *
 * FAITHFUL VIEWPORT: the iframe is sized to the device's REAL logical pixels
 * (`device.w × device.h`) and the whole bezel is then CSS-`scale()`d to fit
 * the host window. This is the key to a correct preview — the invitation's own
 * `@media`/`matchMedia` breakpoints resolve against the DEVICE viewport (375px
 * for an iPhone X), NOT the host browser. The previous approach derived the
 * iframe width from the host window height (`min(86vh,920px)` + aspect-ratio),
 * so the framed template silently "followed the real device": it rendered at
 * ~407px and shifted on every host resize/zoom. Rendering at true px + scaling
 * keeps the framed layout stable and accurate regardless of the outer window.
 *
 * `payload` is the template's current theme state (lovebirds: {theme,ornament};
 * solary: {palette}); it's pushed into the iframe via postMessage so switching
 * palette re-themes the framed invitation live, without reloading the iframe.
 */

/** Bezel thickness (px) around the screen — mirrors the `.device` / `.tablet`
 *  padding in DeviceStage.module.css so the scale math and the rendered frame
 *  agree on the device's outer size. */
const BEZEL: Record<DevicePreset['kind'], number> = { phone: 9, tablet: 14, desktop: 9 }

/**
 * Largest scale at which a device of outer size `outerW × outerH` (bezel
 * included) still fits the stage: at most 86vh tall / 92vw wide (mirrors the
 * old `min(86vh, 920px)` height ceiling). Devices smaller than the stage scale
 * UP (a faithful 375px layout, zoomed) — exactly like a real phone held close.
 */
function fitScale(outerW: number, outerH: number): number {
  if (typeof window === 'undefined') return 1
  const availH = Math.min(window.innerHeight * 0.86, 920)
  const availW = window.innerWidth * 0.92
  return Math.max(0.1, Math.min(availH / outerH, availW / outerW))
}

export function DeviceStage({
  device,
  payload,
}: {
  device: DevicePreset
  payload: Record<string, unknown>
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const payloadRef = useRef(payload)
  payloadRef.current = payload

  // Foldables expose a Fold/Unfold toggle: folded = the cover screen (device.w/h),
  // unfolded = the wider inner display (device.unfolded). The inner screen is a
  // mini-tablet, so it rotates too.
  const [unfolded, setUnfolded] = useState(false)
  const foldable = !!device.unfolded
  const baseW = foldable && unfolded ? device.unfolded!.w : device.w
  const baseH = foldable && unfolded ? device.unfolded!.h : device.h

  // Tablets can rotate (people hold iPads both ways), as does an unfolded fold;
  // ordinary phones stay portrait. Rotating swaps the SCREEN dimensions, so the
  // iframe viewport is the real landscape logical px (1180×820 for iPad Air) and
  // the inner page reflows through its own breakpoints — same faithful-viewport
  // rule as portrait.
  const [landscape, setLandscape] = useState(false)
  const rotatable = device.kind === 'tablet' || (foldable && unfolded)
  const isLandscape = rotatable && landscape
  const scrW = isLandscape ? baseH : baseW
  const scrH = isLandscape ? baseW : baseH

  // In landscape the camera cutout follows the rotation to the (physical top =)
  // left edge, instead of staying pinned to the visual top.
  const cutout = (base: string) => (isLandscape ? `${base} ${styles.landscape}` : base)

  const bezel = BEZEL[device.kind]
  const outerW = scrW + bezel * 2
  const outerH = scrH + bezel * 2

  // Fit-to-window scale for the true-pixel device. Recomputed on host resize
  // (zoom counts as a resize) so the bezel keeps filling the stage — but the
  // iframe's INTERNAL viewport stays a constant device.w, so the framed
  // invitation never reflows when the outer window changes.
  const [scale, setScale] = useState(() => fitScale(outerW, outerH))
  useEffect(() => {
    const recompute = () => setScale(fitScale(outerW, outerH))
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [outerW, outerH])

  // Stable src (computed once) so changing device/theme never reloads the iframe.
  const src = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const u = new URL(window.location.href)
    u.searchParams.set('embed', '1')
    return u.pathname + u.search
  }, [])

  const key = JSON.stringify(payload)
  useEffect(() => {
    const origin = window.location.origin
    const post = () =>
      iframeRef.current?.contentWindow?.postMessage(
        { source: 'fincards-preview', kind: 'theme', payload: payloadRef.current },
        origin,
      )
    post()
    // The embedded page announces "ready" once mounted → push current theme.
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source === 'fincards-preview' && e.data?.kind === 'ready') post()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [key])

  return (
    <div className={styles.stage}>
      {/* Reserves the SCALED footprint so flex-centering + the caption sit
          correctly (transform doesn't change layout size). */}
      <div className={styles.scaler} style={{ width: outerW * scale, height: outerH * scale }}>
        <div
          className={`${styles.device} ${styles[device.kind]}`}
          style={{ width: outerW, height: outerH, transform: `scale(${scale})` }}
        >
          {device.notch === 'island' && <span className={cutout(styles.island)} aria-hidden="true" />}
          {device.notch === 'notch' && <span className={cutout(styles.notch)} aria-hidden="true" />}
          {device.notch === 'punch' && <span className={cutout(styles.punch)} aria-hidden="true" />}
          <div className={styles.screen} style={{ width: scrW, height: scrH }}>
            <iframe ref={iframeRef} className={styles.frame} src={src} title={`Preview ${device.label}`} />
          </div>
        </div>
      </div>
      <span className={styles.dims}>
        <span className={styles.dimsText}>
          {device.label} · {scrW} × {scrH}
        </span>
        {foldable && (
          <button
            type="button"
            className={styles.rotateBtn}
            onClick={() => {
              setUnfolded((v) => !v)
              setLandscape(false) // folded cover screen is portrait-only
            }}
            aria-pressed={unfolded}
            title={unfolded ? 'Lipat (layar depan)' : 'Buka (layar dalam)'}
          >
            {unfolded ? '❏ Lipat' : '⛶ Buka'}
          </button>
        )}
        {rotatable && (
          <button
            type="button"
            className={styles.rotateBtn}
            onClick={() => setLandscape((v) => !v)}
            aria-pressed={landscape}
            title={landscape ? 'Putar ke portrait' : 'Putar ke landscape'}
          >
            ⟳ Rotate
          </button>
        )}
      </span>
    </div>
  )
}

export default DeviceStage
