# "Beli Undangan" plans popup (modal) — marketing landing

> Date: 2026-07-08
> Status: Approved decisions, ready for plan
> Related: [2026-07-03-pricing-source-unify-editor-design.md](2026-07-03-pricing-source-unify-editor-design.md) (the DB→display plan pipeline + admin editor this reuses); [2026-06-30-guest-quota-pricing-design.md](2026-06-30-guest-quota-pricing-design.md) (the quota stepper math this keeps)

## Goal

Turn the "Beli Undangan" button in `VibeExploration` from an **inline
expanding panel** into a **centered modal popup** styled like a modern
AI-subscription pricing comparison (Basic vs Premium side by side, the pricier
plan highlighted "Paling populer", check-icon feature bullets, big price +
optional strikethrough compare-at). The per-card **guest-quota stepper (+/−)
stays** (operator's choice). This is **presentation-only** — no data, pricing,
quota, or admin change.

## Why (verified current state)

- **It is not a popup today.** `VibeExploration.tsx` renders the plans inside an
  `AnimatePresence` block (`height: 0 → auto`) that expands **in place** below
  the "Beli Undangan" button (`plansOpen` state). The button caret is `↓`
  (implies "expand"), not "open dialog".
- **The section is GSAP-pinned + scrubbed.** On desktop the section pins and its
  `inner` is `transform: translateY(...)`-ed while the user scrolls. Because the
  plans live **inside** that transformed subtree, expanding them changes the
  scrubbed height — so the code has to call `ScrollTrigger.refresh()` on
  `plansOpen` and on every per-card quota change (fragile, and it reflows the
  pinned section). Moving the plans into an overlay portaled to `document.body`
  removes this coupling entirely.
- **The card data is 100% admin-driven (the wiring to preserve).** Chain:
  `/admin/templates` → `PlansEditor.tsx` → `updatePlan()` writes
  `template_plans` + `revalidateTag(TEMPLATE_PLANS_TAG)` → `getAllTemplatePlans()`
  → `toPlanDisplay()` → `PlanDisplay[]` → `page.tsx` passes `plans` prop →
  `VibeExploration` builds `displayPlans` → `VibePlanCard`. Operator edits, per
  plan: `display_name`, `price_idr`, `compare_at_price_idr`, `base_guest_quota`,
  `duration_days`, `features[]`.
- **"Deskripsi" = the `features[]` bullets.** Confirmed by the 2026-07-03 spec
  ("the feature bullets ARE the editable plan description") and by the user. No
  separate description field, no schema change.
- **`features[]` is unbounded.** `validatePlanPatch` only requires ≥ 1 non-empty
  feature — no max. Basic and Premium can have very different counts. The new
  card layout must tolerate long **and** unequal lists without clipping.
- **The stepper floor is admin data.** `VibePlanCard`'s stepper uses
  `plan.baseQuota` (= `template_plans.base_guest_quota`) as its `min`; block size
  (50), block price (Rp 10k), and cap (5000) are `lib/payments/quota.ts`
  constants (not admin-editable, by prior decision). The "Pilih paket ini" link
  is `/onboarding?template=X&plan=Y&extra=E`, `E = total − base`.
- **A public modal pattern already exists.** `src/components/legal/LegalModal.tsx`
  — overlay + `role="dialog"` + `aria-modal`, Esc to close, backdrop click to
  close, body-scroll lock. Reuse its shape.

## Approved decisions

- **Popup direction = option 2:** modal styled as AI-pricing cards, **keep** the
  per-card +/− quota stepper with live total.
- **Presentation-only.** No DB migration, no admin-editor change, no new env, no
  change to quota constants or the charge path.
- **"Deskripsi" = existing `features[]` bullets.** No new plan-description field.
- **Portal to `document.body`.** The overlay must not be a descendant of the
  GSAP-transformed section (a `position: fixed` overlay inside a `transform`ed
  ancestor anchors to that ancestor, not the viewport).
- **Palette-themed.** Modal surface/border/accent + CTA colors come from the
  active `palette` (Lovebirds coral, Solary purple), matching the button today.
- **Featured plan** = the one with the highest `amountIDR` (tie → the later one);
  it gets the "Paling populer" badge, a 2px accent border, and a filled CTA. One
  plan only ⇒ no badge, single centered card.
- **Decouple from the pin.** Remove `plansOpen` (and per-card quota) from the
  `ScrollTrigger.refresh()` dependency; the modal stepper no longer calls
  `ScrollTrigger.refresh()`.

## Architecture

The data pipeline is **unchanged** — only the plans **presentation** moves from
an inline panel to a portaled modal. Everything the operator edits still flows
through untouched:

```
   /admin/templates ─ updatePlan() ─► template_plans ─► getAllTemplatePlans()
                                                          │ toPlanDisplay()
                                                          ▼
                          page.tsx ─(plans prop)─► VibeExploration
                                                          │ displayPlans, buyHref, palette
                                                          ▼
                       [Beli Undangan] click ─► PlansModal  (createPortal → document.body)
                                                          │  plans[], buyHref, palette, accentText, t
                                                          ▼
                                              VibePlanCard × N
                                    (badge · price · compare-at · CHECK bullets ·
                                     +/− stepper floored at plan.baseQuota · live total ·
                                     "Pilih paket ini" → /onboarding?…&plan=&extra=)
```

## Pieces

1. **NEW `src/components/marketing/PlansModal.tsx`** (`'use client'`) — the
   overlay + dialog shell, modeled on `LegalModal.tsx`:
   - `createPortal(…, document.body)` so it escapes the pinned/transformed section.
   - Esc closes, backdrop click closes, body-scroll lock while open, `role="dialog"`,
     `aria-modal="true"`, `aria-label={t.plansTitle}`, close "×" (`t.closePlans`).
   - Focus the dialog on open; **restore focus to the trigger button on close.**
   - Header: title `t.plansTitle` + a short subtitle (`t.plansSubtitle`).
   - Body scrolls (`overflow-y:auto`, `max-height ≈ 85vh`) so a tall/uneven plan
     grid never clips. Renders the `.planGrid` of `VibePlanCard`s.
   - Motion: subtle fade/scale in; **`prefers-reduced-motion` ⇒ no animation.**
   - Props: `{ plans: PlanDisplay[]; buyHref: string; palette; accentText: string;
     t: VibeDict; onClose: () => void }`.

2. **EDIT `src/components/marketing/VibePlanCard.tsx`** — restyle to the
   AI-pricing card; **keep all wiring**:
   - Add `featured?: boolean` → "Paling populer" badge (`t.popularBadge`), 2px
     accent border, subtle accent tint, filled CTA (non-featured = outline).
   - Feature list uses a check icon per line; grows with the list (no fixed
     height); card is a flex column so the CTA pins to the bottom while lists of
     different lengths align at the top of the grid row.
   - Keep: compare-at strikethrough; the +/− stepper (buttons-only) with
     `min = plan.baseQuota`, `step = BLOCK_SIZE`, `max = QUOTA_CAP`, live total via
     `quotaAddonAmount`; the `…&plan=${plan.id}&extra=${extra}` href.
   - Drop the `onQuotaChange → ScrollTrigger.refresh()` call (make the prop
     optional / no-op); the stepper is inside an overlay now.

3. **EDIT `src/components/marketing/VibeExploration.tsx`**:
   - "Beli Undangan" button → opens the modal (`setPlansOpen(true)`), `aria-haspopup="dialog"`,
     `aria-expanded={plansOpen}`; drop the `↓` caret.
   - Replace the inline `AnimatePresence` plans block with
     `{plansOpen && <PlansModal plans={displayPlans} buyHref={buyHref} palette={palette}
     accentText={accentText} t={t} onClose={() => setPlansOpen(false)} />}`.
   - Compute `featured` (max `amountIDR`) and pass it through the grid.
   - Remove `plansOpen` from the `ScrollTrigger.refresh()` dependency effect
     (keep `templateIndex`, `paletteIndex`, `category`). Keep resetting
     `plansOpen=false` on template/palette/category switch.

4. **EDIT `src/components/marketing/VibeExploration.module.css`** (or a small
   NEW `PlansModal.module.css`) — overlay, dialog, header, `.planGrid`
   (2 cols → 1 col ≤ ~560px), restyled `.planCard`, `.planBadge`, feature-list +
   check-icon styles. Snap radii/heights to `tokens.css` (`--radius-lg`/`--radius-md`,
   control heights); run `npm run check:tokens`.

5. **EDIT `src/lib/i18n/dictionaries/landing.ts`** — add to
   `vibeExploration` (id + en, dict-parity enforced): `popularBadge`
   ("Paling populer" / "Most popular") and `plansSubtitle` (e.g. "Bayar sekali,
   undangan langsung aktif" / "One-time payment, your invitation goes live").
   Reuse existing `plansTitle`, `choosePlan`, `guestQuota`, and `closePlans`
   ("Tutup" — currently defined but unused; now wired to the modal close).

## Testing

- **Manual / browser (primary — this is a visual change):**
  - Lovebirds (coral) and Solary (purple): open the popup → palette theming on
    surface/border/accent/CTA is correct; the badge marks the higher-priced plan.
  - Close via ×, backdrop click, and Esc; focus returns to the "Beli Undangan"
    button; background scroll is locked while open.
  - Stepper math: floor = plan base; − disabled at base; + disabled at 5000;
    +50 ⇒ +Rp 10.000 on the live total (uses `quotaAddonAmount`).
  - "Pilih paket ini" navigates to `/onboarding?template=…&plan=…&extra=E` with
    the chosen `extra`; onboarding floors on the DB base (already wired).
  - compare-at strikethrough shows only when `compare_at_price_idr > price_idr`.
  - **Unbounded/uneven features:** in `/admin/templates` give Premium ~12
    features and Basic ~3 → the popup grows, the body scrolls, nothing clips, and
    both cards align at the top of the row. Mobile width ⇒ single column.
  - Pinned section still pins/scrubs; opening the popup or changing the quota no
    longer reflows the section behind it; `prefers-reduced-motion` ⇒ no animation.
- **Admin round-trip:** edit `display_name` / `price_idr` / `compare_at` /
  `base_guest_quota` / `features` for a plan → the popup reflects it after the
  action's `revalidateTag` (no deploy).
- **Automated:** `dict-parity` test covers `popularBadge` + `plansSubtitle`;
  `npm run check:tokens`, typecheck, and lint pass. No unit-test logic changes
  (quota math + `toPlanDisplay` untouched).

## Out of scope

- Any DB migration, admin-editor change, or new plan-description column.
- The onboarding quota stepper (already floored on the DB base) and the checkout
  / webhook path.
- Quota constants (block size / price / cap) — stay in `lib/payments/quota.ts`.
- Other CTAs (hero "Buat Undangan", nav, "Mulai Rancang") — they go straight to
  onboarding/templates and are unchanged.
- The catalog fallback path (when the `plans` prop is absent) — kept as-is; the
  modal renders whatever `displayPlans` it receives.
- Promo codes / vouchers (Phase 2 of the pricing spec).

## Operator steps

None. No migration, no env var, no seeding — the popup renders the existing
admin-managed `template_plans` data.
