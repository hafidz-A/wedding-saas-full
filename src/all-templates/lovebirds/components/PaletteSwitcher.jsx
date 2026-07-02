'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from './ThemeProvider.jsx'
import { THEME_META, THEME_GROUPS } from '../config/applyTheme.js'
import { DEVICE_PRESETS } from '@/lib/preview/devicePresets'
import styles from './PaletteSwitcher.module.css'

/**
 * Floating theme picker — rendered only in demo/preview (allowGuestSwitch).
 * Lists every lovebirds theme grouped Light / Dark; selecting one re-themes the
 * whole card live via ThemeProvider.setTheme.
 */
const ORNAMENTS = [
  { key: 'birds', label: 'Burung', emoji: '🐦' },
  { key: 'butterflies', label: 'Kupu', emoji: '🦋' },
  { key: 'perched', label: 'Bertengger', emoji: '🪵' },
]

export default function PaletteSwitcher({ hideDevices = false }) {
  const { theme, setTheme, ornamentType, setOrnamentType, device, setDevice } = useTheme()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        toggleRef.current && !toggleRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const Group = ({ title, keys }) => (
    <>
      <div className={styles.groupTitle}>{title}</div>
      <div className={styles.buttons}>
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.swatchBtn} ${theme === key ? styles.active : ''}`}
            onClick={() => setTheme(key)}
            aria-pressed={theme === key}
          >
            <span className={styles.dot} style={{ background: THEME_META[key].swatch }} />
            {THEME_META[key].label}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <>
      <button
        ref={toggleRef}
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-label="Pilih tema"
        title="Pilih tema"
      >🎨</button>

      {open && (
        <div ref={panelRef} className={styles.panel} role="radiogroup" aria-label="Pilih tema" data-lenis-prevent>
          <div className={styles.header}>
            <span>Pilih Tema</span>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Tutup">&times;</button>
          </div>
          <Group title="Terang" keys={THEME_GROUPS.light} />
          <Group title="Gelap" keys={THEME_GROUPS.dark} />

          <div className={styles.divider} />
          <div className={styles.groupTitle}>Ornamen</div>
          <div className={styles.ornamentRow}>
            {ORNAMENTS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`${styles.ornamentBtn} ${ornamentType === o.key ? styles.active : ''}`}
                onClick={() => setOrnamentType(o.key)}
                aria-pressed={ornamentType === o.key}
              >
                <span className={styles.emoji}>{o.emoji}</span>
                {o.label}
              </button>
            ))}
          </div>

          {/* Hidden inside the phone-frame embed: picking a device there would
              nest a frame inside the frame with no effect. */}
          {!hideDevices && (
            <>
              <div className={styles.divider} />
              <div className={styles.groupTitle}>Tampilan</div>
              <div className={styles.deviceRow}>
                {DEVICE_PRESETS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`${styles.deviceBtn} ${device === d.id ? styles.active : ''}`}
                    onClick={() => setDevice(d.id)}
                    aria-pressed={device === d.id}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
