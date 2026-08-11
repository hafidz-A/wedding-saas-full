# Invitation Status Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the status shown on each `/profile` invitation card match what a guest actually sees, by building the shared `invitationPublicStatus()` resolver that was specced on 2026-07-04 and never implemented.

**Architecture:** One new pure module (`src/lib/invitations/public-status.ts`) folds `is_paid` + `is_published` + `expires_at` + `suspended_at` + `config` + a caller-supplied refund flag into a single `PublicStatus` verdict, in the same precedence order the public page's own gates use. `/profile` adds `suspended_at` to its existing query (every other input column is already fetched), then renders a visibility chip and, when something blocks guests, an explanation row. `activePeriodStatus` is untouched — it answers the billing question and both verdicts stay on the card.

**Tech Stack:** Next.js 14 App Router, TypeScript, vitest, CSS-in-`style`-object (this page uses inline style consts, not CSS Modules — follow that).

**Spec:** [docs/superpowers/specs/2026-08-11-invitation-status-truth-design.md](../specs/2026-08-11-invitation-status-truth-design.md)

## Global Constraints

- Branch is `feat/profile-status-truth`. Already checked out; do not create another.
- **No new dependencies.** No Tailwind, shadcn, MUI, styled-components.
- **`process.env`, never `import.meta.env`.**
- **New `.tsx` files MUST `import React` explicitly** — vitest does not set `jsx: 'automatic'`, so a component without the import throws `ReferenceError: React is not defined` the moment a test renders it.
- **Colors come from tokens.** Use `--status-success-text` / `--status-success-soft`, `--status-error-dark` / `--status-error-soft`, `--status-danger` / `--status-danger-soft`. No raw hex. `npm run check:tokens` must pass.
- **Radius from the token scale** — `var(--radius-sm)` / `var(--radius-pill)`. No literal `999px`, no single-px radius literals.
- **Copy voice:** no first-person pronouns (no *saya* / *kami* / *gue*); address the reader as *kamu*. Each explanation names the consequence to guests, never the internal column name.
- **i18n parity is enforced** — every key added to `common.id` must be added to `common.en` with the same path. `dict-parity.test.ts` fails otherwise.
- Commit after every task. Every commit message ends with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/invitations/public-status.ts` (create) | Pure resolver: row columns → one `PublicStatus` verdict. No I/O, no `server-only` — must be importable from a client component and testable in isolation. |
| `src/lib/invitations/__tests__/public-status.test.ts` (create) | Unit tests for every verdict plus the precedence pairs. |
| `src/lib/i18n/dictionaries/common.ts` (modify) | New `invitationStatus` block, id + en. |
| `src/app/profile/page.tsx` (modify) | Fetch `suspended_at`, compute the verdict, render chips + explanation row. |
| `src/app/profile/InvitationActions.tsx` (modify) | Take `publicStatus`, drop the `isRefunded` prop, hide dead-end actions. |

---

## Task 1: The resolver

**Files:**
- Create: `src/lib/invitations/public-status.ts`
- Test: `src/lib/invitations/__tests__/public-status.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type PublicStatus = 'live' | 'refunded' | 'suspended' | 'expired' | 'unpaid' | 'unpublished' | 'not_ready'`
  - `interface PublicStatusInput { is_paid?: boolean; is_published?: boolean; expires_at?: string | null; suspended_at?: string | null; config?: unknown }`
  - `function invitationPublicStatus(inv: PublicStatusInput, nowMs: number, opts?: { isRefunded?: boolean }): PublicStatus`

Both later tasks import from `@/lib/invitations/public-status`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/invitations/__tests__/public-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { invitationPublicStatus } from '../public-status'

const NOW = Date.UTC(2026, 7, 11)
const PAST = new Date(Date.UTC(2026, 0, 1)).toISOString()
const FUTURE = new Date(Date.UTC(2027, 0, 1)).toISOString()

// A row a guest can fully open: paid, published, unexpired, unsuspended, has content.
const LIVE = {
  is_paid: true,
  is_published: true,
  expires_at: null,
  suspended_at: null,
  config: { sections: [] },
}

describe('invitationPublicStatus', () => {
  it('live when every gate passes', () => {
    expect(invitationPublicStatus(LIVE, NOW)).toBe('live')
  })

  it('unpaid when not paid', () => {
    expect(invitationPublicStatus({ ...LIVE, is_paid: false }, NOW)).toBe('unpaid')
  })

  it('unpublished when paid but not published', () => {
    expect(invitationPublicStatus({ ...LIVE, is_published: false }, NOW)).toBe('unpublished')
  })

  it('expired when the active period has run out', () => {
    expect(invitationPublicStatus({ ...LIVE, expires_at: PAST }, NOW)).toBe('expired')
  })

  it('still live when the expiry is in the future', () => {
    expect(invitationPublicStatus({ ...LIVE, expires_at: FUTURE }, NOW)).toBe('live')
  })

  it('not expired on the exact expiry instant (matches activePeriodStatus)', () => {
    const atBoundary = new Date(NOW).toISOString()
    expect(invitationPublicStatus({ ...LIVE, expires_at: atBoundary }, NOW)).toBe('live')
  })

  it('suspended when an admin has taken it down', () => {
    expect(invitationPublicStatus({ ...LIVE, suspended_at: PAST }, NOW)).toBe('suspended')
  })

  it('refunded when the caller says the initial purchase was refunded', () => {
    expect(invitationPublicStatus(LIVE, NOW, { isRefunded: true })).toBe('refunded')
  })

  it('not_ready when the config is an empty object', () => {
    expect(invitationPublicStatus({ ...LIVE, config: {} }, NOW)).toBe('not_ready')
  })

  it('not_ready when the config is null', () => {
    expect(invitationPublicStatus({ ...LIVE, config: null }, NOW)).toBe('not_ready')
  })

  it('not not_ready when the config has content', () => {
    expect(invitationPublicStatus({ ...LIVE, config: { meta: {} } }, NOW)).toBe('live')
  })

  describe('precedence', () => {
    it('refunded beats suspended (every refund also sets suspended_at)', () => {
      expect(
        invitationPublicStatus({ ...LIVE, suspended_at: PAST }, NOW, { isRefunded: true }),
      ).toBe('refunded')
    })

    it('expired beats suspended (the public page checks expiry first)', () => {
      expect(
        invitationPublicStatus({ ...LIVE, expires_at: PAST, suspended_at: PAST }, NOW),
      ).toBe('expired')
    })

    it('suspended beats unpaid', () => {
      expect(
        invitationPublicStatus({ ...LIVE, suspended_at: PAST, is_paid: false }, NOW),
      ).toBe('suspended')
    })

    it('unpaid beats unpublished (paying is the actionable step)', () => {
      expect(
        invitationPublicStatus({ ...LIVE, is_paid: false, is_published: false }, NOW),
      ).toBe('unpaid')
    })

    it('unpublished beats not_ready', () => {
      expect(
        invitationPublicStatus({ ...LIVE, is_published: false, config: {} }, NOW),
      ).toBe('unpublished')
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/invitations/__tests__/public-status.test.ts
```

