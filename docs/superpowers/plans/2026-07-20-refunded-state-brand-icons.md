# Refunded-state labeling + refund emails + FinCards brand icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Label fully-refunded invitations everywhere (client full gate, profile badge, admin badge), fix the /profile refund form parity bug, revamp refund decision emails, and make the official FinCards logo the icon of every page.

**Architecture:** Refunded = a `refunds` row with `status='succeeded'` + `source_type='initial'` for the invitation (no schema change; server-side helper). Client dashboard gets a full gate screen before the suspended check. Shared `needsRefundDestination` + shared form-fields component kill the dashboard/profile divergence. Emails move to a template helper mirroring `src/lib/email/receipt.ts`. Icons follow Next App Router conventions (`src/app/icon.png` etc.), generated once by a sharp script from the master logo.

**Tech Stack:** Next.js 14 App Router, Supabase (admin client), vitest + `src/__test-stubs__/supabaseFake.ts`, sharp (already installed), `png-to-ico` (new devDep).

**Spec:** `docs/superpowers/specs/2026-07-20-refunded-state-brand-icons-design.md`

## Global Constraints

- CSS Modules + CSS variables only; NO Tailwind/UI libs. Buttons/dialogs use `src/components/ui/` primitives. Danger colors use the `--status-danger` scale from `src/styles/tokens.css` — never raw `#`-red.
- Radius/height tokens per `CLAUDE.md` (`--radius-*`, `--ctl-h*`); run `npm run check:tokens` after touching control CSS/inline styles.
- `'use client'` on all components/hooks; server actions stay in `'use server'` files; `SUPABASE_SERVICE_ROLE_KEY`/crypto only in server files.
- Copy voice: brand-as-subject, address reader as "kamu", no gue/saya/kami. UI text Bahasa Indonesia.
- Legal pages (/refund, /terms) are OUT OF SCOPE (owner is consulting counsel).
- The dashboard gate components (`SuspendedNotice`) are hardcoded-Bahasa inline components in `dashboard/page.tsx` — `RefundedNotice` follows that same pattern (deliberate deviation from the spec's "add i18n keys": the sibling component has none).
- Master logo source file: `C:\Users\arifi\Downloads\Gemini_Generated_Image_huk37hhuk37hhuk3.png` (2048×2048).
- Commit after every task; end commit messages with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `needsRefundDestination` shared helper

**Files:**
- Modify: `src/lib/payments/refund-channels.ts`
- Modify: `src/app/onboarding/actions.ts:720-729` (requestRefund destination check)
- Modify: `src/app/[template]/[slug]/dashboard/RefundRequestButton.tsx:31`
- Test: `src/lib/payments/__tests__/refund-channels.test.ts` (create)

**Interfaces:**
- Produces: `needsRefundDestination(paidSource: string | null | undefined, paidChannel: string | null | undefined): boolean` exported from `@/lib/payments/refund-channels` (client-safe, pure). Task 2 imports it.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/payments/__tests__/refund-channels.test.ts
import { describe, it, expect } from 'vitest'
import { canApiRefund, needsRefundDestination } from '../refund-channels'

describe('needsRefundDestination', () => {
  it('manual payments always need a destination', () => {
    expect(needsRefundDestination('manual', null)).toBe(true)
    expect(needsRefundDestination('manual', 'gopay')).toBe(true)
  })
  it('midtrans VA/bank transfer needs a destination (no Direct Refund API)', () => {
    expect(needsRefundDestination('midtrans', 'bank_transfer')).toBe(true)
    expect(needsRefundDestination('midtrans', 'echannel')).toBe(true)
    expect(needsRefundDestination('midtrans', null)).toBe(true)
  })
  it('midtrans API-refundable channels do not need a destination', () => {
    expect(needsRefundDestination('midtrans', 'gopay')).toBe(false)
    expect(needsRefundDestination('midtrans', 'credit_card')).toBe(false)
  })
  it('comp/unknown sources need no destination (nothing to transfer back)', () => {
    expect(needsRefundDestination('comp', null)).toBe(false)
    expect(needsRefundDestination(null, null)).toBe(false)
  })
  it('canApiRefund stays consistent', () => {
    expect(canApiRefund('qris')).toBe(true)
    expect(canApiRefund('bank_transfer')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payments/__tests__/refund-channels.test.ts`
Expected: FAIL — `needsRefundDestination` is not exported.

- [ ] **Step 3: Implement in `refund-channels.ts`** (append below `canApiRefund`; file must stay client-safe — no imports):

```ts
/**
 * True when refund money cannot go back automatically, so the couple must
 * supply a destination account up front: manual/offline payments, and
 * Midtrans channels without Direct Refund API support (VA / bank transfer).
 * Single source of truth for requestRefund (server) and both refund forms.
 */
export function needsRefundDestination(
  paidSource: string | null | undefined,
  paidChannel: string | null | undefined,
): boolean {
  if (paidSource === 'manual') return true
  return paidSource === 'midtrans' && !canApiRefund(paidChannel)
}
```

- [ ] **Step 4: Adopt it in the server action.** In `src/app/onboarding/actions.ts`, import `needsRefundDestination` from `@/lib/payments/refund-channels` (extend the existing `canApiRefund` import at line 15) and replace the two-line computation at lines 724-725:

```ts
    const needsDestination = needsRefundDestination(inv.paid_source, inv.paid_channel)
```

Keep the comment above it. If `canApiRefund` is now unused in that file, drop it from the import.

- [ ] **Step 5: Adopt it in `RefundRequestButton.tsx`.** Replace line 31:

```ts
  const needsDestination = needsRefundDestination(paidSource, paidChannel)
```

and change the import on line 6 to `import { needsRefundDestination } from '@/lib/payments/refund-channels'` (drop `canApiRefund` if unused).

- [ ] **Step 6: Verify**

Run: `npx vitest run src/lib/payments/__tests__/refund-channels.test.ts` → PASS. Then `npm run typecheck` → clean.

- [ ] **Step 7: Commit** — `fix(refund): single source of truth for refund destination requirement`

---

### Task 2: Shared refund form fields + /profile parity fix

**Files:**
- Create: `src/components/refund/RefundRequestFields.tsx`
- Modify: `src/app/[template]/[slug]/dashboard/RefundRequestButton.tsx` (swap inline fields for the shared component)
- Modify: `src/app/profile/ProfileRefundControl.tsx` (accept `paidChannel`, use shared fields, add pending warning)
- Modify: `src/app/profile/page.tsx:38,42,72-89,187-188` (select + thread `paid_channel`)

**Interfaces:**
- Consumes: `needsRefundDestination` (Task 1); `requestRefund`, `RefundRequestInput` from `@/app/onboarding/actions`.
- Produces (from the new file):
  - `interface RefundFormValue { category: RefundRequestInput['category']; detail: string; destType: 'bank' | 'ewallet'; bank: string; wallet: string; accountNo: string; holder: string }`
  - `const EMPTY_REFUND_FORM: RefundFormValue`
  - `function buildRefundInput(v: RefundFormValue, needsDestination: boolean): RefundRequestInput`
  - default export `RefundRequestFields({ value, onChange, needsDestination })` — controlled component.

- [ ] **Step 1: Read both current forms end-to-end** (`RefundRequestButton.tsx`, `ProfileRefundControl.tsx`) so the shared component ports the dashboard's markup: reason `<select>` (4 categories), optional detail `<textarea>`, and — when `needsDestination` — the dashboard's bank/e-wallet toggle where `destType==='ewallet'` swaps labels and stores the wallet name in `bank`. Reuse `ui.input` from `@/components/ui/controls.module.css` and keep label styles consistent with the dashboard version.

- [ ] **Step 2: Create `src/components/refund/RefundRequestFields.tsx`**

```tsx
// src/components/refund/RefundRequestFields.tsx
'use client'

import type { RefundRequestInput } from '@/app/onboarding/actions'
import ui from '@/components/ui/controls.module.css'

export interface RefundFormValue {
  category: RefundRequestInput['category']
  detail: string
  destType: 'bank' | 'ewallet'
  bank: string
  wallet: string
  accountNo: string
  holder: string
}

export const EMPTY_REFUND_FORM: RefundFormValue = {
  category: 'duplicate_payment', detail: '', destType: 'bank',
  bank: '', wallet: 'GoPay', accountNo: '', holder: '',
}

/** Map the form state to the server contract. E-wallets ride in `bank`
 *  (carries the wallet name) so the server/admin shape never changes. */
export function buildRefundInput(v: RefundFormValue, needsDestination: boolean): RefundRequestInput {
  return {
    category: v.category,
    detail: v.detail || undefined,
    destination: needsDestination
      ? { bank: v.destType === 'ewallet' ? v.wallet : v.bank, account_no: v.accountNo, holder: v.holder }
      : undefined,
  }
}

const WALLETS = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja']

export default function RefundRequestFields({ value, onChange, needsDestination }: {
  value: RefundFormValue
  onChange: (v: RefundFormValue) => void
  needsDestination: boolean
}) {
  const set = (patch: Partial<RefundFormValue>) => onChange({ ...value, ...patch })
  const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <label style={lbl}>Alasan
        <select value={value.category} onChange={(e) => set({ category: e.target.value as RefundFormValue['category'] })} className={ui.input}>
          <option value="duplicate_payment">Bayar dobel</option>
          <option value="system_failure">Gagal sistem</option>
          <option value="inaccessible">Tidak bisa diakses</option>
          <option value="other">Lainnya</option>
        </select>
      </label>
      <label style={lbl}>Keterangan (opsional)
        <textarea value={value.detail} onChange={(e) => set({ detail: e.target.value })} rows={2} className={ui.input} style={{ height: 'auto', padding: 8 }} />
      </label>
      {needsDestination && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            Dana tidak bisa kembali otomatis lewat channel pembayaranmu, jadi isi tujuan pengembalian:
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['bank', 'ewallet'] as const).map((k) => (
              <button key={k} type="button" onClick={() => set({ destType: k })}
                style={{ height: 'var(--ctl-h-sm)', padding: '0 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, cursor: 'pointer',
                  border: value.destType === k ? '1px solid var(--text-primary)' : '1px solid var(--border-strong)',
                  background: value.destType === k ? 'var(--text-primary)' : 'transparent',
                  color: value.destType === k ? 'var(--surface-raised, #fff)' : 'var(--text-secondary)' }}>
                {k === 'bank' ? 'Rekening bank' : 'E-wallet'}
              </button>
            ))}
          </div>
          {value.destType === 'bank' ? (
            <input placeholder="Bank (mis. BCA)" value={value.bank} onChange={(e) => set({ bank: e.target.value })} className={ui.input} />
          ) : (
            <select value={value.wallet} onChange={(e) => set({ wallet: e.target.value })} className={ui.input}>
              {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          )}
          <input placeholder={value.destType === 'bank' ? 'Nomor rekening' : 'Nomor HP e-wallet'} value={value.accountNo} onChange={(e) => set({ accountNo: e.target.value })} className={ui.input} />
          <input placeholder="Nama pemilik" value={value.holder} onChange={(e) => set({ holder: e.target.value })} className={ui.input} />
        </div>
      )}
    </div>
  )
}
```

NOTE: Step 1 may reveal the dashboard's existing destination markup differs (labels, wallet list, toggle style). The dashboard's existing markup WINS — port it into this component verbatim and keep this file the only copy.

- [ ] **Step 3: Rewire `RefundRequestButton.tsx`** — replace its inline `category/detail/destType/bank/wallet/accountNo/holder` state with a single `const [form, setForm] = useState(EMPTY_REFUND_FORM)`, render `<RefundRequestFields value={form} onChange={setForm} needsDestination={needsDestination} />` where the fields were, and submit with `requestRefund(invitationId, buildRefundInput(form, needsDestination))`. Visual shell (open/close, warnings, buttons) unchanged.

- [ ] **Step 4: Rewire `ProfileRefundControl.tsx`**
  - Props: add `paidChannel: string | null` → `needsDestination = needsRefundDestination(paidSource, paidChannel)` (import from Task 1).
  - Replace its field state + modal fields with the shared component exactly as in Step 3.
  - Pending chip: add `title`-independent visible warning under the chip when `hasPending || done`:
    `<span style={{ fontSize: 11.5, color: 'var(--status-error-dark, var(--status-error))' }}>Jangan ubah undangan/tamu selama menunggu — undangan yang sudah dipakai bisa ditolak refundnya.</span>` (wrap chip+warning in a `display:grid` span; verify the exact `--status-*` var names against `src/styles/tokens.css` and reuse what `RefundRequestButton` uses).

- [ ] **Step 5: Thread `paid_channel` through `/profile`.** In `src/app/profile/page.tsx`: add `paid_channel` to the `.select(...)` list (line 38) and to the row type (line 42); extend the `refundState` map value type with `paidChannel: string | null` and set it at line 89 (`paidChannel: inv.paid_channel ?? null`); pass it at line 188 (spread already covers it once the map value includes it).

- [ ] **Step 6: Verify**

Run: `npm run typecheck` → clean. `npx vitest run` → green. `npm run check:tokens` → clean (new inline styles use tokens).
Manual spot-check (dev server): /profile → "Ajukan refund" on a Midtrans VA-paid (or manual-paid) invitation now asks for bank/e-wallet destination identical to the dashboard form.

- [ ] **Step 7: Commit** — `fix(profile): refund form parity with dashboard (destination + e-wallet, shared fields)`

---

### Task 3: Refunded-detection helper

**Files:**
- Create: `src/lib/payments/refunded.ts`
- Test: `src/lib/payments/__tests__/refunded.test.ts`

**Interfaces:**
- Produces: `fetchRefundedAt(db: any, invitationId: string): Promise<string | null>` and `fetchRefundedMap(db: any, invitationIds: string[]): Promise<Map<string, string>>` (value = `confirmed_at`, '' when null). Tasks 4-6 consume these. Only `source_type='initial'` + `status='succeeded'` rows count (spec: upgrade/addon refunds do NOT mark the invitation refunded; refunded renewals already land as `initial` via the webhook).

- [ ] **Step 1: Write the failing test** (follow the scripted-tables pattern used by `src/lib/payments/__tests__/transactions.test.ts` with `createFakeSupabase`):

```ts
// src/lib/payments/__tests__/refunded.test.ts
import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/__test-stubs__/supabaseFake'
import { fetchRefundedAt, fetchRefundedMap } from '../refunded'

describe('fetchRefundedAt', () => {
  it('returns confirmed_at when a succeeded initial refund exists', async () => {
    const db = createFakeSupabase({ tables: { refunds: { select: { data: [{ confirmed_at: '2026-07-18T03:00:00Z' }], error: null } } } })
    expect(await fetchRefundedAt(db, 'inv-1')).toBe('2026-07-18T03:00:00Z')
  })
  it('returns null when there is no such refund', async () => {
    const db = createFakeSupabase({ tables: { refunds: { select: { data: [], error: null } } } })
    expect(await fetchRefundedAt(db, 'inv-1')).toBeNull()
  })
})

describe('fetchRefundedMap', () => {
  it('maps source_id → confirmed_at and skips nothing else', async () => {
    const db = createFakeSupabase({ tables: { refunds: { select: { data: [
      { source_id: 'inv-1', confirmed_at: '2026-07-18T03:00:00Z' },
      { source_id: 'inv-2', confirmed_at: null },
    ], error: null } } } })
    const map = await fetchRefundedMap(db, ['inv-1', 'inv-2', 'inv-3'])
    expect(map.get('inv-1')).toBe('2026-07-18T03:00:00Z')
    expect(map.get('inv-2')).toBe('')
    expect(map.has('inv-3')).toBe(false)
  })
  it('short-circuits on an empty id list without querying', async () => {
    const db = createFakeSupabase()
    const map = await fetchRefundedMap(db, [])
    expect(map.size).toBe(0)
    expect(db._calls.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/lib/payments/__tests__/refunded.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/payments/refunded.ts
// Server-only: is an invitation FULLY refunded? True iff the refunds ledger has
// a succeeded row for its INITIAL purchase (refunded renewals are recorded as
// 'initial' by the webhook; upgrade/addon refunds do NOT take the invitation down).
import 'server-only'

/** confirmed_at of the succeeded initial-purchase refund, or null. */
export async function fetchRefundedAt(db: any, invitationId: string): Promise<string | null> {
  const { data } = await db.from('refunds')
    .select('confirmed_at')
    .eq('source_type', 'initial').eq('source_id', invitationId).eq('status', 'succeeded').limit(1)
  return data?.[0]?.confirmed_at ?? null
}

/** Batched variant for lists (profile, admin): invitation id → confirmed_at (''
 *  when the row predates confirmed_at backfill). Missing key = not refunded. */
export async function fetchRefundedMap(db: any, invitationIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!invitationIds.length) return map
  const { data } = await db.from('refunds')
    .select('source_id, confirmed_at')
    .eq('source_type', 'initial').eq('status', 'succeeded').in('source_id', invitationIds)
  for (const r of (data ?? []) as { source_id: string | null; confirmed_at: string | null }[]) {
    if (r.source_id) map.set(r.source_id, r.confirmed_at ?? '')
  }
  return map
}
```

If `createFakeSupabase`'s chain lacks `.in(...)` support, extend the fake (it lives in `src/__test-stubs__/supabaseFake.ts`) the same way its other chain methods are stubbed — do not fork a new fake.

- [ ] **Step 4: Run to verify PASS**, then `npm run typecheck`.
- [ ] **Step 5: Commit** — `feat(refund): server helper to detect fully-refunded invitations`

---

### Task 4: Dashboard full gate — `RefundedNotice`

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/page.tsx` (gate at ~line 106 before the suspended check; new inline component next to `SuspendedNotice` at ~line 326)

**Interfaces:**
- Consumes: `fetchRefundedAt` (Task 3). The page already has an admin Supabase client and `invitation` (with `id`, `is_paid`) in scope — reuse them.

- [ ] **Step 1: Add the gate.** In `dashboard/page.tsx`, immediately BEFORE the `if (invitation.suspended_at)` check (line 109), insert:

```ts
  // 3a-pre. Refund gate: a fully-refunded invitation is permanently closed for
  // the owner (reverseEntitlement sets suspended_at, but the refund deserves its
  // own honest message instead of the generic "ditangguhkan" takedown notice).
  if (invitation.is_paid) {
    const refundedAt = await fetchRefundedAt(adminClient, invitation.id)
    if (refundedAt !== null) return <RefundedNotice slug={slug} refundedAt={refundedAt} lang={lang} />
  }
```

(`adminClient` = whatever admin-client variable the page already uses — match the local name; import `fetchRefundedAt` from `@/lib/payments/refunded`.)

- [ ] **Step 2: Add the component** next to `SuspendedNotice` (same style consts `panelStyle`/`cardStyle`, same `AuthChrome` usage):

```tsx
function RefundedNotice({ slug, refundedAt, lang }: { slug: string; refundedAt: string; lang: Lang }) {
  const tanggal = refundedAt
    ? new Date(refundedAt).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' })
    : null
  return (
    <>
    <AuthChrome lang={lang} />
    <main style={panelStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 32, margin: '0 0 12px' }}>
          Undangan ini sudah direfund
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px' }}>
          Dana untuk undangan <code>{slug}</code> sudah dikembalikan{tanggal ? ` pada ${tanggal}` : ''}.
          Sesuai kebijakan pengembalian dana, undangan dinonaktifkan permanen — tidak bisa
          diedit, diterbitkan ulang, atau dibuka tamu.
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
          Mau bikin undangan baru? Mulai lagi kapan saja dari halaman profil.
        </p>
        <a href="/profile" style={{ display: 'inline-flex', alignItems: 'center', height: 'var(--ctl-h)', padding: '0 20px', borderRadius: 'var(--radius-pill)', background: 'var(--color-charcoal, #1a1a1a)', color: '#fff', textDecoration: 'none', fontSize: 14 }}>
          Kembali ke profil
        </a>
      </div>
    </main>
    </>
  )
}
```

Prefer `<ButtonLink>` from `src/components/ui/` if `SuspendedNotice`'s file already imports it — shared controls win over hand-rolled styles; otherwise match `SignOutButton`'s existing charcoal-pill styling as above.

- [ ] **Step 3: Verify** — `npm run typecheck`; dev-server spot check with a refunded invitation (or temporarily seed a succeeded `refunds` row) shows the gate; a suspended-but-not-refunded invitation still shows `SuspendedNotice`.
- [ ] **Step 4: Commit** — `feat(dashboard): dedicated "sudah direfund" gate before suspend notice`

---

### Task 5: Profile badge + hide controls

**Files:**
- Modify: `src/app/profile/page.tsx` (fetch refunded map ~line 52; card render ~lines 99-200)

**Interfaces:**
- Consumes: `fetchRefundedMap` (Task 3).

- [ ] **Step 1: Fetch.** Next to the existing `paidIds` computation (line 52):

```ts
  const refundedMap = paidIds.length ? await fetchRefundedMap(admin, paidIds) : new Map<string, string>()
```

Exclude refunded invitations from `refundableIds` (line 73): append `.filter((id) => !refundedMap.has(id))`.

- [ ] **Step 2: Badge + suppress controls.** In the invitation card JSX: where the status/period chip renders, when `refundedMap.has(inv.id)` show instead:

```tsx
<span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--status-danger-bg, rgba(200,60,50,0.12))', color: 'var(--status-danger)', fontSize: 12, fontWeight: 600 }}>Sudah direfund</span>
```

(Verify the exact `--status-danger*` var names in `src/styles/tokens.css` and use the real ones — no raw red.) For refunded invitations ALSO skip: the pay/renew CTA (`RenewButton`), manage/dashboard CTA if the card links to the editor (link may stay — the dashboard now shows the refund gate — but hide payment CTAs), and `ProfileRefundControl` (already excluded via Step 1's `refundableIds` filter — confirm nothing else renders it).

- [ ] **Step 3: Verify** — typecheck + dev spot check: refunded invitation card shows badge, no pay/renew/refund buttons; other cards unchanged.
- [ ] **Step 4: Commit** — `feat(profile): "Sudah direfund" badge + hide payment CTAs for refunded invitations`

---

### Task 6: Admin invitations badge (label only)

**Files:**
- Modify: the `/admin/invitations` server page that builds the list (find via `Grep "InvitationRow" src/app/admin` — the page that maps rows) + `src/app/admin/invitations/InvitationRow.tsx`

**Interfaces:**
- Consumes: `fetchRefundedMap` (Task 3). Note: `/admin/payments` ALREADY renders per-transaction "direfund" status + filter — do not touch it (spec deviation, already covered).

- [ ] **Step 1:** In the admin invitations server page, after loading the invitation rows: `const refundedMap = await fetchRefundedMap(db, rows.map((r) => r.id))`, pass `refundedAt={refundedMap.get(inv.id) ?? null}` to each `<InvitationRow>`.
- [ ] **Step 2:** In `InvitationRow.tsx`, add optional prop `refundedAt?: string | null`; when set, render next to the existing status chip:

```tsx
{refundedAt != null && (
  <span title={refundedAt ? `Refund selesai ${new Date(refundedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}` : 'Refund selesai'}
    style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--status-danger-bg, rgba(200,60,50,0.12))', color: 'var(--status-danger)', fontSize: 11.5, fontWeight: 600 }}>
    Refunded
  </span>
)}
```

Match the row's existing chip styling/classes if it has them (reuse over hand-rolling; verify token names). Admin ACTIONS stay untouched.

- [ ] **Step 3: Verify** — typecheck + dev spot check on /admin/invitations.
- [ ] **Step 4: Commit** — `feat(admin): Refunded badge on invitations list`

---

### Task 7: Refund decision emails

**Files:**
- Create: `src/lib/email/refund-emails.ts`
- Modify: `src/app/admin/payments/actions.ts:336-338` (approve) and `:354-356` (reject)
- Test: `src/lib/email/__tests__/refund-emails.test.ts`

**Interfaces:**
- Consumes: `siteBaseUrl()` from `@/lib/site-url`; email asset `/images/brand/fincards-logo-email.png` (created in Task 8 — the URL is stable, so this task can land first; the image 404s only until Task 8 lands, acceptable within the same branch).
- Produces: `refundApprovedEmail(opts: { method: 'manual' | 'gateway' }): { subject: string; html: string }` and `refundRejectedEmail(opts: { note?: string | null }): { subject: string; html: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/email/__tests__/refund-emails.test.ts
import { describe, it, expect } from 'vitest'
import { refundApprovedEmail, refundRejectedEmail } from '../refund-emails'

describe('refundApprovedEmail', () => {
  it('gateway method mentions automatic return + ETA', () => {
    const { subject, html } = refundApprovedEmail({ method: 'gateway' })
    expect(subject).toContain('disetujui')
    expect(html).toContain('metode pembayaran')
    expect(html).toContain('hari kerja')
    expect(html).toContain('/images/brand/fincards-logo-email.png')
  })
  it('manual method mentions the provided account', () => {
    expect(refundApprovedEmail({ method: 'manual' }).html).toContain('rekening')
  })
  it('states the invitation is permanently deactivated', () => {
    expect(refundApprovedEmail({ method: 'gateway' }).html).toContain('permanen')
  })
})

describe('refundRejectedEmail', () => {
  it('escapes the operator note', () => {
    const { html } = refundRejectedEmail({ note: '<script>x</script> & "quotes"' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
  it('renders without a note', () => {
    expect(refundRejectedEmail({}).html).toContain('balas email ini')
  })
})
```

- [ ] **Step 2: Run to verify FAIL**, then implement:

```ts
// src/lib/email/refund-emails.ts
// Refund decision emails (approve/reject) — branded shell mirroring receipt.ts.
import 'server-only'
import { siteBaseUrl } from '@/lib/site-url'

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function shell(content: string): string {
  const base = siteBaseUrl()
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e0d5;">
      <div style="background:#FDF6EC;padding:22px 24px;text-align:center;">
        <img src="${base}/images/brand/fincards-logo-email.png" alt="FinCards" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;" />
      </div>
      <div style="padding:24px;color:#1a1a1a;font-size:14px;line-height:1.7;">${content}</div>
      <div style="background:#f4f1ea;padding:14px 24px;font-size:12px;color:#6b6b6b;">
        Ada pertanyaan? Balas email ini — tim FinCards siap membantu.
      </div>
    </div>
  </div>`
}

export function refundApprovedEmail(opts: { method: 'manual' | 'gateway' }): { subject: string; html: string } {
  const caraKembali = opts.method === 'gateway'
    ? 'Dana dikembalikan <strong>otomatis ke metode pembayaran</strong> yang dipakai saat membeli. Biasanya masuk dalam <strong>3–14 hari kerja</strong>, tergantung bank atau channel pembayaranmu.'
    : 'Dana <strong>ditransfer ke rekening / e-wallet</strong> yang kamu cantumkan saat mengajukan. Kalau dalam 3 hari kerja belum masuk, balas email ini ya.'
  return {
    subject: '✓ Pengembalian dana disetujui — FinCards',
    html: shell(`
      <p style="margin:0 0 12px;">Halo,</p>
      <p style="margin:0 0 12px;">Kabar baik — permintaan pengembalian dana undanganmu sudah <strong>disetujui</strong>.</p>
      <p style="margin:0 0 12px;">${caraKembali}</p>
      <p style="margin:0 0 12px;">Sesuai kebijakan pengembalian dana, undangan yang direfund <strong>dinonaktifkan permanen</strong> dan tidak bisa diterbitkan ulang. Data di dalamnya tidak lagi bisa diubah.</p>
      <p style="margin:0;">Terima kasih sudah mencoba FinCards. Kalau suatu saat butuh undangan digital lagi, pintu selalu terbuka. 🤍</p>
    `),
  }
}

export function refundRejectedEmail(opts: { note?: string | null }): { subject: string; html: string } {
  const alasan = opts.note?.trim()
    ? `<div style="margin:0 0 12px;padding:12px 14px;background:#f9f6ef;border-left:3px solid #c8b98a;border-radius:0;">
         <span style="font-size:12px;color:#6b6b6b;display:block;margin-bottom:4px;">Catatan dari tim peninjau</span>
         ${esc(opts.note.trim())}
       </div>`
    : ''
  return {
    subject: 'Update permintaan pengembalian dana — FinCards',
    html: shell(`
      <p style="margin:0 0 12px;">Halo,</p>
      <p style="margin:0 0 12px;">Terima kasih sudah menunggu. Setelah ditinjau, permintaan pengembalian dana undanganmu <strong>belum bisa disetujui</strong>.</p>
      ${alasan}
      <p style="margin:0 0 12px;">Keputusan ini mengacu pada kebijakan pengembalian dana FinCards (misalnya undangan yang sudah dipakai — ada tamu, RSVP, atau sudah tayang melewati masa tenggang — tidak bisa direfund).</p>
      <p style="margin:0;">Kalau ada yang mau didiskusikan atau menurutmu ada yang keliru, langsung balas email ini — setiap balasan dibaca tim FinCards.</p>
    `),
  }
}
```

- [ ] **Step 3: Adopt in `src/app/admin/payments/actions.ts`.** Import both helpers. Replace the approve-path `notifyCouple(...)` call (lines 336-338) with:

```ts
  const mail = refundApprovedEmail({ method: opts.method })
  await notifyCouple(db, req.invitation_id, mail.subject, mail.html)
```

and the reject-path call (lines 354-356) with:

```ts
  const mail = refundRejectedEmail({ note: note ?? null })
  await notifyCouple(db, req.invitation_id, mail.subject, mail.html)
```

Remove the now-unused local `escapeHtml` if nothing else in the file uses it.

- [ ] **Step 4: Verify** — `npx vitest run src/lib/email/__tests__/refund-emails.test.ts` → PASS; `npm run typecheck` → clean.
- [ ] **Step 5: Commit** — `feat(email): branded, warmer refund decision emails`

---

### Task 8: FinCards brand icons everywhere

**Files:**
- Create: `scripts/generate-brand-icons.mjs`
- Create (generated, committed): `public/images/brand/fincards-logo.png`, `public/images/brand/fincards-logo-email.png`, `public/images/brand/fincards-icon-512.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`
- Modify: `src/app/[template]/[slug]/icon/route.ts` (serve the brand icon instead of the couple monogram)
- Modify: `src/app/[template]/[slug]/layout.tsx:15` (icon type `image/png`)

**Interfaces:**
- Consumes: source logo at `C:\Users\arifi\Downloads\Gemini_Generated_Image_huk37hhuk37hhuk3.png`; `sharp` (installed); new devDep `png-to-ico`.
- Produces: `/images/brand/fincards-logo-email.png` consumed by Task 7.

- [ ] **Step 1:** `npm i -D png-to-ico` (tiny, pure-JS).

- [ ] **Step 2: Create `scripts/generate-brand-icons.mjs`**

```js
// scripts/generate-brand-icons.mjs
// One-shot: derive all brand icon assets from the master FinCards logo photo.
// Usage: node scripts/generate-brand-icons.mjs [path-to-master.png]
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'

const SRC = process.argv[2] ?? 'C:/Users/arifi/Downloads/Gemini_Generated_Image_huk37hhuk37hhuk3.png'
mkdirSync('public/images/brand', { recursive: true })

const MASTER = 'public/images/brand/fincards-logo.png'
copyFileSync(SRC, MASTER)

await sharp(MASTER).resize({ width: 480 }).png().toFile('public/images/brand/fincards-logo-email.png')

// Square icon: tight center crop around the diagonal script lettering.
// Master is 2048×2048; the lettering sits roughly in the middle band.
const crop = sharp(MASTER).extract({ left: 324, top: 324, width: 1400, height: 1400 })
await crop.clone().resize(512, 512).png().toFile('public/images/brand/fincards-icon-512.png')
await crop.clone().resize(512, 512).png().toFile('src/app/icon.png')
await crop.clone().resize(180, 180).png().toFile('src/app/apple-icon.png')

const sizes = await Promise.all([16, 32, 48].map((s) => crop.clone().resize(s, s).png().toBuffer()))
writeFileSync('src/app/favicon.ico', await pngToIco(sizes))
console.log('brand icons written')
```

- [ ] **Step 3:** Run `node scripts/generate-brand-icons.mjs`. Then VIEW `src/app/icon.png` (Read tool renders images) — the crop must contain the full "FinCards" lettering, centered, no cut letters. If letters are clipped, adjust `left/top/width/height` (keep it square) and re-run until it looks right. This visual check is mandatory, not optional.

- [ ] **Step 4: Replace the per-invitation icon route.** Overwrite `src/app/[template]/[slug]/icon/route.ts` with:

```ts
/**
 * Invitation favicon — now the official FinCards brand icon on every page
 * without exception (owner decision 2026-07-20; replaces the per-couple
 * monogram wreath). Kept as a route (same URL) so existing tabs/caches
 * keep working; serves the pre-generated square brand PNG.
 */
import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

let cached: Buffer | null = null

export async function GET() {
  if (!cached) {
    cached = await readFile(path.join(process.cwd(), 'public', 'images', 'brand', 'fincards-icon-512.png'))
  }
  return new NextResponse(cached, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=604800',
    },
  })
}
```

- [ ] **Step 5:** In `src/app/[template]/[slug]/layout.tsx` line 15, change the icon entry type: `icon: [{ url: \`/${params.template}/${params.slug}/icon\`, type: 'image/png' }]`, and update the stale comment at line 8 (route now serves the FinCards brand icon).

- [ ] **Step 6: Verify** — `npm run typecheck`; dev server: marketing `/`, `/login`, a dashboard, `/admin`, and an invitation page all show the FinCards tab icon (hard-refresh; favicons cache aggressively). `npx vitest run` still green (monogram route tests, if any exist, must be updated or removed — search `Grep "icon" src/app/[template]/[slug] --glob "*test*"`).
- [ ] **Step 7: Commit** — `feat(brand): FinCards logo as favicon/app icon everywhere + email asset` (include generated binaries + package.json/package-lock).

---

### Task 9: Full verification pass

- [ ] **Step 1:** `npm run typecheck` → clean.
- [ ] **Step 2:** `npm run test` (vitest, includes dict-parity) → green.
- [ ] **Step 3:** `npm run check:tokens` → clean.
- [ ] **Step 4:** `npm run verify:security` → clean (no new client-side secret refs).
- [ ] **Step 5:** Manual module-wide QA in dev (owner preference: one combined pass):
  1. Seed/refund a test invitation (admin → payments → refund, or insert a succeeded `refunds` row) →
     dashboard shows "Undangan ini sudah direfund" gate; /profile shows badge, no pay/renew/refund buttons; /admin/invitations shows "Refunded" badge; public URL stays down.
  2. /profile refund form on a Midtrans-VA or manual-paid invitation asks for bank/e-wallet destination, identical to dashboard.
  3. Render both email HTMLs (paste into a scratch .html and open) — logo header shows, copy reads well.
  4. Favicon visible on marketing/login/dashboard/admin/invitation tabs.
- [ ] **Step 6:** Report results to the owner (Bahasa), including any deviations.
