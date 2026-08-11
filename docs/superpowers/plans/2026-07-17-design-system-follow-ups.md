# Design-System Follow-Ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the documented follow-ups from the 2026-07-16 hardening plan: unify the remaining independent button implementations (marketing/auth/editor), give /admin a toast system, make admin tables responsive, tokenize WeddingGift's ad-hoc values, adopt `--radius-round` + the spacing scale mechanically, and land the small a11y/consistency fixes (BooleanField, Escape-while-busy, InvitationRow anchor).

**Architecture:** Extend the existing `src/components/ui/` layer (add `ButtonLink`, promote `FeedbackProvider` + a responsive `table.module.css` out of the dashboard) with re-export shims so no consumer churn. Marketing hero CTAs are deliberately NOT flattened onto `<Button>` — they consolidate into one shared marketing CSS module instead (brand moment stays, duplication dies). Sweeps are equal-value-only (zero visual change by construction), enforced afterward by new guard rules.

**Tech Stack:** Next.js 14 (App Router), React 18.3, CSS Modules + tokens (NO UI libraries), vitest + jsdom (`/** @vitest-environment jsdom */` docblocks, `classNameStrategy: 'non-scoped'`).

## Global Constraints

- **No new UI libraries.** CSS Modules + tokens only.
- **Radius scale:** 4/8/16/24/999/50% via `--radius-*`; **control heights:** 36/44/52 via `--ctl-h-*`.
- **`'use client'`** on every component/hook file in `src/components/ui/`.
- **Zero visual change** in Tasks 8, 9, 10 (equal-value swaps only). Tasks 2, 3, 4, 11 contain **documented intentional** visual unifications listed inline — nothing undocumented.
- **Shims over churn:** old import paths keep working (`components/dashboard/FeedbackProvider`, `components/dashboard/feedback`).
- Baseline gates: typecheck + **649 tests / 95 files** + `check:tokens` clean. After every task: `npm run typecheck && npm run test && npm run check:tokens` green.
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Never `git add -A`** — the tree has pre-existing untracked files; stage explicitly.

**Out of scope (still):** Solary `themes.css` (self-contained per-template palette, documented exemption); rounding OFF-scale spacing values (6/10/14/18/20/22px…) to tokens — that is a design decision, not a sweep; template-section CSS spacing (deliberate optical values); admin i18n.

## File Structure

```
src/components/ui/
├── Button.tsx                     ← MODIFY: add ButtonLink (Task 1)
├── FeedbackProvider.tsx           ← NEW: decoupled toast provider (Task 5)
├── FeedbackProvider.module.css    ← NEW: moved styles (Task 5)
├── feedback.ts                    ← NEW: moved reducer/helpers (Task 5)
├── table.module.css               ← NEW: responsive table pattern (Task 7)
└── __tests__/ButtonLink.test.tsx · Feedback.test.tsx
src/components/marketing/cta.module.css   ← NEW: shared hero-CTA classes (Task 2)
src/components/dashboard/FeedbackProvider.tsx ← becomes dict-aware wrapper + re-export (Task 5)
src/components/dashboard/feedback.ts          ← becomes re-export shim (Task 5)
scripts/lib/token-rules.mjs        ← MODIFY: radius-round rules (Task 9)
```

---

### Task 1: `ButtonLink` — link-capable twin of `<Button>` (TDD)

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Test: `src/components/ui/__tests__/ButtonLink.test.tsx`

**Interfaces:**
- Consumes: existing `controls.module.css` classes (btn/primary/ghost/danger/ghostDanger/sm/md).
- Produces: `<ButtonLink href variant? size? ...anchorProps>` — renders a **next/link `<Link>`** styled identically to `<Button>`; default `variant="primary" size="md"`; forwards ref; supports `target`/`rel`. Tasks 3 and 11 consume it. Also add `textDecoration: none` need: the `.btn` class must not show underline on anchors — add `text-decoration: none;` to `.btn` in `controls.module.css` (no effect on buttons).

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { ButtonLink } from '../Button'

afterEach(() => cleanup())