Expected: FAIL — `Failed to resolve import "../public-status"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/invitations/public-status.ts`:

```ts
/**
 * One shared answer to "what does a guest see on this invitation right now?".
 *
 * The public page gates a guest on four columns plus a content check
 * (src/app/[template]/[slug]/page.tsx). Before this module existed that logic was
 * hand-rolled per surface, and /profile only ever checked two of them — so a
 * suspended or unpublished invitation still reported "Aktif seumur hidup".
 *
 * Pure on purpose: no I/O, no 'server-only'. The refund verdict lives in the
 * `refunds` ledger, so callers pass it in (they already batch-fetch it via
 * fetchRefundedMap / fetchRefundedAt).
 *
 * This does NOT replace activePeriodStatus. That one answers the billing question
 * (draft / active until / lifetime / expired); this one answers visibility. Both
 * are shown on the profile card.
 *
 * Not included, deliberately:
 * - `archived_at` — despite the 2026-07-04 spec listing it, archive does not affect
 *   public visibility (the public page never selects it; the admin copy describes it
 *   as list-hiding plus bookkeeping retention). If archive ever becomes a real
 *   takedown, THIS is the single place to add it.
 * - `pii_erased_at` — always written together with is_published=false, so
 *   'unpublished' already covers it, and owner_user_id is nulled so no owner sees
 *   the row at all.
 */

export type PublicStatus =
  | 'live'
  | 'refunded'
  | 'suspended'
  | 'expired'
  | 'unpaid'
  | 'unpublished'
  | 'not_ready'

export interface PublicStatusInput {
  is_paid?: boolean
  is_published?: boolean
  expires_at?: string | null
  suspended_at?: string | null
  config?: unknown
}

/** Same emptiness test the public page uses before rendering NotReadyInvitationView. */
function isConfigEmpty(config: unknown): boolean {
  if (!config || typeof config !== 'object') return true
  return Object.keys(config as Record<string, unknown>).length === 0
}

export function invitationPublicStatus(
  inv: PublicStatusInput,
  nowMs: number,
  opts?: { isRefunded?: boolean },
): PublicStatus {
  // Refund first: reverseEntitlement sets suspended_at on every refund, so without
  // this a refunded invitation would report as a plain admin takedown. The dashboard
  // already applies this same precedence.
  if (opts?.isRefunded) return 'refunded'

  // Expiry before suspension — that is the order the public page checks in, and an
  // expired page is what the guest actually gets.
  if (inv.expires_at && Date.parse(inv.expires_at) < nowMs) return 'expired'
  if (inv.suspended_at) return 'suspended'

  // The public gate is `is_published && is_paid`. Split here for the owner's benefit,
  // unpaid first because paying is the step that unblocks everything else.
  if (!inv.is_paid) return 'unpaid'
  if (!inv.is_published) return 'unpublished'

  if (isConfigEmpty(inv.config)) return 'not_ready'
  return 'live'
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/invitations/__tests__/public-status.test.ts
```

