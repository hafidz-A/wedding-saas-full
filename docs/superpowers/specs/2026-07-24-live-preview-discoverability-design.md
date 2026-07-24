# Live-preview discoverability — design

**Date:** 2026-07-24
**Status:** Phase B implemented (`feat/live-preview-discoverability`);
Phase C implemented (`feat/live-preview-discoverability-part-2`).
**Surface:** marketing landing → `VibeExploration` (section `#vibe`).

---

## Problem

Visitors do not realise they can open a **real, full invitation** before buying. The
capability already exists — every catalog entry has a `demoSlug`, and
`VibeExploration` already links to `/{template}/{demoSlug}` — but nobody finds it.

This is a discoverability failure, not a missing feature.

## Root causes

Three compounding causes, each a distinct design-system violation:

1. **Opaque label.** `landing.vibeExploration.liveReview` was the literal string
   `'Live Review'` in *both* the `id` and `en` dictionaries. To an Indonesian reader
   "review" means *ulasan/testimoni* — someone else's opinion — not "open the actual
   invitation". The label named a mechanism, not an outcome.
   *Violated: recognition over recall; a control must name what happens.*

2. **Inverted visual hierarchy.** The link rendered as `.btnGhost` — transparent
   background, 1.5px outline — immediately beside `.btnPrimary`, which carries a solid
   palette fill, a `box-shadow`, and an animated flipping label (`CinematicCtaText`).
   Fill + shadow + motion outweigh a hairline outline by a wide margin, so attention
   and clicks went to "Beli Undangan" and the exploratory action was never seen.
   *Violated: visual weight should track the value of the action.*

3. **The decoy card.** `PreviewMock` renders an abstract 4:5 card (eyebrow, names,
   rule, date, fake RSVP pill) that recolours with the palette. It is the most
   invitation-looking thing on screen, so visitors read it as *the* preview and
   conclude that is all there is. Nothing signals that a complete cinematic
   invitation sits one click away.
   *Violated: signifiers — the element that looks like the product was not the door
   to the product.*

Underneath all three: for a high-consideration emotional purchase the funnel must run
**see → trust → buy**. Here "buy" shouted and "see" whispered.

---

## Phase B — the card becomes the door (this change)

### B1. Copy

`src/lib/i18n/dictionaries/landing.ts`, `vibeExploration`, both `id` and `en`
(key paths are parity-tested by `src/lib/i18n/__tests__/dict-parity.test.ts`):

| Key | Before | After (id) | After (en) |
|---|---|---|---|
| `liveReview` → `viewLive` | `Live Review` | `Lihat Undangan Asli` | `See the Real Invitation` |
| `previewOpen` *(new)* | — | `Buka undangan lengkap` | `Open the full invitation` |
| `previewHint` *(new)* | — | `Gratis, tanpa perlu daftar.` | `Free, no signup needed.` |

The key itself is renamed `liveReview` → `viewLive`: the old name encoded the very
jargon being removed, and it had exactly two references (the two dictionaries and the
component).

Copy follows the marketing voice rule — impersonal, no personal pronouns.

### B2. The preview card becomes a link

`PreviewMock` is **shared** with the dashboard Palette tab
(`src/app/[template]/[slug]/dashboard/PaletteTab.tsx`), so the component itself stays
presentational and unchanged. The door is built at the `VibeExploration` call site:

- Wrap `<PreviewMock>` in an `<a href={previewHref} target="_blank" rel="noreferrer">`
  with `aria-label={`${t.previewOpen} — ${template.label}`}`.
- The wrapper mirrors `PreviewMock`'s own box constraints (`max-width: 400px`,
  centred, flush-left at ≥1024px) so an overlay pinned to the wrapper aligns with the
  card rather than the grid cell.
- Overlay an **always-visible** pill (`.doorBadge`) carrying a play glyph and
  `t.previewOpen`, tinted with the live palette accent.

**The badge is always visible, never hover-only.** Hover affordances do not exist on
touch, and the majority of this audience shops on a phone — a hover-only signifier
would leave the original problem untouched on the devices that matter most.

Interaction: pointer cursor, a small lift on hover, a palette-accent `focus-visible`
ring for keyboard users, and the lift suppressed under `prefers-reduced-motion`.

### B3. Rebalanced actions

- The view action moves from `.btnGhost` to a new `.btnSecondary`: a translucent
  accent tint plus a 1.5px accent border, keeping `color: palette.fg` so contrast
  holds on both light and dark palettes. It now reads as a real, co-equal action
  without competing with the solid primary.
- `t.previewHint` renders beneath the actions in `palette.fgMuted`, removing the
  unspoken "will this cost me something / do I have to sign up first" hesitation.

`.btnGhost` is left in the stylesheet only if still referenced; otherwise removed.

### Constraints

- Design tokens only — `--radius-md`, `--radius-pill`, `--ctl-h`, `--space-*`. No raw
  `999px`, no off-scale control heights. `npm run check:tokens` must stay green.