describe('<ButtonLink>', () => {
  it('renders an anchor with href and button classes', () => {
    render(<ButtonLink href="/reset-password">Lanjut</ButtonLink>)
    const a = screen.getByRole('link', { name: 'Lanjut' })
    expect(a.getAttribute('href')).toBe('/reset-password')
    expect(a.className).toContain('btn')
    expect(a.className).toContain('primary')
    expect(a.className).toContain('md')
  })

  it('applies ghost/sm variant classes and passes target/rel through', () => {
    render(<ButtonLink href="/x" variant="ghost" size="sm" target="_blank" rel="noreferrer">Lihat</ButtonLink>)
    const a = screen.getByRole('link', { name: 'Lihat' })
    expect(a.className).toContain('ghost')
    expect(a.className).toContain('sm')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noreferrer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/ButtonLink.test.tsx`
Expected: FAIL — `ButtonLink` not exported.

- [ ] **Step 3: Implement**

In `src/components/ui/Button.tsx`, add below the existing `Button` (reusing its `variantClass`/`sizeClass` maps and `styles` import):

```tsx
import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

export interface ButtonLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * Link styled as the shared Button — for navigations that look like actions
 * (auth "continue" links, admin "Lihat"). Same classes, same state matrix.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', size = 'md', className, ...rest },
  ref,
) {
  const cls = [styles.btn, variantClass[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(' ')
  return <Link ref={ref} className={cls} {...rest} />
})
```

And in `src/components/ui/controls.module.css`, add one line to the `.btn` rule:

```css
  text-decoration: none;
```

- [ ] **Step 4: Run test to verify it passes** — 2 passed; existing Button tests still 5 passed.
- [ ] **Step 5: Full gates + commit**

```bash
git add src/components/ui
git commit -m "feat(ui): ButtonLink — link styled as the shared Button"
```

---

### Task 2: Consolidate marketing hero CTAs into one shared module

**Files:**
- Create: `src/components/marketing/cta.module.css`
- Modify: `src/components/marketing/Hero.module.css` (delete `.primary`, `.secondary`, `.btnArrow`), `Hero.tsx`
- Modify: `src/components/marketing/FinalCta.module.css` (delete `.cta`, `.arrow`), `FinalCta.tsx`

**Interfaces:**
- Produces: classes `cta.module.css` → `.cta` (charcoal→coral pill with hover lift + accent shadow), `.ctaSecondary` (ghost pill with hover lift), `.arrow` (translateX micro-anim on hover). Consumed only by Hero/FinalCta (`<Link>` elements).

Deliberate unification (document in commit): Hero `.primary` rest shadow `--shadow-sm` and FinalCta `.cta` rest shadow `--shadow-btn` merge to **`--shadow-btn`**; Hero's `.btnArrow { font-size: 14px }` kept.

- [ ] **Step 1: Create `cta.module.css`** (merged from the two verbatim sources):

```css
/* Shared marketing hero-CTA pair — consolidated from Hero.module.css (.primary/
   .secondary/.btnArrow) and FinalCta.module.css (.cta/.arrow), which were
   near-identical duplicates. These are LINK CTAs (brand moments with hover lift
   + arrow micro-animation) — deliberately not the shared <Button>. */

.cta {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: var(--weight-semibold);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: var(--color-charcoal);
  color: var(--color-cream);
  height: var(--ctl-h);
  padding: 0 24px;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-btn);
  transition:
    background var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  gap: var(--space-2);
  text-decoration: none;
}
.cta:hover {
  transform: translateY(-2px);
  background: var(--color-coral);
  box-shadow: var(--shadow-btn-accent-hover);
}
.cta:active { transform: translateY(0); }

.ctaSecondary {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: var(--weight-semibold);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-charcoal);
  height: var(--ctl-h);
  padding: 0 24px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-decoration: none;
  transition:
    background var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-in-out);
}
.ctaSecondary:hover {
  border-color: var(--interactive-primary);
  color: var(--interactive-primary-hover);
  background: var(--interactive-primary-soft);
  transform: translateY(-1.5px);
}
.ctaSecondary:active { transform: translateY(1px); }

.arrow {
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  line-height: 1;
  transition: transform 0.3s ease;
}
.cta:hover .arrow { transform: translateX(4px); }

@media (prefers-reduced-motion: reduce) {
  .cta, .ctaSecondary, .arrow { transition: none; }
  .cta:hover, .ctaSecondary:hover { transform: none; }
  .cta:hover .arrow { transform: none; }
}
```

- [ ] **Step 2: Rewire Hero.tsx** — `import cta from './cta.module.css'`; `className={styles.primary}` → `className={cta.cta}`, `styles.btnArrow` → `cta.arrow`, `styles.secondary` → `cta.ctaSecondary`. Delete the `.primary`, `.primary:hover`, `.primary:active`, `.btnArrow`, `.primary:hover .btnArrow`, `.secondary*` rules from `Hero.module.css` (check no other selector references them, e.g. a parent `.actions .primary` — grep the module first).
- [ ] **Step 3: Rewire FinalCta.tsx** — same: `cta.cta` + `cta.arrow`; delete `.cta*`/`.arrow` rules from `FinalCta.module.css`.
- [ ] **Step 4: Verify** — gates green; `npm run dev` optional visual check of `/` hero + final CTA (hover lift + arrow slide intact).
- [ ] **Step 5: Commit** — `refactor(marketing): one shared hero-CTA module for Hero + FinalCta (rest shadow unified to --shadow-btn)`

---

### Task 3: Migrate auth surfaces to `<Button>`/`<ButtonLink>`, delete AuthChrome button classes

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx:308`, `src/app/login/LoginForm.tsx:134,173`, `src/app/signup/SignupForm.tsx:236-243`, `src/app/verify-signup/page.tsx:150`, `src/app/forgot-password/page.tsx:81-96,118`, `src/app/reset-password/page.tsx:286`
- Modify: `src/components/site/AuthChrome.module.css` (delete `.authPrimaryBtn`/`.authGhostBtn`; keep `.home`/`.homeIcon` etc.)

**Interfaces:**
- Consumes: `Button`, `ButtonLink` from `@/components/ui/Button`. Auth is a public surface → **`size="md"` (44px)**, matching the old height.

Substitution map (exact):

| Site | Old | New |
|---|---|---|
| OnboardingForm:308 `<button type="submit" className={authStyles.authPrimaryBtn} disabled={…} style={{marginTop:8}}>` | | `<Button type="submit" disabled={…} style={{ marginTop: 8 }}>` |
| LoginForm:134 MFA verify `<button type="button">` | | `<Button style={{ marginTop: 8 }} onClick={verifyMfa}>` |
| LoginForm:173 submit | | `<Button type="submit" disabled={submitting} style={{ marginTop: 8 }}>` |
| SignupForm:236 submit | | `<Button type="submit" disabled={submitting \|\| consentMissing} style={{ marginTop: 8 }}>` |
| verify-signup:150 submit | | `<Button type="submit" disabled={submitting}>` |
| forgot-password:81 `<Link className={authStyles.authPrimaryBtn} …>` | | `<ButtonLink href={…}>` (drop the now-redundant inline textDecoration/display props; keep layout-only ones) |
| forgot-password:90 `<Link className={authStyles.authGhostBtn}>` | | `<ButtonLink variant="ghost" href={…}>` |
| forgot-password:94 `<button className={authStyles.authGhostBtn}>` | | `<Button variant="ghost" onClick={…}>` |
| forgot-password:118 submit | | `<Button type="submit" disabled={submitting}>` |
| reset-password:286 submit | | `<Button type="submit" disabled={submitting}>` |

Deliberate unifications (commit message): letter-spacing 0.16em→0.12em, hover lift dropped (token shadow `--shadow-btn-accent` instead), ghost font 11px→13px, disabled opacity 0.55→0.5. If a page imports `authStyles` ONLY for these classes, drop the import.

- [ ] **Step 1:** Apply the map file-by-file (read each file first; keep handlers/disabled/labels identical).
- [ ] **Step 2:** Delete `.authPrimaryBtn`/`.authGhostBtn` (and their state rules) from `AuthChrome.module.css`; grep `authPrimaryBtn|authGhostBtn` → must be zero.
- [ ] **Step 3:** Gates green. Manual: `/login` Tab-through shows focus ring (these buttons never had `:focus-visible` before — net a11y win).
- [ ] **Step 4:** Commit — `refactor(auth): shared Button/ButtonLink across auth pages; delete AuthChrome button classes`

---

### Task 4: Editor buttons → `<Button>` (SaveBar, RemoteChangeBanner, ImageField)

**Files:**
- Modify: `src/editor/SaveBar.tsx` (`.saveBtn` at :50-57, `.bannerReload` at :77-79), `src/editor/SaveBar.module.css`
- Modify: `src/editor/fields/ImageField.tsx:94,97`, `src/editor/fields/ImageField.module.css`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/Button`, always `size="sm"` (editor is dense; saveBtn already 36px).

Deliberate unifications (commit message): saveBtn/bannerReload/ImageField `.btn` hover changes from charcoal-darken to the canonical **charcoal→coral** (matches dashboardControls + landing); ImageField buttons grow from intrinsic ~34px/11px font to 36px/13px (on-scale); `cursor: progress` on uploading is lost (disabled state still shows).

- [ ] **Step 1: SaveBar.tsx** — replace both buttons with `<Button size="sm" …>`. In `SaveBar.module.css`: delete `.saveBtn` rules; the shared base selector `.switch, .saveBtn { … }` becomes `.switch { … }` (copy retains font-family/border/cursor/transition); delete `.bannerReload` visual rules (keep any layout-only wrapper rules); update the `prefers-reduced-motion` block's selector list accordingly.
- [ ] **Step 2: ImageField.tsx** — `styles.btn` → `<Button size="sm" disabled={isUploading}>`, `styles.btnGhost` → `<Button size="sm" variant="ghost">`. Delete `.btn`/`.btnGhost` (+ state rules) from `ImageField.module.css`; keep `.dropEmpty`/`.thumbZone` (drop-zone affordances, not buttons).
- [ ] **Step 3:** Gates green; grep `saveBtn|btnGhost` in src/editor → only legitimate leftovers (none expected in these two files).
- [ ] **Step 4:** Commit — `refactor(editor): SaveBar + ImageField buttons on shared Button (hover unified to coral)`

---

### Task 5: Promote FeedbackProvider to `src/components/ui/` (decoupled from dashboard i18n)

**Files:**
- Create: `src/components/ui/feedback.ts` (move content of `src/components/dashboard/feedback.ts` verbatim)
- Create: `src/components/ui/FeedbackProvider.module.css` (move content verbatim)
- Create: `src/components/ui/FeedbackProvider.tsx`
- Modify → wrapper/shim: `src/components/dashboard/FeedbackProvider.tsx`, `src/components/dashboard/feedback.ts`
- Test: `src/components/ui/__tests__/Feedback.test.tsx`

**Interfaces:**
- Produces: `FeedbackProvider({ children, defaults?: { ok: string; fail: string } })` — defaults `{ ok: 'Berhasil', fail: 'Gagal' }`; hook `useFeedback(): { ok(m?), fail(m?) }`. **Identical context API** to today, so the 17 dashboard/editor consumers keep working through the wrapper.
- The ui provider must NOT import anything from `src/app/**`.

- [ ] **Step 1: Failing test**

```tsx
/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { FeedbackProvider, useFeedback } from '../FeedbackProvider'

afterEach(() => cleanup())

function Trigger() {
  const fb = useFeedback()
  return (
    <>
      <button onClick={() => fb.ok('Tersimpan')}>ok</button>
      <button onClick={() => fb.fail()}>fail</button>
    </>
  )
}

describe('<FeedbackProvider> (ui)', () => {
  it('shows a polite status toast with the given message', () => {
    render(<FeedbackProvider><Trigger /></FeedbackProvider>)
    fireEvent.click(screen.getByText('ok'))
    const toast = screen.getByRole('status')
    expect(toast.textContent).toContain('Tersimpan')
  })

  it('fail toast is an assertive alert and uses the default copy', () => {
    render(<FeedbackProvider defaults={{ ok: 'Beres', fail: 'Gagal, coba lagi' }}><Trigger /></FeedbackProvider>)
    fireEvent.click(screen.getByText('fail'))
    const alert = screen.getByRole('alert')
    expect(alert.getAttribute('aria-live')).toBe('assertive')
    expect(alert.textContent).toContain('Gagal, coba lagi')
  })
})
```

- [ ] **Step 2:** RED (module missing).
- [ ] **Step 3: Implement.** `src/components/ui/FeedbackProvider.tsx` = the current dashboard file with two changes: import `./feedback` + `./FeedbackProvider.module.css`; replace the `useDashboardDict()` coupling:

```tsx
export interface FeedbackDefaults { ok: string; fail: string }
const FALLBACK: FeedbackDefaults = { ok: 'Berhasil', fail: 'Gagal' }

export function FeedbackProvider({ children, defaults }: { children: ReactNode; defaults?: FeedbackDefaults }) {
  const d = defaults ?? FALLBACK
  // …identical body, with `m || fb.ok` → `m || d.ok`, `m || fb.fail` → `m || d.fail`
}
```

(Keep `FeedbackApi`, aria-live/role logic, reducer usage, TTL, reduced-motion — verbatim.)

`src/components/dashboard/FeedbackProvider.tsx` becomes the dict-aware wrapper (consumers unchanged):

```tsx
'use client'

/**
 * Shim — the toast system was promoted to src/components/ui/FeedbackProvider
 * (2026-07 follow-ups) so /admin can use it too. This wrapper keeps the
 * dashboard's i18n default copy and the old import path for ~17 consumers.
 */
import { type ReactNode } from 'react'
import { FeedbackProvider as UiFeedbackProvider } from '@/components/ui/FeedbackProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'

export { useFeedback, type FeedbackApi } from '@/components/ui/FeedbackProvider'

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const fb = useDashboardDict().feedback
  return <UiFeedbackProvider defaults={{ ok: fb.ok, fail: fb.fail }}>{children}</UiFeedbackProvider>
}
```

`src/components/dashboard/feedback.ts` → `export * from '@/components/ui/feedback'`. Delete `src/components/dashboard/FeedbackProvider.module.css` (grep for importers first — should be only the old provider).

- [ ] **Step 4:** GREEN (2 new) + all existing tests green (17 consumers resolve through the wrapper).
- [ ] **Step 5:** Commit — `refactor(ui): promote FeedbackProvider toast system out of dashboard (i18n decoupled, shim kept)`

---

### Task 6: Admin adopts toasts (mount + success feedback, `router.refresh()` instead of `location.reload()`)

**Files:**
- Modify: `src/app/admin/layout.tsx:52-54` — wrap: `<AdminDialogProvider><FeedbackProvider>{children}</FeedbackProvider></AdminDialogProvider>` (import from `@/components/ui/FeedbackProvider`).
- Modify: `src/app/admin/templates/TemplateEditor.tsx`, `src/app/admin/templates/PlansEditor.tsx`, `src/app/admin/payments/PaymentsClient.tsx`, `src/app/admin/users/DeletionRequestRow.tsx`

**Interfaces:**
- Consumes: `useFeedback` from `@/components/ui/FeedbackProvider`; `useRouter` from `next/navigation`.
- Policy: **success → toast (non-blocking); errors and informational blockers STAY as dialogs.** Where success used `location.reload()`, switch to `fb.ok(...)` + `router.refresh()` so the toast survives (server data re-renders, client filter state is preserved — a UX improvement, note in commit).

Substitutions:

| Site | Old | New |
|---|---|---|
| TemplateEditor `setMsg(res.ok ? {ok:true,text:'Tersimpan ✓'} : …)` + inline `<span>` | | `res.ok ? fb.ok('Tersimpan') : fb.fail(res.error \|\| 'Gagal')` — delete the `msg` state + inline span (toast has aria-live the span lacked) |
| PlansEditor same pattern | | same replacement |
| PaymentsClient:103 refund success `location.reload()` | | `fb.ok('Refund diproses'); router.refresh()` (error branch keeps the danger dialog) |
| PaymentsClient:113 backfill success `alertDialog({title:'Selesai',…}); location.reload()` | | `fb.ok(\`Terisi: ${res.updated}, dilewati: ${res.skipped}\`); router.refresh()` |
| DeletionRequestRow:34 process success `location.reload()` | | `fb.ok('Penghapusan diproses'); router.refresh()` |
| DeletionRequestRow:48 reject success `location.reload()` | | `fb.ok('Permintaan ditolak'); router.refresh()` |

Keep untouched: all 5 danger alerts, the grace-period informational alert (DeletionRequestRow:22), UserExportButton (download is its own feedback).

- [ ] **Step 1:** Mount provider in layout; apply substitutions (read each file first; add `const fb = useFeedback()` + `const router = useRouter()` where needed).
- [ ] **Step 2:** Gates green. Manual: save a template in `/admin/templates` → toast appears top-center; refund flow error still shows the blocking dialog.
- [ ] **Step 3:** Commit — `feat(admin): toast feedback (success) via shared FeedbackProvider; router.refresh over location.reload`

---

### Task 7: Responsive admin tables via promoted `ui/table.module.css`

**Files:**
- Create: `src/components/ui/table.module.css`
- Modify: `src/app/admin/payments/PaymentsClient.tsx:137-164,185-186`, `src/app/admin/testimonials/page.tsx:54-66`, `src/app/admin/testimonials/ModerationRow.tsx`

**Interfaces:**
- Produces: classes `.tableWrap`, `.table`, `.tdEllipsis`, `.tdNum` (NEW: right-align + tabular-nums), `.empty` — copied from `tabPanels.module.css` (verbatim: the `.tableWrap/.table/th/td/hover/tablet-tighten/mobile card-collapse (data-label ::before)/.tdEllipsis` rules) plus:

```css
.tdNum { text-align: right; font-variant-numeric: tabular-nums; }
@media (max-width: 767.98px) { .tdNum { text-align: left; } }
```

- Dashboard's `tabPanels.module.css` stays untouched (no churn); this is a copy-promotion, and the header comment of the new file must say it is the canonical shared pattern going forward.

- [ ] **Step 1:** Create the module (copy the rules listed in the exploration notes: `.tableWrap`, `.table` + thead/th/td + hover, `.empty`, `.tdEllipsis` + mobile override, tablet tighten block, mobile card-collapse block with `td::before { content: attr(data-label) }`).
- [ ] **Step 2: PaymentsClient** — replace the `overflowX` div with `className={tbl.tableWrap}`, `<table className={tbl.table}>`, drop the `th`/`td` inline consts, add `data-label` to every td (`Slug/Tipe/Sumber/Status/Jumlah/Tanggal/Aksi`), Jumlah cells get `className={tbl.tdNum}`; keep the refunded-row `opacity` inline and the `colSpan={7}` empty row.
- [ ] **Step 3: testimonials** — `page.tsx`: wrap + class the table, drop inline th styles; `ModerationRow.tsx`: add `data-label="Penulis|Rating|Ulasan|Aksi"` to its tds, long review cell gets `tbl.tdEllipsis`.
- [ ] **Step 4:** Gates green. Manual: `/admin/payments` at 375px width → rows collapse to labeled cards.
- [ ] **Step 5:** Commit — `feat(admin): responsive tables (mobile card collapse) via shared ui/table module`

---

### Task 8: WeddingGift — file-local vars for repeated values (zero visual change)

**Files:**
- Modify: `src/all-templates/lovebirds/sections/WeddingGift/WeddingGift.module.css`

- [ ] **Step 1:** On the file's root class `.section`, define:

```css
.section {
  /* File-local tokens — hoisted from ~26 repeated literals (audit 2026-07-16).
     Gradient endpoint stops below stay literal: unique decorative values. */
  --wg-ink: var(--color-charcoal, #2A2118);
  --wg-on-accent: #fff;
  --wg-mono: 'Courier New', Courier, monospace;
  /* …existing declarations… */
}
```

- [ ] **Step 2:** Replace all 11 `var(--color-charcoal, #2A2118)` → `var(--wg-ink)` (incl. the `!important` ones and the `--fg, #2A2118` fallback inside `color-mix` at L614 → `var(--fg, var(--wg-ink))`); all 13 standalone `#fff` color/background/border-color declarations → `var(--wg-on-accent)`; both `font-family: 'Courier New', Courier, monospace !important` → `font-family: var(--wg-mono) !important`. Leave gradient stops, `#000` at L474, and `#E8553E` fallbacks (they're already `var(--color-coral, …)` form) alone.
- [ ] **Step 3:** Gates green; `grep -c "#2A2118" WeddingGift.module.css` → 0; `grep -c "Courier" ` → 1 (the var definition).
- [ ] **Step 4:** Commit — `refactor(lovebirds): WeddingGift local vars replace repeated ink/white/mono literals`

---

### Task 9: `--radius-round` adoption sweep + guard rules (TDD)

**Files:**
- Modify: `scripts/lib/token-rules.mjs`, `scripts/lib/__tests__/token-rules.test.mjs`
- Modify: the swept source files (guard output is the source of truth; expected ≈44 CSS + 14 inline sites from the exploration list)

Rules (equal value — `--radius-round: 50%`):
- scanCss: flag `border-radius: 50%;` (also `50% !important;`) — but NOT compound values (`50% 0 50% 50%`, `50% 50% … / …`). Regex: `/border-radius\s*:\s*50%\s*(!important\s*)?;/` on lines not starting `--`.
- scanTsx: flag `borderRadius: '50%'` / `"50%"`. Regex: `/\bborderRadius:\s*['"]50%['"]/`.

- [ ] **Step 1: Failing tests** (add to token-rules.test.mjs):

```js
describe('radius-round rules', () => {
  it('flags plain border-radius: 50% in css', () => {
    expect(scanCss('.dot {\n  border-radius: 50%;\n}')).toHaveLength(1)
  })
  it('does not flag compound 50% shapes', () => {
    expect(scanCss('.blob {\n  border-radius: 50% 0 50% 50%;\n}')).toHaveLength(0)
    expect(scanCss('.egg {\n  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;\n}')).toHaveLength(0)
  })
  it('allows var(--radius-round)', () => {
    expect(scanCss('.dot {\n  border-radius: var(--radius-round);\n}')).toHaveLength(0)
  })
  it("flags inline borderRadius: '50%'", () => {
    expect(scanTsx("const dot = { borderRadius: '50%' }")).toHaveLength(1)
  })
})
```

- [ ] **Step 2:** RED → implement the two rules (why-message: `use var(--radius-round)`) → GREEN (token-rules suite 11 + 4 = 15).
- [ ] **Step 3:** Run `npm run check:tokens` → FAILS with the full list; sweep every finding mechanically (`50%` → `var(--radius-round)` in CSS — keep `!important` where present; `'50%'` → `'var(--radius-round)'` inline). Solary/lovebirds template files: swap ONLY the flagged value, nothing else. Re-run until clean.
- [ ] **Step 4:** Full gates green.
- [ ] **Step 5:** Commit — `feat(guard): enforce --radius-round; sweep ~58 border-radius 50% literals`

---

### Task 10: Spacing-scale mechanical sweep (bounded, equal-value only)

**Files:**
- Modify: shared non-template CSS Modules only — `src/components/**/*.module.css`, `src/editor/**/*.module.css`, `src/app/[template]/[slug]/dashboard/*.module.css` (~130 swap sites per the exploration count; concentrated in EditorRoot, dashboardControls, GuestsTab, TutorialTab, dashboard.module.css).

**Rule (strict, zero visual change):** rewrite a `padding`/`margin`/`gap` declaration ONLY when **every** px value in it is on the token scale — 4→`var(--space-1)`, 8→`--space-2`, 12→`--space-3`, 16→`--space-4)`, 24→`--space-5`, 32→`--space-6`, 48→`--space-7`, 64→`--space-8`; `0` stays `0`. Skip: any declaration containing an off-scale px (10/14/18/20/22…), `clamp()`/`calc()`, the `1px` optical button nudges, and ALL files under `src/all-templates/**`. NO rounding of off-scale values — that is out of scope.

- [ ] **Step 1:** Write a one-off scratch script (in the scratchpad dir, not the repo) that lists candidate declarations per the rule, then apply the edits file-by-file (or apply them manually from the script's list — implementer's choice, but the RULE above is binding).
- [ ] **Step 2:** Verify zero visual change by construction: `git diff` must show only px→var swaps inside padding/margin/gap declarations. Gates green.
- [ ] **Step 3:** Commit — `refactor(css): adopt --space-* scale for on-scale spacing literals (equal-value, shared surfaces only)`

---

### Task 11: Small-fix bundle + docs

**Files:**
- Modify: `src/editor/fields/BooleanField.tsx`, `src/editor/fields/fields.module.css`
- Modify: `src/app/[template]/[slug]/dashboard/GuestEditModal.tsx:42`, `GuestImportModal.tsx:28`, `guestbook/WalkInDialog.tsx:43`
- Modify: `src/app/admin/invitations/InvitationRow.tsx:106,129-131`
- Modify: `CLAUDE.md`

- [ ] **Step 1: BooleanField** onto fields.module.css. Add to `fields.module.css`:

```css
/* Checkbox field (BooleanField) — inline label AFTER the control, unlike the
   stacked .label/.control fields. */
.checkRow {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.checkBox { width: 18px; height: 18px; accent-color: var(--interactive-primary); }
.checkBox:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--interactive-primary-soft), 0 0 0 1.5px var(--interactive-primary);
  border-radius: var(--radius-xs);
}
.checkLabel { font-size: 13px; color: var(--text-primary); }
.checkHelp { font-size: 11px; color: var(--text-muted); margin-left: 28px; }
```

Rewrite BooleanField.tsx to use `.field` (wrapper), `.checkRow`, `.checkBox`, `.checkLabel`, `.checkHelp` — delete the four inline consts. (Net a11y win: the checkbox gains a focus ring + coral accent-color; note in commit.)

- [ ] **Step 2: Escape-while-busy** — `useEscapeToClose(onClose, !pending)` in GuestEditModal + GuestImportModal; `useEscapeToClose(onClose, !saving)` in WalkInDialog.
- [ ] **Step 3: InvitationRow anchor** — the "Lihat" `<a>` adopts `className={`${ui.btn} ${ui.sm} ${ui.ghost}`}` (import `ui from '@/components/ui/controls.module.css'`), dropping `style={ghost}` (intentional visual change: pill + uppercase, now matches its Button row siblings). The `<select>` keeps the const — rename `ghost` → `selectCtl` and update its comment (only the select uses it now).
- [ ] **Step 4: CLAUDE.md** — in the shared-controls bullet add: `<ButtonLink>` (link-as-button), `FeedbackProvider` toast (ui-level, admin + dashboard), `table.module.css` responsive table; note the guard now also enforces `--radius-round`.
- [ ] **Step 5:** Gates green (final counts expected ≈ 649 + 2 ButtonLink + 2 Feedback + 4 token-rules = **657 tests**; trust the actual run). Commit — `chore(design): BooleanField on fields module, Escape-busy guards, InvitationRow link pill, docs`

---

## Final acceptance checklist

- [ ] `npm run test:all` (typecheck + vitest + Playwright e2e) — e2e matters this time: auth pages' buttons changed (visual snapshots for login/signup/forgot-password exist under `e2e/visual.spec.ts-snapshots/` and may need regenerating — if snapshot diffs appear, review them: ONLY the documented unifications may differ, then update snapshots).
- [ ] `npm run check:tokens` clean (now incl. radius-round).
- [ ] Manual smoke: `/` hero CTAs (lift + arrow), `/login` (focus rings), `/admin/templates` (toast), `/admin/payments` mobile (card collapse), editor SaveBar (coral hover).
- [ ] Update TEST-REPORT.md run section.
