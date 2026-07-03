# Portrait-only gate for phones (public invitation)

**Date:** 2026-07-03
**Status:** Approved (pending user spec review)

## Goal

On phones, the public wedding invitation must be viewed in portrait. When a
phone is rotated to landscape, cover the invitation with a full-screen "rotate
to portrait" overlay so the landscape layout is never usable — effectively
disallowing landscape without relying on an orientation lock the browser won't
grant.

## Scope

- **In scope:** the public invitation route `/<template>/<slug>` — BOTH
  templates (Lovebirds + Solary), in phone-frame mode AND direct render.
- **Out of scope:** marketing, login/onboarding, dashboard/editor (owner may
  use landscape there). Tablets/iPad (landscape is fine on the larger screen).
  Desktop.

## Decisions (user-confirmed)

1. Approach: **pure-CSS overlay**, not the Screen Orientation API. Browsers only
   honour `screen.orientation.lock('portrait')` in fullscreen or an installed
   PWA; in a normal browser tab (a guest opening a WhatsApp link) it fails
   silently. A CSS overlay is 100% reliable and needs zero JS.
2. Style: **elegant, theme-integrated** — themed via existing CSS variables so
   it auto-matches Lovebirds (cream) and Solary (dark); soft-animated rotating-
   phone icon; script + body type like the invitation; ID primary text with a
   small English subline. Not an "error" look.

## Detection (CSS media query)

```css
@media (orientation: landscape) and (max-height: 500px) and (pointer: coarse) {
  /* show the gate */
}
```

- `orientation: landscape` — the device is sideways.
- `max-height: 500px` — separates a phone in landscape (short side ~360–430px
  tall) from a tablet in landscape (≥600px tall). This is what limits the gate
  to phones without a JS device check.
- `pointer: coarse` — touch devices only; a small desktop window never triggers
  it.

The query matches INSIDE the phone-frame iframe too (the iframe inherits the
device's real orientation/pointer and is sized to the landscape viewport), so a
single overlay rendered in the framed content covers the visible screen — no
separate handling on the outer `PhoneFrameView` host is required.

## Architecture

- **New component:** `src/components/PortraitGate.tsx` (+ `PortraitGate.module.css`).
  A tiny client-free component (pure markup + CSS; the media query drives
  visibility, so no JS/hooks). Renders a fixed full-viewport overlay that is
  `display: none` by default and `display: flex` under the media query above.
- **Mount point:** rendered once inside
  `src/app/[template]/[slug]/InvitationView.tsx`, alongside the dispatched
  Shell — so it covers both templates and both render paths (framed + direct)
  from a single place. Not in the root layout (that would leak onto
  marketing/dashboard, which are out of scope).
- **Overlay contents:**
  - Full-viewport fixed layer, `z-index` above everything (above navbar,
    palette switcher, music popup), `inset: 0`, centered column.
  - Background: `var(--color-cream, #FDF6EC)` on Lovebirds / the Solary dark
    surface — resolved from the template's own CSS vars so it themes itself.
    Falls back to cream if a var is missing.
  - A rotating-phone SVG icon with a gentle `@keyframes` tilt (respecting
    `prefers-reduced-motion: reduce` → no animation).
  - Primary line (ID): "Putar HP ke posisi tegak". Subline (EN):
    "Best viewed in portrait". Uses the template body/script fonts via existing
    font CSS vars.
- **Accessibility:** `role="alertdialog"`-ish is overkill for a decorative
  gate; use a plain `aria-hidden="false"` region with readable text. Since it's
  purely orientation-driven and non-interactive, no focus trapping is needed.

## Non-goals / explicitly NOT doing

- No `screen.orientation.lock()` call (unreliable in-tab; see Decision 1).
- No PWA manifest `orientation` change (only affects installed PWAs; guests
  don't install).
- No JS resize/orientation listeners — CSS handles it entirely.

## Testing

- Emulate a phone in landscape (e.g. 844×390, touch): overlay covers the
  invitation; rotating to portrait (390×844) hides it. Verify both Lovebirds
  and Solary, framed (real phone UA) and `?noframe=1`.
- Tablet landscape (iPad 1180×820): overlay does NOT show (height > 500).
- Desktop narrow window (e.g. 800×400): overlay does NOT show (pointer fine).
- `prefers-reduced-motion`: icon animation off, overlay still shows.
- Confirm the overlay sits above navbar / 🎨 / music popup (z-index).
