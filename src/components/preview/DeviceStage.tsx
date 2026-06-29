'use client'

import { useEffect, useMemo, useRef } from 'react'
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
 * `payload` is the template's current theme state (lovebirds: {theme,ornament};
 * solary: {palette}); it's pushed into the iframe via postMessage so switching
 * palette re-themes the framed invitation live, without reloading the iframe.
 */
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
      <div
        className={`${styles.device} ${styles[device.kind]}`}
        style={{ ['--ar' as string]: `${device.w} / ${device.h}` }}
      >
        {device.notch === 'island' && <span className={styles.island} aria-hidden="true" />}
        {device.notch === 'notch' && <span className={styles.notch} aria-hidden="true" />}
        {device.notch === 'punch' && <span className={styles.punch} aria-hidden="true" />}
        <div className={styles.screen}>
          <iframe ref={iframeRef} className={styles.frame} src={src} title={`Preview ${device.label}`} />
        </div>
      </div>
      <span className={styles.dims}>
        {device.label} · {device.w} × {device.h}
      </span>
    </div>
  )
}

export default DeviceStage