Expected: PASS — 16 tests.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invitations && git commit -m "feat(invitations): add the shared public-status resolver

Folds is_paid + is_published + expires_at + suspended_at + config and a
caller-supplied refund flag into one verdict, in the same precedence order
the public page's own gates use. Specced 2026-07-04, never built.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Status copy (id + en)

**Files:**
- Modify: `src/lib/i18n/dictionaries/common.ts` (insert after the `activePeriod` block in each locale — currently ending at line 50 for `id` and line 112 for `en`)
- Test: `src/lib/i18n/__tests__/dict-parity.test.ts` (exists; no edit needed)

**Interfaces:**
- Consumes: nothing.
- Produces: `t.common.invitationStatus` with keys `live`, `suspended`, `unpublishedNote`, `notReadyNote`, `expiredNote`, `suspendedNote`, `refundedNote` — all strings, both locales. Task 3 reads these.

- [ ] **Step 1: Add the `id` block**

In `src/lib/i18n/dictionaries/common.ts`, immediately after the `id` locale's `activePeriod: { … },` block and before `invitationNotFound:`, insert:

```ts
    invitationStatus: {
      live: 'Tayang',
      suspended: 'Diblokir',
      unpublishedNote: 'Belum dipublikasikan — tamu belum bisa membuka undangan ini. Terbitkan dari dashboard.',
      notReadyNote: 'Isi undangan masih kosong — tamu melihat halaman "Undangan belum siap".',
      expiredNote: 'Masa aktif sudah berakhir — tamu melihat halaman kadaluarsa. Perpanjang untuk menayangkannya lagi.',
      suspendedNote: 'Diblokir admin — tamu tidak bisa membuka undangan ini. Hubungi dukungan untuk keterangan lebih lanjut.',
      refundedNote: 'Dana sudah dikembalikan — undangan ditutup permanen.',
    },
```

- [ ] **Step 2: Add the `en` block**

In the same file, immediately after the `en` locale's `activePeriod: { … },` block and before its `invitationNotFound:`, insert:

```ts
    invitationStatus: {
      live: 'Live',
      suspended: 'Blocked',
      unpublishedNote: 'Not published — guests can’t open this invitation yet. Publish it from the dashboard.',
      notReadyNote: 'The content is still empty — guests see an “invitation not ready” page.',
      expiredNote: 'The active period has ended — guests see an expired page. Renew to bring it back.',
      suspendedNote: 'Blocked by an admin — guests can’t open this invitation. Contact support to find out more.',
      refundedNote: 'Refunded — this invitation is permanently closed.',
    },
```

