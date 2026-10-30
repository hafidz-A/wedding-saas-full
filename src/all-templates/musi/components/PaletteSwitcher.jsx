'use client'

/* Demo-only 🎨 switcher: try the four palettes and, on a big screen, preview
   the invitation inside a phone/tablet bezel (DeviceStage). Same contract as
   the Lovebirds/Solary switchers — the toggle carries data-palette-toggle so
   the shared PaletteHint coach mark can find it. Styles: .mu-sw-* in
   styles/musi.css (rendered outside .mu, so no .mu-scoped vars). */
import React, { useEffect, useRef, useState } from 'react'

import { MUSI_PALETTES, MUSI_PALETTE_ORDER } from '../config/palettes.js'
import { DEVICE_PRESETS } from '@/lib/preview/devicePresets'
import { PaletteHint } from '@/components/preview/PaletteHint'

export default function PaletteSwitcher({ palette, onPalette, device, onDevice, hideDevices = false }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || toggleRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={toggleRef}
        className="mu-sw-toggle"
        type="button"
        data-palette-toggle
        aria-expanded={open}
        aria-label="Pilih palet warna"
        title="Pilih Palet"
        onClick={() => setOpen((v) => !v)}
      >
        🎨
      </button>
      <PaletteHint />

      {open && (
        <div ref={panelRef} className="mu-sw-panel" role="dialog" aria-label="Pilih palet warna">
          <div className="mu-sw-head">
            <span>Pilih Palet</span>
            <button className="mu-sw-close" type="button" aria-label="Tutup" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="mu-sw-grid">
            {MUSI_PALETTE_ORDER.map((key) => {
              const p = MUSI_PALETTES[key]
              return (
                <button
                  key={key}
                  className="mu-sw-option"
                  type="button"
                  aria-pressed={palette === key}
                  onClick={() => onPalette(key)}
                >
                  <span className="mu-sw-dot" style={{ background: p.preview.background }} aria-hidden="true">
                    <i style={{ background: p.gold }} />
                  </span>
                  {p.label}
                </button>
              )
            })}
          </div>
          {/* Hidden inside a frame (phone-frame or device preview): a device
              picker there would nest a frame inside the frame. */}
          {!hideDevices && (
            <>
              <div className="mu-sw-sub">Tampilan</div>
              <div className="mu-sw-devices">
                {DEVICE_PRESETS.map((d) => (
                  <button
                    key={d.id}
                    className="mu-sw-device"
                    type="button"
                    aria-pressed={device === d.id}
                    onClick={() => onDevice(d.id)}
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
