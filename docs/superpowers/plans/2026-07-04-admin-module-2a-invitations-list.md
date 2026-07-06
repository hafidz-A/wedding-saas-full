# Admin Module 2 (Plan 2A) — Invitations list + core state actions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A cross-tenant `/admin/invitations` page listing every invitation with its status, plus the highest-value operator actions — **comp / mark-paid** (offline or free), **publish / unpublish**, **change plan**, and **add guest quota** — each admin-gated, audited, and cache-revalidating.

**Architecture:** One migration (`paid_source`, `paid_amount_idr`, `archived_at`) + a server list page + four server actions reusing Module 0's `requireAdmin` / `logAdminAction` / `revalidateInvitation` and the existing `resolvePlan` / `increment_guest_quota_extra`. Suspend (+ owner-app honouring), create-for-client, and delete/archive are LATER plans (2B/2C).

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase (service-role), Vitest. Spec: `docs/superpowers/specs/2026-07-03-admin-invitations-control-center-design.md`.

## Global Constraints

- Every action: `requireAdmin()` re-check → mutate via service-role `createSupabaseAdminClient` → `logAdminAction` → `revalidateInvitation()` (from `@/lib/admin/revalidate`).
- **Comp** sets `is_paid=true`, `is_published=true`, `paid_at`, `expires_at` (from the plan's duration via `resolvePlan`, or an override), `paid_source` (`manual` | `comp`), and `paid_amount_idr` (comp → 0; manual → an operator-entered amount). It mirrors `publishPaidInvitation` + the source/amount tags.
- Read `invitation.email` (NOT the legacy `owner_email`).
- Admin UI Indonesian-only; inline styles + existing CSS variables (mirror Module 0 `/admin` pages).
- Match repo style (2-space indent, single quotes, no semicolons).

## File Structure
- Create `supabase/migrations/2026-07-04_invitation_admin_fields.sql`.
- Create `src/app/admin/invitations/actions.ts` — `adminComp`, `adminSetPublished`, `adminChangePlan`, `adminAddQuota`.
- Create `src/app/admin/invitations/page.tsx` — the list.
- Create `src/app/admin/invitations/InvitationRow.tsx` — the client row actions.
- Test `src/app/admin/invitations/__tests__/actions.test.ts`.

---

### Task 1: Migration — `paid_source`, `paid_amount_idr`, `archived_at`

**Files:**
- Create: `supabase/migrations/2026-07-04_invitation_admin_fields.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/2026-07-04_invitation_admin_fields.sql
-- Admin invitation fields. Idempotent; safe to re-run.
alter table public.invitations add column if not exists paid_source text
  check (paid_source in ('xendit','manual','comp'));
alter table public.invitations add column if not exists paid_amount_idr integer;
alter table public.invitations add column if not exists archived_at timestamptz;

-- Backfill existing paid rows: they came through Xendit.
update public.invitations set paid_source = 'xendit' where is_paid = true and paid_source is null;
```

- [ ] **Step 2: Sanity check** — three `add column if not exists`, a CHECK on paid_source, and a backfill of existing paid rows. (Live apply = operator step at the end.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-07-04_invitation_admin_fields.sql
git commit -m "feat(admin): invitations paid_source/paid_amount_idr/archived_at migration"
```

---

### Task 2: The `/admin/invitations` list page

**Files:**
- Create: `src/app/admin/invitations/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseAdminClient` (`@/lib/supabase/admin`), `activePeriodStatus` (`@/lib/payments/active-period`).

- [ ] **Step 1: Write the page (server component under the `/admin` gate)**

```tsx
// src/app/admin/invitations/page.tsx
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { activePeriodStatus } from '@/lib/payments/active-period'
import InvitationRow from './InvitationRow'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Belum bayar', lifetime: 'Seumur hidup', active: 'Aktif', expired: 'Kadaluarsa',
}

export default async function AdminInvitationsPage({ searchParams }: { searchParams: { q?: string } }) {
  const db = createSupabaseAdminClient()
  const q = (searchParams.q || '').trim().toLowerCase()
  const { data } = (await (db.from('invitations') as any)
    .select('id, slug, template_id, plan, is_paid, is_published, expires_at, email, paid_source, guest_quota_extra, created_at')
    .order('created_at', { ascending: false })
    .limit(500)) as { data: any[] | null }
  const rows = (data ?? []).filter((r) =>
    !q || r.slug?.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q))

  return (
    <div>
      <h1 style={{ fontSize: 22 }}>Undangan</h1>
      <form style={{ margin: '12px 0' }}>
        <input name="q" defaultValue={searchParams.q || ''} placeholder="Cari slug atau email…"
          style={{ height: 36, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', width: 260 }} />
      </form>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rows.length} undangan</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {rows.map((r) => {
          const st = activePeriodStatus(r, Date.now())
          return (
            <InvitationRow key={r.id} inv={{
              id: r.id, slug: r.slug, templateId: r.template_id ?? '', plan: r.plan,
              email: r.email ?? '', isPublished: r.is_published, paidSource: r.paid_source ?? null,
              statusLabel: STATUS_LABEL[st.status] ?? st.status, quotaExtra: r.guest_quota_extra ?? 0,
            }} />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit` (will still error until Task 4 creates `InvitationRow`; that's expected — commit after Task 4). For now confirm the page file itself has no syntax errors by reading it back.

- [ ] **Step 3: Commit (WITH Task 4)** — this page + `InvitationRow` are one deliverable; commit them together at the end of Task 4.

---

### Task 3: Server actions — comp / publish / change plan / add quota

**Files:**
- Create: `src/app/admin/invitations/actions.ts`
- Test: `src/app/admin/invitations/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (`@/lib/admin/is-admin`), `logAdminAction` (`@/lib/admin/log`), `revalidateInvitation` (`@/lib/admin/revalidate`), `createSupabaseAdminClient` (`@/lib/supabase/admin`), `resolvePlan` (`@/lib/payments/plans`), `BLOCK_SIZE`/`QUOTA_CAP` (`@/lib/payments/quota`).
- Produces: `compPeriod` type; `adminComp(id, opts)`, `adminSetPublished(id, published)`, `adminChangePlan(id, plan)`, `adminAddQuota(id, qtyGuests)` — each `Promise<{ ok: boolean; error?: string }>`. Plus a pure `compExpiry(durationDays, kind, days, nowMs)` for testing.

- [ ] **Step 1: Write the failing test (pure helper)**

```ts
// src/app/admin/invitations/__tests__/actions.test.ts
import { describe, it, expect } from 'vitest'
import { compExpiry } from '../actions'

describe('compExpiry', () => {
  const now = 1_700_000_000_000
  const planIso = new Date(now + 365 * 86_400_000).toISOString()
  it('lifetime -> null', () => {
    expect(compExpiry(planIso, { kind: 'lifetime' }, now)).toBeNull()
  })
  it('days -> now + N days ISO', () => {
    expect(compExpiry(planIso, { kind: 'days', days: 30 }, now)).toBe(new Date(now + 30 * 86_400_000).toISOString())
  })
  it('plan -> passes the plan expiry through (null = lifetime plan)', () => {
    expect(compExpiry(planIso, { kind: 'plan' }, now)).toBe(planIso)
    expect(compExpiry(null, { kind: 'plan' }, now)).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify FAIL** — `npx vitest run "src/app/admin/invitations/__tests__/actions.test.ts"` → module missing.

- [ ] **Step 3: Implement `actions.ts`**

```ts
// src/app/admin/invitations/actions.ts
'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { resolvePlan } from '@/lib/payments/plans'
import { BLOCK_SIZE, QUOTA_CAP } from '@/lib/payments/quota'

type Result = { ok: boolean; error?: string }
export type CompPeriod = { kind: 'lifetime' } | { kind: 'plan' } | { kind: 'days'; days: number }

/** Pure: compute an expiry ISO from a comp period. `planExpiryIso` is what the
 *  plan's own duration yields (null = lifetime); used when period.kind === 'plan'. */
export function compExpiry(planExpiryIso: string | null, period: CompPeriod, nowMs: number): string | null {
  if (period.kind === 'lifetime') return null
  if (period.kind === 'days') return new Date(nowMs + period.days * 86_400_000).toISOString()
  return planExpiryIso // 'plan' → the plan's own expiry
}

async function guard(): Promise<{ email: string } | null> {
  try { return await requireAdmin() } catch { return null }
}

/** Mark an invitation paid without Xendit (offline/manual money, or a free comp). */
export async function adminComp(id: string, opts: { source: 'manual' | 'comp'; amountIDR: number; period: CompPeriod }): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations').select('id, plan, template_id').eq('id', id).maybeSingle()) as { data: { plan: string; template_id: string } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  const nowMs = Date.now()
  const expires = compExpiry(resolved ? resolved.expiresAt(nowMs) : null, opts.period, nowMs)
  const { error } = await (db.from('invitations') as any).update({
    is_paid: true, is_published: true, paid_at: new Date(nowMs).toISOString(),
    expires_at: expires, paid_source: opts.source, paid_amount_idr: opts.source === 'comp' ? 0 : Math.max(0, Math.round(opts.amountIDR)),
  }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: 'invitation.comp', targetType: 'invitation', targetId: id, meta: { source: opts.source } })
  revalidateInvitation()
  return { ok: true }
}

export async function adminSetPublished(id: string, published: boolean): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { error } = await (db.from('invitations') as any).update({ is_published: published }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: published ? 'invitation.publish' : 'invitation.unpublish', targetType: 'invitation', targetId: id })
  revalidateInvitation()
  return { ok: true }
}

export async function adminChangePlan(id: string, plan: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  if (!plan.trim()) return { ok: false, error: 'Plan wajib' }
  const db = createSupabaseAdminClient()
  const { error } = await (db.from('invitations') as any).update({ plan }).eq('id', id) // expiry intentionally untouched
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: 'invitation.change_plan', targetType: 'invitation', targetId: id, meta: { plan } })
  revalidateInvitation()
  return { ok: true }
}

/** Grant extra guest quota for free (multiple of 50, within cap). */
export async function adminAddQuota(id: string, qtyGuests: number): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const qty = Math.round(qtyGuests)
  if (qty <= 0 || qty % BLOCK_SIZE !== 0 || qty > QUOTA_CAP) return { ok: false, error: `Kelipatan ${BLOCK_SIZE}, maksimal ${QUOTA_CAP}` }
  const db = createSupabaseAdminClient()
  await db.rpc('increment_guest_quota_extra', { p_invitation_id: id, p_qty: qty })
  await logAdminAction(admin.email, { action: 'invitation.add_quota', targetType: 'invitation', targetId: id, meta: { qty } })
  revalidateInvitation()
  return { ok: true }
}
```

- [ ] **Step 4: Run — verify PASS** — `npx vitest run "src/app/admin/invitations/__tests__/actions.test.ts"` → PASS (compExpiry cases).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/invitations/actions.ts" "src/app/admin/invitations/__tests__/actions.test.ts"
git commit -m "feat(admin): invitation comp/publish/change-plan/add-quota actions"
```

