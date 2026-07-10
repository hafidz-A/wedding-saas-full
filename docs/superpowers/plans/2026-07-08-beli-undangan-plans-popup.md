# "Beli Undangan" plans popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the inline expanding plans panel behind the "Beli Undangan" button in `VibeExploration` into a centered, palette-themed modal popup styled like an AI-subscription pricing comparison (Basic vs Premium, the pricier plan badged "Paling populer", check-icon feature bullets), keeping the per-card guest-quota stepper.

**Architecture:** Presentation-only. A new `PlansModal` (portaled to `document.body` so it escapes the GSAP-pinned/transformed section) renders the existing `PlanDisplay[]` through a restyled `VibePlanCard`. No change to onboarding, checkout, the Xendit webhook, `plans.ts`, `quota.ts`, admin, or the database — the popup only links to `/onboarding?template=…&plan=…&extra=…` exactly as today.

**Tech Stack:** Next.js 14 (App Router), React 18.3.1, `motion` 12, CSS Modules + CSS variables, vitest. No new dependencies.

**Reference spec:** [docs/superpowers/specs/2026-07-08-beli-undangan-plans-popup-design.md](../specs/2026-07-08-beli-undangan-plans-popup-design.md)

## Global Constraints

- **Presentation-only.** Do NOT touch `src/app/onboarding/**`, `src/app/api/payment/**`, `src/lib/payments/{plans,quota,publish,template-plans}.ts`, `src/app/admin/**`, or any DB/migration. The money + plan path stays server-authoritative and unchanged.
- **No hardcoded plan data.** The modal renders whatever `PlanDisplay[]` it is given (name, price, `compareAtPrice`, `features`, `baseQuota`). All of it originates from admin-edited `template_plans`.
- **Preserve the buy link exactly:** `` `${buyHref}&plan=${plan.id}&extra=${extra}` `` where `plan.id` is the `plan_code` and `extra = total − baseQuota`.
- **Stepper floor = `plan.baseQuota`**, `step = BLOCK_SIZE`, `max = QUOTA_CAP`, live total via `quotaAddonAmount` — all from `@/lib/payments/quota` (unchanged constants).
- **Modal portals to `document.body`** (must not be a descendant of the transformed section). It is palette-themed from the active `palette` (Lovebirds coral / Solary purple).
- **Design tokens only** — snap radii/heights to `src/styles/tokens.css`; `npm run check:tokens` must pass. No Tailwind/UI libs.
- **i18n parity** — every new key exists in both `id` and `en` (`dict-parity` test).
- **No new npm dependencies.**

---

### Task 1: i18n keys (`popularBadge`, `plansSubtitle`)

**Files:**
- Modify: `src/lib/i18n/dictionaries/landing.ts` (the `vibeExploration` block in both `id` and `en`)
- Test: `src/lib/i18n/__tests__/dict-parity.test.ts` (existing — no edit, just run)

**Interfaces:**
- Produces: `t.popularBadge: string`, `t.plansSubtitle: string` on `Dict['landing']['vibeExploration']` (used by Tasks 4–5).

- [ ] **Step 1: Add the two keys to the `id` dictionary.** In `src/lib/i18n/dictionaries/landing.ts`, inside `id.vibeExploration`, immediately after the `buy: 'Beli Undangan',` line, add:

```ts
      popularBadge: 'Paling populer',
      plansSubtitle: 'Bayar sekali, undangan langsung aktif — tanpa langganan bulanan.',
```

- [ ] **Step 2: Add the same keys to the `en` dictionary.** Inside `en.vibeExploration`, immediately after `buy: 'Buy Invitation',`, add:

```ts
      popularBadge: 'Most popular',
      plansSubtitle: 'One-time payment — your invitation goes live, no monthly subscription.',
```

- [ ] **Step 3: Run the parity + type check.**

