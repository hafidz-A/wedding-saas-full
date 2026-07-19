// src/components/marketing/VibePlanCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PlanDisplay } from '@/lib/payments/plan-display'
import { snapQuotaToBlock, quotaAddonAmount, BLOCK_SIZE, QUOTA_CAP, formatIDR } from '@/lib/payments/quota'

interface Palette { fg: string; fgMuted: string; accent: string; surface: string; surfaceBorder: string }

export function VibePlanCard({
  plan, buyHref, chooseLabel, quotaLabel, popularLabel, featured,
  accentText, palette, styles, onQuotaChange,
}: {
  plan: PlanDisplay
  buyHref: string
  chooseLabel: string
  quotaLabel: string
  popularLabel: string
  featured: boolean
  accentText: string
  palette: Palette
  styles: Record<string, string>
  onQuotaChange?: () => void
}) {
  const base = plan.baseQuota
  const [total, setTotal] = useState(base)
  const extra = Math.max(0, total - base)
  const liveTotal = plan.amountIDR + quotaAddonAmount(extra)

  const step = (delta: number) => {
    setTotal(snapQuotaToBlock(total + delta, base, QUOTA_CAP))
    onQuotaChange?.()
  }

  return (
    <div
      className={`${styles.planCard} ${featured ? styles.planCardFeatured : ''}`}
      style={{ borderColor: featured ? palette.accent : palette.surfaceBorder, background: palette.surface }}
    >
      {featured && (
        <span className={styles.planBadge} style={{ background: palette.accent, color: accentText }}>
          {popularLabel}
        </span>
      )}

      <div className={styles.planTop}>
        <span className={styles.planName} style={{ color: palette.fg }}>{plan.name}</span>
      </div>

      <div className={styles.planPriceRow}>
        {plan.compareAtPrice && (
          <span className={styles.planCompare} style={{ color: palette.fgMuted }}>{plan.compareAtPrice}</span>
        )}
        <span className={styles.planPrice} style={{ color: palette.fg }}>{plan.price}</span>
      </div>

      <div className={styles.planQuota} style={{ borderColor: palette.surfaceBorder }}>
        <div className={styles.planQuotaRow}>
          <span style={{ fontSize: 12.5, color: palette.fgMuted }}>{quotaLabel.replace('{n}', String(total))}</span>
          <div className={styles.planStepper}>
            <button type="button" aria-label="Kurangi kuota tamu" className={styles.planStepBtn} onClick={() => step(-BLOCK_SIZE)} disabled={total <= base}
              style={stepBtn(palette.accent, total <= base)}>−</button>
            <span className={styles.planStepVal} style={{ color: palette.fg }}>{total}</span>
            <button type="button" aria-label="Tambah kuota tamu" className={styles.planStepBtn} onClick={() => step(BLOCK_SIZE)} disabled={total >= QUOTA_CAP}
              style={stepBtn(palette.accent, total >= QUOTA_CAP)}>+</button>
          </div>
        </div>
        <span className={styles.planQuotaTotal} style={{ color: palette.fg }}>{formatIDR(liveTotal)}</span>
      </div>

      <ul className={styles.planFeatures} style={{ color: palette.fgMuted }}>
        {plan.features.map((f) => (
          <li key={f} className={styles.planFeatureItem}>
            <svg className={styles.planCheck} viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" style={{ color: palette.accent }}>
              <path d="M4.5 10.5l3.2 3.2 7.8-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`${buyHref}&plan=${plan.id}&extra=${extra}`}
        className={styles.planBtn}
        style={featured
          ? { background: palette.accent, color: accentText }
          : { background: 'transparent', color: palette.accent, border: `1.5px solid ${palette.accent}` }}
      >
        {chooseLabel}
      </Link>
    </div>
  )
}

function stepBtn(accent: string, disabled: boolean): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: `1px solid ${accent}`,
    color: accent, fontSize: 16, lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  }
}