- [ ] **Step 3: Run the parity test**

```bash
npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts
```

Expected: PASS. If it fails with a key-path diff, a key is missing or misspelled in one locale — fix the spelling rather than deleting the key.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. (`Dict` is inferred from the `id` tree, so a typo in `id` surfaces as a missing-property error in Task 3, not here.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/dictionaries/common.ts && git commit -m "i18n(common): add invitation visibility status copy

Chip labels plus one explanation sentence per blocking verdict. Each sentence
names the consequence to guests rather than the column behind it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Honest status on the profile card

**Files:**
- Modify: `src/app/profile/page.tsx` — query (line 39 + its type on line 43), the row map (lines 158-171), and the style consts at the bottom (`periodChip` line 269)

**Interfaces:**
- Consumes: `invitationPublicStatus`, `PublicStatus` from `@/lib/invitations/public-status`; `t.common.invitationStatus` from Task 2.
- Produces: a `publicStatus` value per row, passed to `InvitationActions` in Task 4.

- [ ] **Step 1: Add `suspended_at` to the query**

Line 39 — add `suspended_at` to the select list:

```ts
    .select('id, slug, template_id, plan, is_paid, expires_at, config, paid_source, paid_channel, is_published, paid_at, used_at, published_at, suspended_at')
```

Line 43 — add it to the inline row type, immediately after `published_at: string | null`:

```ts
    data: { id: string; slug: string; template_id: string | null; plan: string | null; is_paid: boolean; expires_at: string | null; config: any; paid_source: string | null; paid_channel: string | null; is_published: boolean; paid_at: string | null; used_at: string | null; published_at: string | null; suspended_at: string | null }[] | null
```

Every other resolver input (`is_paid`, `is_published`, `expires_at`, `config`) is already selected, and `refundedMap` is already computed at line 56 — so this is the only extra data the whole feature needs. No new round-trip.

- [ ] **Step 2: Import the resolver**

Add after the existing `activePeriodStatus` import (line 6):

```ts
import { invitationPublicStatus, type PublicStatus } from '@/lib/invitations/public-status'
```

- [ ] **Step 3: Add the note lookup next to `periodLabel`**

Immediately after the `periodLabel` function (which ends at line 111), add:

```ts
  const st = t.common.invitationStatus

  /** The one-line explanation for a verdict that blocks or delays guests. */
  const statusNote = (s: PublicStatus): string | null => {
    switch (s) {
      case 'unpublished': return st.unpublishedNote
      case 'not_ready':   return st.notReadyNote
      case 'expired':     return st.expiredNote
      case 'suspended':   return st.suspendedNote
      case 'refunded':    return st.refundedNote
      // 'unpaid' already has the "Draf — belum dibayar" chip and a Bayar button.
      default: return null
    }
  }
```

- [ ] **Step 4: Render the chips and the note**

Replace the row body (lines 158-171, from `const tt = tmpl(...)` through the closing `</span>` of the label column) with:

```tsx
                const tt = tmpl(inv.template_id)
                const periodStatus = activePeriodStatus(inv, now).status
                const isRefunded = refundedMap.has(inv.id)
                const publicStatus = invitationPublicStatus(inv, now, { isRefunded })
                const note = statusNote(publicStatus)
                // Refunded and suspended are terminal — the billing period is moot,
                // and "Aktif seumur hidup" sitting next to "Diblokir" is exactly the
                // contradiction this card exists to stop printing.
                const terminal = publicStatus === 'refunded' || publicStatus === 'suspended'
                return (
                  <li key={inv.slug} style={item}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={itemSlug}>{inv.slug}</span>
                      <span style={chipRow}>
                        {publicStatus === 'refunded' && <span style={refundedBadge}>{ap.refunded}</span>}
                        {publicStatus === 'suspended' && <span style={blockedBadge}>{st.suspended}</span>}
                        {!terminal && <span style={periodChip}>{periodLabel(inv)}</span>}
                        {publicStatus === 'live' && <span style={liveBadge}>{st.live}</span>}
                      </span>
                      {note && <span style={terminal ? noteDanger : noteWarn}>{note}</span>}
                    </span>
```

- [ ] **Step 5: Update the styles**

The chips now sit in a flex row, so the optical `-10` inset moves from the chip to the row. In the style block at the bottom of the file, change `periodChip` (line 269) to drop its `marginLeft`:

```ts
const periodChip: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  background: 'var(--border-subtle)',
  padding: '3px 10px',
  borderRadius: 'var(--radius-pill)',
  alignSelf: 'flex-start',
}
```

Then add these consts immediately after `refundedBadge` (which ends at line 283):

```ts
// Chips share one row; the -10 optical inset that used to live on periodChip moves
// here so the first chip's text still lines up with the card's content padding.
const chipRow: React.CSSProperties = {
  display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginLeft: -10,
}
const liveBadge: React.CSSProperties = {
  ...periodChip,
  color: 'var(--status-success-text)',
  background: 'var(--status-success-soft)',
  fontWeight: 600,
}
const blockedBadge: React.CSSProperties = {
  ...periodChip,
  color: 'var(--status-danger)',
  background: 'var(--status-danger-soft)',
  fontWeight: 600,
}
const noteBase: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
}
const noteWarn: React.CSSProperties = {
  ...noteBase,
  color: 'var(--status-error-dark)',
  background: 'var(--status-error-soft)',
}
const noteDanger: React.CSSProperties = {
  ...noteBase,
  color: 'var(--status-danger)',
  background: 'var(--status-danger-soft)',
}
```

`refundedBadge` already spreads `periodChip`, so it loses the stale `marginLeft` automatically.

- [ ] **Step 6: Typecheck and token check**

```bash
npm run typecheck
```

Expected: no errors. If `st.suspended` errors as missing, Task 2's `id` block has a typo — fix it there.

```bash
npm run check:tokens
```

Expected: clean. It also scans inline styles in `.tsx`, so a raw hex or a literal `999px` here would fail.

- [ ] **Step 7: Commit**

```bash
git add src/app/profile/page.tsx && git commit -m "fix(profile): report the status guests actually see

The card read is_paid + expires_at only, so a suspended, unpublished, or
empty-config invitation still said \"Aktif seumur hidup\" while guests got a
takedown page, a 404, or a \"belum siap\" notice. It now resolves visibility
through invitationPublicStatus and explains what a blocked guest hits.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Stop offering dead-end actions

**Files:**
- Modify: `src/app/profile/InvitationActions.tsx` — props (lines 26-70), `needsAction` (line 71), the `all` array (lines 109-115)
- Modify: `src/app/profile/page.tsx` — the `<InvitationActions>` call (line 179)

**Interfaces:**
- Consumes: `PublicStatus` (type-only) from `@/lib/invitations/public-status`; the `publicStatus` value computed in Task 3.
- Produces: nothing downstream.

For a suspended or refunded invitation, "Lihat undangan" opens a takedown page and "Bayar sekarang" offers to pay for something that cannot be published. "Buka dashboard" stays — the dashboard renders `SuspendedNotice` / `RefundedNotice`, which is where the owner learns what happened.

- [ ] **Step 1: Swap the prop**

In `src/app/profile/InvitationActions.tsx`, add the type-only import beside the existing ones (after line 12):

```ts
import type { PublicStatus } from '@/lib/invitations/public-status'
```

In the destructured params (lines 26-41), replace `isRefunded = false,` with `publicStatus,`.

In the props type (lines 42-69), replace these three lines:

```ts
  // Fully-refunded (succeeded refund of the initial purchase): the invitation is
  // suspended/unpublished, so the pay/renew CTA and the recheck-payment fallback
  // must not offer to pay again even if periodStatus reads 'draft'/'expired'.
  isRefunded?: boolean
```

with:

```ts
  // Guest-visibility verdict. 'refunded' and 'suspended' mean the invitation is
  // permanently or administratively down, so the pay/renew CTA, the recheck-payment
  // fallback, and the "Lihat undangan" link all lead nowhere and are withheld.
  publicStatus: PublicStatus
```

- [ ] **Step 2: Derive the gates from the verdict**

Replace line 71:

```ts
  const needsAction = !isRefunded && (periodStatus === 'draft' || periodStatus === 'expired')
```

with:

```ts
  const isDown = publicStatus === 'refunded' || publicStatus === 'suspended'
  const needsAction = !isDown && (periodStatus === 'draft' || periodStatus === 'expired')
```

- [ ] **Step 3: Withhold the view link when it dead-ends**

In the `all` array (lines 109-115), replace the `view` entry:

```ts
    { key: 'view', primary: false, node: viewEl },
```

with:

```ts
    ...(isDown ? [] : [{ key: 'view', primary: false, node: viewEl }]),
```

The rest of the array is unchanged. Collapse behaviour needs no edit — `collapsible`, `primaries` and `hiddenCount` are all derived from `all.length`, so dropping an entry just re-sizes the collapsed set.

- [ ] **Step 4: Update the call site**

In `src/app/profile/page.tsx`, replace line 179:

```tsx
                      isRefunded={isRefunded}
```

with:

```tsx
                      publicStatus={publicStatus}
```

`isRefunded` is still used on line 161 to feed the resolver, so leave that binding in place.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. A leftover `isRefunded={...}` anywhere would surface here as an unknown-prop error — `src/app/profile/page.tsx` is the only call site.

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/InvitationActions.tsx src/app/profile/page.tsx && git commit -m "fix(profile): withhold actions that dead-end on a downed invitation

A suspended or refunded card offered \"Lihat undangan\" (a takedown page) and,
when unpaid, a pay button for something publish would refuse anyway. The
verdict now drives which actions appear; isRefunded is subsumed by it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Full verification

**Files:** none modified — this task is the gate.

- [ ] **Step 1: Run the whole unit suite**

```bash
npm run test
```

Expected: all green, including `public-status.test.ts` (16 new tests) and `dict-parity.test.ts`. `active-period.test.ts` must still pass untouched — if it fails, `activePeriodStatus` was modified and should be reverted; this change does not touch it.

- [ ] **Step 2: Typecheck and token guardrail**

```bash
npm run typecheck && npm run check:tokens
```

Expected: both clean.

- [ ] **Step 3: Render the page**

Start the dev server through the preview tooling (never `npm run dev` via a shell tool), open `/profile` signed in as an account that owns at least one invitation, and confirm with `read_page`:

- a live invitation shows its period chip plus a "Tayang" chip and no explanation row
- no card shows both a period chip and a "Diblokir" / "Sudah direfund" chip
- `read_console_messages` reports no errors

- [ ] **Step 4: Exercise the states that have no fixture**

Verified states need rows in the states being fixed. Using `/admin/invitations` against the local database, on a throwaway invitation:

1. Press **Blokir** → reload `/profile` → the card must show "Diblokir" with the danger row and no period chip, and must not offer "Lihat undangan".
2. Press **Buka blokir** → reload → the card returns to its previous chips.
3. From the invitation's own dashboard, toggle publish **off** → reload `/profile` → the card keeps its period chip and gains the warning row about not being published.
4. Toggle publish back **on** → reload → the "Tayang" chip returns.

Screenshot the blocked and unpublished states for the summary.

- [ ] **Step 5: Commit any fixes and report**

If steps 3-4 surfaced a defect, fix it, re-run steps 1-2, and commit. Then report: which states were exercised against a real row, which were covered by unit tests only, and anything left unverified.

---

## Follow-ups this plan deliberately does not build

Recorded in the spec's section 4; do not fold them into this branch.

1. Convert the four remaining hand-rolled call sites (public page, metadata builder, dashboard gate, admin list) onto the resolver. All four are behaviourally correct today; switching them touches the public render path and needs its own testing pass.
2. `/profile` still does not select `archived_at` — harmless while archive is list-hiding only.
3. The publish API does not check `is_paid`. No leak results (the public gate still requires it) and `PaymentGate` keeps the toggle unreachable.
4. `plan_upgrades` / `quota_addons` rows in `pending` state are invisible on `/profile`.
5. "Menunggu pembayaran" is not distinguishable from "draft" without querying Midtrans, because `gateway_order_id` is never cleared after an abandoned checkout.