Run: `npm run test:unit -- dict-parity` then `npm run typecheck`
Expected: dict-parity PASS (id/en key paths identical); typecheck PASS.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/i18n/dictionaries/landing.ts
git commit -m "i18n(landing): add popularBadge + plansSubtitle for plans popup"
```

---

### Task 2: `pickFeaturedPlanId` helper (which plan gets the badge)

**Files:**
- Create: `src/components/marketing/pickFeaturedPlan.ts`
- Test: `src/components/marketing/__tests__/pickFeaturedPlan.test.ts`

**Interfaces:**
- Consumes: `PlanDisplay` from `@/lib/payments/plan-display`.
- Produces: `pickFeaturedPlanId(plans: PlanDisplay[]): string | null` (used by Task 4's `PlansModal`).

- [ ] **Step 1: Write the failing test.** Create `src/components/marketing/__tests__/pickFeaturedPlan.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pickFeaturedPlanId } from '../pickFeaturedPlan'
import type { PlanDisplay } from '@/lib/payments/plan-display'

const mk = (id: string, amountIDR: number): PlanDisplay => ({
  id, name: id, price: `Rp ${amountIDR}`, amountIDR,
  compareAtPrice: null, features: [], baseQuota: 200,
})

describe('pickFeaturedPlanId', () => {
  it('returns null for an empty list', () => {
    expect(pickFeaturedPlanId([])).toBeNull()
  })
  it('picks the highest-priced plan', () => {
    expect(pickFeaturedPlanId([mk('basic', 149000), mk('premium', 299000)])).toBe('premium')
  })
  it('is order-independent (highest wins even if listed first)', () => {
    expect(pickFeaturedPlanId([mk('premium', 299000), mk('basic', 149000)])).toBe('premium')
  })
  it('on a tie, picks the later plan in the list', () => {
    expect(pickFeaturedPlanId([mk('a', 100000), mk('b', 100000)])).toBe('b')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails.**

Run: `npm run test:unit -- pickFeaturedPlan`
Expected: FAIL — cannot resolve `../pickFeaturedPlan`.

- [ ] **Step 3: Implement the helper.** Create `src/components/marketing/pickFeaturedPlan.ts`:

```ts
import type { PlanDisplay } from '@/lib/payments/plan-display'

/**
 * The plan to highlight ("Paling populer") in the plans popup: the highest-priced
 * plan. Ties resolve to the LATER plan in the list (so Premium wins over an
 * equal-priced Basic listed before it). Returns null for an empty list so the
 * caller can render without a featured card.
 */
export function pickFeaturedPlanId(plans: PlanDisplay[]): string | null {
  if (plans.length === 0) return null
  let featured = plans[0]
  for (const p of plans) {
    if (p.amountIDR >= featured.amountIDR) featured = p
  }
  return featured.id
}
```

- [ ] **Step 4: Run the test to confirm it passes.**

Run: `npm run test:unit -- pickFeaturedPlan`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/components/marketing/pickFeaturedPlan.ts src/components/marketing/__tests__/pickFeaturedPlan.test.ts
git commit -m "feat(marketing): pickFeaturedPlanId helper for the plans popup badge"
```

---

### Task 3: Modal styles + restyled `VibePlanCard`

**Files:**
- Create: `src/components/marketing/PlansModal.module.css`
- Modify (rewrite): `src/components/marketing/VibePlanCard.tsx`

**Interfaces:**
- Consumes: `PlanDisplay`; `BLOCK_SIZE`, `QUOTA_CAP`, `quotaAddonAmount`, `snapQuotaToBlock`, `formatIDR` from `@/lib/payments/quota`.
- Produces: `VibePlanCard` now accepts `featured: boolean`, `popularLabel: string`, and an OPTIONAL `onQuotaChange?: () => void`. It reads its class names from the injected `styles` prop (supplied by `PlansModal` in Task 4). The card CSS classes live in `PlansModal.module.css`: `planCard`, `planCardFeatured`, `planBadge`, `planTop`, `planName`, `planPriceRow`, `planCompare`, `planPrice`, `planQuota`, `planQuotaRow`, `planStepper`, `planStepVal`, `planQuotaTotal`, `planFeatures`, `planFeatureItem`, `planCheck`, `planBtn` (plus modal-shell classes used by Task 4).

- [ ] **Step 1: Create `src/components/marketing/PlansModal.module.css`** with the full modal + card styles:

```css
/* ---------- Modal shell ---------- */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 32px);
  background: rgba(20, 14, 10, 0.55);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.dialog {
  width: 100%;
  max-width: 640px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border: 1px solid;
  border-radius: var(--radius-lg);
  box-shadow: 0 30px 80px rgba(20, 14, 10, 0.4);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(18px, 3vw, 24px);
  border-bottom: 1px solid;
}

.title {
  font-family: var(--font-heading);
  font-style: italic;
  font-weight: var(--weight-medium);
  font-size: clamp(22px, 3vw, 30px);
  line-height: var(--leading-tight);
  margin: 0;
}

.subtitle {
  font-family: var(--font-body);
  font-size: 13.5px;
  line-height: var(--leading-normal);
  margin: 4px 0 0;
}

.closeBtn {
  flex: 0 0 auto;
  width: var(--ctl-h-sm);
  height: var(--ctl-h-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 1px solid;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.body {
  overflow-y: auto;
  padding: clamp(18px, 3vw, 24px);
}

/* ---------- Plan grid ---------- */
.planGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(14px, 2vw, 20px);
  align-items: start;
}

@media (min-width: 620px) {
  .planGrid { grid-template-columns: 1fr 1fr; }
  .planGrid[data-single] {
    grid-template-columns: minmax(0, 360px);
    justify-content: center;
  }
}

/* ---------- Plan card ---------- */
.planCard {
  position: relative;
  border: 1.5px solid;
  border-radius: var(--radius-md);
  padding: clamp(18px, 2.4vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.planCardFeatured { border-width: 2px; }

.planBadge {
  position: absolute;
  top: -11px;
  left: 18px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: var(--weight-semibold);
  letter-spacing: 0.06em;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.planTop {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.planName {
  font-family: var(--font-heading);
  font-weight: var(--weight-semibold);
  font-size: 20px;
  line-height: 1;
}

.planPriceRow {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.planCompare {
  font-family: var(--font-body);
  font-size: 14px;
  text-decoration: line-through;
}
.planPrice {
  font-family: var(--font-heading);
  font-weight: var(--weight-bold);
  font-size: clamp(26px, 3.4vw, 32px);
  line-height: 1;
}

/* ---------- Quota stepper block ---------- */
.planQuota {
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.planQuotaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.planStepper {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.planStepVal {
  min-width: 40px;
  text-align: center;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: var(--weight-medium);
}
.planQuotaTotal {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: var(--weight-semibold);
  text-align: right;
}

/* ---------- Features ---------- */
.planFeatures {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-family: var(--font-body);
  font-size: 13.5px;
  line-height: var(--leading-normal);
}
.planFeatureItem {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}
.planCheck {
  flex: 0 0 auto;
  margin-top: 2px;
}

.planBtn {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--ctl-h);
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: var(--weight-semibold);
  letter-spacing: 0.02em;
  padding: 0 18px;
  line-height: 1;
  border-radius: var(--radius-pill);
}
```

- [ ] **Step 2: Rewrite `src/components/marketing/VibePlanCard.tsx`** to the AI-pricing card (keeps the stepper + buy-link wiring, adds `featured`/badge/check-bullets, makes `onQuotaChange` optional):

```tsx
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
            <button type="button" aria-label="Kurangi kuota tamu" onClick={() => step(-BLOCK_SIZE)} disabled={total <= base}
              style={stepBtn(palette.accent, total <= base)}>−</button>
            <span className={styles.planStepVal} style={{ color: palette.fg }}>{total}</span>
            <button type="button" aria-label="Tambah kuota tamu" onClick={() => step(BLOCK_SIZE)} disabled={total >= QUOTA_CAP}
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
    background: 'transparent', color: accent, fontSize: 16, lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  }
}
```

- [ ] **Step 3: Typecheck.** (`VibePlanCard` is not rendered anywhere until Task 4/5 — verify it compiles.)

Run: `npm run typecheck`
Expected: PASS. (Its former caller — the inline block in `VibeExploration` — is still passing the old props at this point, but the added props `featured`/`popularLabel` are required, so `VibeExploration` will now report a type error there. That is expected and gets fixed in Task 5; if you are running tasks strictly in order and want a green typecheck here, proceed to Task 4 then Task 5 before the next full typecheck — the commit below is still safe because it is code-complete for this unit.)

- [ ] **Step 4: Commit.**

```bash
git add src/components/marketing/PlansModal.module.css src/components/marketing/VibePlanCard.tsx
git commit -m "feat(marketing): AI-pricing plan card + modal styles (keeps quota stepper)"
```

---

### Task 4: `PlansModal` shell (portal, a11y, palette-themed)

**Files:**
- Create: `src/components/marketing/PlansModal.tsx`

**Interfaces:**
- Consumes: `PlanDisplay`; `VibePlanCard` (Task 3) with its new props; `pickFeaturedPlanId` (Task 2); `styles` from `PlansModal.module.css` (Task 3).
- Produces: `PlansModal` component. Props:
  `{ plans: PlanDisplay[]; buyHref: string; palette: { fg; fgMuted; accent; surface; surfaceBorder }; accentText: string; title: string; subtitle: string; closeLabel: string; chooseLabel: string; quotaLabel: string; popularLabel: string; onClose: () => void }`.

- [ ] **Step 1: Create `src/components/marketing/PlansModal.tsx`:**

```tsx
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
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
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

        <div className={styles.body}>
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
```

- [ ] **Step 2: Typecheck.**

Run: `npm run typecheck`
Expected: PASS for `PlansModal.tsx` itself. (`VibeExploration` may still show its pre-existing type error from Task 3 until Task 5 — that is the only remaining error.)

- [ ] **Step 3: Commit.**

```bash
git add src/components/marketing/PlansModal.tsx
git commit -m "feat(marketing): PlansModal shell (portal, esc/backdrop/scroll-lock, palette-themed)"
```

---

### Task 5: Wire `VibeExploration` to the modal + remove dead inline styles

**Files:**
- Modify: `src/components/marketing/VibeExploration.tsx`
- Modify: `src/components/marketing/VibeExploration.module.css`

**Interfaces:**
- Consumes: `PlansModal` (Task 4); existing `displayPlans`, `buyHref`, `palette`, `accentText`, and the i18n keys incl. `t.plansSubtitle` + `t.popularBadge` (Task 1).

- [ ] **Step 1: Swap the import.** In `VibeExploration.tsx`, replace the line
`import { VibePlanCard } from './VibePlanCard'`
with
`import { PlansModal } from './PlansModal'`.

- [ ] **Step 2: Drop `plansOpen` from the refresh dependency.** Change
`  }, [templateIndex, paletteIndex, plansOpen, category])`
to
`  }, [templateIndex, paletteIndex, category])`
(the modal is an overlay now — opening it no longer changes the pinned section's height).

- [ ] **Step 3: Make the "Beli Undangan" button open the modal.** Replace the whole `<button …>{t.buy}<span … caret>↓</span></button>` element with:

```tsx
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      style={{ background: palette.accent, color: accentText }}
                      aria-haspopup="dialog"
                      aria-expanded={plansOpen}
                      onClick={() => setPlansOpen(true)}
                    >
                      {t.buy}
                    </button>
```

- [ ] **Step 4: Delete the inline plans block.** Remove the entire block that starts with the `{/* Inline plans */}` comment and the `<AnimatePresence initial={false}>` wrapping the `motion.div className={styles.plans}` … through its closing `</AnimatePresence>` (the block that mapped `displayPlans` to `VibePlanCard`).

- [ ] **Step 5: Render the modal at the end of the section.** Immediately before the closing `</section>` tag (after the `</div>` that closes `className={styles.inner}`), insert:

```tsx
        {plansOpen && (
          <PlansModal
            plans={displayPlans}
            buyHref={buyHref}
            palette={palette}
            accentText={accentText}
            title={t.plansTitle}
            subtitle={t.plansSubtitle}
            closeLabel={t.closePlans}
            chooseLabel={t.choosePlan}
            quotaLabel={t.guestQuota}
            popularLabel={t.popularBadge}
            onClose={() => setPlansOpen(false)}
          />
        )}
```

- [ ] **Step 6: Remove the now-dead CSS** from `VibeExploration.module.css`. Delete these rule blocks (moved to `PlansModal.module.css` or no longer used): `.btnCaret`, `.btnCaretOpen`, `.plans`, `.plansTitle`, `.planGrid`, `.planCard`, `.planTop`, `.planName`, `.planPrice`, `.planFeatures`, `.planFeatures li`, `.planFeatures li::before`, `.planBtn`, and the `@media (min-width: 768px) { .planGrid { grid-template-columns: 1fr 1fr; } }` rule. Keep `.actions`, `.btnGhost`, `.btnPrimary`.

- [ ] **Step 7: Typecheck + lint.**

Run: `npm run typecheck && npm run lint`
Expected: PASS (no unused `VibePlanCard`/`ScrollTrigger`-in-deps warnings, no missing-prop errors).

- [ ] **Step 8: Commit.**

```bash
git add src/components/marketing/VibeExploration.tsx src/components/marketing/VibeExploration.module.css
git commit -m "feat(marketing): Beli Undangan opens plans popup (was inline panel)"
```

---

### Task 6: Verify in the browser + full checks

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server** (preview tooling) and open the landing page `/`. Scroll to the "Coba Vibe-nya" section.

- [ ] **Step 2: Open the popup.** Click "Beli Undangan". Confirm: a centered modal appears over a dimmed backdrop, titled "Pilih paket" with the subtitle; two cards (Basic + Premium); the higher-priced card shows the "Paling populer" badge, a 2px accent border, and a filled CTA; the other card has an outline CTA. Take a screenshot.

- [ ] **Step 3: Palette theming.** Switch the template to Solary (and/or change palette). Re-open the popup; confirm the modal surface/border/accent/CTA follow the active palette (purple for Solary, coral for Lovebirds).

- [ ] **Step 4: Close paths.** Verify the popup closes via the × button, a click on the dim backdrop, and the Esc key; after closing, focus returns to the "Beli Undangan" button and background scrolling is restored.

- [ ] **Step 5: Stepper math.** In a card: − is disabled at the base quota; each + adds 50 guests and increases the live total by Rp 10.000; the guest count line updates. Confirm "Pilih paket ini" links to `/onboarding?template=<id>&plan=<basic|premium>&extra=<n>` with the chosen extra (inspect the anchor href).

- [ ] **Step 6: Long / uneven features + mobile.** Temporarily (or against seeded data) confirm a plan with many features grows the card and the modal body scrolls without clipping, and Basic/Premium cards align at the top. Resize to mobile width and confirm the grid becomes a single column.

- [ ] **Step 7: Run the full non-visual gate.**

Run: `npm run check:tokens && npm run typecheck && npm run lint && npm run test:unit`
Expected: all PASS (token guardrail clean; dict-parity + `pickFeaturedPlan` green).

- [ ] **Step 8: Final commit** (only if Steps 1–7 surfaced fixes; otherwise nothing to commit).

```bash
git add -A
git commit -m "test(marketing): verify plans popup (palette, close paths, stepper, responsive)"
```

---

## Self-Review

**Spec coverage:**
- Popup replaces inline panel → Tasks 4–5. ✓
- Keep quota stepper (option 2) → Task 3 (`VibePlanCard` retains stepper + `plan.baseQuota` floor). ✓
- Presentation-only, admin/DB/Xendit untouched → Global Constraints + Task scope (no files under those paths). ✓
- Portal to body (escape GSAP transform) → Task 4 `createPortal`. ✓
- Palette-themed, featured = highest price → Task 2 helper + Task 3/4 wiring. ✓
- Variable-length / uneven features safe → `.planGrid { align-items: start }`, `.body { overflow-y: auto }`, per-card `flex-direction: column` + `.planBtn { margin-top: auto }` (Task 3); verified Task 6 Step 6. ✓
- Decouple pin refresh → Task 5 Step 2. ✓
- Reuse `plansTitle`/`choosePlan`/`guestQuota`/`closePlans`, add `popularBadge`/`plansSubtitle` → Task 1 + Task 5 Step 5. ✓
- compare-at strikethrough preserved → Task 3 (`plan.compareAtPrice`). ✓
- Buy link `&plan=${plan.id}&extra=${extra}` preserved → Task 3. ✓
- Tokens + `check:tokens` → Task 3 CSS uses tokens; Task 6 Step 7. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `PlansModal` prop names match Task 5's call site (`title/subtitle/closeLabel/chooseLabel/quotaLabel/popularLabel/plans/buyHref/palette/accentText/onClose`); `VibePlanCard` new props (`featured`, `popularLabel`, optional `onQuotaChange`) match `PlansModal`'s usage; `pickFeaturedPlanId` signature matches Task 4 import. ✓

**Note on Task 3 typecheck:** the only transient type error between Task 3 and Task 5 is `VibeExploration` still passing old `VibePlanCard` props; resolved in Task 5 when that call site is deleted. Acceptable within task-by-task execution.
