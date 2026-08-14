'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { adminSetAppearance } from './actions'
import { useFeedback } from '@/components/ui/FeedbackProvider'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
import { Button } from '@/components/ui/Button'
import ui from '@/components/ui/controls.module.css'
import { TEMPLATE_VIBES, type PaletteVibe } from '@/components/marketing/vibeData'
import { PreviewMock } from '@/components/marketing/PreviewMock'
import { templateOrnaments } from '@/lib/templates/appearance'
import {
  type OrnamentType,
  OrnamentPreviewScene,
  OrnamentPreviewStyle,
} from '@/components/appearance/OrnamentPreview'
import styles from './AppearanceDialog.module.css'

/**
 * "Tampilan" (appearance) dialog — an operator sets palette + ornament for
 * ANY invitation, at creation time or afterwards. Palette picker is driven by
 * `TEMPLATE_VIBES` (the SAME source the couple's own Palette tab and the
 * landing Vibe Explorer use) rendering the real `PreviewMock` card, and the
 * ornament picker renders the real `OrnamentPreviewScene` — never a
 * simplified lookalike. Section is omitted entirely when the template has no
 * ornament options (registry-driven, e.g. Solary).
 */
export default function AppearanceDialog({
  invitationId,
  slug,
  templateId,
  initialPalette,
  initialOrnamentType,
  onClose,
}: {
  invitationId: string
  slug: string
  templateId: string
  initialPalette?: string
  initialOrnamentType?: string
  onClose: () => void
}) {
  const router = useRouter()
  const fb = useFeedback()
  useEscapeToClose(onClose, true)

  const vibe = TEMPLATE_VIBES.find((v) => v.id === templateId) ?? TEMPLATE_VIBES[0]
  const palettes = vibe.palettes
  const ornaments = templateOrnaments(templateId)

  const [palette, setPalette] = useState<string>(
    palettes.some((p) => p.key === initialPalette) ? (initialPalette as string) : palettes[0].key,
  )
  const [ornamentType, setOrnamentType] = useState<string>(
    ornaments.some((o) => o.key === initialOrnamentType) ? (initialOrnamentType as string) : (ornaments[0]?.key ?? ''),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active: PaletteVibe = palettes.find((p) => p.key === palette) ?? palettes[0]
  // Softer accent for the back wing (the real ornaments use --accent-soft).
  const accentSoft = `color-mix(in srgb, ${active.accent} 55%, #ffffff)`

  async function onSave() {
    setSaving(true)
    setError(null)
    const res = await adminSetAppearance(invitationId, {
      palette,
      ...(ornaments.length > 0 ? { ornamentType } : {}),
    })
    setSaving(false)
    if (res.ok) {
      fb.ok('Tampilan disimpan')
      router.refresh()
      onClose()
      return
    }
    setError(res.error || 'Gagal menyimpan')
    fb.fail(res.error || 'Gagal menyimpan')
  }

  if (typeof document === 'undefined') return null

  const node = (
    <div
      className={styles.scrim}
      role="dialog"
      aria-modal="true"
      aria-label={`Tampilan — ${slug}`}
      onClick={() => { if (!saving) onClose() }}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <OrnamentPreviewStyle />
        <header className={styles.header}>
          <h2 className={styles.title}>Tampilan — {slug}</h2>
          <button type="button" onClick={onClose} disabled={saving} className={ui.iconBtn} aria-label="Tutup">×</button>
        </header>

        <section className={styles.section}>
          <span className={styles.sectionLabel}>Palet</span>
          <div className={styles.paletteGrid} role="radiogroup" aria-label="Palet">
            {palettes.map((p) => {
              const selected = p.key === palette
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPalette(p.key)}
                  className={`${styles.paletteBtn} ${selected ? styles.paletteBtnActive : ''}`}
                >
                  <span className={styles.swatch} style={{ background: p.accent }} />
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className={styles.previewWrap} style={{ background: active.background }}>
            <PreviewMock
              templateId={vibe.id}
              palette={active}
              eyebrow="UNDANGAN PERNIKAHAN"
              names="Nama & Nama"
              date="Sabtu, 1 Januari 2027"
            />
          </div>
        </section>

        {ornaments.length > 0 && (
          <section className={styles.section}>
            <span className={styles.sectionLabel}>Ornamen</span>
            <div
              className={styles.ornamentPreviewPanel}
              style={{ background: active.background, borderColor: active.surfaceBorder }}
            >
              <OrnamentPreviewScene
                type={ornamentType as OrnamentType}
                accent={active.accent}
                accentSoft={accentSoft}
                paletteKey={active.key}
              />
            </div>
            <div className={styles.ornamentGrid} role="radiogroup" aria-label="Ornamen">
              {ornaments.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={ornamentType === o.key}
                  onClick={() => setOrnamentType(o.key)}
                  className={`${styles.ornamentBtn} ${ornamentType === o.key ? styles.ornamentBtnActive : ''}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <footer className={styles.footer}>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={saving}>Batal</Button>
          <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </footer>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