- `PreviewMock` and the dashboard Palette tab must not change behaviour.
- id/en dictionary key parity must hold.

### Acceptance criteria

1. The preview card is a link to `/{template}/{demoSlug}`, opens in a new tab, and
   carries a visible affordance without hovering — on desktop and on touch.
2. The card is reachable and operable by keyboard, with a visible focus ring.
3. No control anywhere reads "Live Review".
4. Switching template or palette re-themes the badge and keeps the link correct.
5. The dashboard Palette tab renders exactly as before.
6. `npm run typecheck`, `npm run test`, and `npm run check:tokens` pass.

---

## Phase C — in-page live preview (implemented)

Clicking the preview now opens the real demo invitation in a full-screen drawer over
the landing page — `<iframe src="/{template}/{demoSlug}?embed=1">` — instead of
switching tabs. The visitor never leaves the funnel, so see → trust → buy runs as one
continuous motion. C builds on B rather than replacing it: the card is still the door;
only the destination changed.

### Components

- `src/components/marketing/LivePreviewDrawer.tsx` + `.module.css` — the drawer.
- `src/hooks/useOverlayLock.ts` — page-lock/restore, extracted from `PlansModal`.
- `VibeExploration` owns the open/closed state and intercepts the trigger clicks.

### How each risk was resolved

- **Lenis scroll lock.** `useOverlayLock` stops Lenis, sets `overflow: hidden` on both
  `<html>` (the real scroller) and `<body>`, and pads `<html>` by the scrollbar width
  so the page does not shift. Measured: 0px drift while open.
- **GSAP pin.** The drawer is `createPortal`ed to `<body>`. This is not cosmetic —
  `VibeExploration` is pinned and *transformed* by ScrollTrigger, and a
  `position: fixed` child of a transformed ancestor positions against that ancestor
  instead of the viewport, so an in-place overlay would be dragged along by the pin.
- **Performance.** The drawer is mounted only while open, so closing removes the
  iframe entirely and tears down the demo's loops (Solary boots three.js). Verified: 0
  iframes remain in the DOM after close.
- **Mobile.** The drawer is full-bleed at phone widths, so the invitation renders at
  the real device width and its own mobile layout applies. `?embed=1` doubles as the
  recursion guard on the invitation page — without it a phone UA would bounce into
  `PhoneFrameView` and nest a frame inside a frame.

### Deliberate decisions

- **Chrome is fixed dark, not palette-themed.** The palette surfaces are translucent
  (they sit on the section's own gradient); over the drawer scrim they turn muddy grey
  and fight the invitation. Only the accent dot and the loading spinner stay themed.
- **The trigger stays a real link.** Only an unmodified left-click is intercepted —
  middle-click, Cmd/Ctrl and Shift still open a genuine tab, and the `href` means the
  preview survives with JS disabled. The drawer also carries an explicit
  "open in new tab" escape hatch for bookmarking, sharing, and as a fallback if the
  frame fails.
- **Focus restore uses `preventScroll`.** Without it, returning focus to the tall
  preview card scrolls it into view and yanks the page ~180px on close. This was
  caught in testing, not theory.

### Palette hand-off

The explorer's whole promise is "see it in *this* palette", so the palette the
visitor picked has to survive the click. `palette.key` is already the template's own
theme key — `vibeData` derives the marketing palettes straight from
`lovebirds/config/applyTheme.js` (`THEME_ORDER`) and `solary/config/themeTokens.js`
(`PALETTES`) — so there is no mapping table to keep in sync.

It is carried two ways, deliberately:

1. **`?theme=<key>` on every link and on the iframe `src`.** This is the primary
   path. It makes the framed invitation correct from first paint (no flash of the
   default palette) and, because it rides on the URL, it also survives Cmd/middle-click,
   the drawer's new-tab escape hatch, link sharing, and JS being disabled.
2. **`postMessage` after the frame's `ready` handshake**, using each template's existing
   embed bridge (`{ theme }` for Lovebirds, `{ palette }` for Solary). Belt and braces
   for the framed view.

**The URL param is demo-only by construction.** Both providers read it inside their
existing `allowGuestSwitch` branch, and `allowGuestSwitch={isDemo}` — so a guest can
never re-theme a couple's published invitation by editing the URL. The value is also
validated (`isThemeName` / `PALETTES[key]`) before use, so a junk param falls through
to the normal default.

Where a stored choice also exists, the URL wins: it is an explicit intent carried by
the link the visitor just followed, whereas `sessionStorage` is a leftover from an
earlier visit.

### Known follow-up

`ManualPayModal` and `LegalModal` still carry their own partial copies of the
page-lock logic and should be migrated onto `useOverlayLock`. `PlansModal` — the
original source of the pattern — still has the un-fixed `focus()` restore and would
pick up the `preventScroll` fix for free by migrating.
