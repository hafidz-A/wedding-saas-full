'use client'

import React, { useState } from 'react'
import { PALETTES, ORNAMENTS } from '../config/theme.js'
import styles from './DemoSwitcher.module.css'

/** Demo-only 🎨 panel: lets a visitor try every palette + ornament live. */
export default function DemoSwitcher({ palette, ornament, onPalette, onOrnament }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.wrap}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Coba tampilan">
          <div className={styles.group}>
            <span className={styles.label}>Palet</span>
            <div className={styles.options}>
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={styles.option}
                  aria-pressed={palette === p.key}
                  onClick={() => onPalette(p.key)}
                >
                  <span
                    className={styles.swatch}
                    style={{ background: `linear-gradient(135deg, ${p.swatch[0]} 50%, ${p.swatch[1]} 50%)` }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.label}>Ornamen</span>
            <div className={styles.options}>
              {[...ORNAMENTS, { key: 'none', label: 'Tanpa ornamen' }].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={styles.option}
                  aria-pressed={ornament === o.key}
                  onClick={() => onOrnament(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-label="Coba palet dan ornamen"
        onClick={() => setOpen((v) => !v)}
      >
        🎨
      </button>
    </div>
  )
}
