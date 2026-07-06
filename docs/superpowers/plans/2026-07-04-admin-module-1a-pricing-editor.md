# Admin Module 1 (Plan A) — Operator pricing editor + compare-at

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An `/admin/templates` "Paket & Harga" editor where the operator edits each plan's `display_name`, `price_idr`, `compare_at_price_idr` (harga coret), `base_guest_quota`, `duration_days`, and `features`, writing to `template_plans` (the DB the Xendit charge already reads) and refreshing cached reads instantly.

**Architecture:** One new nullable column (`compare_at_price_idr`), a pure validator + a `updatePlan` server action (gated by `requireAdmin`, service-role write, `revalidateTag`, audit-logged), and a server page + client form under the `/admin` shell built in Module 0. Marketing-display unification + the per-card stepper are a SEPARATE plan (Plan B) — not here.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase (service-role admin client), Vitest. Spec: `docs/superpowers/specs/2026-07-03-pricing-source-unify-editor-design.md` + `docs/superpowers/specs/2026-07-04-admin-template-catalog-design.md` (merged page).

## Global Constraints

- **Every mutating action re-checks `requireAdmin()`** (from `@/lib/admin/is-admin`, built in Module 0). Log every write with `logAdminAction` (`@/lib/admin/log`).
- Writes use the **service-role** `createSupabaseAdminClient` (`@/lib/supabase/admin`) — server-only.
- After a write, call `revalidateTag(TEMPLATE_PLANS_TAG)` (exported from `@/lib/payments/template-plans`) so the 60s-cached reads refresh at once.
- **Admin UI is Indonesian-only** — no i18n dictionary entries.
- Validation values (verbatim): `price_idr` integer ≥ 0; `compare_at_price_idr` null OR integer strictly > `price_idr`; `base_guest_quota` a multiple of `BLOCK_SIZE` (50) within `[BLOCK_SIZE, QUOTA_CAP]` where `QUOTA_CAP = 5000` (both from `@/lib/payments/quota`); `duration_days` null OR integer > 0; `features` a non-empty array of non-empty strings; `display_name` non-empty.
- No UI library; inline styles with existing CSS variables (mirror Module 0's `/admin` pages).

## File Structure

- Create `supabase/migrations/2026-07-04_template_plans_compare_at.sql` — the new column.
- Modify `src/lib/payments/template-plans.ts` — add `compare_at_price_idr` to the row type, both `.select(...)` strings, and `mapRow`.
- Create `src/app/admin/templates/actions.ts` — `validatePlanPatch` (pure) + `updatePlan` (server action).
- Create `src/app/admin/templates/page.tsx` — server: `requireAdmin`, fetch plans, render the editor.
- Create `src/app/admin/templates/PlansEditor.tsx` — client: the per-plan form calling `updatePlan`.
- Test `src/lib/payments/__tests__/plans.test.ts` (append) + `src/app/admin/templates/__tests__/actions.test.ts`.

---

### Task 1: Migration — `template_plans.compare_at_price_idr`

**Files:**
- Create: `supabase/migrations/2026-07-04_template_plans_compare_at.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/2026-07-04_template_plans_compare_at.sql
-- Optional "compare-at" (strikethrough) price for a plan. Display-only; the
-- charge stays price_idr. Idempotent; safe to re-run.
alter table public.template_plans
  add column if not exists compare_at_price_idr integer;
```

- [ ] **Step 2: Sanity check**

Read the file back; confirm it uses `add column if not exists` and adds exactly one nullable integer column. (Live apply is an operator step at the end.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-07-04_template_plans_compare_at.sql
git commit -m "feat(pricing): migration — template_plans.compare_at_price_idr"
```

---

### Task 2: `template-plans.ts` — carry `compare_at_price_idr`

**Files:**
- Modify: `src/lib/payments/template-plans.ts`
- Test: `src/lib/payments/__tests__/plans.test.ts` (append a case)

**Interfaces:**
- Produces: `TemplatePlanRow.compare_at_price_idr: number | null`.

- [ ] **Step 1: Append the failing test**

Read `src/lib/payments/__tests__/plans.test.ts` first to match its import + fixture style. Append:

```ts
import { getTemplatePlans } from '../template-plans'

describe('compare_at_price_idr passthrough', () => {
  it('mapRow coerces compare_at_price_idr (number or null)', async () => {
    // The existing tests mock the supabase admin client. Reuse that mock: make
    // the mocked select resolve a row that includes compare_at_price_idr, then
    // assert getTemplatePlans returns it. If the file has no such mock yet,
    // follow the pattern already used by the other template-plans tests in this
    // file (do NOT invent a new mocking style).
    expect(true).toBe(true) // replace with the real assertion per the file's mock
  })
})
```

> Note to implementer: `plans.test.ts` already tests `template-plans`/`plans`. Match its EXISTING mock of `@/lib/supabase/admin`. Add one row field `compare_at_price_idr` to a fixture and assert it survives `mapRow` (a number stays a number; `null`/absent → `null`). Replace the placeholder assertion above with that real check.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payments/__tests__/plans.test.ts`
Expected: FAIL (field missing from the mapped row).

- [ ] **Step 3: Implement**

In `src/lib/payments/template-plans.ts`:
- Add to the `TemplatePlanRow` interface: `compare_at_price_idr: number | null`.
- Add `compare_at_price_idr` to BOTH `.select('...')` column strings (in `getTemplatePlans` and `getAllTemplatePlans`).
- In `mapRow`, add: `compare_at_price_idr: r.compare_at_price_idr == null ? null : Number(r.compare_at_price_idr),`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/payments/__tests__/plans.test.ts`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/template-plans.ts src/lib/payments/__tests__/plans.test.ts
git commit -m "feat(pricing): carry compare_at_price_idr through template-plans"
```

---

### Task 3: `validatePlanPatch` + `updatePlan` action

**Files:**
- Create: `src/app/admin/templates/actions.ts`
- Test: `src/app/admin/templates/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (`@/lib/admin/is-admin`), `logAdminAction` (`@/lib/admin/log`), `createSupabaseAdminClient` (`@/lib/supabase/admin`), `TEMPLATE_PLANS_TAG` (`@/lib/payments/template-plans`), `BLOCK_SIZE`/`QUOTA_CAP` (`@/lib/payments/quota`), `revalidateTag` (`next/cache`).
- Produces: `PlanPatch` type; `validatePlanPatch(patch: PlanPatch): { ok: true } | { ok: false; error: string }`; `updatePlan(templateId: string, planCode: string, patch: PlanPatch): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Write the failing test (pure validator)**

```ts
// src/app/admin/templates/__tests__/actions.test.ts
import { describe, it, expect } from 'vitest'
import { validatePlanPatch } from '../actions'

const base = {
  display_name: 'Basic', price_idr: 149000, compare_at_price_idr: null,
  base_guest_quota: 200, duration_days: 365, features: ['RSVP'],
}

describe('validatePlanPatch', () => {
  it('accepts a valid patch', () => {
    expect(validatePlanPatch(base)).toEqual({ ok: true })
  })
  it('rejects a non-integer / negative price', () => {
    expect(validatePlanPatch({ ...base, price_idr: 149000.5 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, price_idr: -1 }).ok).toBe(false)
  })
  it('rejects compare-at ≤ price, accepts null or > price', () => {
    expect(validatePlanPatch({ ...base, compare_at_price_idr: 149000 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, compare_at_price_idr: 100000 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, compare_at_price_idr: 199000 }).ok).toBe(true)
    expect(validatePlanPatch({ ...base, compare_at_price_idr: null }).ok).toBe(true)
  })
  it('rejects quota not a multiple of 50 or out of [50,5000]', () => {
    expect(validatePlanPatch({ ...base, base_guest_quota: 237 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, base_guest_quota: 0 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, base_guest_quota: 5050 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, base_guest_quota: 250 }).ok).toBe(true)
  })
  it('rejects bad duration / empty features / empty name', () => {
    expect(validatePlanPatch({ ...base, duration_days: 0 }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, duration_days: null }).ok).toBe(true)
    expect(validatePlanPatch({ ...base, features: [] }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, features: ['ok', ' '] }).ok).toBe(false)
    expect(validatePlanPatch({ ...base, display_name: '' }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/templates/__tests__/actions.test.ts"`
Expected: FAIL — `Cannot find module '../actions'`.

- [ ] **Step 3: Implement `actions.ts`**

```ts
// src/app/admin/templates/actions.ts
'use server'

import { revalidateTag } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { TEMPLATE_PLANS_TAG } from '@/lib/payments/template-plans'
import { BLOCK_SIZE, QUOTA_CAP } from '@/lib/payments/quota'

export interface PlanPatch {
  display_name: string
  price_idr: number
  compare_at_price_idr: number | null
  base_guest_quota: number
  duration_days: number | null
  features: string[]
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

/** Pure validation of a plan patch. Exported for unit tests. */
export function validatePlanPatch(p: PlanPatch): { ok: true } | { ok: false; error: string } {
  if (!p.display_name || !p.display_name.trim()) return { ok: false, error: 'Nama paket wajib diisi' }
  if (!isInt(p.price_idr) || p.price_idr < 0) return { ok: false, error: 'Harga harus angka bulat ≥ 0' }
  if (p.compare_at_price_idr !== null && (!isInt(p.compare_at_price_idr) || p.compare_at_price_idr <= p.price_idr)) {
    return { ok: false, error: 'Harga coret harus lebih besar dari harga jual (atau kosong)' }
  }
  if (!isInt(p.base_guest_quota) || p.base_guest_quota % BLOCK_SIZE !== 0 || p.base_guest_quota < BLOCK_SIZE || p.base_guest_quota > QUOTA_CAP) {
    return { ok: false, error: `Kuota harus kelipatan ${BLOCK_SIZE}, antara ${BLOCK_SIZE} dan ${QUOTA_CAP}` }
  }
  if (p.duration_days !== null && (!isInt(p.duration_days) || p.duration_days <= 0)) {
    return { ok: false, error: 'Masa aktif harus angka hari > 0, atau kosong (seumur hidup)' }
  }
  if (!Array.isArray(p.features) || p.features.length === 0 || p.features.some((f) => !f || !f.trim())) {
    return { ok: false, error: 'Fitur tidak boleh kosong' }
  }
  return { ok: true }
}

/** Update one plan row + refresh cached reads. Admin-gated + audited. */
export async function updatePlan(templateId: string, planCode: string, patch: PlanPatch): Promise<{ ok: boolean; error?: string }> {
  let admin: { email: string }
  try {
    admin = await requireAdmin()
  } catch {
    return { ok: false, error: 'Akses ditolak' }
  }
  const v = validatePlanPatch(patch)
  if (!v.ok) return { ok: false, error: v.error }

  const db = createSupabaseAdminClient()
  const { error } = await (db.from('template_plans') as any)
    .update({
      display_name: patch.display_name.trim(),
      price_idr: patch.price_idr,
      compare_at_price_idr: patch.compare_at_price_idr,
      base_guest_quota: patch.base_guest_quota,
      duration_days: patch.duration_days,
      features: patch.features.map((f) => f.trim()),
    })
    .eq('template_id', templateId)
    .eq('plan_code', planCode)
  if (error) {
    console.error('[updatePlan]', error)
    return { ok: false, error: 'Gagal menyimpan. Coba lagi.' }
  }

  await logAdminAction(admin.email, { action: 'plan.update', targetType: 'template_plan', targetId: `${templateId}/${planCode}` })
  revalidateTag(TEMPLATE_PLANS_TAG)
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/admin/templates/__tests__/actions.test.ts"`
Expected: PASS (all validator cases).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/templates/actions.ts" "src/app/admin/templates/__tests__/actions.test.ts"
git commit -m "feat(pricing): updatePlan action + validatePlanPatch"
```

---

### Task 4: `/admin/templates` page + `PlansEditor`

**Files:**
- Create: `src/app/admin/templates/page.tsx`
- Create: `src/app/admin/templates/PlansEditor.tsx`

**Interfaces:**
- Consumes: `getAllTemplatePlans` (`@/lib/payments/template-plans`), `updatePlan` (Task 3), `formatIDR` (`@/lib/payments/quota`).

- [ ] **Step 1: Create the server page**

```tsx
// src/app/admin/templates/page.tsx
import { getAllTemplatePlans } from '@/lib/payments/template-plans'
import PlansEditor from './PlansEditor'

export default async function AdminTemplatesPage() {
  const byTemplate = await getAllTemplatePlans()
  const templates = Object.keys(byTemplate).sort()
  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Template & Harga</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
        Ubah harga, kuota tamu, fitur, masa aktif, dan harga coret tiap paket. Perubahan langsung berlaku.
      </p>
      {templates.length === 0 && <p style={{ marginTop: 16 }}>Belum ada data paket di database.</p>}
      {templates.map((tid) => (
        <section key={tid} style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, textTransform: 'capitalize' }}>{tid}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            {byTemplate[tid].map((plan) => (
              <PlansEditor key={plan.plan_code} templateId={tid} plan={{
                plan_code: plan.plan_code,
                display_name: plan.display_name,
                price_idr: plan.price_idr,
                compare_at_price_idr: plan.compare_at_price_idr,
                base_guest_quota: plan.base_guest_quota,
                duration_days: plan.duration_days,
                features: plan.features,
              }} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create the client editor**

```tsx
// src/app/admin/templates/PlansEditor.tsx
'use client'

import { useState } from 'react'
import { updatePlan, type PlanPatch } from './actions'
import { formatIDR } from '@/lib/payments/quota'

interface PlanInit extends PlanPatch { plan_code: string }

export default function PlansEditor({ templateId, plan }: { templateId: string; plan: PlanInit }) {
  const [displayName, setDisplayName] = useState(plan.display_name)
  const [price, setPrice] = useState(String(plan.price_idr))
  const [compareAt, setCompareAt] = useState(plan.compare_at_price_idr == null ? '' : String(plan.compare_at_price_idr))
  const [quota, setQuota] = useState(String(plan.base_guest_quota))
  const [duration, setDuration] = useState(plan.duration_days == null ? '' : String(plan.duration_days))
  const [features, setFeatures] = useState(plan.features.join('\n'))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    setBusy(true); setMsg(null)
    const patch: PlanPatch = {
      display_name: displayName,
      price_idr: parseInt(price.replace(/\D/g, ''), 10) || 0,
      compare_at_price_idr: compareAt.trim() === '' ? null : (parseInt(compareAt.replace(/\D/g, ''), 10) || 0),
      base_guest_quota: parseInt(quota.replace(/\D/g, ''), 10) || 0,
      duration_days: duration.trim() === '' ? null : (parseInt(duration.replace(/\D/g, ''), 10) || 0),
      features: features.split('\n').map((f) => f.trim()).filter(Boolean),
    }
    const res = await updatePlan(templateId, plan.plan_code, patch)
    setBusy(false)
    setMsg(res.ok ? { ok: true, text: 'Tersimpan ✓' } : { ok: false, text: res.error || 'Gagal' })
  }

  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 16, width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong style={{ textTransform: 'capitalize' }}>{plan.plan_code}</strong>
      <Field label="Nama paket"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inp} /></Field>
      <Field label="Harga (Rp)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" style={inp} /></Field>
      <Field label={`Harga coret (opsional) — ${compareAt ? formatIDR(Number(compareAt.replace(/\D/g, '')) || 0) : 'kosong'}`}>
        <input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} inputMode="numeric" placeholder="kosongkan jika tak ada" style={inp} />
      </Field>
      <Field label="Kuota tamu (kelipatan 50)"><input value={quota} onChange={(e) => setQuota(e.target.value)} inputMode="numeric" style={inp} /></Field>
      <Field label="Masa aktif (hari, kosong = seumur hidup)"><input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" style={inp} /></Field>
      <Field label="Fitur (satu per baris)"><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} /></Field>
      <button type="button" onClick={save} disabled={busy} style={btn}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--color-emerald)' : 'var(--interactive-primary)' }}>{msg.text}</span>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

const inp: React.CSSProperties = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const btn: React.CSSProperties = { height: 40, borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', border: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4 }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from these two files. (`textarea` inheriting `inp`'s `height` is fine — it sets `resize: vertical`.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/templates/page.tsx" "src/app/admin/templates/PlansEditor.tsx"
git commit -m "feat(pricing): /admin/templates Paket & Harga editor"
```

---

### Task 5: Full suite + operator apply

- [ ] **Step 1:** `npx vitest run` · `npx tsc --noEmit` · `npm run check:tokens` → all green.
- [ ] **Step 2 (operator):** apply `supabase/migrations/2026-07-04_template_plans_compare_at.sql` to Supabase (SQL editor / MCP `apply_migration`).
- [ ] **Step 3 (operator/manual):** at `/admin/templates`, change a price + set a compare-at + edit quota/features on one plan → Simpan → "Tersimpan". Reload → the change persists (proves the DB write + `revalidateTag`). Confirm the Xendit charge now reflects the new price on a fresh checkout.

---

## Self-Review

- **Spec coverage:** WS3 operator editor (Tasks 3–4) + WS5 compare-at Phase 1 (Tasks 1–2, editor field). WS1/WS2/WS4 (marketing display unify, quota line, per-card stepper, onboarding) are explicitly Plan B — noted in the goal. The editor edits exactly the 6 fields the spec lists (name, price, compare-at, quota, duration, features).
- **Placeholder scan:** Task 2 Step 1 intentionally defers the assertion to the file's existing mock style (documented) — the implementer completes it against the real mock; every other step is concrete.
- **Type consistency:** `PlanPatch` (Task 3) is imported by `PlansEditor` (Task 4); `updatePlan(templateId, planCode, patch)` signature matches; `compare_at_price_idr: number | null` matches the `TemplatePlanRow` field (Task 2) and the migration column (Task 1).