---

### Task 4: `InvitationRow` client UI + commit the list page

**Files:**
- Create: `src/app/admin/invitations/InvitationRow.tsx`
- (commit alongside `page.tsx` from Task 2)

- [ ] **Step 1: Write `InvitationRow.tsx`** — a client component showing the invitation summary + a small set of action controls. Keep it simple: show slug, email, plan, status, paid source; and buttons: **Publish/Sembunyikan** (toggles `adminSetPublished`), **Tandai lunas (comp)** and **Tandai lunas (manual)** (call `adminComp` with `{ kind: 'plan' }` period; for manual, `prompt()` the amount), **Ganti plan** (a small select basic/premium → `adminChangePlan`), **+50 kuota** (`adminAddQuota(id, 50)`). After each call show a transient ok/error message and `location.reload()` on success. Use `'use client'`, `useState` for a busy/message state, inline styles with tokens. Import the actions from `./actions`.

```tsx
// src/app/admin/invitations/InvitationRow.tsx
'use client'

import { useState } from 'react'
import { adminComp, adminSetPublished, adminChangePlan, adminAddQuota } from './actions'

interface Inv { id: string; slug: string; templateId: string; plan: string; email: string; isPublished: boolean; paidSource: string | null; statusLabel: string; quotaExtra: number }

export default function InvitationRow({ inv }: { inv: Inv }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setMsg(null)
    const res = await fn()
    setBusy(false)
    if (res.ok) { location.reload() } else { setMsg(res.error || 'Gagal') }
  }

  return (
    <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 500 }}>{inv.slug} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {inv.templateId} · {inv.plan}</span></div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inv.email} · {inv.statusLabel}{inv.paidSource ? ` · ${inv.paidSource}` : ''}{inv.quotaExtra ? ` · +${inv.quotaExtra} kuota` : ''}</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <a href={`/${inv.templateId}/${inv.slug}`} target="_blank" rel="noreferrer" style={ghost}>Lihat</a>
        <button type="button" disabled={busy} onClick={() => run(() => adminSetPublished(inv.id, !inv.isPublished))} style={ghost}>{inv.isPublished ? 'Sembunyikan' : 'Terbitkan'}</button>
        <button type="button" disabled={busy} onClick={() => run(() => adminComp(inv.id, { source: 'comp', amountIDR: 0, period: { kind: 'plan' } }))} style={ghost}>Comp (gratis)</button>
        <button type="button" disabled={busy} onClick={() => { const a = parseInt(prompt('Nominal diterima (Rp):') || '0', 10) || 0; run(() => adminComp(inv.id, { source: 'manual', amountIDR: a, period: { kind: 'plan' } })) }} style={ghost}>Lunas manual</button>
        <select disabled={busy} defaultValue={inv.plan} onChange={(e) => run(() => adminChangePlan(inv.id, e.target.value))} style={ghost}>
          <option value="basic">basic</option><option value="premium">premium</option>
        </select>
        <button type="button" disabled={busy} onClick={() => run(() => adminAddQuota(inv.id, 50))} style={ghost}>+50 kuota</button>
      </div>
      {msg && <span style={{ fontSize: 12, color: 'var(--interactive-primary)', width: '100%' }}>{msg}</span>}
    </div>
  )
}

const ghost: React.CSSProperties = { height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }
```

