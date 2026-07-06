// src/components/marketing/VibePlanCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PlanDisplay } from '@/lib/payments/plan-display'
import { snapQuotaToBlock, quotaAddonAmount, BLOCK_SIZE, QUOTA_CAP, formatIDR } from '@/lib/payments/quota'

interface Palette { fg: string; fgMuted: string; accent: string; surface: string; surfaceBorder: string }

export function VibePlanCard({
  plan, buyHref, chooseLabel, quotaLabel, accentText, palette, styles, onQuotaChange,
}: {
  plan: PlanDisplay
  buyHref: string
  chooseLabel: string
  quotaLabel: string
  accentText: string
  palette: Palette
  styles: Record<string, string>
  onQuotaChange: () => void
}) {
  const base = plan.baseQuota
  const [total, setTotal] = useState(base)
  const extra = Math.max(0, total - base)
  const liveTotal = plan.amountIDR + quotaAddonAmount(extra)

  const step = (delta: number) => {
    setTotal(snapQuotaToBlock(total + delta, base, QUOTA_CAP))
    onQuotaChange()
  }

  return (
    <div className={styles.planCard} style={{ borderColor: palette.surfaceBorder, background: palette.surface }}>
      <div className={styles.planTop}>
        <span className={styles.planName} style={{ color: palette.fg }}>{plan.name}</span>
        <span className={styles.planPrice} style={{ color: palette.accent }}>
          {plan.compareAtPrice && (
            <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: 6, color: palette.fgMuted }}>{plan.compareAtPrice}</span>
          )}
          {plan.price}
        </span>
      </div>

      <span style={{ fontSize: 12, color: palette.fgMuted }}>{quotaLabel.replace('{n}', String(total))}</span>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
        <button type="button" aria-label="Kurangi kuota" onClick={() => step(-BLOCK_SIZE)} disabled={total <= base}
          style={stepBtn(palette.accent, total <= base)}>−</button>
        <span style={{ minWidth: 44, textAlign: 'center', fontSize: 13, color: palette.fg }}>{total}</span>
        <button type="button" aria-label="Tambah kuota" onClick={() => step(BLOCK_SIZE)} disabled={total >= QUOTA_CAP}
          style={stepBtn(palette.accent, total >= QUOTA_CAP)}>+</button>
        <span style={{ fontSize: 13, color: palette.fg, marginLeft: 4 }}>{formatIDR(liveTotal)}</span>
      </div>

      <ul className={styles.planFeatures} style={{ color: palette.fgMuted }}>
        {plan.features.map((f) => <li key={f}>{f}</li>)}
      </ul>

      <Link href={`${buyHref}&plan=${plan.id}&extra=${extra}`} className={styles.planBtn} style={{ background: palette.accent, color: accentText }}>
        {chooseLabel}
      </Link>
    </div>
  )
}

function stepBtn(accent: string, disabled: boolean): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: `1px solid ${accent}`,
    background: 'transparent', color: accent, fontSize: 16, lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  }
}
