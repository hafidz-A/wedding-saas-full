'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import type { PlanDisplay } from '@/lib/payments/plan-display'
import { VibePlanCard } from './VibePlanCard'
import { pickFeaturedPlanId } from './pickFeaturedPlan'
import styles from './PlansModal.module.css'

interface Palette { fg: string; fgMuted: string; accent: string; surface: string; surfaceBorder: string }

export function PlansModal({
  plans, buyHref, palette, accentText,
  title, subtitle, closeLabel, chooseLabel, quotaLabel, popularLabel,
  onClose,
}: {
  plans: PlanDisplay[]
  buyHref: string
  palette: Palette
  accentText: string
  title: string
  subtitle: string
  closeLabel: string
  chooseLabel: string
  quotaLabel: string
  popularLabel: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Esc closes, background scroll locks, focus moves into the dialog on open and
  // returns to the trigger on close.
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // The marketing page runs Lenis smooth-scroll, which hijacks wheel/touch at
    // the window level — `body { overflow: hidden }` alone won't stop it, so a
    // wheel over the modal would scroll the page behind. Pause Lenis while open
    // (and `data-lenis-prevent` on the scroll area below lets the dialog scroll
    // natively). No-op on pages without Lenis (reduced-motion / non-marketing).
    const lenis = (window as { __lenis?: { stop?: () => void; start?: () => void } }).__lenis
    lenis?.stop?.()
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      lenis?.start?.()
      prevActive?.focus?.()
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const featuredId = pickFeaturedPlanId(plans)
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const node = (
    <motion.div
      className={styles.overlay}
      onClick={onClose}
      data-lenis-prevent
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ background: palette.surface, borderColor: palette.surfaceBorder }}
        initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className={styles.header} style={{ borderColor: palette.surfaceBorder }}>
          <div>
            <h2 className={styles.title} style={{ color: palette.fg }}>{title}</h2>
            <p className={styles.subtitle} style={{ color: palette.fgMuted }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel}
            className={styles.closeBtn} style={{ color: palette.fgMuted, borderColor: palette.surfaceBorder }}>
            ×
          </button>
        </header>

        <div className={styles.body} data-lenis-prevent>
          <div className={styles.planGrid} {...(plans.length === 1 ? { 'data-single': '' } : {})}>
            {plans.map((pl) => (
              <VibePlanCard
                key={pl.id}
                plan={pl}
                buyHref={buyHref}
                chooseLabel={chooseLabel}
                quotaLabel={quotaLabel}
                popularLabel={popularLabel}
                featured={pl.id === featuredId}
                accentText={accentText}
                palette={palette}
                styles={styles}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  return createPortal(node, document.body)
}
