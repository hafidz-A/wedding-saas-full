'use client'

import type { ReactNode } from 'react'
import styles from './DeviceFrame.module.css'

/**
 * Inspect-style device shell for the marketing live-preview. Wraps the themed
 * PreviewMock in a phone / tablet / desktop bezel so visitors can picture the
 * invitation on the device they care about. Pure CSS sizing (aspect-ratio +
 * capped max-width) — responsive, no runtime measuring.
 */
export type DeviceKind = 'desktop' | 'tablet' | 'phone'

export type DevicePreset = {
  id: string
  label: string
  kind: DeviceKind
  /** Real device logical px — drives aspect-ratio and the dimensions caption. */
  w: number
  h: number
  /** Cap on the rendered frame width (px); it still shrinks to fit narrow columns. */
  maxW: number
  notch?: 'island' | 'notch' | 'punch'
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'desktop',  label: 'Desktop',       kind: 'desktop', w: 1440, h: 900, maxW: 560 },
  { id: 'ipad',     label: 'iPad Air',      kind: 'tablet',  w: 820,  h: 1180, maxW: 330 },
  { id: 'iphone14', label: 'iPhone 14 Pro', kind: 'phone',   w: 393,  h: 852, maxW: 250, notch: 'island' },
  { id: 'iphonese', label: 'iPhone SE',     kind: 'phone',   w: 375,  h: 667, maxW: 244 },
  { id: 'iphonex',  label: 'iPhone X',      kind: 'phone',   w: 375,  h: 812, maxW: 246, notch: 'notch' },
  { id: 'galaxy',   label: 'Galaxy Note',   kind: 'phone',   w: 412,  h: 883, maxW: 248, notch: 'punch' },
]

export function DeviceFrame({
  device,
  bezel,
  children,
}: {
  device: DevicePreset
  /** Bezel colour, themed by the active palette (dark frame on light bg, etc.). */
  bezel: string
  children: ReactNode
}) {
  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.device} ${styles[device.kind]}`}
        style={{
          aspectRatio: `${device.w} / ${device.h}`,
          maxWidth: device.maxW,
          ['--bezel' as string]: bezel,
        }}
      >
        {device.kind === 'desktop' && (
          <div className={styles.browserBar} aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.urlBar} />
          </div>
        )}
        {device.notch === 'island' && <span className={styles.island} aria-hidden="true" />}
        {device.notch === 'notch' && <span className={styles.notch} aria-hidden="true" />}
        {device.notch === 'punch' && <span className={styles.punch} aria-hidden="true" />}
        <div className={styles.screen}>{children}</div>
      </div>
    </div>
  )
}

export default DeviceFrame
