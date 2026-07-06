# Admin Module 1 (Plan B1) — Marketing card reads plans from the DB

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the marketing "vibe" template cards render each plan's **name, price, features, included guest quota, and compare-at (harga coret) strikethrough from the DB** (`template_plans` via `getAllTemplatePlans`), falling back to the static `templateCatalog` only when the DB has no rows — so an operator's edits in `/admin/templates` (Plan A) immediately show on the homepage, and the stale "Buku tamu under Basic" bug disappears.

**Architecture:** A client-safe `PlanDisplay` shape + `toPlanDisplay(row)` mapper; the landing server component fetches `getAllTemplatePlans()`, maps it, and passes it to `VibeExploration`; `VibeExploration` renders the plan cards from that prop (catalog fallback) and adds a quota line + a strikethrough compare-at price. The per-card quota **stepper** and onboarding wiring are a SEPARATE plan (B2) — not here.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Vitest. Spec: `docs/superpowers/specs/2026-07-03-pricing-source-unify-editor-design.md` (WS1, WS2, WS5-display).

## Global Constraints

- `PlanDisplay` + `toPlanDisplay` are **client-safe** — import the `TemplatePlanRow` type with `import type` (type-only, erased) so the `server-only` `template-plans` module is never imported at runtime; import `formatIDR` from `@/lib/payments/quota` (client-safe).
- New marketing copy is **bilingual** (id + en) — the existing `dict-parity` test enforces identical key shapes.
- Fallback: if `getAllTemplatePlans()` returns no entry for a template, render that template's `templateCatalog` plans (mapped to `PlanDisplay`) so the page never renders empty.
- Do NOT change the "choose plan" link target or add a stepper (that's Plan B2). Keep `VibeExploration`'s GSAP/animation code untouched.
- Match repo style (2-space indent, single quotes, no semicolons).

## File Structure

- Create `src/lib/payments/plan-display.ts` — `PlanDisplay` + `toPlanDisplay`.
- Modify `src/lib/i18n/dictionaries/landing.ts` — add `vibeExploration.guestQuota` to id + en.
- Modify `src/app/page.tsx` — fetch + map plans, pass to `VibeExploration`.
- Modify `src/components/marketing/VibeExploration.tsx` — accept `plans` prop, render plan cards from it (quota line + compare-at), catalog fallback.
- Test `src/lib/payments/__tests__/plan-display.test.ts`.

---

### Task 1: `PlanDisplay` + `toPlanDisplay`

**Files:**
- Create: `src/lib/payments/plan-display.ts`
- Test: `src/lib/payments/__tests__/plan-display.test.ts`

**Interfaces:**
- Produces: `interface PlanDisplay { id: string; name: string; price: string; amountIDR: number; compareAtPrice: string | null; features: string[]; baseQuota: number }`; `toPlanDisplay(row: TemplatePlanRow): PlanDisplay`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/payments/__tests__/plan-display.test.ts
import { describe, it, expect } from 'vitest'
import { toPlanDisplay } from '../plan-display'

const row = {
  template_id: 'lovebirds', plan_code: 'premium', display_name: 'Premium',
  price_idr: 299000, duration_days: null, features: ['Galeri unlimited', 'Musik'],
  sort_order: 2, base_guest_quota: 300, compare_at_price_idr: null,
} as any

describe('toPlanDisplay', () => {
  it('maps a row to the display shape (no discount)', () => {
    expect(toPlanDisplay(row)).toEqual({
      id: 'premium', name: 'Premium', price: 'Rp 299.000', amountIDR: 299000,
      compareAtPrice: null, features: ['Galeri unlimited', 'Musik'], baseQuota: 300,
    })
  })
  it('sets compareAtPrice only when compare_at > price', () => {
    expect(toPlanDisplay({ ...row, compare_at_price_idr: 399000 }).compareAtPrice).toBe('Rp 399.000')
    expect(toPlanDisplay({ ...row, compare_at_price_idr: 299000 }).compareAtPrice).toBeNull()
    expect(toPlanDisplay({ ...row, compare_at_price_idr: 100000 }).compareAtPrice).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

`npx vitest run src/lib/payments/__tests__/plan-display.test.ts` → FAIL (module missing).

- [ ] **Step 3: Write `plan-display.ts`**

```ts
// src/lib/payments/plan-display.ts
// Client-safe plan display shape. TemplatePlanRow is a TYPE import (erased), so
// this file never pulls in the server-only template-plans module at runtime.
import type { TemplatePlanRow } from './template-plans'
import { formatIDR } from './quota'

export interface PlanDisplay {
  id: string
  name: string
  price: string
  amountIDR: number
  compareAtPrice: string | null
  features: string[]
  baseQuota: number
}

export function toPlanDisplay(row: TemplatePlanRow): PlanDisplay {
  const hasDiscount = row.compare_at_price_idr != null && row.compare_at_price_idr > row.price_idr
  return {
    id: row.plan_code,
    name: row.display_name,
    price: formatIDR(row.price_idr),
    amountIDR: row.price_idr,
    compareAtPrice: hasDiscount ? formatIDR(row.compare_at_price_idr as number) : null,
    features: row.features,
    baseQuota: row.base_guest_quota,
  }
}
```

- [ ] **Step 4: Run — verify PASS**

`npx vitest run src/lib/payments/__tests__/plan-display.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/plan-display.ts src/lib/payments/__tests__/plan-display.test.ts
git commit -m "feat(pricing): client-safe PlanDisplay + toPlanDisplay mapper"
```

---

### Task 2: i18n — `vibeExploration.guestQuota` (id + en)

**Files:**
- Modify: `src/lib/i18n/dictionaries/landing.ts`

- [ ] **Step 1: Read the file** and find BOTH `vibeExploration:` blocks (there are two — the `id` dictionary and the `en` dictionary). Note the existing keys (`buy`, `plansTitle`, `choosePlan`, …).

- [ ] **Step 2: Add one key to EACH block**, matching the surrounding style. In the **id** block add:

```ts
      guestQuota: '{n} tamu undangan',
```

In the **en** block add:

```ts
      guestQuota: '{n} guest invites',
```

- [ ] **Step 3: Run the dict-parity test**

Run: `npx vitest run -t "parity"` (or the i18n dict test path under `src/lib/i18n/__tests__/`).
Expected: PASS — id and en have identical key shapes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/landing.ts
git commit -m "feat(pricing): i18n guestQuota line for the vibe plan cards"
```

---

### Task 3: Wire DB plans into the marketing card

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/marketing/VibeExploration.tsx`

**Interfaces:**
- Consumes: `getAllTemplatePlans` (`@/lib/payments/template-plans`), `toPlanDisplay` + `PlanDisplay` (Task 1), `getCatalogEntry` (`@/config/templateCatalog`, already imported in VibeExploration), the `guestQuota` key (Task 2).

- [ ] **Step 1: Read both files first.** In `VibeExploration.tsx` locate: the component signature `export function VibeExploration({ lang, t }: {...})`, the `catalog = getCatalogEntry(template.id)` line, and the **inline plans block** that maps `(catalog.plans ?? []).map(...)` rendering `pl.name`, `pl.price`, `pl.features`, and the `Link` to `` `${buyHref}&plan=${pl.id}` ``. In `page.tsx` locate the `<VibeExploration lang={lang} t={t.landing.vibeExploration} />` usage.

- [ ] **Step 2: `page.tsx` — fetch + map + pass a `plans` prop.** `page.tsx` is a server component. Add:

```tsx
import { getAllTemplatePlans } from '@/lib/payments/template-plans'
import { toPlanDisplay, type PlanDisplay } from '@/lib/payments/plan-display'
```

Before the return, build the map (page is already `async`? — if `HomePage` is NOT async, make it `async`; it renders server components so this is safe):

```tsx
const rawPlans = await getAllTemplatePlans()
const plansByTemplate: Record<string, PlanDisplay[]> = {}
for (const tid of Object.keys(rawPlans)) plansByTemplate[tid] = rawPlans[tid].map(toPlanDisplay)
```

Pass it: `<VibeExploration lang={lang} t={t.landing.vibeExploration} plans={plansByTemplate} />`.

- [ ] **Step 3: `VibeExploration.tsx` — accept + render the prop.**

Add to imports: `import { toPlanDisplay, type PlanDisplay } from '@/lib/payments/plan-display'`.

Change the signature to accept `plans`:

```tsx
export function VibeExploration({ lang, t, plans }: { lang: 'id' | 'en'; t: VibeDict; plans?: Record<string, PlanDisplay[]> }) {
```

Where `catalog` is computed, derive the display plans (DB first, catalog fallback). The catalog plan shape is `{ id, name, price, amountIDR, features }` — map it to `PlanDisplay` (no compare-at, quota from a sensible default). Add near `const catalog = getCatalogEntry(template.id)`:

```tsx
const displayPlans: PlanDisplay[] =
  plans?.[template.id] ??
  (catalog.plans ?? []).map((pl: any) => ({
    id: pl.id, name: pl.name, price: pl.price, amountIDR: pl.amountIDR ?? 0,
    compareAtPrice: null, features: pl.features ?? [], baseQuota: 200,
  }))
```

Replace the inline `(catalog.plans ?? []).map(...)` plan-card block so it maps `displayPlans` and, per card, renders:
- the name (`pl.name`),
- the price: if `pl.compareAtPrice` is set, show it **struck through** before the live `pl.price` (use `text-decoration: line-through` + `opacity: 0.6` on the compare-at span, styled with the palette's muted colour); else just `pl.price`,
- a **quota line** using the i18n key: `t.guestQuota.replace('{n}', String(pl.baseQuota))` (styled like `copy.blurb`/small muted text),
- the existing feature `<ul>` from `pl.features`,
- the existing `Link` to `` `${buyHref}&plan=${pl.id}` `` unchanged.

Keep all class names, the palette colours, and the surrounding animation markup exactly as they are — only the data source + the two new bits (strikethrough, quota line) change.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → no new errors. Then, with the dev server, the homepage `#vibe` cards show the DB price/features + the "N tamu undangan" line; after editing a plan's price / compare-at / quota in `/admin/templates`, the card reflects it (allow the 60s cache tag or a hard reload). Basic no longer lists "Buku tamu".

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/marketing/VibeExploration.tsx
git commit -m "feat(pricing): vibe plan cards read price/quota/compare-at from the DB"
```

---

### Task 4: Full suite

- [ ] `npx vitest run` · `npx tsc --noEmit` · `npm run check:tokens` → all green. No operator/migration step (uses existing columns).

## Self-Review

- **Spec coverage:** WS1 (page fetches DB, VibeExploration renders it, catalog fallback, Buku-tamu bug fixed by reading DB features) + WS2 (quota line) + WS5-display (compare-at strikethrough). The stepper + onboarding are Plan B2 (stated in the goal).
- **Placeholder scan:** Task 3 describes the VibeExploration edit precisely (data source swap + two additions) rather than pasting the whole 400-line component — the implementer reads the file and edits the located block; every other step is concrete.
- **Type consistency:** `PlanDisplay` (Task 1) is imported by `page.tsx` + `VibeExploration.tsx` (Task 3); `toPlanDisplay(row: TemplatePlanRow)` matches the row that now includes `compare_at_price_idr` (Plan A Task 2); the `guestQuota` key (Task 2) is read in Task 3.