- [ ] **Step 2: Type-check** — `npx tsc --noEmit` → no new errors (page + row + actions now all present).

- [ ] **Step 3: Commit page + row**

```bash
git add "src/app/admin/invitations/page.tsx" "src/app/admin/invitations/InvitationRow.tsx"
git commit -m "feat(admin): /admin/invitations list + row actions"
```

---

### Task 5: Full suite + operator apply

- [ ] `npx vitest run` · `npx tsc --noEmit` · `npm run check:tokens` → all green.
- [ ] (operator) apply `supabase/migrations/2026-07-04_invitation_admin_fields.sql`.
- [ ] (manual) at `/admin/invitations`: search a slug; comp a draft (→ becomes active/published); unpublish + re-publish; change a plan; +50 quota → reflected on reload.

## Self-Review

- **Spec coverage (subset):** list + comp/manual + publish/unpublish + change-plan + add-quota, all admin-gated + audited + revalidating. Suspend (+owner-app), create-for-client, delete/archive, set-active-period as a standalone action = deferred plans (stated in the goal).
- **Placeholder scan:** the row UI is fully specified; only `compExpiry` is unit-tested (the actions hit the DB — covered by the manual step) — this is called out, not hidden.
- **Type consistency:** `InvitationRow`'s `Inv` fields match what `page.tsx` passes; the four action signatures match their calls in the row; `CompPeriod`/`compExpiry` are shared within `actions.ts`.
