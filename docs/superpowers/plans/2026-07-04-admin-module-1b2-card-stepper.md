# Admin Module 1 (Plan B2) — Per-card quota stepper + onboarding wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** On each marketing plan card, add a **guest-quota stepper** (`−  N  +`, buttons-only) that shows a live total (plan price + add-on) and carries the chosen extra into onboarding via `?extra=`; and make **onboarding** floor the quota on the DB base (not the client constant), read the incoming `extra`, and show a running total.

**Architecture:** Extract the (Plan B1) inline plan-card markup into a small client `VibePlanCard` component that owns its own quota state (buttons-only so it can't fight the GSAP scroll-pin) and builds the buy link with `&extra=`; `VibeExploration` maps `displayPlans` to `<VibePlanCard>` and refreshes `ScrollTrigger` when a card's quota changes (its height changes). Onboarding's server page passes the DB base + price for the chosen plan; the form floors on it and pre-fills from `?extra=`.

**Tech Stack:** Next.js 14.2, TypeScript, Vitest. Spec: `docs/superpowers/specs/2026-07-03-pricing-source-unify-editor-design.md` (WS4). Quota math is the client-safe `@/lib/payments/quota` (`snapQuotaToBlock`, `quotaAddonAmount`, `BLOCK_SIZE`, `QUOTA_CAP`, `clampQuotaExtra`, `formatIDR`).

## Global Constraints

- Marketing stepper is **buttons-only** (readonly number display) — no free typing — so it never grabs focus mid-scroll while the vibe section is GSAP-pinned. `min = plan.baseQuota`, step `BLOCK_SIZE` (50), `max = QUOTA_CAP` (5000), snapped via `snapQuotaToBlock`.
- The buy link becomes `` `${buyHref}&plan=${plan.id}&extra=${extra}` `` where `extra = currentTotal − baseQuota` (a multiple of 50, ≥ 0). Do not change `buyHref` itself.
- Keep VibeExploration's GSAP/animation code intact; when a card's quota changes, call `ScrollTrigger.refresh()` (the section height changed).
- Onboarding: floor on the **DB base** for the chosen plan (fall back to `DEFAULT_BASE_QUOTA[plan] ?? 200` when absent); `completeOnboarding` already accepts `guestQuotaExtra` — unchanged.
- Indonesian UI. Match repo style (2-space indent, single quotes, no semicolons).

## File Structure
- Create `src/components/marketing/VibePlanCard.tsx` — one plan card + stepper.
- Modify `src/components/marketing/VibeExploration.tsx` — map `displayPlans` to `<VibePlanCard>`; refresh ScrollTrigger on quota change.
- Modify `src/app/onboarding/page.tsx` — pass the chosen plan's DB base + price.
- Modify `src/app/onboarding/OnboardingForm.tsx` — DB-base floor, read `?extra=`, running total.

---

### Task 1: `VibePlanCard` + wire into `VibeExploration`

**Files:**
- Create: `src/components/marketing/VibePlanCard.tsx`
- Modify: `src/components/marketing/VibeExploration.tsx`

**Interfaces:**
- Consumes: `PlanDisplay` (`@/lib/payments/plan-display`), `snapQuotaToBlock`/`quotaAddonAmount`/`BLOCK_SIZE`/`QUOTA_CAP`/`formatIDR` (`@/lib/payments/quota`).

- [ ] **Step 1: Create `VibePlanCard.tsx` (exact content)**

```tsx
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
  quotaLabel: string        // t.guestQuota, contains "{n}"
  accentText: string
  palette: Palette
  styles: Record<string, string>
  onQuotaChange: () => void
}) {
  const base = plan.baseQuota
  const [total, setTotal] = useState(base) // effective quota (base..cap)
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
```

- [ ] **Step 2: Wire into `VibeExploration.tsx`**

Read the file. The Plan B1 change made the inline plan-card block map `displayPlans.map((pl) => (<div className={styles.planCard}...> ... </div>))`. Replace that whole inner `<div className={styles.planCard}>…</div>` return with:

```tsx
<VibePlanCard
  key={pl.id}
  plan={pl}
  buyHref={buyHref}
  chooseLabel={t.choosePlan}
  quotaLabel={t.guestQuota}
  accentText={accentText}
  palette={palette}
  styles={styles}
  onQuotaChange={() => { setTimeout(() => ScrollTrigger.refresh(), 60) }}
/>
```

Add the import: `import { VibePlanCard } from './VibePlanCard'`. `ScrollTrigger` is already imported in this file (used by the pin effect); if the map is not in scope of `ScrollTrigger`, confirm the existing import at the top (`import { ScrollTrigger } from 'gsap/ScrollTrigger'`) is present — it is. `accentText`, `palette`, `styles`, `buyHref`, `t` are already in scope where the plans are mapped.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → no new errors. With the dev server, open the homepage `#vibe` → "Beli Undangan" → each card shows the `− N +` stepper; clicking `+` raises the number by 50 and the price rises by Rp 10.000; the "Pilih paket ini" link's URL includes `&extra=` matching (number − base).

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/VibePlanCard.tsx src/components/marketing/VibeExploration.tsx
git commit -m "feat(pricing): per-card guest-quota stepper on the marketing plan card"
```

---

### Task 2: Onboarding — DB-base floor + read `?extra=` + running total

**Files:**
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/app/onboarding/OnboardingForm.tsx`

- [ ] **Step 1: Read both files.** In `OnboardingForm.tsx` note: `const plan = searchParams.get('plan') || 'basic'`, `const baseQuota = DEFAULT_BASE_QUOTA[plan] ?? 200`, `const [guestTotal, setGuestTotal] = useState(baseQuota)`, `const guestExtra = Math.max(0, guestTotal - baseQuota)`, the `<QuotaStepper>` usage, and the `completeOnboarding({ ..., guestQuotaExtra: guestExtra })` call. In `page.tsx` note the `<OnboardingForm email={...} dict={t.onboarding} lang={lang} />` usage and that it is a server component.

- [ ] **Step 2: `page.tsx` — pass the chosen plan's DB base + price.**

Add imports:
```tsx
import { getTemplatePlans } from '@/lib/payments/template-plans'
import { DEFAULT_BASE_QUOTA } from '@/lib/payments/quota'
```
Compute (the page already reads `searchParams`; get `template` + `plan` the same way the form will — default template = the catalog default, plan default `'basic'`):
```tsx
const templateParam = typeof searchParams.template === 'string' ? searchParams.template : ''
const planParam = typeof searchParams.plan === 'string' ? searchParams.plan : 'basic'
const plansForTemplate = await getTemplatePlans(templateParam || 'lovebirds')
const chosen = plansForTemplate.find((p) => p.plan_code === planParam)
const planBase = chosen?.base_guest_quota ?? (DEFAULT_BASE_QUOTA[planParam] ?? 200)
const planPrice = chosen?.price_idr ?? 0
```
Pass them: `<OnboardingForm email={...} dict={t.onboarding} lang={lang} planBase={planBase} planPrice={planPrice} />`.

> If `searchParams` isn't already available in this page's signature, add it: `{ searchParams }: { searchParams: Record<string, string | string[] | undefined> }`.

- [ ] **Step 3: `OnboardingForm.tsx` — consume them.**

- Add the two props to the component signature (with the existing ones): `planBase?: number; planPrice?: number`.
- Replace `const baseQuota = DEFAULT_BASE_QUOTA[plan] ?? 200` with `const baseQuota = planBase ?? (DEFAULT_BASE_QUOTA[plan] ?? 200)`.
- Read the incoming extra and initialise the total from it. Add near the other `searchParams` reads:
  ```tsx
  import { clampQuotaExtra, quotaAddonAmount, formatIDR } from '@/lib/payments/quota'
  const extraParam = parseInt(searchParams.get('extra') || '0', 10) || 0
  ```
  Change the state init: `const [guestTotal, setGuestTotal] = useState(baseQuota + clampQuotaExtra(baseQuota, extraParam))`.
- Under the existing quota stepper, show a running total line (only meaningful when a price is known):
  ```tsx
  {planPrice ? (
    <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
      Total: {formatIDR(planPrice + quotaAddonAmount(guestExtra))}
    </span>
  ) : null}
  ```
  (Place it right after the existing "Termasuk {baseQuota} · Tambahan…" line; `guestExtra` already exists.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → no new errors. With the dev server: from the homepage, set a card's stepper to +100 then click "Pilih paket ini" → onboarding opens with the stepper already at base+100 and the "Total" line = plan price + Rp 20.000. Changing the plan (`?plan=premium`) floors at 300.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/page.tsx src/app/onboarding/OnboardingForm.tsx
git commit -m "feat(pricing): onboarding floors quota on DB base + reads extra + running total"
```

---

### Task 3: Full suite

- [ ] `npx vitest run` · `npx tsc --noEmit` · `npm run check:tokens` → all green. No migration.

## Self-Review

- **Spec coverage:** WS4 — per-card stepper (Task 1, buttons-only, carries `&extra=`, ScrollTrigger refresh) + onboarding DB-base floor + read extra + running total (Task 2). `completeOnboarding` unchanged (already takes `guestQuotaExtra`).
- **Placeholder scan:** Task 1 gives the full `VibePlanCard`; the VibeExploration + onboarding edits are described against located blocks (the components are large) — the implementer reads then edits; no vague "handle X".
- **Type consistency:** `VibePlanCard` props match the call site (`plan: PlanDisplay`, `styles`, `palette`, `t.choosePlan`/`t.guestQuota`); `extra` in the href = `total − base`; onboarding reads the same `extra` and clamps with `clampQuotaExtra(baseQuota, extraParam)`.
