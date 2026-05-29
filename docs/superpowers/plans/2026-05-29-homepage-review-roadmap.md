# Homepage Review — Roadmap

**Date:** 2026-05-29
**Type:** Multi-subsystem roadmap (decomposition + priority). NOT a single TDD plan.
**Source:** Handwritten "Homepage Review" notes + clarifications (2026-05-29).

> This spans several independent subsystems. Quick-win UI items are ready to
> build directly. The architectural items (multi-invitation, payment gateway)
> each need their own brainstorm → spec → TDD plan before implementation.

---

## New product decisions captured today

1. **1 account → many invitations.** A single account can buy the same template
   multiple times with different slugs (e.g. `solary/budi-sari` AND
   `solary/ahmad-rahma`). This **reverses** the current "1 user = 1 invitation"
   rule enforced in `actions.ts` and `onboarding/page.tsx`.
2. **Profile kept simple** ("profil sederhana") — minimal profile page, because a
   rich profile has broad product implications we don't want yet.
3. **Language toggle** in the create-invitation form: keep it but make the bar
   compact toward the ID/EN control, or center it (decision pending — see W1).

---

## What ALREADY exists (do NOT rebuild)

| Item | Status | Location |
|---|---|---|
| `/templates` gallery page with cards | ✅ done | `src/app/templates/page.tsx` |
| "Gunakan template ini" button on each card → `/onboarding?template=ID` | ✅ done | `templates/page.tsx:58-64` |
| Navbar "Template" link → `/templates` | ✅ done | `SiteNav.tsx:23` |
| Slug picker (prefill + availability check) | ✅ done | onboarding (see slug-collision plan) |
| Logout API route | ✅ done | `src/app/api/auth/logout/route.ts` |
| Supabase Auth session (cookie-based, auto-refresh) | ✅ likely | `src/lib/supabase/*` — verify in W3 |

---

## Workstreams (priority order)

### Phase 1 — Quick wins (UI only, no backend, high visibility)

#### W1. Language-toggle layout + nav text + "Pengalaman" link
- **What:** (a) In the create-invitation form, make the language row compact/centered.
  (b) Verify navbar "Pengalaman" link points to the landing page (currently
  `/#features` — confirm the anchor scrolls correctly from any page).
- **Files:** `src/app/onboarding/OnboardingForm.tsx:159-163`, `src/components/site/SiteNav.tsx:22`, possibly `src/components/site/LangToggle.module.css`.
- **Effort:** S. **Deps:** none. **Ready to build.**

#### W2. Styled 404 page
- **What:** Create a global `not-found.tsx` using the homepage gradient
  background + nav + a "back to homepage" CTA. (No global not-found exists today.)
- **Files:** Create `src/app/not-found.tsx`; reuse `SiteNav` + page gradient from `page.tsx`/`templates/page.tsx`.
- **Effort:** S. **Deps:** none. **Ready to build.**

#### W3. "Back to homepage" from dashboard + confirm persistent session
- **What:** Add a "← Homepage" link in the dashboard that returns to `/` without
  forcing re-login. Confirm Supabase session persists (cookie + refresh token) so
  the user stays logged in — this is the "timeout/tetap login" ask; with
  `@supabase/ssr` it should already work, so this is mostly verification + the link.
- **Files:** `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` (add link); verify `src/lib/supabase/server.ts` + `client.ts`.
- **Effort:** S. **Deps:** none. **Ready to build.**

### Phase 2 — Auth-aware navbar (medium, visible)

#### W4. Navbar reacts to login state + Profile dropdown
- **What:** When logged out → show `Masuk` + `Buat Undangan` (current behavior).
  When logged in → replace those with a **Profile dropdown**: Profil, Logout,
  Reset password, My Template. Also: the "Buat Undangan" CTA becomes "My Template"
  when logged in.
- **Approach:** `SiteNav` is a client component rendered on many pages. Simplest
  self-contained option: have it check the session via the Supabase **browser
  client** in a `useEffect` (small flash of logged-out state on first paint).
  Alternative: pass a `user` prop from each server page (cleaner, no flash, but
  touches every page that renders `SiteNav`). Recommend the client-side check.
- **Files:** `src/components/site/SiteNav.tsx` (+ `.module.css`), new i18n keys in
  `src/lib/i18n/dictionaries/common.ts` (profile menu labels), reuse `/api/auth/logout`.
- **Effort:** M. **Deps:** none (works before multi-invitation; "My Template" link
  can point at the list page built in W6). **Ready to build** (needs a short design
  pass on dropdown markup/keyboard a11y).

#### W5. Simple Profile page
- **What:** Minimal profile page (email, change password link, list of owned
  invitations count). Deliberately bare.
- **Files:** Create `src/app/profile/page.tsx` (server, auth-gated) + small client form if needed.
- **Effort:** S–M. **Deps:** W4 (entry point). **Ready to build.**

### Phase 3 — Multi-invitation foundation (architectural — needs brainstorm + spec)

#### W6. Allow many invitations per account + "My Template" list
- **What:** Remove the "1 user = 1 invitation" rule; build a "My Template" page
  listing every invitation the account owns, each linking to its public page +
  dashboard. Onboarding no longer redirects an existing owner away — it lets them
  create another.
- **Changes:** `actions.ts:65-82` (drop the alreadyOwned short-circuit / change
  semantics), `onboarding/page.tsx:59-73` (drop the redirect-to-existing), new
  `src/app/my-templates/page.tsx` (server, lists `invitations` where
  `owner_user_id = user.id`). DB schema already supports N rows per
  `owner_user_id` (no unique constraint on it) — confirm and add an index if missing.
- **Effort:** M. **Deps:** W4/W5 link here. **NEEDS BRAINSTORM + SPEC** (data model
  details, what "My Template" shows, empty state, free vs paid status per row).

### Phase 4 — Payment gateway (large — needs its own brainstorm + spec)

#### W7. Plan selection + payment + purchase-gated invitation creation
- **What:** The full buy flow. Logged in: pick template → pick plan → pay →
  redirected to My Template → use the purchased template. Logged out: pick
  template → forced to login/register → pick plan → pay → My Template. Each
  successful payment creates a new invitation row (ties into W6).
- **Open decisions (brainstorm):** payment provider (Midtrans / Xendit are the
  Indonesian options), plan tiers + prices, webhook → server creates invitation,
  expiry (`expires_at`: 1-year vs lifetime → unpublish not delete), what gates
  on "paid" vs "draft".
- **Files (rough):** new `src/app/api/payment/*` (create + webhook), plan picker
  UI, `invitations` schema additions (`is_paid`, `plan`, `expires_at`),
  gating in onboarding/dashboard.
- **Effort:** L. **Deps:** W6 (multi-invitation + My Template). **NEEDS BRAINSTORM + SPEC.**

---

## Dependency graph

```
W1 ─┐
W2 ─┼─ (independent quick wins)
W3 ─┘
W4 ── W5
   └── W6 (My Template list) ── W7 (payment)
```

## Suggested build order

1. **W1, W2, W3** — quick wins, ship same day, no backend risk.
2. **W4 + W5** — auth-aware navbar + simple profile (biggest visible upgrade).
3. **W6** — brainstorm → spec → plan → build (unlocks My Template + reversing 1:1).
4. **W7** — brainstorm → spec → plan → build (payment; largest, most decisions).

Items W1–W5 are ready for detailed TDD plans now. W6 and W7 each need a brainstorm
+ spec pass first (they carry data-model and third-party decisions).
